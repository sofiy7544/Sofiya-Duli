'use client';

import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { ErrorAlert } from '@/components/ui';
import { ThemeToggle } from '@/components/theme-toggle';

export function LoginForm() {
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/login', { method: 'POST', json: { email: form.get('email'), password: form.get('password') } });
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error && err.message === 'Требуется вход' ? new Error('Неверный email или пароль') : err);
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div style={{ position: 'fixed', top: 16, right: 16 }}>
        <ThemeToggle />
      </div>
      <form className="card login-card" onSubmit={submit}>
        <div className="row" style={{ gap: 10 }}>
          <span className="brand-mark">
            <ShieldCheck size={16} />
          </span>
          <div>
            <h1 style={{ fontSize: 17 }}>Phone Check</h1>
            <div className="muted small">Сверка номеров с клиентской базой</div>
          </div>
        </div>
        <ErrorAlert error={error} />
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" autoComplete="username" required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
        </div>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? 'Вход…' : 'Войти'}
        </button>
        <p className="muted small" style={{ margin: 0 }}>
          Доступ только для сотрудников. Все действия записываются в журнал аудита.
        </p>
      </form>
    </div>
  );
}
