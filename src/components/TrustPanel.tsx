import { Star, ShieldCheck, Clock, Globe } from 'lucide-react';
import type { Provider } from '@/lib/types';

interface TrustPanelProps {
  provider: Provider;
  compact?: boolean;
}

// US-2: verification badge, average response time and at least one further
// trust signal shown before messaging is possible.
export function TrustPanel({ provider, compact }: TrustPanelProps) {
  const signals: { icon: React.ReactNode; label: string; value: string }[] = [];

  signals.push({
    icon: <ShieldCheck className="h-4 w-4 text-zellige-600" />,
    label: 'Verified',
    value: provider.verification_state === 'verified' ? 'Licensed' : 'Pending',
  });

  signals.push({
    icon: <Clock className="h-4 w-4 text-saffron-600" />,
    label: 'Responds in',
    value: `${provider.response_time_hours}h avg`,
  });

  signals.push({
    icon: <Star className="h-4 w-4 text-terracotta-500" />,
    label: 'Rating',
    value:
      provider.avg_rating > 0
        ? `${provider.avg_rating}/5 (${provider.review_count})`
        : 'New provider',
  });

  if (provider.languages.length > 0) {
    signals.push({
      icon: <Globe className="h-4 w-4 text-ink-500" />,
      label: 'Languages',
      value: provider.languages.join(', '),
    });
  }

  return (
    <div className={compact ? 'flex flex-wrap gap-3' : 'flex flex-wrap gap-4'}>
      {signals.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {s.icon}
          <div className="text-xs">
            <span className="text-ink-400">{s.label}</span>{' '}
            <span className="font-medium text-ink-700">{s.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
