/*
# Add messaging, booking lifecycle, reviews, attestations, emergency info, and trip sharing

1. New Tables
- `conversation` — A thread between a traveller and a provider about a specific listing or trip item.
  - `id` (uuid PK)
  - `listing_id` (uuid, nullable FK to catalogue_listing) — the listing this conversation is about, if any.
  - `trip_item_id` (uuid, nullable FK to trip_item) — the itinerary item that triggered this conversation, if any.
  - `provider_org_id` (uuid, FK to provider_org) — the provider being messaged.
  - `traveller_name` (text) — the name the traveller gives themselves.
  - `traveller_contact` (text) — email or phone for notifications.
  - `subject` (text) — short subject line.
  - `status` (text, default 'open') — open | closed | escalated.
  - `last_message_at` (timestamptz) — for sorting by recency.
  - `created_at` (timestamptz)
- `message` — Individual messages within a conversation.
  - `id` (uuid PK)
  - `conversation_id` (uuid FK to conversation)
  - `sender` (text) — 'traveller' | 'provider'
  - `body` (text)
  - `delivered` (boolean, default false) — delivery confirmation per recipient.
  - `created_at` (timestamptz)
- `attestation` — Both-party confirmation that a booking actually happened (T-52).
  - `id` (uuid PK)
  - `booking_id` (uuid FK to booking)
  - `party` (text) — 'traveller' | 'provider'
  - `attested_at` (timestamptz, default now())
- `review` — A review left after an attested booking (T-62).
  - `id` (uuid PK)
  - `booking_id` (uuid FK to booking, unique)
  - `provider_org_id` (uuid FK to provider_org)
  - `rating` (smallint, 1-5)
  - `body` (text, nullable)
  - `created_at` (timestamptz)
- `emergency_contact` — Hospital, police, tourist police, embassy contacts by region (T-42).
  - `id` (uuid PK)
  - `region_id` (uuid, nullable FK to geo_region) — null means nationwide.
  - `contact_type` (text) — hospital | police | tourist_police | embassy | pharmacy
  - `name` (text)
  - `phone` (text)
  - `address` (text, nullable)
  - `notes` (text, nullable)
  - `created_at` (timestamptz)
- `trip_share` — Shareable link for a trip (T-29).
  - `id` (uuid PK)
  - `trip_id` (uuid FK to trip)
  - `share_token` (text, unique) — the token in the URL.
  - `expires_at` (timestamptz, nullable)
  - `created_at` (timestamptz)

2. Modified Tables
- `booking` — Added columns for the full booking lifecycle (T-48 to T-52):
  - `conversation_id` (uuid, nullable FK to conversation) — the conversation where the booking was negotiated.
  - `quoted_price_minor` (bigint, nullable) — the price the provider quoted.
  - `quoted_currency` (char(3), nullable)
  - `confirmed_at` (timestamptz, nullable) — when the provider confirmed.
  - `attested_traveller` (boolean, default false) — traveller confirmed it happened.
  - `attested_provider` (boolean, default false) — provider confirmed it happened.
  - `attested_at` (timestamptz, nullable) — when both parties attested.
  - `cancelled_at` (timestamptz, nullable)
  - `updated_at` (timestamptz, default now())
  Status values now: pending → quoted → confirmed → completed (both attested) | cancelled.

3. Security
- RLS enabled on all new tables.
- All tables use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because this is a no-auth demo app (no sign-in screen) where data is intentionally shared/public.

4. Important Notes
- The booking table already exists; we only add columns with ALTER TABLE.
- All new tables are idempotent (IF NOT EXISTS).
- Policies are dropped-then-created for idempotency.
*/

-- ---- conversation ----
CREATE TABLE IF NOT EXISTS conversation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES catalogue_listing(id) ON DELETE SET NULL,
  trip_item_id uuid REFERENCES trip_item(id) ON DELETE SET NULL,
  provider_org_id uuid REFERENCES provider_org(id) ON DELETE CASCADE,
  traveller_name text NOT NULL DEFAULT 'Traveller',
  traveller_contact text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE conversation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_conversation" ON conversation;
CREATE POLICY "anon_crud_conversation" ON conversation FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ---- message ----
CREATE TABLE IF NOT EXISTS message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  sender text NOT NULL,
  body text NOT NULL,
  delivered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_message" ON message;
CREATE POLICY "anon_crud_message" ON message FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ---- attestation ----
CREATE TABLE IF NOT EXISTS attestation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  party text NOT NULL,
  attested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE attestation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_attestation" ON attestation;
CREATE POLICY "anon_crud_attestation" ON attestation FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ---- review ----
CREATE TABLE IF NOT EXISTS review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid UNIQUE NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  provider_org_id uuid REFERENCES provider_org(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE review ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_review" ON review;
CREATE POLICY "anon_crud_review" ON review FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ---- emergency_contact ----
CREATE TABLE IF NOT EXISTS emergency_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES geo_region(id) ON DELETE SET NULL,
  contact_type text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE emergency_contact ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_emergency_contact" ON emergency_contact;
CREATE POLICY "anon_crud_emergency_contact" ON emergency_contact FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ---- trip_share ----
CREATE TABLE IF NOT EXISTS trip_share (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
  share_token text UNIQUE NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE trip_share ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_trip_share" ON trip_share;
CREATE POLICY "anon_crud_trip_share" ON trip_share FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ---- booking lifecycle columns ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name='conversation_id') THEN
    ALTER TABLE booking ADD COLUMN conversation_id uuid REFERENCES conversation(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name='quoted_price_minor') THEN
    ALTER TABLE booking ADD COLUMN quoted_price_minor bigint;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name='quoted_currency') THEN
    ALTER TABLE booking ADD COLUMN quoted_currency char(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name='confirmed_at') THEN
    ALTER TABLE booking ADD COLUMN confirmed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name='attested_traveller') THEN
    ALTER TABLE booking ADD COLUMN attested_traveller boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name='attested_provider') THEN
    ALTER TABLE booking ADD COLUMN attested_provider boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name='attested_at') THEN
    ALTER TABLE booking ADD COLUMN attested_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name='cancelled_at') THEN
    ALTER TABLE booking ADD COLUMN cancelled_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name='updated_at') THEN
    ALTER TABLE booking ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- ---- Seed emergency contacts for the three launch regions ----
INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT r.id, 'police', 'Police Royale - Marrakech', '19', 'Marrakech', 'Emergency police nationwide: 19'
FROM geo_region r WHERE r.name ILIKE 'Marrakech' AND NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%Police Royale - Marrakech%')
LIMIT 1;

INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT r.id, 'hospital', 'CHU Mohammed VI - Marrakech', '+212 5244-04901', 'Marrakech 40000', 'Main university hospital'
FROM geo_region r WHERE r.name ILIKE 'Marrakech' AND NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%CHU Mohammed VI - Marrakech%')
LIMIT 1;

INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT r.id, 'tourist_police', 'Tourist Police - Marrakech', '+212 5243-85200', 'Marrakech', 'Dedicated tourist assistance'
FROM geo_region r WHERE r.name ILIKE 'Marrakech' AND NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%Tourist Police - Marrakech%')
LIMIT 1;

INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT r.id, 'hospital', 'CHU Hassan II - Fès', '+212 5356-19051', 'Fès', 'Main university hospital'
FROM geo_region r WHERE r.name ILIKE 'Fès' AND NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%CHU Hassan II - Fès%')
LIMIT 1;

INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT r.id, 'police', 'Police Royale - Fès', '19', 'Fès', 'Emergency police nationwide: 19'
FROM geo_region r WHERE r.name ILIKE 'Fès' AND NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%Police Royale - Fès%')
LIMIT 1;

INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT r.id, 'hospital', 'Centre Hospitalier - Essaouira', '+212 5244-72100', 'Essaouira', 'Regional hospital'
FROM geo_region r WHERE r.name ILIKE 'Essaouira' AND NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%Centre Hospitalier - Essaouira%')
LIMIT 1;

INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT r.id, 'police', 'Police Royale - Essaouira', '19', 'Essaouira', 'Emergency police nationwide: 19'
FROM geo_region r WHERE r.name ILIKE 'Essaouira' AND NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%Police Royale - Essaouira%')
LIMIT 1;

-- Nationwide contacts (region_id = null)
INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT null, 'police', 'Police Royale (Nationwide)', '19', null, 'Dial 19 from any phone for police emergencies'
WHERE NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%Police Royale (Nationwide)%');

INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT null, 'tourist_police', 'Tourist Police Hotline', '+212 8010-0203', null, 'National tourist assistance hotline'
WHERE NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%Tourist Police Hotline%');

INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT null, 'embassy', 'British Embassy Rabat', '+212 5376-33334', '17 Avenue de la Maison Verte, Rabat', 'UK consular assistance'
WHERE NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%British Embassy Rabat%');

INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT null, 'embassy', 'US Embassy Rabat', '+212 5376-72222', 'Km 5.5 Avenue Mohammed VI, Rabat', 'US citizen services'
WHERE NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%US Embassy Rabat%');

INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT null, 'embassy', 'French Embassy Rabat', '+212 5376-00000', '3 Rue de Tunis, Rabat', 'French consular services'
WHERE NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%French Embassy Rabat%');

INSERT INTO emergency_contact (region_id, contact_type, name, phone, address, notes)
SELECT null, 'hospital', 'SAMU Medical Emergency', '15', null, 'Dial 15 from any phone for medical emergencies'
WHERE NOT EXISTS (SELECT 1 FROM emergency_contact e WHERE e.name ILIKE '%SAMU Medical Emergency%');
