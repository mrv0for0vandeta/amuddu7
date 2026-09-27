import { Star, Clock, Users, Mountain } from 'lucide-react';
import type { Listing } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { getListingImage, getCategoryIcon } from '@/lib/visuals';

interface ListingCardProps {
  listing: Listing;
  onClick?: () => void;
}

export function ListingCard({ listing, onClick }: ListingCardProps) {
  const { t } = useI18n();
  const price = listing.price;
  const priceLabel = price
    ? formatPrice(price.amount_minor, price.currency)
    : t('common.priceOnRequest');

  const categoryLabel = t(`category.${listing.category}`) ?? listing.category;
  const difficultyLabel = '●'.repeat(listing.difficulty) + '○'.repeat(5 - listing.difficulty);

  const heroImage = getListingImage(listing.id, listing.visual_type, listing.category, listing.title, listing.region_id);
  const CategoryIcon = getCategoryIcon(listing.category, listing.title);

  return (
    <button
      onClick={onClick}
      className="card group flex flex-col overflow-hidden text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-sand-200 to-terracotta-200 dark:from-ink-700 dark:to-ink-600">
        <img
          src={heroImage}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Gradient overlay for icon legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/30 to-transparent" />
        {/* Category icon badge */}
        <div className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 shadow-md backdrop-blur-sm dark:bg-ink-900/80">
          <CategoryIcon className="h-5 w-5 text-terracotta-600 dark:text-terracotta-400" />
        </div>
        <span className="absolute left-3 top-3 chip bg-white/90 text-ink-700 backdrop-blur-sm dark:bg-ink-900/80 dark:text-sand-200">
          {categoryLabel}
        </span>
        {listing.service_tier >= 4 && (
          <span className="absolute right-3 top-3 chip bg-saffron-500 text-white">
            {t('common.luxury')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-base font-semibold leading-snug text-ink-900 group-hover:text-terracotta-700">
          {listing.title}
        </h3>
        <p className="line-clamp-2 text-sm text-ink-500">{listing.description}</p>

        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-ink-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(listing.duration_minutes)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {listing.min_party}–{listing.max_party}
          </span>
          <span className="flex items-center gap-1">
            <Mountain className="h-3.5 w-3.5" />
            {difficultyLabel}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-sand-100 pt-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-ink-600 dark:text-sand-300">
              {listing.provider?.display_name}
            </span>
            <span className="flex items-center gap-1 text-sm font-medium text-ink-700">
              {listing.provider && (
                <>
                  <Star className="h-4 w-4 fill-terracotta-400 text-terracotta-400" />
                  {listing.provider.avg_rating > 0
                    ? `${listing.provider.avg_rating} (${listing.provider.review_count})`
                    : 'New'}
                </>
              )}
            </span>
          </div>
          <span className="text-sm font-semibold text-terracotta-700">{priceLabel}</span>
        </div>
      </div>
    </button>
  );
}

function formatPrice(minor: number, currency: string): string {
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
