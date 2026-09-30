'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDateTime, fmtNumber } from '@/lib/format';
import type { AuditRow } from '@/server/services/audit';
import { STATUS_LABEL, type MatchStatus } from '@/lib/types';
import { ErrorAlert, Spinner } from '@/components/ui';

const ACTIONS: Record<string, string> = {
  'batch.uploaded': 'Загрузил файл',
  'batch.processed': 'Файл обработан',
  'batch.failed': 'Ошибка обработки',
  'batch.exported': 'Экспорт XLSX',
  'batch.deleted': 'Удалил пакет',
  'batch.expired': 'Удалено по сроку',
  'customer.viewed': 'Просмотр данных клиента',
  'customer.updated': 'Изменил данные клиента',
  'match.confirmed': 'Подтвердил совпадение',
  'match.rejected': 'Отклонил совпадение',
  'auth.login': 'Вход',
  'auth.login_failed': 'Неудачный вход',
  'auth.logout': 'Выход',
  'user.created': 'Создал пользователя',
  'user.updated': 'Изменил пользователя',
  'crm.imported': 'Импорт из CRM',
};

function summary(e: AuditRow): string {
  const d = e.details as Record<string, any>;
  switch (e.action) {
    case 'batch.uploaded':
      return `${d.fileName} (${d.fileType?.toUpperCase()})`;
    case 'batch.processed':
      return `${fmtNumber(d.uniquePhones ?? 0)} номеров · найдено ${fmtNumber(d.counts?.exact_match ?? 0)} · на проверку ${fmtNumber((d.counts?.needs_review ?? 0) + (d.counts?.multiple_matches ?? 0))}`;
    case 'match.confirmed':
      return `${d.phone} → ${d.customerRef}`;
    case 'match.rejected':
      return `${d.phone}`;
    case 'customer.updated':
      return `${d.customerRef}: ${(d.changedFields ?? []).join(', ')}`;
    case 'customer.viewed':
      return `${(d.customerRefs ?? [d.customerRef]).filter(Boolean).join(', ')}${d.phone ? ` · ${d.phone}` : ''}`;
    case 'batch.failed':
      return d.error ?? '';
    case 'auth.login_failed':
      return d.email ?? '';
    case 'user.created':
    case 'user.updated':
      return d.email ?? '';
    default:
      return d.fileName ?? '';
  }
}

function Items({ auditId, count }: { auditId: number; count: number }) {
  const [items, setItems] = useState<{ phone: string; status: MatchStatus; customerRef: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const more = async () => {
    setLoading(true);
    const r = await api<{ items: typeof items }>(`/api/audit/${auditId}/items?offset=${items.length}&limit=200`);
    setItems((cur) => [...cur, ...r.items]);
    setLoading(false);
  };
  useEffect(() => {
    void more();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <div className="section-title">Проверенные номера ({fmtNumber(count)})</div>
      <table className="table small">
        <thead>
          <tr>
            <th>Номер (маска)</th>
            <th>Результат</th>
            <th>Найденные записи</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="mono">{it.phone}</td>
              <td>{STATUS_LABEL[it.status]}</td>
              <td className="mono">{it.customerRef ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length < count && (
        <button className="btn btn-sm" style={{ marginTop: 8 }} disabled={loading} onClick={more}>
          Показать ещё
        </button>
      )}
    </div>
  );
}

export function AuditView() {
  const [entries, setEntries] = useState<AuditRow[] | null>(null);
  const [action, setAction] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    async (before?: number) => {
      setError(null);
      const sp = new URLSearchParams({ limit: '100' });
      if (action) sp.set('action', action);
      if (phoneQuery) sp.set('phone', phoneQuery);
      if (before) sp.set('before', String(before));
      try {
        const r = await api<{ entries: AuditRow[] }>(`/api/audit?${sp}`);
        setEntries((cur) => (before && cur ? [...cur, ...r.entries] : r.entries));
        setHasMore(r.entries.length === 100);
      } catch (err) {
        setError(err);
        if (!before) setEntries([]);
      }
    },
    [action, phoneQuery],
  );

  useEffect(() => {
    setEntries(null);
    void load();
  }, [load]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Журнал аудита</h1>
          <p>Кто загружал файлы, какие номера проверялись, что найдено, кто подтверждал совпадения и менял данные. Записи нельзя изменить или удалить.</p>
        </div>
      </div>
      <div className="card">
        <div className="card-head" style={{ flexWrap: 'wrap' }}>
          <select className="select" style={{ width: 260 }} value={action} onChange={(e) => setAction(e.target.value)} aria-label="Тип события">
            <option value="">Все события</option>
            {Object.entries(ACTIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <form
            className="search row"
            onSubmit={(e) => {
              e.preventDefault();
              setPhoneQuery(phone.trim());
            }}
          >
            <Search size={15} />
            <input className="input" placeholder="Когда проверялся номер…" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Поиск по номеру" />
          </form>
          {phoneQuery && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setPhone('');
                setPhoneQuery('');
              }}
            >
              Сбросить
            </button>
          )}
        </div>
        <ErrorAlert error={error} />
        {!entries ? (
          <div className="empty">
            <Spinner />
          </div>
        ) : entries.length === 0 ? (
          <div className="empty">Записей нет</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Пользователь</th>
                  <th>Действие</th>
                  <th>Детали</th>
                  <th>Объект</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <Fragment key={e.id}>
                    <tr className="clickable" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                      <td className="nowrap">{fmtDateTime(e.at)}</td>
                      <td>{e.actorEmail ?? <span className="muted">система</span>}</td>
                      <td className="nowrap">{ACTIONS[e.action] ?? e.action}</td>
                      <td className="text-2" style={{ maxWidth: 420 }}>
                        <div className="ellipsis">{summary(e)}</div>
                      </td>
                      <td className="small">
                        {e.entityType === 'batch' && e.entityId ? (
                          <Link href={`/batches/${e.entityId}`} onClick={(ev) => ev.stopPropagation()}>
                            пакет
                          </Link>
                        ) : e.entityType === 'check_result' && e.entityId ? (
                          <Link href={`/results/${e.entityId}`} onClick={(ev) => ev.stopPropagation()}>
                            запись
                          </Link>
                        ) : e.entityType === 'customer' && e.entityId ? (
                          <Link href={`/customers/${e.entityId}`} onClick={(ev) => ev.stopPropagation()}>
                            клиент
                          </Link>
                        ) : (
                          <span className="muted">{e.entityType ?? '—'}</span>
                        )}
                      </td>
                      <td className="mono muted">{e.ip ?? '—'}</td>
                    </tr>
                    {open === e.id && (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--surface-2)' }}>
                          <pre className="json">{JSON.stringify(e.details, null, 2)}</pre>
                          {e.itemCount > 0 && <Items auditId={e.id} count={e.itemCount} />}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {entries && entries.length > 0 && hasMore && (
          <div className="card-pad">
            <button className="btn" onClick={() => load(entries[entries.length - 1]!.id)}>
              Загрузить ещё
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
