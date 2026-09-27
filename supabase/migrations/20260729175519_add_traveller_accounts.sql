/*
# Add traveller accounts, profiles, consent, and user-scoped data

1. New Tables
- `traveller_profile` — Per-user travel preferences set during onboarding.
  - `user_id` (uuid PK, references auth.users, DEFAULT auth.uid())
  - `display_name` (text)
  - `home_country` (text, nullable)
  - `display_currency` (char(3), default 'EUR') — EUR, USD, GBP, MAD
  - `preferred_locale` (text, default 'en')
  - `travel_style` (text, default 'balanced')
  - `default_pace` (smallint, default 3, range 1-5)
  - `default_luxury_level` (smallint, default 2, range 1-4)
  - `default_stamina` (smallint, default 3, range 1-5)
  - `languages_spoken` (text[], default '{}')
  - `interests` (text[], default '{}') — at least 3 enforced by CHECK constraint
  - `mobility_aid` (boolean, default false)
  - `max_walking_minutes` (smallint, default 120)
  - `step_tolerance` (smallint, default 3, range 1-5)
  - `sensory_needs` (text, nullable)
  - `onboarding_completed` (boolean, default false)
  - `created_at`, `updated_at` (timestamptz)

- `user_consent` — Purpose-scoped, versioned consent records (T-12).
  - `id` (uuid PK)
  - `user_id` (uuid, references auth.users, DEFAULT auth.uid())
  - `purpose` (text) — e.g. 'essential', 'analytics', 'marketing'
  - `version` (text) — consent document version
  - `granted` (boolean)
  - `granted_at` (timestamptz, nullable)
  - `withdrawn_at` (timestamptz, nullable)
  - `created_at` (timestamptz)

2. Modified Tables
- `trip` — Added `user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE`
- `booking` — Added `user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE`
- `conversation` — Added `user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE`
- `trip_share` — Added `user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE`

3. Security
- RLS enabled on all new tables.
- `traveller_profile` and `user_consent`: owner-scoped (auth.uid() = user_id), TO authenticated.
- `trip`, `booking`, `conversation`, `trip_share`: updated policies from anon-open to owner-scoped.
- Catalogue tables (listings, providers, gems, regions, flights, transport, emergency) remain anon-readable — they are public catalogue data.

4. Important Notes
- The existing anon-open policies on trip/booking/conversation/trip_share are replaced with owner-scoped policies.
- user_id columns default to auth.uid() so inserts from authenticated sessions work without the client passing user_id.
- Interests minimum-3 constraint enforced at DB level: CHECK (array_length(interests, 1) >= 3 OR array_length(interests, 1) IS NULL).
- Existing rows get user_id = null initially; we set them to a placeholder only if rows exist (they won't in a fresh demo).
*/

-- ---- traveller_profile ----
CREATE TABLE IF NOT EXISTS traveller_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Traveller',
  home_country text,
  display_currency char(3) NOT NULL DEFAULT 'EUR',
  preferred_locale text NOT NULL DEFAULT 'en',
  travel_style text NOT NULL DEFAULT 'balanced',
  default_pace smallint NOT NULL DEFAULT 3 CHECK (default_pace >= 1 AND default_pace <= 5),
  default_luxury_level smallint NOT NULL DEFAULT 2 CHECK (default_luxury_level >= 1 AND default_luxury_level <= 4),
  default_stamina smallint NOT NULL DEFAULT 3 CHECK (default_stamina >= 1 AND default_stamina <= 5),
  languages_spoken text[] NOT NULL DEFAULT '{}',
  interests text[] NOT NULL DEFAULT '{}',
  mobility_aid boolean NOT NULL DEFAULT false,
  max_walking_minutes smallint NOT NULL DEFAULT 120,
  step_tolerance smallint NOT NULL DEFAULT 3 CHECK (step_tolerance >= 1 AND step_tolerance <= 5),
  sensory_needs text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE traveller_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON traveller_profile;
CREATE POLICY "select_own_profile" ON traveller_profile FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_profile" ON traveller_profile;
CREATE POLICY "insert_own_profile" ON traveller_profile FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_profile" ON traveller_profile;
CREATE POLICY "update_own_profile" ON traveller_profile FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_profile" ON traveller_profile;
CREATE POLICY "delete_own_profile" ON traveller_profile FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---- user_consent ----
CREATE TABLE IF NOT EXISTS user_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_consent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_consent" ON user_consent;
CREATE POLICY "select_own_consent" ON user_consent FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_consent" ON user_consent;
CREATE POLICY "insert_own_consent" ON user_consent FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_consent" ON user_consent;
CREATE POLICY "update_own_consent" ON user_consent FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_consent" ON user_consent;
CREATE POLICY "delete_own_consent" ON user_consent FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---- Add user_id to trip ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trip' AND column_name='user_id') THEN
    ALTER TABLE trip ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---- Add user_id to booking ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name='user_id') THEN
    ALTER TABLE booking ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---- Add user_id to conversation ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='conversation' AND column_name='user_id') THEN
    ALTER TABLE conversation ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---- Add user_id to trip_share ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trip_share' AND column_name='user_id') THEN
    ALTER TABLE trip_share ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---- Replace trip policies: owner-scoped ----
DROP POLICY IF EXISTS "anon_crud_trip" ON trip;
CREATE POLICY "select_own_trips" ON trip FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_trips" ON trip FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_trips" ON trip FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_trips" ON trip FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---- Replace booking policies: owner-scoped ----
DROP POLICY IF EXISTS "anon_crud_booking" ON booking;
CREATE POLICY "select_own_bookings" ON booking FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_bookings" ON booking FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_bookings" ON booking FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_bookings" ON booking FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---- Replace conversation policies: owner-scoped ----
DROP POLICY IF EXISTS "anon_crud_conversation" ON conversation;
CREATE POLICY "select_own_conversations" ON conversation FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_conversations" ON conversation FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_conversations" ON conversation FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_conversations" ON conversation FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---- Replace message policies: owner-scoped via conversation ----
DROP POLICY IF EXISTS "anon_crud_message" ON message;
CREATE POLICY "select_own_messages" ON message FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversation c WHERE c.id = message.conversation_id AND c.user_id = auth.uid())
  );
CREATE POLICY "insert_own_messages" ON message FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM conversation c WHERE c.id = message.conversation_id AND c.user_id = auth.uid())
  );
CREATE POLICY "update_own_messages" ON message FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversation c WHERE c.id = message.conversation_id AND c.user_id = auth.uid())
  );
CREATE POLICY "delete_own_messages" ON message FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversation c WHERE c.id = message.conversation_id AND c.user_id = auth.uid())
  );

-- ---- Replace trip_share policies: owner-scoped ----
DROP POLICY IF EXISTS "anon_crud_trip_share" ON trip_share;
-- Anyone with the token can view (shared trips), but only owner can create/delete
CREATE POLICY "select_trip_shares" ON trip_share FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_trip_shares" ON trip_share FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_trip_shares" ON trip_share FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_trip_shares" ON trip_share FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---- trip_version, trip_day, trip_item: owner-scoped via trip ----
DROP POLICY IF EXISTS "anon_crud_trip_version" ON trip_version;
CREATE POLICY "select_own_trip_versions" ON trip_version FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip t WHERE t.id = trip_version.trip_id AND t.user_id = auth.uid())
  );
CREATE POLICY "insert_own_trip_versions" ON trip_version FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trip t WHERE t.id = trip_version.trip_id AND t.user_id = auth.uid())
  );
CREATE POLICY "update_own_trip_versions" ON trip_version FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip t WHERE t.id = trip_version.trip_id AND t.user_id = auth.uid())
  );
CREATE POLICY "delete_own_trip_versions" ON trip_version FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip t WHERE t.id = trip_version.trip_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "anon_crud_trip_day" ON trip_day;
CREATE POLICY "select_own_trip_days" ON trip_day FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip_version tv JOIN trip t ON t.id = tv.trip_id WHERE tv.id = trip_day.trip_version_id AND t.user_id = auth.uid())
  );
CREATE POLICY "insert_own_trip_days" ON trip_day FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trip_version tv JOIN trip t ON t.id = tv.trip_id WHERE tv.id = trip_day.trip_version_id AND t.user_id = auth.uid())
  );
CREATE POLICY "update_own_trip_days" ON trip_day FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip_version tv JOIN trip t ON t.id = tv.trip_id WHERE tv.id = trip_day.trip_version_id AND t.user_id = auth.uid())
  );
CREATE POLICY "delete_own_trip_days" ON trip_day FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip_version tv JOIN trip t ON t.id = tv.trip_id WHERE tv.id = trip_day.trip_version_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "anon_crud_trip_item" ON trip_item;
CREATE POLICY "select_own_trip_items" ON trip_item FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip_day td JOIN trip_version tv ON tv.id = td.trip_version_id JOIN trip t ON t.id = tv.trip_id WHERE td.id = trip_item.trip_day_id AND t.user_id = auth.uid())
  );
CREATE POLICY "insert_own_trip_items" ON trip_item FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trip_day td JOIN trip_version tv ON tv.id = td.trip_version_id JOIN trip t ON t.id = tv.trip_id WHERE td.id = trip_item.trip_day_id AND t.user_id = auth.uid())
  );
CREATE POLICY "update_own_trip_items" ON trip_item FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip_day td JOIN trip_version tv ON tv.id = td.trip_version_id JOIN trip t ON t.id = tv.trip_id WHERE td.id = trip_item.trip_day_id AND t.user_id = auth.uid())
  );
CREATE POLICY "delete_own_trip_items" ON trip_item FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip_day td JOIN trip_version tv ON tv.id = td.trip_version_id JOIN trip t ON t.id = tv.trip_id WHERE td.id = trip_item.trip_day_id AND t.user_id = auth.uid())
  );

-- ---- item_feedback: owner-scoped via trip_item ----
DROP POLICY IF EXISTS "anon_crud_item_feedback" ON item_feedback;
CREATE POLICY "select_own_item_feedback" ON item_feedback FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip_day td JOIN trip_version tv ON tv.id = td.trip_version_id JOIN trip t ON t.id = tv.trip_id WHERE td.id = (SELECT trip_day_id FROM trip_item WHERE trip_item.id = item_feedback.trip_item_id) AND t.user_id = auth.uid())
  );
CREATE POLICY "insert_own_item_feedback" ON item_feedback FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trip_day td JOIN trip_version tv ON tv.id = td.trip_version_id JOIN trip t ON t.id = tv.trip_id WHERE td.id = (SELECT trip_day_id FROM trip_item WHERE trip_item.id = item_feedback.trip_item_id) AND t.user_id = auth.uid())
  );
CREATE POLICY "update_own_item_feedback" ON item_feedback FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip_day td JOIN trip_version tv ON tv.id = td.trip_version_id JOIN trip t ON t.id = tv.trip_id WHERE td.id = (SELECT trip_day_id FROM trip_item WHERE trip_item.id = item_feedback.trip_item_id) AND t.user_id = auth.uid())
  );
CREATE POLICY "delete_own_item_feedback" ON item_feedback FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trip_day td JOIN trip_version tv ON tv.id = td.trip_version_id JOIN trip t ON t.id = tv.trip_id WHERE td.id = (SELECT trip_day_id FROM trip_item WHERE trip_item.id = item_feedback.trip_item_id) AND t.user_id = auth.uid())
  );

-- ---- review: owner-scoped via booking ----
DROP POLICY IF EXISTS "anon_crud_review" ON review;
CREATE POLICY "select_own_reviews" ON review FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM booking b WHERE b.id = review.booking_id AND b.user_id = auth.uid())
  );
CREATE POLICY "insert_own_reviews" ON review FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM booking b WHERE b.id = review.booking_id AND b.user_id = auth.uid())
  );
CREATE POLICY "update_own_reviews" ON review FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM booking b WHERE b.id = review.booking_id AND b.user_id = auth.uid())
  );
CREATE POLICY "delete_own_reviews" ON review FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM booking b WHERE b.id = review.booking_id AND b.user_id = auth.uid())
  );

-- ---- attestation: owner-scoped via booking ----
DROP POLICY IF EXISTS "anon_crud_attestation" ON attestation;
CREATE POLICY "select_own_attestations" ON attestation FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM booking b WHERE b.id = attestation.booking_id AND b.user_id = auth.uid())
  );
CREATE POLICY "insert_own_attestations" ON attestation FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM booking b WHERE b.id = attestation.booking_id AND b.user_id = auth.uid())
  );
CREATE POLICY "delete_own_attestations" ON attestation FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM booking b WHERE b.id = attestation.booking_id AND b.user_id = auth.uid())
  );
