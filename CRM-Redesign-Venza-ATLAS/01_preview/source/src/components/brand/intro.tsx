import * as React from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, MailCheck } from 'lucide-react';
import { useTheme } from '@/lib/theme/provider';
import { detectTenant, PLATFORM } from '@/lib/tenants';
import bgLoop from '@/assets/login-bg-loop.mp4';
import bgLoopWebm from '@/assets/login-bg-loop.webm';
import bgPoster from '@/assets/login-bg-poster.jpg';

/**
 * Экран входа: зациклённый видеофон + прозрачное окно по центру.
 * Кобрендинг по домену почты меняет акцент (фокус, кнопка) без лишнего текста.
 * Поля: «Логин», «Пароль», показ пароля, круглая кнопка со стрелкой.
 */
export const INTRO_EVENT = 'otp-intro-replay';

export function FilmLogin({ onSuccess }: { onSuccess: () => void }) {
  const { family, isDark } = useTheme();
  const dark = family === 'atlas' || isDark;
  const [run, setRun] = React.useState(0);
  React.useEffect(() => { const f = () => setRun((r) => r + 1); addEventListener(INTRO_EVENT, f); return () => removeEventListener(INTRO_EVENT, f); }, []);
  return (
    <div key={run} className="signin">
      <div className="signin__bg" aria-hidden>
        <video poster={bgPoster} autoPlay muted loop playsInline preload="auto" onCanPlay={(e) => void e.currentTarget.play().catch(() => {})}>
          <source src={bgLoop} type="video/mp4" />
          <source src={bgLoopWebm} type="video/webm" />
        </video>
      </div>
      <main className="signin__center">
        <LoginPanel dark={dark} onSuccess={onSuccess} />
      </main>
    </div>
  );
}

function LoginPanel({ dark, onSuccess }: { dark: boolean; onSuccess: () => void }) {
  const DEMO = 'demo@ontop.property';
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'signin' | 'reset' | 'sent'>('signin');
  const passRef = React.useRef<HTMLInputElement>(null);
  const tenant = detectTenant(email);
  void dark;

  // почта впечатывается сама — сразу видно, как окно перекрашивается под бренд агентства
  React.useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setEmail(DEMO); return; }
    let i = 0; let timer: ReturnType<typeof setTimeout>;
    timer = setTimeout(function tick() {
      i += 1; setEmail(DEMO.slice(0, i));
      if (i < DEMO.length) timer = setTimeout(tick, i < 5 ? 90 : 52); else passRef.current?.focus({ preventScroll: true });
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email');
    if (password.length < 8) return setError('Password: at least 8 characters');
    setError(null); setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    if (password === 'wrongpass') { setBusy(false); return setError('Incorrect email or password'); }
    setLeaving(true); setTimeout(onSuccess, 520);
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email');
    setError(null); setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    setBusy(false); setMode('sent'); // ответ одинаковый для любой почты — иначе форма выдаёт, кто есть в базе
  };

  return (
    <form onSubmit={mode === 'reset' ? sendReset : submit} noValidate data-tenant={tenant?.id ?? 'platform'}
      className={`glassin ${leaving ? 'glassin--leave' : ''}`}
      style={{ '--cob-accent': tenant?.accent ?? PLATFORM.accent } as React.CSSProperties}>
      {mode === 'sent' ? (
        <div className="glassin__sent">
          <span className="glassin__sent-icon" aria-hidden><MailCheck /></span>
          <p className="glassin__sent-title">Check your inbox</p>
          <p className="glassin__sent-text">If an account exists for <b>{email}</b>, a reset link is on its way. The link is valid for 30 minutes.</p>
          <button type="button" className="glassin__go" onClick={() => { setMode('signin'); setError(null); }}>Back to sign in</button>
        </div>
      ) : (<>
      <label className={`glassin__field ${error && !/^\S+@\S+\.\S+$/.test(email) ? 'glassin__field--error' : ''}`}>
        <Mail className="glassin__icon" aria-hidden />
        <input type="email" autoComplete="email" inputMode="email" placeholder="Email" aria-label="Email"
          value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} />
      </label>

      {mode === 'signin' && (
      <label className="glassin__field">
        <Lock className="glassin__icon" aria-hidden />
        <input ref={passRef} type={show ? 'text' : 'password'} autoComplete="current-password" maxLength={128} placeholder="Password" aria-label="Password"
          value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} />
        <button type="button" className="glassin__eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
      </label>)}

      {error && <p role="alert" className="glassin__error">{error}</p>}

      <button type="submit" className="glassin__go" disabled={busy}>
        {busy ? <Loader2 className="glassin__spin" aria-hidden /> : null}
        {busy ? (mode === 'reset' ? 'Sending…' : 'Signing in…') : mode === 'reset' ? 'Send reset link' : 'Sign in'}
      </button>

      <button type="button" className="glassin__link"
        onClick={() => { setError(null); setMode(mode === 'reset' ? 'signin' : 'reset'); if (mode === 'signin') setPassword(''); }}>
        {mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}
      </button>
      </>)}
    </form>
  );
}

