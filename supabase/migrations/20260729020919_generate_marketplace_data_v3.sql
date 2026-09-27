/*
# Generate marketplace data: providers, listings, and price rules

Populates marketplace with data for 26 cities × 8 categories × 4 tiers.
Each City×Category×Tier gets 3 unique providers, each with 2-5 listings.
Uses gen_random_uuid() for IDs and bigint seed for PRNG to avoid overflow.

1. New Data: ~2,496 providers, ~8,800 listings, ~8,800 price rules
2. Security: No new tables, no policy changes.
*/

DO $$
DECLARE
  v_rand double precision;
  v_seed bigint := 42;
  v_provider_id uuid;
  v_listing_id uuid;
  v_price_id uuid;
  v_rating numeric;
  v_reviews int;
  v_resp_time numeric;
  v_resp_rate numeric;
  v_num_listings int;
  v_title text;
  v_description text;
  v_duration int;
  v_price bigint;
  v_min_age int;
  v_difficulty int;
  v_min_party int;
  v_max_party int;
  v_img_idx int;
  v_img_url text;
  v_langs text[];
  v_bio text;
  v_p_type int;
  v_p_suffix text;
  v_tier_name text;
  v_unique_phrase text;
  v_audience text;
  v_inclusion text;
  v_template_idx int;
  v_used_titles text[];
  v_lang_idx int;
  v_img_id text;
  v_ext text;
  v_provider_name text;

  v_cities text[][] := ARRAY[
    ['a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Casablanca'],
    ['a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rabat'],
    ['a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Marrakech'],
    ['a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fès'],
    ['a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Meknès'],
    ['a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chefchaouen'],
    ['a9999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tangier'],
    ['a00a00a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tetouan'],
    ['a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Essaouira'],
    ['a00b00b0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Agadir'],
    ['a00d00d0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ouarzazate'],
    ['a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Merzouga'],
    ['a00e00e0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dakhla'],
    ['a00f00f0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ifrane'],
    ['a01010a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Azrou'],
    ['a02020a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'El Jadida'],
    ['a03030a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Asilah'],
    ['a00c00c0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Taroudant'],
    ['a06060a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ouzoud'],
    ['a08080a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ourika Valley'],
    ['a09090a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aït Ben Haddou'],
    ['a0a0a0a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tinghir'],
    ['a07070a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dades Valley'],
    ['a0b0b0a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Akchour'],
    ['a04040a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Al Hoceima'],
    ['a05050a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nador']
  ];
  v_city_id text; v_city_name text;
  v_categories text[] := ARRAY['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'desert_experience', 'transfer'];
  v_category text; v_tiers int[] := ARRAY[1, 2, 3, 4]; v_tier int;
  v_p_suffixes text[] := ARRAY['Tours', 'Adventures', 'Experiences', 'Guides', 'Travel', 'Concierge', 'Expeditions', 'Collective', 'Heritage', 'Studio', 'Academy', 'Retreat', 'Lodge', 'Riad', 'Transit', 'Chauffeur', 'Surf School', 'Diving Center', 'Charters', 'Balloon'];
  v_p_bios text[] := ARRAY[
    'Local family business specializing in authentic cultural tours since 2008.',
    'Boutique adventure operator with certified mountain guides.',
    'Cultural association promoting sustainable tourism and local heritage.',
    'Certified local guides with deep knowledge of Moroccan history.',
    'Full-service travel company offering personalized Moroccan journeys.',
    'Luxury concierge service crafting exclusive Moroccan experiences.',
    'Desert expedition company with expert Berber guides.',
    'Eco-tourism collective of local artisans and guides.',
    'Cultural preservation society offering immersive heritage tours.',
    'Creative studio specializing in photography and artisan workshops.',
    'Cooking academy teaching traditional Moroccan cuisine.',
    'Wellness retreat center offering hammam, yoga, and spa experiences.',
    'Eco lodge providing sustainable accommodation and nature activities.',
    'Traditional riad offering boutique stays and cultural immersion.',
    'Professional transfer service with modern fleet and English-speaking drivers.',
    'Private chauffeur company for premium door-to-door service.',
    'Certified surf and kitesurf school with experienced instructors.',
    'PADI-certified diving center exploring Morocco''s underwater treasures.',
    'Yacht and boat charter company for coastal adventures.',
    'Hot air balloon company offering sunrise flights over Moroccan landscapes.'
  ];
  v_title_tours text[] := ARRAY['Medina Walking Tour', 'Historical Highlights Tour', 'Half-Day Cultural Tour', 'Full-Day Guided City Tour', 'Hidden Corners Discovery Tour', 'Architecture & Heritage Tour', 'Photography Walking Tour', 'Sunset Viewpoints Tour', 'Souk & Market Tour', 'Old City Discovery Tour'];
  v_title_guided text[] := ARRAY['Guided Medina Experience', 'Local Life Immersion', 'Historical Guided Walk', 'Cultural Immersion Day', 'Insider Experience', 'Storytelling Heritage Walk', 'Hidden Gems Guided Tour', 'Art & Architecture Visit', 'Spiritual Sites Tour', 'Neighborhood Discovery Walk'];
  v_title_workshop text[] := ARRAY['Pottery Making Workshop', 'Cooking Class with Local Chef', 'Leather Craft Workshop', 'Carpet Weaving Workshop', 'Calligraphy Art Workshop', 'Traditional Jewelry Workshop', 'Tile & Mosaic Workshop', 'Henna Art Workshop', 'Bread Baking Workshop', 'Spice Blending Workshop'];
  v_title_stay text[] := ARRAY['Boutique Riad Stay', 'Traditional Guesthouse Stay', 'Luxury Hotel Experience', 'Eco Lodge Stay', 'Kasbah Stay Experience', 'Glamping Desert Stay', 'Heritage House Stay', 'Rooftop Suite Experience', 'Garden Riad Stay', 'Medina Guesthouse Stay'];
  v_title_meal text[] := ARRAY['Traditional Moroccan Dinner', 'Rooftop Dining Experience', 'Home-Cooked Meal with Local Family', 'Fine Dining Experience', 'Tea Ceremony & Pastries', 'Street Food Tour', 'Farm-to-Table Dining', 'Sunset Dinner with Views', 'Couscous Friday Lunch', 'Harira & Tagine Tasting'];
  v_title_activity text[] := ARRAY['Surf Lesson', 'Kitesurfing Course', 'Horse Riding Experience', 'Quad Biking Adventure', 'Hot Air Balloon Ride', 'Yoga & Wellness Session', 'Hammam & Spa Experience', 'Rock Climbing Adventure', 'Cycling Tour', 'Boat Trip & Coastal Cruise'];
  v_title_desert text[] := ARRAY['Camel Trekking at Sunset', 'Overnight Desert Camp', 'Sandboarding Adventure', '4x4 Desert Safari', 'Luxury Desert Camp Stay', 'Stargazing Desert Night', 'Desert Sunrise Camel Ride', 'Buggy Desert Tour', 'Nomad Village Visit', 'Desert Photography Expedition'];
  v_title_transfer text[] := ARRAY['Airport Private Transfer', 'City-to-City Private Driver', 'Luxury Chauffeur Service', 'Train Station Transfer', 'Group Shuttle Service', 'Hotel-to-Attraction Transfer', 'Scenic Route Transfer', 'Multi-Stop Transfer Service', 'Night Transfer Service', 'Family Transfer with Car Seats'];
  v_unique_phrases text[] := ARRAY[
    'Visit lesser-known landmarks and meet local artisans',
    'Explore ancient medina alleys most tourists never see',
    'Enjoy exclusive access to private gardens and courtyards',
    'Sample regional specialties at family-run establishments',
    'Learn traditional techniques passed down through generations',
    'Capture stunning views from secret vantage points',
    'Connect with local families and hear their stories',
    'Discover the blend of Berber, Arab, and Andalusian influences',
    'Experience the rhythm of daily life in the old city',
    'Wander through colorful markets filled with handcrafted goods',
    'Marvel at intricate tilework and carved cedar ceilings',
    'Savor spices and flavors unique to this region',
    'Traverse landscapes that have inspired poets for centuries',
    'Engage with master craftsmen in their workshops',
    'Witness sunrise over breathtaking natural formations'
  ];
  v_audiences text[] := ARRAY['families with children', 'couples seeking romance', 'solo travelers', 'photography enthusiasts', 'culture lovers', 'adventure seekers', 'first-time visitors', 'seasoned travelers', 'food lovers', 'history buffs'];
  v_inclusions text[] := ARRAY['hotel pickup and drop-off', 'a professional guide', 'all entrance fees', 'traditional mint tea and snacks', 'a souvenir photo', 'all necessary equipment', 'a local meal', 'travel insurance', 'bottled water', 'air-conditioned transport'];
  v_tier_names text[] := ARRAY['Budget', 'Standard', 'Premium', 'Luxury'];
  v_dur_tour int[] := ARRAY[120, 180, 240, 360, 480];
  v_dur_guided int[] := ARRAY[90, 120, 180, 240, 360];
  v_dur_workshop int[] := ARRAY[60, 90, 120, 180];
  v_dur_stay int[] := ARRAY[1440, 2880, 4320];
  v_dur_meal int[] := ARRAY[60, 90, 120, 150];
  v_dur_activity int[] := ARRAY[60, 90, 120, 180, 240];
  v_dur_desert int[] := ARRAY[120, 240, 480, 720, 1440];
  v_dur_transfer int[] := ARRAY[30, 45, 60, 90, 120];
  v_img_tour text[] := ARRAY['38112390', '14996117', '38111988', '19068524', '6621125', '18341651', '28582577', '29595710', '14719525', '27987052', '38112351', '15360686', '38112164', '38112371', '38112326'];
  v_img_guided text[] := ARRAY['38112390', '38111988', '6621125', '18341651', '28582577', '29595710', '38112351', '15360686', '38112164', '38112326', '19068524', '14996117', '14719525', '27987052', '38112371'];
  v_img_workshop text[] := ARRAY['32422996', '31092376', '34259434', '18373966', '29418319', '37364782', '33878971', '19867571', '34259423', '34004100', '34259436', '34461165', '33703946', '22823', '33633350'];
  v_img_stay text[] := ARRAY['15531322', '15531325', '10573397', '9143446', '31356131', '18320915', '412050', '31356126', '34940612', '34672503', '7391720', '34645081', '18320907', '34672504', '34645131'];
  v_img_meal text[] := ARRAY['2287528', '998244', '2291602', '36984667', '30068444', '2287524', '30068445', '37369301', '19162223', '2291603', '35201199', '35509025', '18496584', '2291596', '1618929'];
  v_img_activity text[] := ARRAY['9387222', '35341806', '34566165', '11047666', '32793714', '13521242', '28976474', '4761859', '36005570', '13926150', '33674831', '18696593', '35342185', '30560213', '20070755'];
  v_img_desert text[] := ARRAY['8357638', '33566021', '35882702', '30757359', '31653067', '34329676', '12214734', '20852588', '8428013', '35666734', '26925634', '31497923', '28356797', '18742772', '998656'];
  v_img_transfer text[] := ARRAY['19068524', '27987052', '14719525', '6621125', '15360686', '38112351', '29595710', '38112390', '18341651', '14996117', '38111988', '28582577', '38112371', '38112164', '38112326'];
  v_png_ids text[] := ARRAY['31356131', '31356126'];
  v_city_idx int; v_cat_idx int; v_tier_idx int; v_p int; v_l int;
  v_title_arr text[]; v_dur_arr int[]; v_img_arr text[];
  v_price_min int; v_price_max int;
  v_provider_count int := 0; v_listing_count int := 0; v_price_count int := 0;
BEGIN
  FOR v_city_idx IN 1..array_length(v_cities, 1) LOOP
    v_city_id := v_cities[v_city_idx][1];
    v_city_name := v_cities[v_city_idx][2];

    FOR v_cat_idx IN 1..array_length(v_categories, 1) LOOP
      v_category := v_categories[v_cat_idx];
      v_title_arr := CASE v_category WHEN 'tour' THEN v_title_tours WHEN 'guided_experience' THEN v_title_guided WHEN 'workshop' THEN v_title_workshop WHEN 'stay' THEN v_title_stay WHEN 'meal' THEN v_title_meal WHEN 'activity' THEN v_title_activity WHEN 'desert_experience' THEN v_title_desert WHEN 'transfer' THEN v_title_transfer END;
      v_dur_arr := CASE v_category WHEN 'tour' THEN v_dur_tour WHEN 'guided_experience' THEN v_dur_guided WHEN 'workshop' THEN v_dur_workshop WHEN 'stay' THEN v_dur_stay WHEN 'meal' THEN v_dur_meal WHEN 'activity' THEN v_dur_activity WHEN 'desert_experience' THEN v_dur_desert WHEN 'transfer' THEN v_dur_transfer END;
      v_img_arr := CASE v_category WHEN 'tour' THEN v_img_tour WHEN 'guided_experience' THEN v_img_guided WHEN 'workshop' THEN v_img_workshop WHEN 'stay' THEN v_img_stay WHEN 'meal' THEN v_img_meal WHEN 'activity' THEN v_img_activity WHEN 'desert_experience' THEN v_img_desert WHEN 'transfer' THEN v_img_transfer END;

      FOR v_tier_idx IN 1..array_length(v_tiers, 1) LOOP
        v_tier := v_tiers[v_tier_idx];
        v_tier_name := v_tier_names[v_tier_idx];
        v_price_min := CASE v_tier WHEN 1 THEN CASE v_cat_idx WHEN 1 THEN 8000 WHEN 2 THEN 5000 WHEN 3 THEN 4000 WHEN 4 THEN 20000 WHEN 5 THEN 3000 WHEN 6 THEN 6000 WHEN 7 THEN 10000 WHEN 8 THEN 3000 END WHEN 2 THEN CASE v_cat_idx WHEN 1 THEN 15000 WHEN 2 THEN 12000 WHEN 3 THEN 10000 WHEN 4 THEN 40000 WHEN 5 THEN 8000 WHEN 6 THEN 12000 WHEN 7 THEN 20000 WHEN 8 THEN 8000 END WHEN 3 THEN CASE v_cat_idx WHEN 1 THEN 30000 WHEN 2 THEN 25000 WHEN 3 THEN 20000 WHEN 4 THEN 80000 WHEN 5 THEN 15000 WHEN 6 THEN 25000 WHEN 7 THEN 40000 WHEN 8 THEN 15000 END WHEN 4 THEN CASE v_cat_idx WHEN 1 THEN 60000 WHEN 2 THEN 50000 WHEN 3 THEN 40000 WHEN 4 THEN 150000 WHEN 5 THEN 30000 WHEN 6 THEN 50000 WHEN 7 THEN 80000 WHEN 8 THEN 30000 END END;
        v_price_max := CASE v_tier WHEN 1 THEN CASE v_cat_idx WHEN 1 THEN 15000 WHEN 2 THEN 12000 WHEN 3 THEN 10000 WHEN 4 THEN 40000 WHEN 5 THEN 8000 WHEN 6 THEN 12000 WHEN 7 THEN 20000 WHEN 8 THEN 8000 END WHEN 2 THEN CASE v_cat_idx WHEN 1 THEN 30000 WHEN 2 THEN 25000 WHEN 3 THEN 20000 WHEN 4 THEN 80000 WHEN 5 THEN 15000 WHEN 6 THEN 25000 WHEN 7 THEN 40000 WHEN 8 THEN 15000 END WHEN 3 THEN CASE v_cat_idx WHEN 1 THEN 60000 WHEN 2 THEN 50000 WHEN 3 THEN 40000 WHEN 4 THEN 150000 WHEN 5 THEN 30000 WHEN 6 THEN 50000 WHEN 7 THEN 80000 WHEN 8 THEN 30000 END WHEN 4 THEN CASE v_cat_idx WHEN 1 THEN 120000 WHEN 2 THEN 100000 WHEN 3 THEN 80000 WHEN 4 THEN 300000 WHEN 5 THEN 60000 WHEN 6 THEN 100000 WHEN 7 THEN 160000 WHEN 8 THEN 60000 END END;

        FOR v_p IN 0..2 LOOP
          v_p_type := ((v_city_idx * 100 + v_cat_idx * 10 + v_tier_idx + v_p) % array_length(v_p_suffixes, 1)) + 1;
          v_p_suffix := v_p_suffixes[v_p_type];
          v_bio := v_p_bios[v_p_type];
          v_provider_id := gen_random_uuid();
          v_provider_name := v_city_name || ' ' || v_p_suffix || ' ' || (v_p + 1);

          v_seed := (v_seed * 9301 + 49297) % 233280;
          v_rand := v_seed::double precision / 233280.0;
          v_rating := round((3.5 + v_rand * 1.5)::numeric, 1);
          v_seed := (v_seed * 9301 + 49297) % 233280;
          v_rand := v_seed::double precision / 233280.0;
          v_reviews := floor(v_rand * 438 + 12)::int;
          v_seed := (v_seed * 9301 + 49297) % 233280;
          v_rand := v_seed::double precision / 233280.0;
          v_resp_time := round((1 + v_rand * 12)::numeric, 1);
          v_seed := (v_seed * 9301 + 49297) % 233280;
          v_rand := v_seed::double precision / 233280.0;
          v_resp_rate := round((85 + v_rand * 14)::numeric, 1);
          v_seed := (v_seed * 9301 + 49297) % 233280;
          v_rand := v_seed::double precision / 233280.0;
          v_lang_idx := floor(v_rand * 7 + 1)::int;

          INSERT INTO provider_org (id, country_code, region_id, legal_name, display_name, category, service_tier, verification_state, languages, bio, response_time_hours, response_rate_pct, review_count, avg_rating, status)
          VALUES (v_provider_id, 'MA', v_city_id::uuid, v_provider_name || ' SARL', v_provider_name, v_category, v_tier, 'verified', CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END, v_bio, v_resp_time, v_resp_rate, v_reviews, v_rating, 'active')
          ON CONFLICT (id) DO NOTHING;
          v_provider_count := v_provider_count + 1;

          v_seed := (v_seed * 9301 + 49297) % 233280;
          v_rand := v_seed::double precision / 233280.0;
          v_num_listings := floor(v_rand * 3 + 2)::int;
          v_used_titles := ARRAY[]::text[];

          FOR v_l IN 0..v_num_listings - 1 LOOP
            v_listing_id := gen_random_uuid();

            v_title := v_city_name || ' ' || v_title_arr[((v_l + v_p * 3) % array_length(v_title_arr, 1)) + 1];
            IF v_title = ANY(v_used_titles) THEN
              v_title := v_title || ' — ' || v_tier_name;
            END IF;
            IF v_title = ANY(v_used_titles) THEN
              v_title := v_title || ' (' || (v_p + 1) || ')';
            END IF;
            v_used_titles := array_append(v_used_titles, v_title);

            v_seed := (v_seed * 9301 + 49297) % 233280;
            v_rand := v_seed::double precision / 233280.0;
            v_template_idx := floor(v_rand * 5 + 1)::int;
            v_seed := (v_seed * 9301 + 49297) % 233280;
            v_rand := v_seed::double precision / 233280.0;
            v_unique_phrase := v_unique_phrases[floor(v_rand * 14 + 1)::int];
            v_seed := (v_seed * 9301 + 49297) % 233280;
            v_rand := v_seed::double precision / 233280.0;
            v_audience := v_audiences[floor(v_rand * 9 + 1)::int];
            v_seed := (v_seed * 9301 + 49297) % 233280;
            v_rand := v_seed::double precision / 233280.0;
            v_inclusion := v_inclusions[floor(v_rand * 9 + 1)::int];

            v_description := CASE v_template_idx
              WHEN 1 THEN 'Discover the authentic side of ' || v_city_name || ' with our ' || lower(v_tier_name) || ' experience. ' || v_unique_phrase || '. Perfect for ' || v_audience || '.'
              WHEN 2 THEN 'Join us for an unforgettable ' || lower(v_tier_name) || ' adventure in ' || v_city_name || '. ' || v_unique_phrase || '. Our expert guides ensure a memorable journey.'
              WHEN 3 THEN 'Experience ' || v_city_name || ' like a local with this ' || lower(v_tier_name) || ' offering. ' || v_unique_phrase || '. Includes ' || v_inclusion || '.'
              WHEN 4 THEN 'Immerse yourself in Moroccan culture with our ' || lower(v_tier_name) || ' ' || replace(v_category, '_', ' ') || ' experience in ' || v_city_name || '. ' || v_unique_phrase || '.'
              WHEN 5 THEN 'A carefully curated ' || lower(v_tier_name) || ' experience showcasing the best of ' || v_city_name || '. ' || v_unique_phrase || '. Suitable for all skill levels.'
            END;

            v_seed := (v_seed * 9301 + 49297) % 233280;
            v_rand := v_seed::double precision / 233280.0;
            v_duration := v_dur_arr[floor(v_rand * array_length(v_dur_arr, 1) + 1)::int];
            v_seed := (v_seed * 9301 + 49297) % 233280;
            v_rand := v_seed::double precision / 233280.0;
            v_price := floor(v_rand * (v_price_max - v_price_min + 1) + v_price_min)::bigint;

            IF v_category IN ('activity', 'desert_experience') THEN
              v_seed := (v_seed * 9301 + 49297) % 233280;
              v_rand := v_seed::double precision / 233280.0;
              v_min_age := floor(v_rand * 6 + 6)::int;
              v_seed := (v_seed * 9301 + 49297) % 233280;
              v_rand := v_seed::double precision / 233280.0;
              v_difficulty := floor(v_rand * 3 + 1)::int;
            ELSE
              v_seed := (v_seed * 9301 + 49297) % 233280;
              v_rand := v_seed::double precision / 233280.0;
              v_min_age := floor(v_rand * 5 + 3)::int;
              v_seed := (v_seed * 9301 + 49297) % 233280;
              v_rand := v_seed::double precision / 233280.0;
              v_difficulty := floor(v_rand * 1 + 1)::int;
            END IF;

            v_seed := (v_seed * 9301 + 49297) % 233280;
            v_rand := v_seed::double precision / 233280.0;
            v_min_party := floor(v_rand * 1 + 1)::int;
            IF v_tier >= 3 THEN
              v_seed := (v_seed * 9301 + 49297) % 233280;
              v_rand := v_seed::double precision / 233280.0;
              v_max_party := floor(v_rand * 4 + 4)::int;
            ELSE
              v_seed := (v_seed * 9301 + 49297) % 233280;
              v_rand := v_seed::double precision / 233280.0;
              v_max_party := floor(v_rand * 8 + 8)::int;
            END IF;

            v_img_idx := (v_listing_count % array_length(v_img_arr, 1)) + 1;
            v_img_id := v_img_arr[v_img_idx];
            v_ext := CASE WHEN v_img_id = ANY(v_png_ids) THEN 'png' ELSE 'jpeg' END;
            v_img_url := 'https://images.pexels.com/photos/' || v_img_id || '/pexels-photo-' || v_img_id || '.' || v_ext || '?auto=compress&cs=tinysrgb&h=650&w=940';

            v_seed := (v_seed * 9301 + 49297) % 233280;
            v_rand := v_seed::double precision / 233280.0;
            v_lang_idx := floor(v_rand * 7 + 1)::int;

            INSERT INTO catalogue_listing (id, provider_org_id, country_code, region_id, category, title, description, languages, min_age, difficulty, accessibility, min_party, max_party, duration_minutes, service_tier, status, image_url)
            VALUES (v_listing_id, v_provider_id, 'MA', v_city_id::uuid, v_category, v_title, v_description, CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END, v_min_age, v_difficulty, jsonb_build_object('wheelchair', false, 'mobility_aid', v_tier >= 3, 'stamina_required', CASE WHEN v_difficulty >= 3 THEN 'high' ELSE 'low' END), v_min_party, v_max_party, v_duration, v_tier, 'published', v_img_url)
            ON CONFLICT (id) DO NOTHING;
            v_listing_count := v_listing_count + 1;

            v_price_id := gen_random_uuid();
            INSERT INTO catalogue_price_rule (id, listing_id, amount_minor, currency, pricing_unit, party_from, party_to)
            VALUES (v_price_id, v_listing_id, v_price, 'MAD', CASE WHEN v_category = 'stay' THEN 'per_night' ELSE 'per_person' END, v_min_party, v_max_party)
            ON CONFLICT (id) DO NOTHING;
            v_price_count := v_price_count + 1;
          END LOOP;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Done: % providers, % listings, % prices', v_provider_count, v_listing_count, v_price_count;
END;
$$;
