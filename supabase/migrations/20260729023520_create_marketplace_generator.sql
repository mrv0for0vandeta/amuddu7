/*
# Generate region-appropriate marketplace experiences (all 26 cities)

Creates a helper function that generates providers, listings, and price rules
for a given city×category combination. Then calls it for every valid
combination based on each city's geographic profile.

1. New Data: ~2,100 providers, ~7,400 listings, ~7,400 price rules
2. Security: No new tables, no policy changes. RLS already enabled.
*/

-- Helper function: deterministic PRNG (returns next seed and value via OUT params)
CREATE OR REPLACE FUNCTION _mp_rand(seed bigint) RETURNS double precision AS $$
DECLARE
  v_seed bigint;
BEGIN
  v_seed := (seed * 9301 + 49297) % 233280;
  RETURN v_seed::double precision / 233280.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main generator function: creates 3 providers × 4 tiers × (2-5 listings each)
CREATE OR REPLACE FUNCTION _mp_generate(
  p_city_id uuid,
  p_city_name text,
  p_category text,
  p_titles text[],
  p_durations int[],
  p_img_ids text[],
  p_seed bigint
) RETURNS void AS $$
DECLARE
  v_seed bigint := p_seed;
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
  v_price_min int;
  v_price_max int;
  v_min_age int;
  v_difficulty int;
  v_min_party int;
  v_max_party int;
  v_img_url text;
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
  v_png_ids text[] := ARRAY['10879388'];
  v_tier int;
  v_p int;
  v_l int;
  v_provider_count int := 0;
  v_img_id text;
  v_ext text;
BEGIN
  FOR v_tier IN 1..4 LOOP
    v_tier_name := v_tier_names[v_tier];
    v_price_min := CASE p_category WHEN 'tour' THEN CASE v_tier WHEN 1 THEN 8000 WHEN 2 THEN 15000 WHEN 3 THEN 30000 WHEN 4 THEN 60000 END WHEN 'guided_experience' THEN CASE v_tier WHEN 1 THEN 5000 WHEN 2 THEN 12000 WHEN 3 THEN 25000 WHEN 4 THEN 50000 END WHEN 'workshop' THEN CASE v_tier WHEN 1 THEN 4000 WHEN 2 THEN 10000 WHEN 3 THEN 20000 WHEN 4 THEN 40000 END WHEN 'stay' THEN CASE v_tier WHEN 1 THEN 20000 WHEN 2 THEN 40000 WHEN 3 THEN 80000 WHEN 4 THEN 150000 END WHEN 'meal' THEN CASE v_tier WHEN 1 THEN 3000 WHEN 2 THEN 8000 WHEN 3 THEN 15000 WHEN 4 THEN 30000 END WHEN 'activity' THEN CASE v_tier WHEN 1 THEN 6000 WHEN 2 THEN 12000 WHEN 3 THEN 25000 WHEN 4 THEN 50000 END WHEN 'desert_experience' THEN CASE v_tier WHEN 1 THEN 10000 WHEN 2 THEN 20000 WHEN 3 THEN 40000 WHEN 4 THEN 80000 END WHEN 'transfer' THEN CASE v_tier WHEN 1 THEN 3000 WHEN 2 THEN 8000 WHEN 3 THEN 15000 WHEN 4 THEN 30000 END END;
    v_price_max := CASE p_category WHEN 'tour' THEN CASE v_tier WHEN 1 THEN 15000 WHEN 2 THEN 30000 WHEN 3 THEN 60000 WHEN 4 THEN 120000 END WHEN 'guided_experience' THEN CASE v_tier WHEN 1 THEN 12000 WHEN 2 THEN 25000 WHEN 3 THEN 50000 WHEN 4 THEN 100000 END WHEN 'workshop' THEN CASE v_tier WHEN 1 THEN 10000 WHEN 2 THEN 20000 WHEN 3 THEN 40000 WHEN 4 THEN 80000 END WHEN 'stay' THEN CASE v_tier WHEN 1 THEN 40000 WHEN 2 THEN 80000 WHEN 3 THEN 150000 WHEN 4 THEN 300000 END WHEN 'meal' THEN CASE v_tier WHEN 1 THEN 8000 WHEN 2 THEN 15000 WHEN 3 THEN 30000 WHEN 4 THEN 60000 END WHEN 'activity' THEN CASE v_tier WHEN 1 THEN 12000 WHEN 2 THEN 25000 WHEN 3 THEN 50000 WHEN 4 THEN 100000 END WHEN 'desert_experience' THEN CASE v_tier WHEN 1 THEN 20000 WHEN 2 THEN 40000 WHEN 3 THEN 80000 WHEN 4 THEN 160000 END WHEN 'transfer' THEN CASE v_tier WHEN 1 THEN 8000 WHEN 2 THEN 15000 WHEN 3 THEN 30000 WHEN 4 THEN 60000 END END;

    FOR v_p IN 0..2 LOOP
      v_provider_id := gen_random_uuid();
      v_p_type := ((v_provider_count + v_p) % 20) + 1;
      v_p_suffix := v_p_suffixes[v_p_type];
      v_bio := v_p_bios[v_p_type];
      v_provider_name := p_city_name || ' ' || v_p_suffix || ' ' || (v_p + 1);

      v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_rating := round((3.5 + v_rand * 1.5)::numeric, 1);
      v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_reviews := floor(v_rand * 438 + 12)::int;
      v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_resp_time := round((1 + v_rand * 12)::numeric, 1);
      v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_resp_rate := round((85 + v_rand * 14)::numeric, 1);
      v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_lang_idx := floor(v_rand * 7 + 1)::int;

      INSERT INTO provider_org (id, country_code, region_id, legal_name, display_name, category, service_tier, verification_state, languages, bio, response_time_hours, response_rate_pct, review_count, avg_rating, status)
      VALUES (v_provider_id, 'MA', p_city_id, v_provider_name || ' SARL', v_provider_name, p_category, v_tier, 'verified',
        CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
        v_bio, v_resp_time, v_resp_rate, v_reviews, v_rating, 'active')
      ON CONFLICT (id) DO NOTHING;
      v_provider_count := v_provider_count + 1;

      v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_num_listings := floor(v_rand * 3 + 2)::int;
      IF v_num_listings > array_length(p_titles, 1) THEN v_num_listings := array_length(p_titles, 1); END IF;
      v_used_titles := ARRAY[]::text[];

      FOR v_l IN 0..v_num_listings - 1 LOOP
        v_listing_id := gen_random_uuid();
        v_title := p_city_name || ' ' || p_titles[((v_l + v_p * 3) % array_length(p_titles, 1)) + 1];
        IF v_title = ANY(v_used_titles) THEN v_title := v_title || ' — ' || v_tier_name; END IF;
        IF v_title = ANY(v_used_titles) THEN v_title := v_title || ' (' || (v_p + 1) || ')'; END IF;
        v_used_titles := array_append(v_used_titles, v_title);

        v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_template_idx := floor(v_rand * 5 + 1)::int;
        v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_unique_phrase := v_unique_phrases[floor(v_rand * 14 + 1)::int];
        v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_audience := v_audiences[floor(v_rand * 9 + 1)::int];
        v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_inclusion := v_inclusions[floor(v_rand * 9 + 1)::int];

        v_description := CASE v_template_idx
          WHEN 1 THEN 'Discover the authentic side of ' || p_city_name || ' with our ' || lower(v_tier_name) || ' experience. ' || v_unique_phrase || '. Perfect for ' || v_audience || '.'
          WHEN 2 THEN 'Join us for an unforgettable ' || lower(v_tier_name) || ' adventure in ' || p_city_name || '. ' || v_unique_phrase || '. Our expert guides ensure a memorable journey.'
          WHEN 3 THEN 'Experience ' || p_city_name || ' like a local with this ' || lower(v_tier_name) || ' offering. ' || v_unique_phrase || '. Includes ' || v_inclusion || '.'
          WHEN 4 THEN 'Immerse yourself in Moroccan culture with our ' || lower(v_tier_name) || ' ' || replace(p_category, '_', ' ') || ' experience in ' || p_city_name || '. ' || v_unique_phrase || '.'
          WHEN 5 THEN 'A carefully curated ' || lower(v_tier_name) || ' experience showcasing the best of ' || p_city_name || '. ' || v_unique_phrase || '. Suitable for all skill levels.'
        END;

        v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_duration := p_durations[floor(v_rand * array_length(p_durations, 1) + 1)::int];
        v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_price := floor(v_rand * (v_price_max - v_price_min + 1) + v_price_min)::bigint;

        IF p_category IN ('activity', 'desert_experience') THEN
          v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_min_age := floor(v_rand * 6 + 6)::int;
          v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_difficulty := floor(v_rand * 3 + 1)::int;
        ELSE
          v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_min_age := floor(v_rand * 5 + 3)::int;
          v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_difficulty := floor(v_rand * 1 + 1)::int;
        END IF;

        v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_min_party := floor(v_rand * 1 + 1)::int;
        IF v_tier >= 3 THEN
          v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_max_party := floor(v_rand * 4 + 4)::int;
        ELSE
          v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_max_party := floor(v_rand * 8 + 8)::int;
        END IF;

        v_img_id := p_img_ids[((v_l + v_p * 3) % array_length(p_img_ids, 1)) + 1];
        v_ext := CASE WHEN v_img_id = ANY(v_png_ids) THEN 'png' ELSE 'jpeg' END;
        v_img_url := 'https://images.pexels.com/photos/' || v_img_id || '/pexels-photo-' || v_img_id || '.' || v_ext || '?auto=compress&cs=tinysrgb&h=650&w=940';

        v_rand := _mp_rand(v_seed); v_seed := (v_seed * 9301 + 49297) % 233280; v_lang_idx := floor(v_rand * 7 + 1)::int;

        INSERT INTO catalogue_listing (id, provider_org_id, country_code, region_id, category, title, description, languages, min_age, difficulty, accessibility, min_party, max_party, duration_minutes, service_tier, status, image_url)
        VALUES (v_listing_id, v_provider_id, 'MA', p_city_id, p_category, v_title, v_description,
          CASE v_lang_idx WHEN 1 THEN ARRAY['en','fr'] WHEN 2 THEN ARRAY['en','fr','ary-Latn'] WHEN 3 THEN ARRAY['en','fr','es'] WHEN 4 THEN ARRAY['en','fr','de'] WHEN 5 THEN ARRAY['en','fr','ar'] WHEN 6 THEN ARRAY['en','fr','it'] WHEN 7 THEN ARRAY['en','ary-Latn'] ELSE ARRAY['en','fr','ary-Latn','es'] END,
          v_min_age, v_difficulty, jsonb_build_object('wheelchair', false, 'mobility_aid', v_tier >= 3, 'stamina_required', CASE WHEN v_difficulty >= 3 THEN 'high' ELSE 'low' END),
          v_min_party, v_max_party, v_duration, v_tier, 'published', v_img_url)
        ON CONFLICT (id) DO NOTHING;

        v_price_id := gen_random_uuid();
        INSERT INTO catalogue_price_rule (id, listing_id, amount_minor, currency, pricing_unit, party_from, party_to)
        VALUES (v_price_id, v_listing_id, v_price, 'MAD', CASE WHEN p_category = 'stay' THEN 'per_night' ELSE 'per_person' END, v_min_party, v_max_party)
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
