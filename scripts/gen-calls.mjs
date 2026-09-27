#!/usr/bin/env node
/**
 * Generate SELECT _mp_generate(...) calls for all city×category combos.
 * Outputs SQL files that can be applied via apply_migration.
 */
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('/tmp/cc-agent/69351405/project/scripts/migration/calls', { recursive: true });

const cities = [
  ['a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Casablanca', ['urban','coastal','historic'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rabat', ['urban','coastal','historic','capital'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Marrakech', ['urban','historic','desert_edge'], ['tour','guided_experience','workshop','stay','meal','activity','desert_experience','transfer']],
  ['a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fès', ['urban','historic','artisan'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Meknès', ['urban','historic','roman_ruins'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chefchaouen', ['mountain','historic','blue_city'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a9999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tangier', ['coastal','historic','mediterranean'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a00a00a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tetouan', ['coastal','mediterranean','historic','artisan'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Essaouira', ['coastal','windy','historic','artisan'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a00b00b0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Agadir', ['coastal','beach','resort'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a00d00d0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ouarzazate', ['desert','kasbah','film','historic'], ['tour','guided_experience','workshop','stay','meal','desert_experience','transfer']],
  ['a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Merzouga', ['desert','dunes','sahara'], ['tour','guided_experience','stay','meal','desert_experience','transfer']],
  ['a00e00e0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dakhla', ['coastal','lagoon','windy','desert_edge'], ['tour','guided_experience','stay','meal','activity','desert_experience','transfer']],
  ['a00f00f0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ifrane', ['mountain','cedar','lake','nature'], ['tour','guided_experience','stay','meal','activity','transfer']],
  ['a01010a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Azrou', ['mountain','cedar','monkey','nature'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a02020a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'El Jadida', ['coastal','historic','portuguese'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a03030a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Asilah', ['coastal','historic','art'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a00c00c0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Taroudant', ['historic','souk','walled_city'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a06060a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ouzoud', ['nature','waterfall','monkey'], ['tour','guided_experience','stay','meal','activity','transfer']],
  ['a08080a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ourika Valley', ['mountain','nature','berber','valley'], ['tour','guided_experience','workshop','stay','meal','activity','transfer']],
  ['a09090a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aït Ben Haddou', ['desert','kasbah','historic','unesco'], ['tour','guided_experience','stay','meal','desert_experience','transfer']],
  ['a0a0a0a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tinghir', ['desert','oasis','gorge','palm'], ['tour','guided_experience','stay','meal','activity','desert_experience','transfer']],
  ['a07070a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dades Valley', ['mountain','desert','gorge','scenic'], ['tour','guided_experience','stay','meal','activity','desert_experience','transfer']],
  ['a0b0b0a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Akchour', ['mountain','nature','waterfall','hiking'], ['tour','guided_experience','stay','meal','activity','transfer']],
  ['a04040a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Al Hoceima', ['coastal','mediterranean','mountain','nature'], ['tour','guided_experience','stay','meal','activity','transfer']],
  ['a05050a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nador', ['coastal','mediterranean','lagoon'], ['tour','guided_experience','stay','meal','activity','transfer']],
];

const titlePools = {
  activity: {
    coastal: { t: ['Surf Lesson','Kitesurfing Course','Boat Trip & Coastal Cruise','Horse Riding on the Beach','Quad Biking on the Coast','Sunset Sailing Cruise','Fishing Trip Adventure'], i: ['36005570','30560213','29781323','11491900','28076410','29781323','6313478'] },
    windy: { t: ['Kitesurfing Course','Windsurfing Lesson','Kitefoil Lesson','Surf Lesson','Beach Yoga Session'], i: ['30560213','13521242','35341806','36005570','36895635'] },
    mediterranean: { t: ['Boat Trip & Coastal Cruise','Snorkeling Adventure','Sea Fishing Trip','Coastal Hiking Trail','Sunset Sailing Cruise'], i: ['29781323','11047666','6313478','23731946','29781323'] },
    lagoon: { t: ['Kitesurfing Course','Windsurfing Lesson','Stand-Up Paddle Lesson','Lagoon Boat Tour','Kayak Rental Experience'], i: ['30560213','13521242','30560213','31680311','31680311'] },
    mountain: { t: ['Hiking Trail Adventure','Rock Climbing Experience','Mountain Biking Tour','Nature Photography Walk','Bird Watching Tour'], i: ['1129417','33566015','13358011','37401857','9155374'] },
    nature: { t: ['Waterfall Trekking Tour','Nature Photography Walk','Bird Watching Tour','Wildlife Spotting Walk','Hiking Trail Adventure','Forest Walk Experience'], i: ['38277704','37401857','9155374','30772935','1129417','29761823'] },
    cedar: { t: ['Cedar Forest Walk','Barbary Macaque Watching Tour','Nature Photography Walk','Hiking Trail Adventure'], i: ['29761823','30320569','37401857','1129417'] },
    hiking: { t: ['Gorge Hiking Trail','Waterfall Trekking Tour','Rock Climbing Experience','Canyoning Adventure','Nature Photography Walk'], i: ['14145715','38277704','33566015','33566015','37401857'] },
    waterfall: { t: ['Waterfall Trekking Tour','Barbary Macaque Watching Tour','Nature Photography Walk','Hiking Trail Adventure','Swimming Hole Visit'], i: ['38277704','30320569','37401857','1129417','38277704'] },
    valley: { t: ['Berber Village Hiking Tour','Waterfall Trekking Tour','Mountain Biking Tour','Donkey Trekking Experience','Nature Photography Walk'], i: ['37441809','38277704','13358011','37441809','37401857'] },
    urban: { t: ['Hammam & Spa Experience','Yoga & Wellness Session','Cycling Tour','Horse Riding Experience','Cooking Class Experience'], i: ['33279021','36895635','13358011','11491900','2287528'] },
    historic: { t: ['Hammam & Spa Experience','Yoga & Wellness Session','Cycling Tour','Photography Walking Tour'], i: ['33279021','36895635','13358011','35097550'] },
    desert_edge: { t: ['Hot Air Balloon Ride','Quad Biking Adventure','Hammam & Spa Experience'], i: ['38540299','28076410','33279021'] },
    default: { t: ['Hammam & Spa Experience','Yoga & Wellness Session','Cycling Tour'], i: ['33279021','36895635','13358011'] },
  },
  desert_experience: {
    desert: { t: ['Camel Trekking at Sunset','Overnight Desert Camp','Sandboarding Adventure','4x4 Desert Safari','Luxury Desert Camp Stay','Stargazing Desert Night','Desert Sunrise Camel Ride','Buggy Desert Tour','Nomad Village Visit','Desert Photography Expedition'], i: ['8357638','18671249','10879388','30330000','18671249','35548672','35666734','4480822','12536402','29107888'] },
    desert_edge: { t: ['Camel Trekking at Sunset','4x4 Desert Safari','Sandboarding Adventure','Overnight Desert Camp','Stargazing Desert Night'], i: ['8357638','30330000','10879388','18671249','35548672'] },
  },
  tour: {
    coastal: { t: ['Coastal City Tour','Historic Medina Walking Tour','Harbor & Seafront Walk','Sunset Viewpoints Tour','Souk & Market Tour','Half-Day Cultural Tour','Photography Walking Tour','Hidden Corners Discovery Tour'], i: ['19068524','14996117','6662921','6545522','22711555','6621125','35097550','28582577'] },
    desert: { t: ['Desert Landscape Tour','Kasbah Discovery Tour','Oasis & Palm Grove Tour','Sunset Dunes Tour','Old City Discovery Tour','Architecture & Heritage Tour'], i: ['29107888','30447650','30320620','998635','38111988','19615125'] },
    mountain: { t: ['Mountain Village Tour','Nature & Valley Tour','Waterfall & Forest Tour','Sunset Viewpoints Tour','Hidden Corners Discovery Tour','Photography Walking Tour'], i: ['37401857','37672169','38277704','6545522','28582577','35097550'] },
    urban: { t: ['Medina Walking Tour','Historical Highlights Tour','Half-Day Cultural Tour','Full-Day Guided City Tour','Architecture & Heritage Tour','Souk & Market Tour','Sunset Viewpoints Tour','Hidden Corners Discovery Tour'], i: ['14996117','18341651','6621125','38112390','19615125','22711555','6545522','28582577'] },
    historic: { t: ['Historical Highlights Tour','Architecture & Heritage Tour','Medina Walking Tour','Souk & Market Tour','Hidden Corners Discovery Tour','Photography Walking Tour'], i: ['18341651','19615125','14996117','22711555','28582577','35097550'] },
    unesco: { t: ['UNESCO Heritage Site Tour','Kasbah Architecture Tour','Historic Filming Locations Tour','Sunset Viewpoints Tour','Guided Heritage Walk'], i: ['5504504','30447650','30447650','6545522','38112164'] },
    portuguese: { t: ['Portuguese Cistern Tour','Historic Fortification Walk','Old City Discovery Tour','Coastal Heritage Tour'], i: ['32064787','32048234','38111988','32048236'] },
    blue_city: { t: ['Blue City Walking Tour','Medina Photography Walk','Hidden Blue Alleys Tour','Mountain Viewpoints Tour','Souk & Market Tour'], i: ['13041621','9742284','37852960','5472532','22711555'] },
    walled_city: { t: ['Ramparts Walking Tour','Medina & Souk Tour','Historic City Walls Tour','Hidden Corners Discovery Tour'], i: ['25254935','22711555','25254932','28582577'] },
    capital: { t: ['Capital City Highlights Tour','Parliament & Government Quarter Walk','Historic Kasbah Tour','Riverside Promenade Walk'], i: ['14719525','19068524','30563471','31239789'] },
    roman_ruins: { t: ['Roman Ruins at Volubilis Tour','Imperial City Heritage Tour','Historical Highlights Tour','Architecture & Heritage Tour'], i: ['38112490','38112083','18341651','19615125'] },
    film: { t: ['Atlas Film Studios Tour','Kasbah Cinema Locations Tour','Desert Film Set Tour'], i: ['30447650','30447650','29107888'] },
    kasbah: { t: ['Kasbah Discovery Tour','Architecture & Heritage Tour','Old City Discovery Tour','Sunset Viewpoints Tour'], i: ['30447650','19615125','38111988','6545522'] },
    default: { t: ['Medina Walking Tour','Historical Highlights Tour','Half-Day Cultural Tour','Souk & Market Tour','Sunset Viewpoints Tour','Hidden Corners Discovery Tour'], i: ['14996117','18341651','6621125','22711555','6545522','28582577'] },
  },
  guided_experience: {
    coastal: { t: ['Guided Coastal Experience','Local Life Immersion','Historical Guided Walk','Fishing Port Guided Visit','Hidden Gems Guided Tour','Neighborhood Discovery Walk'], i: ['6662921','29595710','38111988','6313478','28582577','29595710'] },
    desert: { t: ['Guided Oasis Experience','Berber Culture Immersion','Desert Life Discovery','Hidden Gems Guided Tour','Nomad Heritage Walk'], i: ['30320620','37441809','12536402','28582577','35696748'] },
    mountain: { t: ['Guided Nature Experience','Local Village Immersion','Mountain Culture Walk','Hidden Gems Guided Tour','Neighborhood Discovery Walk'], i: ['37401857','37441809','37672169','28582577','29595710'] },
    urban: { t: ['Guided Medina Experience','Local Life Immersion','Historical Guided Walk','Cultural Immersion Day','Insider Experience','Hidden Gems Guided Tour','Neighborhood Discovery Walk'], i: ['38112390','29595710','38111988','15360686','38112351','28582577','29595710'] },
    artisan: { t: ['Artisan Quarter Guided Visit','Craft Traditions Walk','Hidden Gems Guided Tour','Cultural Immersion Day'], i: ['32160896','19867571','28582577','15360686'] },
    blue_city: { t: ['Blue City Guided Walk','Local Life Immersion','Hidden Gems Guided Tour','Cultural Immersion Day'], i: ['13041621','29595710','28582577','15360686'] },
    default: { t: ['Guided Medina Experience','Local Life Immersion','Historical Guided Walk','Cultural Immersion Day','Hidden Gems Guided Tour'], i: ['38112390','29595710','38111988','15360686','28582577'] },
  },
  workshop: {
    artisan: { t: ['Pottery Making Workshop','Leather Craft Workshop','Carpet Weaving Workshop','Tile & Mosaic Workshop','Jewelry Making Workshop','Calligraphy Art Workshop','Henna Art Workshop','Spice Blending Workshop'], i: ['32422996','38112371','32160896','34296099','30557505','36792023','4727987','31653073'] },
    urban: { t: ['Cooking Class with Local Chef','Pottery Making Workshop','Calligraphy Art Workshop','Henna Art Workshop','Bread Baking Workshop','Spice Blending Workshop'], i: ['2287528','32422996','36792023','4727987','5475052','31653073'] },
    historic: { t: ['Cooking Class with Local Chef','Pottery Making Workshop','Leather Craft Workshop','Carpet Weaving Workshop','Tile & Mosaic Workshop','Calligraphy Art Workshop'], i: ['2287528','32422996','38112371','32160896','34296099','36792023'] },
    art: { t: ['Mural Painting Workshop','Calligraphy Art Workshop','Photography Workshop','Art Gallery Tour & Workshop'], i: ['28200309','36792023','35097550','30281036'] },
    default: { t: ['Cooking Class with Local Chef','Pottery Making Workshop','Carpet Weaving Workshop','Henna Art Workshop','Bread Baking Workshop','Spice Blending Workshop'], i: ['2287528','32422996','32160896','4727987','5475052','31653073'] },
  },
  stay: {
    coastal: { t: ['Boutique Riad Stay','Seaside Guesthouse Stay','Beachfront Hotel Experience','Coastal Eco Lodge Stay','Ocean View Suite Experience','Medina Guesthouse Stay'], i: ['15531325','6313437','30557503','7391720','34645081','15531322'] },
    desert: { t: ['Desert Kasbah Stay','Glamping Desert Stay','Luxury Desert Camp Stay','Oasis Guesthouse Stay','Traditional Riad Stay','Heritage House Stay'], i: ['30447650','18671249','18671249','30320620','15531325','10573397'] },
    mountain: { t: ['Mountain Lodge Stay','Nature Eco Lodge Stay','Traditional Guesthouse Stay','Forest Cabin Experience','Valley View Suite Stay'], i: ['37684072','7391720','15531322','29761823','37401857'] },
    urban: { t: ['Boutique Riad Stay','Traditional Guesthouse Stay','Luxury Hotel Experience','Heritage House Stay','Rooftop Suite Experience','Garden Riad Stay'], i: ['15531325','15531322','34940612','10573397','34645081','18320915'] },
    default: { t: ['Boutique Riad Stay','Traditional Guesthouse Stay','Heritage House Stay','Garden Riad Stay'], i: ['15531325','15531322','10573397','18320915'] },
  },
  meal: {
    coastal: { t: ['Fresh Seafood Dinner','Rooftop Dining Experience','Traditional Moroccan Dinner','Street Food Tour','Sunset Dinner with Ocean Views','Harbor Side Lunch','Tea Ceremony & Pastries'], i: ['998244','50630','998244','27999308','50630','6662921','30906051'] },
    desert: { t: ['Desert Camp Dinner Under Stars','Traditional Moroccan Dinner','Berber Family Home Meal','Sunset Dinner with Dune Views','Tea Ceremony & Pastries','Couscous Friday Lunch'], i: ['18767559','998244','36799049','998635','30906051','36916123'] },
    mountain: { t: ['Mountain Village Home Meal','Traditional Moroccan Dinner','Berber Tagine Tasting','Forest Picnic Experience','Tea Ceremony & Pastries'], i: ['36799049','998244','30068444','2287524','30906051'] },
    urban: { t: ['Traditional Moroccan Dinner','Rooftop Dining Experience','Home-Cooked Meal with Local Family','Fine Dining Experience','Tea Ceremony & Pastries','Street Food Tour','Farm-to-Table Dining','Couscous Friday Lunch','Harira & Tagine Tasting'], i: ['998244','50630','36799049','9143471','30906051','27999308','2287524','36916123','30068444'] },
    default: { t: ['Traditional Moroccan Dinner','Home-Cooked Meal with Local Family','Tea Ceremony & Pastries','Couscous Friday Lunch'], i: ['998244','36799049','30906051','36916123'] },
  },
  transfer: {
    default: { t: ['Airport Private Transfer','City-to-City Private Driver','Luxury Chauffeur Service','Train Station Transfer','Group Shuttle Service','Hotel-to-Attraction Transfer','Scenic Route Transfer','Multi-Stop Transfer Service','Night Transfer Service','Family Transfer with Car Seats'], i: ['241190','11877391','11877391','10133480','27987052','6621125','37401857','15360686','19068524','14719525'] },
  },
};

const durations = {
  tour: [120,180,240,360,480],
  guided_experience: [90,120,180,240,360],
  workshop: [60,90,120,180],
  stay: [1440,2880,4320],
  meal: [60,90,120,150],
  activity: [60,90,120,180,240],
  desert_experience: [120,240,480,720,1440],
  transfer: [30,45,60,90,120],
};

function esc(s) { return s.replace(/'/g, "''"); }

let seed = 42;
const allCalls = [];

for (const [cityId, cityName, tags, cats] of cities) {
  for (const cat of cats) {
    const pool = titlePools[cat] || {};
    let data = null;
    for (const tag of tags) {
      if (pool[tag]) { data = pool[tag]; break; }
    }
    if (!data && pool.default) data = pool.default;
    if (!data) continue;

    seed++;
    const titlesArr = data.t.map(t => `'${esc(t)}'`).join(',');
    const imgsArr = data.i.map(i => `'${i}'`).join(',');
    const durArr = durations[cat].join(',');
    
    const call = `SELECT _mp_generate('${cityId}'::uuid, '${esc(cityName)}', '${cat}', ARRAY[${titlesArr}], ARRAY[${durArr}]::int[], ARRAY[${imgsArr}], ${seed}::bigint);`;
    allCalls.push(call);
  }
}

// Write in batches of 10 calls each
const batchSize = 10;
for (let i = 0; i < allCalls.length; i += batchSize) {
  const batch = allCalls.slice(i, i + batchSize);
  const num = Math.floor(i / batchSize);
  const sql = batch.join('\n') + '\n';
  writeFileSync(`/tmp/cc-agent/69351405/project/scripts/migration/calls/batch_${String(num).padStart(2, '0')}.sql`, sql);
}

console.log(`Generated ${allCalls.length} calls in ${Math.ceil(allCalls.length / batchSize)} batches`);
