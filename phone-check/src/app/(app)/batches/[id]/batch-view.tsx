'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronRight, Download, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { countryName, flag, fmtDateTime, fmtNumber, fmtPhone } from '@/lib/format';
import { MATCH_STATUSES, STATUS_LABEL, type BatchSummary, type ChannelValue, type MatchStatus, type ResultRow } from '@/lib/types';
import { canWrite, useUser } from '@/components/shell';
import { Confidence, ConsentBadge, ErrorAlert, Spinner, StatusBadge } from '@/components/ui';
import { BatchStatusBadge } from '../../dashboard';

const PAGE = 200;
const ROW_HEIGHT = 44;
const HEAD_HEIGHT = 38;
const COLUMNS: [string, string][] = [
  ['Phone', '170px'],
  ['Country', '130px'],
  ['Customer ID', '140px'],
  ['Full Name', 'minmax(200px, 1.4fr)'],
  ['Facebook', '170px'],
  ['Telegram', '160px'],
  ['Viber', '150px'],
  ['WhatsApp', '150px'],
  ['Source', '200px'],
  ['Consent status', '170px'],
  ['Match confidence', '130px'],
  ['Status', '180px'],
];
const GRID_COLS = COLUMNS.map((c) => c[1]).join(' ');
const MIN_WIDTH = 1950;

/** Постраничная подгрузка по мере прокрутки: в памяти только просмотренные страницы, в DOM — только видимые строки. */
function useResultPages(batchId: string, status: MatchStatus[], q: string, enabled: boolean) {
  const pages = useRef(new Map<number, ResultRow[]>());
  const inflight = useRef(new Set<number>());
  const generation = useRef(0);
  const [total, setTotal] = useState<number | null>(null);
  const [, bump] = useState(0);
  const [error, setError] = useState<unknown>(null);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (status.length) sp.set('status', status.join(','));
    if (q) sp.set('q', q);
    return sp.toString();
  }, [status, q]);

  const fetchPage = useCallback(
    async (page: number) => {
      if (pages.current.has(page) || inflight.current.has(page)) return;
      const gen = generation.current;
      inflight.current.add(page);
      try {
        const data = await api<{ total: number; rows: ResultRow[] }>(
          `/api/batches/${batchId}/results?offset=${page * PAGE}&limit=${PAGE}${query ? `&${query}` : ''}`,
        );
        if (gen !== generation.current) return;
        pages.current.set(page, data.rows);
        setTotal(data.total);
        bump((n) => n + 1);
      } catch (err) {
        if (gen === generation.current) setError(err);
      } finally {
        inflight.current.delete(page);
      }
    },
    [batchId, query],
  );

  const reset = useCallback(() => {
    generation.current++;
    pages.current.clear();
    inflight.current.clear();
    setTotal(null);
    setError(null);
    if (enabled) void fetchPage(0);
  }, [enabled, fetchPage]);

  useEffect(reset, [reset]);

  const ensureRange = useCallback(
    (start: number, end: number) => {
      for (let p = Math.floor(start / PAGE); p <= Math.floor(end / PAGE); p++) void fetchPage(p);
    },
    [fetchPage],
  );

  const rowAt = (index: number) => pages.current.get(Math.floor(index / PAGE))?.[index % PAGE];
  return { total, rowAt, ensureRange, error, reload: reset, query };
}

function ChannelCell({ value }: { value: ChannelValue | null }) {
  if (!value) return <span className="muted">—</span>;
  const text = value.value.replace(/^https?:\/\/(www\.)?/, '');
  const title = `${value.value}\nИсточник: ${value.source}${value.consentAt ? `\nСогласие: ${new Date(value.consentAt).toLocaleDateString('ru-RU')}` : ''}`;
  return value.url ? (
    <a href={value.url} target="_blank" rel="noopener noreferrer nofollow" title={title} onClick={(e) => e.stopPropagation()}>
      {text}
    </a>
  ) : (
    <span title={title}>{text}</span>
  );
}

function Progress({ batch }: { batch: BatchSummary }) {
  const matching = batch.uniquePhones > 0;
  const pct = matching ? Math.round((batch.processedRows / batch.uniquePhones) * 100) : 0;
  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="row">
        <Spinner />
        <strong>{batch.status === 'queued' ? 'В очереди на обработку…' : matching ? 'Сверка с CRM…' : 'Чтение файла и нормализация номеров…'}</strong>
        <span className="spacer" />
        <span className="muted small">
          {matching ? `${fmtNumber(batch.processedRows)} из ${fmtNumber(batch.uniquePhones)} уникальных номеров` : batch.totalRows ? `${fmtNumber(batch.totalRows)} строк прочитано` : ''}
        </span>
      </div>
      <div className={`progress ${matching ? '' : 'indeterminate'}`}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BatchView({ id }: { id: string }) {
  const user = useUser();
  const router = useRouter();
  const [batch, setBatch] = useState<BatchSummary | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [status, setStatus] = useState<MatchStatus[]>([]);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');

  const loadBatch = useCallback(async () => {
    try {
      setBatch((await api<{ batch: BatchSummary }>(`/api/batches/${id}`)).batch);
    } catch (err) {
      setError(err);
    }
  }, [id]);

  useEffect(() => {
    void loadBatch();
  }, [loadBatch]);

  const running = batch?.status === 'queued' || batch?.status === 'processing';
  useEffect(() => {
    if (!running) return;
    const t = setInterval(loadBatch, 1500);
    return () => clearInterval(t);
  }, [running, loadBatch]);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const completed = batch?.status === 'completed';
  const data = useResultPages(id, status, q, completed);

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: data.total ?? 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    scrollMargin: HEAD_HEIGHT,
  });
  const items = virtualizer.getVirtualItems();
  const first = items[0]?.index ?? 0;
  const last = items[items.length - 1]?.index ?? 0;
  const { total, ensureRange } = data;
  useEffect(() => {
    if (total) ensureRange(first, last);
  }, [first, last, total, ensureRange]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [data.query]);

  const toggleStatus = (s: MatchStatus | null) => setStatus((cur) => (s === null ? [] : cur.includes(s) ? cur.filter((x) => x !== s) : [s]));
  const open = (row: ResultRow) => router.push(`/results/${row.id}`);

  const remove = async () => {
    if (!confirm('Удалить пакет и все результаты? Запись в журнале аудита сохранится.')) return;
    try {
      await api(`/api/batches/${id}`, { method: 'DELETE' });
      router.push('/');
    } catch (err) {
      setError(err);
    }
  };

  if (!batch)
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

  const review = batch.counts.needs_review + batch.counts.multiple_matches;
  const exportHref = `/api/batches/${id}/export${data.query ? `?${data.query}` : ''}`;

  return (
    <div className="page">
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <div className="crumbs">
            <Link href="/">Проверки</Link>
            <ChevronRight size={14} />
            <span className="ellipsis">{batch.fileName}</span>
          </div>
          <div className="row">
            <h1 className="ellipsis">{batch.fileName}</h1>
            <BatchStatusBadge status={batch.status} />
          </div>
          <p>
            {batch.createdBy.name} · {fmtDateTime(batch.createdAt)}
            {batch.phoneColumn ? ` · колонка «${batch.phoneColumn}»` : ''} · результаты хранятся до {fmtDateTime(batch.expiresAt)}
          </p>
        </div>
        <div className="row">
          {user.role === 'admin' && batch.status !== 'processing' && (
            <button className="btn btn-danger" onClick={remove}>
              <Trash2 size={15} /> Удалить
            </button>
          )}
          {canWrite(user) && completed && (
            <a className="btn btn-primary" href={exportHref} download>
              <Download size={15} /> Экспорт XLSX{status.length || q ? ' (фильтр)' : ''}
            </a>
          )}
        </div>
      </div>

      <ErrorAlert error={error} />
      {running && <Progress batch={batch} />}
      {batch.status === 'failed' && <div className="alert alert-error">{batch.error ?? 'Ошибка обработки'}</div>}
      {batch.status === 'expired' && <div className="alert alert-warn">Результаты удалены по сроку хранения. Запись о проверке осталась в журнале аудита.</div>}

      {completed && (
        <>
          <div className="stats">
            <div className="card stat">
              <div className="label">Строк в файле</div>
              <div className="value">{fmtNumber(batch.totalRows)}</div>
            </div>
            <div className="card stat">
              <div className="label">Уникальных номеров</div>
              <div className="value">{fmtNumber(batch.uniquePhones)}</div>
            </div>
            <div className="card stat">
              <div className="label">Дубликатов удалено</div>
              <div className="value">{fmtNumber(batch.duplicateRows)}</div>
            </div>
            <div className="card stat">
              <div className="label">Найдено клиентов</div>
              <div className="value" style={{ color: 'var(--ok)' }}>
                {fmtNumber(batch.counts.exact_match)}
              </div>
            </div>
            <div className="card stat">
              <div className="label">Требуют проверки</div>
              <div className="value" style={{ color: review ? 'var(--warn)' : undefined }}>
                {fmtNumber(review)}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head" style={{ flexWrap: 'wrap' }}>
              <div className="chips" role="toolbar" aria-label="Фильтр по статусу">
                <button className="chip" aria-pressed={status.length === 0} onClick={() => toggleStatus(null)}>
                  Все <span className="count">{fmtNumber(batch.uniquePhones)}</span>
                </button>
                {MATCH_STATUSES.map((s) => (
                  <button key={s} className="chip" aria-pressed={status.includes(s)} onClick={() => toggleStatus(s)}>
                    {STATUS_LABEL[s]} <span className="count">{fmtNumber(batch.counts[s])}</span>
                  </button>
                ))}
              </div>
              <span className="spacer" />
              <div className="search">
                <Search size={15} />
                <input
                  className="input"
                  placeholder="Номер телефона или Customer ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Поиск по номеру или Customer ID"
                />
              </div>
            </div>
            <ErrorAlert error={data.error} />
            <div ref={scrollRef} className="grid-scroll" role="grid" aria-rowcount={data.total ?? 0} aria-label="Результаты проверки">
              <div className="grid-inner" style={{ minWidth: MIN_WIDTH, ['--grid-cols' as string]: GRID_COLS }}>
                <div className="grid-row grid-head" role="row">
                  {COLUMNS.map(([name]) => (
                    <div key={name} className="grid-cell" role="columnheader">
                      {name}
                    </div>
                  ))}
                </div>
                {data.total === 0 && <div className="empty">Ничего не найдено по заданному фильтру</div>}
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {items.map((vi) => {
                    const row = data.rowAt(vi.index);
                    return (
                      <div
                        key={vi.key}
                        className="grid-row body"
                        role="row"
                        aria-rowindex={vi.index + 2}
                        tabIndex={row ? 0 : -1}
                        style={{ transform: `translateY(${vi.start - HEAD_HEIGHT}px)` }}
                        onClick={() => row && open(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && row) open(row);
                          if (e.key === 'ArrowDown') (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
                          if (e.key === 'ArrowUp') (e.currentTarget.previousElementSibling as HTMLElement | null)?.focus();
                        }}
                      >
                        {row ? <RowCells row={row} /> : COLUMNS.map(([name]) => <div key={name} className="grid-cell"><div className="skeleton" /></div>)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RowCells({ row }: { row: ResultRow }) {
  return (
    <>
      <div className="grid-cell mono" role="gridcell" title={`Строка ${row.rowNumber}${row.occurrences > 1 ? `, встречается ${row.occurrences} раз` : ''}\nВ файле: ${row.rawInput}`}>
        {row.phone ? fmtPhone(row.phone) : <span className="muted">{row.rawInput}</span>}
        {row.occurrences > 1 && <span className="muted small"> ×{row.occurrences}</span>}
      </div>
      <div className="grid-cell" role="gridcell">
        {row.country ? `${flag(row.country)} ${countryName(row.country)}` : <span className="muted">—</span>}
      </div>
      <div className="grid-cell mono" role="gridcell">
        {row.customerRef ?? (row.candidateCount > 1 ? <span className="muted">{row.candidateCount} клиента</span> : <span className="muted">—</span>)}
      </div>
      <div className="grid-cell" role="gridcell" style={{ fontWeight: row.fullName ? 500 : undefined }}>
        {row.fullName ?? <span className="muted">—</span>}
      </div>
      <div className="grid-cell" role="gridcell">
        <ChannelCell value={row.facebook} />
      </div>
      <div className="grid-cell" role="gridcell">
        <ChannelCell value={row.telegram} />
      </div>
      <div className="grid-cell" role="gridcell">
        <ChannelCell value={row.viber} />
      </div>
      <div className="grid-cell" role="gridcell">
        <ChannelCell value={row.whatsapp} />
      </div>
      <div className="grid-cell text-2" role="gridcell" title={row.source ?? undefined}>
        {row.source ?? <span className="muted">—</span>}
      </div>
      <div className="grid-cell" role="gridcell">
        <ConsentBadge status={row.consentStatus} at={row.consentAt} />
      </div>
      <div className="grid-cell" role="gridcell">
        <Confidence value={row.confidence} />
      </div>
      <div className="grid-cell" role="gridcell" title={row.matchReason ?? undefined}>
        <StatusBadge status={row.status} />
        {row.reviewDecision && <span className="muted small"> ✓ вручную</span>}
      </div>
    </>
  );
}
