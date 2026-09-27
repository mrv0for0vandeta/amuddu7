import { useState } from 'react';
import { Compass, Mail, Lock, User as UserIcon, Loader2, AlertCircle, Phone, Apple, Chrome } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface AuthPageProps {
  mode: 'signin' | 'signup';
  onNavigate: (path: string) => void;
}

type AuthMethod = 'email' | 'phone' | 'oauth';

export function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const [method, setMethod] = useState<AuthMethod>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpAttempts, setOtpAttempts] = useState(0);

  const isSignUp = mode === 'signup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, displayName || 'Traveller');
        if (error) setError(error);
      } else {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone) return;
    setOtpLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: isSignUp },
      });
      if (error) {
        setError(error.message);
      } else {
        setOtpSent(true);
      }
    } catch {
      setError('Failed to send code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!phone || !otpCode) return;
    if (otpAttempts >= 3) {
      setError('Too many attempts. Please request a new code.');
      return;
    }
    setOtpLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otpCode,
        type: isSignUp ? 'sms' : 'sms',
      });
      if (error) {
        setOtpAttempts((a) => a + 1);
        setError(error.message);
      }
    } catch {
      setError('Invalid code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) setError(error.message);
    } catch {
      setError(`${provider === 'google' ? 'Google' : 'Apple'} sign-in failed.`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sand-50 to-sand-100 px-4 dark:from-ink-950 dark:to-ink-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <button onClick={() => onNavigate('/')} className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-terracotta-600 text-white">
              <Compass className="h-6 w-6" />
            </div>
            <span className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-sand-50">Amuddu</span>
          </button>
        </div>

        <div className="card p-8 animate-fade-in-up">
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-sand-400">
            {isSignUp ? 'Plan trips, book verified providers, and discover hidden gems.' : 'Sign in to continue your journey.'}
          </p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-terracotta-50 p-3 text-sm text-terracotta-700 dark:bg-terracotta-900/20 dark:text-terracotta-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Method tabs */}
          <div className="mt-6 flex gap-2 rounded-xl bg-sand-100 p-1 dark:bg-ink-800">
            <button onClick={() => setMethod('email')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${method === 'email' ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-900 dark:text-sand-50' : 'text-ink-500 dark:text-sand-400'}`}>
              <Mail className="h-4 w-4 inline mr-1" /> Email
            </button>
            <button onClick={() => setMethod('phone')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${method === 'phone' ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-900 dark:text-sand-50' : 'text-ink-500 dark:text-sand-400'}`}>
              <Phone className="h-4 w-4 inline mr-1" /> Phone
            </button>
          </div>

          {/* Email form */}
          {method === 'email' && (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {isSignUp && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Display name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="input-field pl-10" required />
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-field pl-10" required autoComplete="email" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isSignUp ? 'At least 6 characters' : 'Your password'} className="input-field pl-10" required minLength={6} autoComplete={isSignUp ? 'new-password' : 'current-password'} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait...</> : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>
          )}

          {/* Phone OTP form (T-02) */}
          {method === 'phone' && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Phone number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6 12 34 56 78" className="input-field pl-10" required disabled={otpSent} />
                </div>
              </div>
              {!otpSent ? (
                <button onClick={handleSendOtp} disabled={otpLoading || !phone} className="btn-primary w-full">
                  {otpLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : 'Send code'}
                </button>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-sand-300">Verification code</label>
                    <input type="text" inputMode="numeric" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="123456" className="input-field text-center text-2xl tracking-[0.5em]" required />
                    <p className="mt-1 text-xs text-ink-400">Code expires in 10 minutes. {3 - otpAttempts} attempts remaining.</p>
                  </div>
                  <button onClick={handleVerifyOtp} disabled={otpLoading || !otpCode || otpAttempts >= 3} className="btn-primary w-full">
                    {otpLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : 'Verify code'}
                  </button>
                  <button onClick={() => { setOtpSent(false); setOtpCode(''); setOtpAttempts(0); }} className="btn-ghost w-full text-sm">
                    Use a different number
                  </button>
                </>
              )}
            </div>
          )}

          {/* OAuth divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-sand-200 dark:bg-ink-700" />
            <span className="text-xs text-ink-400">or continue with</span>
            <div className="h-px flex-1 bg-sand-200 dark:bg-ink-700" />
          </div>

          {/* OAuth buttons (T-03) */}
          <div className="mt-4 flex gap-3">
            <button onClick={() => handleOAuth('google')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sand-200 py-2.5 text-sm font-medium text-ink-700 transition-all hover:bg-sand-50 dark:border-ink-700 dark:text-sand-200 dark:hover:bg-ink-800">
              <Chrome className="h-4 w-4" /> Google
            </button>
            <button onClick={() => handleOAuth('apple')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sand-200 py-2.5 text-sm font-medium text-ink-700 transition-all hover:bg-sand-50 dark:border-ink-700 dark:text-sand-200 dark:hover:bg-ink-800">
              <Apple className="h-4 w-4" /> Apple
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-ink-500 dark:text-sand-400">
            {isSignUp ? (
              <>Already have an account? <button onClick={() => onNavigate('/signin')} className="font-medium text-terracotta-600 hover:underline dark:text-terracotta-400">Sign in</button></>
            ) : (
              <>Don't have an account? <button onClick={() => onNavigate('/signup')} className="font-medium text-terracotta-600 hover:underline dark:text-terracotta-400">Sign up</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
