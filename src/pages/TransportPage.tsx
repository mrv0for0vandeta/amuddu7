import { useEffect, useState } from 'react';
import { Bus, Train, Car, Search, Clock, ArrowRight, AlertCircle, Check, Loader2 } from 'lucide-react';
import type { TransportOption } from '@/lib/types';
import { fetchAllTransport, createBooking } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { CitySelect } from '@/components/CitySelect';

interface TransportPageProps {
  onNavigate: (path: string) => void;
}

const transportTypes = [
  { value: '', label: 'All' },
  { value: 'train', label: 'Trains' },
  { value: 'bus', label: 'Buses' },
  { value: 'small_taxi', label: 'Small taxis' },
  { value: 'grand_taxi', label: 'Grand taxis' },
  { value: 'private_transfer', label: 'Private transfers' },
];

export function TransportPage({ onNavigate }: TransportPageProps) {
  const { t } = useI18n();
  const [transport, setTransport] = useState<TransportOption[]>([]);
  const [bookingTransport, setBookingTransport] = useState<string | null>(null);
  const [bookedTransport, setBookedTransport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const isFirstLoad = transport.length === 0;
    isFirstLoad ? setLoading(true) : setRefreshing(true);
    (async () => {
      try {
        const data = await fetchAllTransport();
        if (!mounted) return;
        setTransport(data);
        const citySet = new Set<string>();
        data.forEach((t) => {
          citySet.add(t.origin_city);
          citySet.add(t.destination_city);
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
  }, []);

  async function handleBookTransport(tr: TransportOption) {
    const key = `${tr.provider}-${tr.origin_city}-${tr.destination_city}`;
    setBookingTransport(key);
    try {
      await createBooking({
        item_type: 'transport',
        title: `${tr.provider}: ${tr.origin_city} → ${tr.destination_city}`,
        provider_name: tr.provider,
        price_minor: tr.price_minor,
        currency: tr.currency,
        party_size: 1,
        luxury_level: tr.transport_type === 'private_transfer' ? 4 : 2,
      });
      setBookedTransport(key);
    } catch {
      setBookedTransport(null);
    } finally {
      setBookingTransport(null);
    }
  }

  const filtered = transport.filter((t) => {
    if (typeFilter && t.transport_type !== typeFilter) return false;
    if (originFilter && t.origin_city !== originFilter) return false;
    if (destFilter && t.destination_city !== destFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.provider.toLowerCase().includes(q) ||
      t.origin_city.toLowerCase().includes(q) ||
      t.destination_city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <div className="flex items-center gap-2">
          <Bus className="h-7 w-7 text-zellige-600" />
          <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-sand-50">{t('plan.transportTitle')}</h1>
        </div>
        <p className="mt-1 text-ink-500 dark:text-sand-400">
          {t('plan.transportDesc')}
        </p>

        {/* Route selectors */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
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

        {/* Type filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {transportTypes.map((tp) => (
            <button
              key={tp.value}
              onClick={() => setTypeFilter(tp.value)}
              className={typeFilter === tp.value ? 'chip-active' : 'chip-inactive'}
            >
              {tp.value === '' ? t('plan.all') : tp.value === 'train' ? t('plan.trains') : tp.value === 'bus' ? t('plan.buses') : tp.value === 'small_taxi' ? 'Small taxis' : tp.value === 'grand_taxi' ? t('plan.grandTaxis') : t('plan.privateTransfers')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('plan.searchTransport')}
            className="input-field pl-10"
          />
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-terracotta-50 border border-terracotta-200 p-4 text-sm text-terracotta-700">
            {error}
          </div>
        )}

        {/* Result count + loading indicator */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-ink-400 dark:text-sand-500">
            {loading || refreshing
              ? 'Searching transport...'
              : `${filtered.length} option${filtered.length !== 1 ? 's' : ''} found`}
          </p>
          {refreshing && <Loader2 className="h-4 w-4 animate-spin text-zellige-500" />}
        </div>

        {/* Results */}
        <div className="mt-4 space-y-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card h-28 skeleton" />
              ))
            : filtered.length === 0
              ? <div className="py-16 text-center text-ink-500 dark:text-sand-400 animate-fade-in-up">
                  <AlertCircle className="mx-auto h-10 w-10 text-ink-300" />
                  <p className="mt-4">{t('plan.noTransport')}</p>
                </div>
              : filtered.map((tr, i) => (
                  <div
                    key={tr.id}
                    className="card flex items-center gap-4 p-5 transition-all hover:shadow-md animate-stagger"
                    style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-sand-100 dark:bg-ink-800">
                      {transportIcon(tr.transport_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-sand-50">
                          {tr.provider}
                        </h3>
                        <span className="chip bg-sand-100 text-ink-600 capitalize dark:bg-ink-700 dark:text-sand-300">
                          {tr.transport_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-ink-500 dark:text-sand-400">
                        <span className="font-medium text-ink-700 dark:text-sand-200">{tr.origin_city}</span>
                        <ArrowRight className="h-4 w-4 text-ink-400" />
                        <span className="font-medium text-ink-700 dark:text-sand-200">{tr.destination_city}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-ink-400 dark:text-sand-500">
                        <span>{tr.departure_time} → {tr.arrival_time}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(tr.duration_minutes)}
                        </span>
                        <span>{tr.frequency}</span>
                        {tr.notes && <span className="italic">{tr.notes}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl font-semibold text-terracotta-700 dark:text-terracotta-400">
                        {formatPrice(tr.price_minor, tr.currency)}
                      </p>
                      <button
                        onClick={() => handleBookTransport(tr)}
                        disabled={bookingTransport === `${tr.provider}-${tr.origin_city}-${tr.destination_city}`}
                        className="btn-primary mt-2 text-xs"
                      >
                        {bookingTransport === `${tr.provider}-${tr.origin_city}-${tr.destination_city}` ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> {t('booking.processing')}</>
                        ) : bookedTransport === `${tr.provider}-${tr.origin_city}-${tr.destination_city}` ? (
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

function transportIcon(type: string): React.ReactNode {
  switch (type) {
    case 'train':
      return <Train className="h-6 w-6 text-zellige-600" />;
    case 'bus':
      return <Bus className="h-6 w-6 text-terracotta-500" />;
    case 'small_taxi':
      return <Car className="h-6 w-6 text-saffron-400" />;
    case 'grand_taxi':
      return <Car className="h-6 w-6 text-saffron-600" />;
    case 'private_transfer':
      return <Car className="h-6 w-6 text-ink-500" />;
    default:
      return <Bus className="h-6 w-6 text-ink-400" />;
  }
}

function formatPrice(minor: number, currency: string): string {
  const major = minor / 100;
  const symbol = currency === 'MAD' ? 'DH' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  return `${major.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
