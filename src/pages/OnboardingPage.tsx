import { useState } from 'react';
import {
  Compass,
  Globe,
  Wallet,
  MapPin,
  Heart,
  Accessibility,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useI18n, LOCALES, type Locale } from '@/lib/i18n';
import { completeOnboarding } from '@/lib/data';

interface OnboardingPageProps {
  onNavigate: (path: string) => void;
}

const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { code: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { code: 'MAD', label: 'Moroccan Dirham (DH)', symbol: 'DH' },
];

const INTEREST_THEMES: { theme: string; tags: string[] }[] = [
  { theme: 'Culture & History', tags: ['history', 'architecture', 'museums', 'medina', 'mosques', 'palaces'] },
  { theme: 'Food & Drink', tags: ['street-food', 'cooking', 'tea', 'spices', 'wine', 'pastries'] },
  { theme: 'Nature & Outdoors', tags: ['mountains', 'desert', 'waterfalls', 'hiking', 'beaches', 'oasis'] },
  { theme: 'Crafts & Workshops', tags: ['pottery', 'leather', 'weaving', 'carving', 'jewellery', 'painting'] },
  { theme: 'Adventure', tags: ['quad-biking', 'camel-trekking', 'surfing', 'paragliding', '4x4', 'sandboarding'] },
  { theme: 'Wellness', tags: ['hammam', 'spa', 'yoga', 'relaxation', 'massage', 'retreat'] },
  { theme: 'Music & Arts', tags: ['music', 'dance', 'festivals', 'gnawa', 'photography', 'film'] },
];

const PACE_LABELS = ['Relaxed', 'Easy', 'Balanced', 'Full', 'Packed'];
const LUXURY_LABELS = ['Budget', 'Simple', 'Comfortable', 'Luxury'];
const STAMINA_LABELS = ['Low', 'Light', 'Moderate', 'Good', 'High'];
const STEP_LABELS = ['Essential', 'Your Style', 'Interests', 'Accessibility'];

export function OnboardingPage({ onNavigate }: OnboardingPageProps) {
  const { user, refreshProfile } = useAuth();
  const { setLocale } = useI18n();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0: language + currency + display name
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name ?? 'Traveller');
  const [locale, setLocaleState] = useState<Locale>('en');
  const [currency, setCurrency] = useState('EUR');

  // Step 1: travel style
  const [pace, setPace] = useState(3);
  const [luxuryLevel, setLuxuryLevel] = useState(2);
  const [stamina, setStamina] = useState(3);
  const [homeCountry, setHomeCountry] = useState('');
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>(['en']);

  // Step 2: interests
  const [interests, setInterests] = useState<string[]>([]);

  // Step 3: accessibility
  const [mobilityAid, setMobilityAid] = useState(false);
  const [maxWalking, setMaxWalking] = useState(120);
  const [stepTolerance, setStepTolerance] = useState(3);
  const [sensoryNeeds, setSensoryNeeds] = useState('');

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleLanguage = (lang: string) => {
    setLanguagesSpoken((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);
    try {
      setLocale(locale);
      await completeOnboarding({
        display_name: displayName,
        preferred_locale: locale,
        display_currency: currency,
        default_pace: pace,
        default_luxury_level: luxuryLevel,
        default_stamina: stamina,
        home_country: homeCountry || null,
        languages_spoken: languagesSpoken,
        interests,
        mobility_aid: mobilityAid,
        max_walking_minutes: maxWalking,
        step_tolerance: stepTolerance,
        sensory_needs: sensoryNeeds || null,
      });
      await refreshProfile();
      onNavigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return displayName.trim().length > 0;
    if (step === 2) return interests.length >= 3;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-50 to-sand-100 dark:from-ink-950 dark:to-ink-900">
      {/* Top bar */}
      <div className="border-b border-sand-200 bg-white/80 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-terracotta-600 text-white">
              <Compass className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-semibold text-ink-900 dark:text-sand-50">
              Amuddu
            </span>
          </div>
          <span className="text-sm text-ink-400 dark:text-sand-500">
            Step {step + 1} of {STEP_LABELS.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-sand-200 dark:bg-ink-800">
        <div
          className="h-full bg-terracotta-500 transition-all duration-300"
          style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
        />
      </div>

      <div className="container-page max-w-2xl py-12">
        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  i <= step
                    ? 'bg-terracotta-600 text-white'
                    : 'bg-sand-200 text-ink-400 dark:bg-ink-800 dark:text-sand-500'
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`h-0.5 w-8 ${i < step ? 'bg-terracotta-500' : 'bg-sand-200 dark:bg-ink-800'}`} />
              )}
            </div>
          ))}
        </div>

        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">
          {STEP_LABELS[step]}
        </h1>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-terracotta-50 p-3 text-sm text-terracotta-700 dark:bg-terracotta-900/20 dark:text-terracotta-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step 0: Language, currency, name */}
        {step === 0 && (
          <div className="mt-6 space-y-6 animate-fade-in-up">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">
                Your name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-sand-300">
                <Globe className="h-4 w-4" /> Language
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLocaleState(l.code as Locale)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-sm transition-all ${
                      locale === l.code
                        ? 'border-terracotta-500 bg-terracotta-50 dark:bg-terracotta-900/20'
                        : 'border-sand-200 bg-white hover:border-sand-300 dark:border-ink-700 dark:bg-ink-800'
                    }`}
                  >
                    <span className="text-lg">{l.flag}</span>
                    <span className="truncate text-ink-700 dark:text-sand-200">{l.nativeName}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-sand-300">
                <Wallet className="h-4 w-4" /> Display currency
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c.code)}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      currency === c.code
                        ? 'border-terracotta-500 bg-terracotta-50 dark:bg-terracotta-900/20'
                        : 'border-sand-200 bg-white hover:border-sand-300 dark:border-ink-700 dark:bg-ink-800'
                    }`}
                  >
                    <div className="text-lg font-semibold text-ink-900 dark:text-sand-50">{c.symbol}</div>
                    <div className="text-xs text-ink-500 dark:text-sand-400">{c.code}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Travel style */}
        {step === 1 && (
          <div className="mt-6 space-y-6 animate-fade-in-up">
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700 dark:text-sand-300">
                Home country
              </label>
              <input
                type="text"
                value={homeCountry}
                onChange={(e) => setHomeCountry(e.target.value)}
                placeholder="e.g. France, United Kingdom..."
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink-700 dark:text-sand-300">
                Languages you speak
              </label>
              <div className="flex flex-wrap gap-2">
                {['en', 'fr', 'es', 'ary', 'ary-Latn', 'ber', 'de', 'it'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    className={`rounded-full px-3 py-1.5 text-sm transition-all ${
                      languagesSpoken.includes(lang)
                        ? 'bg-terracotta-600 text-white'
                        : 'bg-sand-100 text-ink-600 hover:bg-sand-200 dark:bg-ink-800 dark:text-sand-300'
                    }`}
                  >
                    {LOCALES.find((l) => l.code === lang)?.nativeName ?? lang}
                  </button>
                ))}
              </div>
            </div>

            <Slider
              label="Pace"
              icon={<Clock className="h-4 w-4" />}
              value={pace}
              onChange={setPace}
              labels={PACE_LABELS}
            />
            <Slider
              label="Luxury level"
              icon={<Sparkles className="h-4 w-4" />}
              value={luxuryLevel}
              onChange={setLuxuryLevel}
              labels={LUXURY_LABELS}
              min={1}
              max={4}
            />
            <Slider
              label="Stamina"
              icon={<Heart className="h-4 w-4" />}
              value={stamina}
              onChange={setStamina}
              labels={STAMINA_LABELS}
            />
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div className="mt-6 space-y-6 animate-fade-in-up">
            <p className="text-sm text-ink-500 dark:text-sand-400">
              Select at least three interests so we can plan well. We use these to match you with the right experiences.
            </p>
            {INTEREST_THEMES.map((group) => (
              <div key={group.theme}>
                <h3 className="mb-2 font-medium text-ink-800 dark:text-sand-200">{group.theme}</h3>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
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
              </div>
            ))}
            <div className={`text-sm font-medium ${interests.length >= 3 ? 'text-zellige-600 dark:text-zellige-400' : 'text-saffron-600 dark:text-saffron-400'}`}>
              {interests.length} selected — minimum 3
            </div>
          </div>
        )}

        {/* Step 3: Accessibility */}
        {step === 3 && (
          <div className="mt-6 space-y-6 animate-fade-in-up">
            <p className="text-sm text-ink-500 dark:text-sand-400">
              These feed our retrieval filters, not a post-hoc sort. We exclude items that don't fit, rather than ranking them lower.
            </p>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mobilityAid}
                  onChange={(e) => setMobilityAid(e.target.checked)}
                  className="h-5 w-5 rounded border-sand-300 text-terracotta-600 focus:ring-terracotta-500"
                />
                <span className="text-sm text-ink-700 dark:text-sand-300">
                  I use a mobility aid (wheelchair, cane, etc.)
                </span>
              </label>
            </div>

            <Slider
              label="Maximum walking time per activity"
              icon={<MapPin className="h-4 w-4" />}
              value={maxWalking}
              onChange={setMaxWalking}
              labels={['15 min', '30 min', '60 min', '90 min', '120 min', '180 min']}
              min={15}
              max={180}
              step={15}
            />

            <Slider
              label="Step tolerance"
              icon={<Accessibility className="h-4 w-4" />}
              value={stepTolerance}
              onChange={setStepTolerance}
              labels={['Flat only', 'Few steps', 'Some steps', 'Many steps', 'No limit']}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">
                Sensory needs (optional)
              </label>
              <textarea
                value={sensoryNeeds}
                onChange={(e) => setSensoryNeeds(e.target.value)}
                placeholder="e.g. photosensitive, hearing impaired, prefers quiet environments..."
                className="input-field min-h-[80px]"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-ghost disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {step < STEP_LABELS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="btn-primary disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading || !canProceed()}
              className="btn-primary disabled:opacity-40"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Check className="h-4 w-4" /> Finish</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  labels: string[];
  min?: number;
  max?: number;
  step?: number;
}

function Slider({ label, icon, value, onChange, labels, min = 1, max = 5, step = 1 }: SliderProps) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-sand-300">
        {icon} {label}
        <span className="ml-auto text-terracotta-600 dark:text-terracotta-400 font-semibold">
          {labels[value - min] ?? value}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-terracotta-600"
      />
    </div>
  );
}
