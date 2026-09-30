import { describe, expect, it } from 'vitest';
import { classifyMatch, type PhoneCandidate } from '@/server/services/matching';

const c = (id: string, over: Partial<PhoneCandidate> = {}): PhoneCandidate => ({
  customerId: id,
  customerRef: `CUS-${id}`,
  isVerified: true,
  isActive: true,
  ...over,
});

describe('classifyMatch', () => {
  it('нет кандидатов → Not found', () => {
    expect(classifyMatch([], false)).toMatchObject({ status: 'not_found', confidence: 0, customerId: null });
  });

  it('один подтверждённый номер → Exact match 100', () => {
    expect(classifyMatch([c('a')], false)).toMatchObject({ status: 'exact_match', confidence: 100, customerId: 'a' });
  });

  it('страна подставлена по умолчанию → 95', () => {
    expect(classifyMatch([c('a')], true)).toMatchObject({ status: 'exact_match', confidence: 95 });
  });

  it('неподтверждённый номер → Needs manual review 75', () => {
    expect(classifyMatch([c('a', { isVerified: false })], false)).toMatchObject({ status: 'needs_review', confidence: 75, customerId: 'a' });
  });

  it('неактуальный номер → Needs manual review 60', () => {
    expect(classifyMatch([c('a', { isActive: false })], false)).toMatchObject({ status: 'needs_review', confidence: 60 });
  });

  it('несколько клиентов → Multiple matches, без выбранного клиента', () => {
    const r = classifyMatch([c('b'), c('a'), c('c')], false);
    expect(r).toMatchObject({ status: 'multiple_matches', confidence: 33, customerId: null });
    expect(r.candidateIds).toEqual(['a', 'b', 'c']);
  });

  it('дубли одного клиента схлопываются и выбирается лучшая запись', () => {
    const r = classifyMatch([c('a', { isVerified: false }), c('a')], false);
    expect(r).toMatchObject({ status: 'exact_match', customerId: 'a', candidateIds: ['a'] });
  });
});
