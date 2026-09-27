import { useEffect, useState } from 'react';
import {
  Compass,
  Sparkles,
  ShieldCheck,
  Map as MapIcon,
  ArrowRight,
  Eye,
  Heart,
  TrendingUp,
  Plane,
  Train,
  Bus,
} from 'lucide-react';
import type { Listing, HiddenGem, Provider } from '@/lib/types';
import { fetchListingsByRegion, fetchGemsByRegion, fetchProvidersByRegion } from '@/lib/data';
import { ListingCard } from '@/components/ListingCard';
import { GemCard } from '@/components/GemCard';
import { useI18n } from '@/lib/i18n';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const { t } = useI18n();
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [featuredGems, setFeaturedGems] = useState<HiddenGem[]>([]);
  const [featuredProviders, setFeaturedProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [listings, gems, providers] = await Promise.all([
          fetchListingsByRegion('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
          fetchGemsByRegion('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
          fetchProvidersByRegion('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
        ]);
        if (!mounted) return;
        setFeaturedListings(listings.slice(0, 3));
        setFeaturedGems(gems.slice(0, 3));
        setFeaturedProviders(providers.slice(0, 3));
      } catch {
        // graceful empty
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-terracotta-100/40 via-sand-50 to-sand-50" />
        <div className="container-page relative py-16 sm:py-24">
          <div className="max-w-2xl">
            <span className="chip bg-terracotta-100 text-terracotta-700">
              <Sparkles className="h-3.5 w-3.5" />
              Morocco, planned with care
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
              Travel Morocco with a{' '}
              <span className="text-terracotta-700">local companion</span>{' '}
              that knows the hidden paths.
            </h1>
            <p className="mt-4 text-lg text-ink-600">
              Amuddu matches you with verified local providers, plans your trip day by day,
              and surfaces the places most travellers drive straight past — all
              with honest explanations for every recommendation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => onNavigate('/plan')} className="btn-primary">
                Plan a trip
                <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => onNavigate('/gems')} className="btn-secondary">
                Discover hidden gems
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-14">
        <h2 className="section-title">How Amuddu works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            { icon: <Compass className="h-6 w-6 text-terracotta-600" />, title: t('plan.tellUsTrip'), body: t('plan.tellUsBody') },
            { icon: <Sparkles className="h-6 w-6 text-zellige-600" />, title: t('plan.wePlanDay'), body: t('plan.wePlanBody') },
            { icon: <ShieldCheck className="h-6 w-6 text-saffron-600" />, title: t('plan.matchProviders'), body: t('plan.matchBody') },
          ].map((step, i) => (
            <div key={i} className="card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sand-100">
                {step.icon}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-500">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured experiences */}
      <section className="container-page py-8">
        <div className="flex items-end justify-between">
          <h2 className="section-title">Featured experiences</h2>
          <button onClick={() => onNavigate('/listings')} className="link-underline text-sm text-terracotta-700">
            See all
          </button>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card h-72 skeleton" />
              ))
            : featuredListings.map((l) => (
                <ListingCard key={l.id} listing={l} onClick={() => onNavigate(`/listings/${l.id}`)} />
              ))}
        </div>
      </section>

      {/* Hidden gems */}
      <section className="container-page py-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="section-title">Hidden gems</h2>
            <p className="mt-1 text-sm text-ink-500">
              Places ranked by authenticity and crowd level, not review volume.
            </p>
          </div>
          <button onClick={() => onNavigate('/gems')} className="link-underline text-sm text-zellige-700">
            See all
          </button>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card h-64 skeleton" />
              ))
            : featuredGems.map((g) => (
                <GemCard key={g.id} gem={g} onClick={() => onNavigate(`/gems/${g.id}`)} />
              ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="container-page py-8">
        <div className="card grid gap-6 bg-gradient-to-br from-sand-100 to-terracotta-50 p-8 sm:grid-cols-3">
          {[
            { icon: <ShieldCheck className="h-8 w-8 text-zellige-600" />, title: t('plan.verifiedProviders'), body: t('plan.verifiedBody') },
            { icon: <Eye className="h-8 w-8 text-terracotta-600" />, title: t('plan.honestComparisons'), body: t('plan.honestBody') },
            { icon: <TrendingUp className="h-8 w-8 text-saffron-600" />, title: t('plan.gemsStayHidden'), body: t('plan.gemsBody') },
          ].map((item, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                {item.icon}
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-900">{item.title}</h3>
              <p className="text-sm text-ink-500">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flights and transport */}
      <section className="container-page py-8">
        <h2 className="section-title">{t('plan.flightsAndTransport')}</h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">
          {t('plan.flightsAndTransportDesc')}
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {[
            { icon: <Plane className="h-6 w-6 text-terracotta-600" />, title: t('plan.flightsToMoroccoCard'), body: t('plan.flightsToMoroccoBody'), action: t('plan.searchFlightsBtn'), path: '/flights' },
            { icon: <Train className="h-6 w-6 text-zellige-600" />, title: t('plan.alBoraq'), body: t('plan.alBoraqBody'), action: t('plan.searchTrains'), path: '/transport' },
            { icon: <Bus className="h-6 w-6 text-saffron-600" />, title: t('plan.busesTaxis'), body: t('plan.busesTaxisBody'), action: t('plan.searchTransportBtn'), path: '/transport' },
          ].map((item, i) => (
            <div key={i} className="card flex flex-col gap-3 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sand-100">
                {item.icon}
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-900">{item.title}</h3>
              <p className="text-sm text-ink-500">{item.body}</p>
              <button onClick={() => onNavigate(item.path)} className="btn-secondary mt-auto text-xs">
                {item.action} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Featured providers */}
      {featuredProviders.length > 0 && (
        <section className="container-page py-8">
          <h2 className="section-title">Meet the providers</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {featuredProviders.map((p) => (
              <div key={p.id} className="card p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-terracotta-200 to-sand-200">
                    <Heart className="h-6 w-6 text-terracotta-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-ink-900">{p.display_name}</h3>
                    <p className="text-xs capitalize text-ink-500">{p.category}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-ink-500">{p.bio}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-ink-500">
                  <MapIcon className="h-3.5 w-3.5" />
                  {p.languages.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container-page py-14">
        <div className="card flex flex-col items-center gap-4 bg-gradient-to-br from-terracotta-600 to-terracotta-700 p-10 text-center text-white">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            Ready to plan your Morocco trip?
          </h2>
          <p className="max-w-md text-terracotta-100">
            Tell us your dates, budget and interests. We will build a day-by-day plan with verified providers and hidden gems.
          </p>
          <button
            onClick={() => onNavigate('/plan')}
            className="btn bg-white text-terracotta-700 hover:bg-sand-50"
          >
            Start planning
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
