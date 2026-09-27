import { useEffect, useState } from 'react';
import { Plane, Search, Clock, ArrowRight, AlertCircle, Check, Loader2 } from 'lucide-react';
import type { Flight } from '@/lib/types';
import { fetchFlights, createBooking } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { CitySelect } from '@/components/CitySelect';

interface FlightsPageProps {
  onNavigate: (path: string) => void;
}

export function FlightsPage({ onNavigate }: FlightsPageProps) {
  const { t } = useI18n();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bookingFlight, setBookingFlight] = useState<string | null>(null);
  const [bookedFlight, setBookedFlight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const isFirstLoad = flights.length === 0;
    isFirstLoad ? setLoading(true) : setRefreshing(true);
    (async () => {
      try {
        const data = await fetchFlights(direction);
        if (!mounted) return;
        setFlights(data);
        const citySet = new Set<string>();
        data.forEach((f) => {
          citySet.add(f.origin_city);
          citySet.add(f.destination_city);
        });
        setCities(Array.from(citySet).sort());
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [direction]);

  async function handleBookFlight(flight: Flight) {
    setBookingFlight(flight.flight_number);
    try {
      await createBooking({
        item_type: 'flight',
        title: `${flight.airline} ${flight.flight_number}: ${flight.origin_city} → ${flight.destination_city}`,
        provider_name: flight.airline,
        price_minor: flight.price_minor,
        currency: flight.currency,
        party_size: 1,
        luxury_level: flight.cabin_class === 'business' ? 4 : 2,
      });
      setBookedFlight(flight.flight_number);
    } catch {
      setBookedFlight(null);
    } finally {
      setBookingFlight(null);
    }
  }

  // Check if the typed cities exist in the database
  const originExists = cities.some((c) => c.toLowerCase() === originFilter.toLowerCase());
  const destExists = cities.some((c) => c.toLowerCase() === destFilter.toLowerCase());
  const usingCustomOrigin = originFilter && !originExists;
  const usingCustomDest = destFilter && !destExists;

  const filtered = flights.filter((f) => {
    if (originFilter && !usingCustomOrigin && f.origin_city !== originFilter) return false;
    if (destFilter && !usingCustomDest && f.destination_city !== destFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.airline.toLowerCase().includes(q) ||
      f.origin_city.toLowerCase().includes(q) ||
      f.destination_city.toLowerCase().includes(q) ||
      f.flight_number.toLowerCase().includes(q)
    );
  });

  // Display label for a flight's origin — uses the user's typed city if custom
  function displayOrigin(f: Flight): string {
    return usingCustomOrigin ? originFilter : f.origin_city;
  }
  function displayDest(f: Flight): string {
    return usingCustomDest ? destFilter : f.destination_city;
  }

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <div className="flex items-center gap-2">
          <Plane className="h-7 w-7 text-terracotta-600" />
          <h1 className="font-display text-3xl font-semibold text-ink-900">Flights to Morocco</h1>
        </div>
        <p className="mt-1 text-ink-500">
          Search flights from major European cities to Moroccan airports. Book your airplane ticket as part of your trip.
        </p>

        {/* Direction toggle */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setDirection('inbound')}
            className={direction === 'inbound' ? 'chip-active' : 'chip-inactive'}
          >
            {t('plan.flyingToMorocco')}
          </button>
          <button
            onClick={() => setDirection('outbound')}
            className={direction === 'outbound' ? 'chip-active' : 'chip-inactive'}
          >
            {t('plan.flyingFromMorocco')}
          </button>
        </div>

        {/* Origin / Destination selectors */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <CitySelect
            label="From"
            icon="from"
            value={originFilter}
            onChange={setOriginFilter}
            cities={cities}
          />
          <CitySelect
            label="To"
            icon="to"
            value={destFilter}
            onChange={setDestFilter}
            cities={cities}
          />
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('plan.searchFlights')}
            className="input-field pl-10"
          />
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-terracotta-50 border border-terracotta-200 p-4 text-sm text-terracotta-700">
            {error}
          </div>
        )}

        {/* Custom route notice */}
        {(usingCustomOrigin || usingCustomDest) && !loading && (
          <div className="mt-6 rounded-xl border border-saffron-200 bg-saffron-50 p-4 text-sm text-saffron-800 dark:border-saffron-800 dark:bg-saffron-900/20 dark:text-saffron-300">
            <p>
              Showing estimated flights for <strong>{originFilter || 'any city'}</strong> → <strong>{destFilter || 'any city'}</strong>.
              Prices and times are based on similar routes and may vary.
            </p>
          </div>
        )}

        {/* Result count + loading indicator */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-ink-400 dark:text-sand-500">
            {loading || refreshing
              ? 'Searching flights...'
              : `${filtered.length} flight${filtered.length !== 1 ? 's' : ''} found`}
          </p>
          {refreshing && <Loader2 className="h-4 w-4 animate-spin text-terracotta-500" />}
        </div>

        {/* Results */}
        <div className="mt-4 space-y-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card h-28 skeleton" />
              ))
            : filtered.length === 0
              ? <div className="py-16 text-center text-ink-500 dark:text-sand-400 animate-fade-in-up">
                  <AlertCircle className="mx-auto h-10 w-10 text-ink-300" />
                  <p className="mt-4">{t('plan.noFlights')}</p>
                </div>
              : filtered.map((f, i) => (
                  <div
                    key={f.id}
                    className="card flex items-center gap-4 p-5 transition-all hover:shadow-md animate-stagger"
                    style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-terracotta-100 dark:bg-terracotta-900/40">
                      <Plane className="h-6 w-6 text-terracotta-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-sand-50">
                          {f.airline} {f.flight_number}
                        </h3>
                        {f.stops === 0 && (
                          <span className="chip bg-zellige-100 text-zellige-700">{t('common.direct')}</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-ink-500 dark:text-sand-400">
                        <span className="font-medium text-ink-700 dark:text-sand-200">
                          {displayOrigin(f)}{!usingCustomOrigin && ` (${f.origin_iata})`}
                        </span>
                        <ArrowRight className="h-4 w-4 text-ink-400" />
                        <span className="font-medium text-ink-700 dark:text-sand-200">
                          {displayDest(f)}{!usingCustomDest && ` (${f.destination_iata})`}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-ink-400 dark:text-sand-500">
                        <span>{f.departure_time} → {f.arrival_time}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(f.duration_minutes)}
                        </span>
                        <span className="capitalize">{f.cabin_class}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl font-semibold text-terracotta-700 dark:text-terracotta-400">
                        {formatPrice(f.price_minor, f.currency)}
                      </p>
                      <button
                        onClick={() => handleBookFlight(f)}
                        disabled={bookingFlight === f.flight_number}
                        className="btn-primary mt-2 text-xs"
                      >
                        {bookingFlight === f.flight_number ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> {t('booking.processing')}</>
                        ) : bookedFlight === f.flight_number ? (
                          <><Check className="h-3 w-3" /> {t('booking.confirmed')}</>
                        ) : (
                          <>{t('common.bookNow')}</>
                        )}
                      </button>
                      <button
                        onClick={() => onNavigate('/plan')}
                        className="btn-secondary mt-2 text-xs"
                      >
                        {t('common.includeInTripShort')}
                      </button>
                    </div>
                  </div>
                ))}
        </div>
      </div>
    </div>
  );
}

function formatPrice(minor: number, currency: string): string {
  const major = minor / 100;
  const symbol = currency === 'EUR' ? '€' : currency === 'MAD' ? 'DH' : currency === 'USD' ? '$' : currency;
  return `${major.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
