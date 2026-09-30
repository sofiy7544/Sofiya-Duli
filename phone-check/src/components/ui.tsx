'use client';

import { STATUS_LABEL, type ConsentStatus, type MatchStatus } from '@/lib/types';
import { fmtDate } from '@/lib/format';

const STATUS_CLASS: Record<MatchStatus, string> = {
  exact_match: 'b-ok',
  multiple_matches: 'b-info',
  needs_review: 'b-warn',
  not_found: '',
  invalid_phone: 'b-danger',
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function ConsentBadge({ status, at }: { status: ConsentStatus | null; at?: string | null }) {
  if (!status) return <span className="muted">—</span>;
  if (status === 'granted')
    return (
      <span className="badge b-ok" title="Согласие получено">
        Согласие{at ? ` · ${fmtDate(at)}` : ''}
      </span>
    );
  if (status === 'withdrawn') return <span className="badge b-danger">Отозвано{at ? ` · ${fmtDate(at)}` : ''}</span>;
  return <span className="badge">Не зафиксировано</span>;
}

export function Confidence({ value }: { value: number | null }) {
  if (value == null) return <span className="muted">—</span>;
  const color = value >= 95 ? 'var(--ok)' : value >= 60 ? 'var(--warn)' : value > 0 ? 'var(--info)' : 'var(--border-strong)';
  return (
    <span className="conf" title={`Уверенность ${value}%`}>
      <span className="conf-bar">
        <span style={{ width: `${value}%`, background: color }} />
      </span>
      {value}%
    </span>
  );
}

export function Spinner() {
  return <span className="spinner" role="status" aria-label="Загрузка" />;
}

export function ErrorAlert({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="alert alert-error">{error instanceof Error ? error.message : String(error)}</div>;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
