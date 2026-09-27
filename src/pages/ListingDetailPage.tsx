import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Users, Mountain, ShieldCheck, Star, Globe, AlertCircle, Calendar, Check, Loader2, MessageCircle } from 'lucide-react';
import { getListingImage, getCategoryIcon } from '@/lib/visuals';
import type { Listing } from '@/lib/types';
import { fetchListing, requestBooking, startConversation, idempotentRequestBooking } from '@/lib/data';
import { TrustPanel } from '@/components/TrustPanel';
import { Lock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface ListingDetailPageProps {
  listingId: string;
  onNavigate: (path: string) => void;
}

export function ListingDetailPage({ listingId, onNavigate }: ListingDetailPageProps) {
  const { t } = useI18n();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [luxuryLevel, setLuxuryLevel] = useState(listing?.service_tier ?? 2);
  const [bookingDate, setBookingDate] = useState('');
  const [booking, setBooking] = useState<null | { ok: boolean; error?: string }>(null);
  const [submitting, setSubmitting] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [trustViewed, setTrustViewed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchListing(listingId);
        if (!mounted) return;
        setListing(data);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [listingId]);

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="card h-96 skeleton" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="container-page py-16 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-terracotta-400" />
        <p className="mt-4 text-ink-500">{error ?? 'Listing not found.'}</p>
        <button onClick={() => onNavigate('/listings')} className="btn-secondary mt-6">
          Back to experiences
        </button>
      </div>
    );
  }

  const price = listing.price;
  const accessibility = listing.accessibility as Record<string, string | boolean>;
  const luxuryLevels = [
    { value: 1, label: t('plan.budgetTier') },
    { value: 2, label: t('plan.simple') },
    { value: 3, label: t('plan.comfortable') },
    { value: 4, label: t('plan.luxuryTier') },
  ];

  async function handleBook() {
    if (!listing) return;
    setSubmitting(true);
    setBooking(null);
    try {
      await idempotentRequestBooking({
        idempotencyKey: `booking-${listing.id}-${bookingDate || 'any'}-${partySize}-${Date.now()}`,
        listing_id: listing.id,
        item_type: listing.category,
        title: listing.title,
        image_url: listing.image_url ?? null,
        provider_name: listing.provider?.display_name ?? null,
        price_minor: price?.amount_minor ?? 0,
        currency: price?.currency ?? 'EUR',
        booking_date: bookingDate || null,
        party_size: partySize,
        luxury_level: luxuryLevel,
      });
      setBooking({ ok: true });
    } catch (e) {
      setBooking({ ok: false, error: e instanceof Error ? e.message : 'Booking failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMessage() {
    if (!listing) return;
    setMessaging(true);
    try {
      const conv = await startConversation({
        listing_id: listing.id,
        provider_org_id: listing.provider?.id ?? null,
        traveller_name: 'Traveller',
        traveller_contact: '',
        subject: `About: ${listing.title}`,
      });
      onNavigate(`/messages/${conv.id}`);
    } catch {
      setMessaging(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <button onClick={() => onNavigate('/listings')} className="btn-ghost mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Main */}
          <div>
            <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-sand-200 to-terracotta-200 dark:from-ink-700 dark:to-ink-600">
              <img
                src={getListingImage(listing.id, listing.visual_type, listing.category, listing.title, listing.region_id)}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/40 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                {(() => {
                  const Icon = getCategoryIcon(listing.category, listing.title);
                  return (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/90 shadow-lg backdrop-blur-sm dark:bg-ink-900/80">
                      <Icon className="h-6 w-6 text-terracotta-600 dark:text-terracotta-400" />
                    </div>
                  );
                })()}
              </div>
              {listing.service_tier >= 4 && (
                <span className="absolute right-4 top-4 chip bg-saffron-500 text-white">
                  {t('common.luxury')}
                </span>
              )}
            </div>

            <h1 className="mt-6 font-display text-3xl font-semibold text-ink-900">
              {listing.title}
            </h1>
            <p className="mt-3 text-ink-600">{listing.description}</p>

            {/* Key facts */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: <Clock className="h-5 w-5 text-terracotta-500" />, label: 'Duration', value: formatDuration(listing.duration_minutes) },
                { icon: <Users className="h-5 w-5 text-zellige-600" />, label: 'Group size', value: `${listing.min_party}–${listing.max_party}` },
                { icon: <Mountain className="h-5 w-5 text-saffron-600" />, label: 'Difficulty', value: '●'.repeat(listing.difficulty) + '○'.repeat(5 - listing.difficulty) },
                { icon: <Globe className="h-5 w-5 text-ink-500" />, label: 'Languages', value: listing.languages.join(', ') || '—' },
              ].map((f, i) => (
                <div key={i} className="card p-4">
                  <div className="flex items-center gap-2">
                    {f.icon}
                    <span className="text-xs text-ink-400">{f.label}</span>
                  </div>
                  <p className="mt-2 font-medium text-ink-800">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Accessibility (US-8) */}
            <div className="mt-6 card p-6">
              <h2 className="font-display text-lg font-semibold text-ink-900">Accessibility</h2>
              <p className="mt-2 text-sm text-ink-500">
                Structured notes, not prose. We show what we know so you can decide.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(accessibility).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg bg-sand-50 px-3 py-2">
                    <span className="text-sm capitalize text-ink-500">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-medium text-ink-700">
                      {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="mt-6 card p-6">
              <h2 className="font-display text-lg font-semibold text-ink-900">Price</h2>
              <p className="mt-2 text-sm text-ink-500">
                Set by the provider. Amuddu never adds a surcharge.
              </p>
              {price && (
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-semibold text-terracotta-700">
                    {formatPrice(price.amount_minor, price.currency)}
                  </span>
                  <span className="text-sm text-ink-500">
                    {price.pricing_unit.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar — Trust panel (US-2) */}
          <div>
            <div className="card sticky top-20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink-900">
                    {listing.provider?.display_name}
                  </h2>
                  <p className="text-xs capitalize text-ink-500">
                    {listing.provider?.category?.replace(/_/g, ' ')}
                  </p>
                </div>
                {listing.provider && listing.provider.service_tier >= 4 && (
                  <span className="chip bg-saffron-500 text-white">Luxury</span>
                )}
              </div>

              {listing.provider?.bio && (
                <p className="mt-3 text-sm text-ink-500">{listing.provider.bio}</p>
              )}

              {listing.provider && (
                <div className="mt-4">
                  <TrustPanel provider={listing.provider} />
                  <button
                    onClick={() => setTrustViewed(true)}
                    className="mt-2 w-full rounded-lg border border-sand-200 py-2 text-xs text-ink-500 dark:border-ink-700 dark:text-sand-400"
                  >
                    {trustViewed ? '✓ Trust information reviewed' : 'Review trust information to message'}
                  </button>
                </div>
              )}

              <div className="mt-6 border-t border-sand-200 pt-4">
                <p className="text-sm text-ink-500">
                  {t('listing.messageProvider')}
                </p>

                {/* Booking panel */}
                <div className="mt-4 space-y-4 rounded-xl bg-sand-50 p-4 dark:bg-ink-800">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-sand-500">
                      {t('booking.date')}
                    </label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="input-field mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-sand-500">
                      {t('booking.partySize')}
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                        className="btn-secondary h-9 w-9 p-0 text-lg"
                      >−</button>
                      <span className="min-w-[2rem] text-center font-medium text-ink-800 dark:text-sand-100">{partySize}</span>
                      <button
                        onClick={() => setPartySize((p) => Math.min(listing.max_party, p + 1))}
                        className="btn-secondary h-9 w-9 p-0 text-lg"
                      >+</button>
                      <span className="ml-2 text-xs text-ink-400 dark:text-sand-500">
                        {t('booking.maxParty')}: {listing.max_party}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-sand-500">
                      {t('plan.luxury')}
                    </label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {luxuryLevels.map((lvl) => (
                        <button
                          key={lvl.value}
                          onClick={() => setLuxuryLevel(lvl.value)}
                          className={luxuryLevel === lvl.value ? 'chip-active' : 'chip-inactive'}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {booking?.ok && (
                    <div className="flex items-center gap-2 rounded-lg bg-zellige-50 p-3 text-sm text-zellige-700 dark:bg-ink-700 dark:text-zellige-300">
                      <Check className="h-4 w-4" /> Booking requested! The provider will send you a quote. <button onClick={() => onNavigate('/bookings')} className="ml-1 underline">View in My Bookings</button>
                    </div>
                  )}
                  {booking && !booking.ok && (
                    <div className="flex items-center gap-2 rounded-lg bg-terracotta-50 p-3 text-sm text-terracotta-700 dark:bg-ink-700 dark:text-terracotta-300">
                      <AlertCircle className="h-4 w-4" /> {booking.error}
                    </div>
                  )}

                  <button
                    onClick={handleBook}
                    disabled={submitting}
                    className="btn-primary w-full"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> {t('booking.processing')}</>
                    ) : (
                      <><Calendar className="h-4 w-4" /> Request booking</>
                    )}
                  </button>

                  <button
                    onClick={handleMessage}
                    disabled={messaging || (!trustViewed && !!listing.provider)}
                    className="btn-secondary w-full"
                  >
                    {messaging ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Starting conversation...</>
                    ) : !trustViewed && listing.provider ? (
                      <><Lock className="h-4 w-4" /> Review trust info to message</>
                    ) : (
                      <><MessageCircle className="h-4 w-4" /> Message provider</>
                    )}
                  </button>

                  <button
                    onClick={() => onNavigate('/plan')}
                    className="btn-ghost w-full"
                  >
                    {t('common.includeInTrip')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
