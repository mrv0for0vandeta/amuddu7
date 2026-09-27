import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  User as UserIcon,
  Shield,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  LogOut,
  Mail,
  Globe,
  Wallet,
  Heart,
  Accessibility,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  upsertProfile,
  fetchConsent,
  grantConsent,
  deleteAccount,
  exportMyData,
  fetchUserSessions,
  revokeSession,
  revokeAllSessions,
} from '@/lib/data';
import type { UserConsent, UserSession } from '@/lib/types';

interface AccountPageProps {
  onNavigate: (path: string) => void;
}

const INTEREST_TAGS = [
  'history', 'architecture', 'museums', 'medina', 'street-food', 'cooking',
  'mountains', 'desert', 'hiking', 'pottery', 'leather', 'weaving',
  'quad-biking', 'camel-trekking', 'surfing', 'hammam', 'spa', 'yoga',
  'music', 'dance', 'festivals', 'photography', 'waterfalls', 'beaches',
];

const PACE_LABELS = ['Relaxed', 'Easy', 'Balanced', 'Full', 'Packed'];
const LUXURY_LABELS = ['Budget', 'Simple', 'Comfortable', 'Luxury'];
const STAMINA_LABELS = ['Low', 'Light', 'Moderate', 'Good', 'High'];

export function AccountPage({ onNavigate }: AccountPageProps) {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [consentList, setConsentList] = useState<UserConsent[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);

  // Editable profile fields
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [homeCountry, setHomeCountry] = useState(profile?.home_country ?? '');
  const [pace, setPace] = useState(profile?.default_pace ?? 3);
  const [luxuryLevel, setLuxuryLevel] = useState(profile?.default_luxury_level ?? 2);
  const [stamina, setStamina] = useState(profile?.default_stamina ?? 3);
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [mobilityAid, setMobilityAid] = useState(profile?.mobility_aid ?? false);
  const [sensoryNeeds, setSensoryNeeds] = useState(profile?.sensory_needs ?? '');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setHomeCountry(profile.home_country ?? '');
      setPace(profile.default_pace);
      setLuxuryLevel(profile.default_luxury_level);
      setStamina(profile.default_stamina);
      setInterests(profile.interests);
      setMobilityAid(profile.mobility_aid);
      setSensoryNeeds(profile.sensory_needs ?? '');
    }
  }, [profile]);

  useEffect(() => {
    fetchConsent().then(setConsentList).catch(() => {});
    fetchUserSessions().then(setSessions).catch(() => {});
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try { await revokeSession(sessionId); setSessions(await fetchUserSessions()); } catch { /* ignore */ }
  };
  const handleRevokeAllSessions = async () => {
    try { await revokeAllSessions(); setSessions(await fetchUserSessions()); } catch { /* ignore */ }
  };

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await upsertProfile({
        display_name: displayName,
        home_country: homeCountry || null,
        default_pace: pace,
        default_luxury_level: luxuryLevel,
        default_stamina: stamina,
        interests,
        mobility_aid: mobilityAid,
        sensory_needs: sensoryNeeds || null,
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleConsentToggle = async (purpose: string, granted: boolean) => {
    try {
      await grantConsent(purpose, '1.0', granted);
      setConsentList(await fetchConsent());
    } catch { /* ignore */ }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      const msg = await exportMyData();
      setExportMsg(msg);
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deletion failed');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in">
      <div className="container-page max-w-3xl py-8">
        <button onClick={() => onNavigate('/')} className="btn-ghost mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">
          Account & Settings
        </h1>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-terracotta-50 p-3 text-sm text-terracotta-700 dark:bg-terracotta-900/20 dark:text-terracotta-300">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* Profile section */}
        <section className="mt-8 card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-terracotta-500" /> Profile
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </label>
              <input
                type="email"
                value={user.email ?? ''}
                disabled
                className="input-field opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Home country</label>
              <input
                type="text"
                value={homeCountry}
                onChange={(e) => setHomeCountry(e.target.value)}
                placeholder="e.g. France"
                className="input-field"
              />
            </div>
          </div>
        </section>

        {/* Travel preferences */}
        <section className="mt-6 card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-terracotta-500" /> Travel preferences
          </h2>

          <div className="mt-4 space-y-5">
            <SliderRow label="Pace" icon={<Clock className="h-4 w-4" />} value={pace} onChange={setPace} labels={PACE_LABELS} />
            <SliderRow label="Luxury level" icon={<Sparkles className="h-4 w-4" />} value={luxuryLevel} onChange={setLuxuryLevel} labels={LUXURY_LABELS} min={1} max={4} />
            <SliderRow label="Stamina" icon={<Heart className="h-4 w-4" />} value={stamina} onChange={setStamina} labels={STAMINA_LABELS} />
          </div>
        </section>

        {/* Interests */}
        <section className="mt-6 card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">
            Interests
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTEREST_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleInterest(tag)}
                className={`rounded-full px-3 py-1.5 text-sm capitalize transition-all ${
                  interests.includes(tag)
                    ? 'bg-terracotta-600 text-white'
                    : 'bg-sand-100 text-ink-600 hover:bg-sand-200 dark:bg-ink-800 dark:text-sand-300'
                }`}
              >
                {tag.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </section>

        {/* Accessibility */}
        <section className="mt-6 card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-terracotta-500" /> Accessibility
          </h2>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={mobilityAid}
                onChange={(e) => setMobilityAid(e.target.checked)}
                className="h-5 w-5 rounded border-sand-300 text-terracotta-600 focus:ring-terracotta-500"
              />
              <span className="text-sm text-ink-700 dark:text-sand-300">I use a mobility aid</span>
            </label>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Sensory needs</label>
              <textarea
                value={sensoryNeeds}
                onChange={(e) => setSensoryNeeds(e.target.value)}
                placeholder="e.g. photosensitive, hearing impaired..."
                className="input-field min-h-[60px]"
              />
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="mt-6 flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save changes'}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-zellige-600 dark:text-zellige-400 animate-fade-in-up">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
        </div>

        {/* Consent management (T-12) */}
        <section className="mt-8 card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
            <Shield className="h-5 w-5 text-terracotta-500" /> Privacy & consent
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">
            Purpose-scoped, versioned, withdrawable. Marketing consent is separate and separately revocable.
          </p>
          <div className="mt-4 space-y-3">
            {[
              { purpose: 'essential', label: 'Essential — required for the service to function', locked: true },
              { purpose: 'analytics', label: 'Analytics — help us improve the product', locked: false },
              { purpose: 'marketing', label: 'Marketing — product updates and offers', locked: false },
            ].map((item) => {
              const record = consentList.find((c) => c.purpose === item.purpose);
              const granted = record?.granted ?? (item.purpose === 'essential');
              return (
                <div key={item.purpose} className="flex items-center justify-between rounded-xl border border-sand-200 p-3 dark:border-ink-700">
                  <span className="text-sm text-ink-700 dark:text-sand-300">{item.label}</span>
                  {item.locked ? (
                    <span className="text-xs text-ink-400">Required</span>
                  ) : (
                    <button
                      onClick={() => handleConsentToggle(item.purpose, !granted)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        granted ? 'bg-zellige-500' : 'bg-ink-300 dark:bg-ink-700'
                      }`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${granted ? 'left-5.5' : 'left-0.5'}`} style={{ left: granted ? '1.375rem' : '0.125rem' }} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sessions and devices (T-09) */}
        <section className="mt-6 card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
            <Shield className="h-5 w-5 text-terracotta-500" /> Sessions & devices
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">See active sessions with device and last seen. Revoke one or all, immediately.</p>
          <div className="mt-4 space-y-2">
            {sessions.length === 0 ? (
              <p className="text-sm text-ink-400">No active sessions recorded.</p>
            ) : (
              <>
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-sand-200 p-3 dark:border-ink-700">
                    <div>
                      <p className="text-sm font-medium text-ink-900 dark:text-sand-50">{s.device_info ?? 'Unknown device'}</p>
                      <p className="text-xs text-ink-400">Last seen: {new Date(s.last_seen_at).toLocaleString()}</p>
                    </div>
                    {s.revoked_at ? (
                      <span className="text-xs text-terracotta-500">Revoked</span>
                    ) : (
                      <button onClick={() => handleRevokeSession(s.id)} className="btn-ghost text-xs text-terracotta-600">Revoke</button>
                    )}
                  </div>
                ))}
                <button onClick={handleRevokeAllSessions} className="btn-ghost text-xs text-terracotta-600 mt-2">Revoke all sessions</button>
              </>
            )}
          </div>
        </section>

        {/* Data management (T-10, T-11) */}
        <section className="mt-6 card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">
            Your data
          </h2>
          <div className="mt-4 space-y-3">
            <button onClick={handleExport} disabled={exporting} className="btn-secondary w-full sm:w-auto">
              {exporting ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting...</> : <><Download className="h-4 w-4" /> Export my data</>}
            </button>
            {exportMsg && (
              <p className="text-sm text-zellige-600 dark:text-zellige-400">{exportMsg}</p>
            )}

            <div className="border-t border-sand-100 pt-4 dark:border-ink-800">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 text-sm text-terracotta-600 dark:text-terracotta-400"
                >
                  <Trash2 className="h-4 w-4" /> Delete my account
                </button>
              ) : (
                <div className="rounded-xl bg-terracotta-50 p-4 dark:bg-terracotta-900/20">
                  <p className="text-sm text-terracotta-700 dark:text-terracotta-300">
                    This will erase your account, trips, bookings, and preference data. If you have an active booking, deletion is scheduled after the booking completes.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="btn-primary text-sm bg-terracotta-600"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, delete everything'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="btn-ghost text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Sign out */}
        <div className="mt-6">
          <button
            onClick={() => { signOut(); onNavigate('/'); }}
            className="btn-ghost text-terracotta-600 dark:text-terracotta-400"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

interface SliderRowProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  labels: string[];
  min?: number;
  max?: number;
}

function SliderRow({ label, icon, value, onChange, labels, min = 1, max = 5 }: SliderRowProps) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-sand-300">
        {icon} {label}
        <span className="ml-auto font-semibold text-terracotta-600 dark:text-terracotta-400">
          {labels[value - min] ?? value}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-terracotta-600"
      />
    </div>
  );
}
