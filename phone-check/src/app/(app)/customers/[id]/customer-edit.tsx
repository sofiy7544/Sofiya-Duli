'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDateTime, fmtPhone } from '@/lib/format';
import { CHANNELS, CHANNEL_LABEL, type Channel, type ConsentStatus } from '@/lib/types';
import type { CustomerDetail } from '@/server/services/customers';
import { ErrorAlert, Spinner } from '@/components/ui';

interface ChannelForm {
  channel: Channel;
  value: string;
  source: string;
  consentStatus: ConsentStatus;
  consentAt: string;
  withdrawnHidden: boolean;
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const fromDateInput = (v: string) => (v ? new Date(`${v}T00:00:00Z`).toISOString() : null);

export function CustomerEdit({ id, from }: { id: string; from: string | null }) {
  const [c, setC] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', consentStatus: 'unknown' as ConsentStatus, consentAt: '', consentSource: '', notes: '' });
  const [channels, setChannels] = useState<ChannelForm[]>([]);

  const init = (d: CustomerDetail) => {
    setC(d);
    setForm({
      fullName: d.fullName,
      email: d.email ?? '',
      consentStatus: d.consentStatus,
      consentAt: toDateInput(d.consentAt),
      consentSource: d.consentSource ?? '',
      notes: d.notes ?? '',
    });
    setChannels(
      CHANNELS.map((ch) => {
        const cur = d.allChannels.find((x) => x.channel === ch);
        return {
          channel: ch,
          value: cur?.value ?? '',
          source: cur?.source ?? '',
          consentStatus: cur?.consentStatus ?? 'granted',
          consentAt: toDateInput(cur?.consentAt ?? null),
          withdrawnHidden: Boolean(cur?.withdrawn),
        };
      }),
    );
  };

  useEffect(() => {
    api<{ customer: CustomerDetail }>(`/api/customers/${id}`).then((r) => init(r.customer), setError);
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const res = await api<{ changed: string[] }>(`/api/customers/${id}`, {
        method: 'PATCH',
        json: {
          fullName: form.fullName,
          email: form.email.trim() || null,
          consentStatus: form.consentStatus,
          consentAt: fromDateInput(form.consentAt),
          consentSource: form.consentSource.trim() || null,
          notes: form.notes.trim() || null,
          // Канал с отозванным согласием и нетронутым скрытым значением не отправляем
          channels: channels
            .filter((ch) => !(ch.withdrawnHidden && !ch.value))
            .map((ch) => ({ channel: ch.channel, value: ch.value.trim(), source: ch.source.trim() || 'Менеджер', consentStatus: ch.consentStatus, consentAt: fromDateInput(ch.consentAt) })),
        },
      });
      setSaved(res.changed.length ? `Сохранено: ${res.changed.length} изм.` : 'Изменений нет');
      init((await api<{ customer: CustomerDetail }>(`/api/customers/${id}`)).customer);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!c)
    return (
      <div className="page">
        <ErrorAlert error={error} />
        {!error && (
          <div className="empty">
            <Spinner />
          </div>
        )}
      </div>
    );

  const setCh = (i: number, patch: Partial<ChannelForm>) => setChannels((list) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <form className="page" onSubmit={save}>
      <div className="page-head">
        <div>
          <div className="crumbs">
            <Link href="/">Проверки</Link>
            {from && (
              <>
                <ChevronRight size={14} />
                <Link href={`/results/${from}`}>Проверка записи</Link>
              </>
            )}
            <ChevronRight size={14} />
            <span className="mono">{c.customerRef}</span>
          </div>
          <h1>Карточка клиента</h1>
          <p>
            Изменено {fmtDateTime(c.updatedAt)}
            {c.updatedBy ? ` · ${c.updatedBy}` : ''}. Вносите только данные, которые клиент предоставил сам.
          </p>
        </div>
        <button className="btn btn-primary" disabled={busy} type="submit">
          <Save size={15} /> Сохранить
        </button>
      </div>
      <ErrorAlert error={error} />
      {saved && <div className="alert alert-info">{saved}</div>}

      <div className="grid-2">
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>Основное</h2>
          <div className="field">
            <label htmlFor="fullName">ФИО</label>
            <input id="fullName" className="input" required maxLength={200} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="consent">Согласие на связь</label>
              <select id="consent" className="select" value={form.consentStatus} onChange={(e) => setForm({ ...form, consentStatus: e.target.value as ConsentStatus })}>
                <option value="granted">Получено</option>
                <option value="withdrawn">Отозвано</option>
                <option value="unknown">Не зафиксировано</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="consentAt">Дата согласия</label>
              <input id="consentAt" type="date" className="input" value={form.consentAt} onChange={(e) => setForm({ ...form, consentAt: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="consentSource">Как получено согласие</label>
            <input id="consentSource" className="input" maxLength={100} value={form.consentSource} onChange={(e) => setForm({ ...form, consentSource: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="notes">Заметки</label>
            <textarea id="notes" className="textarea" maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="section-title">Телефоны (из CRM, только чтение)</div>
          {c.phones.map((p) => (
            <div key={p.id} className="row small">
              <span className="mono">{fmtPhone(p.phone)}</span>
              <span className="muted">
                {p.isVerified ? 'подтверждён' : 'не подтверждён'}
                {p.isActive ? '' : ', неактуален'} · {p.source}
              </span>
            </div>
          ))}
        </div>

        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2>Каналы связи</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Только username, ссылка или ID, которые клиент сам сообщил магазину. Не ищите профили в соцсетях.
          </p>
          {channels.map((ch, i) => (
            <div key={ch.channel} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, alignItems: 'start' }}>
              <label htmlFor={`ch-${ch.channel}`} style={{ fontWeight: 550, paddingTop: 7 }}>
                {CHANNEL_LABEL[ch.channel]}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  id={`ch-${ch.channel}`}
                  className="input"
                  maxLength={256}
                  value={ch.value}
                  placeholder={ch.withdrawnHidden ? 'Согласие отозвано — значение скрыто' : ch.channel === 'telegram' ? '@username' : ch.channel === 'facebook' ? 'https://www.facebook.com/…' : ''}
                  onChange={(e) => setCh(i, { value: e.target.value })}
                />
                {(ch.value || ch.withdrawnHidden) && (
                  <div className="row">
                    <input className="input" aria-label="Источник" placeholder="Источник" value={ch.source} onChange={(e) => setCh(i, { source: e.target.value })} maxLength={100} />
                    <select className="select" aria-label="Согласие" value={ch.consentStatus} onChange={(e) => setCh(i, { consentStatus: e.target.value as ConsentStatus })} style={{ width: 150 }}>
                      <option value="granted">Согласие</option>
                      <option value="withdrawn">Отозвано</option>
                      <option value="unknown">Неизвестно</option>
                    </select>
                    <input className="input" type="date" aria-label="Дата согласия" value={ch.consentAt} onChange={(e) => setCh(i, { consentAt: e.target.value })} style={{ width: 150 }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}
