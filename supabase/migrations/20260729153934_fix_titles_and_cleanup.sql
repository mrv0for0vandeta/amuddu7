-- Fix duplicate city names in listing titles
UPDATE catalogue_listing SET title = REPLACE(title, 'Marrakech Marrakech ', 'Marrakech ') WHERE title LIKE 'Marrakech Marrakech %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Casablanca Casablanca ', 'Casablanca ') WHERE title LIKE 'Casablanca Casablanca %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Chefchaouen Chefchaouen ', 'Chefchaouen ') WHERE title LIKE 'Chefchaouen Chefchaouen %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Essaouira Essaouira ', 'Essaouira ') WHERE title LIKE 'Essaouira Essaouira %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Ouarzazate Ouarzazate ', 'Ouarzazate ') WHERE title LIKE 'Ouarzazate Ouarzazate %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Taroudant Taroudant ', 'Taroudant ') WHERE title LIKE 'Taroudant Taroudant %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Tetouan Tetouan ', 'Tetouan ') WHERE title LIKE 'Tetouan Tetouan %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Tangier Tangier ', 'Tangier ') WHERE title LIKE 'Tangier Tangier %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Agadir Agadir ', 'Agadir ') WHERE title LIKE 'Agadir Agadir %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Meknès Meknès ', 'Meknès ') WHERE title LIKE 'Meknès Meknès %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Dakhla Dakhla ', 'Dakhla ') WHERE title LIKE 'Dakhla Dakhla %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Ifrane Ifrane ', 'Ifrane ') WHERE title LIKE 'Ifrane Ifrane %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Azrou Azrou ', 'Azrou ') WHERE title LIKE 'Azrou Azrou %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Ouzoud Ouzoud ', 'Ouzoud ') WHERE title LIKE 'Ouzoud Ouzoud %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Nador Nador ', 'Nador ') WHERE title LIKE 'Nador Nador %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Asilah Asilah ', 'Asilah ') WHERE title LIKE 'Asilah Asilah %';
UPDATE catalogue_listing SET title = REPLACE(title, 'El Jadida El Jadida ', 'El Jadida ') WHERE title LIKE 'El Jadida El Jadida %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Ourika Valley Ourika Valley ', 'Ourika Valley ') WHERE title LIKE 'Ourika Valley Ourika Valley %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Dades Valley Dades Valley ', 'Dades Valley ') WHERE title LIKE 'Dades Valley Dades Valley %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Aït Ben Haddou Aït Ben Haddou ', 'Aït Ben Haddou ') WHERE title LIKE 'Aït Ben Haddou Aït Ben Haddou %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Tinghir Tinghir ', 'Tinghir ') WHERE title LIKE 'Tinghir Tinghir %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Akchour Akchour ', 'Akchour ') WHERE title LIKE 'Akchour Akchour %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Al Hoceima Al Hoceima ', 'Al Hoceima ') WHERE title LIKE 'Al Hoceima Al Hoceima %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Merzouga Merzouga ', 'Merzouga ') WHERE title LIKE 'Merzouga Merzouga %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Fès Fès ', 'Fès ') WHERE title LIKE 'Fès Fès %';
UPDATE catalogue_listing SET title = REPLACE(title, 'Rabat Rabat ', 'Rabat ') WHERE title LIKE 'Rabat Rabat %';

-- Cleanup helper function
DROP FUNCTION IF EXISTS exec_sql(text);

SELECT 'fixed' as status;
