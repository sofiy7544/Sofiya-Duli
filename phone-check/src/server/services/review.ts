import { z } from 'zod';
import { tx, type Queryable } from '../db';
import { decrypt, decryptNullable, encryptNullable } from '../crypto';
import { badRequest, conflict, notFound } from '../errors';
import { writeAudit, type AuditContext } from './audit';
import { loadCustomerDetail, type CustomerDetail } from './customers';
import type { MatchStatus } from '@/lib/types';

export interface ResultDetail {
  id: string;
  batchId: string;
  batchFileName: string;
  seq: number;
  rowNumber: number;
  occurrences: number;
  rawInput: string;
  phone: string | null;
  country: string | null;
  status: MatchStatus;
  confidence: number | null;
  matchReason: string | null;
  customerId: string | null;
  review: { decision: 'confirmed' | 'rejected'; by: string | null; at: string; note: string | null } | null;
  candidates: (CustomerDetail & { matchedPhone: CustomerDetail['phones'][number] | null })[];
  prevId: string | null;
  nextId: string | null;
}

const REVIEWABLE: MatchStatus[] = ['needs_review', 'multiple_matches'];

/** Полная карточка для ручной проверки. Каждый просмотр ПДн фиксируется в аудите. */
export async function getResultDetail(q: Queryable, id: string, ctx: AuditContext): Promise<ResultDetail> {
  const { rows } = await q.query(
    `SELECT r.*, b.file_name, u.name AS reviewer_name FROM check_results r
       JOIN batches b ON b.id = r.batch_id
       LEFT JOIN users u ON u.id = r.reviewed_by
      WHERE r.id = $1`,
    [id],
  );
  const r = rows[0];
  if (!r) throw notFound('Запись');
  const ids: string[] = r.candidate_ids.length ? r.candidate_ids : r.customer_id ? [r.customer_id] : [];
  const candidates = [];
  for (const cid of ids) {
    try {
      const detail = await loadCustomerDetail(q, cid);
      const phone = r.phone_enc ? decrypt(r.phone_enc) : null;
      candidates.push({ ...detail, matchedPhone: detail.phones.find((p) => p.phone === phone) ?? null });
    } catch {
      // клиент удалён из CRM после проверки
    }
  }
  // Соседние записи, требующие проверки, — для навигации «следующая»
  const { rows: nav } = await q.query(
    `SELECT
       (SELECT id FROM check_results WHERE batch_id = $1 AND seq < $2 AND status = ANY($3::match_status[]) AND review_decision IS NULL ORDER BY seq DESC LIMIT 1) AS prev_id,
       (SELECT id FROM check_results WHERE batch_id = $1 AND seq > $2 AND status = ANY($3::match_status[]) AND review_decision IS NULL ORDER BY seq LIMIT 1) AS next_id`,
    [r.batch_id, r.seq, REVIEWABLE],
  );
  if (candidates.length) {
    await writeAudit(q, ctx, {
      action: 'customer.viewed',
      entityType: 'check_result',
      entityId: id,
      details: { batchId: r.batch_id, customerRefs: candidates.map((c) => c.customerRef), phone: r.phone_masked },
    });
  }
  return {
    id: r.id,
    batchId: r.batch_id,
    batchFileName: r.file_name,
    seq: r.seq,
    rowNumber: r.row_number,
    occurrences: r.occurrences,
    rawInput: decrypt(r.raw_input_enc),
    phone: r.phone_enc ? decrypt(r.phone_enc) : null,
    country: r.country,
    status: r.status,
    confidence: r.confidence,
    matchReason: r.match_reason,
    customerId: r.customer_id,
    review: r.review_decision
      ? { decision: r.review_decision, by: r.reviewer_name, at: r.reviewed_at.toISOString(), note: decryptNullable(r.review_note_enc) }
      : null,
    candidates,
    prevId: nav[0].prev_id,
    nextId: nav[0].next_id,
  };
}

export const reviewSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('confirm'), customerId: z.uuid(), note: z.string().max(1000).optional() }),
  z.object({ decision: z.literal('reject'), note: z.string().max(1000).optional() }),
]);
export type ReviewInput = z.infer<typeof reviewSchema>;

/**
 * Подтверждение: выбранный кандидат становится совпадением (Exact match, 100%).
 * Отклонение: совпадения нет (Not found). Решение можно пересмотреть — каждое пишется в аудит.
 */
export async function reviewResult(id: string, input: ReviewInput, ctx: AuditContext) {
  const data = reviewSchema.parse(input);
  return tx(async (client) => {
    const { rows } = await client.query(
      `SELECT r.*, b.status AS batch_status FROM check_results r JOIN batches b ON b.id = r.batch_id WHERE r.id = $1 FOR UPDATE OF r`,
      [id],
    );
    const r = rows[0];
    if (!r) throw notFound('Запись');
    if (r.batch_status !== 'completed') throw conflict('Пакет ещё не обработан');
    if (r.status === 'invalid_phone') throw badRequest('Невалидный номер нельзя сопоставить');

    const allowed: string[] = r.candidate_ids.length ? r.candidate_ids : r.customer_id ? [r.customer_id] : [];
    let customerRef: string | null = null;
    if (data.decision === 'confirm') {
      if (!allowed.includes(data.customerId)) throw badRequest('Можно подтвердить только клиента из списка кандидатов');
      const { rows: c } = await client.query(`SELECT customer_ref FROM customers WHERE id = $1`, [data.customerId]);
      if (!c[0]) throw notFound('Клиент');
      customerRef = c[0].customer_ref;
      await client.query(
        `UPDATE check_results SET status = 'exact_match', confidence = 100, customer_id = $2, review_decision = 'confirmed',
                reviewed_by = $3, reviewed_at = now(), review_note_enc = $4, match_reason = 'Подтверждено вручную'
          WHERE id = $1`,
        [id, data.customerId, ctx.actor?.id ?? null, encryptNullable(data.note)],
      );
    } else {
      await client.query(
        `UPDATE check_results SET status = 'not_found', confidence = 0, customer_id = NULL, review_decision = 'rejected',
                reviewed_by = $2, reviewed_at = now(), review_note_enc = $3, match_reason = 'Совпадение отклонено вручную'
          WHERE id = $1`,
        [id, ctx.actor?.id ?? null, encryptNullable(data.note)],
      );
    }
    await writeAudit(client, ctx, {
      action: data.decision === 'confirm' ? 'match.confirmed' : 'match.rejected',
      entityType: 'check_result',
      entityId: id,
      details: {
        batchId: r.batch_id,
        phone: r.phone_masked,
        phoneHash: r.phone_hash ? (r.phone_hash as Buffer).toString('hex') : null,
        previousStatus: r.status,
        previousDecision: r.review_decision,
        customerRef,
        hasNote: Boolean(data.note),
      },
    });
    return { ok: true };
  });
}
