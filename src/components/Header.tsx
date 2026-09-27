import { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  Globe,
  Check,
  Menu,
  X,
  ChevronDown,
  Map,
  Briefcase,
  MessageCircle,
  ShieldAlert,
  CalendarDays,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { useI18n, LOCALES, type Locale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Header({ currentPath, onNavigate }: HeaderProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on navigate
  const navigate = (path: string) => {
    onNavigate(path);
    setMobileOpen(false);
    setMoreOpen(false);
    setAccountOpen(false);
  };

  const primaryNav = [
    { label: t('nav.discover'), path: '/' },
    { label: t('nav.experiences'), path: '/listings' },
    { label: t('nav.gems'), path: '/gems' },
    { label: t('nav.flights'), path: '/flights' },
    { label: t('nav.transport'), path: '/transport' },
  ];

  const moreNav = [
    { label: 'My Trips', path: '/trips', icon: <Map className="h-4 w-4" /> },
    { label: 'Bookings', path: '/bookings', icon: <CalendarDays className="h-4 w-4" /> },
    { label: 'Messages', path: '/messages', icon: <MessageCircle className="h-4 w-4" /> },
    { label: 'Emergency', path: '/emergency', icon: <ShieldAlert className="h-4 w-4" /> },
    { label: 'Provider Portal', path: '/provider', icon: <Briefcase className="h-4 w-4" /> },
    { label: 'Operations', path: '/ops', icon: <ShieldAlert className="h-4 w-4" /> },
  ];

  const currentLocale = LOCALES.find((l) => l.code === locale);
  const isMoreActive = moreNav.some((item) => currentPath === item.path);

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/80 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex flex-shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl">
            <img src="/f04e01d7-169e-4ee9-a16f-2b0bb21a0727 copy copy.png" alt="Amuddu" className="h-full w-full object-contain" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-ink-900 dark:text-sand-50">
            Amuddu
          </span>
        </button>

        {/* Primary nav — desktop */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {primaryNav.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={currentPath === item.path ? 'chip-active' : 'chip-inactive'}
            >
              {item.label}
            </button>
          ))}

          {/* "More" dropdown */}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isMoreActive
                  ? 'bg-terracotta-600 text-white'
                  : 'text-ink-600 hover:bg-sand-100 dark:text-sand-300 dark:hover:bg-ink-800'
              }`}
            >
              More
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreOpen && (
              <div className="absolute left-0 mt-2 w-48 rounded-xl border border-sand-200 bg-white py-1 shadow-lg dark:border-ink-700 dark:bg-ink-900">
                {moreNav.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                      currentPath === item.path
                        ? 'bg-terracotta-50 text-terracotta-700 dark:bg-terracotta-900/20 dark:text-terracotta-300'
                        : 'text-ink-700 hover:bg-sand-50 dark:text-sand-200 dark:hover:bg-ink-800'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {/* Language switcher */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm text-ink-600 transition-colors hover:bg-sand-100 dark:text-sand-300 dark:hover:bg-ink-800"
              aria-label="Change language"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">
                {currentLocale?.code.toUpperCase().slice(0, 2)}
              </span>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-sand-200 bg-white py-1 shadow-lg dark:border-ink-700 dark:bg-ink-900">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLocale(l.code as Locale);
                      setLangOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-4 py-2 text-sm text-ink-700 transition-colors hover:bg-sand-50 dark:text-sand-200 dark:hover:bg-ink-800"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{l.flag}</span>
                      {l.nativeName}
                    </span>
                    {locale === l.code && <Check className="h-4 w-4 text-terracotta-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark mode */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-full p-2 text-ink-600 transition-colors hover:bg-sand-100 dark:text-sand-300 dark:hover:bg-ink-800"
            aria-label="Toggle dark mode"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {/* Plan CTA — desktop */}
          <button
            onClick={() => navigate('/plan')}
            className="btn-primary hidden lg:inline-flex"
          >
            {t('nav.plan')}
          </button>

          {/* Account menu — desktop */}
          {user ? (
            <div ref={accountRef} className="relative hidden lg:block">
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-sand-200 px-2.5 py-1.5 text-sm text-ink-600 transition-colors hover:bg-sand-100 dark:border-ink-700 dark:text-sand-300 dark:hover:bg-ink-800"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-terracotta-600 text-xs font-medium text-white">
                  {(profile?.display_name ?? user.email ?? '?').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
              </button>
              {accountOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-sand-200 bg-white py-1 shadow-lg dark:border-ink-700 dark:bg-ink-900">
                  <div className="border-b border-sand-100 px-4 py-2 dark:border-ink-800">
                    <p className="truncate text-sm font-medium text-ink-900 dark:text-sand-100">{profile?.display_name ?? 'Traveller'}</p>
                    <p className="truncate text-xs text-ink-400 dark:text-sand-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => navigate('/account')}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                      currentPath === '/account'
                        ? 'bg-terracotta-50 text-terracotta-700 dark:bg-terracotta-900/20 dark:text-terracotta-300'
                        : 'text-ink-700 hover:bg-sand-50 dark:text-sand-200 dark:hover:bg-ink-800'
                    }`}
                  >
                    <UserIcon className="h-4 w-4" /> Account & Settings
                  </button>
                  <button
                    onClick={() => { signOut(); navigate('/'); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-terracotta-600 hover:bg-terracotta-50 dark:text-terracotta-400 dark:hover:bg-terracotta-900/20"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/signin')}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-sand-200 px-3 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-sand-100 dark:border-ink-700 dark:text-sand-300 dark:hover:bg-ink-800"
            >
              <UserIcon className="h-4 w-4" /> Sign in
            </button>
          )}

          {/* Hamburger — mobile/tablet */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex items-center justify-center rounded-full p-2 text-ink-600 transition-colors hover:bg-sand-100 dark:text-sand-300 dark:hover:bg-ink-800 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-sand-200 bg-white px-4 pb-4 pt-2 dark:border-ink-800 dark:bg-ink-950 lg:hidden">
          <div className="grid grid-cols-2 gap-1">
            {[...primaryNav, ...moreNav].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${'icon' in item ? 'justify-start' : ''} ${
                  currentPath === item.path
                    ? 'bg-terracotta-600 text-white'
                    : 'text-ink-700 hover:bg-sand-100 dark:text-sand-200 dark:hover:bg-ink-800'
                }`}
              >
                {'icon' in item && item.icon}
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/plan')}
            className="btn-primary mt-3 w-full"
          >
            {t('nav.plan')}
          </button>
          {user ? (
            <div className="mt-2 border-t border-sand-100 pt-2 dark:border-ink-800">
              <button
                onClick={() => navigate('/account')}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-sand-100 dark:text-sand-200 dark:hover:bg-ink-800"
              >
                <UserIcon className="h-4 w-4" /> {profile?.display_name ?? 'Account'}
              </button>
              <button
                onClick={() => { signOut(); navigate('/'); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-terracotta-600 hover:bg-terracotta-50 dark:text-terracotta-400 dark:hover:bg-terracotta-900/20"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/signin')}
              className="btn-secondary mt-2 w-full"
            >
              <UserIcon className="h-4 w-4" /> Sign in
            </button>
          )}
        </div>
      )}
    </header>
  );
}
