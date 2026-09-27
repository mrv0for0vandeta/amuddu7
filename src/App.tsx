import { useState, useCallback, useEffect } from 'react';
import { supabaseConfigured } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LandingPage } from '@/pages/LandingPage';
import { ListingsPage } from '@/pages/ListingsPage';
import { GemsPage } from '@/pages/GemsPage';
import { ListingDetailPage } from '@/pages/ListingDetailPage';
import { GemDetailPage } from '@/pages/GemDetailPage';
import { PlanTripPage } from '@/pages/PlanTripPage';
import { ItineraryPage } from '@/pages/ItineraryPage';
import { ComparisonPage } from '@/pages/ComparisonPage';
import { FlightsPage } from '@/pages/FlightsPage';
import { TransportPage } from '@/pages/TransportPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { MyTripsPage } from '@/pages/MyTripsPage';
import { MyBookingsPage } from '@/pages/MyBookingsPage';
import { EmergencyPage } from '@/pages/EmergencyPage';
import { SharedTripPage } from '@/pages/SharedTripPage';
import { AuthPage } from '@/pages/AuthPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { AccountPage } from '@/pages/AccountPage';
import { ProviderPortalPage } from '@/pages/ProviderPortalPage';
import { OpsConsolePage } from '@/pages/OpsConsolePage';
import { useAuth } from '@/lib/auth';
import { Loader2, AlertCircle } from 'lucide-react';
import { checkAppVersion, compareVersions, track } from '@/lib/platform';
import { registerPushToken, startNotificationPolling } from '@/lib/notifications';
import { onNetworkChange, syncQueuedActions } from '@/lib/offline';

const APP_VERSION = '1.0.0';

type Route =
  | { name: 'home' }
  | { name: 'listings' }
  | { name: 'gems' }
  | { name: 'flights' }
  | { name: 'transport' }
  | { name: 'listing'; id: string }
  | { name: 'gem'; id: string }
  | { name: 'plan' }
  | { name: 'trip'; id: string }
  | { name: 'compare'; ids: string[] }
  | { name: 'messages' }
  | { name: 'conversation'; id: string }
  | { name: 'trips' }
  | { name: 'bookings' }
  | { name: 'emergency' }
  | { name: 'shared'; token: string }
  | { name: 'signin' }
  | { name: 'signup' }
  | { name: 'onboarding' }
  | { name: 'account' }
  | { name: 'provider' }
  | { name: 'ops' };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'listings' && parts[1]) return { name: 'listing', id: parts[1] };
  if (parts[0] === 'listings') return { name: 'listings' };
  if (parts[0] === 'gems' && parts[1]) return { name: 'gem', id: parts[1] };
  if (parts[0] === 'gems') return { name: 'gems' };
  if (parts[0] === 'flights') return { name: 'flights' };
  if (parts[0] === 'transport') return { name: 'transport' };
  if (parts[0] === 'plan') return { name: 'plan' };
  if (parts[0] === 'trips' && parts[1]) return { name: 'trip', id: parts[1] };
  if (parts[0] === 'trips') return { name: 'trips' };
  if (parts[0] === 'bookings') return { name: 'bookings' };
  if (parts[0] === 'messages' && parts[1]) return { name: 'conversation', id: parts[1] };
  if (parts[0] === 'messages') return { name: 'messages' };
  if (parts[0] === 'emergency') return { name: 'emergency' };
  if (parts[0] === 'shared' && parts[1]) return { name: 'shared', token: parts[1] };
  if (parts[0] === 'signin') return { name: 'signin' };
  if (parts[0] === 'signup') return { name: 'signup' };
  if (parts[0] === 'onboarding') return { name: 'onboarding' };
  if (parts[0] === 'account') return { name: 'account' };
  if (parts[0] === 'provider') return { name: 'provider' };
  if (parts[0] === 'ops') return { name: 'ops' };
  if (parts[0] === 'compare' && parts[1]) {
    return { name: 'compare', ids: parts[1].split(',').filter(Boolean) };
  }
  return { name: 'home' };
}

function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home': return '/';
    case 'listings': return '/listings';
    case 'gems': return '/gems';
    case 'flights': return '/flights';
    case 'transport': return '/transport';
    case 'listing': return `/listings/${route.id}`;
    case 'gem': return `/gems/${route.id}`;
    case 'plan': return '/plan';
    case 'trip': return `/trips/${route.id}`;
    case 'compare': return `/compare/${route.ids.join(',')}`;
    case 'messages': return '/messages';
    case 'conversation': return `/messages/${route.id}`;
    case 'trips': return '/trips';
    case 'bookings': return '/bookings';
    case 'emergency': return '/emergency';
    case 'shared': return `/shared/${route.token}`;
    case 'signin': return '/signin';
    case 'signup': return '/signup';
    case 'onboarding': return '/onboarding';
    case 'account': return '/account';
    case 'provider': return '/provider';
    case 'ops': return '/ops';
  }
}

// Routes that require authentication
const PROTECTED_ROUTES = new Set(['plan', 'trip', 'trips', 'bookings', 'messages', 'conversation', 'account', 'provider', 'ops']);

// Routes that are part of the auth flow (shouldn't show the main header)
const AUTH_ROUTES = new Set(['signin', 'signup', 'onboarding']);

export default function App() {
  const { user, loading, needsOnboarding } = useAuth();
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [transitionKey, setTransitionKey] = useState(0);
  const [upgradeBlocked, setUpgradeBlocked] = useState(false);

  const navigate = useCallback((path: string) => {
    const clean = path.startsWith('/') ? path.slice(1) : path;
    window.location.hash = `#/${clean}`;
  }, []);

  useEffect(() => {
    const handler = () => {
      setRoute(parseHash());
      setTransitionKey((k) => k + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // Forced upgrade check (X-16)
  useEffect(() => {
    (async () => {
      try {
        const version = await checkAppVersion();
        if (version && version.is_blocking && compareVersions(APP_VERSION, version.minimum_version) < 0) {
          setUpgradeBlocked(true);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Analytics + push + offline sync on mount
  useEffect(() => {
    track('app_opened', { locale: navigator.language });
    if (user) {
      registerPushToken();
      startNotificationPolling();
    }
    onNetworkChange((online) => {
      if (online) syncQueuedActions();
    });
  }, [user]);

  const currentPath = routeToHash(route);

  // Missing Supabase configuration — show setup screen
  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4 dark:bg-ink-950">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-terracotta-500" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">Configuration required</h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-sand-400">
            This app needs Supabase environment variables to run. If you deployed to Vercel, add the following environment variables in your Vercel project settings (Settings → Environment Variables):
          </p>
          <div className="mt-4 rounded-lg bg-ink-100 p-4 text-left text-xs font-mono text-ink-700 dark:bg-ink-800 dark:text-sand-300">
            <p>VITE_SUPABASE_URL</p>
            <p>VITE_SUPABASE_ANON_KEY</p>
          </div>
          <p className="mt-3 text-xs text-ink-400">After adding them, redeploy your project.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-terracotta-500" />
      </div>
    );
  }

  // Forced upgrade screen (X-16)
  if (upgradeBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4 dark:bg-ink-950">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-terracotta-500" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">Update required</h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-sand-400">Please update Amuddu to the latest version to continue.</p>
        </div>
      </div>
    );
  }

  // Auth pages (no header/footer)
  if (route.name === 'signin' || route.name === 'signup') {
    return <AuthPage mode={route.name} onNavigate={navigate} />;
  }

  // Shared trips are viewable without auth
  if (route.name === 'shared') {
    return <SharedTripPage token={route.token} />;
  }

  // Redirect to onboarding if user is logged in but hasn't completed it
  if (user && needsOnboarding && route.name !== 'onboarding') {
    return <OnboardingPage onNavigate={navigate} />;
  }

  // Show onboarding page
  if (route.name === 'onboarding') {
    if (!user) {
      navigate('/signin');
      return null;
    }
    return <OnboardingPage onNavigate={navigate} />;
  }

  // Protected routes — redirect to sign in if not logged in
  if (PROTECTED_ROUTES.has(route.name) && !user) {
    return <AuthPage mode="signin" onNavigate={navigate} />;
  }

  let content: React.ReactNode;
  switch (route.name) {
    case 'home':
      content = <LandingPage onNavigate={navigate} />;
      break;
    case 'listings':
      content = <ListingsPage onNavigate={navigate} />;
      break;
    case 'gems':
      content = <GemsPage onNavigate={navigate} />;
      break;
    case 'flights':
      content = <FlightsPage onNavigate={navigate} />;
      break;
    case 'transport':
      content = <TransportPage onNavigate={navigate} />;
      break;
    case 'listing':
      content = <ListingDetailPage listingId={route.id} onNavigate={navigate} />;
      break;
    case 'gem':
      content = <GemDetailPage gemId={route.id} onNavigate={navigate} />;
      break;
    case 'plan':
      content = <PlanTripPage onNavigate={navigate} />;
      break;
    case 'trip':
      content = <ItineraryPage tripId={route.id} onNavigate={navigate} />;
      break;
    case 'compare':
      content = <ComparisonPage listingIds={route.ids} onNavigate={navigate} />;
      break;
    case 'messages':
      content = <MessagesPage onNavigate={navigate} />;
      break;
    case 'conversation':
      content = <MessagesPage conversationId={route.id} onNavigate={navigate} />;
      break;
    case 'trips':
      content = <MyTripsPage onNavigate={navigate} />;
      break;
    case 'bookings':
      content = <MyBookingsPage onNavigate={navigate} />;
      break;
    case 'emergency':
      content = <EmergencyPage onNavigate={navigate} />;
      break;
    case 'account':
      content = <AccountPage onNavigate={navigate} />;
      break;
    case 'provider':
      content = <ProviderPortalPage onNavigate={navigate} />;
      break;
    case 'ops':
      content = <OpsConsolePage onNavigate={navigate} />;
      break;
    default:
      content = <LandingPage onNavigate={navigate} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header currentPath={currentPath} onNavigate={navigate} />
      <main className="flex-1">
        <div key={transitionKey} className="animate-page-enter">{content}</div>
      </main>
      <Footer onNavigate={navigate} />
    </div>
  );
}
