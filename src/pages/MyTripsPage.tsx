import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Wallet,
  Sparkles,
  MapPin,
  Clock,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import type { Trip } from '@/lib/types';
import { fetchAllTrips } from '@/lib/data';
import { useI18n } from '@/lib/i18n';

interface MyTripsPageProps {
  onNavigate: (path: string) => void;
}

export function MyTripsPage({ onNavigate }: MyTripsPageProps) {
  const { t } = useI18n();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchAllTrips();
        if (!mounted) return;
        setTrips(data);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="card h-96 skeleton" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-16 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-terracotta-400" />
        <p className="mt-4 text-ink-500 dark:text-sand-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <button onClick={() => onNavigate('/')} className="btn-ghost mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">
            My Trips
          </h1>
          <button onClick={() => onNavigate('/plan')} className="btn-primary">
            <Plus className="h-4 w-4" /> Plan a new trip
          </button>
        </div>

        {trips.length === 0 ? (
          <div className="mt-16 text-center">
            <MapPin className="mx-auto h-12 w-12 text-ink-300" />
            <h2 className="mt-4 font-display text-xl font-semibold text-ink-900 dark:text-sand-50">
              No trips yet
            </h2>
            <p className="mt-2 text-ink-500 dark:text-sand-400">
              Plan your first trip and we'll build a day-by-day itinerary for you.
            </p>
            <button onClick={() => onNavigate('/plan')} className="btn-primary mt-6">
              Plan a trip
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip, i) => (
              <button
                key={trip.id}
                onClick={() => onNavigate(`/trips/${trip.id}`)}
                className="card p-5 text-left transition-all hover:shadow-md animate-stagger"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">
                  {trip.title}
                </h3>
                <div className="mt-3 space-y-2 text-sm text-ink-500 dark:text-sand-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {trip.start_date} → {trip.end_date}
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    €{(trip.budget_minor / 100).toLocaleString()} {t('plan.total')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {trip.party_adults + trip.party_children} travellers
                  </div>
                </div>
                <span
                  className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs ${
                    trip.status === 'draft'
                      ? 'bg-sand-100 text-ink-500 dark:bg-ink-700 dark:text-sand-400'
                      : 'bg-zellige-100 text-zellige-700 dark:bg-zellige-900/30 dark:text-zellige-300'
                  }`}
                >
                  {trip.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
