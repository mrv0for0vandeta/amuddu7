// Data access layer for the Provider Portal (Section 7 features P-01 through P-21).

import { supabase } from './supabase';
import type {
  Provider,
  Listing,
  ProviderTeamMember,
  VerificationEvidence,
  ListingVariant,
  AvailabilityBlock,
  CancellationPolicy,
  CommissionStatement,
  Booking,
  Conversation,
  Message,
  Region,
} from './types';

// ---- P-01: Register a business ----

export async function registerProvider(params: {
  legal_name: string;
  display_name: string;
  category: string;
  region_id: string;
  languages: string[];
  bio: string;
}): Promise<Provider> {
  const { data, error } = await supabase
    .from('provider_org')
    .insert({
      legal_name: params.legal_name,
      display_name: params.display_name,
      category: params.category,
      region_id: params.region_id,
      languages: params.languages,
      bio: params.bio,
      verification_state: 'pending',
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const provider = data as Provider;

  // Auto-create a team member entry for the creator
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    await supabase.from('provider_team_member').insert({
      provider_org_id: provider.id,
      user_id: userData.user.id,
      role: 'owner',
      joined_at: new Date().toISOString(),
    });
  }

  // Create a verification case
  await supabase.from('verification_case').insert({
    provider_org_id: provider.id,
    status: 'pending',
    priority: 0,
  });

  return provider;
}

// ---- P-04: Team members ----

export async function fetchTeamMembers(providerOrgId: string): Promise<ProviderTeamMember[]> {
  const { data, error } = await supabase
    .from('provider_team_member')
    .select('*')
    .eq('provider_org_id', providerOrgId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProviderTeamMember[];
}

export async function inviteTeamMember(
  providerOrgId: string,
  email: string,
  role: string,
): Promise<void> {
  // For MVP: create a pending invite entry. In production this would send an email.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  // Look up user by email is not available via anon key, so we store a pending invite
  const { error } = await supabase.from('provider_team_member').insert({
    provider_org_id: providerOrgId,
    user_id: userData.user.id, // placeholder: in production, resolve by email
    role,
  });
  if (error) throw new Error(error.message);
}

export async function removeTeamMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('provider_team_member').delete().eq('id', memberId);
  if (error) throw new Error(error.message);
}

// ---- Fetch provider orgs for the current user ----

export async function fetchMyProviders(): Promise<Provider[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data: memberships, error: mErr } = await supabase
    .from('provider_team_member')
    .select('provider_org_id')
    .eq('user_id', userData.user.id);
  if (mErr) throw new Error(mErr.message);
  if (!memberships || memberships.length === 0) return [];
  const orgIds = memberships.map((m: { provider_org_id: string }) => m.provider_org_id);
  const { data: orgs, error: oErr } = await supabase
    .from('provider_org')
    .select('*')
    .in('id', orgIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (oErr) throw new Error(oErr.message);
  return (orgs ?? []) as Provider[];
}

// ---- P-05: Create a listing ----

export async function createListing(params: {
  provider_org_id: string;
  region_id: string;
  category: string;
  title: string;
  description: string;
  languages: string[];
  min_age: number;
  difficulty: number;
  min_party: number;
  max_party: number;
  duration_minutes: number;
  service_tier: number;
  accessibility: Record<string, unknown>;
  visual_type?: string | null;
}): Promise<Listing> {
  const { data, error } = await supabase
    .from('catalogue_listing')
    .insert({
      provider_org_id: params.provider_org_id,
      region_id: params.region_id,
      category: params.category,
      title: params.title,
      description: params.description,
      languages: params.languages,
      min_age: params.min_age,
      difficulty: params.difficulty,
      min_party: params.min_party,
      max_party: params.max_party,
      duration_minutes: params.duration_minutes,
      service_tier: params.service_tier,
      accessibility: params.accessibility,
      visual_type: params.visual_type ?? null,
      status: 'draft',
      published_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Listing;
}

export async function fetchListingsByProvider(providerOrgId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('catalogue_listing')
    .select('*')
    .eq('provider_org_id', providerOrgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Listing[];
}

export async function updateListing(id: string, updates: Partial<Listing>): Promise<void> {
  const { error } = await supabase
    .from('catalogue_listing')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function publishListing(id: string): Promise<void> {
  await updateListing(id, { status: 'published' });
}

// ---- P-06: Listing variants ----

export async function fetchVariants(listingId: string): Promise<ListingVariant[]> {
  const { data, error } = await supabase
    .from('catalogue_listing_variant')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ListingVariant[];
}

export async function createVariant(params: {
  listing_id: string;
  variant_type: string;
  duration_minutes: number;
  min_party: number;
  max_party: number;
}): Promise<ListingVariant> {
  const { data, error } = await supabase
    .from('catalogue_listing_variant')
    .insert(params)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ListingVariant;
}

export async function deleteVariant(id: string): Promise<void> {
  const { error } = await supabase.from('catalogue_listing_variant').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- P-07: Set prices (effective-dated) ----

export async function setPrice(params: {
  listing_id: string;
  amount_minor: number;
  currency: string;
  pricing_unit: string;
  effective_from?: string;
}): Promise<void> {
  const { error } = await supabase.from('catalogue_price_rule').insert({
    listing_id: params.listing_id,
    amount_minor: params.amount_minor,
    currency: params.currency,
    pricing_unit: params.pricing_unit,
    effective_from: params.effective_from ?? new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

// ---- P-08: Availability blocks ----

export async function fetchAvailabilityBlocks(providerOrgId: string): Promise<AvailabilityBlock[]> {
  const { data, error } = await supabase
    .from('provider_availability_block')
    .select('*')
    .eq('provider_org_id', providerOrgId)
    .order('start_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AvailabilityBlock[];
}

export async function createAvailabilityBlock(params: {
  provider_org_id: string;
  listing_id?: string | null;
  start_date: string;
  end_date: string;
  reason?: string | null;
}): Promise<AvailabilityBlock> {
  const { data, error } = await supabase
    .from('provider_availability_block')
    .insert({
      provider_org_id: params.provider_org_id,
      listing_id: params.listing_id ?? null,
      start_date: params.start_date,
      end_date: params.end_date,
      reason: params.reason ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as AvailabilityBlock;
}

export async function deleteAvailabilityBlock(id: string): Promise<void> {
  const { error } = await supabase.from('provider_availability_block').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- P-09: Cancellation policies ----

export async function fetchCancellationPolicy(listingId: string): Promise<CancellationPolicy | null> {
  const { data, error } = await supabase
    .from('cancellation_policy')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as CancellationPolicy | null;
}

export async function setCancellationPolicy(params: {
  listing_id: string;
  policy_type: string;
  free_until_hours?: number | null;
  tier1_refund_pct?: number | null;
  tier1_hours?: number | null;
  tier2_refund_pct?: number | null;
  tier2_hours?: number | null;
  non_refundable?: boolean;
}): Promise<void> {
  const { error } = await supabase.from('cancellation_policy').insert({
    listing_id: params.listing_id,
    policy_type: params.policy_type,
    free_until_hours: params.free_until_hours ?? null,
    tier1_refund_pct: params.tier1_refund_pct ?? null,
    tier1_hours: params.tier1_hours ?? null,
    tier2_refund_pct: params.tier2_refund_pct ?? null,
    tier2_hours: params.tier2_hours ?? null,
    non_refundable: params.non_refundable ?? false,
  });
  if (error) throw new Error(error.message);
}

// ---- P-02: Verification evidence ----

export async function fetchEvidence(providerOrgId: string): Promise<VerificationEvidence[]> {
  const { data, error } = await supabase
    .from('provider_verification_evidence')
    .select('*')
    .eq('provider_org_id', providerOrgId)
    .order('submitted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as VerificationEvidence[];
}

export async function submitEvidence(params: {
  provider_org_id: string;
  evidence_type: string;
  document_url: string;
}): Promise<VerificationEvidence> {
  const { data, error } = await supabase
    .from('provider_verification_evidence')
    .insert({
      provider_org_id: params.provider_org_id,
      evidence_type: params.evidence_type,
      document_url: params.document_url,
      status: 'submitted',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as VerificationEvidence;
}

// ---- P-12: Provider inbox (sorted by response deadline) ----

export async function fetchProviderInbox(providerOrgId: string): Promise<(Conversation & {
  messages?: Message[];
})[]> {
  const { data, error } = await supabase
    .from('conversation')
    .select('*, messages:message(*)')
    .eq('provider_org_id', providerOrgId)
    .order('last_message_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as (Conversation & { messages?: Message[] })[];
}

export async function replyToConversation(
  conversationId: string,
  body: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from('message')
    .insert({
      conversation_id: conversationId,
      sender: 'provider',
      body,
      delivered: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await supabase
    .from('conversation')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data as Message;
}

// ---- P-15: Quote a price ----

export async function providerQuoteBooking(
  bookingId: string,
  quotedPriceMinor: number,
  quotedCurrency: string,
): Promise<void> {
  const { error } = await supabase
    .from('booking')
    .update({
      quoted_price_minor: quotedPriceMinor,
      quoted_currency: quotedCurrency,
      status: 'quoted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);
  if (error) throw new Error(error.message);

  // Record booking history
  await supabase.from('booking_history').insert({
    booking_id: bookingId,
    previous_status: 'pending',
    new_status: 'quoted',
    reason: 'Provider quoted a price',
  });
}

// ---- P-16: Confirm a booking ----

export async function providerConfirmBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('booking')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);
  if (error) throw new Error(error.message);

  await supabase.from('booking_history').insert({
    booking_id: bookingId,
    previous_status: 'quoted',
    new_status: 'confirmed',
    reason: 'Provider confirmed the booking',
  });
}

// ---- P-17: Provider attestation ----

export async function providerAttestBooking(bookingId: string): Promise<void> {
  const { data: booking, error: fErr } = await supabase
    .from('booking')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();
  if (fErr) throw new Error(fErr.message);
  if (!booking) throw new Error('Booking not found');

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    attested_provider: true,
  };
  const b = booking as Booking;
  if (b.attested_traveller) {
    updates.attested_at = new Date().toISOString();
    updates.status = 'completed';
  }

  const { error } = await supabase.from('booking').update(updates).eq('id', bookingId);
  if (error) throw new Error(error.message);

  await supabase.from('attestation').insert({ booking_id: bookingId, party: 'provider' });

  if (b.attested_traveller) {
    await supabase.from('booking_history').insert({
      booking_id: bookingId,
      previous_status: 'confirmed',
      new_status: 'completed',
      reason: 'Both parties attested',
    });
  }
}

// ---- P-20: Commission statements ----

export async function fetchCommissionStatements(providerOrgId: string): Promise<CommissionStatement[]> {
  const { data, error } = await supabase
    .from('commission_statement')
    .select('*, booking:booking_id(*)')
    .eq('provider_org_id', providerOrgId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CommissionStatement[];
}

// ---- Fetch bookings for a provider ----

export async function fetchBookingsForProvider(providerOrgId: string): Promise<Booking[]> {
  // Bookings don't have provider_org_id directly; join via listing
  const { data: listings } = await supabase
    .from('catalogue_listing')
    .select('id')
    .eq('provider_org_id', providerOrgId);
  if (!listings || listings.length === 0) return [];
  const listingIds = listings.map((l: { id: string }) => l.id);
  const { data, error } = await supabase
    .from('booking')
    .select('*')
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Booking[];
}

// ---- Fetch regions for dropdowns ----

export async function fetchAllRegions(): Promise<Region[]> {
  const { data, error } = await supabase
    .from('geo_region')
    .select('*')
    .order('level', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Region[];
}
