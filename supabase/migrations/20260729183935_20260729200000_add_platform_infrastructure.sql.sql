/*
# Add Platform Infrastructure Tables

## Summary
Adds outbox, analytics events, rate limit tracking, weather cache, opening hours,
sponsored content, push tokens, provider licence expiry tracking, and crowd monitoring.

## New Tables
1. `outbox` — transactional event outbox for side effects
2. `analytics_event` — named events with required properties
3. `rate_limit` — per-class rate limit counters
4. `weather_cache` — forecast snapshots per region
5. `opening_hours` — structured opening hours per listing
6. `sponsored_listing` — sponsored content kept separate from organic
7. `push_token` — device push notification tokens
8. `provider_licence` — licence/inspection expiry tracking
9. `crowd_level_history` — crowd level band changes with hysteresis
10. `app_version` — minimum version check for forced upgrade

## Security
- RLS enabled on all tables
- Most tables are app-managed (anon+authenticated for reads)
*/

-- ============================================================================
-- OUTBOX (X-06)
-- ============================================================================
CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "outbox_select" ON outbox;
CREATE POLICY "outbox_select" ON outbox FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "outbox_insert" ON outbox;
CREATE POLICY "outbox_insert" ON outbox FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "outbox_update" ON outbox;
CREATE POLICY "outbox_update" ON outbox FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status, created_at);

-- ============================================================================
-- ANALYTICS EVENT (X-12)
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  properties jsonb NOT NULL DEFAULT '{}',
  page_path text,
  locale text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analytics_event ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analytics_select" ON analytics_event;
CREATE POLICY "analytics_select" ON analytics_event FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "analytics_insert" ON analytics_event;
CREATE POLICY "analytics_insert" ON analytics_event FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_analytics_name ON analytics_event(event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_event(user_id);

-- ============================================================================
-- RATE LIMIT (X-09)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  limit_class text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rate_limit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limit_select" ON rate_limit;
CREATE POLICY "rate_limit_select" ON rate_limit FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "rate_limit_insert" ON rate_limit;
CREATE POLICY "rate_limit_insert" ON rate_limit FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "rate_limit_update" ON rate_limit;
CREATE POLICY "rate_limit_update" ON rate_limit FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit(identifier, limit_class, window_start);

-- ============================================================================
-- WEATHER CACHE (T-27)
-- ============================================================================
CREATE TABLE IF NOT EXISTS weather_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES geo_region(id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  temp_high_c numeric,
  temp_low_c numeric,
  precipitation_pct numeric,
  wind_kph numeric,
  condition_code text,
  suitability_score numeric NOT NULL DEFAULT 1.0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weather_select" ON weather_cache;
CREATE POLICY "weather_select" ON weather_cache FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "weather_insert" ON weather_cache;
CREATE POLICY "weather_insert" ON weather_cache FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "weather_update" ON weather_cache;
CREATE POLICY "weather_update" ON weather_cache FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_weather_region_date ON weather_cache(region_id, forecast_date);

-- ============================================================================
-- OPENING HOURS (T-17)
-- ============================================================================
CREATE TABLE IF NOT EXISTS opening_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES catalogue_listing(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time NOT NULL,
  close_time time NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hours_select" ON opening_hours;
CREATE POLICY "hours_select" ON opening_hours FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "hours_insert" ON opening_hours;
CREATE POLICY "hours_insert" ON opening_hours FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "hours_update" ON opening_hours;
CREATE POLICY "hours_update" ON opening_hours FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "hours_delete" ON opening_hours;
CREATE POLICY "hours_delete" ON opening_hours FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_hours_listing ON opening_hours(listing_id);

-- ============================================================================
-- SPONSORED LISTING (X-14)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sponsored_listing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES catalogue_listing(id) ON DELETE CASCADE,
  sponsor_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sponsored_listing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sponsored_select" ON sponsored_listing;
CREATE POLICY "sponsored_select" ON sponsored_listing FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sponsored_insert" ON sponsored_listing;
CREATE POLICY "sponsored_insert" ON sponsored_listing FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_sponsored_listing ON sponsored_listing(listing_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_active ON sponsored_listing(is_active, start_date, end_date);

-- ============================================================================
-- PUSH TOKEN (T-46)
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  device_info text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_token ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_select_own" ON push_token;
CREATE POLICY "push_select_own" ON push_token FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "push_insert_own" ON push_token;
CREATE POLICY "push_insert_own" ON push_token FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "push_update_own" ON push_token;
CREATE POLICY "push_update_own" ON push_token FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "push_delete_own" ON push_token;
CREATE POLICY "push_delete_own" ON push_token FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_push_user ON push_token(user_id, is_active);

-- ============================================================================
-- PROVIDER LICENCE (O-04)
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_licence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_org_id uuid NOT NULL REFERENCES provider_org(id) ON DELETE CASCADE,
  licence_type text NOT NULL,
  licence_number text,
  issued_at date,
  expires_at date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE provider_licence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "licence_select" ON provider_licence;
CREATE POLICY "licence_select" ON provider_licence FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "licence_insert" ON provider_licence;
CREATE POLICY "licence_insert" ON provider_licence FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "licence_update" ON provider_licence;
CREATE POLICY "licence_update" ON provider_licence FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_licence_provider ON provider_licence(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_licence_expiry ON provider_licence(expires_at, status);

-- ============================================================================
-- CROWD LEVEL HISTORY (O-07)
-- ============================================================================
CREATE TABLE IF NOT EXISTS crowd_level_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gem_id uuid NOT NULL REFERENCES hidden_gem(id) ON DELETE CASCADE,
  old_band text,
  new_band text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crowd_level_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crowd_select" ON crowd_level_history;
CREATE POLICY "crowd_select" ON crowd_level_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "crowd_insert" ON crowd_level_history;
CREATE POLICY "crowd_insert" ON crowd_level_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_crowd_gem ON crowd_level_history(gem_id, changed_at);

-- ============================================================================
-- APP VERSION (X-16)
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'web',
  minimum_version text NOT NULL,
  current_version text NOT NULL,
  upgrade_message text,
  is_blocking boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_version ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "version_select" ON app_version;
CREATE POLICY "version_select" ON app_version FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "version_insert" ON app_version;
CREATE POLICY "version_insert" ON app_version FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "version_update" ON app_version;
CREATE POLICY "version_update" ON app_version FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Seed current version
INSERT INTO app_version (platform, minimum_version, current_version, upgrade_message, is_blocking)
VALUES ('web', '1.0.0', '1.0.0', 'Please update Amuddu to the latest version.', false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED OPENING HOURS for existing listings
-- ============================================================================
INSERT INTO opening_hours (listing_id, day_of_week, open_time, close_time, is_closed)
SELECT l.id, d.dow, '09:00', '18:00', false
FROM catalogue_listing l
CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(dow)
WHERE NOT EXISTS (SELECT 1 FROM opening_hours oh WHERE oh.listing_id = l.id)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED WEATHER for launch regions
-- ============================================================================
INSERT INTO weather_cache (region_id, forecast_date, temp_high_c, temp_low_c, precipitation_pct, wind_kph, condition_code, suitability_score)
SELECT r.id, CURRENT_DATE + g.n, 28, 16, 5, 12, 'sunny', 1.0
FROM geo_region r
CROSS JOIN generate_series(0, 6) AS g(n)
WHERE r.level = 1 AND r.name IN ('Marrakech', 'Fès', 'Essaouira')
  AND NOT EXISTS (SELECT 1 FROM weather_cache wc WHERE wc.region_id = r.id AND wc.forecast_date = CURRENT_DATE + g.n)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED PROVIDER LICENCES
-- ============================================================================
INSERT INTO provider_licence (provider_org_id, licence_type, licence_number, issued_at, expires_at, status)
SELECT p.id, 'business_licence', 'BL-' || substr(p.id::text, 1, 8), CURRENT_DATE - INTERVAL '2 years', CURRENT_DATE + INTERVAL '1 year', 'active'
FROM provider_org p
WHERE p.verification_state = 'verified'
  AND NOT EXISTS (SELECT 1 FROM provider_licence pl WHERE pl.provider_org_id = p.id)
ON CONFLICT DO NOTHING;
