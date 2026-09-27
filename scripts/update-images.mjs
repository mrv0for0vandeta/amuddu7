#!/usr/bin/env node
/**
 * Update listing images to match their category and title keywords.
 * Each listing gets a photo that visually represents the experience.
 */
import { readFileSync, writeFileSync } from 'fs';

// Category image pools — each has enough variety for unique assignment
const pools = {
  meal: [
    '4917090','2287528','2291602','36984667','2287524','30068444','998244','37254183',
    '19162223','30373842','22890025','30068445','38598098','23025188',
    '35659930','35919230','6441186','35659931','35787268','12675080',
    '34855147','35185310','16188296','4502964',
  ],
  workshop: [
    '6611369','36731509','29418319','33367171','33878963','37328159',
    '22823','34461165','8063880','36731504','28867408','18776184',
    '36731518','6023573','16303094',
  ],
  stay: [
    '15531322','15531325','20453463','24839180','11623420','29125650',
    '18320914','13070498','30130842','31356131','10573397','30257102',
    '18320915','21273762','30301193',
  ],
  tour: [
    '33057970','38111711','38203384','38245851','38551880','2519413',
    '28891157','17802093','18226331','35241864','20852599','38111988',
    '38298970','38002210','38436315',
  ],
  guided_experience: [
    '33057970','38111711','38203384','38245851','38551880','2519413',
    '28891157','17802093','18226331','35241864','20852599','38111988',
    '38298970','38002210','38436315',
  ],
  activity: [
    '914128','3099053','38706118','3410486','3098647','20869805',
    '4956502','9150857','9629654','33475132','31588232','6808521',
    '8659357','9467306','25225802',
  ],
  desert_experience: [
    '8357638','33566019','32600050','28356797','17775874','8428013',
    '30710173','998656','26925634','14146051','30757359','17497175',
    '37818882','11294565','33635642','17112748','16958088','11661064',
    '20734801','20510655','38513972','32543953','31703997',
  ],
  transfer: [
    '35621809','38728982','15921368','15615500','30310063','27681223',
    '12367459','17315130','12930417','9541811','20563839','20705525',
    '38169158','16154260','19943212',
    '15774577','9520201','7594130','8425052','8425380','8424931',
    '8425035','8425027','30462808','18183694','28284095','19149904',
    '5717573','1467591','8425023',
    '15511266','28905871','26919330','36556567','12555017','33384858',
    '35162870','11524258','33693159','15125362',
  ],
};

// Surf/water activity images (for coastal cities)
const surfImages = [
  '18382607','23105815','4603243','4603230','16248182','30065394',
  '8651508','2962078','5721368','29065534',
];

function imageUrl(id) {
  const isPng = ['11661064'].includes(String(id));
  const ext = isPng ? 'png' : 'jpeg';
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.${ext}?auto=compress&cs=tinysrgb&h=650&w=940`;
}

// Shuffle function with seed
let seed = 12345;
function rng() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Read the generated SQL to get all listing IDs, categories, and titles
const sql = readFileSync('/tmp/cc-agent/69351405/project/scripts/migration/marketplace_v8.sql', 'utf-8');

// Parse INSERT statements for catalogue_listing
const listingRegex = /'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})','[0-9a-f-]+','MA','([0-9a-f-]+)','([a-z_]+)','([^']+)','([^']*)',ARRAY/g;
const listings = [];
let match;
while ((match = listingRegex.exec(sql)) !== null) {
  listings.push({
    id: match[1],
    regionId: match[2],
    category: match[3],
    title: match[4].replace(/''/g, "'"),
  });
}

console.log(`Found ${listings.length} listings`);

// Region ID to city name mapping
const regionToCity = {
  'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Casablanca',
  'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Rabat',
  'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Marrakech',
  'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Fès',
  'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Meknès',
  'a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Chefchaouen',
  'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Essaouira',
  'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Merzouga',
  'a00e00e0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Dakhla',
  'a06060a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Ouzoud',
  'a00f00f0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Ifrane',
  'a01010a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Azrou',
  'a00d00d0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Ouarzazate',
  'a9999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Tangier',
  'a00b00b0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Agadir',
  'a02020a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'El Jadida',
  'a03030a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Asilah',
  'a00c00c0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Taroudant',
  'a08080a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Ourika Valley',
  'a09090a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Aït Ben Haddou',
  'a0a0a0a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Tinghir',
  'a07070a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Dades Valley',
  'a0b0b0a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Akchour',
  'a04040a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Al Hoceima',
  'a05050a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Nador',
  'a00a00a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'Tetouan',
};

const coastalCities = new Set(['Essaouira', 'Agadir', 'Dakhla', 'Al Hoceima', 'Nador', 'Asilah', 'El Jadida', 'Tangier', 'Tetouan']);

// Assign images: for each category, shuffle the pool and assign round-robin
// But also check title keywords for more specific matching
const updates = [];

// Group listings by category
const byCategory = {};
for (const l of listings) {
  if (!byCategory[l.category]) byCategory[l.category] = [];
  byCategory[l.category].push(l);
}

for (const [cat, catListings] of Object.entries(byCategory)) {
  let pool;
  const city = regionToCity[catListings[0].regionId];

  // Check if any listing has surf/water keywords and city is coastal
  const isCoastal = coastalCities.has(city);
  const hasWaterKeywords = catListings.some(l =>
    /surf|kite|wind|wave|beach|ocean|sail|boat|kayak|paddle/i.test(l.title)
  );

  if ((cat === 'activity' || cat === 'desert_experience') && isCoastal && hasWaterKeywords) {
    // Mix surf images with activity images
    pool = shuffled([...surfImages, ...pools.activity.slice(0, 5)]);
  } else if (cat === 'activity') {
    // Check for sandboard/quad/desert keywords
    const hasDesertKeywords = catListings.some(l =>
      /sand|quad|dune|buggy|off.road|4x4/i.test(l.title)
    );
    if (hasDesertKeywords) {
      pool = shuffled([...pools.desert_experience.slice(14), ...pools.activity.slice(0, 5)]);
    } else {
      pool = shuffled(pools.activity);
    }
  } else if (cat === 'desert_experience') {
    // Check for camel vs sandboard
    const hasCamel = catListings.some(l => /camel|trek|caravan|nomad|overnight|camp|star/i.test(l.title));
    const hasSand = catListings.some(l => /sand|quad|dune|buggy|off.road|4x4/i.test(l.title));
    if (hasCamel && !hasSand) {
      pool = shuffled(pools.desert_experience.slice(0, 13));
    } else if (hasSand && !hasCamel) {
      pool = shuffled(pools.desert_experience.slice(13));
    } else {
      pool = shuffled(pools.desert_experience);
    }
  } else if (cat === 'transfer') {
    // Check for train vs car vs shuttle
    const hasTrain = catListings.some(l => /train|oncf|rail/i.test(l.title));
    const hasShuttle = catListings.some(l => /shuttle|shared|bus|minibus/i.test(l.title));
    const hasLuxury = catListings.some(l => /luxury|chauffeur|mercedes|royal|private/i.test(l.title));
    if (hasTrain) {
      pool = shuffled(pools.transfer.slice(0, 15));
    } else if (hasShuttle) {
      pool = shuffled(pools.transfer.slice(30));
    } else if (hasLuxury) {
      pool = shuffled(pools.transfer.slice(15, 30));
    } else {
      pool = shuffled(pools.transfer);
    }
  } else if (cat === 'meal') {
    // Check for street food vs fine dining
    const hasStreet = catListings.some(l => /street|market|food.tour|tasting/i.test(l.title));
    if (hasStreet) {
      pool = shuffled([...pools.meal.slice(14), ...pools.meal.slice(0, 5)]);
    } else {
      pool = shuffled(pools.meal);
    }
  } else if (cat === 'workshop') {
    // Check for cooking vs craft
    const hasCooking = catListings.some(l => /cook|tagine|couscous|culinary|baking|pastry/i.test(l.title));
    if (hasCooking) {
      pool = shuffled([...pools.meal.slice(0, 14), ...pools.workshop.slice(0, 3)]);
    } else {
      pool = shuffled(pools.workshop);
    }
  } else {
    pool = shuffled(pools[cat] || pools.tour);
  }

  // Assign images round-robin from the shuffled pool
  for (let i = 0; i < catListings.length; i++) {
    const imgId = pool[i % pool.length];
    updates.push({
      id: catListings[i].id,
      imageUrl: imageUrl(imgId),
    });
  }
}

// Generate SQL UPDATE statements
let sql2 = '/* Update listing images to match category */\n\n';
for (let i = 0; i < updates.length; i += 50) {
  const batch = updates.slice(i, i + 50);
  sql2 += batch.map(u => `UPDATE catalogue_listing SET image_url = '${u.imageUrl}' WHERE id = '${u.id}';`).join('\n');
  sql2 += '\n\n';
}

writeFileSync('/tmp/cc-agent/69351405/project/scripts/migration/update_images_v8.sql', sql2);
console.log(`Generated ${updates.length} image updates, SQL: ${sql2.length} bytes`);

// Also show distribution
const catCounts = {};
for (const l of listings) {
  catCounts[l.category] = (catCounts[l.category] || 0) + 1;
}
for (const [c, n] of Object.entries(catCounts).sort()) console.log(`  ${c}: ${n}`);
