/*
# Add 21 new cities and 5 new parent regions

1. New Regions (level 1 - administrative regions)
- Rabat-Salé-Kénitra (77777777-...)
- Tanger-Tétouan-Al Hoceima (88888888-...)
- Béni Mellal-Khénifra (99999999-...)
- Oriental (aaaaaaaa-...)
- Guelmim-Oued Noun (bbbbbbbb-...)

2. New Cities (level 2 - destinations)
- Rabat, Meknès, Chefchaouen, Tangier, Tetouan, Agadir, Ouarzazate, Dakhla,
  Ifrane, Azrou, El Jadida, Asilah, Taroudant, Ouzoud, Ourika Valley,
  Aït Ben Haddou, Tinghir, Dades Valley, Akchour, Al Hoceima, Nador

3. Security
- No new tables. RLS already enabled on geo_region.
*/

-- New level-1 regions
INSERT INTO geo_region (id, country_code, name, level, parent_id)
VALUES
  ('77777777-7777-7777-7777-777777777777', 'MA', 'Rabat-Salé-Kénitra', 1, NULL),
  ('88888888-8888-8888-8888-888888888888', 'MA', 'Tanger-Tétouan-Al Hoceima', 1, NULL),
  ('99999999-9999-9999-9999-999999999999', 'MA', 'Béni Mellal-Khénifra', 1, NULL),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Oriental', 1, NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'MA', 'Guelmim-Oued Noun', 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- New level-2 cities
INSERT INTO geo_region (id, country_code, name, level, parent_id)
VALUES
  -- Rabat-Salé-Kénitra
  ('a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Rabat', 2, '77777777-7777-7777-7777-777777777777'),
  ('a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Meknès', 2, '44444444-4444-4444-4444-444444444444'),
  ('a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Chefchaouen', 2, '88888888-8888-8888-8888-888888888888'),
  ('a9999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Tangier', 2, '88888888-8888-8888-8888-888888888888'),
  ('a00a00a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Tetouan', 2, '88888888-8888-8888-8888-888888888888'),
  -- Souss-Massa
  ('a00b00b0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Agadir', 2, '66666666-6666-6666-6666-666666666666'),
  ('a00c00c0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Taroudant', 2, '66666666-6666-6666-6666-666666666666'),
  -- Drâa-Tafilalet
  ('a00d00d0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Ouarzazate', 2, '55555555-5555-5555-5555-555555555555'),
  ('a00e00e0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Dakhla', 2, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  -- Fès-Meknès
  ('a00f00f0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Ifrane', 2, '44444444-4444-4444-4444-444444444444'),
  ('a01010a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Azrou', 2, '44444444-4444-4444-4444-444444444444'),
  -- Casablanca-Settat
  ('a02020a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'El Jadida', 2, '33333333-3333-3333-3333-333333333333'),
  -- Tanger-Tétouan-Al Hoceima
  ('a03030a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Asilah', 2, '88888888-8888-8888-8888-888888888888'),
  ('a04040a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Al Hoceima', 2, '88888888-8888-8888-8888-888888888888'),
  ('a05050a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Nador', 2, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  -- Béni Mellal-Khénifra
  ('a06060a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Ouzoud', 2, '99999999-9999-9999-9999-999999999999'),
  ('a07070a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Dades Valley', 2, '55555555-5555-5555-5555-555555555555'),
  -- Marrakech-Safi
  ('a08080a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Ourika Valley', 2, '22222222-2222-2222-2222-222222222222'),
  ('a09090a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Aït Ben Haddou', 2, '55555555-5555-5555-5555-555555555555'),
  -- Drâa-Tafilalet
  ('a0a0a0a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Tinghir', 2, '55555555-5555-5555-5555-555555555555'),
  -- Tanger-Tétouan-Al Hoceima
  ('a0b0b0a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MA', 'Akchour', 2, '88888888-8888-8888-8888-888888888888')
ON CONFLICT (id) DO NOTHING;
