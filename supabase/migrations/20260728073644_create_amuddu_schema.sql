/*
# Amuddu core schema with Morocco seed data

1. New Tables
- `geo_region`: hierarchical regions of Morocco (country -> region -> city). Every domain row references one.
- `geo_place`: physical points/areas (meeting points, sites, transport nodes).
- `provider_org`: the business entity. Carries verification state, category, service tier, languages, response metrics.
- `catalogue_listing`: a sellable offering. Category, min age, difficulty, accessibility, party range, duration.
- `catalogue_price_rule`: effective-dated price by variant/party/season. Never mutated in place (E9).
- `hidden_gem`: curated place ranked by authenticity, fit, crowd level (not review volume). Same schema manual + learned phases (A10).
- `trip`: traveller's plan for one journey. Dates, budget, group, pace, luxury, stamina, interests (>=3 enforced).
- `trip_version`: immutable itinerary snapshot created on every generation.
- `trip_day`: ordered day within a version.
- `trip_item`: scheduled thing within a day with reason_set (FR-6).
- `item_feedback`: one-tap thumbs or 1-5 on individual suggestions (FR-14).

2. Security
- RLS enabled on every table.
- No-auth traveller web experience (single-tenant, shared/public catalogue + gems; trips are demo data created by the visitor).
- All policies use TO anon, authenticated with USING (true) / WITH CHECK (true) because the catalogue, gems, regions and demo trips are intentionally public/shared.

3. Important notes
- country_code (char(2)) on every domain row — DAY-ONE decision (Principle 6).
- Money is integer minor units + currency, never a float.
- Trip dates are plain dates (local calendar); timestamps are timestamptz UTC.
- reason_set is jsonb — structured reasons, prose rendered from these (Principle 3).
- min_age and difficulty are NOT NULL on listings (US-4).
- interests array on trip has a CHECK cardinality >= 3 (FR-1).
*/

-- ---------- geo ----------
CREATE TABLE IF NOT EXISTS geo_region (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code char(2) NOT NULL DEFAULT 'MA',
  parent_id   uuid REFERENCES geo_region(id),
  name        text NOT NULL,
  level       smallint NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS geo_place (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id   uuid NOT NULL REFERENCES geo_region(id),
  country_code char(2) NOT NULL DEFAULT 'MA',
  name        text NOT NULL,
  kind        text NOT NULL DEFAULT 'site',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- provider ----------
CREATE TABLE IF NOT EXISTS provider_org (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code       char(2) NOT NULL DEFAULT 'MA',
  region_id          uuid NOT NULL REFERENCES geo_region(id),
  legal_name         text NOT NULL,
  display_name       text NOT NULL,
  category           text NOT NULL,
  service_tier       smallint NOT NULL DEFAULT 2,
  verification_state text NOT NULL DEFAULT 'verified',
  languages          text[] NOT NULL DEFAULT '{}',
  bio                text NOT NULL DEFAULT '',
  response_time_hours numeric(5,1) NOT NULL DEFAULT 4.0,
  response_rate_pct  numeric(5,1) NOT NULL DEFAULT 95.0,
  review_count       integer NOT NULL DEFAULT 0,
  avg_rating         numeric(3,2) NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'active',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

-- ---------- catalogue ----------
CREATE TABLE IF NOT EXISTS catalogue_listing (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_org_id   uuid NOT NULL REFERENCES provider_org(id),
  country_code      char(2) NOT NULL DEFAULT 'MA',
  region_id         uuid NOT NULL REFERENCES geo_region(id),
  category          text NOT NULL,
  title             text NOT NULL,
  description       text NOT NULL,
  languages         text[] NOT NULL DEFAULT '{}',
  min_age           smallint NOT NULL,
  difficulty        smallint NOT NULL,
  accessibility     jsonb NOT NULL DEFAULT '{}',
  min_party         smallint NOT NULL DEFAULT 1,
  max_party         smallint NOT NULL DEFAULT 8,
  duration_minutes  integer NOT NULL DEFAULT 240,
  meeting_place_id  uuid REFERENCES geo_place(id),
  service_tier      smallint NOT NULL DEFAULT 2,
  status            text NOT NULL DEFAULT 'published',
  published_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  CONSTRAINT party_range CHECK (max_party >= min_party),
  CONSTRAINT difficulty_range CHECK (difficulty BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS catalogue_price_rule (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES catalogue_listing(id),
  amount_minor  bigint NOT NULL,
  currency      char(3) NOT NULL DEFAULT 'MAD',
  pricing_unit  text NOT NULL DEFAULT 'per_person',
  party_from    smallint,
  party_to      smallint,
  valid_from    date NOT NULL DEFAULT CURRENT_DATE,
  valid_to      date,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------- gems ----------
CREATE TABLE IF NOT EXISTS hidden_gem (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code  char(2) NOT NULL DEFAULT 'MA',
  region_id     uuid NOT NULL REFERENCES geo_region(id),
  name          text NOT NULL,
  description   text NOT NULL,
  story         text NOT NULL DEFAULT '',
  category      text NOT NULL DEFAULT 'place',
  authenticity  numeric(3,2) NOT NULL DEFAULT 0.5,
  fit_score     numeric(3,2) NOT NULL DEFAULT 0.5,
  crowd_level   numeric(3,2) NOT NULL DEFAULT 0.5,
  tags          text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------- trip ----------
CREATE TABLE IF NOT EXISTS trip (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code     char(2) NOT NULL DEFAULT 'MA',
  region_id        uuid NOT NULL REFERENCES geo_region(id),
  title            text NOT NULL DEFAULT 'My Morocco trip',
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  budget_minor     bigint NOT NULL DEFAULT 100000,
  budget_currency  char(3) NOT NULL DEFAULT 'EUR',
  party_adults     smallint NOT NULL DEFAULT 2,
  party_children   smallint NOT NULL DEFAULT 0,
  child_ages       smallint[] NOT NULL DEFAULT '{}',
  pace             smallint NOT NULL DEFAULT 3,
  luxury_level     smallint NOT NULL DEFAULT 2,
  stamina          smallint NOT NULL DEFAULT 3,
  interests        text[] NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'draft',
  current_version_id uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  CONSTRAINT date_order CHECK (end_date >= start_date),
  CONSTRAINT min_interest CHECK (cardinality(interests) >= 3)
);

CREATE TABLE IF NOT EXISTS trip_version (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  budget_alloc  jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS trip_day (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_version_id uuid NOT NULL REFERENCES trip_version(id) ON DELETE CASCADE,
  day_number      smallint NOT NULL,
  date            date NOT NULL,
  summary         text NOT NULL DEFAULT '',
  UNIQUE (trip_version_id, day_number)
);

CREATE TABLE IF NOT EXISTS trip_item (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id     uuid NOT NULL REFERENCES trip_day(id) ON DELETE CASCADE,
  position        smallint NOT NULL,
  item_type       text NOT NULL,
  listing_id      uuid REFERENCES catalogue_listing(id),
  gem_id          uuid REFERENCES hidden_gem(id),
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  start_time      text,
  end_time        text,
  est_cost_minor  bigint NOT NULL DEFAULT 0,
  est_currency    char(3) NOT NULL DEFAULT 'MAD',
  locked          boolean NOT NULL DEFAULT false,
  lock_reason     text,
  reason_set      jsonb NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_day_id, position)
);

CREATE TABLE IF NOT EXISTS item_feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_item_id uuid NOT NULL REFERENCES trip_item(id) ON DELETE CASCADE,
  rating       smallint,
  thumbs       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS idx_listing_region_cat ON catalogue_listing (country_code, region_id, category, status);
CREATE INDEX IF NOT EXISTS idx_listing_provider ON catalogue_listing (provider_org_id);
CREATE INDEX IF NOT EXISTS idx_price_listing ON catalogue_price_rule (listing_id, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_gem_region ON hidden_gem (country_code, region_id);
CREATE INDEX IF NOT EXISTS idx_trip_region ON trip (country_code, region_id);
CREATE INDEX IF NOT EXISTS idx_trip_version_trip ON trip_version (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_day_version ON trip_day (trip_version_id);
CREATE INDEX IF NOT EXISTS idx_trip_item_day ON trip_item (trip_day_id, position);

-- ---------- RLS ----------
ALTER TABLE geo_region ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_place ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_org ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogue_listing ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogue_price_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_gem ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_feedback ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['geo_region','geo_place','provider_org','catalogue_listing','catalogue_price_rule','hidden_gem','trip','trip_version','trip_day','trip_item','item_feedback']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "anon_select_%s" ON %I FOR SELECT TO anon, authenticated USING (true);', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "anon_insert_%s" ON %I FOR INSERT TO anon, authenticated WITH CHECK (true);', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "anon_update_%s" ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "anon_delete_%s" ON %I FOR DELETE TO anon, authenticated USING (true);', t, t);
  END LOOP;
END $$;

-- ---------- seed: regions ----------
INSERT INTO geo_region (id, country_code, name, level) VALUES
  ('11111111-1111-1111-1111-111111111111', 'MA', 'Morocco', 0),
  ('22222222-2222-2222-2222-222222222222', 'MA', 'Marrakech-Safi', 1),
  ('33333333-3333-3333-3333-333333333333', 'MA', 'Casablanca-Settat', 1),
  ('44444444-4444-4444-4444-444444444444', 'MA', 'Fès-Meknès', 1),
  ('55555555-5555-5555-5555-555555555555', 'MA', 'Drâa-Tafilalet', 1),
  ('66666666-6666-6666-6666-666666666666', 'MA', 'Souss-Massa', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO geo_region (id, country_code, parent_id, name, level) VALUES
  ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', '22222222-2222-2222-2222-222222222222', 'Marrakech', 2),
  ('a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', '33333333-3333-3333-3333-333333333333', 'Casablanca', 2),
  ('a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', '44444444-4444-4444-4444-444444444444', 'Fès', 2),
  ('a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', '55555555-5555-5555-5555-555555555555', 'Merzouga', 2),
  ('a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', '66666666-6666-6666-6666-666666666666', 'Essaouira', 2)
ON CONFLICT (id) DO NOTHING;

-- ---------- seed: providers ----------
INSERT INTO provider_org (id, country_code, region_id, legal_name, display_name, category, service_tier, verification_state, languages, bio, response_time_hours, response_rate_pct, review_count, avg_rating) VALUES
  ('b1111111-0000-0000-0000-000000000001', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Atlas Trek Guides SARL', 'Atlas Horizon Guides', 'guide', 2, 'verified', ARRAY['en','fr','ary-Latn'], 'Family-run mountain guide collective. We specialise in High Atlas and Toubkal treks for small groups. All our guides are Ministry of Tourism licensed.', 2.5, 98.0, 142, 4.9),
  ('b2222222-0000-0000-0000-000000000002', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Marrakech Medina Walks', 'Medina Storytellers', 'guide', 3, 'verified', ARRAY['en','fr','es','ary-Latn'], 'Historians and storytellers bringing the Marrakech medina to life. Licensed guides, small groups, deep local knowledge.', 1.5, 99.0, 310, 4.95),
  ('b3333333-0000-0000-0000-000000000003', 'MA', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sahara Sands Adventures', 'Sahara Sands', 'experience_host', 3, 'verified', ARRAY['en','fr','ary-Latn'], 'Camel treks, overnight desert camps, and stargazing in the Erg Chebbi dunes. Berber-owned and operated.', 4.0, 92.0, 89, 4.85),
  ('b4444444-0000-0000-0000-000000000004', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Riad Anbar', 'Riad Anbar', 'accommodation', 4, 'verified', ARRAY['en','fr','ary-Arab'], 'A restored 18th-century riad in the Marrakech medina. Seven suites, rooftop terrace, traditional hammam. Luxury without pretence.', 3.0, 96.0, 210, 4.92),
  ('b5555555-0000-0000-0000-000000000005', 'MA', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Essaouira Surf Co', 'Atlantic Surf School', 'experience_host', 2, 'verified', ARRAY['en','fr'], 'Surf and kitesurf lessons for all levels on Essaouira bay. ISA-certified instructors, equipment included.', 5.0, 88.0, 67, 4.78),
  ('b6666666-0000-0000-0000-000000000006', 'MA', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fès Culinary Traditions', 'Fès Food Stories', 'guide', 2, 'verified', ARRAY['en','fr','ary-Latn'], 'Food walks through the Fès medina, the oldest continuously inhabited medina. Cookery classes too.', 3.5, 94.0, 124, 4.88),
  ('b7777777-0000-0000-0000-000000000007', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ourika Valley Transport', 'Ourika Journeys', 'transport', 1, 'verified', ARRAY['fr','ary-Latn'], 'Day trips and transfers to Ourika Valley and the High Atlas foothills. Comfortable 4x4s and minivans.', 6.0, 85.0, 45, 4.6),
  ('b8888888-0000-0000-0000-000000000008', 'MA', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chez Lahcen', 'Chez Lahcen Table', 'restaurant', 2, 'verified', ARRAY['fr','ary-Latn'], 'Traditional Berber cooking in a family home near Merzouga. Tagines, couscous, mint tea ceremony.', 8.0, 80.0, 32, 4.7)
ON CONFLICT (id) DO NOTHING;

-- ---------- seed: listings ----------
INSERT INTO catalogue_listing (id, provider_org_id, country_code, region_id, category, title, description, languages, min_age, difficulty, accessibility, min_party, max_party, duration_minutes, service_tier) VALUES
  ('c1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'guided_experience', 'Toubkal Summit Trek (2 days)', 'A two-day ascent of North Africa highest peak. Acclimatisation night at the Neltner refuge. For reasonably fit walkers.', ARRAY['en','fr','ary-Latn'], 14, 4, '{"wheelchair": false, "mobility_aid": false, "stamina_required": "high"}'::jsonb, 2, 8, 2880, 2),
  ('c2222222-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000001', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'guided_experience', 'Ourika Valley Waterfalls Walk', 'A gentle half-day walk to the Setti Fatma waterfalls. Suitable for families. Swimming in summer.', ARRAY['en','fr','ary-Latn'], 6, 2, '{"wheelchair": false, "mobility_aid": "partial", "stamina_required": "low"}'::jsonb, 1, 10, 300, 1),
  ('c3333333-0000-0000-0000-000000000003', 'b2222222-0000-0000-0000-000000000002', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tour', 'Marrakech Medina Storytelling Tour', 'A three-hour walking tour through the medina, the souks, Ben Youssef Madrasa and Jemaa el-Fna. Stories, not dates.', ARRAY['en','fr','es','ary-Latn'], 8, 1, '{"wheelchair": "partial", "mobility_aid": "partial", "stamina_required": "low"}'::jsonb, 1, 12, 180, 3),
  ('c4444444-0000-0000-0000-000000000004', 'b3333333-0000-0000-0000-000000000003', 'MA', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'desert_experience', 'Overnight Sahara Desert Camp', 'Camel trek into the Erg Chebbi dunes at sunset, dinner and stargazing at a Berber camp, sunrise over the dunes.', ARRAY['en','fr','ary-Latn'], 5, 2, '{"wheelchair": false, "mobility_aid": false, "stamina_required": "low"}'::jsonb, 2, 12, 1200, 3),
  ('c5555555-0000-0000-0000-000000000005', 'b3333333-0000-0000-0000-000000000003', 'MA', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'activity', 'Sunrise Camel Trek', 'A 90-minute camel ride to watch the sun rise over the dunes. Includes mint tea at a nomad tent.', ARRAY['en','fr','ary-Latn'], 4, 1, '{"wheelchair": false, "mobility_aid": false, "stamina_required": "low"}'::jsonb, 1, 8, 90, 2),
  ('c6666666-0000-0000-0000-000000000006', 'b4444444-0000-0000-0000-000000000004', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'stay', 'Riad Anbar Suite (per night)', 'A restored 18th-century riad in the heart of the Marrakech medina. Rooftop terrace, traditional hammam, breakfast included.', ARRAY['en','fr','ary-Arab'], 0, 1, '{"wheelchair": false, "mobility_aid": "partial", "stamina_required": "low", "lift": false}'::jsonb, 1, 4, 1440, 4),
  ('c7777777-0000-0000-0000-000000000007', 'b5555555-0000-0000-0000-000000000005', 'MA', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'activity', 'Beginner Surf Lesson', 'A two-hour surf lesson on Essaouira bay. Wetsuit and board included. ISA-certified instructor.', ARRAY['en','fr'], 8, 2, '{"wheelchair": false, "mobility_aid": false, "stamina_required": "medium"}'::jsonb, 1, 6, 120, 2),
  ('c8888888-0000-0000-0000-000000000008', 'b5555555-0000-0000-0000-000000000005', 'MA', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'activity', 'Kitesurf Discovery Session', 'A three-hour introduction to kitesurfing. Wind conditions permitting. All equipment provided.', ARRAY['en','fr'], 12, 3, '{"wheelchair": false, "mobility_aid": false, "stamina_required": "medium"}'::jsonb, 1, 4, 180, 2),
  ('c9999999-0000-0000-0000-000000000009', 'b6666666-0000-0000-0000-000000000006', 'MA', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tour', 'Fès Medina Food Walk', 'A four-hour food walk through the Fès medina. Street food, spice markets, a traditional bakery, and a mint tea ceremony.', ARRAY['en','fr','ary-Latn'], 10, 1, '{"wheelchair": "partial", "mobility_aid": "partial", "stamina_required": "low"}'::jsonb, 1, 10, 240, 2),
  ('caaaaaaa-0000-0000-0000-000000000010', 'b7777777-0000-0000-0000-000000000007', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'transfer', 'Marrakeck to Ourika Valley Transfer', 'Private 4x4 transfer to the Ourika Valley. Up to 6 passengers. Driver waits during your visit.', ARRAY['fr','ary-Latn'], 0, 1, '{"wheelchair": false, "mobility_aid": "partial", "stamina_required": "low"}'::jsonb, 1, 6, 480, 1),
  ('cbbbbbbb-0000-0000-0000-000000000011', 'b2222222-0000-0000-0000-000000000002', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'workshop', 'Berber Cooking Class', 'Learn to cook a traditional tagine in a medina rooftop kitchen. Market visit included. Vegetarian options.', ARRAY['en','fr','ary-Latn'], 12, 1, '{"wheelchair": "partial", "mobility_aid": "partial", "stamina_required": "low"}'::jsonb, 2, 8, 240, 3),
  ('cccccccc-0000-0000-0000-000000000012', 'b8888888-0000-0000-0000-000000000008', 'MA', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'meal', 'Traditional Berber Dinner', 'A home-cooked tagine dinner with a Berber family near Merzouga. Mint tea ceremony and music.', ARRAY['fr','ary-Latn'], 5, 1, '{"wheelchair": false, "mobility_aid": "partial", "stamina_required": "low"}'::jsonb, 2, 10, 120, 2)
ON CONFLICT (id) DO NOTHING;

-- ---------- seed: prices (MAD minor units) ----------
INSERT INTO catalogue_price_rule (id, listing_id, amount_minor, currency, pricing_unit, party_from, party_to) VALUES
  ('d1111111-0000-0000-0000-000000000001', 'c1111111-0000-0000-0000-000000000001', 180000, 'MAD', 'per_person', 2, 8),
  ('d2222222-0000-0000-0000-000000000002', 'c2222222-0000-0000-0000-000000000002', 35000, 'MAD', 'per_person', 1, 10),
  ('d3333333-0000-0000-0000-000000000003', 'c3333333-0000-0000-0000-000000000003', 45000, 'MAD', 'per_person', 1, 12),
  ('d4444444-0000-0000-0000-000000000004', 'c4444444-0000-0000-0000-000000000004', 95000, 'MAD', 'per_person', 2, 12),
  ('d5555555-0000-0000-0000-000000000005', 'c5555555-0000-0000-0000-000000000005', 25000, 'MAD', 'per_person', 1, 8),
  ('d6666666-0000-0000-0000-000000000006', 'c6666666-0000-0000-0000-000000000006', 85000, 'MAD', 'per_night', 1, 4),
  ('d7777777-0000-0000-0000-000000000007', 'c7777777-0000-0000-0000-000000000007', 40000, 'MAD', 'per_person', 1, 6),
  ('d8888888-0000-0000-0000-000000000008', 'c8888888-0000-0000-0000-000000000008', 55000, 'MAD', 'per_person', 1, 4),
  ('d9999999-0000-0000-0000-000000000009', 'c9999999-0000-0000-0000-000000000009', 50000, 'MAD', 'per_person', 1, 10),
  ('daaaaaaa-0000-0000-0000-000000000010', 'caaaaaaa-0000-0000-0000-000000000010', 60000, 'MAD', 'per_vehicle', 1, 6),
  ('dbbbbbbb-0000-0000-0000-000000000011', 'cbbbbbbb-0000-0000-0000-000000000011', 38000, 'MAD', 'per_person', 2, 8),
  ('dccccccc-0000-0000-0000-000000000012', 'cccccccc-0000-0000-0000-000000000012', 18000, 'MAD', 'per_person', 2, 10)
ON CONFLICT (id) DO NOTHING;

-- ---------- seed: hidden gems ----------
INSERT INTO hidden_gem (id, country_code, region_id, name, description, story, category, authenticity, fit_score, crowd_level, tags) VALUES
  ('e1111111-0000-0000-0000-000000000001', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jardin Anima', 'A contemporary art garden in the Ourika Valley, hidden among olive groves. Sculptures, mosaics, and silence.', 'Created by a French artist over twenty years, this garden hides one of Morocco most surprising art collections in a valley most travellers drive straight through.', 'place', 0.92, 0.7, 0.25, ARRAY['art','nature','quiet','ourika']),
  ('e2222222-0000-0000-0000-000000000002', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Café Clock Rooftop', 'Not the famous one, the small roftop above it where locals play Gnawa music on Thursday nights.', 'The ground floor is well-known. The Thursday night Gnawa sessions upstairs are not advertised, and they are the real thing.', 'cafe', 0.78, 0.6, 0.45, ARRAY['music','culture','evening']),
  ('e3333333-0000-0000-0000-000000000003', 'MA', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Seffarin Square', 'The paper-makers square in the Fès medina, where artisans still bind books by hand as they have for 800 years.', 'Most tours walk past. The binders here will show you how a leather book is made, start to finish, if you ask and sit a while.', 'place', 0.88, 0.65, 0.3, ARRAY['craft','history','medina']),
  ('e4444444-0000-0000-0000-000000000004', 'MA', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cap Sim Beach', 'A wild beach south of Essaouira reached by a 40-minute walk through a eucalyptus forest. No facilities, no crowds.', 'The walk deters most people. What you find is a long, empty Atlantic beach with dunes and sometimes dolphins offshore.', 'viewpoint', 0.85, 0.75, 0.15, ARRAY['beach','nature','hike','quiet']),
  ('e5555555-0000-0000-0000-000000000005', 'MA', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Khamlia Village', 'A Gnawa music village at the edge of the desert. Families who have played this music for generations.', 'Not a venue, a village. You are invited to sit, drink tea, and listen. The music here is the real roots of what the world calls Gnawa.', 'place', 0.9, 0.8, 0.2, ARRAY['music','culture','desert','evening']),
  ('e6666666-0000-0000-0000-000000000006', 'MA', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tin Mal Mosque', 'A 12th-century Almohad mosque in the High Atlas, rarely visited, architecturally as significant as the Koutoubia.', 'One of the oldest Almohad monuments. It is on the way to nowhere most tourists go, which is why it is empty.', 'place', 0.86, 0.55, 0.1, ARRAY['history','architecture','quiet','atlas'])
ON CONFLICT (id) DO NOTHING;