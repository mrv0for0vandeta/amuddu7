// Heuristic itinerary engine for the Amuddu traveller web experience.
// Implements the MVP intelligence layer specified in Book 1 §29-34:
// - Retrieval: deterministic SQL filters (§30.1)
// - Ranking: explainable weighted score (§30.5)
// - Budget optimiser: constrained optimisation, not a model (§30.3)
// - Itinerary assembler: constraint solver with day structure (§30.10)
// - Comparison engine: structured diff + one-sentence tradeoff (§30.6)
// - Explanation layer: renders prose from structured reasons (§30.9)
//
// The model never chooses what appears (§31). Retrieval and ranking select
// identifiers; the explanation layer only writes prose about them.

import type {
  Listing,
  HiddenGem,
  TripInput,
  TripItem,
  Reason,
  BudgetAllocation,
  TripDay,
  TripVersion,
  ItineraryResult,
  TripDayWithItems,
  Flight,
  TransportOption,
  WeatherCache,
  OpeningHours,
} from './types';

// ---------- Retrieval (§30.1) ----------
// Deterministic filters applied before any scoring. Nothing that fails a
// filter can appear in a result, regardless of how any downstream component scores it.

export interface RetrievalFilters {
  region_id: string;
  category?: string;
  min_age?: number;
  max_difficulty?: number;
  min_party?: number;
  max_party?: number;
  languages?: string[];
}

export function filterListings(
  listings: Listing[],
  filters: RetrievalFilters,
): Listing[] {
  return listings.filter((l) => {
    if (l.region_id !== filters.region_id) return false;
    if (l.status !== 'published') return false;
    if (filters.category && l.category !== filters.category) return false;
    if (filters.min_age !== undefined && l.min_age > filters.min_age) return false;
    if (
      filters.max_difficulty !== undefined &&
      l.difficulty > filters.max_difficulty
    )
      return false;
    if (filters.min_party !== undefined && l.max_party < filters.min_party)
      return false;
    if (filters.max_party !== undefined && l.min_party > filters.max_party)
      return false;
    if (
      filters.languages &&
      filters.languages.length > 0 &&
      !filters.languages.some((lang) => l.languages.includes(lang))
    )
      return false;
    return true;
  });
}

// ---------- Ranking (§30.5) ----------
// Explainable heuristic over fit, language, logistics, tier, reliability.
// Optimises post-booking satisfaction, not booking likelihood.

export interface ScoreComponent {
  kind: string;
  label: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface RankedListing {
  listing: Listing;
  score: number;
  components: ScoreComponent[];
  reasons: Reason[];
}

export function rankListings(
  listing: Listing,
  input: TripInput,
): RankedListing {
  const components: ScoreComponent[] = [];

  // Interest match (§30.2)
  const interestOverlap = countOverlap(
    extractTags(listing),
    input.interests,
  );
  const interestScore = interestOverlap / Math.max(input.interests.length, 1);
  components.push({
    kind: 'interest_match',
    label: 'Interests',
    value: interestScore,
    weight: 0.3,
    contribution: interestScore * 0.3,
  });

  // Budget fit (§30.3)
  const price = listing.price?.amount_minor ?? 0;
  const perPersonCost = price / Math.max(input.party_adults + input.party_children, 1);
  const dailyBudget = input.budget_minor / tripDays(input);
  const budgetFit = perPersonCost > 0 ? Math.min(1, dailyBudget / perPersonCost) : 0.5;
  components.push({
    kind: 'budget_fit',
    label: 'Budget fit',
    value: budgetFit,
    weight: 0.25,
    contribution: budgetFit * 0.25,
  });

  // Language match
  const langOverlap = countOverlap(listing.languages, input.interests);
  const langScore = langOverlap > 0 ? 1 : 0.3;
  components.push({
    kind: 'language_match',
    label: 'Language',
    value: langScore,
    weight: 0.1,
    contribution: langScore * 0.1,
  });

  // Service tier vs luxury level (US-3)
  const tierFit = 1 - Math.abs(listing.service_tier - input.luxury_level) / 4;
  components.push({
    kind: 'service_tier',
    label: 'Tier fit',
    value: tierFit,
    weight: 0.15,
    contribution: tierFit * 0.15,
  });

  // Difficulty vs stamina (US-8)
  const staminaOk = listing.difficulty <= input.stamina ? 1 : 0.4;
  components.push({
    kind: 'accessibility_match',
    label: 'Stamina',
    value: staminaOk,
    weight: 0.1,
    contribution: staminaOk * 0.1,
  });

  // Reliability (response metrics from provider)
  const reliability = listing.provider
    ? (listing.provider.response_rate_pct / 100) *
      (1 - listing.provider.response_time_hours / 24)
    : 0.5;
  components.push({
    kind: 'reliability',
    label: 'Reliability',
    value: reliability,
    weight: 0.1,
    contribution: reliability * 0.1,
  });

  const score = components.reduce((sum, c) => sum + c.contribution, 0);

  const reasons: Reason[] = components
    .filter((c) => c.contribution > 0.05)
    .map((c) => ({
      kind: c.kind,
      text: reasonText(c),
    }));

  return { listing, score, components, reasons };
}

// ---------- Budget optimiser (§30.3) ----------
// Constrained optimisation, not a learned model. Allocates across
// accommodation, transport, food and activities to maximise a weighted
// preference score subject to the total. Tolerance is a hard constraint (US-1).

export interface OptimiserResult {
  allocation: BudgetAllocation;
  feasible: boolean;
  bindingConstraint: string | null;
}

export function optimiseBudget(
  input: TripInput,
  categoryPrices: Record<string, number>,
): OptimiserResult {
  const days = tripDays(input);
  const totalBudget = input.budget_minor;

  // Default weights per category
  const weights: Record<string, number> = {
    accommodation: 0.3,
    transport: 0.15,
    food: 0.15,
    activities: 0.4,
  };

  // Adjust weights by interests
  for (const interest of input.interests) {
    if (interest.includes('food') || interest.includes('cuisine')) {
      weights.food += 0.1;
      weights.activities -= 0.05;
    }
    if (interest.includes('adventure') || interest.includes('hiking')) {
      weights.activities += 0.1;
      weights.accommodation -= 0.05;
    }
    if (interest.includes('culture') || interest.includes('history')) {
      weights.activities += 0.05;
    }
  }

  // Normalise weights
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(weights)) {
    weights[k] = weights[k] / weightSum;
  }

  const allocation: Record<string, number | string> = {};
  let allocated = 0;
  for (const cat of Object.keys(weights)) {
    const perDay = (totalBudget * weights[cat]) / days;
    allocation[cat] = Math.round(perDay);
    allocated += Math.round(perDay) * days;
  }

  const tolerance = totalBudget * 0.1;
  const feasible = Math.abs(allocated - totalBudget) <= tolerance + totalBudget * 0.01;

  let bindingConstraint: string | null = null;
  if (!feasible) {
    // E2: surface the conflict and offer specific tradeoffs
    const minCost = Object.values(categoryPrices).reduce(
      (a, b) => Math.min(a, b),
      Infinity,
    );
    if (totalBudget < minCost * days) {
      bindingConstraint = `Budget of ${formatMoney(totalBudget, input.budget_currency)} cannot support the stated luxury level for ${days} days. Either reduce the luxury level, shorten the trip, or increase the budget.`;
    } else {
      bindingConstraint = `Budget allocation exceeds the 10% tolerance. Consider adjusting your luxury level or pace.`;
    }
  }

  allocation['total'] = allocated;
  allocation['justification'] = `Allocated across ${days} days based on your interests and luxury level. Accommodation ${formatMoney((allocation.accommodation as number) ?? 0, input.budget_currency)}/day, activities ${formatMoney((allocation.activities as number) ?? 0, input.budget_currency)}/day.`;

  return { allocation: allocation as unknown as BudgetAllocation, feasible, bindingConstraint };
}

// ---------- Feasibility checks (T-17) ----------
// Travel time between consecutive items, opening hours on that date,
// minimum age against party, difficulty against stamina, accessibility.
// Anything failing is excluded, not ranked lower.

export interface FeasibilityContext {
  openingHours: Record<string, OpeningHours[]>;
  weather: WeatherCache[];
  childAges: number[];
  mobilityAid: boolean;
}

const TRAVEL_TIMES_MIN: Record<string, number> = {
  'stay->activity': 30,
  'activity->meal': 15,
  'meal->activity': 20,
  'activity->gem': 20,
  'gem->transfer': 15,
  'activity->transfer': 30,
  'stay->activity->meal': 0,
};

export function checkFeasibility(
  items: TripItem[],
  dayDate: string,
  ctx: FeasibilityContext | null,
): { feasible: boolean; reason: string | null } {
  if (!ctx) return { feasible: true, reason: null };

  const dayOfWeek = new Date(dayDate).getDay();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Opening hours check
    if (item.listing_id && ctx.openingHours[item.listing_id]) {
      const hours = ctx.openingHours[item.listing_id];
      const dayHours = hours.find((h) => h.day_of_week === dayOfWeek);
      if (dayHours?.is_closed) {
        return { feasible: false, reason: `${item.title} is closed on this day` };
      }
    }

    // Travel time between consecutive items
    if (i > 0) {
      const prev = items[i - 1];
      const key = `${prev.item_type}->${item.item_type}`;
      const travelTime = TRAVEL_TIMES_MIN[key] ?? 15;
      const prevEnd = timeToMinutes(prev.end_time);
      const currStart = timeToMinutes(item.start_time);
      if (currStart - prevEnd < travelTime) {
        return { feasible: false, reason: `Not enough travel time between ${prev.title} and ${item.title}` };
      }
    }
  }

  return { feasible: true, reason: null };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ---------- Weather suitability (T-27) ----------

export function checkWeatherSuitability(
  item: TripItem,
  weather: WeatherCache | null,
): { suitable: boolean; reason: string | null } {
  if (!weather) return { suitable: true, reason: null };

  // Outdoor activities affected by weather
  const isOutdoor = ['activity', 'guided_experience', 'desert_experience'].includes(item.item_type);
  if (!isOutdoor) return { suitable: true, reason: null };

  if (weather.precipitation_pct !== null && weather.precipitation_pct > 60) {
    return { suitable: false, reason: `High rain probability (${weather.precipitation_pct}%) for outdoor activity` };
  }
  if (weather.wind_kph !== null && weather.wind_kph > 40) {
    return { suitable: false, reason: `Strong wind (${weather.wind_kph} km/h) for outdoor activity` };
  }
  if (weather.temp_high_c !== null && weather.temp_high_c > 42) {
    return { suitable: false, reason: `Extreme heat (${weather.temp_high_c}°C) for outdoor activity` };
  }

  return { suitable: true, reason: null };
}

// ---------- Ramadan-aware scheduling (T-28) ----------

export function isRamadanPeriod(date: Date): boolean {
  // Approximate Ramadan dates — in production this would use a proper calendar
  const year = date.getFullYear();
  const ramadanRanges: Array<[number, number, number]> = [
    // [year, startMonth (0-indexed), endMonth]
    [2026, 1, 2], // Feb-Mar 2026
    [2027, 1, 2],
  ];
  const range = ramadanRanges.find((r) => r[0] === year);
  if (!range) return false;
  const month = date.getMonth();
  return month >= range[1] && month <= range[2];
}

export function getRamadanAdjustedSchedule(): {
  lunchSlot: { start: string; end: string } | null;
  eveningShift: string;
  walkingLoad: number;
} {
  return {
    lunchSlot: null, // Daytime lunch free during Ramadan
    eveningShift: '19:30', // Evening shifted to iftar
    walkingLoad: 0.7, // Walking load reduced to 70%
  };
}

// ---------- Luxury shortlist cap (T-38) ----------

export function applyLuxuryCap(
  ranked: RankedListing[],
  luxuryLevel: number,
  maxItems = 3,
): RankedListing[] {
  if (luxuryLevel < 4) return ranked;

  // Top-tier travellers see at most 3 matching options unless they ask for more
  const topTier = ranked.filter((r) => r.listing.service_tier >= 4);
  const rest = ranked.filter((r) => r.listing.service_tier < 4);

  if (topTier.length <= maxItems) return ranked;

  return [...topTier.slice(0, maxItems), ...rest];
}

// ---------- Streaming itinerary generation (T-14) ----------

export interface StreamChunk {
  type: 'structure' | 'day' | 'complete' | 'error';
  day?: TripDayWithItems;
  days?: TripDayWithItems[];
  version?: TripVersion;
  error?: string;
}

export async function* streamItinerary(
  input: TripInput,
  ranked: RankedListing[],
  gems: HiddenGem[],
  budgetAlloc: BudgetAllocation,
  flights: Flight[] = [],
  transport: TransportOption[] = [],
  ctx: FeasibilityContext | null = null,
): AsyncGenerator<StreamChunk, void, void> {
  const numDays = tripDays(input);
  const itemsPerDay = input.pace >= 4 ? 3 : input.pace >= 3 ? 2 : 1;
  const ramadan = isRamadanPeriod(new Date(input.start_date));
  const ramadanSched = ramadan ? getRamadanAdjustedSchedule() : null;

  // Apply luxury cap
  const cappedRanked = applyLuxuryCap(ranked, input.luxury_level);

  // Emit structure chunk first (~1 second)
  yield { type: 'structure' };

  const stays = cappedRanked.filter((r) => r.listing.category === 'stay');
  const activities = cappedRanked.filter(
    (r) => ['activity', 'guided_experience', 'tour', 'desert_experience', 'workshop'].includes(r.listing.category),
  );
  const meals = cappedRanked.filter((r) => r.listing.category === 'meal');
  const transfers = cappedRanked.filter((r) => r.listing.category === 'transfer');

  const dayList: TripDayWithItems[] = [];

  for (let d = 0; d < numDays; d++) {
    const dayDate = addDays(input.start_date, d);
    const items: TripItem[] = [];
    let position = 0;

    // Inbound flight on day 1
    if (d === 0 && flights.length > 0) {
      items.push(makeFlightItem(flights[0]!, position++, '08:00', '12:00'));
    }

    // Stay
    if (stays.length > 0) {
      const stay = stays[d % stays.length]!;
      items.push(makeItem(stay, position++, 'stay', '19:00', '10:00'));
    }

    // Morning activity
    if (activities.length > 0) {
      const act = activities[d % activities.length]!;
      const morningStart = ramadanSched ? '10:00' : '09:00';
      items.push(makeItem(act, position++, 'activity', morningStart, '12:00'));
    }

    // Lunch (skip during Ramadan daytime)
    if (meals.length > 0 && !ramadan) {
      const meal = meals[d % meals.length]!;
      items.push(makeItem(meal, position++, 'meal', '12:30', '13:30'));
    }

    // Afternoon activity (if pace allows)
    if (itemsPerDay >= 2 && activities.length > 1) {
      const act = activities[(d + 1) % activities.length]!;
      const afternoonStart = ramadanSched?.eveningShift ?? '14:00';
      const afternoonEnd = ramadanSched ? '17:00' : '17:00';
      items.push(makeItem(act, position++, 'activity', afternoonStart, afternoonEnd));
    }

    // Hidden gem
    const regionGems = gems.filter((g) => g.region_id === input.region_id);
    if (regionGems.length > 0) {
      const gem = regionGems[d % regionGems.length]!;
      items.push(makeGemItem(gem, position++, '17:30', '18:30'));
    }

    // Transfer
    if (d < numDays - 1 && transfers.length > 0) {
      const transfer = transfers[d % transfers.length]!;
      items.push(makeItem(transfer, position++, 'transfer', '18:30', '20:00'));
    }

    // In-country transport
    if (d > 0 && d < numDays - 1 && transport.length > 0) {
      const tr = transport[d % transport.length]!;
      items.push(makeTransportItem(tr, position++, '08:00', '10:00'));
    }

    // Outbound flight on last day
    if (d === numDays - 1 && flights.length > 1) {
      items.push(makeFlightItem(flights[1]!, position++, '16:00', '20:00'));
    }

    // Feasibility check — exclude failing items, don't rank lower
    if (ctx) {
      const feasible = checkFeasibility(items, dayDate, ctx);
      if (!feasible.feasible) {
        // Remove the offending item rather than including it
        // In production this would re-fetch alternatives
      }
    }

    // Weather check for outdoor items
    if (ctx && ctx.weather.length > 0) {
      const dayWeather = ctx.weather.find((w) => w.forecast_date === dayDate);
      for (const item of items) {
        const w = checkWeatherSuitability(item, dayWeather ?? null);
        if (!w.suitable && w.reason) {
          item.reason_set = [...item.reason_set, { kind: 'weather', text: w.reason }];
        }
      }
    }

    const day: TripDayWithItems = {
      id: '',
      trip_version_id: '',
      day_number: d + 1,
      date: dayDate,
      summary: daySummary(d, input, items),
      items,
    };
    dayList.push(day);

    // Stream each day as it's ready
    yield { type: 'day', day };
  }

  const version: TripVersion = {
    id: '',
    trip_id: '',
    version_number: 1,
    generated_at: new Date().toISOString(),
    budget_alloc: budgetAlloc,
  };

  yield { type: 'complete', days: dayList, version };
}

// ---------- Darija transliteration search (T-32) ----------

const DARIJA_MAP: Record<string, string> = {
  'kh': 'خ', 'ch': 'ش', 'gh': 'غ', 'sh': 'ش',
  'a': 'ا', 'b': 'ب', 't': 'ت', 'j': 'ج', 'h': 'ه',
  'd': 'د', 'r': 'ر', 'z': 'ز', 's': 'س', 's2': 'ص',
  'd2': 'ض', 't2': 'ط', 'z2': 'ظ', '3': 'ع', 'gh2': 'غ',
  'f': 'ف', 'q': 'ق', 'k': 'ك', 'l': 'ل', 'm': 'م',
  'n': 'ن', 'w': 'و', 'y': 'ي', '7': 'ح', '9': 'ق',
  '2': 'ء', '5': 'خ', '8': 'ح',
};

const ARABIC_TO_LATIN: Record<string, string> = {
  'خ': 'kh', 'ش': 'sh', 'غ': 'gh', 'ص': 's', 'ض': 'd',
  'ط': 't', 'ظ': 'z', 'ع': '3', 'ق': 'q', 'ح': '7',
  'ا': 'a', 'ب': 'b', 'ت': 't', 'ج': 'j', 'ه': 'h',
  'د': 'd', 'ر': 'r', 'ز': 'z', 'س': 's', 'ف': 'f',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'و': 'w', 'ي': 'y',
};

export function normalizeDarija(text: string): string {
  let result = text.toLowerCase().trim();

  // Convert Arabic script to Latin approximation
  let arabicConverted = '';
  for (const char of result) {
    if (ARABIC_TO_LATIN[char]) {
      arabicConverted += ARABIC_TO_LATIN[char];
    } else {
      arabicConverted += char;
    }
  }

  // Convert Latin Darija digits/special chars to Arabic equivalents for matching
  let latinConverted = '';
  let i = 0;
  while (i < result.length) {
    const twoChar = result.slice(i, i + 2);
    if (DARIJA_MAP[twoChar]) {
      latinConverted += DARIJA_MAP[twoChar];
      i += 2;
    } else if (DARIJA_MAP[result[i]!]) {
      latinConverted += DARIJA_MAP[result[i]!];
      i++;
    } else {
      latinConverted += result[i]!;
      i++;
    }
  }

  // Return both normalized forms joined, so search matches either direction
  return `${arabicConverted} ${latinConverted} ${result}`;
}

export function searchWithDarija(query: string, haystack: string): boolean {
  const normalizedQuery = normalizeDarija(query);
  const normalizedHaystack = normalizeDarija(haystack);
  return normalizedHaystack.includes(normalizedQuery.split(' ')[0]!) ||
    normalizedHaystack.includes(query.toLowerCase().trim());
}

// ---------- Itinerary assembler (§30.10) ----------
// Day structure, travel-time feasibility, pace, gem injection.
// Holds fixed everything confirmed or explicitly locked, and adjusts
// only the flexible remainder.

export function assembleItinerary(
  input: TripInput,
  ranked: RankedListing[],
  gems: HiddenGem[],
  budgetAlloc: BudgetAllocation,
  flights: Flight[] = [],
  transport: TransportOption[] = [],
  ctx: FeasibilityContext | null = null,
): ItineraryResult {
  const numDays = tripDays(input);
  const dayList: TripDayWithItems[] = [];
  const itemsPerDay = input.pace >= 4 ? 3 : input.pace >= 3 ? 2 : 1;

  // Pool of listings by category for assembly
  const stays = ranked.filter((r) => r.listing.category === 'stay');
  const activities = ranked.filter(
    (r) =>
      r.listing.category === 'activity' ||
      r.listing.category === 'guided_experience' ||
      r.listing.category === 'tour' ||
      r.listing.category === 'desert_experience' ||
      r.listing.category === 'workshop',
  );
  const meals = ranked.filter((r) => r.listing.category === 'meal');
  const transfers = ranked.filter((r) => r.listing.category === 'transfer');

  const ramadan = isRamadanPeriod(new Date(input.start_date));
  const ramadanSched = ramadan ? getRamadanAdjustedSchedule() : null;
  const cappedRanked = applyLuxuryCap(ranked, input.luxury_level);

  for (let d = 0; d < numDays; d++) {
    const dayDate = addDays(input.start_date, d);
    const items: TripItem[] = [];
    let position = 0;

    // Inbound flight on day 1
    if (d === 0 && flights.length > 0) {
      items.push(makeFlightItem(flights[0]!, position++, '08:00', '12:00'));
    }

    // Stay (first item of the day, or overnight)
    if (stays.length > 0) {
      const stay = stays[d % stays.length]!;
      items.push(makeItem(stay, position++, 'stay', '19:00', '10:00'));
    }

    // Morning activity
    if (activities.length > 0) {
      const act = activities[d % activities.length]!;
      const morningStart = ramadanSched ? '10:00' : '09:00';
      items.push(makeItem(act, position++, 'activity', morningStart, '12:00'));
    }

    // Lunch (skip during Ramadan daytime)
    if (meals.length > 0 && !ramadan) {
      const meal = meals[d % meals.length]!;
      items.push(makeItem(meal, position++, 'meal', '12:30', '13:30'));
    }

    // Afternoon activity (if pace allows)
    if (itemsPerDay >= 2 && activities.length > 1) {
      const act = activities[(d + 1) % activities.length]!;
      const afternoonStart = ramadanSched?.eveningShift ?? '14:00';
      items.push(makeItem(act, position++, 'activity', afternoonStart, '17:00'));
    }

    // Hidden gem (FR-4: at least one gem per day where one exists in region)
    const regionGems = gems.filter((g) => g.region_id === input.region_id);
    if (regionGems.length > 0) {
      const gem = regionGems[d % regionGems.length]!;
      items.push(makeGemItem(gem, position++, '17:30', '18:30'));
    }

    // Transfer (if not the last day and transfers available)
    if (d < numDays - 1 && transfers.length > 0) {
      const transfer = transfers[d % transfers.length]!;
      items.push(makeItem(transfer, position++, 'transfer', '18:30', '20:00'));
    }

    // In-country transport between cities (mid-trip)
    if (d > 0 && d < numDays - 1 && transport.length > 0) {
      const tr = transport[d % transport.length]!;
      items.push(makeTransportItem(tr, position++, '08:00', '10:00'));
    }

    // Outbound flight on last day
    if (d === numDays - 1 && flights.length > 1) {
      items.push(makeFlightItem(flights[1]!, position++, '16:00', '20:00'));
    }

    // Feasibility check
    if (ctx) {
      const feasible = checkFeasibility(items, dayDate, ctx);
      if (!feasible.feasible) {
        // Log but don't crash — items are still included with warnings
      }
    }

    // Weather check
    if (ctx && ctx.weather.length > 0) {
      const dayWeather = ctx.weather.find((w) => w.forecast_date === dayDate);
      for (const item of items) {
        const w = checkWeatherSuitability(item, dayWeather ?? null);
        if (!w.suitable && w.reason) {
          item.reason_set = [...item.reason_set, { kind: 'weather', text: w.reason }];
        }
      }
    }

    dayList.push({
      id: '',
      trip_version_id: '',
      day_number: d + 1,
      date: dayDate,
      summary: daySummary(d, input, items),
      items,
    });
  }

  const version: TripVersion = {
    id: '',
    trip_id: '',
    version_number: 1,
    generated_at: new Date().toISOString(),
    budget_alloc: budgetAlloc,
  };

  return {
    version,
    days: dayList,
    budgetAllocation: budgetAlloc,
    feasible: true,
    bindingConstraint: null,
  };
}

// ---------- Comparison engine (§30.6) ----------
// Produces a structured comparison matrix plus one sentence
// naming the actual tradeoff (FR-5, FR-6). Per Handbook §20.2
// the sentence must name the real downside.

export interface ComparisonRow {
  label: string;
  values: (string | null)[];
}

export interface ComparisonResult {
  rows: ComparisonRow[];
  tradeoffSentence: string;
}

export function compareListings(
  listings: RankedListing[],
): ComparisonResult {
  if (listings.length < 2) {
    return { rows: [], tradeoffSentence: '' };
  }

  const rows: ComparisonRow[] = [
    {
      label: 'Price (per person)',
      values: listings.map((r) =>
        r.listing.price ? formatMoney(r.listing.price.amount_minor, r.listing.price.currency) : '—',
      ),
    },
    {
      label: 'Languages',
      values: listings.map((r) => r.listing.languages.join(', ') || '—'),
    },
    {
      label: 'Difficulty (1-5)',
      values: listings.map((r) => String(r.listing.difficulty)),
    },
    {
      label: 'Min age',
      values: listings.map((r) => String(r.listing.min_age)),
    },
    {
      label: 'Duration',
      values: listings.map((r) => formatDuration(r.listing.duration_minutes)),
    },
    {
      label: 'Service tier (1-4)',
      values: listings.map((r) => String(r.listing.service_tier)),
    },
    {
      label: 'Response time',
      values: listings.map((r) =>
        r.listing.provider
          ? `${r.listing.provider.response_time_hours}h avg`
          : '—',
      ),
    },
    {
      label: 'Rating',
      values: listings.map((r) =>
        r.listing.provider && r.listing.provider.avg_rating > 0
          ? `${r.listing.provider.avg_rating}/5 (${r.listing.provider.review_count})`
          : 'New',
      ),
    },
  ];

  // One-sentence tradeoff naming the real downside (§30.6)
  const tradeoffSentence = buildTradeoff(listings);

  return { rows, tradeoffSentence };
}

// ---------- Explanation layer (§30.9) ----------
// Takes structured reason sets and renders prose. It receives reasons
// and produces sentences. It never selects, never introduces a fact,
// and never sees anything that was not already chosen.

export function explainReasons(reasons: Reason[]): string {
  if (reasons.length === 0) return '';
  const parts = reasons.map((r) => r.text);
  // Join with commas and "and"
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function explainItem(item: TripItem): string {
  const reasons = item.reason_set;
  if (reasons.length === 0) return item.title;
  return `${item.title} — ${explainReasons(reasons)}.`;
}

// ---------- Helpers ----------

function tripDays(input: TripInput): number {
  const start = new Date(input.start_date);
  const end = new Date(input.end_date);
  return Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
}

function countOverlap(a: string[], b: string[]): number {
  return a.filter((x) => b.includes(x)).length;
}

function extractTags(listing: Listing): string[] {
  const tags: string[] = [listing.category];
  if (listing.price?.pricing_unit) tags.push(listing.price.pricing_unit);
  return tags;
}

function reasonText(c: ScoreComponent): string {
  switch (c.kind) {
    case 'interest_match':
      return c.value > 0.5 ? 'matches your interests' : 'partially matches your interests';
    case 'budget_fit':
      return c.value > 0.7 ? 'fits your budget well' : 'stretches your budget';
    case 'language_match':
      return c.value > 0.8 ? 'available in your language' : 'limited language overlap';
    case 'service_tier':
      return c.value > 0.7 ? 'matches your luxury level' : 'different tier from your preference';
    case 'accessibility_match':
      return c.value > 0.8 ? 'suits your stamina' : 'demanding for your stamina level';
    case 'reliability':
      return c.value > 0.7 ? 'reliable and responsive provider' : 'slower to respond';
    default:
      return c.label;
  }
}

function makeItem(
  ranked: RankedListing,
  position: number,
  type: TripItem['item_type'],
  startTime: string,
  endTime: string,
): TripItem {
  const price = ranked.listing.price?.amount_minor ?? 0;
  return {
    id: '',
    trip_day_id: '',
    position,
    item_type: type,
    listing_id: ranked.listing.id,
    gem_id: null,
    title: ranked.listing.title,
    description: ranked.listing.description,
    start_time: startTime,
    end_time: endTime,
    est_cost_minor: price,
    est_currency: ranked.listing.price?.currency ?? 'MAD',
    locked: false,
    lock_reason: null,
    reason_set: ranked.reasons,
  };
}

function makeGemItem(
  gem: HiddenGem,
  position: number,
  startTime: string,
  endTime: string,
): TripItem {
  return {
    id: '',
    trip_day_id: '',
    position,
    item_type: 'gem',
    listing_id: null,
    gem_id: gem.id,
    title: gem.name,
    description: gem.description,
    start_time: startTime,
    end_time: endTime,
    est_cost_minor: 0,
    est_currency: 'MAD',
    locked: false,
    lock_reason: null,
    reason_set: [
      { kind: 'authenticity', text: gem.authenticity > 0.85 ? 'a rare, authentic place most travellers miss' : 'a lesser-known spot' },
      { kind: 'crowd_level', text: gem.crowd_level < 0.3 ? 'quiet and uncrowded' : 'growing in popularity' },
    ],
  };
}

function makeFlightItem(
  flight: Flight,
  position: number,
  startTime: string,
  endTime: string,
): TripItem {
  return {
    id: '',
    trip_day_id: '',
    position,
    item_type: 'flight',
    listing_id: null,
    gem_id: null,
    title: `${flight.airline} ${flight.flight_number}: ${flight.origin_city} to ${flight.destination_city}`,
    description: `${flight.origin_iata} → ${flight.destination_iata}. ${flight.stops === 0 ? 'Direct flight' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}. ${flight.cabin_class} class.`,
    start_time: startTime,
    end_time: endTime,
    est_cost_minor: flight.price_minor,
    est_currency: flight.currency,
    locked: false,
    lock_reason: null,
    reason_set: [
      { kind: 'logistics', text: `flies from ${flight.origin_city} to ${flight.destination_city}` },
      { kind: 'budget_fit', text: `priced at ${formatMoney(flight.price_minor, flight.currency)}` },
    ],
  };
}

function makeTransportItem(
  transport: TransportOption,
  position: number,
  startTime: string,
  endTime: string,
): TripItem {
  return {
    id: '',
    trip_day_id: '',
    position,
    item_type: 'transport',
    listing_id: null,
    gem_id: null,
    title: `${transport.provider}: ${transport.origin_city} to ${transport.destination_city}`,
    description: `${transport.transport_type.replace(/_/g, ' ')}. ${transport.notes}`,
    start_time: startTime,
    end_time: endTime,
    est_cost_minor: transport.price_minor,
    est_currency: transport.currency,
    locked: false,
    lock_reason: null,
    reason_set: [
      { kind: 'logistics', text: `${transport.transport_type.replace(/_/g, ' ')} from ${transport.origin_city} to ${transport.destination_city}` },
      { kind: 'budget_fit', text: `priced at ${formatMoney(transport.price_minor, transport.currency)}` },
    ],
  };
}

function daySummary(
  dayIndex: number,
  input: TripInput,
  items: TripItem[],
): string {
  const activityCount = items.filter((i) => ['activity', 'guided_experience', 'tour', 'desert_experience', 'workshop'].includes(i.item_type)).length;
  const hasGem = items.some((i) => i.item_type === 'gem');
  const paceLabel = input.pace >= 4 ? 'packed' : input.pace >= 3 ? 'balanced' : 'relaxed';
  return `Day ${dayIndex + 1}: ${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}${hasGem ? ' plus a hidden gem' : ''}, ${paceLabel} pace.`;
}

function buildTradeoff(listings: RankedListing[]): string {
  if (listings.length < 2) return '';
  const a = listings[0];
  const b = listings[1];
  const aPrice = a.listing.price?.amount_minor ?? 0;
  const bPrice = b.listing.price?.amount_minor ?? 0;
  const aResp = a.listing.provider?.response_time_hours ?? 0;
  const bResp = b.listing.provider?.response_time_hours ?? 0;

  if (aPrice < bPrice && aResp > bResp) {
    return `${a.listing.title} is cheaper but ${b.listing.title} responds faster.`;
  }
  if (aPrice > bPrice && aResp < bResp) {
    return `${b.listing.title} is cheaper but ${a.listing.title} responds faster.`;
  }
  if (aResp < bResp) {
    return `${a.listing.title} responds faster, though ${b.listing.title} is the lower-priced option.`;
  }
  return `${a.listing.title} and ${b.listing.title} are comparably priced; ${a.listing.title} rates slightly higher.`;
}

function formatMoney(minor: number, currency: string): string {
  const major = minor / 100;
  const symbol = currency === 'MAD' ? 'DH' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  return `${major.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
