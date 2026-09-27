#!/usr/bin/env node
/**
 * Generate marketplace data v8:
 * - Genuinely distinct provider businesses (not tier copies)
 * - Each provider has its own name, bio, style, price range, group size, languages
 * - ONCF is the sole train operator; private providers offer station pickup/chauffeur only
 * - City-specific categories (desert cities get desert, coastal get surf, etc.)
 * - Each listing gets a UNIQUE image from the pool
 * - Each provider creates 1-3 listings with unique, specific titles
 */
import { writeFileSync, readFileSync } from 'fs';

const imagePool = JSON.parse(readFileSync('/tmp/cc-agent/69351405/project/scripts/migration/image_pool.json', 'utf-8'));
const allImages = imagePool.all;
const pngIds = new Set(imagePool.pngIds);

function imageUrl(id) {
  const ext = pngIds.has(String(id)) ? 'png' : 'jpeg';
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.${ext}?auto=compress&cs=tinysrgb&h=650&w=940`;
}

// Shuffle images for unique assignment
const shuffled = [...allImages];
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}
let imgIdx = 0;
function nextImage() {
  if (imgIdx >= shuffled.length) imgIdx = 0;
  return shuffled[imgIdx++];
}

// ─── Provider archetypes per category ───────────────────────────
// Each archetype is a DISTINCT business with its own identity.
// The tier emerges from the business style, not a flag.

const archetypes = {
  tour: [
    { name: '{city} Heritage Walks', bio: 'A family-run walking tour company founded in 2009. We specialize in intimate small-group tours of historic quarters, led by licensed local guides who grew up in these streets.', style: 'small_group', tier: 2, maxParty: 8, langs: ['en','fr','ary-Latn'], priceRange: [12000, 25000], duration: [120, 180, 240] },
    { name: 'Atlas Cultural Tours', bio: 'Mid-size cultural tour operator with air-conditioned minibuses and university-trained historians. We cover major landmarks with comfortable logistics.', style: 'comfortable', tier: 3, maxParty: 12, langs: ['en','fr','de'], priceRange: [25000, 50000], duration: [240, 360, 480] },
    { name: 'Royal Concierge {city}', bio: 'Private luxury touring service with Mercedes vans, art-historian guides, and exclusive access to private palaces and collections not open to the public.', style: 'private_luxury', tier: 4, maxParty: 6, langs: ['en','fr','es','it'], priceRange: [60000, 120000], duration: [240, 360, 480] },
  ],
  guided_experience: [
    { name: 'Local Eyes {city}', bio: 'A collective of young local guides who show you the real city — hidden cafes, street art, and neighborhoods the guidebooks miss. Pay-what-you-want ethos.', style: 'budget', tier: 1, maxParty: 10, langs: ['en','fr','ary-Latn'], priceRange: [5000, 12000], duration: [90, 120, 180] },
    { name: 'Insider Morocco', bio: 'Boutique guiding company pairing you with a dedicated guide for a personalized half-day or full-day experience. We adapt the route to your interests on the fly.', style: 'personal', tier: 3, maxParty: 6, langs: ['en','fr','ar'], priceRange: [25000, 50000], duration: [180, 240, 360] },
    { name: 'Kasbah Storytellers', bio: 'Cultural preservation association. Our guides are retired teachers and historians who share oral traditions, folklore, and stories passed down for generations.', style: 'cultural', tier: 2, maxParty: 8, langs: ['en','fr','ary-Latn'], priceRange: [12000, 22000], duration: [120, 180, 240] },
  ],
  workshop: [
    { name: 'Dar {city} Cooking School', bio: 'A traditional riad kitchen where a local family teaches you to prepare tagine, couscous, and pastries from scratch. Small classes, maximum 6 people.', style: 'family_kitchen', tier: 2, maxParty: 6, langs: ['en','fr','ary-Latn'], priceRange: [8000, 15000], duration: [120, 180] },
    { name: 'Maison des Artisans', bio: 'A cooperative workshop space where master artisans — potters, leatherworkers, zellige cutters — teach their craft in 2-hour hands-on sessions. Materials included.', style: 'cooperative', tier: 2, maxParty: 8, langs: ['en','fr','ar'], priceRange: [6000, 12000], duration: [90, 120, 180] },
    { name: 'Atelier Lumière', bio: 'A luxury creative studio offering private masterclasses with acclaimed Moroccan artists. Photography, calligraphy, and perfume-making in a beautifully restored medina house.', style: 'luxury_studio', tier: 4, maxParty: 4, langs: ['en','fr','es'], priceRange: [40000, 80000], duration: [120, 180, 240] },
  ],
  stay: [
    { name: 'Riad {city} Budget', bio: 'A clean, friendly guesthouse in the heart of the medina. Shared bathrooms, rooftop terrace, and free mint tea. Perfect for backpackers and solo travelers.', style: 'budget', tier: 1, maxParty: 4, langs: ['en','fr'], priceRange: [20000, 35000], duration: [1440, 2880] },
    { name: 'Dar {city} Boutique', bio: 'A beautifully restored 19th-century riad with 8 rooms, each uniquely decorated with antiques and local textiles. Plunge pool, hammam, and breakfast on the rooftop.', style: 'boutique', tier: 3, maxParty: 2, langs: ['en','fr','es'], priceRange: [60000, 120000], duration: [1440, 2880, 4320] },
    { name: 'Palais {city} Royal', bio: 'A former palace converted into an all-suite luxury hotel. Private butlers, Michelin-trained chef, spa, and curated excursions. The finest address in the city.', style: 'palace', tier: 4, maxParty: 4, langs: ['en','fr','it','de'], priceRange: [150000, 300000], duration: [1440, 2880, 4320] },
  ],
  meal: [
    { name: 'Street Food {city} Tours', bio: 'We take you through the best food stalls and hidden corners of the medina. 6+ tastings, from bissara to snail soup. Come hungry!', style: 'street', tier: 1, maxParty: 10, langs: ['en','fr','ary-Latn'], priceRange: [3000, 7000], duration: [90, 120] },
    { name: 'Table {city} Family Kitchen', bio: 'A Moroccan family welcomes you into their home for a traditional 3-course dinner. Couscous on Fridays, tagine every day. Recipes passed down four generations.', style: 'home_meal', tier: 2, maxParty: 6, langs: ['en','fr','ary-Latn'], priceRange: [8000, 15000], duration: [120, 150] },
    { name: 'Le Salon {city}', bio: 'Fine dining in an elegant riad setting. Modern Moroccan cuisine by a chef trained in Paris and Marrakech. Wine pairing available. Reservation required.', style: 'fine_dining', tier: 4, maxParty: 8, langs: ['en','fr'], priceRange: [30000, 60000], duration: [120, 150, 180] },
  ],
  activity: [
    { name: '{city} Adventure Club', bio: 'A local outdoor club offering hiking, cycling, and climbing for all levels. Certified guides, quality equipment, and a passion for sharing Morocco\'s natural beauty.', style: 'outdoor', tier: 2, maxParty: 12, langs: ['en','fr','ar'], priceRange: [8000, 18000], duration: [120, 180, 240, 360] },
    { name: 'Atlas Extreme Sports', bio: 'Adrenaline specialists — quad biking, sandboarding, paragliding, and canyoning. Professional instructors, top safety record, and GoPro footage included.', style: 'adventure', tier: 3, maxParty: 8, langs: ['en','fr','de'], priceRange: [18000, 40000], duration: [60, 120, 180, 240] },
    { name: 'Sahara Wellness Retreat', bio: 'A wellness sanctuary offering hammam, massage, yoga, and meditation sessions. Organic argan oil treatments and sound healing in a tranquil garden setting.', style: 'wellness', tier: 3, maxParty: 6, langs: ['en','fr'], priceRange: [12000, 35000], duration: [60, 90, 120] },
  ],
  desert_experience: [
    { name: 'Desert Nomad Tours', bio: 'A Berber family business running camel treks and overnight camps in the dunes since 2005. Basic but authentic — real nomad-style camps with woven tents and campfire music.', style: 'authentic', tier: 2, maxParty: 15, langs: ['en','fr','ary-Latn'], priceRange: [12000, 25000], duration: [120, 240, 720, 1440] },
    { name: 'Erg Luxury Expeditions', bio: 'Premium desert experiences with luxury glamping tents (real beds, en-suite bathrooms), gourmet dinners, and 4x4 Land Cruisers. Stargazing with a telescope included.', style: 'luxury', tier: 4, maxParty: 8, langs: ['en','fr','es','it'], priceRange: [50000, 120000], duration: [240, 720, 1440] },
    { name: 'Dune Riders {city}', bio: 'A young team of desert enthusiasts offering sandboarding, quad biking, and buggy tours. Half-day and full-day options. Includes picnic lunch and water.', style: 'adventure', tier: 2, maxParty: 10, langs: ['en','fr'], priceRange: [15000, 30000], duration: [120, 240, 360] },
  ],
  transfer: [
    { name: '{city} Shuttle Express', bio: 'Affordable shared shuttle service between the airport, train stations, and city hotels. Fixed schedules, comfortable minibuses, and friendly drivers.', style: 'shared', tier: 1, maxParty: 16, langs: ['en','fr'], priceRange: [3000, 8000], duration: [30, 45, 60, 90] },
    { name: 'Atlas Private Transfers', bio: 'Private door-to-door transfers with professional drivers and modern sedan cars. Flight tracking, meet-and-greet at the airport, and 24/7 availability.', style: 'private', tier: 3, maxParty: 4, langs: ['en','fr','ar'], priceRange: [12000, 30000], duration: [30, 45, 60, 90, 120] },
    { name: 'Royal Chauffeur Morocco', bio: 'Luxury chauffeur service with Mercedes E-Class and V-Class vehicles. Leather interiors, bottled water, phone chargers, and English-speaking drivers in suits.', style: 'luxury', tier: 4, maxParty: 7, langs: ['en','fr','es'], priceRange: [30000, 60000], duration: [45, 60, 90, 120] },
  ],
};

// ONCF — sole train operator
const oncfProvider = {
  name: 'ONCF — Office National des Chemins de Fer',
  bio: 'Morocco\'s national railway operator. High-speed Al Boraq trains connect Tangier to Casablanca via Rabat in under 3 hours. Conventional trains serve Casablanca, Rabat, Fès, Meknès, Marrakech, Tangier, and Oujda. Book at gare.oncf.ma or at any train station.',
  style: 'national_rail',
  tier: 2,
  maxParty: 50,
  langs: ['en','fr','ar'],
  priceRange: [5000, 15000],
  duration: [60, 90, 120, 180, 240, 300],
};

// Cities with ONCF train stations
const trainCities = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Meknès', 'Tangier', 'Ouarzazate', 'El Jadida', 'Tetouan'];

// City profiles: which categories make sense for each city type
const cityProfiles = JSON.parse(readFileSync('/tmp/cc-agent/69351405/project/scripts/migration/city_pools.json', 'utf-8'));

// City-specific category overrides
const cityCategories = {
  'Casablanca': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Rabat': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Marrakech': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'desert_experience', 'transfer'],
  'Fès': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Chefchaouen': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Essaouira': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Merzouga': ['tour', 'guided_experience', 'stay', 'meal', 'desert_experience', 'transfer'],
  'Dakhla': ['tour', 'guided_experience', 'stay', 'meal', 'activity', 'desert_experience', 'transfer'],
  'Ouzoud': ['tour', 'guided_experience', 'stay', 'meal', 'activity', 'transfer'],
  'Ifrane': ['tour', 'guided_experience', 'stay', 'meal', 'activity', 'transfer'],
  'Azrou': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Ouarzazate': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'desert_experience', 'transfer'],
  'Tangier': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Agadir': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Meknès': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'El Jadida': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Asilah': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Taroudant': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Ourika Valley': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
  'Aït Ben Haddou': ['tour', 'guided_experience', 'stay', 'meal', 'desert_experience', 'transfer'],
  'Tinghir': ['tour', 'guided_experience', 'stay', 'meal', 'activity', 'desert_experience', 'transfer'],
  'Dades Valley': ['tour', 'guided_experience', 'stay', 'meal', 'activity', 'desert_experience', 'transfer'],
  'Akchour': ['tour', 'guided_experience', 'stay', 'meal', 'activity', 'transfer'],
  'Al Hoceima': ['tour', 'guided_experience', 'stay', 'meal', 'activity', 'transfer'],
  'Nador': ['tour', 'guided_experience', 'stay', 'meal', 'activity', 'transfer'],
  'Tetouan': ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'transfer'],
};

const tierNames = { 1:'Budget', 2:'Standard', 3:'Premium', 4:'Luxury' };
const uniquePhrases = [
  'Visit lesser-known landmarks and meet local artisans','Explore ancient medina alleys most tourists never see','Enjoy exclusive access to private gardens and courtyards','Sample regional specialties at family-run establishments','Learn traditional techniques passed down through generations','Capture stunning views from secret vantage points','Connect with local families and hear their stories','Discover the blend of Berber, Arab, and Andalusian influences','Experience the rhythm of daily life in the old city','Wander through colorful markets filled with handcrafted goods','Marvel at intricate tilework and carved cedar ceilings','Savor spices and flavors unique to this region','Traverse landscapes that have inspired poets for centuries','Engage with master craftsmen in their workshops','Witness sunrise over breathtaking natural formations',
];
const audiences = ['families with children','couples seeking romance','solo travelers','photography enthusiasts','culture lovers','adventure seekers','first-time visitors','seasoned travelers','food lovers','history buffs'];
const inclusions = ['hotel pickup and drop-off','a professional guide','all entrance fees','traditional mint tea and snacks','a souvenir photo','all necessary equipment','a local meal','travel insurance','bottled water','air-conditioned transport'];
const langPacks = [['en','fr'],['en','fr','ary-Latn'],['en','fr','es'],['en','fr','de'],['en','fr','ar'],['en','fr','it'],['en','ary-Latn'],['en','fr','ary-Latn','es']];

let seed = 42;
function rng() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
function randInt(min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function esc(s) { return s.replace(/'/g, "''"); }

const providers = [];
const listings = [];
const prices = [];
let pSeq = 0, lSeq = 0;

let uuidCounter = 0;
function uuid() {
  uuidCounter++;
  // Use crypto.randomUUID for valid UUIDs
  return crypto.randomUUID();
}

for (const [cityName, city] of Object.entries(cityProfiles)) {
  const cats = cityCategories[cityName] || city.cats.map(c => c);

  for (const category of cats) {
    const pool = city.pools[category] || city.pools[Object.keys(city.pools).find(k => k.startsWith(category.slice(0,4)))] || [];
    if (!pool || pool.length === 0) continue;

    // Get 3 distinct provider archetypes for this category
    const archs = archetypes[category] || archetypes.tour;
    const numProviders = Math.min(archs.length, 3);

    for (let pi = 0; pi < numProviders; pi++) {
      const arch = archs[pi];
      pSeq++;
      const pId = uuid();
      const pName = arch.name.replace('{city}', cityName);
      const rating = parseFloat((3.5 + rng() * 1.5).toFixed(1));
      const reviews = randInt(12, 450);
      const respTime = parseFloat((0.5 + rng() * 11).toFixed(1));
      const respRate = parseFloat((88 + rng() * 11).toFixed(1));

      providers.push({
        id: pId, cityId: city.id, name: pName, category,
        tier: arch.tier, bio: arch.bio, langs: arch.langs,
        respTime, respRate, reviews, rating, maxParty: arch.maxParty,
      });

      // Each provider creates 1-3 listings with unique titles
      const numListings = Math.min(randInt(1, 3), pool.length);
      const usedIdx = new Set();

      for (let l = 0; l < numListings; l++) {
        lSeq++;
        const lId = uuid();

        // Pick unique title from pool
        let poolIdx, attempts = 0;
        do { poolIdx = Math.floor(rng() * pool.length); attempts++; }
        while (usedIdx.has(poolIdx) && attempts < 30);
        usedIdx.add(poolIdx);

        const [titleBase] = pool[poolIdx];
        const title = `${cityName} ${titleBase}`;

        const template = pick([
          'Discover the authentic side of {city} with {provider}. {unique}. Perfect for {audience}.',
          'Join {provider} for an unforgettable experience in {city}. {unique}. Includes {inclusion}.',
          'Experience {city} like a local with {provider}. {unique}.',
          'Immerse yourself in Moroccan culture with {provider}. {unique}.',
          'A carefully curated experience by {provider}, showcasing the best of {city}. {unique}.',
        ]);
        const description = template
          .replace('{city}', cityName).replace('{provider}', pName)
          .replace('{unique}', pick(uniquePhrases))
          .replace('{audience}', pick(audiences))
          .replace('{inclusion}', pick(inclusions));

        const duration = pick(arch.duration);
        const [minP, maxP] = arch.priceRange;
        const price = randInt(minP, maxP);
        const minAge = (category === 'activity' || category === 'desert_experience') ? randInt(6, 10) : randInt(3, 8);
        const difficulty = (category === 'activity' || category === 'desert_experience') ? randInt(1, 4) : randInt(1, 2);
        const minParty = randInt(1, 2);
        const imgUrl = imageUrl(nextImage());

        listings.push({
          id: lId, providerId: pId, cityId: city.id, category, title, description,
          langs: arch.langs, minAge, difficulty, minParty, maxParty: arch.maxParty,
          duration, tier: arch.tier, imgUrl,
        });

        prices.push({
          listingId: lId, amount: price,
          unit: category === 'stay' ? 'per_night' : 'per_person',
          partyFrom: minParty, partyTo: arch.maxParty,
        });
      }
    }
  }

  // Add ONCF train services for cities with train stations
  if (trainCities.includes(cityName)) {
    pSeq++;
    const oncfId = uuid();
    const oncfName = oncfProvider.name;
    const rating = 4.1;
    const reviews = randInt(800, 5000);

    providers.push({
      id: oncfId, cityId: city.id, name: oncfName, category: 'transfer',
      tier: oncfProvider.tier, bio: oncfProvider.bio, langs: oncfProvider.langs,
      respTime: 2.0, respRate: 98.0, reviews, rating, maxParty: oncfProvider.maxParty,
    });

    // ONCF train listing
    lSeq++;
    const trainId = uuid();
    const trainTitle = `ONCF Train Service from ${cityName}`;
    const trainDesc = `Official ONCF rail service departing from ${cityName} train station. High-speed Al Boraq available on the Tangier–Casablanca route. Conventional trains connect to major Moroccan cities. Book your ticket at the station or at gare.oncf.ma.`;

    listings.push({
      id: trainId, providerId: oncfId, cityId: city.id, category: 'transfer',
      title: trainTitle, description: trainDesc,
      langs: oncfProvider.langs, minAge: 0, difficulty: 1, minParty: 1,
      maxParty: oncfProvider.maxParty, duration: pick(oncfProvider.duration),
      tier: oncfProvider.tier, imgUrl: imageUrl(nextImage()),
    });

    prices.push({
      listingId: trainId, amount: randInt(oncfProvider.priceRange[0], oncfProvider.priceRange[1]),
      unit: 'per_person', partyFrom: 1, partyTo: oncfProvider.maxParty,
    });

    // Station pickup services by private providers (complementary to ONCF)
    for (const arch of archetypes.transfer.slice(0, 2)) {
      pSeq++;
      const spId = uuid();
      const spName = arch.name.replace('{city}', cityName) + ' — Station Pickup';

      providers.push({
        id: spId, cityId: city.id, name: spName, category: 'transfer',
        tier: arch.tier, bio: arch.bio + ' We also offer ONCF station pickup and drop-off services.',
        langs: arch.langs, respTime: 1.5, respRate: 94.0,
        reviews: randInt(20, 200), rating: parseFloat((3.8 + rng() * 1.0).toFixed(1)),
        maxParty: arch.maxParty,
      });

      lSeq++;
      const slId = uuid();
      listings.push({
        id: slId, providerId: spId, cityId: city.id, category: 'transfer',
        title: `${cityName} Train Station Pickup & Drop-off`,
        description: `Private ${arch.style === 'shared' ? 'shared shuttle' : 'chauffeur'} service to and from the ONCF train station in ${cityName}. Meet your driver at the station exit with a name sign. Flight and train tracking included.`,
        langs: arch.langs, minAge: 0, difficulty: 1, minParty: 1,
        maxParty: arch.maxParty, duration: pick([30, 45, 60]),
        tier: arch.tier, imgUrl: imageUrl(nextImage()),
      });

      prices.push({
        listingId: slId, amount: randInt(arch.priceRange[0], arch.priceRange[1]),
        unit: 'per_person', partyFrom: 1, partyTo: arch.maxParty,
      });
    }
  }
}

// Generate SQL
let sql = '/* Marketplace v8: distinct provider businesses, ONCF trains, unique images */\n\n';

for (let i = 0; i < providers.length; i += 50) {
  const batch = providers.slice(i, i + 50);
  sql += 'INSERT INTO provider_org (id, country_code, region_id, legal_name, display_name, category, service_tier, verification_state, languages, bio, response_time_hours, response_rate_pct, review_count, avg_rating, status) VALUES\n';
  sql += batch.map(p => `('${p.id}','MA','${p.cityId}','${esc(p.name + ' SARL')}','${esc(p.name)}','${p.category}',${p.tier},'verified',ARRAY[${p.langs.map(l => `'${l}'`).join(',')}],'${esc(p.bio)}',${p.respTime},${p.respRate},${p.reviews},${p.rating},'active')`).join(',\n');
  sql += '\nON CONFLICT (id) DO NOTHING;\n\n';
}

for (let i = 0; i < listings.length; i += 50) {
  const batch = listings.slice(i, i + 50);
  sql += 'INSERT INTO catalogue_listing (id, provider_org_id, country_code, region_id, category, title, description, languages, min_age, difficulty, accessibility, min_party, max_party, duration_minutes, service_tier, status, image_url) VALUES\n';
  sql += batch.map(l => `('${l.id}','${l.providerId}','MA','${l.cityId}','${l.category}','${esc(l.title)}','${esc(l.description)}',ARRAY[${l.langs.map(lang => `'${lang}'`).join(',')}],${l.minAge},${l.difficulty},jsonb_build_object('wheelchair',false,'mobility_aid',${l.tier >= 3},'stamina_required',${l.difficulty >= 3 ? "'high'" : "'low'"}),${l.minParty},${l.maxParty},${l.duration},${l.tier},'published','${l.imgUrl}')`).join(',\n');
  sql += '\nON CONFLICT (id) DO NOTHING;\n\n';
}

for (let i = 0; i < prices.length; i += 50) {
  const batch = prices.slice(i, i + 50);
  sql += 'INSERT INTO catalogue_price_rule (id, listing_id, amount_minor, currency, pricing_unit, party_from, party_to) VALUES\n';
  sql += batch.map(p => `(gen_random_uuid(),'${p.listingId}',${p.amount},'MAD','${p.unit}',${p.partyFrom},${p.partyTo})`).join(',\n');
  sql += '\nON CONFLICT (id) DO NOTHING;\n\n';
}

writeFileSync('/tmp/cc-agent/69351405/project/scripts/migration/marketplace_v8.sql', sql);
console.log(`Providers: ${providers.length}, Listings: ${listings.length}, Prices: ${prices.length}`);
console.log(`SQL: ${sql.length} bytes, Images used: ${imgIdx}`);
const cc = {};
for (const l of listings) {
  const c = Object.entries(cityProfiles).find(([, ci]) => ci.id === l.cityId)?.[0] || '?';
  cc[c] = (cc[c] || 0) + 1;
}
for (const [c, n] of Object.entries(cc).sort()) console.log(`  ${c}: ${n}`);
