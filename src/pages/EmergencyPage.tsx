import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Phone,
  MapPin,
  HeartPulse,
  Shield,
  Building2,
  Plus,
  AlertCircle,
} from 'lucide-react';
import type { EmergencyContact, Region } from '@/lib/types';
import { fetchEmergencyContacts, fetchRegions } from '@/lib/data';

interface EmergencyPageProps {
  onNavigate: (path: string) => void;
}

const CONTACT_ICONS: Record<string, React.ReactNode> = {
  hospital: <HeartPulse className="h-5 w-5 text-terracotta-500" />,
  police: <Shield className="h-5 w-5 text-zellige-600" />,
  tourist_police: <Shield className="h-5 w-5 text-zellige-600" />,
  embassy: <Building2 className="h-5 w-5 text-saffron-600" />,
  pharmacy: <Plus className="h-5 w-5 text-terracotta-500" />,
};

const CONTACT_LABELS: Record<string, string> = {
  hospital: 'Hospital',
  police: 'Police',
  tourist_police: 'Tourist Police',
  embassy: 'Embassy',
  pharmacy: 'Pharmacy',
};

export function EmergencyPage({ onNavigate }: EmergencyPageProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [r, c] = await Promise.all([
          fetchRegions(),
          fetchEmergencyContacts(),
        ]);
        if (!mounted) return;
        setRegions(r);
        setContacts(c);
      } catch { /* ignore */ } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (selectedRegion) {
      fetchEmergencyContacts(selectedRegion).then(setContacts).catch(() => {});
    } else {
      fetchEmergencyContacts().then(setContacts).catch(() => {});
    }
  }, [selectedRegion]);

  const grouped = contacts.reduce<Record<string, EmergencyContact[]>>((acc, c) => {
    const key = c.contact_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const typeOrder = ['police', 'tourist_police', 'hospital', 'pharmacy', 'embassy'];
  const sortedTypes = Object.keys(grouped).sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="card h-96 skeleton" />
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
          Emergency Information
        </h1>
        <p className="mt-2 text-ink-500 dark:text-sand-400">
          Hospital, police, tourist police and embassy contacts. Works offline once loaded.
        </p>

        {/* Region filter */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedRegion('')}
            className={!selectedRegion ? 'chip-active' : 'chip-inactive'}
          >
            All regions
          </button>
          {regions.filter((r) => r.level === 1).map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRegion(r.id)}
              className={selectedRegion === r.id ? 'chip-active' : 'chip-inactive'}
            >
              {r.name}
            </button>
          ))}
        </div>

        {/* Emergency banner */}
        <div className="mt-6 rounded-xl bg-terracotta-50 p-4 dark:bg-terracotta-900/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-terracotta-600 dark:text-terracotta-400" />
            <div>
              <p className="font-medium text-terracotta-800 dark:text-terracotta-300">
                In an emergency, dial:
              </p>
              <p className="text-sm text-terracotta-700 dark:text-terracotta-400">
                <strong>19</strong> Police · <strong>15</strong> Medical (SAMU) · <strong>177</strong> Civil protection
              </p>
            </div>
          </div>
        </div>

        {/* Contacts by type */}
        <div className="mt-8 space-y-8">
          {sortedTypes.map((type) => (
            <div key={type}>
              <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50 flex items-center gap-2">
                {CONTACT_ICONS[type] ?? <Phone className="h-5 w-5 text-ink-400" />}
                {CONTACT_LABELS[type] ?? type}
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[type].map((c) => (
                  <div key={c.id} className="card p-4">
                    <h3 className="font-medium text-ink-900 dark:text-sand-100">{c.name}</h3>
                    <div className="mt-2 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-terracotta-500" />
                      <a href={`tel:${c.phone}`} className="text-sm font-medium text-terracotta-700 dark:text-terracotta-400">
                        {c.phone}
                      </a>
                    </div>
                    {c.address && (
                      <div className="mt-1 flex items-center gap-2 text-sm text-ink-500 dark:text-sand-400">
                        <MapPin className="h-4 w-4" /> {c.address}
                      </div>
                    )}
                    {c.notes && (
                      <p className="mt-2 text-xs text-ink-400 dark:text-sand-500">{c.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
