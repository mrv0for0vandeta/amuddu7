// Shared domain types for the Amuddu traveller web experience.

export type ProviderCategory =
  | 'guide'
  | 'transport'
  | 'agency'
  | 'accommodation'
  | 'experience_host'
  | 'restaurant';

export type ListingCategory =
  | 'tour'
  | 'guided_experience'
  | 'desert_experience'
  | 'workshop'
  | 'stay'
  | 'transfer'
  | 'meal'
  | 'activity';

export type TripItemType =
  | 'stay'
  | 'transfer'
  | 'activity'
  | 'meal'
  | 'gem'
  | 'free'
  | 'flight'
  | 'transport';

export interface Flight {
  id: string;
  airline: string;
  flight_number: string;
  origin_city: string;
  origin_iata: string;
  destination_city: string;
  destination_iata: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  price_minor: number;
  currency: string;
  stops: number;
  cabin_class: string;
}

export interface TransportOption {
  id: string;
  transport_type: string; // train | bus | grand_taxi | private_transfer
  provider: string;
  origin_city: string;
  destination_city: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  price_minor: number;
  currency: string;
  frequency: string;
  notes: string;
}

export interface Region {
  id: string;
  country_code: string;
  parent_id: string | null;
  name: string;
  level: number;
}

export interface Provider {
  id: string;
  country_code: string;
  region_id: string;
  legal_name: string;
  display_name: string;
  category: ProviderCategory;
  service_tier: number;
  verification_state: string;
  languages: string[];
  bio: string;
  response_time_hours: number;
  response_rate_pct: number;
  review_count: number;
  avg_rating: number;
  status: string;
}

export interface Listing {
  id: string;
  provider_org_id: string;
  country_code: string;
  region_id: string;
  category: ListingCategory;
  title: string;
  description: string;
  languages: string[];
  min_age: number;
  difficulty: number;
  accessibility: Record<string, unknown>;
  min_party: number;
  max_party: number;
  duration_minutes: number;
  service_tier: number;
  status: string;
  image_url?: string | null;
  visual_type?: string | null;
  provider?: Provider;
  price?: PriceRule;
}

export interface PriceRule {
  id: string;
  listing_id: string;
  amount_minor: number;
  currency: string;
  pricing_unit: string;
  party_from: number | null;
  party_to: number | null;
}

export interface HiddenGem {
  id: string;
  country_code: string;
  region_id: string;
  name: string;
  description: string;
  story: string;
  category: string;
  authenticity: number;
  fit_score: number;
  crowd_level: number;
  tags: string[];
  image_url?: string | null;
}

export interface Trip {
  id: string;
  country_code: string;
  region_id: string;
  title: string;
  start_date: string;
  end_date: string;
  budget_minor: number;
  budget_currency: string;
  party_adults: number;
  party_children: number;
  child_ages: number[];
  pace: number;
  luxury_level: number;
  stamina: number;
  interests: string[];
  status: string;
  current_version_id: string | null;
  origin_city?: string | null;
}

export interface TripVersion {
  id: string;
  trip_id: string;
  version_number: number;
  generated_at: string;
  budget_alloc: BudgetAllocation;
}

export interface BudgetAllocation {
  accommodation?: number;
  transport?: number;
  food?: number;
  activities?: number;
  total?: number;
  justification?: string;
}

export interface TripDay {
  id: string;
  trip_version_id: string;
  day_number: number;
  date: string;
  summary: string;
}

export interface Reason {
  kind: string;
  text: string;
}

export interface TripItem {
  id: string;
  trip_day_id: string;
  position: number;
  item_type: TripItemType;
  listing_id: string | null;
  gem_id: string | null;
  title: string;
  description: string;
  start_time: string | null;
  end_time: string | null;
  est_cost_minor: number;
  est_currency: string;
  locked: boolean;
  lock_reason: string | null;
  reason_set: Reason[];
}

export interface ItineraryResult {
  version: TripVersion;
  days: TripDayWithItems[];
  budgetAllocation: BudgetAllocation;
  feasible: boolean;
  bindingConstraint: string | null;
}

export interface TripDayWithItems extends TripDay {
  items: TripItem[];
}

export interface TripInput {
  region_id: string;
  start_date: string;
  end_date: string;
  budget_minor: number;
  budget_currency: string;
  party_adults: number;
  party_children: number;
  pace: number;
  luxury_level: number;
  stamina: number;
  interests: string[];
  origin_city?: string;
}

export interface Booking {
  id: string;
  trip_id: string | null;
  listing_id: string | null;
  conversation_id: string | null;
  item_type: string;
  title: string;
  image_url: string | null;
  provider_name: string | null;
  price_minor: number;
  currency: string;
  quoted_price_minor: number | null;
  quoted_currency: string | null;
  booking_date: string | null;
  party_size: number;
  luxury_level: number;
  status: string;
  confirmed_at: string | null;
  attested_traveller: boolean;
  attested_provider: boolean;
  attested_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  listing_id: string | null;
  trip_item_id: string | null;
  provider_org_id: string;
  traveller_name: string;
  traveller_contact: string;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: string;
  body: string;
  delivered: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  provider_org_id: string | null;
  rating: number;
  body: string | null;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  region_id: string | null;
  contact_type: string;
  name: string;
  phone: string;
  address: string | null;
  notes: string | null;
}

export interface TripShare {
  id: string;
  user_id: string;
  trip_id: string;
  share_token: string;
  expires_at: string | null;
  created_at: string;
}

export interface TravellerProfile {
  user_id: string;
  display_name: string;
  home_country: string | null;
  display_currency: string;
  preferred_locale: string;
  travel_style: string;
  default_pace: number;
  default_luxury_level: number;
  default_stamina: number;
  languages_spoken: string[];
  interests: string[];
  mobility_aid: boolean;
  max_walking_minutes: number;
  step_tolerance: number;
  sensory_needs: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserConsent {
  id: string;
  user_id: string;
  purpose: string;
  version: string;
  granted: boolean;
  granted_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
}

// ---- Provider portal types (Section 7) ----

export interface ProviderTeamMember {
  id: string;
  provider_org_id: string;
  user_id: string;
  role: string;
  invited_at: string;
  joined_at: string | null;
  created_at: string;
}

export interface VerificationEvidence {
  id: string;
  provider_org_id: string;
  evidence_type: string;
  document_url: string;
  status: string;
  reviewer_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface ListingVariant {
  id: string;
  listing_id: string;
  variant_type: string;
  duration_minutes: number;
  min_party: number;
  max_party: number;
  created_at: string;
}

export interface AvailabilityBlock {
  id: string;
  provider_org_id: string;
  listing_id: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

export interface CancellationPolicy {
  id: string;
  listing_id: string;
  policy_type: string;
  free_until_hours: number | null;
  tier1_refund_pct: number | null;
  tier1_hours: number | null;
  tier2_refund_pct: number | null;
  tier2_hours: number | null;
  non_refundable: boolean;
  created_at: string;
}

export interface CommissionStatement {
  id: string;
  booking_id: string;
  provider_org_id: string;
  commission_amount_minor: number;
  currency: string;
  status: string;
  created_at: string;
}

// ---- Operations types (Section 8) ----

export interface VerificationCase {
  id: string;
  provider_org_id: string;
  status: string;
  priority: number;
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModerationAction {
  id: string;
  target_type: string;
  target_id: string;
  action: string;
  reason: string;
  actor_id: string | null;
  created_at: string;
}

export interface SafetyReport {
  id: string;
  reporter_id: string | null;
  target_type: string;
  target_id: string;
  report_type: string;
  description: string;
  status: string;
  triaged_by: string | null;
  triaged_at: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export interface SupportCase {
  id: string;
  case_type: string;
  target_entity_type: string | null;
  target_entity_id: string | null;
  summary: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminElevation {
  id: string;
  requested_by: string;
  approved_by: string | null;
  justification: string;
  status: string;
  expires_at: string | null;
  created_at: string;
}

// ---- Platform types (Section 9) ----

export interface IdempotencyKey {
  id: string;
  key: string;
  user_id: string | null;
  request_body: Record<string, unknown> | null;
  response_body: Record<string, unknown> | null;
  status_code: number | null;
  created_at: string;
}

export interface CandidateDecision {
  id: string;
  trip_id: string;
  trip_item_id: string | null;
  listing_id: string | null;
  shown: boolean;
  score: number | null;
  score_components: Record<string, unknown> | null;
  reasons: Record<string, unknown> | null;
  created_at: string;
}

export interface BookingHistoryEntry {
  id: string;
  booking_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  device_info: string | null;
  ip_address: string | null;
  last_seen_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface Dispute {
  id: string;
  booking_id: string;
  raised_by: string | null;
  dispute_type: string;
  description: string;
  status: string;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: number;
  snapshot_at: string;
  created_at: string;
}

// ---- Platform infrastructure types ----

export interface OutboxEvent {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  last_attempt_at: string | null;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_name: string;
  user_id: string | null;
  session_id: string | null;
  properties: Record<string, unknown>;
  page_path: string | null;
  locale: string | null;
  created_at: string;
}

export interface WeatherCache {
  id: string;
  region_id: string;
  forecast_date: string;
  temp_high_c: number | null;
  temp_low_c: number | null;
  precipitation_pct: number | null;
  wind_kph: number | null;
  condition_code: string | null;
  suitability_score: number;
  fetched_at: string;
  created_at: string;
}

export interface OpeningHours {
  id: string;
  listing_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  created_at: string;
}

export interface SponsoredListing {
  id: string;
  listing_id: string;
  sponsor_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  device_info: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProviderLicence {
  id: string;
  provider_org_id: string;
  licence_type: string;
  licence_number: string | null;
  issued_at: string | null;
  expires_at: string;
  status: string;
  created_at: string;
}

export interface CrowdLevelHistory {
  id: string;
  gem_id: string;
  old_band: string | null;
  new_band: string;
  changed_at: string;
  created_at: string;
}

export interface AppVersion {
  id: string;
  platform: string;
  minimum_version: string;
  current_version: string;
  upgrade_message: string | null;
  is_blocking: boolean;
  created_at: string;
}
