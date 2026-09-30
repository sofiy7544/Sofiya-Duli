import { pool, tx, type Queryable } from '../db';
import { env } from '../env';
import { blindIndex, decrypt, decryptBuffer, encrypt, encryptBuffer } from '../crypto';
import { badRequest, conflict, notFound } from '../errors';
import { writeAudit, type AuditContext } from './audit';
import { detectFileType, extractPhones, readRows, type ColumnChoice } from './file-parser';
import { classifyMatch, lookupCandidates } from './matching';
import { loadCustomerBriefs } from './customers';
import { maskPhone, normalizePhone } from '@/lib/phone';
import { MATCH_STATUSES, type BatchSummary, type MatchStatus, type ResultRow } from '@/lib/types';

const CHUNK = 1000;
const PROGRESS_EVERY = 5000;

// Загрузка ------------------------------------------------------------------------

export interface UploadInput {
  fileName: string;
  data: Buffer;
}

export async function createBatch(input: UploadInput, ctx: AuditContext): Promise<{ id: string }> {
  const e = env();
  if (!ctx.actor) throw badRequest('Нет пользователя');
  if (input.data.length === 0) throw badRequest('Файл пустой');
  if (input.data.length > e.MAX_UPLOAD_MB * 1024 * 1024) throw badRequest(`Файл больше ${e.MAX_UPLOAD_MB} МБ`);
  const fileType = detectFileType(input.fileName, input.data.subarray(0, 8192));
  // Имя файла без пути и управляющих символов
  const fileName = input.fileName.replace(/^.*[\\/]/, '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200) || `upload.${fileType}`;

  return tx(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO batches (created_by, file_name, file_size, file_type, expires_at)
       VALUES ($1, $2, $3, $4, now() + make_interval(days => $5)) RETURNING id`,
      [ctx.actor!.id, fileName, input.data.length, fileType, e.RESULT_RETENTION_DAYS],
    );
    const id = rows[0].id as string;
    await client.query(`INSERT INTO upload_blobs (batch_id, content_enc) VALUES ($1, $2)`, [id, encryptBuffer(input.data)]);
    await writeAudit(client, ctx, {
      action: 'batch.uploaded',
      entityType: 'batch',
      entityId: id,
      details: { fileName, fileSize: input.data.length, fileType },
    });
    return { id };
  });
}

// Обработка (worker) -----------------------------------------------------------------

interface Entry {
  seq: number;
  rowNumber: number;
  occurrences: number;
  raw: string;
  e164: string | null;
  country: string | null;
  countryInferred: boolean;
}

export async function processBatch(batchId: string): Promise<void> {
  const db = pool();
  const e = env();
  const claim = await db.query(
    `UPDATE batches SET status = 'processing', started_at = coalesce(started_at, now()), error = NULL
      WHERE id = $1 AND status IN ('queued', 'processing')
      RETURNING file_type, created_by`,
    [batchId],
  );
  if (!claim.rows[0]) return; // уже обработан, удалён или истёк
  const fileType = claim.rows[0].file_type as 'csv' | 'xlsx';

  const blob = await db.query(`SELECT content_enc FROM upload_blobs WHERE batch_id = $1`, [batchId]);
  if (!blob.rows[0]) {
    await failBatch(batchId, 'Загруженный файл уже удалён. Загрузите его ещё раз.');
    return;
  }

  try {
    // Повторный запуск после сбоя начинается с чистого листа
    await db.query(`DELETE FROM check_results WHERE batch_id = $1`, [batchId]);

    let data: Buffer | null = decryptBuffer(blob.rows[0].content_enc);
    let column: ColumnChoice | undefined;
    const entries = new Map<string, Entry>();
    let total = 0;

    for await (const cell of extractPhones(readRows(data, fileType), { maxRows: e.MAX_ROWS, onColumn: (c) => (column = c) })) {
      total++;
      const n = normalizePhone(cell.value, e.DEFAULT_REGION);
      const key = n.ok ? n.e164 : `invalid:${n.cleaned || cell.value}`;
      const existing = entries.get(key);
      if (existing) {
        existing.occurrences++;
      } else {
        entries.set(key, {
          seq: entries.size + 1,
          rowNumber: cell.rowNumber,
          occurrences: 1,
          raw: cell.value,
          e164: n.ok ? n.e164 : null,
          country: n.ok ? n.country : null,
          countryInferred: n.ok && n.countryInferred,
        });
      }
      if (total % PROGRESS_EVERY === 0) await db.query(`UPDATE batches SET total_rows = $2 WHERE id = $1`, [batchId, total]);
    }
    data = null;

    if (total === 0) throw badRequest('В файле не найдено ни одного номера');

    await db.query(
      `UPDATE batches SET total_rows = $2, unique_phones = $3, duplicate_rows = $4, phone_column = $5 WHERE id = $1`,
      [batchId, total, entries.size, total - entries.size, column?.header ?? (column ? `Колонка ${column.index + 1}` : null)],
    );

    const list = [...entries.values()];
    let processed = 0;
    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK);
      const hashes = chunk.map((en) => (en.e164 ? blindIndex(en.e164) : null));
      const candidates = await lookupCandidates(db, hashes.filter((h): h is Buffer => h !== null));
      const cols = {
        seq: [] as number[],
        rowNumber: [] as number[],
        occurrences: [] as number[],
        raw: [] as string[],
        masked: [] as string[],
        phoneEnc: [] as (string | null)[],
        hash: [] as (Buffer | null)[],
        country: [] as (string | null)[],
        status: [] as MatchStatus[],
        confidence: [] as (number | null)[],
        customerId: [] as (string | null)[],
        candidates: [] as string[],
        reason: [] as string[],
      };
      chunk.forEach((en, idx) => {
        const hash = hashes[idx] ?? null;
        const outcome = en.e164
          ? classifyMatch(candidates.get(hash!.toString('hex')) ?? [], en.countryInferred)
          : { status: 'invalid_phone' as const, confidence: null, customerId: null, candidateIds: [], reason: 'Номер не распознан или не существует в плане нумерации' };
        cols.seq.push(en.seq);
        cols.rowNumber.push(en.rowNumber);
        cols.occurrences.push(en.occurrences);
        cols.raw.push(encrypt(en.raw));
        cols.masked.push(maskPhone(en.e164 ?? en.raw));
        cols.phoneEnc.push(en.e164 ? encrypt(en.e164) : null);
        cols.hash.push(hash);
        cols.country.push(en.country);
        cols.status.push(outcome.status);
        cols.confidence.push(outcome.confidence);
        cols.customerId.push(outcome.customerId);
        cols.candidates.push(`{${outcome.candidateIds.join(',')}}`);
        cols.reason.push(outcome.reason);
      });
      await db.query(
        `INSERT INTO check_results (batch_id, seq, row_number, occurrences, raw_input_enc, phone_masked, phone_enc, phone_hash,
                                    country, status, confidence, customer_id, candidate_ids, match_reason)
         SELECT $1, t.seq, t.row_number, t.occurrences, t.raw, t.masked, t.phone_enc, t.hash, t.country, t.status,
                t.confidence, t.customer_id, t.candidates::uuid[], t.reason
           FROM unnest($2::int[], $3::int[], $4::int[], $5::text[], $6::text[], $7::text[], $8::bytea[], $9::text[],
                       $10::match_status[], $11::smallint[], $12::uuid[], $13::text[], $14::text[])
             AS t(seq, row_number, occurrences, raw, masked, phone_enc, hash, country, status, confidence, customer_id, candidates, reason)`,
        [
          batchId,
          cols.seq,
          cols.rowNumber,
          cols.occurrences,
          cols.raw,
          cols.masked,
          cols.phoneEnc,
          cols.hash,
          cols.country,
          cols.status,
          cols.confidence,
          cols.customerId,
          cols.candidates,
          cols.reason,
        ],
      );
      processed += chunk.length;
      await db.query(`UPDATE batches SET processed_rows = $2 WHERE id = $1`, [batchId, processed]);
    }

    await tx(async (client) => {
      const { rows: owner } = await client.query(
        `SELECT u.id, u.email FROM batches b JOIN users u ON u.id = b.created_by WHERE b.id = $1`,
        [batchId],
      );
      const counts = await statusCounts(client, batchId);
      const auditId = await writeAudit(
        client,
        { actor: owner[0] ?? null, ip: null, userAgent: 'worker' },
        {
          action: 'batch.processed',
          entityType: 'batch',
          entityId: batchId,
          details: { totalRows: total, uniquePhones: list.length, duplicateRows: total - list.length, counts },
        },
      );
      // Неизменяемый след: какие номера проверялись и какие записи найдены (без ПДн в открытом виде)
      await client.query(
        `INSERT INTO audit_batch_items (audit_id, batch_id, phone_masked, phone_hash, status, customer_ref)
         SELECT $1, r.batch_id, r.phone_masked, r.phone_hash, r.status,
                CASE WHEN r.customer_id IS NOT NULL THEN c.customer_ref
                     WHEN cardinality(r.candidate_ids) > 1 THEN
                       (SELECT string_agg(cc.customer_ref, ', ' ORDER BY cc.customer_ref) FROM customers cc WHERE cc.id = ANY(r.candidate_ids))
                END
           FROM check_results r LEFT JOIN customers c ON c.id = r.customer_id
          WHERE r.batch_id = $2 ORDER BY r.seq`,
        [auditId, batchId],
      );
      await client.query(`DELETE FROM upload_blobs WHERE batch_id = $1`, [batchId]);
      await client.query(`UPDATE batches SET status = 'completed', finished_at = now() WHERE id = $1`, [batchId]);
    });
  } catch (err) {
    const message = err instanceof Error && 'status' in err ? err.message : 'Не удалось обработать файл. Проверьте формат.';
    if (!(err instanceof Error && 'status' in err)) console.error('[worker] batch failed', batchId, err instanceof Error ? err.message : err);
    await failBatch(batchId, message);
  }
}

async function failBatch(batchId: string, message: string) {
  await tx(async (client) => {
    await client.query(`DELETE FROM upload_blobs WHERE batch_id = $1`, [batchId]);
    await client.query(`DELETE FROM check_results WHERE batch_id = $1`, [batchId]);
    const { rows } = await client.query(
      `UPDATE batches b SET status = 'failed', error = $2, finished_at = now() FROM users u
        WHERE b.id = $1 AND u.id = b.created_by RETURNING u.id, u.email`,
      [batchId, message],
    );
    await writeAudit(client, { actor: rows[0] ?? null, userAgent: 'worker' }, {
      action: 'batch.failed',
      entityType: 'batch',
      entityId: batchId,
      details: { error: message },
    });
  });
}

// Чтение -----------------------------------------------------------------------------

export async function statusCounts(q: Queryable, batchId: string): Promise<Record<MatchStatus, number>> {
  const counts = Object.fromEntries(MATCH_STATUSES.map((s) => [s, 0])) as Record<MatchStatus, number>;
  const { rows } = await q.query(`SELECT status, count(*) AS n FROM check_results WHERE batch_id = $1 GROUP BY status`, [batchId]);
  for (const r of rows) counts[r.status as MatchStatus] = r.n;
  return counts;
}

function toSummary(r: Record<string, any>, counts: Record<MatchStatus, number>): BatchSummary {
  return {
    id: r.id,
    fileName: r.file_name,
    fileSize: r.file_size,
    fileType: r.file_type,
    status: r.status,
    totalRows: r.total_rows,
    processedRows: r.processed_rows,
    uniquePhones: r.unique_phones,
    duplicateRows: r.duplicate_rows,
    phoneColumn: r.phone_column,
    error: r.error,
    createdAt: r.created_at.toISOString(),
    startedAt: r.started_at?.toISOString() ?? null,
    finishedAt: r.finished_at?.toISOString() ?? null,
    expiresAt: r.expires_at.toISOString(),
    createdBy: { id: r.created_by, name: r.user_name, email: r.user_email },
    counts,
  };
}

export async function getBatch(q: Queryable, id: string): Promise<BatchSummary> {
  const { rows } = await q.query(
    `SELECT b.*, u.name AS user_name, u.email AS user_email FROM batches b JOIN users u ON u.id = b.created_by WHERE b.id = $1`,
    [id],
  );
  if (!rows[0]) throw notFound('Пакет');
  return toSummary(rows[0], await statusCounts(q, id));
}

export async function listBatches(q: Queryable, limit = 50): Promise<BatchSummary[]> {
  const { rows } = await q.query(
    `SELECT b.*, u.name AS user_name, u.email AS user_email,
            (SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) AS n FROM check_results r WHERE r.batch_id = b.id GROUP BY status) s) AS counts
       FROM batches b JOIN users u ON u.id = b.created_by
      ORDER BY b.created_at DESC LIMIT $1`,
    [Math.min(limit, 200)],
  );
  return rows.map((r) => {
    const counts = Object.fromEntries(MATCH_STATUSES.map((s) => [s, Number(r.counts?.[s] ?? 0)])) as Record<MatchStatus, number>;
    return toSummary(r, counts);
  });
}

export interface ResultsQuery {
  offset: number;
  limit: number;
  status?: MatchStatus[];
  q?: string;
}

/** Строка результата + данные клиента. Расшифровывается только запрошенная страница. */
async function hydrate(q: Queryable, rows: Record<string, any>[]): Promise<ResultRow[]> {
  const briefs = await loadCustomerBriefs(q, rows.map((r) => r.customer_id).filter(Boolean));
  return rows.map((r) => {
    const c = r.customer_id ? briefs.get(r.customer_id) : undefined;
    return {
      id: r.id,
      seq: r.seq,
      rowNumber: r.row_number,
      occurrences: r.occurrences,
      rawInput: decrypt(r.raw_input_enc),
      phone: r.phone_enc ? decrypt(r.phone_enc) : null,
      country: r.country,
      customerId: c?.id ?? null,
      customerRef: c?.customerRef ?? null,
      fullName: c?.fullName ?? null,
      facebook: c?.channels.facebook ?? c?.channels.messenger ?? null,
      telegram: c?.channels.telegram ?? null,
      viber: c?.channels.viber ?? null,
      whatsapp: c?.channels.whatsapp ?? null,
      source: c?.source ?? null,
      consentStatus: c?.consentStatus ?? null,
      consentAt: c?.consentAt ?? null,
      confidence: r.confidence,
      status: r.status,
      candidateCount: r.candidate_ids.length,
      matchReason: r.match_reason,
      reviewDecision: r.review_decision,
    };
  });
}

function resultsWhere(batchId: string, query: Pick<ResultsQuery, 'status' | 'q'>) {
  const where = ['r.batch_id = $1'];
  const params: unknown[] = [batchId];
  if (query.status?.length) {
    params.push(query.status);
    where.push(`r.status = ANY($${params.length}::match_status[])`);
  }
  const text = query.q?.trim();
  if (text) {
    const n = normalizePhone(text, env().DEFAULT_REGION);
    params.push(n.ok ? blindIndex(n.e164) : Buffer.alloc(0));
    const hashParam = `$${params.length}`;
    params.push(text.toUpperCase());
    // Поиск: точный номер (по слепому индексу) или Customer ID
    where.push(`(r.phone_hash = ${hashParam} OR EXISTS (SELECT 1 FROM customers c WHERE c.id = r.customer_id AND upper(c.customer_ref) = $${params.length}))`);
  }
  return { where: where.join(' AND '), params };
}

export async function getResults(q: Queryable, batchId: string, query: ResultsQuery): Promise<{ total: number; rows: ResultRow[] }> {
  const { where, params } = resultsWhere(batchId, query);
  const limit = Math.min(Math.max(query.limit, 1), 500);
  const offset = Math.max(query.offset, 0);
  const [{ rows: countRows }, { rows }] = await Promise.all([
    q.query(`SELECT count(*) AS n FROM check_results r WHERE ${where}`, params),
    q.query(`SELECT r.* FROM check_results r WHERE ${where} ORDER BY r.seq OFFSET ${offset} LIMIT ${limit}`, params),
  ]);
  return { total: countRows[0].n, rows: await hydrate(q, rows) };
}

/** Итерация для экспорта: keyset по seq, пачками. */
export async function* iterateResults(q: Queryable, batchId: string, query: Pick<ResultsQuery, 'status' | 'q'> = {}, pageSize = 2000) {
  const { where, params } = resultsWhere(batchId, query);
  let after = 0;
  for (;;) {
    const { rows } = await q.query(
      `SELECT r.* FROM check_results r WHERE ${where} AND r.seq > $${params.length + 1} ORDER BY r.seq LIMIT ${pageSize}`,
      [...params, after],
    );
    if (rows.length === 0) return;
    yield* await hydrate(q, rows);
    after = rows[rows.length - 1].seq;
    if (rows.length < pageSize) return;
  }
}

export async function deleteBatch(id: string, ctx: AuditContext) {
  await tx(async (client) => {
    const { rows } = await client.query(`SELECT status, file_name FROM batches WHERE id = $1 FOR UPDATE`, [id]);
    if (!rows[0]) throw notFound('Пакет');
    if (rows[0].status === 'processing') throw conflict('Пакет ещё обрабатывается');
    await client.query(`DELETE FROM batches WHERE id = $1`, [id]);
    await writeAudit(client, ctx, { action: 'batch.deleted', entityType: 'batch', entityId: id, details: { fileName: rows[0].file_name } });
  });
}
