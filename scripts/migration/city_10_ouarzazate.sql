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
-- === Ouarzazate ===
  v_city_id := 'a00d00d0-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_city_name := 'Ouarzazate';
  v_city_tags := ARRAY['desert','kasbah','film','historic'];
  v_city_cats := ARRAY['tour','guided_experience','workshop','stay','meal','desert_experience','transfer'];

  -- Ouarzazate / tour
  v_category := 'tour';
  v_cat_idx := 1;
  v_title_pool := ARRAY['Desert Landscape Tour','Kasbah Discovery Tour','Oasis & Palm Grove Tour','Sunset Dunes Tour','Old City Discovery Tour','Architecture & Heritage Tour'];
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

        v_img_url := CASE WHEN v_title = 'Ouarzazate Desert Landscape Tour' THEN 'https://images.pexels.com/photos/29107888/pexels-photo-29107888.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Kasbah Discovery Tour' THEN 'https://images.pexels.com/photos/30447650/pexels-photo-30447650.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Oasis & Palm Grove Tour' THEN 'https://images.pexels.com/photos/30320620/pexels-photo-30320620.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Sunset Dunes Tour' THEN 'https://images.pexels.com/photos/998635/pexels-photo-998635.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Old City Discovery Tour' THEN 'https://images.pexels.com/photos/38111988/pexels-photo-38111988.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Architecture & Heritage Tour' THEN 'https://images.pexels.com/photos/19615125/pexels-photo-19615125.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/38112390/pexels-photo-38112390.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

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

  -- Ouarzazate / guided_experience
  v_category := 'guided_experience';
  v_cat_idx := 2;
  v_title_pool := ARRAY['Guided Oasis Experience','Berber Culture Immersion','Desert Life Discovery','Hidden Gems Guided Tour','Nomad Heritage Walk'];
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

        v_img_url := CASE WHEN v_title = 'Ouarzazate Guided Oasis Experience' THEN 'https://images.pexels.com/photos/30320620/pexels-photo-30320620.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Berber Culture Immersion' THEN 'https://images.pexels.com/photos/37441809/pexels-photo-37441809.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Desert Life Discovery' THEN 'https://images.pexels.com/photos/12536402/pexels-photo-12536402.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Hidden Gems Guided Tour' THEN 'https://images.pexels.com/photos/28582577/pexels-photo-28582577.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Nomad Heritage Walk' THEN 'https://images.pexels.com/photos/35696748/pexels-photo-35696748.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/38111988/pexels-photo-38111988.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

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

  -- Ouarzazate / workshop
  v_category := 'workshop';
  v_cat_idx := 3;
  v_title_pool := ARRAY['Cooking Class with Local Chef','Pottery Making Workshop','Leather Craft Workshop','Carpet Weaving Workshop','Tile & Mosaic Workshop','Calligraphy Art Workshop'];
  v_dur_arr := ARRAY[60,90,120,180];

  FOR v_tier IN 1..4 LOOP
    v_tier_name := v_tier_names[v_tier];
    v_price_min := CASE v_tier WHEN 1 THEN 4000 WHEN 2 THEN 10000 WHEN 3 THEN 20000 WHEN 4 THEN 40000 END;
    v_price_max := CASE v_tier WHEN 1 THEN 10000 WHEN 2 THEN 20000 WHEN 3 THEN 40000 WHEN 4 THEN 80000 END;
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

        v_img_url := CASE WHEN v_title = 'Ouarzazate Cooking Class with Local Chef' THEN 'https://images.pexels.com/photos/2287528/pexels-photo-2287528.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Pottery Making Workshop' THEN 'https://images.pexels.com/photos/32422996/pexels-photo-32422996.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Leather Craft Workshop' THEN 'https://images.pexels.com/photos/38112371/pexels-photo-38112371.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Carpet Weaving Workshop' THEN 'https://images.pexels.com/photos/32160896/pexels-photo-32160896.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Tile & Mosaic Workshop' THEN 'https://images.pexels.com/photos/34296099/pexels-photo-34296099.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Calligraphy Art Workshop' THEN 'https://images.pexels.com/photos/36792023/pexels-photo-36792023.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/32422996/pexels-photo-32422996.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

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

  -- Ouarzazate / stay
  v_category := 'stay';
  v_cat_idx := 4;
  v_title_pool := ARRAY['Desert Kasbah Stay','Glamping Desert Stay','Luxury Desert Camp Stay','Oasis Guesthouse Stay','Traditional Riad Stay','Heritage House Stay'];
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

        v_img_url := CASE WHEN v_title = 'Ouarzazate Desert Kasbah Stay' THEN 'https://images.pexels.com/photos/30447650/pexels-photo-30447650.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Glamping Desert Stay' THEN 'https://images.pexels.com/photos/18671249/pexels-photo-18671249.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Luxury Desert Camp Stay' THEN 'https://images.pexels.com/photos/18671249/pexels-photo-18671249.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Oasis Guesthouse Stay' THEN 'https://images.pexels.com/photos/30320620/pexels-photo-30320620.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Traditional Riad Stay' THEN 'https://images.pexels.com/photos/15531325/pexels-photo-15531325.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Heritage House Stay' THEN 'https://images.pexels.com/photos/10573397/pexels-photo-10573397.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/15531325/pexels-photo-15531325.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

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

  -- Ouarzazate / meal
  v_category := 'meal';
  v_cat_idx := 5;
  v_title_pool := ARRAY['Desert Camp Dinner Under Stars','Traditional Moroccan Dinner','Berber Family Home Meal','Sunset Dinner with Dune Views','Tea Ceremony & Pastries','Couscous Friday Lunch'];
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

        v_img_url := CASE WHEN v_title = 'Ouarzazate Desert Camp Dinner Under Stars' THEN 'https://images.pexels.com/photos/18767559/pexels-photo-18767559.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Traditional Moroccan Dinner' THEN 'https://images.pexels.com/photos/998244/pexels-photo-998244.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Berber Family Home Meal' THEN 'https://images.pexels.com/photos/36799049/pexels-photo-36799049.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Sunset Dinner with Dune Views' THEN 'https://images.pexels.com/photos/998635/pexels-photo-998635.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Tea Ceremony & Pastries' THEN 'https://images.pexels.com/photos/30906051/pexels-photo-30906051.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Couscous Friday Lunch' THEN 'https://images.pexels.com/photos/36916123/pexels-photo-36916123.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/998244/pexels-photo-998244.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

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

  -- Ouarzazate / desert_experience
  v_category := 'desert_experience';
  v_cat_idx := 6;
  v_title_pool := ARRAY['Camel Trekking at Sunset','Overnight Desert Camp','Sandboarding Adventure','4x4 Desert Safari','Luxury Desert Camp Stay','Stargazing Desert Night','Desert Sunrise Camel Ride','Buggy Desert Tour','Nomad Village Visit','Desert Photography Expedition'];
  v_dur_arr := ARRAY[120,240,480,720,1440];

  FOR v_tier IN 1..4 LOOP
    v_tier_name := v_tier_names[v_tier];
    v_price_min := CASE v_tier WHEN 1 THEN 10000 WHEN 2 THEN 20000 WHEN 3 THEN 40000 WHEN 4 THEN 80000 END;
    v_price_max := CASE v_tier WHEN 1 THEN 20000 WHEN 2 THEN 40000 WHEN 3 THEN 80000 WHEN 4 THEN 160000 END;
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

        v_img_url := CASE WHEN v_title = 'Ouarzazate Camel Trekking at Sunset' THEN 'https://images.pexels.com/photos/8357638/pexels-photo-8357638.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Overnight Desert Camp' THEN 'https://images.pexels.com/photos/18671249/pexels-photo-18671249.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Sandboarding Adventure' THEN 'https://images.pexels.com/photos/10879388/pexels-photo-10879388.png?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate 4x4 Desert Safari' THEN 'https://images.pexels.com/photos/30330000/pexels-photo-30330000.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Luxury Desert Camp Stay' THEN 'https://images.pexels.com/photos/18671249/pexels-photo-18671249.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Stargazing Desert Night' THEN 'https://images.pexels.com/photos/35548672/pexels-photo-35548672.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Desert Sunrise Camel Ride' THEN 'https://images.pexels.com/photos/35666734/pexels-photo-35666734.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Buggy Desert Tour' THEN 'https://images.pexels.com/photos/4480822/pexels-photo-4480822.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Nomad Village Visit' THEN 'https://images.pexels.com/photos/12536402/pexels-photo-12536402.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Desert Photography Expedition' THEN 'https://images.pexels.com/photos/29107888/pexels-photo-29107888.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/8357638/pexels-photo-8357638.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

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

  -- Ouarzazate / transfer
  v_category := 'transfer';
  v_cat_idx := 7;
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

        v_img_url := CASE WHEN v_title = 'Ouarzazate Airport Private Transfer' THEN 'https://images.pexels.com/photos/241190/pexels-photo-241190.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate City-to-City Private Driver' THEN 'https://images.pexels.com/photos/11877391/pexels-photo-11877391.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Luxury Chauffeur Service' THEN 'https://images.pexels.com/photos/11877391/pexels-photo-11877391.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Train Station Transfer' THEN 'https://images.pexels.com/photos/10133480/pexels-photo-10133480.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Group Shuttle Service' THEN 'https://images.pexels.com/photos/27987052/pexels-photo-27987052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Hotel-to-Attraction Transfer' THEN 'https://images.pexels.com/photos/6621125/pexels-photo-6621125.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Scenic Route Transfer' THEN 'https://images.pexels.com/photos/37401857/pexels-photo-37401857.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Multi-Stop Transfer Service' THEN 'https://images.pexels.com/photos/15360686/pexels-photo-15360686.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Night Transfer Service' THEN 'https://images.pexels.com/photos/19068524/pexels-photo-19068524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' WHEN v_title = 'Ouarzazate Family Transfer with Car Seats' THEN 'https://images.pexels.com/photos/14719525/pexels-photo-14719525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' ELSE 'https://images.pexels.com/photos/19068524/pexels-photo-19068524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' END;

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
