import { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, Eye, TrendingUp, MapPin } from 'lucide-react';
import type { HiddenGem } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface GemDetailPageProps {
  gemId: string;
  onNavigate: (path: string) => void;
}

export function GemDetailPage({ gemId, onNavigate }: GemDetailPageProps) {
  const [gem, setGem] = useState<HiddenGem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('hidden_gem')
          .select('*')
          .eq('id', gemId)
          .maybeSingle();
        if (!mounted) return;
        if (error) throw new Error(error.message);
        setGem(data as HiddenGem | null);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [gemId]);

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="card h-96 skeleton" />
      </div>
    );
  }

  if (error || !gem) {
    return (
      <div className="container-page py-16 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-ink-300" />
        <p className="mt-4 text-ink-500">{error ?? 'Gem not found.'}</p>
        <button onClick={() => onNavigate('/gems')} className="btn-secondary mt-6">
          Back to gems
        </button>
      </div>
    );
  }

  const crowdLabel =
    gem.crowd_level < 0.3
      ? 'Quiet and uncrowded'
      : gem.crowd_level < 0.6
        ? 'Growing in popularity'
        : 'Well-discovered';

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <button onClick={() => onNavigate('/gems')} className="btn-ghost mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-zellige-300 to-zellige-500 dark:from-ink-700 dark:to-ink-600">
          {gem.image_url ? (
            <img
              src={gem.image_url}
              alt={gem.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-16 w-16 text-white/80" />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="chip bg-zellige-100 text-zellige-700">
            <Sparkles className="h-3.5 w-3.5" /> Hidden gem
          </span>
          <span
            className={
              gem.crowd_level < 0.3
                ? 'chip bg-zellige-500 text-white'
                : 'chip bg-saffron-500 text-white'
            }
          >
            {gem.crowd_level < 0.3 ? <Eye className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            {crowdLabel}
          </span>
        </div>

        <h1 className="mt-4 font-display text-3xl font-semibold text-ink-900 dark:text-sand-50">
          {gem.name}
        </h1>
        <p className="mt-3 text-ink-600 dark:text-sand-400">{gem.description}</p>

        {/* Story (content module) */}
        <div className="mt-8 card p-8">
          <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-sand-50">The story</h2>
          <p className="mt-3 text-ink-600 leading-relaxed dark:text-sand-400">{gem.story}</p>
        </div>

        {/* Scores (§30.4) */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Authenticity', value: gem.authenticity, desc: 'Low review count, high quality, absent from mainstream lists.' },
            { label: 'Fit', value: gem.fit_score, desc: 'How well it matches traveller interests and pace.' },
            { label: 'Crowd level', value: gem.crowd_level, desc: 'Recent booking and review velocity. A rising gem is reframed.' },
          ].map((s, i) => (
            <div key={i} className="card p-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink-400 dark:text-sand-500">{s.label}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">
                  {Math.round(s.value * 100)}
                </span>
                <span className="text-sm text-ink-400 dark:text-sand-500">/100</span>
              </div>
              <p className="mt-2 text-xs text-ink-500 dark:text-sand-400">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="mt-6 flex flex-wrap gap-2">
          {gem.tags.map((tag) => (
            <span key={tag} className="chip bg-sand-100 text-ink-600 dark:bg-ink-800 dark:text-sand-300">
              <MapPin className="h-3 w-3" /> {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
