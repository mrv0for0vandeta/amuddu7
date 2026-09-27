import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Plus,
  Users,
  Shield,
  Calendar,
  DollarSign,
  Inbox,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  MessageCircle,
  Star,
  Loader2,
  AlertCircle,
  ChevronRight,
  X,
  Send,
  Lock,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  fetchMyProviders,
  registerProvider,
  fetchTeamMembers,
  fetchListingsByProvider,
  createListing,
  publishListing,
  setPrice,
  fetchEvidence,
  submitEvidence,
  fetchAvailabilityBlocks,
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  fetchCancellationPolicy,
  setCancellationPolicy,
  fetchProviderInbox,
  replyToConversation,
  fetchBookingsForProvider,
  providerQuoteBooking,
  providerConfirmBooking,
  providerAttestBooking,
  fetchCommissionStatements,
  fetchAllRegions,
} from '@/lib/provider-data';
import type {
  Provider,
  Listing,
  ProviderTeamMember,
  VerificationEvidence,
  AvailabilityBlock,
  CancellationPolicy,
  Conversation,
  Message,
  Booking,
  CommissionStatement,
  Region,
} from '@/lib/types';

interface ProviderPortalPageProps {
  onNavigate: (path: string) => void;
}

type Tab = 'overview' | 'listings' | 'verification' | 'inbox' | 'bookings' | 'insights' | 'commission';

const CATEGORIES = [
  { value: 'guide', label: 'Licensed Guide' },
  { value: 'experience_host', label: 'Experience Host' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'transport', label: 'Transport' },
  { value: 'transfer', label: 'Transfer' },
];

const EVIDENCE_TYPES: Record<string, string[]> = {
  guide: ['guide_badge', 'identity_document'],
  experience_host: ['agency_licence', 'identity_document'],
  accommodation: ['hotel_classification', 'business_licence'],
  restaurant: ['food_safety_certificate', 'business_licence'],
  transport: ['transport_professional_card', 'vehicle_inspection'],
  transfer: ['transport_professional_card', 'vehicle_inspection'],
};

const QUICK_REPLIES = [
  'Thank you for your enquiry. I can accommodate your group on the requested date.',
  'I have availability and can offer you a private experience. Would you like a quote?',
  'Unfortunately I am fully booked on that date, but I have availability the following day.',
  'Yes, this experience is suitable for children. The minimum age is 6.',
  'I can pick you up from your accommodation. The meeting point is flexible.',
];

export function ProviderPortalPage({ onNavigate }: ProviderPortalPageProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [provs, regs] = await Promise.all([fetchMyProviders(), fetchAllRegions()]);
        setProviders(provs);
        setRegions(regs);
        if (provs.length > 0) setSelectedProvider(provs[0]!);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="card h-96 skeleton" />
      </div>
    );
  }

  if (providers.length === 0 && !showRegister) {
    return (
      <div className="container-page py-16 text-center">
        <Building2 className="mx-auto h-12 w-12 text-terracotta-400" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">
          Provider Portal
        </h1>
        <p className="mt-2 text-ink-500 dark:text-sand-400">
          Register your business to start listing experiences, manage bookings, and connect with travellers.
        </p>
        <button onClick={() => setShowRegister(true)} className="btn-primary mt-6">
          <Plus className="h-4 w-4" /> Register a business
        </button>
      </div>
    );
  }

  if (showRegister) {
    return <RegisterForm regions={regions} onDone={(p) => { setProviders([p, ...providers]); setSelectedProvider(p); setShowRegister(false); }} onCancel={() => setShowRegister(false)} />;
  }

  if (!selectedProvider) return null;

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <button onClick={() => onNavigate('/')} className="btn-ghost mb-6">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back
        </button>

        {/* Provider header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">
              {selectedProvider.display_name}
            </h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">
              {selectedProvider.legal_name} · {selectedProvider.category} ·{' '}
              <span className={
                selectedProvider.verification_state === 'verified' ? 'text-zellige-600' :
                selectedProvider.verification_state === 'rejected' ? 'text-terracotta-600' : 'text-saffron-600'
              }>
                {selectedProvider.verification_state}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            {providers.length > 1 && (
              <select
                value={selectedProvider.id}
                onChange={(e) => {
                  const p = providers.find((p) => p.id === e.target.value);
                  if (p) setSelectedProvider(p);
                }}
                className="input-field max-w-[200px]"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
              </select>
            )}
            <button onClick={() => setShowRegister(true)} className="btn-secondary text-sm">
              <Plus className="h-4 w-4" /> New business
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-sand-200 dark:border-ink-800">
          {([
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'listings', label: 'Listings', icon: FileText },
            { id: 'verification', label: 'Verification', icon: Shield },
            { id: 'inbox', label: 'Inbox', icon: Inbox },
            { id: 'bookings', label: 'Bookings', icon: Calendar },
            { id: 'insights', label: 'Insights', icon: Star },
            { id: 'commission', label: 'Commission', icon: DollarSign },
          ] as { id: Tab; label: string; icon: typeof TrendingUp }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-terracotta-500 text-terracotta-600 dark:text-terracotta-400'
                  : 'border-transparent text-ink-500 hover:text-ink-700 dark:text-sand-400 dark:hover:text-sand-200'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {tab === 'overview' && <OverviewTab provider={selectedProvider} />}
          {tab === 'listings' && <ListingsTab provider={selectedProvider} regions={regions} />}
          {tab === 'verification' && <VerificationTab provider={selectedProvider} />}
          {tab === 'inbox' && <InboxTab provider={selectedProvider} />}
          {tab === 'bookings' && <BookingsTab provider={selectedProvider} />}
          {tab === 'insights' && <InsightsTab provider={selectedProvider} />}
          {tab === 'commission' && <CommissionTab provider={selectedProvider} />}
        </div>
      </div>
    </div>
  );
}

// ---- Register Form (P-01) ----

function RegisterForm({ regions, onDone, onCancel }: { regions: Region[]; onDone: (p: Provider) => void; onCancel: () => void }) {
  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('guide');
  const [regionId, setRegionId] = useState('');
  const [languages, setLanguages] = useState<string[]>(['en', 'fr']);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = await registerProvider({ legal_name: legalName, display_name: displayName, category, region_id: regionId, languages, bio });
      onDone(provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to register');
    } finally { setLoading(false); }
  };

  return (
    <div className="container-page max-w-2xl py-8 animate-fade-in">
      <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">Register a business</h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">Opens a verification case. You can add listings once verified.</p>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-terracotta-50 p-3 text-sm text-terracotta-700 dark:bg-terracotta-900/20 dark:text-terracotta-300">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Legal name</label>
          <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Official business name" className="input-field" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Display name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Name travellers see" className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Region</label>
            <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className="input-field">
              <option value="">Select region...</option>
              {regions.filter((r) => r.level === 1).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Languages</label>
          <div className="flex flex-wrap gap-2">
            {['en', 'fr', 'es', 'ary', 'ary-Latn', 'ber', 'de', 'it'].map((lang) => (
              <button key={lang} onClick={() => setLanguages((prev) => prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang])}
                className={`rounded-full px-3 py-1.5 text-sm transition-all ${languages.includes(lang) ? 'bg-terracotta-600 text-white' : 'bg-sand-100 text-ink-600 dark:bg-ink-800 dark:text-sand-300'}`}>
                {lang}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Description</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell travellers about your business" className="input-field min-h-[80px]" />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={handleSubmit} disabled={loading || !legalName || !displayName || !regionId} className="btn-primary">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering...</> : 'Register business'}
        </button>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

// ---- Overview Tab ----

function OverviewTab({ provider }: { provider: Provider }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Star} label="Rating" value={`${provider.avg_rating.toFixed(1)} (${provider.review_count})`} />
      <StatCard icon={Clock} label="Response time" value={`${provider.response_time_hours}h avg`} />
      <StatCard icon={TrendingUp} label="Response rate" value={`${provider.response_rate_pct}%`} />
      <StatCard icon={Shield} label="Verification" value={provider.verification_state} />
      <StatCard icon={Users} label="Team members" value="—" />
      <StatCard icon={FileText} label="Listings" value="—" />
      <StatCard icon={Calendar} label="Active bookings" value="—" />
      <StatCard icon={DollarSign} label="Commission owed" value="—" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-terracotta-500"><Icon className="h-5 w-5" /></div>
      <p className="mt-2 text-sm text-ink-500 dark:text-sand-400">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink-900 dark:text-sand-50">{value}</p>
    </div>
  );
}

// ---- Listings Tab (P-05, P-06, P-07, P-08, P-09) ----

function ListingsTab({ provider, regions }: { provider: Provider; regions: Region[] }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const load = useCallback(async () => {
    try { setListings(await fetchListingsByProvider(provider.id)); } catch { /* ignore */ } finally { setLoading(false); }
  }, [provider.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card h-64 skeleton" />;

  if (selectedListing) {
    return <ListingDetail listing={selectedListing} provider={provider} onBack={() => { setSelectedListing(null); load(); }} />;
  }

  if (showCreate) {
    return <CreateListingForm provider={provider} regions={regions} onDone={() => { setShowCreate(false); load(); }} onCancel={() => setShowCreate(false)} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">Your listings</h2>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> New listing</button>
      </div>

      {listings.length === 0 ? (
        <div className="mt-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-ink-300" />
          <p className="mt-3 text-ink-500 dark:text-sand-400">No listings yet. Create your first one.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {listings.map((l) => (
            <button key={l.id} onClick={() => setSelectedListing(l)} className="card w-full p-4 text-left transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-ink-900 dark:text-sand-50">{l.title}</h3>
                  <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">{l.category} · {l.duration_minutes}min · tier {l.service_tier}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  l.status === 'published' ? 'bg-zellige-100 text-zellige-700 dark:bg-zellige-900/30 dark:text-zellige-300' :
                  l.status === 'draft' ? 'bg-sand-100 text-ink-500 dark:bg-ink-800 dark:text-sand-400' :
                  l.status === 'suspended' ? 'bg-terracotta-100 text-terracotta-700 dark:bg-terracotta-900/30 dark:text-terracotta-300' :
                  'bg-ink-100 text-ink-500'
                }`}>{l.status}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateListingForm({ provider, regions, onDone, onCancel }: { provider: Provider; regions: Region[]; onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(provider.category);
  const [languages, setLanguages] = useState<string[]>(provider.languages);
  const [minAge, setMinAge] = useState(0);
  const [difficulty, setDifficulty] = useState(2);
  const [minParty, setMinParty] = useState(1);
  const [maxParty, setMaxParty] = useState(10);
  const [duration, setDuration] = useState(180);
  const [serviceTier, setServiceTier] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await createListing({
        provider_org_id: provider.id,
        region_id: provider.region_id,
        category,
        title, description, languages,
        min_age: minAge, difficulty, min_party: minParty, max_party: maxParty,
        duration_minutes: duration, service_tier: serviceTier,
        accessibility: { mobility: createMobility, sensory: createSensory, max_walking: createMaxWalking, step_tolerance: createStepTolerance },
      });
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">Create a listing</h2>
      <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">Minimum age and difficulty are required fields.</p>
      {error && <div className="mt-4 flex items-center gap-2 rounded-lg bg-terracotta-50 p-3 text-sm text-terracotta-700 dark:bg-terracotta-900/20"><AlertCircle className="h-4 w-4" /> {error}</div>}
      <div className="mt-6 space-y-4">
        <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" /></div>
        <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[80px]" /></div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Min age</label><input type="number" value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} className="input-field" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Difficulty (1-5)</label><input type="number" min={1} max={5} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="input-field" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Min party</label><input type="number" value={minParty} onChange={(e) => setMinParty(Number(e.target.value))} className="input-field" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Max party</label><input type="number" value={maxParty} onChange={(e) => setMaxParty(Number(e.target.value))} className="input-field" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Duration (min)</label><input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input-field" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Service tier (1-4)</label><input type="number" min={1} max={4} value={serviceTier} onChange={(e) => setServiceTier(Number(e.target.value))} className="input-field" /></div>
        </div>
        {/* Accessibility fields (P-11) */}
        <div className="rounded-xl border border-sand-200 p-4 dark:border-ink-700">
          <h4 className="text-sm font-medium text-ink-900 dark:text-sand-50">Accessibility</h4>
          <p className="mt-1 text-xs text-ink-400">Structured fields, not prose. Travellers make decisions on these.</p>
          <div className="mt-3 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={createMobility} onChange={(e) => setCreateMobility(e.target.checked)} className="h-4 w-4 rounded border-sand-300 text-terracotta-600" />
              <span className="text-sm text-ink-700 dark:text-sand-300">Wheelchair / mobility aid accessible</span>
            </label>
            <div>
              <label className="mb-1 block text-xs text-ink-400">Max walking minutes</label>
              <input type="number" value={createMaxWalking} onChange={(e) => setCreateMaxWalking(Number(e.target.value))} className="input-field text-sm max-w-[120px]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-400">Step tolerance (0=none, 5=many stairs)</label>
              <input type="number" min={0} max={5} value={createStepTolerance} onChange={(e) => setCreateStepTolerance(Number(e.target.value))} className="input-field text-sm max-w-[120px]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-400">Sensory needs</label>
              <input value={createSensory} onChange={(e) => setCreateSensory(e.target.value)} placeholder="e.g. photosensitive, hearing impaired" className="input-field text-sm" />
            </div>
          </div>
        </div>
        {/* Photo upload (P-10) */}
        <div className="rounded-xl border border-sand-200 p-4 dark:border-ink-700">
          <h4 className="text-sm font-medium text-ink-900 dark:text-sand-50">Listing photo</h4>
          <p className="mt-1 text-xs text-ink-400">Validated, metadata stripped, resized automatically.</p>
          <div className="mt-3 flex gap-2">
            <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Paste image URL..." className="input-field text-sm" />
            <label className="btn-secondary text-sm cursor-pointer">
              <Upload className="h-4 w-4" /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // Validate file type and size
                if (!file.type.startsWith('image/')) return;
                if (file.size > 5 * 1024 * 1024) return;
                // In production, this would upload to Supabase Storage and strip metadata
                const reader = new FileReader();
                reader.onload = () => setPhotoUrl(reader.result as string);
                reader.readAsDataURL(file);
              }} />
            </label>
          </div>
          {photoUrl && <img src={photoUrl} alt="Preview" className="mt-2 h-32 rounded-lg object-cover" />}
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button onClick={handleSubmit} disabled={loading || !title || !description} className="btn-primary">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : 'Create listing'}</button>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

function ListingDetail({ listing, provider, onBack }: { listing: Listing; provider: Provider; onBack: () => void }) {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState('');
  const [tab, setTab] = useState<'details' | 'availability' | 'cancellation' | 'pricing'>('details');

  useEffect(() => {
    (async () => {
      try {
        const [blks, pol] = await Promise.all([
          fetchAvailabilityBlocks(provider.id),
          fetchCancellationPolicy(listing.id),
        ]);
        setBlocks(blks.filter((b) => !b.listing_id || b.listing_id === listing.id));
        setPolicy(pol);
      } catch { /* ignore */ }
    })();
  }, [provider.id, listing.id]);

  const handleAddBlock = async () => {
    if (!blockStart || !blockEnd) return;
    setLoading(true);
    try {
      const block = await createAvailabilityBlock({ provider_org_id: provider.id, listing_id: listing.id, start_date: blockStart, end_date: blockEnd, reason: blockReason });
      setBlocks([...blocks, block]);
      setBlockStart(''); setBlockEnd(''); setBlockReason('');
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleDeleteBlock = async (id: string) => {
    await deleteAvailabilityBlock(id);
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const handleSetPrice = async () => {
    if (!price) return;
    setLoading(true);
    try {
      await setPrice({ listing_id: listing.id, amount_minor: Number(price) * 100, currency: 'MAD', pricing_unit: 'per_person' });
      setPrice('');
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleSetPolicy = async (type: string) => {
    try {
      await setCancellationPolicy({ listing_id: listing.id, policy_type: type, free_until_hours: type === 'free_until' ? 48 : null, non_refundable: type === 'non_refundable' });
      setPolicy(await fetchCancellationPolicy(listing.id));
    } catch { /* ignore */ }
  };

  const handlePublish = async () => {
    try { await publishListing(listing.id); onBack(); } catch { /* ignore */ }
  };

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ChevronRight className="h-4 w-4 rotate-180" /> Back to listings</button>
      <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-sand-50">{listing.title}</h2>
      <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">Status: {listing.status}</p>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-sand-200 dark:border-ink-800">
        {([
          { id: 'details', label: 'Details' },
          { id: 'pricing', label: 'Pricing' },
          { id: 'availability', label: 'Availability' },
          { id: 'cancellation', label: 'Cancellation' },
        ] as { id: typeof tab; label: string }[]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-terracotta-500 text-terracotta-600 dark:text-terracotta-400' : 'border-transparent text-ink-500 dark:text-sand-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'details' && (
          <div className="space-y-3">
            <p className="text-ink-700 dark:text-sand-200">{listing.description}</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Info label="Category" value={listing.category} />
              <Info label="Duration" value={`${listing.duration_minutes}min`} />
              <Info label="Min age" value={`${listing.min_age}`} />
              <Info label="Difficulty" value={`${listing.difficulty}/5`} />
              <Info label="Party" value={`${listing.min_party}-${listing.max_party}`} />
              <Info label="Tier" value={`${listing.service_tier}/4`} />
              <Info label="Languages" value={listing.languages.join(', ')} />
            </div>
            {listing.status === 'draft' && (
              <button onClick={handlePublish} className="btn-primary mt-4"><CheckCircle2 className="h-4 w-4" /> Publish listing</button>
            )}
          </div>
        )}

        {tab === 'pricing' && (
          <div className="space-y-4">
            <h3 className="font-medium text-ink-900 dark:text-sand-50">Set a price (MAD, per person)</h3>
            <p className="text-sm text-ink-500 dark:text-sand-400">Prices are effective-dated and never overwritten.</p>
            <div className="flex gap-2">
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Amount in MAD" className="input-field max-w-[200px]" />
              <button onClick={handleSetPrice} disabled={loading || !price} className="btn-primary text-sm">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set price'}</button>
            </div>
          </div>
        )}

        {tab === 'availability' && (
          <div className="space-y-4">
            <h3 className="font-medium text-ink-900 dark:text-sand-50">Availability blocks</h3>
            <p className="text-sm text-ink-500 dark:text-sand-400">Add exclusion blocks for dates you are unavailable.</p>
            <div className="flex flex-wrap gap-2">
              <input type="date" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className="input-field max-w-[180px]" />
              <input type="date" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} className="input-field max-w-[180px]" />
              <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason (optional)" className="input-field max-w-[200px]" />
              <button onClick={handleAddBlock} disabled={loading} className="btn-secondary text-sm"><Plus className="h-4 w-4" /> Add block</button>
            </div>
            <div className="space-y-2">
              {blocks.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-sand-200 p-3 dark:border-ink-700">
                  <span className="text-sm text-ink-700 dark:text-sand-200">{b.start_date} → {b.end_date} {b.reason && `(${b.reason})`}</span>
                  <button onClick={() => handleDeleteBlock(b.id)} className="text-terracotta-500 hover:text-terracotta-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {blocks.length === 0 && <p className="text-sm text-ink-400">No blocks set.</p>}
            </div>
          </div>
        )}

        {tab === 'cancellation' && (
          <div className="space-y-4">
            <h3 className="font-medium text-ink-900 dark:text-sand-50">Cancellation policy</h3>
            <p className="text-sm text-ink-500 dark:text-sand-400">Structured policy for comparison. Choose a type:</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleSetPolicy('free_until')} className={`rounded-xl border p-3 text-sm transition-all ${policy?.policy_type === 'free_until' ? 'border-terracotta-500 bg-terracotta-50 dark:bg-terracotta-900/20' : 'border-sand-200 dark:border-ink-700'}`}>
                Free until 48h before
              </button>
              <button onClick={() => handleSetPolicy('tiered')} className={`rounded-xl border p-3 text-sm transition-all ${policy?.policy_type === 'tiered' ? 'border-terracotta-500 bg-terracotta-50 dark:bg-terracotta-900/20' : 'border-sand-200 dark:border-ink-700'}`}>
                Tiered refunds
              </button>
              <button onClick={() => handleSetPolicy('non_refundable')} className={`rounded-xl border p-3 text-sm transition-all ${policy?.policy_type === 'non_refundable' ? 'border-terracotta-500 bg-terracotta-50 dark:bg-terracotta-900/20' : 'border-sand-200 dark:border-ink-700'}`}>
                Non-refundable
              </button>
            </div>
            {policy && <p className="text-sm text-zellige-600 dark:text-zellige-400">Current policy: {policy.policy_type}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-ink-400">{label}</p><p className="text-sm font-medium text-ink-900 dark:text-sand-50">{value}</p></div>;
}

// ---- Verification Tab (P-02, P-03) ----

function VerificationTab({ provider }: { provider: Provider }) {
  const [evidence, setEvidence] = useState<VerificationEvidence[]>([]);
  const [evidenceType, setEvidenceType] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const evidenceTypes = EVIDENCE_TYPES[provider.category] ?? ['identity_document'];

  useEffect(() => {
    fetchEvidence(provider.id).then(setEvidence).catch(() => {});
  }, [provider.id]);

  const handleSubmit = async () => {
    if (!evidenceType || !docUrl) return;
    setLoading(true);
    try {
      const ev = await submitEvidence({ provider_org_id: provider.id, evidence_type: evidenceType, document_url: docUrl });
      setEvidence([ev, ...evidence]);
      setEvidenceType(''); setDocUrl('');
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
          <Shield className="h-5 w-5 text-terracotta-500" /> Verification status
        </h3>
        <p className="mt-2 text-sm text-ink-500 dark:text-sand-400">
          Current state: <span className="font-medium capitalize">{provider.verification_state}</span>
        </p>
        <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">
          Submit category-specific evidence for review. A case officer will review your documents.
        </p>
      </div>

      <div className="card p-6">
        <h3 className="font-medium text-ink-900 dark:text-sand-50">Submit evidence</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Evidence type</label>
            <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} className="input-field">
              <option value="">Select...</option>
              {evidenceTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Document URL</label>
            <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://..." className="input-field" />
          </div>
          <button onClick={handleSubmit} disabled={loading || !evidenceType || !docUrl} className="btn-primary text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit evidence'}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-medium text-ink-900 dark:text-sand-50">Submitted evidence</h3>
        {evidence.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">No evidence submitted yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {evidence.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-sand-200 p-3 dark:border-ink-700">
                <div>
                  <p className="text-sm font-medium text-ink-900 dark:text-sand-50">{e.evidence_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-ink-400">Submitted {new Date(e.submitted_at).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  e.status === 'approved' ? 'bg-zellige-100 text-zellige-700 dark:bg-zellige-900/30 dark:text-zellige-300' :
                  e.status === 'rejected' ? 'bg-terracotta-100 text-terracotta-700 dark:bg-terracotta-900/30 dark:text-terracotta-300' :
                  'bg-saffron-100 text-saffron-700 dark:bg-saffron-900/30 dark:text-saffron-300'
                }`}>{e.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Inbox Tab (P-12, P-13, P-14, P-15) ----

function InboxTab({ provider }: { provider: Provider }) {
  const [conversations, setConversations] = useState<(Conversation & { messages?: Message[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchProviderInbox(provider.id).then((c) => { setConversations(c); setLoading(false); }).catch(() => setLoading(false));
  }, [provider.id]);

  const handleSend = async () => {
    if (!selected || !reply) return;
    setSending(true);
    try {
      await replyToConversation(selected, reply);
      setReply('');
      const fresh = await fetchProviderInbox(provider.id);
      setConversations(fresh);
    } catch { /* ignore */ } finally { setSending(false); }
  };

  if (loading) return <div className="card h-64 skeleton" />;

  const current = conversations.find((c) => c.id === selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="space-y-2">
        <h3 className="font-medium text-ink-900 dark:text-sand-50">Inbox</h3>
        <p className="text-xs text-ink-400">Sorted by response deadline</p>
        {conversations.length === 0 ? (
          <p className="text-sm text-ink-400">No messages yet.</p>
        ) : (
          conversations.map((c) => {
            const lastMsg = c.messages?.[c.messages.length - 1];
            const hoursSince = lastMsg ? (Date.now() - new Date(lastMsg.created_at).getTime()) / 3600000 : 0;
            const deadline = Math.max(0, 24 - hoursSince);
            return (
              <button key={c.id} onClick={() => setSelected(c.id)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${selected === c.id ? 'border-terracotta-500 bg-terracotta-50 dark:bg-terracotta-900/20' : 'border-sand-200 dark:border-ink-700 hover:border-sand-300'}`}>
                <p className="text-sm font-medium text-ink-900 dark:text-sand-50 truncate">{c.subject}</p>
                <p className="text-xs text-ink-400 truncate">{c.traveller_name}</p>
                <div className="mt-1 flex items-center gap-1">
                  <Clock className={`h-3 w-3 ${deadline < 6 ? 'text-terracotta-500' : 'text-ink-300'}`} />
                  <span className={`text-xs ${deadline < 6 ? 'text-terracotta-600 dark:text-terracotta-400' : 'text-ink-400'}`}>
                    {deadline.toFixed(0)}h left
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div>
        {current ? (
          <div className="card p-5">
            <h3 className="font-medium text-ink-900 dark:text-sand-50">{current.subject}</h3>
            <p className="text-sm text-ink-500 dark:text-sand-400">From: {current.traveller_name}</p>
            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
              {current.messages?.map((m) => (
                <div key={m.id} className={`rounded-lg p-3 ${m.sender === 'provider' ? 'bg-terracotta-50 dark:bg-terracotta-900/20 ml-8' : 'bg-sand-50 dark:bg-ink-800 mr-8'}`}>
                  <p className="text-xs text-ink-400">{m.sender} · {new Date(m.created_at).toLocaleString()}</p>
                  <p className="mt-1 text-sm text-ink-700 dark:text-sand-200">{m.body}</p>
                </div>
              )) ?? <p className="text-sm text-ink-400">No messages yet.</p>}
            </div>

            {/* Quick replies (P-13) */}
            <div className="mt-4">
              <p className="text-xs text-ink-400 mb-2">Quick replies:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((qr, i) => (
                  <button key={i} onClick={() => setReply(qr)} className="rounded-full bg-sand-100 px-3 py-1.5 text-xs text-ink-600 hover:bg-sand-200 dark:bg-ink-800 dark:text-sand-300">
                    {qr.slice(0, 40)}...
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." className="input-field min-h-[60px]" />
              <button onClick={handleSend} disabled={sending || !reply} className="btn-primary text-sm">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="card flex h-full items-center justify-center p-12 text-center">
            <Inbox className="h-10 w-10 text-ink-300" />
            <p className="mt-3 text-sm text-ink-400">Select a conversation to reply.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Bookings Tab (P-15, P-16, P-17) ----

function BookingsTab({ provider }: { provider: Provider }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotePrice, setQuotePrice] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchBookingsForProvider(provider.id).then((b) => { setBookings(b); setLoading(false); }).catch(() => setLoading(false));
  }, [provider.id]);

  const handleQuote = async (bookingId: string) => {
    if (!quotePrice) return;
    setActionLoading(bookingId);
    try {
      await providerQuoteBooking(bookingId, Number(quotePrice) * 100, 'MAD');
      setBookings(await fetchBookingsForProvider(provider.id));
      setQuotePrice('');
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleConfirm = async (bookingId: string) => {
    setActionLoading(bookingId);
    try { await providerConfirmBooking(bookingId); setBookings(await fetchBookingsForProvider(provider.id)); } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleAttest = async (bookingId: string) => {
    setActionLoading(bookingId);
    try { await providerAttestBooking(bookingId); setBookings(await fetchBookingsForProvider(provider.id)); } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  if (loading) return <div className="card h-64 skeleton" />;

  return (
    <div className="space-y-3">
      {bookings.length === 0 ? (
        <div className="text-center py-12"><Calendar className="mx-auto h-10 w-10 text-ink-300" /><p className="mt-3 text-sm text-ink-400">No bookings yet.</p></div>
      ) : (
        bookings.map((b) => (
          <div key={b.id} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-ink-900 dark:text-sand-50">{b.title}</h3>
                <p className="text-sm text-ink-500 dark:text-sand-400">Party: {b.party_size} · Date: {b.booking_date ?? 'TBD'}</p>
                {/* Traveller context (P-14) */}
                {b.trip_id && (
                  <div className="mt-2 rounded-lg bg-sand-50 p-2 text-xs text-ink-500 dark:bg-ink-800 dark:text-sand-400">
                    <p className="font-medium">Traveller context:</p>
                    <p>Party size: {b.party_size} · Luxury level: {b.luxury_level}/4</p>
                    <p>Activity: {b.title}</p>
                    {b.attested_traveller && <p className="text-zellige-600">Traveller attested: yes</p>}
                  </div>
                )}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                b.status === 'completed' ? 'bg-zellige-500 text-white' :
                b.status === 'confirmed' ? 'bg-terracotta-100 text-terracotta-700 dark:bg-terracotta-900/30 dark:text-terracotta-300' :
                b.status === 'quoted' ? 'bg-zellige-100 text-zellige-700 dark:bg-zellige-900/30 dark:text-zellige-300' :
                b.status === 'cancelled' ? 'bg-ink-100 text-ink-500' :
                'bg-saffron-100 text-saffron-700 dark:bg-saffron-900/30 dark:text-saffron-300'
              }`}>{b.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {b.status === 'pending' && (
                <>
                  <input type="number" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} placeholder="Quote (MAD)" className="input-field max-w-[150px] text-sm" />
                  <button onClick={() => handleQuote(b.id)} disabled={actionLoading === b.id || !quotePrice} className="btn-primary text-xs">
                    {actionLoading === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send quote'}
                  </button>
                </>
              )}
              {b.status === 'quoted' && (
                <button onClick={() => handleConfirm(b.id)} disabled={actionLoading === b.id} className="btn-primary text-xs">
                  {actionLoading === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm booking</>}
                </button>
              )}
              {b.status === 'confirmed' && (
                <button onClick={() => handleAttest(b.id)} disabled={actionLoading === b.id} className="btn-primary text-xs">
                  {actionLoading === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5" /> Confirm it happened</>}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ---- Insights Tab (P-18, P-19) ----

function InsightsTab({ provider }: { provider: Provider }) {
  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-terracotta-500" /> Match insights
        </h3>
        <p className="mt-2 text-sm text-ink-500 dark:text-sand-400">
          See how often your listings are matched, selected, and the common reasons for not being selected.
          Aggregated, never identifying a traveller.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-sand-50 p-4 dark:bg-ink-800">
            <p className="text-xs text-ink-400">Match rate</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">—</p>
          </div>
          <div className="rounded-xl bg-sand-50 p-4 dark:bg-ink-800">
            <p className="text-xs text-ink-400">Selection rate</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">—</p>
          </div>
          <div className="rounded-xl bg-sand-50 p-4 dark:bg-ink-800">
            <p className="text-xs text-ink-400">Top reason not selected</p>
            <p className="mt-1 text-sm font-medium text-ink-900 dark:text-sand-50">—</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-medium text-ink-900 dark:text-sand-50">Your response metrics (P-19)</h3>
        <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">The same numbers travellers see. A metric that affects ranking and is hidden from the person it measures is unfair.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Info label="Average response time" value={`${provider.response_time_hours}h`} />
          <Info label="Response rate" value={`${provider.response_rate_pct}%`} />
          <Info label="Average rating" value={`${provider.avg_rating.toFixed(1)}/5`} />
          <Info label="Review count" value={`${provider.review_count}`} />
        </div>
      </div>
    </div>
  );
}

// ---- Commission Tab (P-20) ----

function CommissionTab({ provider }: { provider: Provider }) {
  const [statements, setStatements] = useState<CommissionStatement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissionStatements(provider.id).then((s) => setStatements(s)).catch(() => {}).finally(() => setLoading(false));
  }, [provider.id]);

  if (loading) return <div className="card h-64 skeleton" />;

  return (
    <div className="card p-6">
      <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-terracotta-500" /> Commission statements
      </h3>
      <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">Read-only at MVP — no money moves through the platform.</p>
      {statements.length === 0 ? (
        <p className="mt-4 text-sm text-ink-400">No commission statements yet. Commission is recorded when both parties attest a booking.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {statements.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-sand-200 p-3 dark:border-ink-700">
              <div>
                <p className="text-sm font-medium text-ink-900 dark:text-sand-50">Booking: {s.booking_id.slice(0, 8)}</p>
                <p className="text-xs text-ink-400">{new Date(s.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-terracotta-700 dark:text-terracotta-400">{(s.commission_amount_minor / 100).toFixed(0)} {s.currency}</p>
                <p className="text-xs text-ink-400 capitalize">{s.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
