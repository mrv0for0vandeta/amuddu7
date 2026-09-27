import { useEffect, useState } from 'react';
import {
  Calendar,
  Wallet,
  Sparkles,
  Lock,
  Clock,
  MapPin,
  Plane,
  Train,
  AlertTriangle,
} from 'lucide-react';
import type { Trip, TripVersion, TripDay, TripItem } from '@/lib/types';
import { fetchTripByShareToken } from '@/lib/data';
import { explainReasons } from '@/lib/engine';

interface SharedTripPageProps {
  token: string;
}

export function SharedTripPage({ token }: SharedTripPageProps) {
  const [data, setData] = useState<{ trip: Trip; version: TripVersion; days: (TripDay & { items: TripItem[] })[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await fetchTripByShareToken(token);
        if (!mounted) return;
        if (!result) {
          setError('This trip link is invalid or has expired.');
          return;
        }
        setData(result);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="card h-96 skeleton" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-page py-16 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-terracotta-400" />
        <p className="mt-4 text-ink-500 dark:text-sand-400">{error ?? 'Trip not found.'}</p>
      </div>
    );
  }

  const { trip, version, days } = data;
  const budget = version.budget_alloc as Record<string, number | string>;

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <div className="rounded-xl bg-zellige-50 p-3 text-center text-sm text-zellige-700 dark:bg-zellige-900/20 dark:text-zellige-300">
          You're viewing a shared trip. This is view-only.
        </div>

        <div className="mt-6">
          <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-sand-50">
            {trip.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-ink-500 dark:text-sand-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {trip.start_date} → {trip.end_date}
            </span>
            <span className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4" />
              €{(trip.budget_minor / 100).toLocaleString()} total
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              {days.length} {days.length === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>

        {/* Budget */}
        {typeof budget.justification === 'string' && (
          <div className="mt-6 card p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">Budget</h2>
            <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">{budget.justification}</p>
          </div>
        )}

        {/* Days */}
        <div className="mt-8 space-y-6">
          {days.map((day) => (
            <div key={day.id} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-sand-100 bg-sand-50 px-5 py-3 dark:border-ink-800 dark:bg-ink-800/50">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">
                    Day {day.day_number}
                  </h2>
                  <p className="text-xs text-ink-400 dark:text-sand-500">{day.date}</p>
                </div>
                <p className="text-xs text-ink-500 dark:text-sand-400">{day.summary}</p>
              </div>
              <div className="divide-y divide-sand-100 dark:divide-ink-800">
                {day.items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-5">
                    <div className="flex w-20 flex-shrink-0 flex-col items-center gap-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100 dark:bg-ink-800">
                        {itemIcon(item)}
                      </div>
                      {item.start_time && (
                        <span className="text-xs text-ink-400 dark:text-sand-500">{item.start_time}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-sand-50">
                          {item.title}
                        </h3>
                        {item.locked && (
                          <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-sand-300">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">{item.description}</p>
                      )}
                      {item.est_cost_minor > 0 && (
                        <span className="text-sm font-medium text-terracotta-700 dark:text-terracotta-400">
                          {formatPrice(item.est_cost_minor, item.est_currency)}
                        </span>
                      )}
                      {item.reason_set && item.reason_set.length > 0 && (
                        <div className="mt-2 rounded-lg bg-zellige-50 p-3 dark:bg-zellige-900/30">
                          <p className="text-xs text-zellige-700 dark:text-zellige-300">
                            <span className="font-medium">Why: </span>
                            {explainReasons(item.reason_set)}.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function itemIcon(item: TripItem): React.ReactNode {
  switch (item.item_type) {
    case 'stay': return <Clock className="h-5 w-5 text-ink-400" />;
    case 'meal': return <Sparkles className="h-5 w-5 text-terracotta-400" />;
    case 'gem': return <Sparkles className="h-5 w-5 text-zellige-500" />;
    case 'activity': return <MapPin className="h-5 w-5 text-terracotta-500" />;
    case 'flight': return <Plane className="h-5 w-5 text-terracotta-600" />;
    case 'transport': return <Train className="h-5 w-5 text-zellige-600" />;
    case 'transfer': return <MapPin className="h-5 w-5 text-zellige-600" />;
    default: return <Clock className="h-5 w-5 text-ink-400" />;
  }
}

function formatPrice(minor: number, currency: string): string {
  const major = minor / 100;
  const symbol = currency === 'MAD' ? 'DH' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  return `${major.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
}
