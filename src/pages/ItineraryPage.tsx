import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Calendar,
  Wallet,
  Sparkles,
  Lock,
  Unlock,
  ThumbsUp,
  ThumbsDown,
  Clock,
  MapPin,
  Plane,
  Train,
  Bus,
  Car,
  AlertTriangle,
  Loader2,
  History,
  CheckCircle2,
  Share2,
  Check,
  X,
  Star,
  ArrowRightLeft,
  Trash2,
  GripVertical,
  MessageCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { Trip, TripVersion, TripDay, TripItem, Listing, TransportOption, HiddenGem } from '@/lib/types';
import { fetchTrip, recordFeedback, fetchListingsByCategoryAndRegion, fetchTransportAlternatives, fetchGemAlternatives, updateTripItem, removeTripItem, toggleItemLock, reorderTripItems, createTripShare, startConversation, markTripComplete, fetchTripVersions } from '@/lib/data';
import { SimpleMap } from '@/components/SimpleMap';
import { explainReasons } from '@/lib/engine';
import { getListingImage } from '@/lib/visuals';
import { useI18n } from '@/lib/i18n';

interface ItineraryPageProps {
  tripId: string;
  onNavigate: (path: string) => void;
}

export function ItineraryPage({ tripId, onNavigate }: ItineraryPageProps) {
  const { t } = useI18n();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [version, setVersion] = useState<TripVersion | null>(null);
  const [days, setDays] = useState<(TripDay & { items: TripItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [switchingItem, setSwitchingItem] = useState<TripItem | null>(null);
  const [listingAlts, setListingAlts] = useState<Listing[]>([]);
  const [transportAlts, setTransportAlts] = useState<TransportOption[]>([]);
  const [gemAlts, setGemAlts] = useState<HiddenGem[]>([]);
  const [altLoading, setAltLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [togglingLock, setTogglingLock] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [messagingItem, setMessagingItem] = useState<TripItem | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<TripVersion[]>([]);
  const [completing, setCompleting] = useState(false);
  const [livePace, setLivePace] = useState(trip?.pace ?? 3);
  const [liveLuxury, setLiveLuxury] = useState(trip?.luxury_level ?? 2);
  const [reoptimising, setReoptimising] = useState(false);
  const [diffSummary, setDiffSummary] = useState<{ added: string[]; removed: string[]; unchanged: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchTrip(tripId);
        if (!mounted) return;
        if (!data) {
          setError(t('plan.tripNotFound'));
          return;
        }
        setTrip(data.trip);
        setVersion(data.version);
        setDays(data.days);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tripId, t]);

  const handleFeedback = async (itemId: string, thumbs: 'up' | 'down') => {
    try {
      await recordFeedback(itemId, null, thumbs);
      setFeedbackGiven((prev) => new Set([...prev, itemId]));
    } catch {
      /* ignore — feedback is best-effort */
    }
  };

  const openSwitchProvider = useCallback(async (item: TripItem) => {
    if (!trip) return;
    setSwitchingItem(item);
    setListingAlts([]);
    setTransportAlts([]);
    setGemAlts([]);
    setAltLoading(true);
    try {
      if (item.item_type === 'transport') {
        const alts = await fetchTransportAlternatives(trip.region_id);
        setTransportAlts(alts);
      } else if (item.item_type === 'gem') {
        const alts = await fetchGemAlternatives(trip.region_id, item.gem_id ?? undefined);
        setGemAlts(alts);
      } else {
        const cat = item.item_type === 'stay' ? 'stay' : item.item_type === 'meal' ? 'meal' : 'activity';
        const alts = await fetchListingsByCategoryAndRegion(cat, trip.region_id, item.listing_id ?? undefined);
        setListingAlts(alts);
      }
    } catch {
      /* ignore */
    } finally {
      setAltLoading(false);
    }
  }, [trip]);

  const handleSwitchListing = async (item: TripItem, alt: Listing) => {
    setSwitching(item.id);
    try {
      const newTitle = alt.title;
      const newDesc = alt.description ?? item.description;
      const newPrice = alt.price?.amount_minor ?? item.est_cost_minor;
      const newCurrency = alt.price?.currency ?? item.est_currency;
      await updateTripItem(item.id, {
        title: newTitle, description: newDesc, listing_id: alt.id,
        est_cost_minor: newPrice, est_currency: newCurrency,
      });
      setDays((prev) => prev.map((day) => ({
        ...day,
        items: day.items.map((it) => it.id === item.id
          ? { ...it, title: newTitle, description: newDesc, listing_id: alt.id, est_cost_minor: newPrice, est_currency: newCurrency }
          : it),
      })));
      setSwitchingItem(null);
    } catch { /* ignore */ } finally { setSwitching(null); }
  };

  const handleSwitchTransport = async (item: TripItem, alt: TransportOption) => {
    setSwitching(item.id);
    try {
      const newTitle = `${alt.provider}: ${alt.origin_city} to ${alt.destination_city}`;
      const newDesc = `${alt.transport_type.replace(/_/g, ' ')}. ${alt.notes}`;
      await updateTripItem(item.id, {
        title: newTitle, description: newDesc,
        est_cost_minor: alt.price_minor, est_currency: alt.currency,
      });
      setDays((prev) => prev.map((day) => ({
        ...day,
        items: day.items.map((it) => it.id === item.id
          ? { ...it, title: newTitle, description: newDesc, est_cost_minor: alt.price_minor, est_currency: alt.currency }
          : it),
      })));
      setSwitchingItem(null);
    } catch { /* ignore */ } finally { setSwitching(null); }
  };

  const handleSwitchGem = async (item: TripItem, alt: HiddenGem) => {
    setSwitching(item.id);
    try {
      const newTitle = alt.name;
      const newDesc = alt.description;
      await updateTripItem(item.id, {
        title: newTitle, description: newDesc, gem_id: alt.id,
        est_cost_minor: 0,
      });
      setDays((prev) => prev.map((day) => ({
        ...day,
        items: day.items.map((it) => it.id === item.id
          ? { ...it, title: newTitle, description: newDesc, gem_id: alt.id, est_cost_minor: 0 }
          : it),
      })));
      setSwitchingItem(null);
    } catch { /* ignore */ } finally { setSwitching(null); }
  };

  const handleRemoveItem = async (item: TripItem) => {
    setRemoving(item.id);
    try {
      await removeTripItem(item.id);
      setDays((prev) => prev.map((day) => ({
        ...day,
        items: day.items.filter((it) => it.id !== item.id),
      })));
    } catch { /* ignore */ } finally { setRemoving(null); }
  };

  const handleToggleLock = async (item: TripItem) => {
    setTogglingLock(item.id);
    try {
      const newLocked = !item.locked;
      await toggleItemLock(item.id, newLocked, newLocked ? 'User locked' : null);
      setDays((prev) => prev.map((day) => ({
        ...day,
        items: day.items.map((it) => it.id === item.id
          ? { ...it, locked: newLocked, lock_reason: newLocked ? 'User locked' : null }
          : it),
      })));
    } catch { /* ignore */ } finally { setTogglingLock(null); }
  };

  const handleMoveItem = async (item: TripItem, direction: 'up' | 'down') => {
    const day = days.find((d) => d.items.some((it) => it.id === item.id));
    if (!day) return;
    const items = [...day.items].sort((a, b) => a.position - b.position);
    const idx = items.findIndex((it) => it.id === item.id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === items.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const swapItem = items[swapIdx];
    const updates = [
      { id: item.id, position: swapItem.position },
      { id: swapItem.id, position: item.position },
    ];
    // Optimistic update
    setDays((prev) => prev.map((d) => {
      if (d.id !== day.id) return d;
      return {
        ...d,
        items: d.items.map((it) => {
          if (it.id === item.id) return { ...it, position: swapItem.position };
          if (it.id === swapItem.id) return { ...it, position: item.position };
          return it;
        }).sort((a, b) => a.position - b.position),
      };
    }));
    try {
      await reorderTripItems(updates);
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const share = await createTripShare(tripId);
      const url = `${window.location.origin}/#/shared/${share.share_token}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
    } catch { /* ignore */ } finally { setShareLoading(false); }
  };

  const handleShowVersions = async () => {
    if (showVersions) { setShowVersions(false); return; }
    try { setVersions(await fetchTripVersions(tripId)); setShowVersions(true); } catch { /* ignore */ }
  };

  const handleMarkComplete = async () => {
    setCompleting(true);
    try { await markTripComplete(tripId); } catch { /* ignore */ } finally { setCompleting(false); }
  };

  const handleReoptimise = async () => {
    setReoptimising(true);
    setDiffSummary(null);
    try {
      // Capture current items before re-optimisation
      const oldItems = new Set<string>();
      days.forEach((d) => d.items.forEach((i) => oldItems.add(i.title)));

      // Update trip with new pace/luxury
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('trip').update({
        pace: livePace,
        luxury_level: liveLuxury,
      }).eq('id', tripId);

      // Reload trip data
      const fresh = await fetchTrip(tripId);
      if (fresh) {
        setTrip(fresh);
        const v = fresh.versions[0];
        if (v) {
          setVersion(v);
          setDays(v.days);
        }
      }

      // Compute diff (T-24)
      const newItems = new Set<string>();
      const freshDays = fresh?.versions[0]?.days ?? days;
      freshDays.forEach((d) => d.items.forEach((i) => newItems.add(i.title)));

      const added: string[] = [];
      const removed: string[] = [];
      newItems.forEach((t) => { if (!oldItems.has(t)) added.push(t); });
      oldItems.forEach((t) => { if (!newItems.has(t)) removed.push(t); });

      const unchanged = Array.from(oldItems).filter((t) => newItems.has(t)).length;
      setDiffSummary({ added, removed, unchanged });
    } catch { /* ignore */ } finally {
      setReoptimising(false);
    }
  };

  const handleMessageProvider = async (item: TripItem) => {
    setMessagingItem(item);
    try {
      const conv = await startConversation({
        trip_item_id: item.id,
        listing_id: item.listing_id,
        provider_org_id: null as unknown as string,
        traveller_name: 'Traveller',
        traveller_contact: '',
        subject: `About: ${item.title}`,
      });
      onNavigate(`/messages/${conv.id}`);
    } catch { /* ignore */ } finally { setMessagingItem(null); }
  };

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="card h-96 skeleton" />
      </div>
    );
  }

  if (error || !trip || !version) {
    return (
      <div className="container-page py-16 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-terracotta-400" />
        <p className="mt-4 text-ink-500 dark:text-sand-400">{error ?? t('plan.tripNotFound')}</p>
        <button onClick={() => onNavigate('/plan')} className="btn-secondary mt-6">
          {t('plan.planNew')}
        </button>
      </div>
    );
  }

  const budget = version.budget_alloc as Record<string, number | string>;
  const totalDays = days.length;

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <button onClick={() => onNavigate('/plan')} className="btn-ghost mb-6">
          <ArrowLeft className="h-4 w-4" /> {t('plan.planAnother')}
        </button>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
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
                €{(trip.budget_minor / 100).toLocaleString()} {t('plan.total')}
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                {totalDays} {totalDays === 1 ? t('plan.day') : t('plan.days')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {shareUrl && (
              <span className="flex items-center gap-1 text-xs text-zellige-600 dark:text-zellige-400 animate-fade-in-up">
                <Check className="h-3.5 w-3.5" /> Link copied!
              </span>
            )}
            <button onClick={handleShare} disabled={shareLoading} className="btn-secondary">
              {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              {t('plan.shareTrip')}
            </button>
            <button onClick={handleShowVersions} className="btn-ghost text-sm">
              <History className="h-4 w-4" /> Versions
            </button>
            <button onClick={handleMarkComplete} disabled={completing} className="btn-ghost text-sm text-zellige-600">
              {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark complete
            </button>
          </div>
          {showVersions && (
            <div className="mt-3 rounded-xl bg-sand-50 p-4 dark:bg-ink-800 animate-fade-in-up">
              <h4 className="font-medium text-ink-900 dark:text-sand-50">Version history</h4>
              <div className="mt-2 space-y-1">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center gap-2 text-sm text-ink-500 dark:text-sand-400">
                    <Clock className="h-3 w-3" />
                    <span>v{v.version_number} · {new Date(v.generated_at).toLocaleString()}</span>
                    {v.id === version.id && <span className="text-xs text-zellige-600">(current)</span>}
                  </div>
                ))}
                {versions.length === 0 && <p className="text-xs text-ink-400">No saved versions.</p>}
              </div>
            </div>
          )}
        </div>

        {/* Live re-optimisation controls (T-23, T-24) */}
        <div className="mt-6 card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-terracotta-500" /> Adjust plan
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">
            Change a slider to re-optimise unlocked items. Locked items stay fixed.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink-700 dark:text-sand-300">
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Pace</span>
                <span className="text-xs text-ink-400">{['Relaxed', 'Easy', 'Balanced', 'Full', 'Packed'][trip.pace - 1]}</span>
              </label>
              <input type="range" min={1} max={5} value={trip.pace} onChange={(e) => setLivePace(Number(e.target.value))} className="w-full accent-terracotta-500" />
            </div>
            <div>
              <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink-700 dark:text-sand-300">
                <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Luxury level</span>
                <span className="text-xs text-ink-400">{['Budget', 'Simple', 'Comfortable', 'Luxury'][trip.luxury_level - 1]}</span>
              </label>
              <input type="range" min={1} max={4} value={trip.luxury_level} onChange={(e) => setLiveLuxury(Number(e.target.value))} className="w-full accent-terracotta-500" />
            </div>
            <button onClick={handleReoptimise} disabled={reoptimising} className="btn-primary text-sm">
              {reoptimising ? <><Loader2 className="h-4 w-4 animate-spin" /> Re-optimising...</> : 'Re-optimise plan'}
            </button>
          </div>
          {diffSummary && (
            <div className="mt-4 rounded-xl bg-zellige-50 p-4 dark:bg-zellige-900/30 animate-fade-in-up">
              <h4 className="text-sm font-medium text-zellige-700 dark:text-zellige-300">What changed (T-24)</h4>
              <ul className="mt-2 space-y-1">
                {diffSummary.added.map((item, i) => (
                  <li key={`add-${i}`} className="flex items-center gap-1.5 text-xs text-zellige-700 dark:text-zellige-300">
                    <CheckCircle2 className="h-3 w-3" /> Added: {item}
                  </li>
                ))}
                {diffSummary.removed.map((item, i) => (
                  <li key={`rem-${i}`} className="flex items-center gap-1.5 text-xs text-terracotta-600">
                    <X className="h-3 w-3" /> Removed: {item}
                  </li>
                ))}
                {diffSummary.unchanged > 0 && (
                  <li className="flex items-center gap-1.5 text-xs text-ink-400">
                    <Lock className="h-3 w-3" /> {diffSummary.unchanged} items kept (locked or still optimal)
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Basic maps (T-40) */}
        <div className="mt-6 card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-terracotta-500" /> Trip map
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">Walking and driving directions between items.</p>
          <div className="mt-4">
            <SimpleMap
              points={days.flatMap((d) => d.items.map((item) => ({
                id: item.id,
                name: item.title,
                category: item.item_type,
                lat: item.listing?.meeting_lat,
                lng: item.listing?.meeting_lng,
              }))).filter((p) => p.lat && p.lng)}
              height="350px"
              showDirections
            />
          </div>
        </div>

        {/* Budget allocation */}
        <div className="mt-6 card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">
            {t('plan.budgetAllocation')}
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">
            {typeof budget.justification === 'string' ? budget.justification : ''}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['accommodation', 'transport', 'food', 'activities'] as const).map((cat) => {
              const val = budget[cat];
              const pct = totalDays > 0 && typeof val === 'number' ? Math.round((val / (trip.budget_minor / 100)) * 100) : 0;
              return (
                <div key={cat} className="rounded-lg bg-sand-50 p-4 dark:bg-ink-800">
                  <p className="text-xs capitalize text-ink-400 dark:text-sand-500">{t(`plan.${cat}`)}</p>
                  <p className="mt-1 font-display text-lg font-semibold text-ink-800 dark:text-sand-100">
                    €{typeof val === 'number' ? val.toLocaleString() : 0}
                    <span className="text-xs font-normal text-ink-400 dark:text-sand-500">/{t('plan.day').toLowerCase()}</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sand-200 dark:bg-ink-700">
                    <div
                      className="h-full rounded-full bg-terracotta-500 transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Days */}
        <div className="mt-8 space-y-6">
          {days.map((day) => (
            <div key={day.id} className="card overflow-hidden">
              {/* Day header */}
              <div className="flex items-center justify-between border-b border-sand-100 bg-sand-50 px-5 py-3 dark:border-ink-800 dark:bg-ink-800/50">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">
                    {t('plan.day')} {day.day_number}
                  </h2>
                  <p className="text-xs text-ink-400 dark:text-sand-500">{day.date}</p>
                </div>
                <p className="text-xs text-ink-500 dark:text-sand-400">{day.summary}</p>
              </div>

              {/* Items */}
              <div className="divide-y divide-sand-100 dark:divide-ink-800">
                {day.items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-5">
                    {/* Time + icon */}
                    <div className="flex w-20 flex-shrink-0 flex-col items-center gap-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100 dark:bg-ink-800">
                        {itemIcon(item)}
                      </div>
                      {item.start_time && (
                        <span className="text-xs text-ink-400 dark:text-sand-500">{item.start_time}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-base font-semibold text-ink-900 dark:text-sand-50">
                              {item.title}
                            </h3>
                            {item.locked && (
                              <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-sand-300">
                                <Lock className="h-3 w-3" /> {t('plan.locked')}
                              </span>
                            )}
                          </div>
                          {item.est_cost_minor > 0 && (
                            <span className="text-sm font-medium text-terracotta-700 dark:text-terracotta-400">
                              {formatPrice(item.est_cost_minor, item.est_currency)}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.description && (
                        <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">{item.description}</p>
                      )}

                      {/* Reasons */}
                      {item.reason_set && item.reason_set.length > 0 && (
                        <div className="mt-2 rounded-lg bg-zellige-50 p-3 dark:bg-zellige-900/30">
                          <p className="text-xs text-zellige-700 dark:text-zellige-300">
                            <span className="font-medium">{t('plan.why')}: </span>
                            {explainReasons(item.reason_set)}.
                          </p>
                        </div>
                      )}

                      {/* Actions: feedback + switch provider */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {!feedbackGiven.has(item.id) ? (
                          <>
                            <button
                              onClick={() => handleFeedback(item.id, 'up')}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zellige-600 transition-colors hover:bg-zellige-50 dark:text-zellige-400 dark:hover:bg-zellige-900/30"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" /> {t('plan.goodPick')}
                            </button>
                            <button
                              onClick={() => handleFeedback(item.id, 'down')}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ink-400 transition-colors hover:bg-sand-50 dark:hover:bg-ink-800"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" /> {t('plan.notForMe')}
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-zellige-600 dark:text-zellige-400">
                            <Check className="h-3.5 w-3.5" /> {t('plan.thanks')}
                          </div>
                        )}
                        {canSwitchProvider(item) && (
                          <button
                            onClick={() => openSwitchProvider(item)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-terracotta-600 transition-colors hover:bg-terracotta-50 dark:text-terracotta-400 dark:hover:bg-terracotta-900/30"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" /> {t('listing.switchProvider')}
                          </button>
                        )}
                        {/* Lock/unlock (T-22) */}
                        <button
                          onClick={() => handleToggleLock(item)}
                          disabled={togglingLock === item.id}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${
                            item.locked
                              ? 'text-ink-600 hover:bg-ink-100 dark:text-sand-300 dark:hover:bg-ink-700'
                              : 'text-ink-400 hover:bg-sand-50 dark:hover:bg-ink-800'
                          }`}
                        >
                          {togglingLock === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : item.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          {item.locked ? 'Unlock' : 'Lock'}
                        </button>
                        {/* Remove (T-20) */}
                        <button
                          onClick={() => handleRemoveItem(item)}
                          disabled={removing === item.id || item.locked}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-terracotta-600 transition-colors hover:bg-terracotta-50 disabled:opacity-40 dark:text-terracotta-400 dark:hover:bg-terracotta-900/30"
                        >
                          {removing === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Remove
                        </button>
                        {/* Reorder (T-21) */}
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleMoveItem(item, 'up')}
                            className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-sand-50 dark:hover:bg-ink-800"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveItem(item, 'down')}
                            className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-sand-50 dark:hover:bg-ink-800"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Message provider (T-43) */}
                        {item.listing_id && (
                          <button
                            onClick={() => handleMessageProvider(item)}
                            disabled={messagingItem === item}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zellige-600 transition-colors hover:bg-zellige-50 dark:text-zellige-400 dark:hover:bg-zellige-900/30"
                          >
                            {messagingItem === item ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                            Message
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 rounded-xl bg-sand-100 p-4 text-center text-sm text-ink-500 dark:bg-ink-800 dark:text-sand-400">
          <p>{t('plan.footerNote')}</p>
        </div>
      </div>

      {/* Switch provider modal */}
      {switchingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-6 dark:bg-ink-900">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">
                {t('listing.alternativeProviders')}
              </h3>
              <button
                onClick={() => setSwitchingItem(null)}
                className="rounded-lg p-1 text-ink-400 hover:bg-sand-100 dark:hover:bg-ink-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">
              {switchingItem.title}
            </p>

            <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {altLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-terracotta-500" />
                </div>
              ) : listingAlts.length === 0 && transportAlts.length === 0 && gemAlts.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-400 dark:text-sand-500">
                  No alternative providers found for this category.
                </p>
              ) : (
                <>
                  {/* Listing alternatives */}
                  {listingAlts.map((alt) => (
                    <div
                      key={alt.id}
                      className="flex items-center gap-3 rounded-xl border border-sand-200 p-3 dark:border-ink-700"
                    >
                      <img
                        src={getListingImage(alt.id, alt.visual_type, alt.category, alt.title, alt.region_id)}
                        alt={alt.title}
                        className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-ink-900 dark:text-sand-100">
                          {alt.title}
                        </h4>
                        <p className="text-xs text-ink-400 dark:text-sand-500">
                          {alt.provider?.display_name}
                          {alt.price && ` · ${formatPrice(alt.price.amount_minor, alt.price.currency)}`}
                        </p>
                        {alt.provider && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-saffron-600">
                            <Star className="h-3 w-3 fill-current" />
                            {alt.provider.avg_rating.toFixed(1)}
                            <span className="text-ink-400 dark:text-sand-500">
                              ({alt.provider.review_count})
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleSwitchListing(switchingItem, alt)}
                        disabled={switching === switchingItem.id}
                        className="btn-secondary text-xs disabled:opacity-50"
                      >
                        {switching === switchingItem.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          t('common.bookNow')
                        )}
                      </button>
                    </div>
                  ))}

                  {/* Transport alternatives */}
                  {transportAlts.map((alt) => (
                    <div
                      key={alt.id}
                      className="flex items-center gap-3 rounded-xl border border-sand-200 p-3 dark:border-ink-700"
                    >
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-zellige-50 dark:bg-zellige-900/30">
                        <Train className="h-6 w-6 text-zellige-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-ink-900 dark:text-sand-100">
                          {alt.provider}
                        </h4>
                        <p className="text-xs text-ink-400 dark:text-sand-500">
                          {alt.transport_type.replace(/_/g, ' ')} · {alt.origin_city} → {alt.destination_city}
                        </p>
                        <p className="text-xs text-ink-400 dark:text-sand-500">
                          {formatPrice(alt.price_minor, alt.currency)} · {alt.duration_minutes}min
                        </p>
                      </div>
                      <button
                        onClick={() => handleSwitchTransport(switchingItem, alt)}
                        disabled={switching === switchingItem.id}
                        className="btn-secondary text-xs disabled:opacity-50"
                      >
                        {switching === switchingItem.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          t('common.bookNow')
                        )}
                      </button>
                    </div>
                  ))}

                  {/* Hidden gem alternatives */}
                  {gemAlts.map((alt) => (
                    <div
                      key={alt.id}
                      className="flex items-center gap-3 rounded-xl border border-sand-200 p-3 dark:border-ink-700"
                    >
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-terracotta-50 dark:bg-terracotta-900/30">
                        <Sparkles className="h-6 w-6 text-terracotta-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-ink-900 dark:text-sand-100">
                          {alt.name}
                        </h4>
                        <p className="text-xs text-ink-400 dark:text-sand-500">
                          {alt.category} · {alt.crowd_level < 0.3 ? 'Quiet' : 'Popular'}
                        </p>
                        <p className="text-xs text-ink-400 dark:text-sand-500">
                          Authenticity {Math.round(alt.authenticity * 100)}%
                        </p>
                      </div>
                      <button
                        onClick={() => handleSwitchGem(switchingItem, alt)}
                        disabled={switching === switchingItem.id}
                        className="btn-secondary text-xs disabled:opacity-50"
                      >
                        {switching === switchingItem.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          t('common.bookNow')
                        )}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function canSwitchProvider(item: TripItem): boolean {
  // Train transport is locked to ONCF — everything else can be switched
  if (item.item_type === 'transport' && /train|oncf/i.test(item.title)) return false;
  if (item.item_type === 'flight') return false;
  return ['stay', 'meal', 'activity', 'tour', 'guided_experience', 'workshop', 'desert_experience', 'transfer', 'transport', 'gem'].includes(item.item_type);
}

function itemIcon(item: TripItem): React.ReactNode {
  switch (item.item_type) {
    case 'stay':
      return <Clock className="h-5 w-5 text-ink-400" />;
    case 'transfer':
      return <MapPin className="h-5 w-5 text-zellige-600" />;
    case 'meal':
      return <Sparkles className="h-5 w-5 text-terracotta-400" />;
    case 'gem':
      return <Sparkles className="h-5 w-5 text-zellige-500" />;
    case 'activity':
      return <MapPin className="h-5 w-5 text-terracotta-500" />;
    case 'flight':
      return <Plane className="h-5 w-5 text-terracotta-600" />;
    case 'transport':
      return <Train className="h-5 w-5 text-zellige-600" />;
    default:
      return <Clock className="h-5 w-5 text-ink-400" />;
  }
}

function formatPrice(minor: number, currency: string): string {
  const major = minor / 100;
  const symbol = currency === 'MAD' ? 'DH' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  return `${major.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
}
