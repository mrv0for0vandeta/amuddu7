import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X, Star, Clock, Users, Mountain, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { getCategoryIcon } from '@/lib/visuals';
import type { Listing } from '@/lib/types';
import { fetchListing } from '@/lib/data';
import { compareListings, type RankedListing, rankListings } from '@/lib/engine';
import type { TripInput } from '@/lib/types';

interface ComparisonPageProps {
  listingIds: string[];
  onNavigate: (path: string) => void;
}

// FR-5: structured comparison of 2-4 options. FR-6: one sentence
// naming the actual tradeoff. Per Handbook §20.2 the sentence
// must name the real downside — listing only positives is a
// consumer-protection exposure.
export function ComparisonPage({ listingIds, onNavigate }: ComparisonPageProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const results = await Promise.all(listingIds.map((id) => fetchListing(id)));
        if (!mounted) return;
        setListings(results.filter((l): l is Listing => l !== null));
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [listingIds.join(',')]);

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="card h-96 skeleton" />
      </div>
    );
  }

  if (error || listings.length < 2) {
    return (
      <div className="container-page py-16 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-terracotta-400" />
        <p className="mt-4 text-ink-500">
          {error ?? 'Need at least two listings to compare.'}
        </p>
        <button onClick={() => onNavigate('/listings')} className="btn-secondary mt-6">
          Browse experiences
        </button>
      </div>
    );
  }

  // Rank for the comparison tradeoff sentence
  const defaultInput: TripInput = {
    region_id: listings[0].region_id,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    budget_minor: 200000,
    budget_currency: 'EUR',
    party_adults: 2,
    party_children: 0,
    pace: 3,
    luxury_level: 3,
    stamina: 3,
    interests: ['culture', 'food', 'adventure'],
  };
  const ranked: RankedListing[] = listings.map((l) => rankListings(l, defaultInput));
  const comparison = compareListings(ranked);

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <button onClick={() => onNavigate('/listings')} className="btn-ghost mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="font-display text-3xl font-semibold text-ink-900">
          Compare
        </h1>
        <p className="mt-1 text-ink-500">
          Structured fields only. Every claim is traceable to a verified value.
        </p>

        {/* Tradeoff sentence (FR-6) */}
        {comparison.tradeoffSentence && (
          <div className="mt-6 rounded-xl bg-zellige-50 border border-zellige-200 p-4">
            <p className="text-sm text-zellige-800">
              <span className="font-medium">The tradeoff: </span>
              {comparison.tradeoffSentence}
            </p>
          </div>
        )}

        {/* Comparison matrix */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-48 border-b border-sand-200 p-4 text-left text-xs font-medium uppercase tracking-wide text-ink-400">
                  Attribute
                </th>
                {listings.map((l) => (
                  <th key={l.id} className="border-b border-sand-200 p-4 text-left">
                    <div className="flex items-start gap-2">
                      {(() => {
                        const Icon = getCategoryIcon(l.category, l.title);
                        return (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-terracotta-100 dark:bg-ink-800">
                            <Icon className="h-4.5 w-4.5 text-terracotta-600 dark:text-terracotta-400" />
                          </div>
                        );
                      })()}
                      <div>
                        <h3 className="font-display text-base font-semibold text-ink-900">
                          {l.title}
                        </h3>
                        <p className="text-xs text-ink-400">{l.provider?.display_name}</p>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row, ri) => (
                <tr key={row.label} className={ri % 2 === 0 ? 'bg-sand-50/50' : ''}>
                  <td className="p-4 text-sm font-medium text-ink-600">{row.label}</td>
                  {row.values.map((val, ci) => (
                    <td key={ci} className="p-4 text-sm text-ink-700">
                      {val ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trust strip */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <div key={l.id} className="card p-5">
              <h3 className="font-display text-sm font-semibold text-ink-900">
                {l.provider?.display_name}
              </h3>
              <div className="mt-3 flex items-center gap-3 text-xs text-ink-500">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-terracotta-400 text-terracotta-400" />
                  {l.provider && l.provider.avg_rating > 0 ? `${l.provider.avg_rating}/5` : 'New'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {l.provider?.response_time_hours}h avg
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {l.min_party}–{l.max_party}
                </span>
                <span className="flex items-center gap-1">
                  <Mountain className="h-3.5 w-3.5" />
                  {'●'.repeat(l.difficulty)}{'○'.repeat(5 - l.difficulty)}
                </span>
                {l.languages.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {l.languages.join(', ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          {listings.map((l) => (
            <button
              key={l.id}
              onClick={() => onNavigate(`/listings/${l.id}`)}
              className="btn-secondary"
            >
              View {l.title} <ArrowRight className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
