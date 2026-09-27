import { useEffect, useState, useCallback } from 'react';
import { Search, SlidersHorizontal, X, GitCompare, Landmark, Compass, Sun, Palette, BedDouble, TrainFront, Utensils, Mountain, type LucideIcon } from 'lucide-react';
import { getCategoryIcon } from '@/lib/visuals';
import type { Listing, Region } from '@/lib/types';
import { fetchListingsByRegion, fetchRegions } from '@/lib/data';
import { searchWithDarija } from '@/lib/engine';
import { ListingCard } from '@/components/ListingCard';
import { useI18n } from '@/lib/i18n';

interface ListingsPageProps {
  onNavigate: (path: string) => void;
}

const categories = [
  { value: '', label: 'All', icon: null as LucideIcon | null },
  { value: 'tour', label: 'Tours', icon: Landmark },
  { value: 'guided_experience', label: 'Guided experiences', icon: Compass },
  { value: 'desert_experience', label: 'Desert', icon: Sun },
  { value: 'workshop', label: 'Workshops', icon: Palette },
  { value: 'stay', label: 'Stays', icon: BedDouble },
  { value: 'transfer', label: 'Transfers', icon: TrainFront },
  { value: 'meal', label: 'Meals', icon: Utensils },
  { value: 'activity', label: 'Activities', icon: Mountain },
];

const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Rating' },
  { value: 'duration', label: 'Duration' },
];

export function ListingsPage({ onNavigate }: ListingsPageProps) {
  const { t } = useI18n();
  const [listings, setListings] = useState<Listing[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regionId, setRegionId] = useState('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [luxuryFilter, setLuxuryFilter] = useState(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const luxuryOptions = [
    { value: 0, label: 'All tiers' },
    { value: 1, label: 'Budget' },
    { value: 2, label: 'Standard' },
    { value: 3, label: 'Premium' },
    { value: 4, label: 'Luxury' },
  ];

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

  useEffect(() => {
    let mounted = true;
    const isFirstLoad = listings.length === 0;
    isFirstLoad ? setLoading(true) : setRefreshing(true);
    (async () => {
      try {
        const data = await fetchListingsByRegion(regionId);
        if (!mounted) return;
        setListings(data);
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
  }, [regionId]);

  const filtered = applyFilters(listings, { category, search, sort, luxuryFilter });

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-sand-50">{t('nav.experiences')}</h1>
        <p className="mt-1 text-ink-500 dark:text-sand-400">
          {t('listing.priceNote')}
        </p>

        {/* Region tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {regions.map((r) => (
            <button
              key={r.id}
              onClick={() => setRegionId(r.id)}
              className={regionId === r.id ? 'chip-active whitespace-nowrap' : 'chip-inactive whitespace-nowrap'}
            >
              {r.name}
            </button>
          ))}
        </div>

        {/* Search + filter toggle */}
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search') + '...'}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="btn-secondary sm:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-field hidden w-auto sm:block"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Category chips */}
        <div className={`${showFilters ? 'flex' : 'hidden'} mt-4 flex-wrap gap-2 sm:flex`}>
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={category === c.value ? 'chip-active inline-flex items-center gap-1.5' : 'chip-inactive inline-flex items-center gap-1.5'}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Luxury tier filter */}
        <div className={`${showFilters ? 'flex' : 'hidden'} mt-3 flex-wrap items-center gap-2 sm:flex`}>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-sand-500">Luxury</span>
          {luxuryOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setLuxuryFilter(o.value)}
              className={luxuryFilter === o.value ? 'chip-active' : 'chip-inactive'}
            >
              {o.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-terracotta-50 border border-terracotta-200 p-4 text-sm text-terracotta-700">
            {error}
          </div>
        )}

        {/* Result count */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-ink-400 dark:text-sand-500">
            {loading || refreshing
              ? 'Loading experiences...'
              : `${filtered.length} experience${filtered.length !== 1 ? 's' : ''} found`}
          </p>
          {refreshing && <span className="text-xs text-ink-300">Updating...</span>}
        </div>

        {/* Results */}
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 group/card-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-72 skeleton" />
              ))
            : filtered.length === 0
              ? <div className="col-span-full py-16 text-center text-ink-500 dark:text-sand-400 animate-fade-in-up">
                  No experiences match these filters. Try a different category or region.
                </div>
              : filtered.map((l, i) => (
                  <div key={l.id} className="relative animate-stagger" style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}>
                    <ListingCard listing={l} onClick={() => onNavigate(`/listings/${l.id}`)} />
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCompare(l.id); }}
                      className={`absolute right-2 top-2 z-10 rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                        compareIds.includes(l.id)
                          ? 'bg-zellige-600 text-white shadow-md'
                          : 'bg-white/90 text-ink-600 opacity-0 group-hover:opacity-100 hover:bg-white'
                      }`}
                    >
                      <GitCompare className="h-3.5 w-3.5 inline" /> {compareIds.includes(l.id) ? 'Selected' : 'Compare'}
                    </button>
                  </div>
                ))}
        </div>

        {/* Compare bar */}
        {compareIds.length >= 2 && (
          <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink-900 px-5 py-3 text-white shadow-xl dark:bg-ink-800">
            <span className="text-sm font-medium">{compareIds.length} selected</span>
            <button
              onClick={() => onNavigate(`/compare?ids=${compareIds.join(',')}`)}
              className="rounded-lg bg-zellige-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-zellige-600"
            >
              Compare now
            </button>
            <button onClick={() => setCompareIds([])} className="text-sm text-sand-300 hover:text-white">
              Clear
            </button>
          </div>
        )}

        {showFilters && (
          <button
            onClick={() => setShowFilters(false)}
            className="btn-ghost mt-6 sm:hidden"
          >
            <X className="h-4 w-4" /> Close filters
          </button>
        )}
      </div>
    </div>
  );
}

function applyFilters(
  listings: Listing[],
  opts: { category: string; search: string; sort: string; luxuryFilter: number },
): Listing[] {
  let result = [...listings];
  if (opts.category) {
    result = result.filter((l) => l.category === opts.category);
  }
  if (opts.luxuryFilter > 0) {
    result = result.filter((l) => l.service_tier === opts.luxuryFilter);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        searchWithDarija(opts.search, l.title) ||
        searchWithDarija(opts.search, l.description),
    );
  }
  switch (opts.sort) {
    case 'price_asc':
      result.sort((a, b) => (a.price?.amount_minor ?? 0) - (b.price?.amount_minor ?? 0));
      break;
    case 'price_desc':
      result.sort((a, b) => (b.price?.amount_minor ?? 0) - (a.price?.amount_minor ?? 0));
      break;
    case 'rating':
      result.sort((a, b) => (b.provider?.avg_rating ?? 0) - (a.provider?.avg_rating ?? 0));
      break;
    case 'duration':
      result.sort((a, b) => a.duration_minutes - b.duration_minutes);
      break;
    case 'relevance':
    default:
      // Interleave so similar listings (same category or provider) are not adjacent.
      // When the user is searching, skip interleaving and keep search-result order.
      if (!opts.search) {
        result = interleaveListings(result);
      }
      break;
  }
  return result;
}

/**
 * Interleave listings so that no two adjacent items share the same category
 * or provider. Uses a round-robin approach: group by category, then pick one
 * from each group in rotation. Within each group, shuffle by provider.
 */
function interleaveListings(listings: Listing[]): Listing[] {
  if (listings.length <= 1) return listings;

  // Group listings by category
  const byCategory = new Map<string, Listing[]>();
  for (const l of listings) {
    const arr = byCategory.get(l.category) ?? [];
    arr.push(l);
    byCategory.set(l.category, arr);
  }

  // Sort groups by size (largest first) so we cycle through the biggest groups first
  const groups = [...byCategory.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([cat, items]) => {
      // Within each category, sort by provider to spread providers apart
      const sorted = [...items].sort((a, b) =>
        (a.provider_org_id ?? '').localeCompare(b.provider_org_id ?? ''),
      );
      return sorted;
    });

  const result: Listing[] = [];
  const indices = groups.map(() => 0);
  let remaining = listings.length;

  while (remaining > 0) {
    for (let g = 0; g < groups.length; g++) {
      if (indices[g] >= groups[g].length) continue;
      result.push(groups[g][indices[g]]);
      indices[g]++;
      remaining--;
    }
  }

  // Second pass: fix any remaining adjacencies where same provider appears twice in a row
  for (let i = 1; i < result.length; i++) {
    if (result[i].provider_org_id === result[i - 1].provider_org_id) {
      // Find the next item with a different provider and swap
      for (let j = i + 1; j < Math.min(i + 5, result.length); j++) {
        if (result[j].provider_org_id !== result[i - 1].provider_org_id &&
            result[j].category !== result[i - 1].category) {
          [result[i], result[j]] = [result[j], result[i]];
          break;
        }
      }
    }
  }

  return result;
}
