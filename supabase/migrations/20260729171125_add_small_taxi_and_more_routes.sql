-- Add small taxi (petit taxi) transport options and more routes across cities

INSERT INTO transport_option (id, transport_type, provider, origin_city, destination_city, departure_time, arrival_time, duration_minutes, price_minor, currency, frequency, notes) VALUES
-- Small taxis (petit taxi) — intra-city, metered
('a1a1a1a1-0000-0000-0000-000000000001', 'small_taxi', 'Petit Taxi', 'Casablanca', 'Casablanca', 'on_demand', 'on_demand', 20, 2000, 'MAD', 'daily', 'Metered urban taxi. Max 3 passengers.'),
('a2a2a2a2-0000-0000-0000-000000000002', 'small_taxi', 'Petit Taxi', 'Marrakech', 'Marrakech', 'on_demand', 'on_demand', 15, 1500, 'MAD', 'daily', 'Metered urban taxi. Max 3 passengers.'),
('a3a3a3a3-0000-0000-0000-000000000003', 'small_taxi', 'Petit Taxi', 'Fès', 'Fès', 'on_demand', 'on_demand', 15, 1200, 'MAD', 'daily', 'Metered urban taxi. Max 3 passengers.'),
('a4a4a4a4-0000-0000-0000-000000000004', 'small_taxi', 'Petit Taxi', 'Tangier', 'Tangier', 'on_demand', 'on_demand', 15, 1500, 'MAD', 'daily', 'Metered urban taxi. Max 3 passengers.'),
('a5a5a5a5-0000-0000-0000-000000000005', 'small_taxi', 'Petit Taxi', 'Rabat', 'Rabat', 'on_demand', 'on_demand', 15, 1800, 'MAD', 'daily', 'Metered urban taxi. Max 3 passengers.'),
('a6a6a6a6-0000-0000-0000-000000000006', 'small_taxi', 'Petit Taxi', 'Agadir', 'Agadir', 'on_demand', 'on_demand', 15, 1500, 'MAD', 'daily', 'Metered urban taxi. Max 3 passengers.'),
('a7a7a7a7-0000-0000-0000-000000000007', 'small_taxi', 'Petit Taxi', 'Essaouira', 'Essaouira', 'on_demand', 'on_demand', 10, 1200, 'MAD', 'daily', 'Metered urban taxi. Max 3 passengers.'),

-- Grand taxis — more intercity routes
('b1b1b1b1-0000-0000-0000-000000000010', 'grand_taxi', 'Shared grand taxi', 'Fès', 'Meknès', 'on_demand', 'on_demand', 60, 4000, 'MAD', 'daily', 'Departs when full. Up to 6 passengers.'),
('b2b2b2b2-0000-0000-0000-000000000011', 'grand_taxi', 'Shared grand taxi', 'Marrakech', 'Essaouira', 'on_demand', 'on_demand', 150, 5000, 'MAD', 'daily', 'Departs when full. Up to 6 passengers.'),
('b3b3b3b3-0000-0000-0000-000000000012', 'grand_taxi', 'Shared grand taxi', 'Casablanca', 'Rabat', 'on_demand', 'on_demand', 90, 4000, 'MAD', 'daily', 'Departs when full. Up to 6 passengers.'),
('b4b4b4b4-0000-0000-0000-000000000013', 'grand_taxi', 'Shared grand taxi', 'Tangier', 'Fès', 'on_demand', 'on_demand', 240, 8000, 'MAD', 'daily', 'Departs when full. Up to 6 passengers.'),

-- Buses — more routes
('c1c1c1c1-0000-0000-0000-000000000020', 'bus', 'CTM', 'Fès', 'Marrakech', '07:00', '15:00', 480, 16000, 'MAD', 'daily', 'Air-conditioned coach via Casablanca.'),
('c2c2c2c2-0000-0000-0000-000000000021', 'bus', 'CTM', 'Casablanca', 'Fès', '06:30', '13:00', 390, 14000, 'MAD', 'daily', 'Air-conditioned coach.'),
('c3c3c3c3-0000-0000-0000-000000000022', 'bus', 'Supratours', 'Casablanca', 'Agadir', '09:00', '17:00', 480, 17000, 'MAD', 'daily', 'ONCF-owned bus. Air-conditioned.'),
('c4c4c4c4-0000-0000-0000-000000000023', 'bus', 'CTM', 'Tangier', 'Marrakech', '07:00', '20:00', 780, 22000, 'MAD', 'daily', 'Long-distance coach. Book ahead.'),

-- Private transfers — more routes
('d1d1d1d1-0000-0000-0000-000000000030', 'private_transfer', 'Atlas Transfers', 'Marrakech', 'Fès', 'on_demand', 'on_demand', 420, 90000, 'MAD', 'daily', 'Private 4x4 with driver. Up to 6 passengers.'),
('d2d2d2d2-0000-0000-0000-000000000031', 'private_transfer', 'Sahara Sands', 'Fès', 'Merzouga', 'on_demand', 'on_demand', 420, 110000, 'MAD', 'daily', 'Private 4x4 desert transfer. Up to 6 passengers.'),
('d3d3d3d3-0000-0000-0000-000000000032', 'private_transfer', 'Atlas Transfers', 'Casablanca', 'Marrakech', 'on_demand', 'on_demand', 180, 70000, 'MAD', 'daily', 'Private sedan or van. Up to 6 passengers.'),

-- Trains — more ONCF routes
('e1e1e1e1-0000-0000-0000-000000000040', 'train', 'ONCF', 'Casablanca', 'Rabat', '06:00', '06:50', 50, 4000, 'MAD', 'daily', 'Frequent departures. ~50 min.'),
('e2e2e2e2-0000-0000-0000-000000000041', 'train', 'ONCF', 'Rabat', 'Casablanca', '07:00', '07:50', 50, 4000, 'MAD', 'daily', 'Frequent departures. ~50 min.'),
('e3e3e3e3-0000-0000-0000-000000000042', 'train', 'ONCF', 'Fès', 'Marrakech', '08:00', '16:00', 480, 15000, 'MAD', 'daily', 'Conventional rail via Casablanca.'),
('e4e4e4e4-0000-0000-0000-000000000043', 'train', 'ONCF', 'Marrakech', 'Fès', '09:00', '17:00', 480, 15000, 'MAD', 'daily', 'Conventional rail via Casablanca.'),
('e5e5e5e5-0000-0000-0000-000000000044', 'train', 'ONCF', 'Casablanca', 'Agadir', '06:30', '13:00', 390, 13000, 'MAD', 'daily', 'Conventional rail. Reservations recommended.')
ON CONFLICT (id) DO NOTHING;
