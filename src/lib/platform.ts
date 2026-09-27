// Platform infrastructure: analytics, rate limiting, outbox, forced upgrade, observability, load shedding.

import { supabase } from './supabase';
import type { AnalyticsEvent, AppVersion } from './types';

// ---- Analytics event taxonomy (X-12) ----

const EVENT_NAMES = {
  page_view: { required: ['path'] },
  trip_created: { required: ['trip_id', 'region_count'] },
  itinerary_generated: { required: ['trip_id', 'duration_ms', 'item_count'] },
  item_swapped: { required: ['trip_id', 'item_id', 'old_listing_id', 'new_listing_id'] },
  item_removed: { required: ['trip_id', 'item_id'] },
  item_locked: { required: ['trip_id', 'item_id'] },
  conversation_started: { required: ['conversation_id', 'listing_id'] },
  message_sent: { required: ['conversation_id'] },
  booking_requested: { required: ['booking_id', 'listing_id'] },
  booking_confirmed: { required: ['booking_id'] },
  booking_attested: { required: ['booking_id', 'party'] },
  booking_cancelled: { required: ['booking_id'] },
  search_performed: { required: ['query', 'result_count'] },
  listing_viewed: { required: ['listing_id'] },
  gem_viewed: { required: ['gem_id'] },
  provider_registered: { required: ['provider_org_id'] },
  provider_verified: { required: ['provider_org_id', 'decision'] },
  trust_panel_viewed: { required: ['listing_id'] },
  review_submitted: { required: ['booking_id', 'rating'] },
  dispute_raised: { required: ['booking_id', 'dispute_type'] },
  report_submitted: { required: ['target_type', 'report_type'] },
  app_opened: { required: ['locale'] },
  offline_action_queued: { required: ['action_type'] },
  offline_sync_completed: { required: ['items_synced'] },
} as const;

export type EventName = keyof typeof EVENT_NAMES;

let sessionId: string | null = null;

export function initSession(): string {
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

export async function track(
  event: EventName,
  properties: Record<string, unknown> = {},
  pagePath?: string,
): Promise<void> {
  const required = EVENT_NAMES[event]?.required ?? [];
  for (const prop of required) {
    if (!(prop in properties)) {
      console.warn(`[analytics] Event "${event}" missing required property "${prop}"`);
    }
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('analytics_event').insert({
      event_name: event,
      user_id: userData.user?.id ?? null,
      session_id: initSession(),
      properties,
      page_path: pagePath ?? window.location.hash,
      locale: navigator.language,
    });
  } catch {
    // Analytics should never break the app — fire and forget
  }
}

export async function fetchAnalyticsEvents(limit = 100): Promise<AnalyticsEvent[]> {
  const { data, error } = await supabase
    .from('analytics_event')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AnalyticsEvent[];
}

// ---- Rate limiting (X-09) ----

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  itinerary_generation: { max: 10, windowMs: 60_000 },
  booking_request: { max: 20, windowMs: 60_000 },
  message_send: { max: 30, windowMs: 60_000 },
  search: { max: 60, windowMs: 60_000 },
  default: { max: 100, windowMs: 60_000 },
};

export async function checkRateLimit(
  identifier: string,
  limitClass: string,
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const config = RATE_LIMITS[limitClass] ?? RATE_LIMITS.default;
  const windowStart = new Date(Math.floor(Date.now() / config.windowMs) * config.windowMs).toISOString();

  const { data, error } = await supabase
    .from('rate_limit')
    .select('id, count')
    .eq('identifier', identifier)
    .eq('limit_class', limitClass)
    .eq('window_start', windowStart)
    .maybeSingle();

  if (error) return { allowed: true, remaining: config.max, resetMs: config.windowMs };

  if (data && (data as { count: number }).count >= config.max) {
    return { allowed: false, remaining: 0, resetMs: config.windowMs };
  }

  if (data) {
    await supabase
      .from('rate_limit')
      .update({ count: (data as { count: number }).count + 1 })
      .eq('id', (data as { id: string }).id);
  } else {
    await supabase.from('rate_limit').insert({
      identifier,
      limit_class: limitClass,
      window_start: windowStart,
      count: 1,
    });
  }

  const currentCount = data ? (data as { count: number }).count + 1 : 1;
  return {
    allowed: currentCount <= config.max,
    remaining: Math.max(0, config.max - currentCount),
    resetMs: config.windowMs,
  };
}

// ---- Outbox (X-06) ----

export async function emitEvent(
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await supabase.from('outbox').insert({
    aggregate_type: aggregateType,
    aggregate_id: aggregateId,
    event_type: eventType,
    payload,
    status: 'pending',
  });
}

export async function fetchPendingOutbox(limit = 50): Promise<OutboxEvent[]> {
  const { data, error } = await supabase
    .from('outbox')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as OutboxEvent[];
}

// ---- Forced upgrade (X-16) ----

export async function checkAppVersion(): Promise<AppVersion | null> {
  const { data, error } = await supabase
    .from('app_version')
    .select('*')
    .eq('platform', 'web')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as AppVersion | null;
}

export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] ?? 0;
    const b = parts2[i] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

// ---- Observability (X-11) ----

export function logStructured(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
  const entry = {
    level,
    message,
    context: context ?? {},
    timestamp: new Date().toISOString(),
    url: window.location.href,
  };
  // Redact personal data
  if (entry.context.email) entry.context.email = '[redacted]';
  if (entry.context.phone) entry.context.phone = '[redacted]';

  if (level === 'error') console.error(JSON.stringify(entry));
  else if (level === 'warn') console.warn(JSON.stringify(entry));
  else console.info(JSON.stringify(entry));
}

// ---- Load shedding (X-10) ----

type ShedPriority = 'generation' | 'discovery' | 'booking' | 'messaging';

const PRIORITY_ORDER: ShedPriority[] = ['generation', 'discovery', 'booking', 'messaging'];

let currentShedLevel = 0;

export function shedCheck(priority: ShedPriority): boolean {
  const priorityIndex = PRIORITY_ORDER.indexOf(priority);
  return priorityIndex >= currentShedLevel;
}

export function setShedLevel(level: number): void {
  currentShedLevel = Math.max(0, Math.min(PRIORITY_ORDER.length, level));
}

// ---- Sponsored content (X-14) ----

export async function fetchSponsoredListings(): Promise<SponsoredListing[]> {
  const { data, error } = await supabase
    .from('sponsored_listing')
    .select('*, listing:listing_id(*)')
    .eq('is_active', true)
    .lte('start_date', new Date().toISOString().split('T')[0])
    .gte('end_date', new Date().toISOString().split('T')[0]);
  if (error) throw new Error(error.message);
  return (data ?? []) as SponsoredListing[];
}

// Import types used above
import type { OutboxEvent, SponsoredListing } from './types';
