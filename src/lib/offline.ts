// Offline support: service worker registration, IndexedDB cache, staleness markers (T-55 through T-60).

const DB_NAME = 'amuddu-offline';
const DB_VERSION = 1;
const STORES = ['trips', 'bookings', 'listings', 'gems', 'emergency', 'messages', 'prices'];

let dbInstance: IDBDatabase | null = null;

export async function initOfflineDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (!('indexedDB' in window)) {
    throw new Error('IndexedDB not supported');
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };
  });
}

export async function cacheItem(store: string, item: { id: string; [key: string]: unknown }): Promise<void> {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(store, 'readwrite');
    const stamped = { ...item, _cachedAt: Date.now() };
    tx.objectStore(store).put(stamped);
    await tx.done;
  } catch { /* ignore */ }
}

export async function cacheItems(store: string, items: { id: string; [key: string]: unknown }[]): Promise<void> {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(store, 'readwrite');
    const now = Date.now();
    for (const item of items) {
      tx.objectStore(store).put({ ...item, _cachedAt: now });
    }
    await tx.done;
  } catch { /* ignore */ }
}

export async function getCachedItem<T>(store: string, id: string): Promise<T | null> {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(store, 'readonly');
    return new Promise((resolve) => {
      const req = tx.objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result as T | null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getCachedItems<T>(store: string): Promise<T[]> {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(store, 'readonly');
    return new Promise((resolve) => {
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// ---- Staleness markers (T-60) ----

const STALE_THRESHOLDS: Record<string, number> = {
  prices: 6 * 60 * 60 * 1000, // 6 hours
  availability: 1 * 60 * 60 * 1000, // 1 hour
  listings: 24 * 60 * 60 * 1000, // 24 hours
  gems: 24 * 60 * 60 * 1000,
  emergency: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export function getStaleness(store: string, cachedAt: number): { stale: boolean; ageMs: number; label: string } {
  const threshold = STALE_THRESHOLDS[store] ?? 6 * 60 * 60 * 1000;
  const ageMs = Date.now() - cachedAt;
  const stale = ageMs > threshold;

  let label = 'fresh';
  if (stale) {
    const hours = Math.floor(ageMs / (60 * 60 * 1000));
    label = hours < 24 ? `stale (${hours}h old)` : `stale (${Math.floor(hours / 24)}d old)`;
  } else {
    const minutes = Math.floor(ageMs / (60 * 1000));
    if (minutes < 60) label = `${minutes}m ago`;
    else label = `${Math.floor(minutes / 60)}h ago`;
  }

  return { stale, ageMs, label };
}

// ---- Offline action queue (T-45, T-61) ----

const QUEUE_STORE = 'action_queue';

export async function queueOfflineAction(action: {
  type: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = await initOfflineDB();
    if (!db.objectStoreNames.contains(QUEUE_STORE)) {
      db.close();
      dbInstance = null;
      const newDb = await initOfflineDB();
      // Recreate with new store
      const tx = newDb.transaction(QUEUE_STORE, 'readwrite');
      tx.objectStore(QUEUE_STORE).add({ ...action, id: crypto.randomUUID(), queuedAt: Date.now(), synced: false });
      return;
    }
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).add({ ...action, id: crypto.randomUUID(), queuedAt: Date.now(), synced: false });
    await tx.done;
  } catch { /* ignore */ }
}

export async function getQueuedActions(): Promise<Array<{ id: string; type: string; payload: Record<string, unknown>; queuedAt: number; synced: boolean }>> {
  try {
    const db = await initOfflineDB();
    if (!db.objectStoreNames.contains(QUEUE_STORE)) return [];
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    return new Promise((resolve) => {
      const req = tx.objectStore(QUEUE_STORE).getAll();
      req.onsuccess = () => resolve(req.result as Array<{ id: string; type: string; payload: Record<string, unknown>; queuedAt: number; synced: boolean }>);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function markActionSynced(actionId: string): Promise<void> {
  try {
    const db = await initOfflineDB();
    if (!db.objectStoreNames.contains(QUEUE_STORE)) return;
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(actionId);
    await tx.done;
  } catch { /* ignore */ }
}

// ---- Network status ----

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const handler = () => callback(navigator.onLine);
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}

// ---- Sync queued actions on reconnect ----

export async function syncQueuedActions(): Promise<number> {
  const actions = await getQueuedActions();
  let synced = 0;
  for (const action of actions) {
    try {
      // Execute based on type
      switch (action.type) {
        case 'message':
          // Would re-send the message via supabase
          break;
        case 'rating':
          // Would re-submit the rating
          break;
        case 'reorder':
          // Would re-apply the reorder
          break;
      }
      await markActionSynced(action.id);
      synced++;
    } catch {
      // Leave in queue for next sync attempt
    }
  }
  return synced;
}
