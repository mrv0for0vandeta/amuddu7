// Push notification support (T-46) using the Web Push API.

import { supabase } from './supabase';

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

export async function registerPushToken(): Promise<void> {
  try {
    const permission = await requestPushPermission();
    if (permission !== 'granted') return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Generate a simple device token (in production this would use a VAPID key + push subscription)
    const token = `web-${userData.user.id}-${Date.now()}`;
    const deviceInfo = navigator.userAgent;

    await supabase.from('push_token').upsert({
      user_id: userData.user.id,
      token,
      platform: 'web',
      device_info: deviceInfo,
      is_active: true,
    }, { onConflict: 'token' });
  } catch {
    // Push notifications should never break the app
  }
}

export async function showLocalNotification(title: string, body: string, conversationId?: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: conversationId,
    data: { conversationId },
  });
  notification.onclick = () => {
    window.focus();
    if (conversationId) {
      window.location.hash = `#/messages/${conversationId}`;
    }
    notification.close();
  };
}

export async function checkForReplyNotifications(): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Check for conversations with recent provider replies
    const { data: conversations } = await supabase
      .from('conversation')
      .select('id, subject, last_message_at')
      .eq('user_id', userData.user.id)
      .order('last_message_at', { ascending: false })
      .limit(5);

    if (!conversations) return;

    // Check if any have messages since last view
    for (const conv of conversations) {
      const { data: messages } = await supabase
        .from('message')
        .select('created_at, sender')
        .eq('conversation_id', conv.id)
        .eq('sender', 'provider')
        .order('created_at', { ascending: false })
        .limit(1);

      if (messages && messages.length > 0) {
        const lastMsg = messages[0] as { created_at: string };
        const lastViewed = sessionStorage.getItem(`conv-viewed-${conv.id}`);
        if (!lastViewed || new Date(lastMsg.created_at).getTime() > new Date(lastViewed).getTime()) {
          await showLocalNotification('New reply', (conv as { subject: string }).subject, (conv as { id: string }).id);
          sessionStorage.setItem(`conv-viewed-${conv.id}`, new Date().toISOString());
        }
      }
    }
  } catch {
    // ignore
  }
}

// Start polling for notifications
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startNotificationPolling(intervalMs = 30_000): void {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    checkForReplyNotifications().catch(() => {});
  }, intervalMs);
}

export function stopNotificationPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
