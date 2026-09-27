// Data access layer for the Operations Console (Section 8 features O-01 through O-16).

import { supabase } from './supabase';
import type {
  VerificationCase,
  VerificationEvidence,
  Provider,
  ModerationAction,
  SafetyReport,
  AuditLogEntry,
  SupportCase,
  AdminElevation,
  Booking,
  Trip,
  Conversation,
  Listing,
  HiddenGem,
} from './types';

// ---- O-01: Verification queue (prioritised by readiness then age) ----

export async function fetchVerificationQueue(): Promise<(VerificationCase & {
  provider?: Provider | null;
  evidence?: VerificationEvidence[];
})[]> {
  const { data, error } = await supabase
    .from('verification_case')
    .select('*, provider:provider_org_id(*)')
    .in('status', ['pending', 'reviewing'])
    .order('priority', { ascending: false })
    .order('submitted_at', { ascending: true });
  if (error) throw new Error(error.message);
  const cases = (data ?? []) as (VerificationCase & { provider?: Provider })[];

  // Fetch evidence for each case
  const result: (VerificationCase & {
    provider?: Provider | null;
    evidence?: VerificationEvidence[];
  })[] = [];
  for (const c of cases) {
    const { data: evidence } = await supabase
      .from('provider_verification_evidence')
      .select('*')
      .eq('provider_org_id', c.provider_org_id)
      .order('submitted_at', { ascending: false });
    result.push({ ...c, evidence: (evidence ?? []) as VerificationEvidence[] });
  }
  return result;
}

// ---- O-03: Decide a case ----

export async function decideVerificationCase(
  caseId: string,
  decision: 'approved' | 'rejected' | 'request_more',
  reason: string,
  providerOrgId: string,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const newStatus = decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'request_more';
  const { error: caseErr } = await supabase
    .from('verification_case')
    .update({
      status: newStatus,
      decided_at: new Date().toISOString(),
      decided_by: userId ?? null,
      decision_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId);
  if (caseErr) throw new Error(caseErr.message);

  // Update provider verification state
  const providerState = decision === 'approved' ? 'verified' : decision === 'rejected' ? 'rejected' : 'pending';
  const providerStatus = decision === 'approved' ? 'active' : 'pending';
  const { error: provErr } = await supabase
    .from('provider_org')
    .update({
      verification_state: providerState,
      status: providerStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerOrgId);
  if (provErr) throw new Error(provErr.message);

  // Write audit log
  await supabase.from('audit_log').insert({
    actor_id: userId ?? null,
    action: `verification_${decision}`,
    target_type: 'provider_org',
    target_id: providerOrgId,
    reason,
  });
}

// ---- O-08: Moderate listings and gems ----

export async function moderateTarget(
  targetType: string,
  targetId: string,
  action: string,
  reason: string,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('moderation_action').insert({
    target_type: targetType,
    target_id: targetId,
    action,
    reason,
    actor_id: userData.user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  // If suspending a listing, update its status
  if (targetType === 'listing' && action === 'suspend') {
    await supabase
      .from('catalogue_listing')
      .update({ status: 'suspended' })
      .eq('id', targetId);
  } else if (targetType === 'listing' && action === 'feature') {
    await supabase
      .from('catalogue_listing')
      .update({ status: 'published' })
      .eq('id', targetId);
  } else if (targetType === 'listing' && action === 'demote') {
    await supabase
      .from('catalogue_listing')
      .update({ status: 'published' })
      .eq('id', targetId);
  } else if (targetType === 'listing' && action === 'remove') {
    await supabase
      .from('catalogue_listing')
      .update({ status: 'removed', deleted_at: new Date().toISOString() })
      .eq('id', targetId);
  }

  await supabase.from('audit_log').insert({
    actor_id: userData.user?.id ?? null,
    action: `moderation_${action}`,
    target_type: targetType,
    target_id: targetId,
    reason,
  });
}

export async function fetchModerationActions(): Promise<ModerationAction[]> {
  const { data, error } = await supabase
    .from('moderation_action')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as ModerationAction[];
}

// ---- O-09: Reports queue ----

export async function fetchSafetyReports(): Promise<SafetyReport[]> {
  const { data, error } = await supabase
    .from('safety_report')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SafetyReport[];
}

export async function triageReport(
  reportId: string,
  status: string,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('safety_report')
    .update({
      status,
      triaged_by: userData.user?.id ?? null,
      triaged_at: new Date().toISOString(),
    })
    .eq('id', reportId);
  if (error) throw new Error(error.message);
}

// ---- O-10: Suspend immediately ----

export async function suspendProvider(
  providerOrgId: string,
  reason: string,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  // Suspend the provider
  const { error: pErr } = await supabase
    .from('provider_org')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', providerOrgId);
  if (pErr) throw new Error(pErr.message);

  // Hide all their listings
  await supabase
    .from('catalogue_listing')
    .update({ status: 'suspended' })
    .eq('provider_org_id', providerOrgId);

  // Audit log
  await supabase.from('audit_log').insert({
    actor_id: userData.user?.id ?? null,
    action: 'suspend_provider',
    target_type: 'provider_org',
    target_id: providerOrgId,
    reason,
  });
}

export async function reinstateProvider(
  providerOrgId: string,
  reason: string,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error: pErr } = await supabase
    .from('provider_org')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', providerOrgId);
  if (pErr) throw new Error(pErr.message);

  await supabase
    .from('catalogue_listing')
    .update({ status: 'published' })
    .eq('provider_org_id', providerOrgId)
    .eq('status', 'suspended');

  await supabase.from('audit_log').insert({
    actor_id: userData.user?.id ?? null,
    action: 'reinstate_provider',
    target_type: 'provider_org',
    target_id: providerOrgId,
    reason,
  });
}

// ---- O-11: Audit search ----

export async function searchAuditLog(filters: {
  actorId?: string;
  targetType?: string;
  targetId?: string;
  fromTime?: string;
  toTime?: string;
}): Promise<AuditLogEntry[]> {
  let query = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
  if (filters.actorId) query = query.eq('actor_id', filters.actorId);
  if (filters.targetType) query = query.eq('target_type', filters.targetType);
  if (filters.targetId) query = query.eq('target_id', filters.targetId);
  if (filters.fromTime) query = query.gte('created_at', filters.fromTime);
  if (filters.toTime) query = query.lte('created_at', filters.toTime);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLogEntry[];
}

// ---- O-12: Support lookup ----

export async function supportLookup(identifier: string): Promise<{
  bookings?: Booking[];
  trips?: Trip[];
  conversations?: Conversation[];
  providers?: Provider[];
  listings?: Listing[];
}> {
  const result: {
    bookings?: Booking[];
    trips?: Trip[];
    conversations?: Conversation[];
    providers?: Provider[];
    listings?: Listing[];
  } = {};

  // Try as booking id, trip id, provider name, listing title
  const { data: bookings } = await supabase
    .from('booking')
    .select('*')
    .ilike('title', `%${identifier}%`)
    .limit(10);
  if (bookings && bookings.length > 0) result.bookings = bookings as Booking[];

  const { data: trips } = await supabase
    .from('trip')
    .select('*')
    .ilike('title', `%${identifier}%`)
    .limit(10);
  if (trips && trips.length > 0) result.trips = trips as Trip[];

  const { data: providers } = await supabase
    .from('provider_org')
    .select('*')
    .or(`legal_name.ilike.%${identifier}%,display_name.ilike.%${identifier}%`)
    .limit(10);
  if (providers && providers.length > 0) result.providers = providers as Provider[];

  const { data: listings } = await supabase
    .from('catalogue_listing')
    .select('*')
    .ilike('title', `%${identifier}%`)
    .limit(10);
  if (listings && listings.length > 0) result.listings = listings as Listing[];

  const { data: conversations } = await supabase
    .from('conversation')
    .select('*')
    .ilike('subject', `%${identifier}%`)
    .limit(10);
  if (conversations && conversations.length > 0) result.conversations = conversations as Conversation[];

  return result;
}

// ---- O-13: Entity timeline ----

export async function fetchEntityTimeline(
  targetType: string,
  targetId: string,
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLogEntry[];
}

export async function fetchBookingHistory(bookingId: string): Promise<BookingHistoryEntry[]> {
  const { data, error } = await supabase
    .from('booking_history')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as BookingHistoryEntry[];
}

// ---- O-16: Break-glass elevation ----

export async function requestElevation(justification: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const { error } = await supabase.from('admin_elevation').insert({
    requested_by: userData.user.id,
    justification,
    status: 'pending',
  });
  if (error) throw new Error(error.message);
}

export async function fetchElevations(): Promise<AdminElevation[]> {
  const { data, error } = await supabase
    .from('admin_elevation')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminElevation[];
}

// ---- O-06: Curate hidden gems ----

export async function createGem(params: {
  region_id: string;
  name: string;
  description: string;
  authenticity: number;
  crowd_level: number;
  story: string;
  practical_notes: string;
  tags: string[];
}): Promise<HiddenGem> {
  const { data, error } = await supabase
    .from('hidden_gem')
    .insert({
      region_id: params.region_id,
      name: params.name,
      description: params.description,
      authenticity: params.authenticity,
      crowd_level: params.crowd_level,
      story: params.story,
      practical_notes: params.practical_notes,
      tags: params.tags,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as HiddenGem;
}

export async function fetchAllGems(): Promise<HiddenGem[]> {
  const { data, error } = await supabase
    .from('hidden_gem')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as HiddenGem[];
}

// ---- Fetch all providers for ops console ----

export async function fetchAllProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('provider_org')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as Provider[];
}

export async function fetchAllListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('catalogue_listing')
    .select('*, provider:provider_org_id(*)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as Listing[];
}

// ---- Import BookingHistoryEntry type ----
import type { BookingHistoryEntry } from './types';
