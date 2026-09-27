#!/usr/bin/env node
/**
 * Generate a compact PL/pgSQL migration that creates all data server-side.
 * Uses DO blocks with loops instead of individual INSERT statements.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(__dirname, 'migration'), { recursive: true });

// All data arrays
const cities = [
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
  ['a05050a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nador'],
];

const categories = ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'desert_experience', 'transfer'];
const tiers = [1, 2, 3, 4];

const providerSuffixes = ['Tours', 'Adventures', 'Experiences', 'Guides', 'Travel', 'Concierge', 'Expeditions', 'Collective', 'Heritage', 'Studio', 'Academy', 'Retreat', 'Lodge', 'Riad', 'Transit', 'Chauffeur', 'Surf School', 'Diving Center', 'Charters', 'Balloon'];
const providerBios = [
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
  'PADI-certified diving center exploring Morocco\'s underwater treasures.',
  'Yacht and boat charter company for coastal adventures.',
  'Hot air balloon company offering sunrise flights over Moroccan landscapes.',
];

const titleTemplates = {
  tour: ['Medina Walking Tour', 'Historical Highlights Tour', 'Half-Day Cultural Tour', 'Full-Day Guided City Tour', 'Hidden Corners Discovery Tour', 'Architecture & Heritage Tour', 'Photography Walking Tour', 'Sunset Viewpoints Tour', 'Souk & Market Tour', 'Old City Discovery Tour'],
  guided_experience: ['Guided Medina Experience', 'Local Life Immersion', 'Historical Guided Walk', 'Cultural Immersion Day', 'Insider Experience', 'Storytelling Heritage Walk', 'Hidden Gems Guided Tour', 'Art & Architecture Visit', 'Spiritual Sites Tour', 'Neighborhood Discovery Walk'],
  workshop: ['Pottery Making Workshop', 'Cooking Class with Local Chef', 'Leather Craft Workshop', 'Carpet Weaving Workshop', 'Calligraphy Art Workshop', 'Traditional Jewelry Workshop', 'Tile & Mosaic Workshop', 'Henna Art Workshop', 'Bread Baking Workshop', 'Spice Blending Workshop'],
  stay: ['Boutique Riad Stay', 'Traditional Guesthouse Stay', 'Luxury Hotel Experience', 'Eco Lodge Stay', 'Kasbah Stay Experience', 'Glamping Desert Stay', 'Heritage House Stay', 'Rooftop Suite Experience', 'Garden Riad Stay', 'Medina Guesthouse Stay'],
  meal: ['Traditional Moroccan Dinner', 'Rooftop Dining Experience', 'Home-Cooked Meal with Local Family', 'Fine Dining Experience', 'Tea Ceremony & Pastries', 'Street Food Tour', 'Farm-to-Table Dining', 'Sunset Dinner with Views', 'Couscous Friday Lunch', 'Harira & Tagine Tasting'],
  activity: ['Surf Lesson', 'Kitesurfing Course', 'Horse Riding Experience', 'Quad Biking Adventure', 'Hot Air Balloon Ride', 'Yoga & Wellness Session', 'Hammam & Spa Experience', 'Rock Climbing Adventure', 'Cycling Tour', 'Boat Trip & Coastal Cruise'],
  desert_experience: ['Camel Trekking at Sunset', 'Overnight Desert Camp', 'Sandboarding Adventure', '4x4 Desert Safari', 'Luxury Desert Camp Stay', 'Stargazing Desert Night', 'Desert Sunrise Camel Ride', 'Buggy Desert Tour', 'Nomad Village Visit', 'Desert Photography Expedition'],
  transfer: ['Airport Private Transfer', 'City-to-City Private Driver', 'Luxury Chauffeur Service', 'Train Station Transfer', 'Group Shuttle Service', 'Hotel-to-Attraction Transfer', 'Scenic Route Transfer', 'Multi-Stop Transfer Service', 'Night Transfer Service', 'Family Transfer with Car Seats'],
};

const descTemplates = [
  'Discover the authentic side of %s with our %s experience. %s. Perfect for %s.',
  'Join us for an unforgettable %s adventure in %s. %s. Our expert guides ensure a memorable journey.',
  'Experience %s like a local with this %s offering. %s. Includes %s.',
  'Immerse yourself in Moroccan culture with our %s %s experience in %s. %s.',
  'A carefully curated %s experience showcasing the best of %s. %s. Suitable for all skill levels.',
];

const uniquePhrases = [
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
  'Witness sunrise over breathtaking natural formations',
];

const audiences = ['families with children', 'couples seeking romance', 'solo travelers', 'photography enthusiasts', 'culture lovers', 'adventure seekers', 'first-time visitors', 'seasoned travelers', 'food lovers', 'history buffs'];
const inclusions = ['hotel pickup and drop-off', 'a professional guide', 'all entrance fees', 'traditional mint tea and snacks', 'a souvenir photo', 'all necessary equipment', 'a local meal', 'travel insurance', 'bottled water', 'air-conditioned transport'];

const imagesByCategory = {
  tour: ['38112390', '14996117', '38111988', '19068524', '6621125', '18341651', '28582577', '29595710', '14719525', '27987052', '38112351', '15360686', '38112164', '38112371', '38112326'],
  guided_experience: ['38112390', '38111988', '6621125', '18341651', '28582577', '29595710', '38112351', '15360686', '38112164', '38112326', '19068524', '14996117', '14719525', '27987052', '38112371'],
  workshop: ['32422996', '31092376', '34259434', '18373966', '29418319', '37364782', '33878971', '19867571', '34259423', '34004100', '34259436', '34461165', '33703946', '22823', '33633350'],
  stay: ['15531322', '15531325', '10573397', '9143446', '31356131', '18320915', '412050', '31356126', '34940612', '34672503', '7391720', '34645081', '18320907', '34672504', '34645131'],
  meal: ['2287528', '998244', '2291602', '36984667', '30068444', '2287524', '30068445', '37369301', '19162223', '2291603', '35201199', '35509025', '18496584', '2291596', '1618929'],
  activity: ['9387222', '35341806', '34566165', '11047666', '32793714', '13521242', '28976474', '4761859', '36005570', '13926150', '33674831', '18696593', '35342185', '30560213', '20070755'],
  desert_experience: ['8357638', '33566021', '35882702', '30757359', '31653067', '34329676', '12214734', '20852588', '8428013', '35666734', '26925634', '31497923', '28356797', '18742772', '998656'],
  transfer: ['19068524', '27987052', '14719525', '6621125', '15360686', '38112351', '29595710', '38112390', '18341651', '14996117', '38111988', '28582577', '38112371', '38112164', '38112326'],
};

// Some images are PNG, rest are JPEG
const pngIds = new Set(['31356131', '31356126']);
function imageUrl(id) {
  const ext = pngIds.has(id) ? 'png' : 'jpeg';
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.${ext}?auto=compress&cs=tinysrgb&h=650&w=940`;
}

const languagePool = [
  ['en', 'fr'], ['en', 'fr', 'ary-Latn'], ['en', 'fr', 'es'],
  ['en', 'fr', 'de'], ['en', 'fr', 'ar'], ['en', 'fr', 'it'],
  ['en', 'ary-Latn'], ['en', 'fr', 'ary-Latn', 'es'],
];

const durationRanges = {
  tour: [120, 180, 240, 360, 480],
  guided_experience: [90, 120, 180, 240, 360],
  workshop: [60, 90, 120, 180],
  stay: [1440, 2880, 4320],
  meal: [60, 90, 120, 150],
  activity: [60, 90, 120, 180, 240],
  desert_experience: [120, 240, 480, 720, 1440],
  transfer: [30, 45, 60, 90, 120],
};

const priceRanges = {
  1: { tour: [8000, 15000], guided_experience: [5000, 12000], workshop: [4000, 10000], stay: [20000, 40000], meal: [3000, 8000], activity: [6000, 12000], desert_experience: [10000, 20000], transfer: [3000, 8000] },
  2: { tour: [15000, 30000], guided_experience: [12000, 25000], workshop: [10000, 20000], stay: [40000, 80000], meal: [8000, 15000], activity: [12000, 25000], desert_experience: [20000, 40000], transfer: [8000, 15000] },
  3: { tour: [30000, 60000], guided_experience: [25000, 50000], workshop: [20000, 40000], stay: [80000, 150000], meal: [15000, 30000], activity: [25000, 50000], desert_experience: [40000, 80000], transfer: [15000, 30000] },
  4: { tour: [60000, 120000], guided_experience: [50000, 100000], workshop: [40000, 80000], stay: [150000, 300000], meal: [30000, 60000], activity: [50000, 100000], desert_experience: [80000, 160000], transfer: [30000, 60000] },
};

const tierNames = { 1: 'Budget', 2: 'Standard', 3: 'Premium', 4: 'Luxury' };

// PRNG
let seed = 42;
function rng() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
function randInt(min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }

// Generate all data as arrays
let providerSeq = 100, listingSeq = 1000, priceSeq = 10000;
function nextProviderId() { providerSeq++; const hex = providerSeq.toString(16).padStart(4, '0'); return `e${hex}0000-0000-0000-0000-000000000000`; }
function nextListingId() { listingSeq++; const hex = listingSeq.toString(16).padStart(6, '0'); return `f${hex}00-0000-0000-0000-000000000000`; }
function nextPriceId() { priceSeq++; const hex = priceSeq.toString(16).padStart(5, '0'); return `g${hex}000-0000-0000-0000-000000000000`; }

function esc(s) { return s.replace(/'/g, "''"); }

const providers = [];
const listings = [];
const prices = [];

for (const [cityId, cityName] of cities) {
  for (const category of categories) {
    for (const tier of tiers) {
      for (let p = 0; p < 3; p++) {
        const pTypeIdx = (providerSeq + p) % providerSuffixes.length;
        const providerName = `${cityName} ${providerSuffixes[pTypeIdx]} ${p + 1}`;
        const providerId = nextProviderId();
        const rating = parseFloat((3.5 + rng() * 1.5).toFixed(1));
        const reviews = randInt(12, 450);
        const responseTime = parseFloat((1 + rng() * 12).toFixed(1));
        const responseRate = parseFloat((85 + rng() * 14).toFixed(1));
        const langs = pick(languagePool);

        providers.push({
          id: providerId, region_id: cityId, name: providerName,
          category, tier, bio: providerBios[pTypeIdx],
          langs, responseTime, responseRate, reviews, rating,
        });

        const numListings = randInt(2, 5);
        const templates = titleTemplates[category];
        const images = imagesByCategory[category];
        const usedTitles = new Set();

        for (let l = 0; l < numListings; l++) {
          const listingId = nextListingId();
          let title = `${cityName} ${templates[(l + p * 3) % templates.length]}`;
          if (usedTitles.has(title)) title = `${title} — ${tierNames[tier]}`;
          if (usedTitles.has(title)) title = `${title} (${p + 1})`;
          usedTitles.add(title);

          const dt = pick(descTemplates);
          let description;
          if (dt.includes('%s %s experience in %s')) {
            description = dt.replace('%s', tierNames[tier].toLowerCase()).replace('%s', category.replace(/_/g, ' ')).replace('%s', cityName).replace('%s', pick(uniquePhrases));
          } else if (dt.includes('Includes %s')) {
            description = dt.replace('%s', cityName).replace('%s', tierNames[tier].toLowerCase()).replace('%s', pick(uniquePhrases)).replace('%s', pick(inclusions));
          } else {
            description = dt.replace('%s', cityName).replace('%s', tierNames[tier].toLowerCase()).replace('%s', pick(uniquePhrases)).replace('%s', pick(audiences));
          }

          const duration = pick(durationRanges[category]);
          const [minP, maxP] = priceRanges[tier][category];
          const price = randInt(minP, maxP);
          const minAge = (category === 'activity' || category === 'desert_experience') ? randInt(6, 12) : randInt(3, 8);
          const difficulty = (category === 'activity' || category === 'desert_experience') ? randInt(1, 4) : randInt(1, 2);
          const minParty = randInt(1, 2);
          const maxParty = tier >= 3 ? randInt(4, 8) : randInt(8, 16);
          const imgId = images[listingSeq % images.length];
          const imgUrl = imageUrl(imgId);
          const listingLangs = pick(languagePool);

          listings.push({
            id: listingId, providerId, regionId: cityId, category, title, description,
            langs: listingLangs, minAge, difficulty, minParty, maxParty,
            duration, tier, imgUrl,
          });

          prices.push({
            id: nextPriceId(), listingId, amount: price,
            unit: category === 'stay' ? 'per_night' : 'per_person',
            partyFrom: minParty, partyTo: maxParty,
          });
        }
      }
    }
  }
}

// Generate SQL using multi-row INSERTs (much more compact)
function multiRowInsert(table, columns, rows) {
  const colStr = columns.join(', ');
  let sql = '';
  const batchSize = 50; // rows per INSERT
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch.map(r => `(${r.join(', ')})`).join(',\n');
    sql += `INSERT INTO ${table} (${colStr}) VALUES\n${values}\nON CONFLICT (id) DO NOTHING;\n`;
  }
  return sql;
}

// Format providers
const providerRows = providers.map(p => [
  `'${p.id}'`, `'MA'`, `'${p.region_id}'`, `'${esc(p.name + ' SARL')}'`, `'${esc(p.name)}'`,
  `'${p.category}'`, `${p.tier}`, `'verified'`,
  `ARRAY[${p.langs.map(l => `'${l}'`).join(',')}]`,
  `'${esc(p.bio)}'`, `${p.responseTime}`, `${p.responseRate}`, `${p.reviews}`, `${p.rating}`, `'active'`,
]);

const listingRows = listings.map(l => [
  `'${l.id}'`, `'${l.providerId}'`, `'MA'`, `'${l.regionId}'`, `'${l.category}'`,
  `'${esc(l.title)}'`, `'${esc(l.description)}'`,
  `ARRAY[${l.langs.map(lang => `'${lang}'`).join(',')}]`,
  `${l.minAge}`, `${l.difficulty}`,
  `'${JSON.stringify({ wheelchair: false, mobility_aid: l.tier >= 3, stamina_required: l.difficulty >= 3 ? 'high' : 'low' }).replace(/'/g, "''")}'::jsonb`,
  `${l.minParty}`, `${l.maxParty}`, `${l.duration}`, `${l.tier}`, `'published'`, `'${l.imgUrl}'`,
]);

const priceRows = prices.map(p => [
  `'${p.id}'`, `'${p.listingId}'`, `${p.amount}`, `'MAD'`, `'${p.unit}'`, `${p.partyFrom}`, `${p.partyTo}`,
]);

const providerSql = multiRowInsert('provider_org',
  ['id', 'country_code', 'region_id', 'legal_name', 'display_name', 'category', 'service_tier', 'verification_state', 'languages', 'bio', 'response_time_hours', 'response_rate_pct', 'review_count', 'avg_rating', 'status'],
  providerRows);

const listingSql = multiRowInsert('catalogue_listing',
  ['id', 'provider_org_id', 'country_code', 'region_id', 'category', 'title', 'description', 'languages', 'min_age', 'difficulty', 'accessibility', 'min_party', 'max_party', 'duration_minutes', 'service_tier', 'status', 'image_url'],
  listingRows);

const priceSql = multiRowInsert('catalogue_price_rule',
  ['id', 'listing_id', 'amount_minor', 'currency', 'pricing_unit', 'party_from', 'party_to'],
  priceRows);

// Write in chunks
const allSql = providerSql + '\n' + listingSql + '\n' + priceSql;
writeFileSync(join(__dirname, 'migration', 'all_data.sql'), allSql);

// Also write individual files for reference
writeFileSync(join(__dirname, 'migration', 'providers_multi.sql'), providerSql);
writeFileSync(join(__dirname, 'migration', 'listings_multi.sql'), listingSql);
writeFileSync(join(__dirname, 'migration', 'prices_multi.sql'), priceSql);

console.log(`Generated ${providers.length} providers, ${listings.length} listings, ${prices.length} prices`);
console.log(`Total SQL: ${allSql.length} bytes`);
console.log(`Provider SQL: ${providerSql.length} bytes`);
console.log(`Listing SQL: ${listingSql.length} bytes`);
console.log(`Price SQL: ${priceSql.length} bytes`);
