import { Sparkles, TrendingDown, Eye } from 'lucide-react';
import type { HiddenGem } from '@/lib/types';
import { getHeroImage } from '@/lib/visuals';

interface GemCardProps {
  gem: HiddenGem;
  onClick?: () => void;
}

export function GemCard({ gem, onClick }: GemCardProps) {
  const crowdLabel =
    gem.crowd_level < 0.3
      ? 'Quiet and uncrowded'
      : gem.crowd_level < 0.6
        ? 'Growing in popularity'
        : 'Well-discovered';

  const crowdIcon =
    gem.crowd_level < 0.3 ? <Eye className="h-4 w-4 text-zellige-600" /> : <TrendingDown className="h-4 w-4 text-saffron-500" />;

  return (
    <button
      onClick={onClick}
      className="card group flex flex-col text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-zellige-200 to-zellige-400 dark:from-ink-700 dark:to-ink-600">
        <img
          src={gem.image_url || getHeroImage(gem.region_id)}
          alt={gem.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/30 to-transparent" />
        <span className="absolute left-3 top-3 chip bg-white/90 text-ink-700 backdrop-blur-sm dark:bg-ink-900/80 dark:text-sand-200">
          Hidden gem
        </span>
        <span
          className={`absolute right-3 top-3 chip backdrop-blur-sm ${
            gem.crowd_level < 0.3
              ? 'bg-zellige-500 text-white'
              : 'bg-saffron-500 text-white'
          }`}
        >
          {crowdLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-base font-semibold leading-snug text-ink-900 group-hover:text-zellige-700 dark:text-sand-50 dark:group-hover:text-zellige-400">
          {gem.name}
        </h3>
        <p className="line-clamp-2 text-sm text-ink-500 dark:text-sand-400">{gem.description}</p>

        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-ink-500 dark:text-sand-400">
          <span className="flex items-center gap-1">
            {crowdIcon}
            {crowdLabel}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-sand-100 pt-3 dark:border-ink-800">
          {gem.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="chip bg-sand-100 text-ink-500 dark:bg-ink-800 dark:text-sand-400">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
