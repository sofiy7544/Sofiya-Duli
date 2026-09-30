'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Lock, UploadCloud } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtBytes, fmtDateTime, fmtNumber } from '@/lib/format';
import type { BatchStatus, BatchSummary } from '@/lib/types';
import { canWrite, useUser } from '@/components/shell';
import { ErrorAlert, Spinner } from '@/components/ui';

const BATCH_STATUS: Record<BatchStatus, [string, string]> = {
  queued: ['В очереди', 'b-accent'],
  processing: ['Обработка', 'b-accent'],
  completed: ['Готово', 'b-ok'],
  failed: ['Ошибка', 'b-danger'],
  expired: ['Удалено по сроку', ''],
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const [label, cls] = BATCH_STATUS[status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function Uploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!/\.(csv|xlsx|txt)$/i.test(file.name)) {
      setError(new Error('Поддерживаются файлы .csv и .xlsx'));
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const { id } = await api<{ id: string }>('/api/batches', { method: 'POST', body });
      router.push(`/batches/${id}`);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        className="dropzone"
        data-drag={drag}
        role="button"
        tabIndex={0}
        aria-label="Загрузить файл с номерами"
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f && !busy) void upload(f);
        }}
      >
        <span className="icon">{busy ? <Spinner /> : <UploadCloud size={20} />}</span>
        <div>
          <strong>{busy ? 'Загрузка…' : 'Перетащите CSV или XLSX с номерами'}</strong>
          <div className="muted small">или нажмите, чтобы выбрать файл · колонка с телефоном определяется автоматически</div>
        </div>
        <input
          ref={input}
          type="file"
          hidden
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void upload(f);
          }}
        />
      </div>
      <ErrorAlert error={error} />
      <div className="row muted small" style={{ gap: 6 }}>
        <Lock size={13} />
        Файл шифруется и удаляется сразу после обработки. Номера сверяются только с нашей CRM, внешние источники не используются.
      </div>
    </div>
  );
}

export function Dashboard() {
  const user = useUser();
  const router = useRouter();
  const [batches, setBatches] = useState<BatchSummary[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      setBatches((await api<{ batches: BatchSummary[] }>('/api/batches')).batches);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  // Пока что-то обрабатывается — обновляем список
  useEffect(() => {
    if (!batches?.some((b) => b.status === 'queued' || b.status === 'processing')) return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [batches, load]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Проверка номеров</h1>
          <p>Загрузите номера за день — система найдёт клиентов в CRM и покажет известные каналы связи.</p>
        </div>
      </div>

      {canWrite(user) ? <Uploader /> : <div className="alert alert-info">Роль Viewer: доступен только просмотр результатов.</div>}

      <div className="card">
        <div className="card-head">
          <h2>Последние проверки</h2>
        </div>
        <ErrorAlert error={error} />
        {!batches ? (
          <div className="empty">
            <Spinner />
          </div>
        ) : batches.length === 0 ? (
          <div className="empty">
            <FileSpreadsheet size={28} />
            Пока нет загруженных файлов
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Файл</th>
                  <th>Загрузил</th>
                  <th>Дата</th>
                  <th>Статус</th>
                  <th style={{ textAlign: 'right' }}>Номеров</th>
                  <th style={{ textAlign: 'right' }}>Найдено</th>
                  <th style={{ textAlign: 'right' }}>На проверку</th>
                  <th style={{ textAlign: 'right' }}>Не найдено</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="clickable" onClick={() => router.push(`/batches/${b.id}`)}>
                    <td>
                      <Link href={`/batches/${b.id}`} onClick={(e) => e.stopPropagation()} style={{ color: 'var(--text)', fontWeight: 550 }}>
                        {b.fileName}
                      </Link>
                      <div className="muted small">
                        {b.fileType.toUpperCase()} · {fmtBytes(b.fileSize)}
                      </div>
                    </td>
                    <td>{b.createdBy.name}</td>
                    <td className="nowrap">{fmtDateTime(b.createdAt)}</td>
                    <td>
                      <BatchStatusBadge status={b.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtNumber(b.uniquePhones || b.totalRows)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--ok)' }}>{fmtNumber(b.counts.exact_match)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--warn)' }}>{fmtNumber(b.counts.needs_review + b.counts.multiple_matches)}</td>
                    <td style={{ textAlign: 'right' }} className="muted">
                      {fmtNumber(b.counts.not_found + b.counts.invalid_phone)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
