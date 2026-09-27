/*
# Update listing images to match experience types

Replaces generic category-based images with specific, relevant photos
matching each listing's title keywords. Uses a CASE expression to
match title patterns to appropriate Pexels photos.

1. Updates: ~7,800 catalogue_listing.image_url values
2. Security: No schema changes, no policy changes.
*/

UPDATE catalogue_listing SET image_url = CASE
  -- Desert: camel trekking
  WHEN title ILIKE '%camel%' AND title ILIKE '%sunset%' THEN 'https://images.pexels.com/photos/8357638/pexels-photo-8357638.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%camel%' AND title ILIKE '%sunrise%' THEN 'https://images.pexels.com/photos/35666734/pexels-photo-35666734.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%camel%' THEN 'https://images.pexels.com/photos/33566021/pexels-photo-33566021.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Desert: overnight camp / glamping
  WHEN title ILIKE '%overnight%' OR title ILIKE '%camp%' OR title ILIKE '%glamping%' THEN 'https://images.pexels.com/photos/18671249/pexels-photo-18671249.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Desert: stargazing
  WHEN title ILIKE '%stargaz%' THEN 'https://images.pexels.com/photos/35548672/pexels-photo-35548672.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Desert: sandboarding
  WHEN title ILIKE '%sandboard%' THEN 'https://images.pexels.com/photos/10879388/pexels-photo-10879388.png?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Desert: 4x4 / safari
  WHEN title ILIKE '%4x4%' OR title ILIKE '%safari%' THEN 'https://images.pexels.com/photos/30330000/pexels-photo-30330000.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Desert: buggy
  WHEN title ILIKE '%buggy%' THEN 'https://images.pexels.com/photos/4480822/pexels-photo-4480822.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Desert: nomad village
  WHEN title ILIKE '%nomad%' THEN 'https://images.pexels.com/photos/12536402/pexels-photo-12536402.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Desert: photography expedition
  WHEN title ILIKE '%photography%' AND category = 'desert_experience' THEN 'https://images.pexels.com/photos/29107888/pexels-photo-29107888.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'

  -- Activities: surf
  WHEN title ILIKE '%surf%' AND title NOT ILIKE '%kitesurf%' THEN 'https://images.pexels.com/photos/36005570/pexels-photo-36005570.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Activities: kitesurf
  WHEN title ILIKE '%kitesurf%' THEN 'https://images.pexels.com/photos/30560213/pexels-photo-30560213.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Activities: horse riding
  WHEN title ILIKE '%horse%' THEN 'https://images.pexels.com/photos/11491900/pexels-photo-11491900.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Activities: quad biking
  WHEN title ILIKE '%quad%' THEN 'https://images.pexels.com/photos/28076410/pexels-photo-28076410.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Activities: hot air balloon
  WHEN title ILIKE '%balloon%' THEN 'https://images.pexels.com/photos/38540299/pexels-photo-38540299.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Activities: yoga / wellness
  WHEN title ILIKE '%yoga%' OR title ILIKE '%wellness%' THEN 'https://images.pexels.com/photos/36895635/pexels-photo-36895635.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Activities: hammam / spa
  WHEN title ILIKE '%hammam%' OR title ILIKE '%spa%' THEN 'https://images.pexels.com/photos/33279021/pexels-photo-33279021.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Activities: rock climbing
  WHEN title ILIKE '%climb%' THEN 'https://images.pexels.com/photos/33566015/pexels-photo-33566015.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Activities: cycling
  WHEN title ILIKE '%cycl%' THEN 'https://images.pexels.com/photos/13358011/pexels-photo-13358011.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Activities: boat trip / coastal cruise
  WHEN title ILIKE '%boat%' OR title ILIKE '%coastal%' THEN 'https://images.pexels.com/photos/29781323/pexels-photo-29781323.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'

  -- Workshops: pottery
  WHEN title ILIKE '%pottery%' THEN 'https://images.pexels.com/photos/32422996/pexels-photo-32422996.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Workshops: cooking class
  WHEN title ILIKE '%cooking%' OR title ILIKE '%cook class%' THEN 'https://images.pexels.com/photos/2287528/pexels-photo-2287528.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Workshops: leather craft
  WHEN title ILIKE '%leather%' THEN 'https://images.pexels.com/photos/38112371/pexels-photo-38112371.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Workshops: carpet weaving
  WHEN title ILIKE '%carpet%' OR title ILIKE '%weav%' THEN 'https://images.pexels.com/photos/32160896/pexels-photo-32160896.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Workshops: calligraphy
  WHEN title ILIKE '%calligraph%' THEN 'https://images.pexels.com/photos/36792023/pexels-photo-36792023.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Workshops: jewelry
  WHEN title ILIKE '%jewel%' THEN 'https://images.pexels.com/photos/30557505/pexels-photo-30557505.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Workshops: tile / mosaic
  WHEN title ILIKE '%tile%' OR title ILIKE '%mosaic%' THEN 'https://images.pexels.com/photos/34296099/pexels-photo-34296099.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Workshops: henna
  WHEN title ILIKE '%henna%' THEN 'https://images.pexels.com/photos/4727987/pexels-photo-4727987.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Workshops: bread baking
  WHEN title ILIKE '%bread%' OR title ILIKE '%baking%' THEN 'https://images.pexels.com/photos/5475052/pexels-photo-5475052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Workshops: spice blending
  WHEN title ILIKE '%spice%' THEN 'https://images.pexels.com/photos/31653073/pexels-photo-31653073.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'

  -- Meals: fine dining
  WHEN title ILIKE '%fine dining%' THEN 'https://images.pexels.com/photos/9143471/pexels-photo-9143471.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Meals: rooftop dining
  WHEN title ILIKE '%rooftop%' THEN 'https://images.pexels.com/photos/50630/pexels-photo-50630.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Meals: home cooked / family
  WHEN title ILIKE '%home%' OR title ILIKE '%family%' THEN 'https://images.pexels.com/photos/36799049/pexels-photo-36799049.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Meals: tea ceremony
  WHEN title ILIKE '%tea%' THEN 'https://images.pexels.com/photos/30906051/pexels-photo-30906051.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Meals: street food
  WHEN title ILIKE '%street food%' THEN 'https://images.pexels.com/photos/27999308/pexels-photo-27999308.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Meals: couscous
  WHEN title ILIKE '%couscous%' THEN 'https://images.pexels.com/photos/36916123/pexels-photo-36916123.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Meals: harira / tagine tasting
  WHEN title ILIKE '%harira%' OR title ILIKE '%tagine%' THEN 'https://images.pexels.com/photos/30068444/pexels-photo-30068444.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Meals: traditional dinner
  WHEN title ILIKE '%dinner%' OR title ILIKE '%moroccan meal%' THEN 'https://images.pexels.com/photos/998244/pexels-photo-998244.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Meals: farm to table
  WHEN title ILIKE '%farm%' THEN 'https://images.pexels.com/photos/2287524/pexels-photo-2287524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'

  -- Stays: riad
  WHEN title ILIKE '%riad%' THEN 'https://images.pexels.com/photos/15531325/pexels-photo-15531325.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Stays: guesthouse
  WHEN title ILIKE '%guesthouse%' THEN 'https://images.pexels.com/photos/15531322/pexels-photo-15531322.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Stays: luxury hotel
  WHEN title ILIKE '%luxury hotel%' THEN 'https://images.pexels.com/photos/34940612/pexels-photo-34940612.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Stays: eco lodge
  WHEN title ILIKE '%eco lodge%' THEN 'https://images.pexels.com/photos/7391720/pexels-photo-7391720.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Stays: kasbah
  WHEN title ILIKE '%kasbah%' THEN 'https://images.pexels.com/photos/30447650/pexels-photo-30447650.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Stays: heritage house
  WHEN title ILIKE '%heritage house%' THEN 'https://images.pexels.com/photos/10573397/pexels-photo-10573397.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Stays: rooftop suite
  WHEN title ILIKE '%rooftop suite%' THEN 'https://images.pexels.com/photos/34645081/pexels-photo-34645081.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Stays: garden riad
  WHEN title ILIKE '%garden%' THEN 'https://images.pexels.com/photos/18320915/pexels-photo-18320915.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'

  -- Tours: souk / market
  WHEN title ILIKE '%souk%' OR title ILIKE '%market%' THEN 'https://images.pexels.com/photos/22711555/pexels-photo-22711555.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Tours: sunset viewpoints
  WHEN title ILIKE '%sunset%' AND category = 'tour' THEN 'https://images.pexels.com/photos/6545522/pexels-photo-6545522.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Tours: photography walking
  WHEN title ILIKE '%photography%' AND category = 'tour' THEN 'https://images.pexels.com/photos/35097550/pexels-photo-35097550.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Tours: architecture & heritage
  WHEN title ILIKE '%architecture%' OR title ILIKE '%heritage%' THEN 'https://images.pexels.com/photos/19615125/pexels-photo-19615125.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Tours: medina walking
  WHEN title ILIKE '%medina%' AND title ILIKE '%walk%' THEN 'https://images.pexels.com/photos/14996117/pexels-photo-14996117.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Tours: historical
  WHEN title ILIKE '%historical%' OR title ILIKE '%old city%' THEN 'https://images.pexels.com/photos/18341651/pexels-photo-18341651.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Tours: cultural / half-day / full-day / hidden corners / discovery
  WHEN title ILIKE '%cultural%' OR title ILIKE '%half-day%' OR title ILIKE '%full-day%' OR title ILIKE '%hidden%' OR title ILIKE '%discovery%' THEN 'https://images.pexels.com/photos/6621125/pexels-photo-6621125.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'

  -- Guided experiences: storytelling / heritage walk
  WHEN title ILIKE '%storytelling%' OR title ILIKE '%heritage walk%' THEN 'https://images.pexels.com/photos/38112164/pexels-photo-38112164.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Guided: hidden gems
  WHEN title ILIKE '%hidden gems%' THEN 'https://images.pexels.com/photos/28582577/pexels-photo-28582577.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Guided: art & architecture
  WHEN title ILIKE '%art%' AND title ILIKE '%architecture%' THEN 'https://images.pexels.com/photos/30281036/pexels-photo-30281036.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Guided: spiritual / religious
  WHEN title ILIKE '%spiritual%' OR title ILIKE '%religious%' THEN 'https://images.pexels.com/photos/36549895/pexels-photo-36549895.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Guided: local life / immersion / insider / neighborhood
  WHEN title ILIKE '%local life%' OR title ILIKE '%immersion%' OR title ILIKE '%insider%' OR title ILIKE '%neighborhood%' THEN 'https://images.pexels.com/photos/29595710/pexels-photo-29595710.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Guided: medina experience
  WHEN title ILIKE '%medina%' THEN 'https://images.pexels.com/photos/38112390/pexels-photo-38112390.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Guided: historical walk
  WHEN title ILIKE '%historical%' AND title ILIKE '%walk%' THEN 'https://images.pexels.com/photos/38111988/pexels-photo-38111988.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Guided: cultural immersion day
  WHEN title ILIKE '%cultural%' THEN 'https://images.pexels.com/photos/15360686/pexels-photo-15360686.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'

  -- Transfers: airport
  WHEN title ILIKE '%airport%' THEN 'https://images.pexels.com/photos/241190/pexels-photo-241190.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Transfers: chauffeur / luxury
  WHEN title ILIKE '%chauffeur%' OR title ILIKE '%luxury%' THEN 'https://images.pexels.com/photos/11877391/pexels-photo-11877391.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Transfers: train station
  WHEN title ILIKE '%train%' THEN 'https://images.pexels.com/photos/10133480/pexels-photo-10133480.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Transfers: shuttle / group
  WHEN title ILIKE '%shuttle%' OR title ILIKE '%group%' THEN 'https://images.pexels.com/photos/27987052/pexels-photo-27987052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Transfers: scenic route
  WHEN title ILIKE '%scenic%' THEN 'https://images.pexels.com/photos/37401857/pexels-photo-37401857.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Transfers: night
  WHEN title ILIKE '%night%' THEN 'https://images.pexels.com/photos/19068524/pexels-photo-19068524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Transfers: family
  WHEN title ILIKE '%family%' THEN 'https://images.pexels.com/photos/14719525/pexels-photo-14719525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Transfers: multi-stop / hotel
  WHEN title ILIKE '%multi-stop%' OR title ILIKE '%hotel%' THEN 'https://images.pexels.com/photos/6621125/pexels-photo-6621125.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  -- Transfers: city-to-city / private driver
  WHEN title ILIKE '%city-to-city%' OR title ILIKE '%private driver%' THEN 'https://images.pexels.com/photos/15360686/pexels-photo-15360686.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'

  -- City-specific fallbacks
  WHEN title ILIKE '%chefchaouen%' THEN 'https://images.pexels.com/photos/13041621/pexels-photo-13041621.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%essaouira%' THEN 'https://images.pexels.com/photos/6662921/pexels-photo-6662921.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%ouzoud%' THEN 'https://images.pexels.com/photos/38277704/pexels-photo-38277704.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%dakhla%' THEN 'https://images.pexels.com/photos/30560213/pexels-photo-30560213.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%aït ben haddou%' OR title ILIKE '%ait ben%' THEN 'https://images.pexels.com/photos/5504504/pexels-photo-5504504.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%ouarzazate%' THEN 'https://images.pexels.com/photos/30447650/pexels-photo-30447650.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%merzouga%' THEN 'https://images.pexels.com/photos/29107888/pexels-photo-29107888.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%ourika%' THEN 'https://images.pexels.com/photos/37401857/pexels-photo-37401857.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%akchour%' THEN 'https://images.pexels.com/photos/1129417/pexels-photo-1129417.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%tinghir%' THEN 'https://images.pexels.com/photos/37441809/pexels-photo-37441809.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%dades%' THEN 'https://images.pexels.com/photos/37672169/pexels-photo-37672169.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%ifrane%' THEN 'https://images.pexels.com/photos/9155373/pexels-photo-9155373.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
  WHEN title ILIKE '%azrou%' THEN 'https://images.pexels.com/photos/26706382/pexels-photo-26706382.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'

  -- Default by category
  ELSE image_url
END
WHERE image_url IS NOT NULL;
