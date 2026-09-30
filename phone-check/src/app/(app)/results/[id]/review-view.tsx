'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ExternalLink, Pencil, ShieldAlert, X } from 'lucide-react';
import { api } from '@/lib/api';
import { countryName, flag, fmtDate, fmtDateTime, fmtPhone } from '@/lib/format';
import { CHANNEL_LABEL } from '@/lib/types';
import type { ResultDetail } from '@/server/services/review';
import { canWrite, useUser } from '@/components/shell';
import { Confidence, ConsentBadge, ErrorAlert, Spinner, StatusBadge } from '@/components/ui';

type Candidate = ResultDetail['candidates'][number];

function CandidateCard({
  c,
  detail,
  onConfirm,
  busy,
  writable,
}: {
  c: Candidate;
  detail: ResultDetail;
  onConfirm: (id: string) => void;
  busy: boolean;
  writable: boolean;
}) {
  const selected = detail.review?.decision === 'confirmed' && detail.customerId === c.id;
  return (
    <div className={`card candidate ${selected ? 'selected' : ''}`}>
      <div className="card-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="ellipsis">{c.fullName}</h2>
          <div className="muted small mono">{c.customerRef}</div>
        </div>
        <span className="spacer" />
        {c.status !== 'active' && <span className="badge b-danger">{c.status === 'merged' ? 'Объединён' : 'Удалён'}</span>}
        {selected && <span className="badge b-ok">Подтверждён</span>}
      </div>
      <div className="card-pad">
        <dl className="kv">
          <dt>Email</dt>
          <dd>{c.email ?? <span className="muted">—</span>}</dd>
          <dt>Источник записи</dt>
          <dd>{c.source}</dd>
          <dt>Согласие</dt>
          <dd>
            <ConsentBadge status={c.consentStatus} at={c.consentAt} />
            {c.consentSource && <span className="muted small"> · {c.consentSource}</span>}
          </dd>
          <dt>В CRM с</dt>
          <dd>{fmtDate(c.createdAt)}</dd>
          <dt>Изменён</dt>
          <dd>
            {fmtDateTime(c.updatedAt)}
            {c.updatedBy && <span className="muted"> · {c.updatedBy}</span>}
          </dd>
          {c.notes && (
            <>
              <dt>Заметки</dt>
              <dd style={{ whiteSpace: 'pre-wrap' }}>{c.notes}</dd>
            </>
          )}
        </dl>

        <div className="section-title">Телефоны в CRM</div>
        <div className="list">
          {c.phones.map((p) => (
            <div key={p.id} className="list-item">
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className={`mono ${p.phone === detail.phone ? 'hl' : ''}`}>{fmtPhone(p.phone)}</span>
                {p.label && <span className="muted small"> · {p.label}</span>}
                <div className="muted small">
                  {p.source}
                  {p.collectedAt && ` · получен ${fmtDate(p.collectedAt)}`}
                </div>
              </div>
              <div className="row-wrap">
                {p.isVerified ? <span className="badge b-ok">Подтверждён</span> : <span className="badge b-warn">Не подтверждён</span>}
                {!p.isActive && <span className="badge b-danger">Неактуален</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="section-title">Каналы связи (предоставлены клиентом)</div>
        {c.allChannels.length === 0 ? (
          <div className="muted small">В CRM нет сохранённых каналов</div>
        ) : (
          <div className="list">
            {c.allChannels.map((ch) => (
              <div key={ch.channel} className="list-item">
                <div style={{ width: 90, flex: 'none', fontWeight: 550 }}>{CHANNEL_LABEL[ch.channel]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {ch.withdrawn ? (
                    <span className="muted">Согласие отозвано — значение скрыто</span>
                  ) : ch.url ? (
                    <a href={ch.url} target="_blank" rel="noopener noreferrer nofollow" className="row" style={{ display: 'inline-flex', gap: 4 }}>
                      {ch.value} <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="mono">{ch.value}</span>
                  )}
                  <div className="muted small">{ch.source}</div>
                </div>
                <ConsentBadge status={ch.consentStatus} at={ch.consentAt} />
              </div>
            ))}
          </div>
        )}

        {writable && (
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-ok" disabled={busy || selected || c.status !== 'active'} onClick={() => onConfirm(c.id)}>
              <Check size={15} /> {selected ? 'Совпадение подтверждено' : 'Подтвердить совпадение'}
            </button>
            <Link className="btn" href={`/customers/${c.id}?from=${detail.id}`}>
              <Pencil size={14} /> Изменить данные
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReviewView({ id }: { id: string }) {
  const user = useUser();
  const router = useRouter();
  const writable = canWrite(user);
  const [detail, setDetail] = useState<ResultDetail | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail((await api<{ result: ResultDetail }>(`/api/results/${id}`)).result);
    } catch (err) {
      setError(err);
    }
  }, [id]);

  useEffect(() => {
    setDetail(null);
    setNote('');
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const decide = async (body: { decision: 'confirm'; customerId: string } | { decision: 'reject' }) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/results/${id}/review`, { method: 'POST', json: { ...body, note: note.trim() || undefined } });
      setToast(body.decision === 'confirm' ? 'Совпадение подтверждено' : 'Совпадение отклонено');
      if (detail?.nextId) router.push(`/results/${detail.nextId}`);
      else await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!detail)
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

  const reviewable = writable && detail.status !== 'invalid_phone' && detail.candidates.length > 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <Link href="/">Проверки</Link>
            <ChevronRight size={14} />
            <Link href={`/batches/${detail.batchId}`}>{detail.batchFileName}</Link>
            <ChevronRight size={14} />
            <span>Строка {detail.rowNumber}</span>
          </div>
          <div className="row">
            <h1 className="mono" style={{ fontSize: 22 }}>
              {detail.phone ? fmtPhone(detail.phone) : detail.rawInput}
            </h1>
            <StatusBadge status={detail.status} />
          </div>
          <p>{detail.matchReason}</p>
        </div>
        <div className="row">
          <button className="btn" disabled={!detail.prevId} onClick={() => detail.prevId && router.push(`/results/${detail.prevId}`)} title="Предыдущая запись на проверку">
            <ChevronLeft size={15} /> Пред.
          </button>
          <button className="btn" disabled={!detail.nextId} onClick={() => detail.nextId && router.push(`/results/${detail.nextId}`)} title="Следующая запись на проверку">
            След. <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <ErrorAlert error={error} />

      <div className="card card-pad">
        <dl className="kv">
          <dt>Значение в файле</dt>
          <dd className="mono">{detail.rawInput}</dd>
          <dt>E.164</dt>
          <dd className="mono">{detail.phone ?? '—'}</dd>
          <dt>Страна</dt>
          <dd>{detail.country ? `${flag(detail.country)} ${countryName(detail.country)}` : '—'}</dd>
          <dt>Строка / повторов</dt>
          <dd>
            {detail.rowNumber} / {detail.occurrences}
          </dd>
          <dt>Уверенность</dt>
          <dd>
            <Confidence value={detail.confidence} />
          </dd>
          {detail.review && (
            <>
              <dt>Решение</dt>
              <dd>
                {detail.review.decision === 'confirmed' ? 'Подтверждено' : 'Отклонено'} · {detail.review.by ?? '—'} · {fmtDateTime(detail.review.at)}
                {detail.review.note && <div className="muted">«{detail.review.note}»</div>}
              </dd>
            </>
          )}
        </dl>
      </div>

      {detail.candidates.length === 0 ? (
        <div className="card empty">
          <ShieldAlert size={24} />
          {detail.status === 'invalid_phone' ? 'Номер некорректен — сопоставление невозможно.' : 'В CRM нет клиента с этим номером.'}
          <span className="small">Поиск во внешних источниках не выполняется.</span>
        </div>
      ) : (
        <>
          {detail.candidates.length > 1 && (
            <div className="alert alert-warn">
              Номер записан у {detail.candidates.length} клиентов. Выберите того, кому принадлежит номер, или отклоните совпадение.
            </div>
          )}
          <div className="grid-2">
            {detail.candidates.map((c) => (
              <CandidateCard key={c.id} c={c} detail={detail} busy={busy} writable={reviewable} onConfirm={(cid) => decide({ decision: 'confirm', customerId: cid })} />
            ))}
          </div>
        </>
      )}

      {reviewable && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field">
            <label htmlFor="note">Комментарий к решению (необязательно)</label>
            <textarea id="note" className="textarea" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: клиент подтвердил по телефону" />
          </div>
          <div className="row">
            <button className="btn btn-danger" disabled={busy || detail.review?.decision === 'rejected'} onClick={() => decide({ decision: 'reject' })}>
              <X size={15} /> Отклонить совпадение
            </button>
            <span className="muted small">Решение и его автор записываются в журнал аудита.</span>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
