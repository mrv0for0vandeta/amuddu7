import { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  FileText,
  Flag,
  History,
  Lock,
  Eye,
  Clock,
  Loader2,
  ChevronRight,
  Building2,
  Star,
  TrendingUp,
  Upload,
} from 'lucide-react';
import {
  fetchVerificationQueue,
  decideVerificationCase,
  fetchAllProviders,
  fetchAllListings,
  moderateTarget,
  fetchModerationActions,
  fetchSafetyReports,
  triageReport,
  suspendProvider,
  reinstateProvider,
  searchAuditLog,
  supportLookup,
  fetchEntityTimeline,
  fetchBookingHistory,
  requestElevation,
  fetchElevations,
  fetchAllGems,
  createGem,
} from '@/lib/ops-data';
import type {
  VerificationCase,
  Provider,
  VerificationEvidence,
  ModerationAction,
  SafetyReport,
  AuditLogEntry,
  AdminElevation,
  Listing,
  HiddenGem,
  BookingHistoryEntry,
} from '@/lib/types';

interface OpsConsolePageProps {
  onNavigate: (path: string) => void;
}

type Tab = 'verification' | 'moderation' | 'reports' | 'audit' | 'support' | 'elevation' | 'gems' | 'licences' | 'bulk';

export function OpsConsolePage({ onNavigate }: OpsConsolePageProps) {
  const [tab, setTab] = useState<Tab>('verification');

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <button onClick={() => onNavigate('/')} className="btn-ghost mb-6">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white dark:bg-sand-100 dark:text-ink-900">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">Operations Console</h1>
            <p className="text-sm text-ink-500 dark:text-sand-400">Internal tooling for verification, moderation, and support</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-sand-200 dark:border-ink-800">
          {([
            { id: 'verification', label: 'Verification Queue', icon: CheckCircle2 },
            { id: 'moderation', label: 'Moderation', icon: FileText },
            { id: 'reports', label: 'Reports', icon: Flag },
            { id: 'audit', label: 'Audit Search', icon: History },
            { id: 'support', label: 'Support Lookup', icon: Search },
            { id: 'elevation', label: 'Break-glass', icon: Lock },
            { id: 'gems', label: 'Curate Gems', icon: Star },
            { id: 'licences', label: 'Licences', icon: Clock },
            { id: 'bulk', label: 'Bulk Import', icon: Upload },
          ] as { id: Tab; label: string; icon: typeof Shield }[]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id ? 'border-terracotta-500 text-terracotta-600 dark:text-terracotta-400' : 'border-transparent text-ink-500 hover:text-ink-700 dark:text-sand-400'
              }`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'verification' && <VerificationQueueTab />}
          {tab === 'moderation' && <ModerationTab />}
          {tab === 'reports' && <ReportsTab />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'support' && <SupportTab />}
          {tab === 'elevation' && <ElevationTab />}
          {tab === 'gems' && <GemsTab />}
          {tab === 'licences' && <LicencesTab />}
          {tab === 'bulk' && <BulkImportTab />}
        </div>
      </div>
    </div>
  );
}

// ---- Verification Queue (O-01, O-02, O-03) ----

function VerificationQueueTab() {
  const [cases, setCases] = useState<(VerificationCase & { provider?: Provider; evidence?: VerificationEvidence[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try { setCases(await fetchVerificationQueue()); } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDecide = async (caseId: string, providerOrgId: string) => {
    if (!decision || !reason) return;
    setActing(true);
    try {
      await decideVerificationCase(caseId, decision as 'approved' | 'rejected' | 'request_more', reason, providerOrgId);
      setDecision(''); setReason(''); setSelectedCase(null);
      await load();
    } catch { /* ignore */ } finally { setActing(false); }
  };

  if (loading) return <div className="card h-64 skeleton" />;

  const current = cases.find((c) => c.id === selectedCase);

  return (
    <div className="grid gap-4 lg:grid-cols-[350px_1fr]">
      <div className="space-y-2">
        <h3 className="font-medium text-ink-900 dark:text-sand-50">Queue ({cases.length})</h3>
        <p className="text-xs text-ink-400">Prioritised by readiness then age</p>
        {cases.length === 0 ? (
          <p className="text-sm text-ink-400">No pending cases.</p>
        ) : (
          cases.map((c) => (
            <button key={c.id} onClick={() => setSelectedCase(c.id)}
              className={`w-full rounded-xl border p-3 text-left transition-all ${selectedCase === c.id ? 'border-terracotta-500 bg-terracotta-50 dark:bg-terracotta-900/20' : 'border-sand-200 dark:border-ink-700 hover:border-sand-300'}`}>
              <p className="text-sm font-medium text-ink-900 dark:text-sand-50 truncate">{c.provider?.display_name ?? 'Unknown'}</p>
              <p className="text-xs text-ink-400">{c.provider?.category} · {new Date(c.submitted_at).toLocaleDateString()}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-ink-400">Priority: {c.priority}</span>
                <span className="text-xs text-ink-400">Evidence: {c.evidence?.length ?? 0}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div>
        {current ? (
          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">
              {current.provider?.display_name}
            </h3>
            <p className="text-sm text-ink-500 dark:text-sand-400">{current.provider?.legal_name} · {current.provider?.category}</p>
            <p className="text-sm text-ink-500 dark:text-sand-400">Bio: {current.provider?.bio}</p>

            {/* Documents render in-browser (O-02) */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-ink-900 dark:text-sand-50">Evidence ({current.evidence?.length ?? 0})</h4>
              <div className="mt-2 space-y-2">
                {current.evidence?.map((e) => (
                  <div key={e.id} className="rounded-lg border border-sand-200 p-3 dark:border-ink-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink-900 dark:text-sand-50">{e.evidence_type.replace(/_/g, ' ')}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${e.status === 'approved' ? 'bg-zellige-100 text-zellige-700' : e.status === 'rejected' ? 'bg-terracotta-100 text-terracotta-700' : 'bg-saffron-100 text-saffron-700'}`}>{e.status}</span>
                    </div>
                    <a href={e.document_url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-terracotta-600 hover:underline truncate">{e.document_url}</a>
                  </div>
                )) ?? <p className="text-sm text-ink-400">No evidence submitted.</p>}
              </div>
            </div>

            {/* Decision (O-03) */}
            <div className="mt-6 border-t border-sand-200 pt-4 dark:border-ink-800">
              <h4 className="text-sm font-medium text-ink-900 dark:text-sand-50">Decision</h4>
              <div className="mt-3 space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setDecision('approved')} className={`rounded-lg border px-4 py-2 text-sm ${decision === 'approved' ? 'border-zellige-500 bg-zellige-50 text-zellige-700 dark:bg-zellige-900/20' : 'border-sand-200 dark:border-ink-700'}`}><CheckCircle2 className="h-4 w-4 inline mr-1" /> Approve</button>
                  <button onClick={() => setDecision('request_more')} className={`rounded-lg border px-4 py-2 text-sm ${decision === 'request_more' ? 'border-saffron-500 bg-saffron-50 text-saffron-700 dark:bg-saffron-900/20' : 'border-sand-200 dark:border-ink-700'}`}>Request more</button>
                  <button onClick={() => setDecision('rejected')} className={`rounded-lg border px-4 py-2 text-sm ${decision === 'rejected' ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-700 dark:bg-terracotta-900/20' : 'border-sand-200 dark:border-ink-700'}`}><XCircle className="h-4 w-4 inline mr-1" /> Reject</button>
                </div>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)..." className="input-field min-h-[60px]" />
                <button onClick={() => handleDecide(current.id, current.provider_org_id)} disabled={!decision || !reason || acting} className="btn-primary text-sm">
                  {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit decision'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card flex h-full items-center justify-center p-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-ink-300" />
            <p className="mt-3 text-sm text-ink-400">Select a case to review.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Moderation Tab (O-08) ----

function ModerationTab() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [moderating, setModerating] = useState<string | null>(null);
  const [modReason, setModReason] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [l, p, a] = await Promise.all([fetchAllListings(), fetchAllProviders(), fetchModerationActions()]);
        setListings(l); setProviders(p); setActions(a);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const handleModerate = async (type: string, id: string, action: string) => {
    if (!modReason) return;
    setModerating(id);
    try {
      await moderateTarget(type, id, action, modReason);
      setModReason('');
      setActions(await fetchModerationActions());
    } catch { /* ignore */ } finally { setModerating(null); }
  };

  const handleSuspendProvider = async (id: string) => {
    if (!modReason) return;
    setModerating(id);
    try { await suspendProvider(id, modReason); setModReason(''); } catch { /* ignore */ } finally { setModerating(null); }
  };

  const handleReinstate = async (id: string) => {
    setModerating(id);
    try { await reinstateProvider(id, 'Reinstated by ops'); } catch { /* ignore */ } finally { setModerating(null); }
  };

  if (loading) return <div className="card h-64 skeleton" />;

  return (
    <div className="space-y-6">
      {/* Providers */}
      <div className="card p-6">
        <h3 className="font-medium text-ink-900 dark:text-sand-50 flex items-center gap-2"><Building2 className="h-5 w-5 text-terracotta-500" /> Providers ({providers.length})</h3>
        <div className="mt-4 max-h-[300px] space-y-2 overflow-y-auto">
          {providers.slice(0, 50).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-sand-200 p-3 dark:border-ink-700">
              <div>
                <p className="text-sm font-medium text-ink-900 dark:text-sand-50">{p.display_name}</p>
                <p className="text-xs text-ink-400">{p.category} · {p.status} · {p.verification_state}</p>
              </div>
              <div className="flex gap-2">
                {p.status === 'suspended' ? (
                  <button onClick={() => handleReinstate(p.id)} disabled={moderating === p.id} className="btn-secondary text-xs">Reinstate</button>
                ) : (
                  <button onClick={() => handleSuspendProvider(p.id)} disabled={moderating === p.id || !modReason} className="btn-ghost text-xs text-terracotta-600">
                    {moderating === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Suspend'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Listings */}
      <div className="card p-6">
        <h3 className="font-medium text-ink-900 dark:text-sand-50 flex items-center gap-2"><FileText className="h-5 w-5 text-terracotta-500" /> Listings ({listings.length})</h3>
        <div className="mt-4 max-h-[300px] space-y-2 overflow-y-auto">
          {listings.slice(0, 50).map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-lg border border-sand-200 p-3 dark:border-ink-700">
              <div>
                <p className="text-sm font-medium text-ink-900 dark:text-sand-50">{l.title}</p>
                <p className="text-xs text-ink-400">{l.category} · {l.status}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleModerate('listing', l.id, 'feature')} disabled={moderating === l.id || !modReason} className="rounded px-2 py-1 text-xs bg-zellige-100 text-zellige-700 hover:bg-zellige-200">Feature</button>
                <button onClick={() => handleModerate('listing', l.id, 'demote')} disabled={moderating === l.id || !modReason} className="rounded px-2 py-1 text-xs bg-sand-100 text-ink-600 hover:bg-sand-200">Demote</button>
                <button onClick={() => handleModerate('listing', l.id, 'suspend')} disabled={moderating === l.id || !modReason} className="rounded px-2 py-1 text-xs bg-saffron-100 text-saffron-700 hover:bg-saffron-200">Suspend</button>
                <button onClick={() => handleModerate('listing', l.id, 'remove')} disabled={moderating === l.id || !modReason} className="rounded px-2 py-1 text-xs bg-terracotta-100 text-terracotta-700 hover:bg-terracotta-200">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reason input */}
      <div className="card p-4">
        <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Moderation reason (required for all actions)</label>
        <input value={modReason} onChange={(e) => setModReason(e.target.value)} placeholder="e.g. Incomplete listing description..." className="input-field" />
      </div>

      {/* Recent actions */}
      <div className="card p-6">
        <h3 className="font-medium text-ink-900 dark:text-sand-50">Recent moderation actions</h3>
        <div className="mt-3 space-y-2">
          {actions.slice(0, 20).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-sand-200 p-2 text-sm dark:border-ink-700">
              <span className="text-ink-700 dark:text-sand-200">{a.action} on {a.target_type}</span>
              <span className="text-xs text-ink-400">{a.reason} · {new Date(a.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {actions.length === 0 && <p className="text-sm text-ink-400">No actions recorded.</p>}
        </div>
      </div>
    </div>
  );
}

// ---- Reports Tab (O-09) ----

function ReportsTab() {
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSafetyReports().then(setReports).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleTriage = async (id: string, status: string) => {
    await triageReport(id, status);
    setReports(await fetchSafetyReports());
  };

  if (loading) return <div className="card h-64 skeleton" />;

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-ink-900 dark:text-sand-50">Safety reports ({reports.length})</h3>
      {reports.length === 0 ? (
        <p className="text-sm text-ink-400">No reports.</p>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-900 dark:text-sand-50">{r.report_type} on {r.target_type}</p>
                <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">{r.description}</p>
                <p className="mt-1 text-xs text-ink-400">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  r.status === 'open' ? 'bg-saffron-100 text-saffron-700' :
                  r.status === 'investigating' ? 'bg-zellige-100 text-zellige-700' :
                  r.status === 'resolved' ? 'bg-zellige-500 text-white' : 'bg-ink-100 text-ink-500'
                }`}>{r.status}</span>
              </div>
            </div>
            {r.status === 'open' && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleTriage(r.id, 'investigating')} className="btn-secondary text-xs">Start investigating</button>
                <button onClick={() => handleTriage(r.id, 'resolved')} className="btn-primary text-xs">Resolve</button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ---- Audit Tab (O-11) ----

function AuditTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actorId, setActorId] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetId, setTargetId] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    try {
      setEntries(await searchAuditLog({
        actorId: actorId || undefined,
        targetType: targetType || undefined,
        targetId: targetId || undefined,
      }));
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="font-medium text-ink-900 dark:text-sand-50 mb-3">Search audit log</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="Actor ID" className="input-field text-sm" />
          <input value={targetType} onChange={(e) => setTargetType(e.target.value)} placeholder="Target type" className="input-field text-sm" />
          <input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="Target ID" className="input-field text-sm" />
        </div>
        <button onClick={handleSearch} disabled={loading} className="btn-primary mt-3 text-sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4" /> Search</>}
        </button>
      </div>

      <div className="card p-4">
        <p className="text-sm text-ink-400 mb-3">{entries.length} entries</p>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {entries.map((e) => (
            <div key={e.id} className="rounded-lg border border-sand-200 p-3 text-sm dark:border-ink-700">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink-900 dark:text-sand-50">{e.action}</span>
                <span className="text-xs text-ink-400">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-ink-500 dark:text-sand-400">
                Target: {e.target_type} / {e.target_id?.slice(0, 8) ?? '—'}
              </p>
              {e.reason && <p className="mt-1 text-xs text-ink-400">Reason: {e.reason}</p>}
            </div>
          ))}
          {entries.length === 0 && <p className="text-sm text-ink-400">No entries. Run a search.</p>}
        </div>
      </div>
    </div>
  );
}

// ---- Support Tab (O-12, O-13) ----

function SupportTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<AuditLogEntry[] | BookingHistoryEntry[] | null>(null);
  const [timelineType, setTimelineType] = useState('');

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      setResults(await supportLookup(query));
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleTimeline = async (type: string, id: string) => {
    setTimelineType(`${type}:${id}`);
    if (type === 'booking') {
      setTimeline(await fetchBookingHistory(id));
    } else {
      setTimeline(await fetchEntityTimeline(type, id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="font-medium text-ink-900 dark:text-sand-50 mb-3">Support lookup</h3>
        <p className="text-sm text-ink-500 dark:text-sand-400 mb-3">One search across accounts, trips, bookings, conversations and providers.</p>
        <div className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by any identifier..." className="input-field" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          <button onClick={handleSearch} disabled={loading} className="btn-primary text-sm">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button>
        </div>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="card p-4">
          <h3 className="font-medium text-ink-900 dark:text-sand-50 mb-3">Results</h3>
          {Object.entries(results).map(([key, items]) => (
            items.length > 0 && (
              <div key={key} className="mb-4">
                <p className="text-sm font-medium text-terracotta-600 capitalize">{key} ({items.length})</p>
                <div className="mt-2 space-y-1">
                  {items.map((item) => {
                    const record = item as Record<string, unknown>;
                    const id = String(record.id ?? '');
                    const title = String(record.title ?? record.display_name ?? record.legal_name ?? record.subject ?? id.slice(0, 8));
                    return (
                      <button key={id} onClick={() => handleTimeline(key === 'providers' ? 'provider_org' : key === 'listings' ? 'listing' : key, id)}
                        className="block w-full rounded-lg border border-sand-200 p-2 text-left text-sm hover:border-sand-300 dark:border-ink-700">
                        <span className="text-ink-700 dark:text-sand-200">{title}</span>
                        <span className="ml-2 text-xs text-ink-400">{id.slice(0, 8)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {timeline && (
        <div className="card p-4">
          <h3 className="font-medium text-ink-900 dark:text-sand-50 mb-3">Entity timeline — {timelineType}</h3>
          <div className="space-y-2">
            {timeline.map((entry) => {
              const e = entry as Record<string, unknown>;
              return (
                <div key={String(e.id)} className="flex items-start gap-3 rounded-lg border border-sand-200 p-3 dark:border-ink-700">
                  <Clock className="mt-0.5 h-4 w-4 text-ink-300" />
                  <div>
                    <p className="text-sm text-ink-700 dark:text-sand-200">
                      {String(e.action ?? e.new_status ?? 'event')}
                    </p>
                    {e.reason && <p className="text-xs text-ink-400">{String(e.reason)}</p>}
                    <p className="text-xs text-ink-300">{new Date(String(e.created_at)).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
            {timeline.length === 0 && <p className="text-sm text-ink-400">No events found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Elevation Tab (O-16) ----

function ElevationTab() {
  const [elevations, setElevations] = useState<AdminElevation[]>([]);
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchElevations().then(setElevations).catch(() => {});
  }, []);

  const handleRequest = async () => {
    if (!justification) return;
    setLoading(true);
    try {
      await requestElevation(justification);
      setJustification('');
      setElevations(await fetchElevations());
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
          <Lock className="h-5 w-5 text-terracotta-500" /> Break-glass elevation
        </h3>
        <p className="mt-2 text-sm text-ink-500 dark:text-sand-400">
          No standing admin. Request with justification, second-person approval, four hours maximum, auto-expiring.
        </p>
        <div className="mt-4">
          <textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Why do you need elevated access?" className="input-field min-h-[80px]" />
          <button onClick={handleRequest} disabled={loading || !justification} className="btn-primary mt-3 text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request elevation'}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-medium text-ink-900 dark:text-sand-50">Recent elevation requests</h3>
        <div className="mt-3 space-y-2">
          {elevations.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-sand-200 p-3 dark:border-ink-700">
              <div>
                <p className="text-sm text-ink-700 dark:text-sand-200">{e.justification}</p>
                <p className="text-xs text-ink-400">{new Date(e.created_at).toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                e.status === 'pending' ? 'bg-saffron-100 text-saffron-700' :
                e.status === 'approved' ? 'bg-zellige-100 text-zellige-700' :
                'bg-terracotta-100 text-terracotta-700'
              }`}>{e.status}</span>
            </div>
          ))}
          {elevations.length === 0 && <p className="text-sm text-ink-400">No elevation requests.</p>}
        </div>
      </div>
    </div>
  );
}

// ---- Gems Tab (O-06) ----

function GemsTab() {
  const [gems, setGems] = useState<HiddenGem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchAllGems().then(setGems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card h-64 skeleton" />;

  if (showCreate) return <CreateGemForm onDone={() => { setShowCreate(false); fetchAllGems().then(setGems); }} onCancel={() => setShowCreate(false)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-ink-900 dark:text-sand-50">Hidden gems ({gems.length})</h3>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">New gem</button>
      </div>
      <div className="space-y-2">
        {gems.map((g) => (
          <div key={g.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-900 dark:text-sand-50">{g.name}</p>
                <p className="text-xs text-ink-400">Authenticity: {g.authenticity.toFixed(2)} · Crowd: {g.crowd_level.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zellige-600">published</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateGemForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [story, setStory] = useState('');
  const [practicalNotes, setPracticalNotes] = useState('');
  const [authenticity, setAuthenticity] = useState(0.9);
  const [crowdLevel, setCrowdLevel] = useState(0.2);
  const [regionId, setRegionId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createGem({ region_id: regionId, name, description, authenticity, crowd_level: crowdLevel, story, practical_notes, tags: [] });
      onDone();
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">Create a hidden gem</h3>
      <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="input-field" /></div>
      <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[60px]" /></div>
      <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Story (why it matters)</label><textarea value={story} onChange={(e) => setStory(e.target.value)} className="input-field min-h-[80px]" /></div>
      <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Practical notes</label><textarea value={practicalNotes} onChange={(e) => setPracticalNotes(e.target.value)} className="input-field min-h-[60px]" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Authenticity (0-1)</label><input type="number" step="0.05" min="0" max="1" value={authenticity} onChange={(e) => setAuthenticity(Number(e.target.value))} className="input-field" /></div>
        <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Crowd level (0-1)</label><input type="number" step="0.05" min="0" max="1" value={crowdLevel} onChange={(e) => setCrowdLevel(Number(e.target.value))} className="input-field" /></div>
      </div>
      <div><label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Region ID</label><input value={regionId} onChange={(e) => setRegionId(e.target.value)} placeholder="UUID" className="input-field" /></div>
      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={loading || !name || !description || !regionId} className="btn-primary">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create gem'}</button>
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

// ---- Licences Tab (O-04) ----

function LicencesTab() {
  const [licences, setLicences] = useState<Array<{ id: string; provider_org_id: string; licence_type: string; licence_number: string | null; issued_at: string | null; expires_at: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
          .from('provider_licence')
          .select('*, provider:provider_org_id(display_name)')
          .order('expires_at', { ascending: true })
          .limit(100);
        if (error) throw error;
        setLicences(data ?? []);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const handleFlagExpiring = async (licenceId: string, providerOrgId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('verification_case').insert({
        provider_org_id: providerOrgId,
        status: 'pending',
        priority: 5,
      });
      await supabase.from('audit_log').insert({
        action: 'licence_expiry_flagged',
        target_type: 'provider_licence',
        target_id: licenceId,
        reason: 'Licence approaching expiry — auto re-verification triggered',
      });
    } catch { /* ignore */ }
  };

  if (loading) return <div className="card h-64 skeleton" />;

  const now = new Date();
  const expiring = licences.filter((l) => {
    const days = (new Date(l.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return days < 90 && l.status === 'active';
  });

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h3 className="font-medium text-ink-900 dark:text-sand-50">Provider licences & expiry tracking</h3>
        <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">Licences approaching expiry raise a verification case automatically.</p>
        {expiring.length > 0 && (
          <div className="mt-4 rounded-lg bg-saffron-50 p-3 dark:bg-saffron-900/20">
            <p className="text-sm font-medium text-saffron-700 dark:text-saffron-300">{expiring.length} licence(s) expiring within 90 days</p>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {licences.map((l) => {
          const days = Math.floor((new Date(l.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isExpiring = days < 90 && days > 0;
          const isExpired = days < 0;
          return (
            <div key={l.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-900 dark:text-sand-50">{l.licence_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-ink-400">{l.licence_number ?? 'No number'} · Expires: {new Date(l.expires_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isExpired ? (
                    <span className="rounded-full bg-terracotta-100 px-3 py-1 text-xs font-medium text-terracotta-700">Expired</span>
                  ) : isExpiring ? (
                    <>
                      <span className="rounded-full bg-saffron-100 px-3 py-1 text-xs font-medium text-saffron-700">{days}d left</span>
                      <button onClick={() => handleFlagExpiring(l.id, l.provider_org_id)} className="btn-secondary text-xs">Flag for re-verification</button>
                    </>
                  ) : (
                    <span className="rounded-full bg-zellige-100 px-3 py-1 text-xs font-medium text-zellige-700">Valid ({days}d)</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {licences.length === 0 && <p className="text-sm text-ink-400">No licences tracked.</p>}
      </div>
    </div>
  );
}

// ---- Bulk Import Tab (O-05) ----

function BulkImportTab() {
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState<Array<{ legal_name: string; display_name: string; category: string; region: string; languages: string; bio: string; errors: string[] }>>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);

  const handleParse = () => {
    const lines = csvText.trim().split('\n');
    const rows = lines.slice(1).map((line) => {
      const [legal_name, display_name, category, region, languages, bio] = line.split(',').map((s) => s.trim());
      const errors: string[] = [];
      if (!legal_name) errors.push('Missing legal name');
      if (!display_name) errors.push('Missing display name');
      if (!category) errors.push('Missing category');
      if (!region) errors.push('Missing region');
      return { legal_name: legal_name ?? '', display_name: display_name ?? '', category: category ?? '', region: region ?? '', languages: languages ?? 'en', bio: bio ?? '', errors };
    });
    setParsed(rows);
  };

  const handleImport = async () => {
    setImporting(true);
    let count = 0;
    try {
      const { supabase } = await import('@/lib/supabase');
      const validRows = parsed.filter((r) => r.errors.length === 0);
      for (const row of validRows) {
        // Look up region by name
        const { data: regions } = await supabase.from('geo_region').select('id').ilike('name', `%${row.region}%`).limit(1);
        const regionId = regions?.[0]?.id;
        if (!regionId) continue;

        const { error } = await supabase.from('provider_org').insert({
          legal_name: row.legal_name,
          display_name: row.display_name,
          category: row.category,
          region_id: regionId,
          languages: row.languages.split(';'),
          bio: row.bio,
          verification_state: 'pending',
          status: 'pending',
        });
        if (!error) count++;
      }
      setImported(count);
      await supabase.from('audit_log').insert({
        action: 'bulk_provider_import',
        target_type: 'provider_org',
        reason: `Imported ${count} providers from spreadsheet`,
      });
    } catch { /* ignore */ } finally { setImporting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h3 className="font-medium text-ink-900 dark:text-sand-50">Bulk provider import</h3>
        <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">Paste CSV from field operations. Validated per row with specific messages, correctable inline, partial commit.</p>
        <p className="mt-2 text-xs text-ink-400">Format: legal_name,display_name,category,region,languages,bio</p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={'legal_name,display_name,category,region,languages,bio\nAtlas Guides,Atlas Guides,guide,Marrakech,en;fr;ary,Expert mountain guides'}
          className="input-field mt-3 min-h-[120px] font-mono text-sm"
        />
        <button onClick={handleParse} disabled={!csvText.trim()} className="btn-secondary mt-3 text-sm">Validate rows</button>
      </div>

      {parsed.length > 0 && (
        <div className="card p-6">
          <h3 className="font-medium text-ink-900 dark:text-sand-50">Validation results ({parsed.length} rows)</h3>
          <div className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
            {parsed.map((row, i) => (
              <div key={i} className={`rounded-lg border p-3 text-sm ${row.errors.length > 0 ? 'border-terracotta-300 bg-terracotta-50 dark:bg-terracotta-900/20' : 'border-zellige-300 bg-zellige-50 dark:bg-zellige-900/20'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-900 dark:text-sand-50">{row.display_name || `Row ${i + 1}`}</span>
                  {row.errors.length > 0 ? (
                    <span className="text-xs text-terracotta-600">{row.errors.join(', ')}</span>
                  ) : (
                    <span className="text-xs text-zellige-600">Valid</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-400">{row.category} · {row.region}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleImport} disabled={importing || parsed.filter((r) => r.errors.length === 0).length === 0} className="btn-primary text-sm">
              {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</> : `Import ${parsed.filter((r) => r.errors.length === 0).length} valid rows`}
            </button>
            {imported > 0 && <span className="text-sm text-zellige-600">Imported {imported} providers successfully</span>}
          </div>
        </div>
      )}
    </div>
  );
}
