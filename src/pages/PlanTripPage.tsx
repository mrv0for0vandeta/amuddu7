import { useEffect, useState } from 'react';
import {
  Calendar,
  Wallet,
  Users,
  Heart,
  Gauge,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Check,
  Loader2,
  MapPin,
} from 'lucide-react';
import type { Region, Listing, HiddenGem, TripInput } from '@/lib/types';
import { fetchRegions, fetchListingsByRegion, fetchGemsByRegion, fetchFlights, fetchAllTransport } from '@/lib/data';
import {
  filterListings,
  rankListings,
  optimiseBudget,
  assembleItinerary,
} from '@/lib/engine';
import { createTrip, saveItinerary } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { CitySelect } from '@/components/CitySelect';

interface PlanTripPageProps {
  onNavigate: (path: string) => void;
}

const interestOptions = [
  'culture', 'history', 'food', 'adventure', 'hiking',
  'beach', 'desert', 'music', 'art', 'nature', 'photography',
];

export function PlanTripPage({ onNavigate }: PlanTripPageProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<'profile' | 'generating'>('profile');
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionId, setRegionId] = useState('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  const [error, setError] = useState<string | null>(null);

  // Trip profile inputs (FR-1)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState(1200); // EUR
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [pace, setPace] = useState(3);
  const [luxury, setLuxury] = useState(2);
  const [stamina, setStamina] = useState(3);
  const [interests, setInterests] = useState<string[]>(['culture', 'food', 'history']);
  const [originCity, setOriginCity] = useState('Casablanca');
  const originCities = [
    'Casablanca', 'Marrakech', 'Fès', 'Tanger', 'Rabat', 'Agadir',
    'Oujda', 'Nador', 'Paris', 'London', 'Madrid', 'Barcelona',
    'Lisbon', 'Frankfurt', 'Amsterdam', 'Brussels', 'Milan',
    'New York', 'Montreal', 'Dubai',
  ];
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const regs = await fetchRegions();
        if (!mounted) return;
        setRegions(regs.filter((r) => r.level === 2));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const canSubmit =
    startDate &&
    endDate &&
    new Date(endDate) >= new Date(startDate) &&
    interests.length >= 3; // FR-1

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setError(null);
    setGenerating(true);
    setStep('generating');
    setGenStep(0);

    try {
      const input: TripInput = {
        region_id: regionId,
        start_date: startDate,
        end_date: endDate,
        budget_minor: budget * 100,
        budget_currency: 'EUR',
        party_adults: adults,
        party_children: children,
        child_ages: childAges,
        pace,
        luxury_level: luxury,
        stamina,
        interests,
        origin_city: originCity,
      };

      setGenStep(1); // Retrieval
      // Fetch listings, gems, flights and transport for the region
      const [listings, gems, inboundFlights, outboundFlights, transport] = await Promise.all([
        fetchListingsByRegion(regionId),
        fetchGemsByRegion(regionId),
        fetchFlights('inbound'),
        fetchFlights('outbound'),
        fetchAllTransport(),
      ]);

      // Pick one inbound and one outbound flight (cheapest each)
      const selectedFlights = [
        ...inboundFlights.slice(0, 1),
        ...outboundFlights.slice(0, 1),
      ];

      // Retrieval (§30.1): deterministic filters
      const partySize = adults + children;
      const filtered = filterListings(listings, {
        region_id: regionId,
        max_difficulty: stamina,
        min_party: partySize,
        max_party: partySize,
      });

      setGenStep(2); // Ranking
      // Ranking (§30.5): explainable heuristic
      const ranked = filtered
        .map((l) => rankListings(l, input))
        .sort((a, b) => b.score - a.score);

      setGenStep(3); // Budget optimisation
      // Budget optimiser (§30.3): constrained optimisation
      const categoryPrices: Record<string, number> = {};
      for (const r of ranked) {
        const cat = r.listing.category;
        const price = r.listing.price?.amount_minor ?? 0;
        if (price > 0 && (!categoryPrices[cat] || price < categoryPrices[cat])) {
          categoryPrices[cat] = price;
        }
      }
      const optimiser = optimiseBudget(input, categoryPrices);

      setGenStep(4); // Assembly
      // Assembler (§30.10): day structure with gems, flights and transport
      const itinerary = assembleItinerary(input, ranked, gems, optimiser.allocation, selectedFlights, transport);

      setGenStep(5); // Hidden gems + persistence
      // Persist to Supabase
      const trip = await createTrip(input);
      const daysForSave = itinerary.days.map((d) => ({
        day_number: d.day_number,
        date: d.date,
        summary: d.summary,
        items: d.items.map((it) => ({
          position: it.position,
          item_type: it.item_type,
          listing_id: it.listing_id,
          gem_id: it.gem_id,
          title: it.title,
          description: it.description,
          start_time: it.start_time,
          end_time: it.end_time,
          est_cost_minor: it.est_cost_minor,
          est_currency: it.est_currency,
          locked: it.locked,
          lock_reason: it.lock_reason,
          reason_set: it.reason_set,
        })),
      }));
      await saveItinerary(trip.id, 1, optimiser.allocation as unknown as Record<string, unknown>, daysForSave);

      setGenStep(6);
      // Navigate to the itinerary view
      onNavigate(`/trips/${trip.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate itinerary');
      setStep('profile');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <button onClick={() => onNavigate('/')} className="btn-ghost mb-6">
          <ArrowLeft className="h-4 w-4" /> Home
        </button>

        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-sand-50">{t('plan.title')}</h1>
        <p className="mt-1 text-ink-500 dark:text-sand-400">
          {t('plan.subtitle')}
        </p>

        {step === 'profile' && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="card p-6">
              {/* Dates */}
              <Section icon={<Calendar className="h-5 w-5 text-terracotta-500" />} title={t('plan.dates')}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-ink-400 dark:text-sand-500">{t('plan.startDate')}</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-400 dark:text-sand-500">{t('plan.endDate')}</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
                  </div>
                </div>
              </Section>

              {/* Budget */}
              <Section icon={<Wallet className="h-5 w-5 text-zellige-600" />} title={t('plan.budget')}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-semibold text-ink-800 dark:text-sand-100">€</span>
                  <input
                    type="number"
                    min={200}
                    max={10000}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="input-field w-32"
                  />
                  <span className="text-sm text-ink-500 dark:text-sand-400">{t('plan.budgetHint')}</span>
                </div>
                <p className="mt-2 text-xs text-ink-400 dark:text-sand-500">
                  {t('plan.budgetNote')}
                </p>
              </Section>

              {/* Group */}
              <Section icon={<Users className="h-5 w-5 text-saffron-600" />} title={t('plan.group')}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-ink-400 dark:text-sand-500">{t('plan.adults')}</label>
                    <input type="number" min={1} max={20} value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-400 dark:text-sand-500">{t('plan.children')}</label>
                    <input type="number" min={0} max={10} value={children} onChange={(e) => {
                      const n = Number(e.target.value);
                      setChildren(n);
                      setChildAges((prev) => {
                        const next = [...prev];
                        while (next.length < n) next.push(8);
                        while (next.length > n) next.pop();
                        return next;
                      });
                    }} className="input-field" />
                  </div>
                </div>
                {children > 0 && (
                  <div className="mt-3">
                    <label className="mb-1.5 block text-xs text-ink-400 dark:text-sand-500">Child ages (years)</label>
                    <div className="flex flex-wrap gap-2">
                      {childAges.map((age, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className="text-xs text-ink-400">Child {i + 1}</span>
                          <input type="number" min={0} max={17} value={age} onChange={(e) => {
                            const next = [...childAges];
                            next[i] = Number(e.target.value);
                            setChildAges(next);
                          }} className="input-field w-16 text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              {/* Region */}
              <Section icon={<Heart className="h-5 w-5 text-terracotta-500" />} title={t('plan.region')}>
                <div className="flex flex-wrap gap-2">
                  {regions.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRegionId(r.id)}
                      className={regionId === r.id ? 'chip-active' : 'chip-inactive'}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Origin city */}
              <Section icon={<MapPin className="h-5 w-5 text-zellige-600" />} title={t('plan.originCity')}>
                <CitySelect
                  label="Where are you starting from?"
                  icon="from"
                  value={originCity}
                  onChange={setOriginCity}
                  cities={originCities}
                  placeholder="Type any city"
                />
                <p className="mt-2 text-xs text-ink-400 dark:text-sand-500">
                  {t('plan.originCityNote')}
                </p>
              </Section>
            </div>

            <div className="card p-6">
              {/* Pace */}
              <Section icon={<Gauge className="h-5 w-5 text-terracotta-500" />} title={t('plan.pace')}>
                <Slider value={pace} onChange={setPace} min={1} max={5} labels={[t('plan.relaxed'), t('plan.easy'), t('plan.balanced'), t('plan.full'), t('plan.packed')]} />
              </Section>

              {/* Luxury */}
              <Section icon={<Sparkles className="h-5 w-5 text-saffron-500" />} title={t('plan.luxury')}>
                <Slider value={luxury} onChange={setLuxury} min={1} max={4} labels={[t('plan.budgetTier'), t('plan.simple'), t('plan.comfortable'), t('plan.luxuryTier')]} />
              </Section>

              {/* Stamina (US-8) */}
              <Section icon={<Gauge className="h-5 w-5 text-zellige-600" />} title={t('plan.stamina')}>
                <Slider value={stamina} onChange={setStamina} min={1} max={5} labels={[t('plan.low'), t('plan.light'), t('plan.moderate'), t('plan.good'), t('plan.high')]} />
                <p className="mt-2 text-xs text-ink-400 dark:text-sand-500">
                  {t('plan.staminaNote')}
                </p>
              </Section>

              {/* Interests (FR-1: >=3 required) */}
              <Section icon={<Heart className="h-5 w-5 text-terracotta-500" />} title={`${t('plan.interests')} (${interests.length} ${t('plan.interestsMin')})`}>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => toggleInterest(opt)}
                      className={interests.includes(opt) ? 'chip-active capitalize' : 'chip-inactive capitalize'}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {interests.length < 3 && (
                  <p className="mt-2 text-xs text-saffron-600">
                    {t('plan.interestsHint')}
                  </p>
                )}
              </Section>
            </div>
          </div>
        )}

        {/* Generate button / generating state */}
        {step === 'profile' && (
          <div className="mt-8 flex flex-col items-center gap-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-terracotta-50 border border-terracotta-200 px-4 py-3 text-sm text-terracotta-700">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={!canSubmit || generating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('plan.generating')}
                </>
              ) : (
                <>
                  {t('plan.generate')}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            {!canSubmit && !generating && (
              <p className="text-xs text-ink-400 dark:text-sand-500">
                {t('plan.fillPrompt')}
              </p>
            )}
          </div>
        )}

        {step === 'generating' && (
          <div className="mt-16 flex flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-terracotta-100 dark:bg-terracotta-900/40">
              <Loader2 className="h-10 w-10 animate-spin text-terracotta-600" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-sand-50">
                {t('plan.building')}
              </h2>
              <p className="mt-2 max-w-md text-ink-500 dark:text-sand-400">
                {t('plan.buildingDesc')}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-ink-400 dark:text-sand-500">
              {['Retrieval', 'Ranking', 'Budget optimisation', 'Assembly', 'Hidden gems'].map((s, i) => {
                const stepNum = i + 1;
                const isDone = genStep > stepNum;
                const isActive = genStep === stepNum;
                return (
                  <div
                    key={s}
                    className={`flex items-center gap-2 transition-all duration-300 ${
                      isDone || isActive ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4 text-zellige-500 animate-fade-in-up" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin text-terracotta-500" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border-2 border-ink-200" />
                    )}
                    <span className={isDone || isActive ? 'font-medium text-ink-700 dark:text-sand-200' : ''}>
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-sand-100 pb-5 last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-base font-semibold text-ink-900">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Slider({
  value,
  onChange,
  min,
  max,
  labels,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  labels: string[];
}) {
  return (
    <div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-terracotta-600"
      />
      <div className="mt-1 flex justify-between text-xs text-ink-400">
        {labels.map((label, i) => {
          const idx = min + i;
          if (idx === max) return <span key={label} />;
          return (
            <span
              key={label}
              className={value === idx ? 'font-medium text-terracotta-600' : ''}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
