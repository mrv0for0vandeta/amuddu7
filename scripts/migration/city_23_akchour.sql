/*
# Generate region-appropriate marketplace experiences

Each city gets only categories that match its geography:
- Coastal cities get surfing, kitesurfing, boat trips (no desert experiences)
- Desert cities get camel trekking, sandboarding, 4x4 safaris (no surfing)
- Mountain cities get hiking, climbing, waterfall treks (no desert or surf)
- All cities get tours, guided experiences, stays, meals, and transfers

1. New Data: ~2,100 providers, ~7,400 listings, ~7,400 price rules
2. Security: No new tables, no policy changes. RLS already enabled.
*/

DO $$
DECLARE
  v_seed bigint := 42;
  v_rand double precision;
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
  v_img_url text;
  v_langs text[];
  v_bio text;
  v_p_suffix text;
  v_tier_name text;
  v_unique_phrase text;
  v_audience text;
  v_inclusion text;
  v_template_idx int;
  v_used_titles text[];
  v_lang_idx int;
  v_provider_name text;
  v_p_type int;

  v_city_id text;
  v_city_name text;
  v_city_tags text[];
  v_city_cats text[];
  v_category text;
  v_tier int;
  v_p int;
  v_l int;
  v_title_pool text[];
  v_price_min int;
  v_price_max int;
  v_cat_idx int;
  v_tag text;
  v_found boolean;
  v_provider_count int := 0;
  v_listing_count int := 0;
  v_price_count int := 0;
  v_img_id text;

  v_p_suffixes text[] := ARRAY['Tours','Adventures','Experiences','Guides','Travel','Concierge','Expeditions','Collective','Heritage','Studio','Academy','Retreat','Lodge','Riad','Transit','Chauffeur','Surf School','Diving Center','Charters','Balloon'];
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
  v_tier_names text[] := ARRAY['Budget','Standard','Premium','Luxury'];
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
  v_audiences text[] := ARRAY['families with children','couples seeking romance','solo travelers','photography enthusiasts','culture lovers','adventure seekers','first-time visitors','seasoned travelers','food lovers','history buffs'];
  v_inclusions text[] := ARRAY['hotel pickup and drop-off','a professional guide','all entrance fees','traditional mint tea and snacks','a souvenir photo','all necessary equipment','a local meal','travel insurance','bottled water','air-conditioned transport'];
BEGIN
-- === Akchour ===
  v_city_id := 'a0b0b0a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_city_name := 'Akchour';
  v_city_tags := ARRAY['mountain','nature','waterfall','hiking'];
  v_city_cats := ARRAY['tour','guided_experience','stay','meal','activity','transfer'];

  -- Akchour / tour
  v_category := 'tour';
  v_cat_idx := 1;
  v_title_pool := ARRAY['Mountain Village Tour','Nature & Valley Tour','Waterfall & Forest Tour','Sunset Viewpoints Tour','Hidden Corners Discovery Tour','Photography Walking Tour'];
  v_dur_arr := ARRAY[120,180,240,360,480];

  FOR v_tier IN 1..4 LOOP
    v_tier_name := v_tier_names[v_tier];
    v_price_min := CASE v_tier WHEN 1 THEN 8000 WHEN 2 THEN 15000 WHEN 3 THEN 30000 WHEN 4 THEN 60000 END;
    v_price_max := CASE v_tier WHEN 1 THEN 15000 WHEN 2 THEN 30000 WHEN 3 THEN 60000 WHEN 4 THEN 120000 END;
    FOR v_p IN 0..2 LOOP
      v_provider_id := gen_random_uuid();
      v_p_type := ((v_provider_count + v_p) % 20) + 1;
      v_p_suffix := v_p_suffixes[v_p_type];
      v_bio := v_p_bios[v_p_type];
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
      VALUES (v_provider_id, 'MA', v_city_id::uuid, v_provider_name || ' SARL', v_provider_name, v_category, v_tier, 'verified',
        CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
        v_bio, v_resp_time, v_resp_rate, v_reviews, v_rating, 'active')
      ON CONFLICT (id) DO NOTHING;
      v_provider_count := v_provider_count + 1;

      v_seed := (v_seed * 9301 + 49297) % 233280;
      v_rand := v_seed::double precision / 233280.0;
      v_num_listings := floor(v_rand * 3 + 2)::int;
      IF v_num_listings > array_length(v_title_pool, 1) THEN v_num_listings := array_length(v_title_pool, 1); END IF;
      v_used_titles := ARRAY[]::text[];

      FOR v_l IN 0..v_num_listings - 1 LOOP
        v_listing_id := gen_random_uuid();
        v_title := v_city_name || ' ' || v_title_pool[((v_l + v_p * 3) % array_length(v_title_pool, 1)) + 1];
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

        v_img_url := CASE WHEN v_title = 'Akchour Mountain Village Tour' THEN 'https://images.pexels.com/photos/37401857/pexels-photo-37401857.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Nature & Valley Tour' THEN 'https://images.pexels.com/photos/37672169/pexels-photo-37672169.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Waterfall & Forest Tour' THEN 'https://images.pexels.com/photos/38277704/pexels-photo-38277704.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Sunset Viewpoints Tour' THEN 'https://images.pexels.com/photos/6545522/pexels-photo-6545522.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Hidden Corners Discovery Tour' THEN 'https://images.pexels.com/photos/28582577/pexels-photo-28582577.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Photography Walking Tour' THEN 'https://images.pexels.com/photos/35097550/pexels-photo-35097550.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/38112390/pexels-photo-38112390.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

        v_seed := (v_seed * 9301 + 49297) % 233280;
        v_rand := v_seed::double precision / 233280.0;
        v_lang_idx := floor(v_rand * 7 + 1)::int;

        INSERT INTO catalogue_listing (id, provider_org_id, country_code, region_id, category, title, description, languages, min_age, difficulty, accessibility, min_party, max_party, duration_minutes, service_tier, status, image_url)
        VALUES (v_listing_id, v_provider_id, 'MA', v_city_id::uuid, v_category, v_title, v_description,
          CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
          v_min_age, v_difficulty, jsonb_build_object('wheelchair', false, 'mobility_aid', v_tier >= 3, 'stamina_required', CASE WHEN v_difficulty >= 3 THEN 'high' ELSE 'low' END),
          v_min_party, v_max_party, v_duration, v_tier, 'published', v_img_url)
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

  -- Akchour / guided_experience
  v_category := 'guided_experience';
  v_cat_idx := 2;
  v_title_pool := ARRAY['Guided Nature Experience','Local Village Immersion','Mountain Culture Walk','Hidden Gems Guided Tour','Neighborhood Discovery Walk'];
  v_dur_arr := ARRAY[90,120,180,240,360];

  FOR v_tier IN 1..4 LOOP
    v_tier_name := v_tier_names[v_tier];
    v_price_min := CASE v_tier WHEN 1 THEN 5000 WHEN 2 THEN 12000 WHEN 3 THEN 25000 WHEN 4 THEN 50000 END;
    v_price_max := CASE v_tier WHEN 1 THEN 12000 WHEN 2 THEN 25000 WHEN 3 THEN 50000 WHEN 4 THEN 100000 END;
    FOR v_p IN 0..2 LOOP
      v_provider_id := gen_random_uuid();
      v_p_type := ((v_provider_count + v_p) % 20) + 1;
      v_p_suffix := v_p_suffixes[v_p_type];
      v_bio := v_p_bios[v_p_type];
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
      VALUES (v_provider_id, 'MA', v_city_id::uuid, v_provider_name || ' SARL', v_provider_name, v_category, v_tier, 'verified',
        CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
        v_bio, v_resp_time, v_resp_rate, v_reviews, v_rating, 'active')
      ON CONFLICT (id) DO NOTHING;
      v_provider_count := v_provider_count + 1;

      v_seed := (v_seed * 9301 + 49297) % 233280;
      v_rand := v_seed::double precision / 233280.0;
      v_num_listings := floor(v_rand * 3 + 2)::int;
      IF v_num_listings > array_length(v_title_pool, 1) THEN v_num_listings := array_length(v_title_pool, 1); END IF;
      v_used_titles := ARRAY[]::text[];

      FOR v_l IN 0..v_num_listings - 1 LOOP
        v_listing_id := gen_random_uuid();
        v_title := v_city_name || ' ' || v_title_pool[((v_l + v_p * 3) % array_length(v_title_pool, 1)) + 1];
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

        v_img_url := CASE WHEN v_title = 'Akchour Guided Nature Experience' THEN 'https://images.pexels.com/photos/37401857/pexels-photo-37401857.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Local Village Immersion' THEN 'https://images.pexels.com/photos/37441809/pexels-photo-37441809.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Mountain Culture Walk' THEN 'https://images.pexels.com/photos/37672169/pexels-photo-37672169.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Hidden Gems Guided Tour' THEN 'https://images.pexels.com/photos/28582577/pexels-photo-28582577.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Neighborhood Discovery Walk' THEN 'https://images.pexels.com/photos/29595710/pexels-photo-29595710.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/38111988/pexels-photo-38111988.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

        v_seed := (v_seed * 9301 + 49297) % 233280;
        v_rand := v_seed::double precision / 233280.0;
        v_lang_idx := floor(v_rand * 7 + 1)::int;

        INSERT INTO catalogue_listing (id, provider_org_id, country_code, region_id, category, title, description, languages, min_age, difficulty, accessibility, min_party, max_party, duration_minutes, service_tier, status, image_url)
        VALUES (v_listing_id, v_provider_id, 'MA', v_city_id::uuid, v_category, v_title, v_description,
          CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
          v_min_age, v_difficulty, jsonb_build_object('wheelchair', false, 'mobility_aid', v_tier >= 3, 'stamina_required', CASE WHEN v_difficulty >= 3 THEN 'high' ELSE 'low' END),
          v_min_party, v_max_party, v_duration, v_tier, 'published', v_img_url)
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

  -- Akchour / stay
  v_category := 'stay';
  v_cat_idx := 3;
  v_title_pool := ARRAY['Mountain Lodge Stay','Nature Eco Lodge Stay','Traditional Guesthouse Stay','Forest Cabin Experience','Valley View Suite Stay'];
  v_dur_arr := ARRAY[1440,2880,4320];

  FOR v_tier IN 1..4 LOOP
    v_tier_name := v_tier_names[v_tier];
    v_price_min := CASE v_tier WHEN 1 THEN 20000 WHEN 2 THEN 40000 WHEN 3 THEN 80000 WHEN 4 THEN 150000 END;
    v_price_max := CASE v_tier WHEN 1 THEN 40000 WHEN 2 THEN 80000 WHEN 3 THEN 150000 WHEN 4 THEN 300000 END;
    FOR v_p IN 0..2 LOOP
      v_provider_id := gen_random_uuid();
      v_p_type := ((v_provider_count + v_p) % 20) + 1;
      v_p_suffix := v_p_suffixes[v_p_type];
      v_bio := v_p_bios[v_p_type];
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
      VALUES (v_provider_id, 'MA', v_city_id::uuid, v_provider_name || ' SARL', v_provider_name, v_category, v_tier, 'verified',
        CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
        v_bio, v_resp_time, v_resp_rate, v_reviews, v_rating, 'active')
      ON CONFLICT (id) DO NOTHING;
      v_provider_count := v_provider_count + 1;

      v_seed := (v_seed * 9301 + 49297) % 233280;
      v_rand := v_seed::double precision / 233280.0;
      v_num_listings := floor(v_rand * 3 + 2)::int;
      IF v_num_listings > array_length(v_title_pool, 1) THEN v_num_listings := array_length(v_title_pool, 1); END IF;
      v_used_titles := ARRAY[]::text[];

      FOR v_l IN 0..v_num_listings - 1 LOOP
        v_listing_id := gen_random_uuid();
        v_title := v_city_name || ' ' || v_title_pool[((v_l + v_p * 3) % array_length(v_title_pool, 1)) + 1];
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

        v_img_url := CASE WHEN v_title = 'Akchour Mountain Lodge Stay' THEN 'https://images.pexels.com/photos/37684072/pexels-photo-37684072.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Nature Eco Lodge Stay' THEN 'https://images.pexels.com/photos/7391720/pexels-photo-7391720.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Traditional Guesthouse Stay' THEN 'https://images.pexels.com/photos/15531322/pexels-photo-15531322.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Forest Cabin Experience' THEN 'https://images.pexels.com/photos/29761823/pexels-photo-29761823.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Valley View Suite Stay' THEN 'https://images.pexels.com/photos/37401857/pexels-photo-37401857.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/15531325/pexels-photo-15531325.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

        v_seed := (v_seed * 9301 + 49297) % 233280;
        v_rand := v_seed::double precision / 233280.0;
        v_lang_idx := floor(v_rand * 7 + 1)::int;

        INSERT INTO catalogue_listing (id, provider_org_id, country_code, region_id, category, title, description, languages, min_age, difficulty, accessibility, min_party, max_party, duration_minutes, service_tier, status, image_url)
        VALUES (v_listing_id, v_provider_id, 'MA', v_city_id::uuid, v_category, v_title, v_description,
          CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
          v_min_age, v_difficulty, jsonb_build_object('wheelchair', false, 'mobility_aid', v_tier >= 3, 'stamina_required', CASE WHEN v_difficulty >= 3 THEN 'high' ELSE 'low' END),
          v_min_party, v_max_party, v_duration, v_tier, 'published', v_img_url)
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

  -- Akchour / meal
  v_category := 'meal';
  v_cat_idx := 4;
  v_title_pool := ARRAY['Mountain Village Home Meal','Traditional Moroccan Dinner','Berber Tagine Tasting','Forest Picnic Experience','Tea Ceremony & Pastries'];
  v_dur_arr := ARRAY[60,90,120,150];

  FOR v_tier IN 1..4 LOOP
    v_tier_name := v_tier_names[v_tier];
    v_price_min := CASE v_tier WHEN 1 THEN 3000 WHEN 2 THEN 8000 WHEN 3 THEN 15000 WHEN 4 THEN 30000 END;
    v_price_max := CASE v_tier WHEN 1 THEN 8000 WHEN 2 THEN 15000 WHEN 3 THEN 30000 WHEN 4 THEN 60000 END;
    FOR v_p IN 0..2 LOOP
      v_provider_id := gen_random_uuid();
      v_p_type := ((v_provider_count + v_p) % 20) + 1;
      v_p_suffix := v_p_suffixes[v_p_type];
      v_bio := v_p_bios[v_p_type];
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
      VALUES (v_provider_id, 'MA', v_city_id::uuid, v_provider_name || ' SARL', v_provider_name, v_category, v_tier, 'verified',
        CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
        v_bio, v_resp_time, v_resp_rate, v_reviews, v_rating, 'active')
      ON CONFLICT (id) DO NOTHING;
      v_provider_count := v_provider_count + 1;

      v_seed := (v_seed * 9301 + 49297) % 233280;
      v_rand := v_seed::double precision / 233280.0;
      v_num_listings := floor(v_rand * 3 + 2)::int;
      IF v_num_listings > array_length(v_title_pool, 1) THEN v_num_listings := array_length(v_title_pool, 1); END IF;
      v_used_titles := ARRAY[]::text[];

      FOR v_l IN 0..v_num_listings - 1 LOOP
        v_listing_id := gen_random_uuid();
        v_title := v_city_name || ' ' || v_title_pool[((v_l + v_p * 3) % array_length(v_title_pool, 1)) + 1];
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

        v_img_url := CASE WHEN v_title = 'Akchour Mountain Village Home Meal' THEN 'https://images.pexels.com/photos/36799049/pexels-photo-36799049.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Traditional Moroccan Dinner' THEN 'https://images.pexels.com/photos/998244/pexels-photo-998244.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Berber Tagine Tasting' THEN 'https://images.pexels.com/photos/30068444/pexels-photo-30068444.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Forest Picnic Experience' THEN 'https://images.pexels.com/photos/2287524/pexels-photo-2287524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Tea Ceremony & Pastries' THEN 'https://images.pexels.com/photos/30906051/pexels-photo-30906051.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/998244/pexels-photo-998244.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

        v_seed := (v_seed * 9301 + 49297) % 233280;
        v_rand := v_seed::double precision / 233280.0;
        v_lang_idx := floor(v_rand * 7 + 1)::int;

        INSERT INTO catalogue_listing (id, provider_org_id, country_code, region_id, category, title, description, languages, min_age, difficulty, accessibility, min_party, max_party, duration_minutes, service_tier, status, image_url)
        VALUES (v_listing_id, v_provider_id, 'MA', v_city_id::uuid, v_category, v_title, v_description,
          CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
          v_min_age, v_difficulty, jsonb_build_object('wheelchair', false, 'mobility_aid', v_tier >= 3, 'stamina_required', CASE WHEN v_difficulty >= 3 THEN 'high' ELSE 'low' END),
          v_min_party, v_max_party, v_duration, v_tier, 'published', v_img_url)
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

  -- Akchour / activity
  v_category := 'activity';
  v_cat_idx := 5;
  v_title_pool := ARRAY['Hiking Trail Adventure','Rock Climbing Experience','Mountain Biking Tour','Nature Photography Walk','Bird Watching Tour'];
  v_dur_arr := ARRAY[60,90,120,180,240];

  FOR v_tier IN 1..4 LOOP
    v_tier_name := v_tier_names[v_tier];
    v_price_min := CASE v_tier WHEN 1 THEN 6000 WHEN 2 THEN 12000 WHEN 3 THEN 25000 WHEN 4 THEN 50000 END;
    v_price_max := CASE v_tier WHEN 1 THEN 12000 WHEN 2 THEN 25000 WHEN 3 THEN 50000 WHEN 4 THEN 100000 END;
    FOR v_p IN 0..2 LOOP
      v_provider_id := gen_random_uuid();
      v_p_type := ((v_provider_count + v_p) % 20) + 1;
      v_p_suffix := v_p_suffixes[v_p_type];
      v_bio := v_p_bios[v_p_type];
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
      VALUES (v_provider_id, 'MA', v_city_id::uuid, v_provider_name || ' SARL', v_provider_name, v_category, v_tier, 'verified',
        CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
        v_bio, v_resp_time, v_resp_rate, v_reviews, v_rating, 'active')
      ON CONFLICT (id) DO NOTHING;
      v_provider_count := v_provider_count + 1;

      v_seed := (v_seed * 9301 + 49297) % 233280;
      v_rand := v_seed::double precision / 233280.0;
      v_num_listings := floor(v_rand * 3 + 2)::int;
      IF v_num_listings > array_length(v_title_pool, 1) THEN v_num_listings := array_length(v_title_pool, 1); END IF;
      v_used_titles := ARRAY[]::text[];

      FOR v_l IN 0..v_num_listings - 1 LOOP
        v_listing_id := gen_random_uuid();
        v_title := v_city_name || ' ' || v_title_pool[((v_l + v_p * 3) % array_length(v_title_pool, 1)) + 1];
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

        v_img_url := CASE WHEN v_title = 'Akchour Hiking Trail Adventure' THEN 'https://images.pexels.com/photos/1129417/pexels-photo-1129417.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Rock Climbing Experience' THEN 'https://images.pexels.com/photos/33566015/pexels-photo-33566015.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Mountain Biking Tour' THEN 'https://images.pexels.com/photos/13358011/pexels-photo-13358011.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Nature Photography Walk' THEN 'https://images.pexels.com/photos/37401857/pexels-photo-37401857.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Bird Watching Tour' THEN 'https://images.pexels.com/photos/9155374/pexels-photo-9155374.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/37401857/pexels-photo-37401857.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

        v_seed := (v_seed * 9301 + 49297) % 233280;
        v_rand := v_seed::double precision / 233280.0;
        v_lang_idx := floor(v_rand * 7 + 1)::int;

        INSERT INTO catalogue_listing (id, provider_org_id, country_code, region_id, category, title, description, languages, min_age, difficulty, accessibility, min_party, max_party, duration_minutes, service_tier, status, image_url)
        VALUES (v_listing_id, v_provider_id, 'MA', v_city_id::uuid, v_category, v_title, v_description,
          CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
          v_min_age, v_difficulty, jsonb_build_object('wheelchair', false, 'mobility_aid', v_tier >= 3, 'stamina_required', CASE WHEN v_difficulty >= 3 THEN 'high' ELSE 'low' END),
          v_min_party, v_max_party, v_duration, v_tier, 'published', v_img_url)
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

  -- Akchour / transfer
  v_category := 'transfer';
  v_cat_idx := 6;
  v_title_pool := ARRAY['Airport Private Transfer','City-to-City Private Driver','Luxury Chauffeur Service','Train Station Transfer','Group Shuttle Service','Hotel-to-Attraction Transfer','Scenic Route Transfer','Multi-Stop Transfer Service','Night Transfer Service','Family Transfer with Car Seats'];
  v_dur_arr := ARRAY[30,45,60,90,120];

  FOR v_tier IN 1..4 LOOP
    v_tier_name := v_tier_names[v_tier];
    v_price_min := CASE v_tier WHEN 1 THEN 3000 WHEN 2 THEN 8000 WHEN 3 THEN 15000 WHEN 4 THEN 30000 END;
    v_price_max := CASE v_tier WHEN 1 THEN 8000 WHEN 2 THEN 15000 WHEN 3 THEN 30000 WHEN 4 THEN 60000 END;
    FOR v_p IN 0..2 LOOP
      v_provider_id := gen_random_uuid();
      v_p_type := ((v_provider_count + v_p) % 20) + 1;
      v_p_suffix := v_p_suffixes[v_p_type];
      v_bio := v_p_bios[v_p_type];
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
      VALUES (v_provider_id, 'MA', v_city_id::uuid, v_provider_name || ' SARL', v_provider_name, v_category, v_tier, 'verified',
        CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
        v_bio, v_resp_time, v_resp_rate, v_reviews, v_rating, 'active')
      ON CONFLICT (id) DO NOTHING;
      v_provider_count := v_provider_count + 1;

      v_seed := (v_seed * 9301 + 49297) % 233280;
      v_rand := v_seed::double precision / 233280.0;
      v_num_listings := floor(v_rand * 3 + 2)::int;
      IF v_num_listings > array_length(v_title_pool, 1) THEN v_num_listings := array_length(v_title_pool, 1); END IF;
      v_used_titles := ARRAY[]::text[];

      FOR v_l IN 0..v_num_listings - 1 LOOP
        v_listing_id := gen_random_uuid();
        v_title := v_city_name || ' ' || v_title_pool[((v_l + v_p * 3) % array_length(v_title_pool, 1)) + 1];
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

        v_img_url := CASE WHEN v_title = 'Akchour Airport Private Transfer' THEN 'https://images.pexels.com/photos/241190/pexels-photo-241190.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour City-to-City Private Driver' THEN 'https://images.pexels.com/photos/11877391/pexels-photo-11877391.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Luxury Chauffeur Service' THEN 'https://images.pexels.com/photos/11877391/pexels-photo-11877391.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Train Station Transfer' THEN 'https://images.pexels.com/photos/10133480/pexels-photo-10133480.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Group Shuttle Service' THEN 'https://images.pexels.com/photos/27987052/pexels-photo-27987052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Hotel-to-Attraction Transfer' THEN 'https://images.pexels.com/photos/6621125/pexels-photo-6621125.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Scenic Route Transfer' THEN 'https://images.pexels.com/photos/37401857/pexels-photo-37401857.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Multi-Stop Transfer Service' THEN 'https://images.pexels.com/photos/15360686/pexels-photo-15360686.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Night Transfer Service' THEN 'https://images.pexels.com/photos/19068524/pexels-photo-19068524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Akchour Family Transfer with Car Seats' THEN 'https://images.pexels.com/photos/14719525/pexels-photo-14719525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/19068524/pexels-photo-19068524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

        v_seed := (v_seed * 9301 + 49297) % 233280;
        v_rand := v_seed::double precision / 233280.0;
        v_lang_idx := floor(v_rand * 7 + 1)::int;

        INSERT INTO catalogue_listing (id, provider_org_id, country_code, region_id, category, title, description, languages, min_age, difficulty, accessibility, min_party, max_party, duration_minutes, service_tier, status, image_url)
        VALUES (v_listing_id, v_provider_id, 'MA', v_city_id::uuid, v_category, v_title, v_description,
          CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
          v_min_age, v_difficulty, jsonb_build_object('wheelchair', false, 'mobility_aid', v_tier >= 3, 'stamina_required', CASE WHEN v_difficulty >= 3 THEN 'high' ELSE 'low' END),
          v_min_party, v_max_party, v_duration, v_tier, 'published', v_img_url)
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

  
  RAISE NOTICE 'Done';
END;
$$;
