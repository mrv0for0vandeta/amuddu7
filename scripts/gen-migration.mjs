#!/usr/bin/env node
/**
 * Generate a single PL/pgSQL migration that inserts all data server-side.
 * Uses DO blocks with arrays and loops.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = mkdirSync(__dirname + '/migration', { recursive: true });

// ─── Cities ───
const cities = [
  { id: 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Casablanca' },
  { id: 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Rabat' },
  { id: 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Marrakech' },
  { id: 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Fès' },
  { id: 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Meknès' },
  { id: 'a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Chefchaouen' },
  { id: 'a9999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Tangier' },
  { id: 'a00a00a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Tetouan' },
  { id: 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Essaouira' },
  { id: 'a00b00b0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Agadir' },
  { id: 'a00d00d0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Ouarzazate' },
  { id: 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Merzouga' },
  { id: 'a00e00e0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Dakhla' },
  { id: 'a00f00f0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Ifrane' },
  { id: 'a01010a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Azrou' },
  { id: 'a02020a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'El Jadida' },
  { id: 'a03030a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Asilah' },
  { id: 'a00c00c0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Taroudant' },
  { id: 'a06060a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Ouzoud' },
  { id: 'a08080a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Ourika Valley' },
  { id: 'a09090a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Aït Ben Haddou' },
  { id: 'a0a0a0a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Tinghir' },
  { id: 'a07070a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Dades Valley' },
  { id: 'a0b0b0a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Akchour' },
  { id: 'a04040a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Al Hoceima' },
  { id: 'a05050a0-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Nador' },
];

const categories = ['tour', 'guided_experience', 'workshop', 'stay', 'meal', 'activity', 'desert_experience', 'transfer'];
const tiers = [1, 2, 3, 4];
const tierNames = { 1: 'Budget', 2: 'Standard', 3: 'Premium', 4: 'Luxury' };

const providerTypes = [
  { suffix: 'Tours', bio: 'Local family business specializing in authentic cultural tours since 2008.' },
  { suffix: 'Adventures', bio: 'Boutique adventure operator with certified mountain guides.' },
  { suffix: 'Experiences', bio: 'Cultural association promoting sustainable tourism and local heritage.' },
  { suffix: 'Guides', bio: 'Certified local guides with deep knowledge of Moroccan history.' },
  { suffix: 'Travel', bio: 'Full-service travel company offering personalized Moroccan journeys.' },
  { suffix: 'Concierge', bio: 'Luxury concierge service crafting exclusive Moroccan experiences.' },
  { suffix: 'Expeditions', bio: 'Desert expedition company with expert Berber guides.' },
  { suffix: 'Collective', bio: 'Eco-tourism collective of local artisans and guides.' },
  { suffix: 'Heritage', bio: 'Cultural preservation society offering immersive heritage tours.' },
  { suffix: 'Studio', bio: 'Creative studio specializing in photography and artisan workshops.' },
  { suffix: 'Academy', bio: 'Cooking academy teaching traditional Moroccan cuisine.' },
  { suffix: 'Retreat', bio: 'Wellness retreat center offering hammam, yoga, and spa experiences.' },
  { suffix: 'Lodge', bio: 'Eco lodge providing sustainable accommodation and nature activities.' },
  { suffix: 'Riad', bio: 'Traditional riad offering boutique stays and cultural immersion.' },
  { suffix: 'Transit', bio: 'Professional transfer service with modern fleet and English-speaking drivers.' },
  { suffix: 'Chauffeur', bio: 'Private chauffeur company for premium door-to-door service.' },
  { suffix: 'Surf School', bio: 'Certified surf and kitesurf school with experienced instructors.' },
  { suffix: 'Diving Center', bio: 'PADI-certified diving center exploring Morocco\'s underwater treasures.' },
  { suffix: 'Charters', bio: 'Yacht and boat charter company for coastal adventures.' },
  { suffix: 'Balloon', bio: 'Hot air balloon company offering sunrise flights over Moroccan landscapes.' },
];

const titleTemplates = {
  tour: ['{city} Medina Walking Tour','{city} Historical Highlights Tour','{city} Half-Day Cultural Tour','{city} Full-Day Guided City Tour','{city} Hidden Corners Discovery Tour','{city} Architecture & Heritage Tour','{city} Photography Walking Tour','{city} Sunset Viewpoints Tour','{city} Souk & Market Tour','{city} Old City Discovery Tour'],
  guided_experience: ['{city} Guided Medina Experience','{city} Local Life Immersion','{city} Historical Guided Walk','{city} Cultural Immersion Day','{city} Insider\'s {city} Experience','{city} Storytelling Heritage Walk','{city} Hidden Gems Guided Tour','{city} Art & Architecture Visit','{city} Spiritual Sites Tour','{city} Neighborhood Discovery Walk'],
  workshop: ['{city} Pottery Making Workshop','{city} Cooking Class with Local Chef','{city} Leather Craft Workshop','{city} Carpet Weaving Workshop','{city} Calligraphy Art Workshop','{city} Traditional Jewelry Workshop','{city} Tile & Mosaic Workshop','{city} Henna Art Workshop','{city} Bread Baking Workshop','{city} Spice Blending Workshop'],
  stay: ['{city} Boutique Riad Stay','{city} Traditional Guesthouse Stay','{city} Luxury Hotel Experience','{city} Eco Lodge Stay','{city} Kasbah Stay Experience','{city} Glamping Desert Stay','{city} Heritage House Stay','{city} Rooftop Suite Experience','{city} Garden Riad Stay','{city} Medina Guesthouse Stay'],
  meal: ['{city} Traditional Moroccan Dinner','{city} Rooftop Dining Experience','{city} Home-Cooked Meal with Local Family','{city} Fine Dining Experience','{city} Tea Ceremony & Pastries','{city} Street Food Tour','{city} Farm-to-Table Dining','{city} Sunset Dinner with Views','{city} Couscous Friday Lunch','{city} Harira & Tagine Tasting'],
  activity: ['{city} Surf Lesson','{city} Kitesurfing Course','{city} Horse Riding Experience','{city} Quad Biking Adventure','{city} Hot Air Balloon Ride','{city} Yoga & Wellness Session','{city} Hammam & Spa Experience','{city} Rock Climbing Adventure','{city} Cycling Tour','{city} Boat Trip & Coastal Cruise'],
  desert_experience: ['{city} Camel Trekking at Sunset','{city} Overnight Desert Camp','{city} Sandboarding Adventure','{city} 4x4 Desert Safari','{city} Luxury Desert Camp Stay','{city} Stargazing Desert Night','{city} Desert Sunrise Camel Ride','{city} Buggy Desert Tour','{city} Nomad Village Visit','{city} Desert Photography Expedition'],
  transfer: ['{city} Airport Private Transfer','{city} City-to-City Private Driver','{city} Luxury Chauffeur Service','{city} Train Station Transfer','{city} Group Shuttle Service','{city} Hotel-to-Attraction Transfer','{city} Scenic Route Transfer','{city} Multi-Stop Transfer Service','{city} Night Transfer Service','{city} Family Transfer with Car Seats'],
};

const descriptionTemplates = [
  'Discover the authentic side of {city} with our {tier} experience. {unique}. Perfect for {audience}.',
  'Join us for an unforgettable {tier} adventure in {city}. {unique}. Our expert guides ensure a memorable journey.',
  'Experience {city} like a local with this {tier} offering. {unique}. Includes {inclusion}.',
  'Immerse yourself in Moroccan culture with our {tier} {category} experience in {city}. {unique}.',
  'A carefully curated {tier} experience showcasing the best of {city}. {unique}. Suitable for all skill levels.',
  'Step off the beaten path with our {tier} {category} in {city}. {unique}. Small groups for an intimate experience.',
  'Your gateway to {city}\'s hidden treasures. This {tier} experience features {unique}.',
  'Authentic, sustainable, and unforgettable. Our {tier} {category} in {city} offers {unique}.',
];

const uniquePhrases = [
  'Visit lesser-known landmarks and meet local artisans','Explore ancient medina alleys most tourists never see','Enjoy exclusive access to private gardens and courtyards','Sample regional specialties at family-run establishments','Learn traditional techniques passed down through generations','Capture stunning views from secret vantage points','Connect with local families and hear their stories','Discover the blend of Berber, Arab, and Andalusian influences','Experience the rhythm of daily life in the old city','Wander through colorful markets filled with handcrafted goods','Marvel at intricate tilework and carved cedar ceilings','Savor spices and flavors unique to this region','Traverse landscapes that have inspired poets for centuries','Engage with master craftsmen in their workshops','Witness sunrise over breathtaking natural formations',
];

const audiences = ['families with children','couples seeking romance','solo travelers','photography enthusiasts','culture lovers','adventure seekers','first-time visitors','seasoned travelers','food lovers','history buffs'];
const inclusions = ['hotel pickup and drop-off','a professional guide','all entrance fees','traditional mint tea and snacks','a souvenir photo','all necessary equipment','a local meal','travel insurance','bottled water','air-conditioned transport'];

const imagesByCategory = {
  tour: ['https://images.pexels.com/photos/38112390/pexels-photo-38112390.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/14996117/pexels-photo-14996117.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38111988/pexels-photo-38111988.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/19068524/pexels-photo-19068524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/6621125/pexels-photo-6621125.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/18341651/pexels-photo-18341651.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/28582577/pexels-photo-28582577.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/29595710/pexels-photo-29595710.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/14719525/pexels-photo-14719525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/27987052/pexels-photo-27987052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112351/pexels-photo-38112351.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/15360686/pexels-photo-15360686.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112164/pexels-photo-38112164.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112371/pexels-photo-38112371.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112326/pexels-photo-38112326.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'],
  guided_experience: ['https://images.pexels.com/photos/38112390/pexels-photo-38112390.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38111988/pexels-photo-38111988.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/6621125/pexels-photo-6621125.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/18341651/pexels-photo-18341651.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/28582577/pexels-photo-28582577.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/29595710/pexels-photo-29595710.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112351/pexels-photo-38112351.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/15360686/pexels-photo-15360686.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112164/pexels-photo-38112164.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112326/pexels-photo-38112326.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/19068524/pexels-photo-19068524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/14996117/pexels-photo-14996117.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/14719525/pexels-photo-14719525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/27987052/pexels-photo-27987052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112371/pexels-photo-38112371.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'],
  workshop: ['https://images.pexels.com/photos/32422996/pexels-photo-32422996.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/31092376/pexels-photo-31092376.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34259434/pexels-photo-34259434.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/18373966/pexels-photo-18373966.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/29418319/pexels-photo-29418319.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/37364782/pexels-photo-37364782.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/33878971/pexels-photo-33878971.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/19867571/pexels-photo-19867571.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34259423/pexels-photo-34259423.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34004100/pexels-photo-34004100.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34259436/pexels-photo-34259436.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34461165/pexels-photo-34461165.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/33703946/pexels-photo-33703946.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/22823/pexels-photo.jpg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/33633350/pexels-photo-33633350.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'],
  stay: ['https://images.pexels.com/photos/15531322/pexels-photo-15531322.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/15531325/pexels-photo-15531325.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/10573397/pexels-photo-10573397.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/9143446/pexels-photo-9143446.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/31356131/pexels-photo-31356131.png?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/18320915/pexels-photo-18320915.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/412050/pexels-photo-412050.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/31356126/pexels-photo-31356126.png?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34940612/pexels-photo-34940612.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34672503/pexels-photo-34672503.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/7391720/pexels-photo-7391720.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34645081/pexels-photo-34645081.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/18320907/pexels-photo-18320907.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34672504/pexels-photo-34672504.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34645131/pexels-photo-34645131.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'],
  meal: ['https://images.pexels.com/photos/2287528/pexels-photo-2287528.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/998244/pexels-photo-998244.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/2291602/pexels-photo-2291602.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/36984667/pexels-photo-36984667.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/30068444/pexels-photo-30068444.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/2287524/pexels-photo-2287524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/30068445/pexels-photo-30068445.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/37369301/pexels-photo-37369301.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/19162223/pexels-photo-19162223.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/2291603/pexels-photo-2291603.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/35201199/pexels-photo-35201199.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/35509025/pexels-photo-35509025.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/18496584/pexels-photo-18496584.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/2291596/pexels-photo-2291596.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/1618929/pexels-photo-1618929.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'],
  activity: ['https://images.pexels.com/photos/9387222/pexels-photo-9387222.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/35341806/pexels-photo-35341806.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34566165/pexels-photo-34566165.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/11047666/pexels-photo-11047666.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/32793714/pexels-photo-32793714.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/13521242/pexels-photo-13521242.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/28976474/pexels-photo-28976474.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/4761859/pexels-photo-4761859.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/36005570/pexels-photo-36005570.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/13926150/pexels-photo-13926150.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/33674831/pexels-photo-33674831.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/18696593/pexels-photo-18696593.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/35342185/pexels-photo-35342185.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/30560213/pexels-photo-30560213.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/20070755/pexels-photo-20070755.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'],
  desert_experience: ['https://images.pexels.com/photos/8357638/pexels-photo-8357638.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/33566021/pexels-photo-33566021.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/35882702/pexels-photo-35882702.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/30757359/pexels-photo-30757359.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/31653067/pexels-photo-31653067.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/34329676/pexels-photo-34329676.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/12214734/pexels-photo-12214734.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/20852588/pexels-photo-20852588.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/8428013/pexels-photo-8428013.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/35666734/pexels-photo-35666734.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/26925634/pexels-photo-26925634.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/31497923/pexels-photo-31497923.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/28356797/pexels-photo-28356797.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/18742772/pexels-photo-18742772.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/998656/pexels-photo-998656.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'],
  transfer: ['https://images.pexels.com/photos/19068524/pexels-photo-19068524.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/27987052/pexels-photo-27987052.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/14719525/pexels-photo-14719525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/6621125/pexels-photo-6621125.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/15360686/pexels-photo-15360686.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112351/pexels-photo-38112351.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/29595710/pexels-photo-29595710.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112390/pexels-photo-38112390.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/18341651/pexels-photo-18341651.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/14996117/pexels-photo-14996117.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38111988/pexels-photo-38111988.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/28582577/pexels-photo-28582577.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112371/pexels-photo-38112371.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112164/pexels-photo-38112164.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','https://images.pexels.com/photos/38112326/pexels-photo-38112326.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'],
};

const languagePool = [['en','fr'],['en','fr','ary-Latn'],['en','fr','es'],['en','fr','de'],['en','fr','ar'],['en','fr','it'],['en','ary-Latn'],['en','fr','ary-Latn','es']];
const durationRanges = { tour:[120,180,240,360,480], guided_experience:[90,120,180,240,360], workshop:[60,90,120,180], stay:[1440,2880,4320], meal:[60,90,120,150], activity:[60,90,120,180,240], desert_experience:[120,240,480,720,1440], transfer:[30,45,60,90,120] };
const priceRanges = {
  1: { tour:[8000,15000], guided_experience:[5000,12000], workshop:[4000,10000], stay:[20000,40000], meal:[3000,8000], activity:[6000,12000], desert_experience:[10000,20000], transfer:[3000,8000] },
  2: { tour:[15000,30000], guided_experience:[12000,25000], workshop:[10000,20000], stay:[40000,80000], meal:[8000,15000], activity:[12000,25000], desert_experience:[20000,40000], transfer:[8000,15000] },
  3: { tour:[30000,60000], guided_experience:[25000,50000], workshop:[20000,40000], stay:[80000,150000], meal:[15000,30000], activity:[25000,50000], desert_experience:[40000,80000], transfer:[15000,30000] },
  4: { tour:[60000,120000], guided_experience:[50000,100000], workshop:[40000,80000], stay:[150000,300000], meal:[30000,60000], activity:[50000,100000], desert_experience:[80000,160000], transfer:[30000,60000] },
};

// PRNG
let seed = 42;
function rng() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
function randInt(min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }

let providerSeq = 100, listingSeq = 1000, priceSeq = 10000;
function nextProviderId() { providerSeq++; const hex = providerSeq.toString(16).padStart(4,'0'); return `e${hex}0000-0000-0000-0000-000000000000`; }
function nextListingId() { listingSeq++; const hex = listingSeq.toString(16).padStart(6,'0'); return `f${hex}00-0000-0000-0000-000000000000`; }
function nextPriceId() { priceSeq++; const hex = priceSeq.toString(16).padStart(5,'0'); return `g${hex}000-0000-0000-0000-000000000000`; }

function esc(s) { return s.replace(/'/g, "''"); }

// Generate all INSERT statements
let providerSql = '';
let listingSql = '';
let priceSql = '';

for (const city of cities) {
  for (const category of categories) {
    for (const tier of tiers) {
      for (let p = 0; p < 3; p++) {
        const providerType = providerTypes[(providerSeq + p) % providerTypes.length];
        const providerName = `${city.name} ${providerType.suffix} ${p + 1}`;
        const providerId = nextProviderId();
        const rating = parseFloat((3.5 + rng() * 1.5).toFixed(1));
        const reviews = randInt(12, 450);
        const responseTime = parseFloat((1 + rng() * 12).toFixed(1));
        const responseRate = parseFloat((85 + rng() * 14).toFixed(1));
        const langs = pick(languagePool);

        providerSql += `INSERT INTO provider_org (id, country_code, region_id, legal_name, display_name, category, service_tier, verification_state, languages, bio, response_time_hours, response_rate_pct, review_count, avg_rating, status) VALUES ('${providerId}', 'MA', '${city.id}', '${esc(providerName + ' SARL')}', '${esc(providerName)}', '${category}', ${tier}, 'verified', ARRAY[${langs.map(l => `'${l}'`).join(',')}], '${esc(providerType.bio)}', ${responseTime}, ${responseRate}, ${reviews}, ${rating}, 'active') ON CONFLICT (id) DO NOTHING;\n`;

        const numListings = randInt(2, 5);
        const templates = titleTemplates[category];
        const images = imagesByCategory[category];
        const usedTitles = new Set();

        for (let l = 0; l < numListings; l++) {
          const listingId = nextListingId();
          let title = templates[(l + p * 3) % templates.length].replace(/\{city\}/g, city.name);
          if (usedTitles.has(title)) title = `${title} — ${tierNames[tier]}`;
          if (usedTitles.has(title)) title = `${title} (${p + 1})`;
          usedTitles.add(title);

          const descTemplate = pick(descriptionTemplates);
          const description = descTemplate
            .replace(/\{city\}/g, city.name)
            .replace(/\{tier\}/g, tierNames[tier].toLowerCase())
            .replace(/\{category\}/g, category.replace(/_/g, ' '))
            .replace(/\{unique\}/g, pick(uniquePhrases))
            .replace(/\{audience\}/g, pick(audiences))
            .replace(/\{inclusion\}/g, pick(inclusions));

          const duration = pick(durationRanges[category]);
          const [minPrice, maxPrice] = priceRanges[tier][category];
          const price = randInt(minPrice, maxPrice);
          const minAge = (category === 'activity' || category === 'desert_experience') ? randInt(6, 12) : randInt(3, 8);
          const difficulty = (category === 'activity' || category === 'desert_experience') ? randInt(1, 4) : randInt(1, 2);
          const minParty = randInt(1, 2);
          const maxParty = tier >= 3 ? randInt(4, 8) : randInt(8, 16);
          const imageIdx = listingSeq % images.length;
          const imageUrl = images[imageIdx];
          const listingLangs = pick(languagePool);
          const acc = JSON.stringify({ wheelchair: false, mobility_aid: tier >= 3, stamina_required: difficulty >= 3 ? 'high' : 'low' });

          listingSql += `INSERT INTO catalogue_listing (id, provider_org_id, country_code, region_id, category, title, description, languages, min_age, difficulty, accessibility, min_party, max_party, duration_minutes, service_tier, status, image_url) VALUES ('${listingId}', '${providerId}', 'MA', '${city.id}', '${category}', '${esc(title)}', '${esc(description)}', ARRAY[${listingLangs.map(l => `'${l}'`).join(',')}], ${minAge}, ${difficulty}, '${acc.replace(/'/g, "''")}'::jsonb, ${minParty}, ${maxParty}, ${duration}, ${tier}, 'published', '${imageUrl}') ON CONFLICT (id) DO NOTHING;\n`;

          priceSql += `INSERT INTO catalogue_price_rule (id, listing_id, amount_minor, currency, pricing_unit, party_from, party_to) VALUES ('${nextPriceId()}', '${listingId}', ${price}, 'MAD', '${category === 'stay' ? 'per_night' : 'per_person'}', ${minParty}, ${maxParty}) ON CONFLICT (id) DO NOTHING;\n`;
        }
      }
    }
  }
}

// Write as migration files
writeFileSync(join(__dirname, 'migration', 'providers.sql'), providerSql);
writeFileSync(join(__dirname, 'migration', 'listings.sql'), listingSql);
writeFileSync(join(__dirname, 'migration', 'prices.sql'), priceSql);

console.log(`Providers: ${providerSql.split('\n').filter(s => s.trim()).length}`);
console.log(`Listings: ${listingSql.split('\n').filter(s => s.trim()).length}`);
console.log(`Prices: ${priceSql.split('\n').filter(s => s.trim()).length}`);
console.log(`Provider SQL: ${providerSql.length} bytes`);
console.log(`Listing SQL: ${listingSql.length} bytes`);
console.log(`Price SQL: ${priceSql.length} bytes`);
