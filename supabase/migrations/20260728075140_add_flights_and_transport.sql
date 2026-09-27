/*
# Add flights and in-country transport tables with seed data

1. New Tables
- `flight`: international flights to/from Morocco (airplane booking for the MVP).
  Carries airline, flight number, origin/destination IATA, departure/arrival times,
  duration, price in minor units, stops, cabin class.
- `transport_option`: in-country transport — trains (Al Boraq, ONCF), buses (CTM, Supratours),
  grand taxis, and private transfers. Carries provider, origin/destination cities,
  times, duration, price, frequency, notes.

2. Security
- RLS enabled on both tables.
- No-auth traveller web: all policies TO anon, authenticated with USING (true) / WITH CHECK (true)
  because flight and transport data is intentionally public/shared catalogue content.

3. Important notes
- These tables support the MVP requirement to include airplane booking and in-country transport.
- Prices are integer minor units + currency (MAD or EUR), never floats.
- Transport types cover the real Moroccan network: Al Boraq high-speed rail, conventional rail,
  CTM and Supratours intercity buses, shared grand taxis, and private transfers.
*/

CREATE TABLE IF NOT EXISTS flight (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airline             text NOT NULL,
  flight_number       text NOT NULL,
  origin_city         text NOT NULL,
  origin_iata         text NOT NULL,
  destination_city    text NOT NULL,
  destination_iata    text NOT NULL,
  departure_time      text NOT NULL,
  arrival_time        text NOT NULL,
  duration_minutes    integer NOT NULL,
  price_minor         bigint NOT NULL,
  currency            char(3) NOT NULL DEFAULT 'EUR',
  stops               smallint NOT NULL DEFAULT 0,
  cabin_class         text NOT NULL DEFAULT 'economy',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transport_option (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_type      text NOT NULL,
  provider            text NOT NULL,
  origin_city         text NOT NULL,
  destination_city    text NOT NULL,
  departure_time      text NOT NULL,
  arrival_time        text NOT NULL,
  duration_minutes    integer NOT NULL,
  price_minor         bigint NOT NULL,
  currency            char(3) NOT NULL DEFAULT 'MAD',
  frequency           text NOT NULL DEFAULT 'daily',
  notes               text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flight_origin ON flight (origin_iata, destination_iata);
CREATE INDEX IF NOT EXISTS idx_transport_route ON transport_option (origin_city, destination_city);

ALTER TABLE flight ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_option ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['flight','transport_option']
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

-- ---------- seed: flights to Morocco ----------
INSERT INTO flight (id, airline, flight_number, origin_city, origin_iata, destination_city, destination_iata, departure_time, arrival_time, duration_minutes, price_minor, currency, stops, cabin_class) VALUES
  ('1a111111-0000-0000-0000-000000000001', 'Royal Air Maroc', 'AT767', 'Paris', 'CDG', 'Casablanca', 'CMN', '10:25', '13:10', 205, 18500, 'EUR', 0, 'economy'),
  ('2a222222-0000-0000-0000-000000000002', 'Air France', 'AF1397', 'Paris', 'CDG', 'Marrakech', 'RAK', '14:15', '17:35', 200, 21500, 'EUR', 0, 'economy'),
  ('3a333333-0000-0000-0000-000000000003', 'Ryanair', 'FR3501', 'Madrid', 'MAD', 'Marrakech', 'RAK', '06:40', '08:15', 95, 8900, 'EUR', 0, 'economy'),
  ('4a444444-0000-0000-0000-000000000004', 'easyJet', 'U28451', 'London', 'LGW', 'Marrakech', 'RAK', '11:55', '15:35', 220, 14200, 'EUR', 0, 'economy'),
  ('5a555555-0000-0000-0000-000000000005', 'Royal Air Maroc', 'AT775', 'Casablanca', 'CMN', 'Paris', 'CDG', '14:30', '19:10', 220, 17800, 'EUR', 0, 'economy'),
  ('6a666666-0000-0000-0000-000000000006', 'Transavia', 'TO3210', 'Paris', 'ORY', 'Agadir', 'AGA', '09:00', '12:10', 190, 12900, 'EUR', 0, 'economy'),
  ('7a777777-0000-0000-0000-000000000007', 'Vueling', 'VY7102', 'Barcelona', 'BCN', 'Casablanca', 'CMN', '07:15', '09:50', 95, 11200, 'EUR', 0, 'economy'),
  ('8a888888-0000-0000-0000-000000000008', 'Royal Air Maroc', 'AT820', 'London', 'LHR', 'Marrakech', 'RAK', '16:40', '20:55', 255, 24800, 'EUR', 0, 'economy')
ON CONFLICT (id) DO NOTHING;

-- ---------- seed: in-country transport ----------
INSERT INTO transport_option (id, transport_type, provider, origin_city, destination_city, departure_time, arrival_time, duration_minutes, price_minor, currency, frequency, notes) VALUES
  ('1b111111-0000-0000-0000-000000000001', 'train', 'Al Boraq (ONCF)', 'Casablanca', 'Tangier', '05:00', '07:30', 150, 22000, 'MAD', 'daily', 'High-speed rail. Reservations required.'),
  ('2b222222-0000-0000-0000-000000000002', 'train', 'Al Boraq (ONCF)', 'Tangier', 'Casablanca', '18:00', '20:30', 150, 22000, 'MAD', 'daily', 'High-speed rail. Reservations required.'),
  ('3b333333-0000-0000-0000-000000000003', 'train', 'ONCF', 'Casablanca', 'Marrakech', '06:50', '11:15', 265, 9000, 'MAD', 'daily', 'Conventional rail. Multiple departures daily.'),
  ('4b444444-0000-0000-0000-000000000004', 'train', 'ONCF', 'Marrakech', 'Casablanca', '15:00', '19:25', 265, 9000, 'MAD', 'daily', 'Conventional rail. Multiple departures daily.'),
  ('5b555555-0000-0000-0000-000000000005', 'train', 'ONCF', 'Fès', 'Casablanca', '09:30', '15:10', 340, 11000, 'MAD', 'daily', 'Conventional rail via Rabat.'),
  ('6b666666-0000-0000-0000-000000000006', 'bus', 'CTM', 'Marrakech', 'Essaouira', '08:00', '11:00', 180, 8000, 'MAD', 'daily', 'Air-conditioned coach. Departs from CTM station.'),
  ('7b777777-0000-0000-0000-000000000007', 'bus', 'CTM', 'Marrakech', 'Merzouga', '07:30', '17:00', 570, 18000, 'MAD', 'daily', 'Long journey via Ouarzazate. Book ahead in season.'),
  ('8b888888-0000-0000-0000-000000000008', 'bus', 'Supratours', 'Marrakech', 'Essaouira', '10:00', '13:00', 180, 7500, 'MAD', 'daily', 'ONCF-owned bus. Connects with rail.'),
  ('9b999999-0000-0000-0000-000000000009', 'grand_taxi', 'Shared grand taxi', 'Marrakech', 'Ourika Valley', 'on_demand', 'on_demand', 90, 5000, 'MAD', 'daily', 'Departs when full. Negotiate price. Up to 6 passengers.'),
  ('abaaaaaa-0000-0000-0000-000000000010', 'private_transfer', 'Ourika Journeys', 'Marrakech', 'Ourika Valley', 'on_demand', 'on_demand', 90, 60000, 'MAD', 'daily', 'Private 4x4. Up to 6 passengers. Driver waits.'),
  ('bbbbbbbb-0000-0000-0000-000000000011', 'private_transfer', 'Sahara Sands', 'Marrakech', 'Merzouga', 'on_demand', 'on_demand', 540, 120000, 'MAD', 'daily', 'Private 4x4 with driver. Long desert transfer.'),
  ('cbcccccc-0000-0000-0000-000000000012', 'bus', 'CTM', 'Casablanca', 'Marrakech', '07:00', '12:30', 330, 12000, 'MAD', 'daily', 'Air-conditioned coach.'),
  ('dbdddddd-0000-0000-0000-000000000013', 'train', 'ONCF', 'Casablanca', 'Fès', '07:00', '12:30', 330, 12000, 'MAD', 'daily', 'Conventional rail via Rabat and Meknès.')
ON CONFLICT (id) DO NOTHING;