-- Add more flight routes to/from Morocco with more airlines and cities

INSERT INTO flight (id, airline, flight_number, origin_city, origin_iata, destination_city, destination_iata, departure_time, arrival_time, duration_minutes, price_minor, currency, stops, cabin_class) VALUES
-- Inbound: Europe to Morocco
('f1f1f1f1-0000-0000-0000-000000000011', 'Ryanair', 'FR 5783', 'Madrid', 'MAD', 'Fès', 'FEZ', '10:20', '11:45', 85, 8500, 'MAD', 0, 'economy'),
('f2f2f2f2-0000-0000-0000-000000000012', 'Ryanair', 'FR 6291', 'Barcelona', 'BCN', 'Fès', 'FEZ', '08:15', '09:50', 95, 7800, 'MAD', 0, 'economy'),
('f3f3f3f3-0000-0000-0000-000000000013', 'EasyJet', 'U2 8821', 'London', 'LGW', 'Agadir', 'AGA', '07:00', '11:10', 250, 12000, 'MAD', 0, 'economy'),
('f4f4f4f4-0000-0000-0000-000000000014', 'Royal Air Maroc', 'AT 801', 'Paris', 'ORY', 'Marrakech', 'RAK', '09:30', '12:00', 150, 15000, 'MAD', 0, 'economy'),
('f5f5f5f5-0000-0000-0000-000000000015', 'Vueling', 'VY 7102', 'Barcelona', 'BCN', 'Tangier', 'TNG', '13:40', '15:10', 90, 6500, 'MAD', 0, 'economy'),
('f6f6f6f6-0000-0000-0000-000000000016', 'Ryanair', 'FR 3092', 'Madrid', 'MAD', 'Tangier', 'TNG', '06:45', '08:15', 90, 5500, 'MAD', 0, 'economy'),
('f7f7f7f7-0000-0000-0000-000000000017', 'Royal Air Maroc', 'AT 579', 'London', 'LHR', 'Casablanca', 'CMN', '14:00', '17:30', 210, 18000, 'MAD', 0, 'economy'),
('f8f8f8f8-0000-0000-0000-000000000018', 'Air Arabia', 'G9 283', 'Barcelona', 'BCN', 'Casablanca', 'CMN', '11:00', '13:20', 140, 9500, 'MAD', 0, 'economy'),
('f9f9f9f9-0000-0000-0000-000000000019', 'Transavia', 'TO 3210', 'Paris', 'ORY', 'Agadir', 'AGA', '06:40', '09:50', 190, 11000, 'MAD', 0, 'economy'),
('fafafafa-0000-0000-0000-00000000001a', 'TAP Air Portugal', 'TP 552', 'Lisbon', 'LIS', 'Casablanca', 'CMN', '09:00', '11:15', 135, 10000, 'MAD', 0, 'economy'),
('fbfbfbfb-0000-0000-0000-00000000001b', 'Ryanair', 'FR 7744', 'Brussels', 'CRL', 'Fès', 'FEZ', '15:30', '18:00', 150, 9000, 'MAD', 0, 'economy'),
('fcfcfcfc-0000-0000-0000-00000000001c', 'Vueling', 'VY 8310', 'Barcelona', 'BCN', 'Agadir', 'AGA', '17:20', '20:00', 160, 11000, 'MAD', 0, 'economy'),

-- Outbound: Morocco to Europe
('fdfdfdfd-0000-0000-0000-000000000021', 'Ryanair', 'FR 5784', 'Fès', 'FEZ', 'Madrid', 'MAD', '12:30', '15:00', 90, 8500, 'MAD', 0, 'economy'),
('fefefefe-0000-0000-0000-000000000022', 'Ryanair', 'FR 6292', 'Fès', 'FEZ', 'Barcelona', 'BCN', '10:40', '13:15', 95, 7800, 'MAD', 0, 'economy'),
('e1e1e1e1-0000-0000-0000-000000000023', 'EasyJet', 'U2 8822', 'Agadir', 'AGA', 'London', 'LGW', '12:00', '16:10', 250, 12000, 'MAD', 0, 'economy'),
('e2e2e2e2-0000-0000-0000-000000000024', 'Royal Air Maroc', 'AT 802', 'Marrakech', 'RAK', 'Paris', 'ORY', '13:00', '16:30', 150, 15000, 'MAD', 0, 'economy'),
('e3e3e3e3-0000-0000-0000-000000000025', 'Vueling', 'VY 7103', 'Tangier', 'TNG', 'Barcelona', 'BCN', '16:00', '17:35', 95, 6500, 'MAD', 0, 'economy'),
('e4e4e4e4-0000-0000-0000-000000000026', 'Ryanair', 'FR 3093', 'Tangier', 'TNG', 'Madrid', 'MAD', '09:00', '10:35', 95, 5500, 'MAD', 0, 'economy'),
('e5e5e5e5-0000-0000-0000-000000000027', 'Royal Air Maroc', 'AT 580', 'Casablanca', 'CMN', 'London', 'LHR', '18:30', '22:00', 210, 18000, 'MAD', 0, 'economy'),
('e6e6e6e6-0000-0000-0000-000000000028', 'Air Arabia', 'G9 284', 'Casablanca', 'CMN', 'Barcelona', 'BCN', '14:10', '16:35', 145, 9500, 'MAD', 0, 'economy'),
('e7e7e7e7-0000-0000-0000-000000000029', 'Transavia', 'TO 3211', 'Agadir', 'AGA', 'Paris', 'ORY', '10:40', '14:50', 190, 11000, 'MAD', 0, 'economy'),
('e8e8e8e8-0000-0000-0000-00000000002a', 'TAP Air Portugal', 'TP 553', 'Casablanca', 'CMN', 'Lisbon', 'LIS', '12:20', '14:40', 140, 10000, 'MAD', 0, 'economy'),
('e9e9e9e9-0000-0000-0000-00000000002b', 'Ryanair', 'FR 7745', 'Fès', 'FEZ', 'Brussels', 'CRL', '18:40', '22:10', 150, 9000, 'MAD', 0, 'economy'),
('eaeaeaea-0000-0000-0000-00000000002c', 'Vueling', 'VY 8311', 'Agadir', 'AGA', 'Barcelona', 'BCN', '21:10', '23:55', 165, 11000, 'MAD', 0, 'economy')
ON CONFLICT (id) DO NOTHING;
