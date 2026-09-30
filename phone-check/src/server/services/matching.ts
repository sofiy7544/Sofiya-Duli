import type { Queryable } from '../db';
import type { MatchStatus } from '@/lib/types';

export interface PhoneCandidate {
  customerId: string;
  customerRef: string;
  isVerified: boolean;
  isActive: boolean;
}

export interface MatchOutcome {
  status: MatchStatus;
  confidence: number | null;
  customerId: string | null;
  candidateIds: string[];
  reason: string;
}

/**
 * Правила сопоставления (см. docs/ARCHITECTURE.md). Только данные собственной CRM:
 * номер ищется по слепому индексу среди активных клиентов.
 */
export function classifyMatch(candidates: PhoneCandidate[], countryInferred: boolean): MatchOutcome {
  const byCustomer = new Map<string, PhoneCandidate>();
  for (const c of candidates) {
    const prev = byCustomer.get(c.customerId);
    // Если у клиента несколько записей одного номера — берём «лучшую»
    if (!prev || (c.isActive && !prev.isActive) || (c.isVerified && !prev.isVerified)) byCustomer.set(c.customerId, c);
  }
  const unique = [...byCustomer.values()];

  if (unique.length === 0) {
    return { status: 'not_found', confidence: 0, customerId: null, candidateIds: [], reason: 'Номер не найден в CRM' };
  }
  if (unique.length > 1) {
    return {
      status: 'multiple_matches',
      confidence: Math.round(100 / unique.length),
      customerId: null,
      candidateIds: unique.map((c) => c.customerId).sort(),
      reason: `Номер привязан к ${unique.length} клиентам`,
    };
  }
  const only = unique[0]!;
  const ids = [only.customerId];
  if (!only.isActive) {
    return { status: 'needs_review', confidence: 60, customerId: only.customerId, candidateIds: ids, reason: 'Номер помечен в CRM как неактуальный' };
  }
  if (!only.isVerified) {
    return { status: 'needs_review', confidence: 75, customerId: only.customerId, candidateIds: ids, reason: 'Номер в CRM не подтверждён' };
  }
  return {
    status: 'exact_match',
    confidence: countryInferred ? 95 : 100,
    customerId: only.customerId,
    candidateIds: ids,
    reason: countryInferred ? 'Точное совпадение (код страны подставлен по умолчанию)' : 'Точное совпадение E.164',
  };
}

/** Пакетный поиск кандидатов по слепому индексу. Ключ результата — hex(phone_hash). */
export async function lookupCandidates(q: Queryable, hashes: Buffer[]): Promise<Map<string, PhoneCandidate[]>> {
  const out = new Map<string, PhoneCandidate[]>();
  if (hashes.length === 0) return out;
  const { rows } = await q.query(
    `SELECT p.phone_hash, p.customer_id, c.customer_ref, p.is_verified, p.is_active
       FROM customer_phones p
       JOIN customers c ON c.id = p.customer_id
      WHERE p.phone_hash = ANY($1::bytea[]) AND c.status = 'active'`,
    [hashes],
  );
  for (const r of rows) {
    const key = (r.phone_hash as Buffer).toString('hex');
    const list = out.get(key) ?? [];
    list.push({ customerId: r.customer_id, customerRef: r.customer_ref, isVerified: r.is_verified, isActive: r.is_active });
    out.set(key, list);
  }
  return out;
}
