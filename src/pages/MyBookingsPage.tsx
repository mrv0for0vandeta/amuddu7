import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Calendar,
  Users,
  Check,
  X,
  Loader2,
  AlertCircle,
  Star,
  Clock,
  CheckCircle2,
  MessageCircle,
  Flag,
} from 'lucide-react';
import type { Booking, Review, BookingHistoryEntry, CancellationPolicy } from '@/lib/types';
import {
  fetchBookings,
  quoteBooking,
  confirmBookingById,
  attestBooking,
  cancelBooking,
  createReview,
  hasReviewForBooking,
  fetchBookingHistory,
  fetchCancellationPolicyForListing,
  raiseDispute,
  reportProvider,
} from '@/lib/data';
import { useI18n } from '@/lib/i18n';

interface MyBookingsPageProps {
  onNavigate: (path: string) => void;
}

const STATUS_FLOW: Record<string, { label: string; color: string }> = {
  pending: { label: 'Awaiting quote', color: 'bg-saffron-100 text-saffron-700 dark:bg-saffron-900/30 dark:text-saffron-300' },
  quoted: { label: 'Quoted — review and accept', color: 'bg-zellige-100 text-zellige-700 dark:bg-zellige-900/30 dark:text-zellige-300' },
  confirmed: { label: 'Confirmed', color: 'bg-terracotta-100 text-terracotta-700 dark:bg-terracotta-900/30 dark:text-terracotta-300' },
  completed: { label: 'Completed', color: 'bg-zellige-500 text-white' },
  cancelled: { label: 'Cancelled', color: 'bg-ink-100 text-ink-500 dark:bg-ink-700 dark:text-sand-400' },
};

export function MyBookingsPage({ onNavigate }: MyBookingsPageProps) {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewedBookings, setReviewedBookings] = useState<Set<string>>(new Set());
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<BookingHistoryEntry[]>([]);
  const [disputingBooking, setDisputingBooking] = useState<string | null>(null);
  const [disputeType, setDisputeType] = useState('service_not_provided');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [reportingBooking, setReportingBooking] = useState<string | null>(null);
  const [reportDesc, setReportDesc] = useState('');
  const [cancelPolicy, setCancelPolicy] = useState<CancellationPolicy | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      const data = await fetchBookings();
      setBookings(data);
      // Check which bookings already have reviews
      for (const b of data) {
        if (b.status === 'completed') {
          const has = await hasReviewForBooking(b.id);
          if (has) setReviewedBookings((prev) => new Set([...prev, b.id]));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleAcceptQuote = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      await confirmBookingById(bookingId);
      await loadBookings();
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleAttest = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      await attestBooking(bookingId, 'traveller');
      await loadBookings();
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleCancel = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      await cancelBooking(bookingId);
      await loadBookings();
      setShowCancelConfirm(null);
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleShowHistory = async (bookingId: string) => {
    if (historyFor === bookingId) { setHistoryFor(null); return; }
    setHistoryFor(bookingId);
    try { setHistoryEntries(await fetchBookingHistory(bookingId)); } catch { /* ignore */ }
  };

  const handleRaiseDispute = async (bookingId: string) => {
    if (!disputeDesc) return;
    setActionLoading(bookingId);
    try {
      await raiseDispute({ booking_id: bookingId, dispute_type: disputeType, description: disputeDesc });
      setDisputingBooking(null); setDisputeDesc('');
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleReport = async (bookingId: string) => {
    if (!reportDesc) return;
    setActionLoading(bookingId);
    try {
      await reportProvider({ target_type: 'booking', target_id: bookingId, report_type: 'fraud_or_unsafe', description: reportDesc });
      setReportingBooking(null); setReportDesc('');
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleSubmitReview = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;
      await createReview({
        booking_id: bookingId,
        provider_org_id: null as unknown as string,
        rating: reviewRating,
        body: reviewBody.trim() || null,
      });
      setReviewedBookings((prev) => new Set([...prev, bookingId]));
      setReviewingBooking(null);
      setReviewRating(5);
      setReviewBody('');
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

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
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">
          My Bookings
        </h1>

        {bookings.length === 0 ? (
          <div className="mt-16 text-center">
            <Calendar className="mx-auto h-12 w-12 text-ink-300" />
            <h2 className="mt-4 font-display text-xl font-semibold text-ink-900 dark:text-sand-50">
              No bookings yet
            </h2>
            <p className="mt-2 text-ink-500 dark:text-sand-400">
              Browse experiences and request a booking with a verified provider.
            </p>
            <button onClick={() => onNavigate('/listings')} className="btn-primary mt-6">
              Browse experiences
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {bookings.map((booking, i) => {
              const statusInfo = STATUS_FLOW[booking.status] ?? STATUS_FLOW.pending;
              const canAttest = booking.status === 'confirmed';
              const canReview = booking.status === 'completed' && !reviewedBookings.has(booking.id);
              const canCancel = booking.status === 'pending' || booking.status === 'quoted' || booking.status === 'confirmed';

              return (
                <div
                  key={booking.id}
                  className="card p-5 animate-stagger"
                  style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {booking.image_url && (
                          <img src={booking.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                        )}
                        <div>
                          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-sand-50">
                            {booking.title}
                          </h3>
                          {booking.provider_name && (
                            <p className="text-sm text-ink-500 dark:text-sand-400">{booking.provider_name}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-500 dark:text-sand-400">
                        {booking.booking_date && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" /> {booking.booking_date}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" /> {booking.party_size}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" /> {new Date(booking.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Price */}
                      <div className="mt-3">
                        {booking.quoted_price_minor != null && booking.status !== 'cancelled' ? (
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-lg font-semibold text-terracotta-700 dark:text-terracotta-400">
                              {formatPrice(booking.quoted_price_minor, booking.quoted_currency ?? 'EUR')}
                            </span>
                            <span className="text-xs text-ink-400 dark:text-sand-500">quoted price</span>
                          </div>
                        ) : (
                          <span className="font-display text-lg font-semibold text-terracotta-700 dark:text-terracotta-400">
                            {formatPrice(booking.price_minor, booking.currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>

                      <div className="flex flex-wrap gap-2">
                        {booking.status === 'quoted' && (
                          <button
                            onClick={() => handleAcceptQuote(booking.id)}
                            disabled={actionLoading === booking.id}
                            className="btn-primary text-xs"
                          >
                            {actionLoading === booking.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Accept quote
                          </button>
                        )}
                        {canAttest && (
                          <button
                            onClick={() => handleAttest(booking.id)}
                            disabled={actionLoading === booking.id}
                            className="btn-primary text-xs"
                          >
                            {actionLoading === booking.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Confirm it happened
                          </button>
                        )}
                        {canReview && (
                          <button
                            onClick={() => setReviewingBooking(booking.id)}
                            className="btn-secondary text-xs"
                          >
                            <Star className="h-3.5 w-3.5" /> Leave a review
                          </button>
                        )}
                        {reviewedBookings.has(booking.id) && (
                          <span className="flex items-center gap-1 text-xs text-zellige-600 dark:text-zellige-400">
                            <Check className="h-3.5 w-3.5" /> Reviewed
                          </span>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => setShowCancelConfirm(booking.id)}
                            disabled={actionLoading === booking.id}
                            className="btn-ghost text-xs text-terracotta-600 dark:text-terracotta-400"
                          >
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleShowHistory(booking.id)}
                          className="btn-ghost text-xs"
                        >
                          <Clock className="h-3.5 w-3.5" /> History
                        </button>
                        {booking.status === 'completed' && (
                          <button
                            onClick={() => setDisputingBooking(booking.id)}
                            className="btn-ghost text-xs text-saffron-600"
                          >
                            <AlertCircle className="h-3.5 w-3.5" /> Raise dispute
                          </button>
                        )}
                        <button
                          onClick={() => setReportingBooking(booking.id)}
                          className="btn-ghost text-xs text-terracotta-600 dark:text-terracotta-400"
                        >
                          <Flag className="h-3.5 w-3.5" /> Report
                        </button>
                      </div>

                      {/* Cancel confirmation with policy (T-51) */}
                      {showCancelConfirm === booking.id && (
                        <div className="mt-4 rounded-xl bg-saffron-50 p-4 dark:bg-saffron-900/20 animate-fade-in-up">
                          <h4 className="font-medium text-saffron-800 dark:text-saffron-300">Before you cancel</h4>
                          <p className="mt-1 text-sm text-saffron-700 dark:text-saffron-400">
                            {cancelPolicy?.non_refundable
                              ? 'This booking is non-refundable. Cancelling will forfeit the full amount.'
                              : cancelPolicy?.policy_type === 'free_until'
                                ? `Free cancellation until ${cancelPolicy.free_until_hours}h before the booking date. After that, a fee may apply.`
                                : cancelPolicy?.policy_type === 'tiered'
                                  ? 'Tiered refund policy applies. Earlier cancellation receives a higher refund.'
                                  : 'Check the provider\'s cancellation policy. A fee may apply depending on timing.'}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => handleCancel(booking.id)} disabled={actionLoading === booking.id} className="btn-primary text-xs">
                              {actionLoading === booking.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm cancellation'}
                            </button>
                            <button onClick={() => setShowCancelConfirm(null)} className="btn-ghost text-xs">Keep booking</button>
                          </div>
                        </div>
                      )}

                      {/* Booking history (T-50) */}
                      {historyFor === booking.id && (
                        <div className="mt-4 rounded-xl bg-sand-50 p-4 dark:bg-ink-800 animate-fade-in-up">
                          <h4 className="font-medium text-ink-900 dark:text-sand-100">Booking history</h4>
                          <div className="mt-2 space-y-1">
                            {historyEntries.map((h) => (
                              <div key={h.id} className="flex items-center gap-2 text-xs text-ink-500 dark:text-sand-400">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(h.created_at).toLocaleString()}: {h.previous_status ?? '—'} → {h.new_status}</span>
                                {h.reason && <span className="text-ink-400">({h.reason})</span>}
                              </div>
                            ))}
                            {historyEntries.length === 0 && <p className="text-xs text-ink-400">No history recorded.</p>}
                          </div>
                        </div>
                      )}

                      {/* Dispute form (T-53) */}
                      {disputingBooking === booking.id && (
                        <div className="mt-4 rounded-xl bg-saffron-50 p-4 dark:bg-saffron-900/20 animate-fade-in-up">
                          <h4 className="font-medium text-saffron-800 dark:text-saffron-300">Raise a dispute</h4>
                          <p className="mt-1 text-xs text-saffron-600">A structured path separate from leaving a review.</p>
                          <select value={disputeType} onChange={(e) => setDisputeType(e.target.value)} className="input-field mt-2 text-sm">
                            <option value="service_not_provided">Service not provided</option>
                            <option value="quality_issue">Quality issue</option>
                            <option value="safety_concern">Safety concern</option>
                            <option value="overcharged">Overcharged</option>
                          </select>
                          <textarea value={disputeDesc} onChange={(e) => setDisputeDesc(e.target.value)} placeholder="Describe the issue..." className="input-field mt-2 min-h-[60px]" />
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => handleRaiseDispute(booking.id)} disabled={actionLoading === booking.id || !disputeDesc} className="btn-primary text-xs">
                              {actionLoading === booking.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Submit dispute'}
                            </button>
                            <button onClick={() => setDisputingBooking(null)} className="btn-ghost text-xs">Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Report form (T-54) */}
                      {reportingBooking === booking.id && (
                        <div className="mt-4 rounded-xl bg-terracotta-50 p-4 dark:bg-terracotta-900/20 animate-fade-in-up">
                          <h4 className="font-medium text-terracotta-800 dark:text-terracotta-300">Report a problem</h4>
                          <p className="mt-1 text-xs text-terracotta-600">Report fraud or unsafe conduct.</p>
                          <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Describe the issue..." className="input-field mt-2 min-h-[60px]" />
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => handleReport(booking.id)} disabled={actionLoading === booking.id || !reportDesc} className="btn-primary text-xs">
                              {actionLoading === booking.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Submit report'}
                            </button>
                            <button onClick={() => setReportingBooking(null)} className="btn-ghost text-xs">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review form */}
                  {reviewingBooking === booking.id && (
                    <div className="mt-4 rounded-xl bg-sand-50 p-4 dark:bg-ink-800 animate-fade-in-up">
                      <h4 className="font-medium text-ink-900 dark:text-sand-100">Leave a review</h4>
                      <div className="mt-3 flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setReviewRating(star)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              className={`h-6 w-6 ${star <= reviewRating ? 'fill-saffron-500 text-saffron-500' : 'text-ink-300 dark:text-ink-600'}`}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewBody}
                        onChange={(e) => setReviewBody(e.target.value)}
                        placeholder="Share your experience (optional)..."
                        className="input-field mt-3 min-h-[80px]"
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleSubmitReview(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="btn-primary text-xs"
                        >
                          {actionLoading === booking.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Submit review
                        </button>
                        <button onClick={() => setReviewingBooking(null)} className="btn-ghost text-xs">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatPrice(minor: number, currency: string): string {
  const major = minor / 100;
  const symbol = currency === 'MAD' ? 'DH' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  return `${major.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
}
