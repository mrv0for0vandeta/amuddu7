-- Add origin_city to trip table and create booking table

ALTER TABLE trip ADD COLUMN IF NOT EXISTS origin_city text DEFAULT 'Casablanca';

CREATE TABLE IF NOT EXISTS booking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trip(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES catalogue_listing(id) ON DELETE SET NULL,
  item_type text NOT NULL,
  title text NOT NULL,
  image_url text,
  provider_name text,
  price_minor bigint NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'EUR',
  booking_date date,
  party_size smallint NOT NULL DEFAULT 1,
  luxury_level smallint NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all_bookings" ON booking FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_all_bookings" ON booking FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_all_bookings" ON booking FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_bookings" ON booking FOR DELETE TO anon, authenticated USING (true);