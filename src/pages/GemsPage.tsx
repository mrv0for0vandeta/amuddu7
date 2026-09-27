import { useEffect, useState } from 'react';
import { Sparkles, Search } from 'lucide-react';
import type { HiddenGem, Region } from '@/lib/types';
import { fetchGemsByRegion, fetchRegions } from '@/lib/data';
import { GemCard } from '@/components/GemCard';
import { useI18n } from '@/lib/i18n';

interface GemsPageProps {
  onNavigate: (path: string) => void;
}

export function GemsPage({ onNavigate }: GemsPageProps) {
  const { t } = useI18n();
  const [gems, setGems] = useState<HiddenGem[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [regionId, setRegionId] = useState('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'authenticity' | 'crowd_asc' | 'fit'>('authenticity');

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
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await fetchGemsByRegion(regionId);
        if (!mounted) return;
        setGems(data);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [regionId]);

  const filtered = applyGemFilters(gems, { search, sort });

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-zellige-600" />
          <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-sand-50">{t('nav.gems')}</h1>
        </div>
        <p className="mt-1 text-ink-500 dark:text-sand-400">
          Places ranked by authenticity and crowd level, not review volume.
          A busy place is described accurately, never marketed as undiscovered.
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

        {/* Search + sort */}
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gems..."
              className="input-field pl-10"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="input-field w-auto"
          >
            <option value="authenticity">Most authentic</option>
            <option value="crowd_asc">Quietest first</option>
            <option value="fit">Best fit</option>
          </select>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-terracotta-50 border border-terracotta-200 p-4 text-sm text-terracotta-700">
            {error}
          </div>
        )}

        {/* Results */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-64 skeleton" />
              ))
            : filtered.length === 0
              ? <div className="col-span-full py-16 text-center text-ink-500 dark:text-sand-400">
                  No gems found in this region yet.
                </div>
              : filtered.map((g) => (
                  <GemCard key={g.id} gem={g} onClick={() => onNavigate(`/gems/${g.id}`)} />
                ))}
        </div>
      </div>
    </div>
  );
}

function applyGemFilters(
  gems: HiddenGem[],
  opts: { search: string; sort: string },
): HiddenGem[] {
  let result = [...gems];
  if (opts.search) {
    const q = opts.search.toLowerCase();
    result = result.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }
  switch (opts.sort) {
    case 'authenticity':
      result.sort((a, b) => b.authenticity - a.authenticity);
      break;
    case 'crowd_asc':
      result.sort((a, b) => a.crowd_level - b.crowd_level);
      break;
    case 'fit':
      result.sort((a, b) => b.fit_score - a.fit_score);
      break;
  }
  return result;
}
