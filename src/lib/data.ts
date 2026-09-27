// Data access layer for the Amuddu traveller web experience.
// Fetches providers, listings, gems, and regions from Supabase
// and joins price rules onto listings for the engine.

import { supabase } from './supabase';
import type {
  Listing,
  Provider,
  PriceRule,
  HiddenGem,
  Region,
  Trip,
  TripVersion,
  TripDay,
  TripItem,
  TripInput,
  Flight,
  TransportOption,
  Booking,
  Conversation,
  Message,
  Review,
  EmergencyContact,
  TripShare,
  TravellerProfile,
  UserConsent,
  Dispute,
  BookingHistoryEntry,
  CancellationPolicy,
  UserSession,
} from './types';

export async function fetchRegions(): Promise<Region[]> {
  const { data, error } = await supabase
    .from('geo_region')
    .select('*')
    .order('level', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Region[];
}

export async function fetchListingsByRegion(regionId: string): Promise<Listing[]> {
  const { data: listings, error: lErr } = await supabase
    .from('catalogue_listing')
    .select('*, provider:provider_org_id(*)')
    .eq('region_id', regionId)
    .eq('status', 'published')
    .is('deleted_at', null);
  if (lErr) throw new Error(lErr.message);
  if (!listings) return [];

  // Fetch prices for these listings
  const listingIds = listings.map((l) => l.id);
  if (listingIds.length === 0) return listings as Listing[];
  const { data: prices, error: pErr } = await supabase
    .from('catalogue_price_rule')
    .select('*')
    .in('listing_id', listingIds);
  if (pErr) throw new Error(pErr.message);

  const priceMap = new Map<string, PriceRule>();
  for (const p of prices ?? []) {
    priceMap.set(p.listing_id, p);
  }

  return (listings as (Listing & { provider: Provider })[]).map((l) => ({
    ...l,
    provider: l.provider,
    price: priceMap.get(l.id),
  }));
}

export async function fetchGemsByRegion(regionId: string): Promise<HiddenGem[]> {
  const { data, error } = await supabase
    .from('hidden_gem')
    .select('*')
    .eq('region_id', regionId);
  if (error) throw new Error(error.message);
  return (data ?? []) as HiddenGem[];
}

export async function fetchListing(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('catalogue_listing')
    .select('*, provider:provider_org_id(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: price, error: pErr } = await supabase
    .from('catalogue_price_rule')
    .select('*')
    .eq('listing_id', id)
    .limit(1)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);

  return { ...(data as Listing), provider: (data as Listing & { provider: Provider }).provider, price: price as PriceRule | undefined };
}

export async function fetchProvider(id: string): Promise<Provider | null> {
  const { data, error } = await supabase
    .from('provider_org')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Provider | null;
}

export async function fetchProvidersByRegion(regionId: string): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('provider_org')
    .select('*')
    .eq('region_id', regionId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('avg_rating', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Provider[];
}

export async function createTrip(input: TripInput): Promise<Trip> {
  const { data, error } = await supabase
    .from('trip')
    .insert({
      region_id: input.region_id,
      start_date: input.start_date,
      end_date: input.end_date,
      budget_minor: input.budget_minor,
      budget_currency: input.budget_currency,
      party_adults: input.party_adults,
      party_children: input.party_children,
      pace: input.pace,
      luxury_level: input.luxury_level,
      stamina: input.stamina,
      interests: input.interests,
      origin_city: input.origin_city ?? 'Casablanca',
      status: 'planning',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Trip;
}

export async function saveItinerary(
  tripId: string,
  versionNumber: number,
  budgetAlloc: Record<string, unknown>,
  days: { day_number: number; date: string; summary: string; items: Omit<TripItem, 'id' | 'trip_day_id' | 'created_at'>[] }[],
): Promise<{ versionId: string; dayIds: string[] }> {
  // Create version
  const { data: version, error: vErr } = await supabase
    .from('trip_version')
    .insert({ trip_id: tripId, version_number: versionNumber, budget_alloc: budgetAlloc })
    .select()
    .single();
  if (vErr) throw new Error(vErr.message);
  const versionId = (version as TripVersion).id;

  const dayIds: string[] = [];
  for (const day of days) {
    const { data: dayRow, error: dErr } = await supabase
      .from('trip_day')
      .insert({ trip_version_id: versionId, day_number: day.day_number, date: day.date, summary: day.summary })
      .select()
      .single();
    if (dErr) throw new Error(dErr.message);
    const dayId = (dayRow as TripDay).id;
    dayIds.push(dayId);

    for (let i = 0; i < day.items.length; i++) {
      const item = day.items[i];
      if (!item) continue;
      const { error: iErr } = await supabase.from('trip_item').insert({
        trip_day_id: dayId,
        position: i,
        item_type: item.item_type,
        listing_id: item.listing_id,
        gem_id: item.gem_id,
        title: item.title,
        description: item.description,
        start_time: item.start_time,
        end_time: item.end_time,
        est_cost_minor: item.est_cost_minor,
        est_currency: item.est_currency,
        locked: item.locked,
        lock_reason: item.lock_reason,
        reason_set: item.reason_set,
      });
      if (iErr) throw new Error(iErr.message);
    }
  }

  // Update trip current_version_id — check the result, because if this
  // fails silently the itinerary page shows nothing (the bug we are fixing).
  const { error: updateErr } = await supabase
    .from('trip')
    .update({ current_version_id: versionId, status: 'planning' })
    .eq('id', tripId);
  if (updateErr) throw new Error(updateErr.message);

  return { versionId, dayIds };
}

export async function fetchTrip(tripId: string): Promise<{
  trip: Trip;
  version: TripVersion;
  days: (TripDay & { items: TripItem[] })[];
} | null> {
  const { data: trip, error: tErr } = await supabase
    .from('trip')
    .select('*')
    .eq('id', tripId)
    .maybeSingle();
  if (tErr) throw new Error(tErr.message);
  if (!trip) return null;

  const tripData = trip as Trip;
  if (!tripData.current_version_id) return null;

  const { data: version, error: vErr } = await supabase
    .from('trip_version')
    .select('*')
    .eq('id', tripData.current_version_id)
    .maybeSingle();
  if (vErr) throw new Error(vErr.message);

  const { data: days, error: dErr } = await supabase
    .from('trip_day')
    .select('*, items:trip_item(*)')
    .eq('trip_version_id', tripData.current_version_id)
    .order('day_number', { ascending: true })
    .order('position', { ascending: true, foreignTable: 'trip_item' });
  if (dErr) throw new Error(dErr.message);

  return {
    trip: tripData,
    version: version as TripVersion,
    days: (days ?? []) as (TripDay & { items: TripItem[] })[],
  };
}

export async function fetchAllTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trip')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Trip[];
}

export async function recordFeedback(
  tripItemId: string,
  rating: number | null,
  thumbs: string | null,
): Promise<void> {
  const { error } = await supabase.from('item_feedback').insert({
    trip_item_id: tripItemId,
    rating,
    thumbs,
  });
  if (error) throw new Error(error.message);
}

export async function updateTripItem(
  itemId: string,
  updates: {
    title?: string;
    description?: string;
    listing_id?: string | null;
    est_cost_minor?: number;
    est_currency?: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from('trip_item')
    .update(updates)
    .eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function fetchFlights(
  direction: 'inbound' | 'outbound',
): Promise<Flight[]> {
  const { data, error } = await supabase
    .from('flight')
    .select('*')
    .order('price_minor', { ascending: true });
  if (error) throw new Error(error.message);
  const flights = (data ?? []) as Flight[];
  // Inbound: flights arriving in Morocco (destination IATA is CMN, RAK, AGA, RBA, FEZ, NDR, AGA, OUD, EUN)
  // Outbound: flights departing from Morocco (origin IATA is a Moroccan airport)
  const moroccanAirports = ['CMN', 'RAK', 'AGA', 'RBA', 'FEZ', 'NDR', 'OUD', 'EUN', 'AHU', 'EUN', 'TNG', 'OUD'];
  if (direction === 'inbound') {
    return flights.filter((f) => moroccanAirports.includes(f.destination_iata));
  }
  return flights.filter((f) => moroccanAirports.includes(f.origin_iata));
}

export async function fetchTransportByRoute(
  originCity: string,
  destinationCity: string,
): Promise<TransportOption[]> {
  const { data, error } = await supabase
    .from('transport_option')
    .select('*')
    .or(`origin_city.ilike.${originCity},origin_city.ilike.${destinationCity}`)
    .order('price_minor', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TransportOption[];
}

export async function fetchAllTransport(): Promise<TransportOption[]> {
  const { data, error } = await supabase
    .from('transport_option')
    .select('*')
    .order('transport_type', { ascending: true })
    .order('price_minor', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TransportOption[];
}

export async function fetchProvidersByCategory(
  category: string,
  regionId?: string,
): Promise<Provider[]> {
  let query = supabase
    .from('provider_org')
    .select('*')
    .eq('status', 'active')
    .order('avg_rating', { ascending: false });
  if (category === 'guide') {
    query = query.in('category', ['guide', 'experience_host']);
  } else if (category === 'stay') {
    query = query.eq('category', 'accommodation');
  } else if (category === 'meal') {
    query = query.in('category', ['restaurant', 'experience_host']);
  } else if (category === 'transfer') {
    query = query.in('category', ['transport', 'transfer']);
  } else {
    query = query.in('category', ['guide', 'experience_host', 'accommodation', 'restaurant']);
  }
  if (regionId) {
    query = query.or(`region_id.eq.${regionId}`);
  }
  const { data, error } = await query.limit(6);
  if (error) throw new Error(error.message);
  return (data ?? []) as Provider[];
}

// ---- Booking CRUD ----

export async function createBooking(booking: {
  trip_id?: string | null;
  listing_id?: string | null;
  item_type: string;
  title: string;
  image_url?: string | null;
  provider_name?: string | null;
  price_minor: number;
  currency?: string;
  booking_date?: string | null;
  party_size: number;
  luxury_level: number;
}): Promise<Booking> {
  const { data, error } = await supabase
    .from('booking')
    .insert({
      trip_id: booking.trip_id ?? null,
      listing_id: booking.listing_id ?? null,
      item_type: booking.item_type,
      title: booking.title,
      image_url: booking.image_url ?? null,
      provider_name: booking.provider_name ?? null,
      price_minor: booking.price_minor,
      currency: booking.currency ?? 'EUR',
      booking_date: booking.booking_date ?? null,
      party_size: booking.party_size,
      luxury_level: booking.luxury_level,
      status: 'confirmed',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Booking;
}

export async function fetchBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('booking')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Booking[];
}

export async function cancelBooking(id: string): Promise<void> {
  const { error } = await supabase
    .from('booking')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchListingsByCategoryAndRegion(
  category: string,
  regionId: string,
  excludeId?: string,
): Promise<Listing[]> {
  let query = supabase
    .from('catalogue_listing')
    .select('*, provider:provider_org(*), price:catalogue_price_rule(*)')
    .eq('region_id', regionId)
    .eq('status', 'active');
  if (category !== 'stay' && category !== 'transfer') {
    query = query.eq('category', category);
  } else {
    query = query.eq('category', category);
  }
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  const { data, error } = await query.order('service_tier', { ascending: false }).limit(4);
  if (error) throw new Error(error.message);
  return (data ?? []) as Listing[];
}

export async function fetchTransportAlternatives(
  regionId: string,
  excludeId?: string,
): Promise<TransportOption[]> {
  let query = supabase
    .from('transport_option')
    .select('*')
    .order('price_minor', { ascending: true })
    .limit(5);
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const all = (data ?? []) as TransportOption[];
  // Only ONCF trains are locked to a single provider — everything else is switchable
  return all.filter((t) => t.transport_type !== 'train');
}

export async function fetchGemAlternatives(
  regionId: string,
  excludeId?: string,
): Promise<HiddenGem[]> {
  let query = supabase
    .from('hidden_gem')
    .select('*')
    .eq('region_id', regionId)
    .order('authenticity', { ascending: false });
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  const { data, error } = await query.limit(4);
  if (error) throw new Error(error.message);
  return (data ?? []) as HiddenGem[];
}

// ---- Itinerary item editing (T-19 to T-24) ----

export async function removeTripItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('trip_item').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function toggleItemLock(
  itemId: string,
  locked: boolean,
  lockReason: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from('trip_item')
    .update({ locked, lock_reason: lockReason })
    .eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function reorderTripItems(
  updates: { id: string; position: number }[],
): Promise<void> {
  for (const u of updates) {
    const { error } = await supabase
      .from('trip_item')
      .update({ position: u.position })
      .eq('id', u.id);
    if (error) throw new Error(error.message);
  }
}

// ---- Conversations and messaging (T-43 to T-47) ----

export async function startConversation(params: {
  listing_id?: string | null;
  trip_item_id?: string | null;
  provider_org_id: string | null;
  traveller_name: string;
  traveller_contact: string;
  subject: string;
}): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversation')
    .insert({
      listing_id: params.listing_id ?? null,
      trip_item_id: params.trip_item_id ?? null,
      provider_org_id: params.provider_org_id,
      traveller_name: params.traveller_name,
      traveller_contact: params.traveller_contact,
      subject: params.subject,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Conversation;
}

export async function fetchConversations(): Promise<(Conversation & {
  provider?: Provider | null;
  messages?: Message[];
})[]> {
  const { data, error } = await supabase
    .from('conversation')
    .select('*, provider:provider_org_id(*)')
    .order('last_message_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as (Conversation & { provider?: Provider | null })[];
}

export async function fetchConversation(
  id: string,
): Promise<(Conversation & { provider?: Provider | null }) | null> {
  const { data, error } = await supabase
    .from('conversation')
    .select('*, provider:provider_org_id(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as (Conversation & { provider?: Provider | null }) | null;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('message')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}

export async function sendMessage(
  conversationId: string,
  sender: string,
  body: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from('message')
    .insert({
      conversation_id: conversationId,
      sender,
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

// ---- Booking lifecycle (T-48 to T-52) ----

export async function requestBooking(params: {
  trip_id?: string | null;
  listing_id?: string | null;
  conversation_id?: string | null;
  item_type: string;
  title: string;
  image_url?: string | null;
  provider_name?: string | null;
  price_minor: number;
  currency?: string;
  booking_date?: string | null;
  party_size: number;
  luxury_level: number;
}): Promise<Booking> {
  const { data, error } = await supabase
    .from('booking')
    .insert({
      trip_id: params.trip_id ?? null,
      listing_id: params.listing_id ?? null,
      conversation_id: params.conversation_id ?? null,
      item_type: params.item_type,
      title: params.title,
      image_url: params.image_url ?? null,
      provider_name: params.provider_name ?? null,
      price_minor: params.price_minor,
      currency: params.currency ?? 'EUR',
      booking_date: params.booking_date ?? null,
      party_size: params.party_size,
      luxury_level: params.luxury_level,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Booking;
}

export async function quoteBooking(
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
}

export async function confirmBookingById(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('booking')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);
  if (error) throw new Error(error.message);
}

export async function attestBooking(
  bookingId: string,
  party: 'traveller' | 'provider',
): Promise<void> {
  const { data: booking, error: fErr } = await supabase
    .from('booking')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();
  if (fErr) throw new Error(fErr.message);
  if (!booking) throw new Error('Booking not found');

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (party === 'traveller') updates.attested_traveller = true;
  else updates.attested_provider = true;

  const b = booking as Booking;
  const bothAttested =
    (party === 'traveller' ? true : b.attested_traveller) &&
    (party === 'provider' ? true : b.attested_provider);
  if (bothAttested) {
    updates.attested_at = new Date().toISOString();
    updates.status = 'completed';
  }

  const { error } = await supabase.from('booking').update(updates).eq('id', bookingId);
  if (error) throw new Error(error.message);

  await supabase.from('attestation').insert({ booking_id: bookingId, party });
}

// ---- Reviews (T-62) ----

export async function createReview(params: {
  booking_id: string;
  provider_org_id: string | null;
  rating: number;
  body?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('review').insert({
    booking_id: params.booking_id,
    provider_org_id: params.provider_org_id,
    rating: params.rating,
    body: params.body ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchReviewsByProvider(
  providerOrgId: string,
): Promise<Review[]> {
  const { data, error } = await supabase
    .from('review')
    .select('*')
    .eq('provider_org_id', providerOrgId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Review[];
}

export async function hasReviewForBooking(bookingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('review')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

// ---- Emergency contacts (T-42) ----

export async function fetchEmergencyContacts(
  regionId?: string | null,
): Promise<EmergencyContact[]> {
  let query = supabase.from('emergency_contact').select('*');
  if (regionId) {
    query = query.or(`region_id.eq.${regionId},region_id.is.null`);
  }
  const { data, error } = await query.order('contact_type', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as EmergencyContact[];
}

// ---- Trip sharing (T-29) ----

export async function createTripShare(
  tripId: string,
): Promise<TripShare> {
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const { data, error } = await supabase
    .from('trip_share')
    .insert({ trip_id: tripId, share_token: token })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TripShare;
}

export async function fetchTripByShareToken(
  token: string,
): Promise<{ trip: Trip; version: TripVersion; days: (TripDay & { items: TripItem[] })[] } | null> {
  const { data: share, error: sErr } = await supabase
    .from('trip_share')
    .select('trip_id')
    .eq('share_token', token)
    .maybeSingle();
  if (sErr) throw new Error(sErr.message);
  if (!share) return null;
  return fetchTrip((share as { trip_id: string }).trip_id);
}

// ---- Traveller profile (T-06, T-07, T-08) ----

export async function fetchProfile(): Promise<TravellerProfile | null> {
  const { data, error } = await supabase
    .from('traveller_profile')
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as TravellerProfile | null;
}

export async function upsertProfile(
  profile: Partial<TravellerProfile>,
): Promise<TravellerProfile> {
  const { data, error } = await supabase
    .from('traveller_profile')
    .upsert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      ...profile,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TravellerProfile;
}

export async function completeOnboarding(
  profile: Partial<TravellerProfile>,
): Promise<TravellerProfile> {
  return upsertProfile({ ...profile, onboarding_completed: true });
}

// ---- User consent (T-12) ----

export async function fetchConsent(): Promise<UserConsent[]> {
  const { data, error } = await supabase
    .from('user_consent')
    .select('*')
    .order('purpose', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as UserConsent[];
}

export async function grantConsent(
  purpose: string,
  version: string,
  granted: boolean,
): Promise<void> {
  const { error } = await supabase.from('user_consent').upsert({
    purpose,
    version,
    granted,
    granted_at: granted ? new Date().toISOString() : null,
    withdrawn_at: !granted ? new Date().toISOString() : null,
  }, {
    onConflict: 'user_id,purpose,version',
  });
  if (error) throw new Error(error.message);
}

// ---- Account deletion (T-11) ----

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account');
  if (error) throw new Error(error.message);
}

// ---- Data export (T-10) ----

export async function exportMyData(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('export-data');
  if (error) throw new Error(error.message);
  return (data as { url?: string; message?: string }).url ?? (data as { message?: string })?.message ?? 'Export queued. You will receive a link by email.';
}

// ---- Disputes (T-53) ----

export async function raiseDispute(params: {
  booking_id: string;
  dispute_type: string;
  description: string;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('dispute').insert({
    booking_id: params.booking_id,
    raised_by: userData.user?.id ?? null,
    dispute_type: params.dispute_type,
    description: params.description,
    status: 'open',
  });
  if (error) throw new Error(error.message);
}

export async function fetchDisputes(): Promise<Dispute[]> {
  const { data, error } = await supabase
    .from('dispute')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Dispute[];
}

// ---- Report a provider (T-54) ----

export async function reportProvider(params: {
  target_type: string;
  target_id: string;
  report_type: string;
  description: string;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('safety_report').insert({
    reporter_id: userData.user?.id ?? null,
    target_type: params.target_type,
    target_id: params.target_id,
    report_type: params.report_type,
    description: params.description,
    status: 'open',
  });
  if (error) throw new Error(error.message);
}

// ---- Booking history (T-50) ----

export async function fetchBookingHistory(bookingId: string): Promise<BookingHistoryEntry[]> {
  const { data, error } = await supabase
    .from('booking_history')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as BookingHistoryEntry[];
}

// ---- Cancellation policy display (T-51) ----

export async function fetchCancellationPolicyForListing(listingId: string): Promise<CancellationPolicy | null> {
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

// ---- Mark trip complete (T-30) ----

export async function markTripComplete(tripId: string): Promise<void> {
  const { error } = await supabase
    .from('trip')
    .update({ status: 'completed' })
    .eq('id', tripId);
  if (error) throw new Error(error.message);

  // Write audit entry
  const { data: userData } = await supabase.auth.getUser();
  await supabase.from('audit_log').insert({
    actor_id: userData.user?.id ?? null,
    action: 'trip_completed',
    target_type: 'trip',
    target_id: tripId,
    reason: 'Traveller marked trip complete',
  });
}

// ---- Trip version history (T-26) ----

export async function fetchTripVersions(tripId: string): Promise<TripVersion[]> {
  const { data, error } = await supabase
    .from('trip_version')
    .select('*')
    .eq('trip_id', tripId)
    .order('version_number', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TripVersion[];
}

export async function revertToVersion(tripId: string, versionId: string): Promise<void> {
  const { error } = await supabase
    .from('trip')
    .update({ current_version_id: versionId })
    .eq('id', tripId);
  if (error) throw new Error(error.message);
}

// ---- User sessions (T-09) ----

export async function fetchUserSessions(): Promise<UserSession[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await supabase
    .from('user_session')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('last_seen_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as UserSession[];
}

export async function revokeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_session')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw new Error(error.message);
}

export async function revokeAllSessions(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const { error } = await supabase
    .from('user_session')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userData.user.id)
    .is('revoked_at', null);
  if (error) throw new Error(error.message);
}

// ---- Record current session on login ----

export async function recordSession(deviceInfo: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await supabase.from('user_session').insert({
    user_id: userData.user.id,
    device_info: deviceInfo,
    ip_address: null,
    last_seen_at: new Date().toISOString(),
  });
}

// ---- Exchange rate display (X-04) ----

export async function fetchExchangeRate(base: string, quote: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('exchange_rate')
    .select('rate')
    .eq('base_currency', base)
    .eq('quote_currency', quote)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data as { rate: number }).rate : null;
}

// ---- Candidate decision logging (X-13) ----

export async function logCandidateDecisions(params: {
  trip_id: string;
  trip_item_id?: string | null;
  candidates: { listing_id: string; shown: boolean; score: number; score_components: Record<string, unknown>; reasons: Record<string, unknown> }[];
}): Promise<void> {
  const rows = params.candidates.map((c) => ({
    trip_id: params.trip_id,
    trip_item_id: params.trip_item_id ?? null,
    listing_id: c.listing_id,
    shown: c.shown,
    score: c.score,
    score_components: c.score_components,
    reasons: c.reasons,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('candidate_decision').insert(rows);
  if (error) throw new Error(error.message);
}

// ---- Idempotent booking request (X-07, T-48) ----

export async function idempotentRequestBooking(params: {
  idempotencyKey: string;
  trip_id?: string | null;
  listing_id?: string | null;
  conversation_id?: string | null;
  item_type: string;
  title: string;
  image_url?: string | null;
  provider_name?: string | null;
  price_minor: number;
  currency?: string;
  booking_date?: string | null;
  party_size: number;
  luxury_level: number;
}): Promise<Booking> {
  const { data: userData } = await supabase.auth.getUser();

  // Check if this idempotency key already has a response
  const { data: existing } = await supabase
    .from('idempotency_key')
    .select('response_body, status_code')
    .eq('key', params.idempotencyKey)
    .maybeSingle();

  if (existing && (existing as { response_body?: Booking; status_code?: number }).response_body) {
    return (existing as { response_body: Booking }).response_body;
  }

  // Create the booking
  const booking = await requestBooking({
    trip_id: params.trip_id,
    listing_id: params.listing_id,
    conversation_id: params.conversation_id,
    item_type: params.item_type,
    title: params.title,
    image_url: params.image_url,
    provider_name: params.provider_name,
    price_minor: params.price_minor,
    currency: params.currency,
    booking_date: params.booking_date,
    party_size: params.party_size,
    luxury_level: params.luxury_level,
  });

  // Record booking history
  await supabase.from('booking_history').insert({
    booking_id: booking.id,
    previous_status: null,
    new_status: 'pending',
    reason: 'Booking requested',
  });

  // Store the idempotency key with response
  await supabase.from('idempotency_key').insert({
    key: params.idempotencyKey,
    user_id: userData.user?.id ?? null,
    request_body: params as unknown as Record<string, unknown>,
    response_body: booking as unknown as Record<string, unknown>,
    status_code: 200,
  });

  return booking;
}
