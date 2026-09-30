import { MATCH_STATUSES, type MatchStatus } from '@/lib/types';

export function parseStatusFilter(value: string | null): MatchStatus[] | undefined {
  if (!value) return undefined;
  const list = value.split(',').filter((s): s is MatchStatus => (MATCH_STATUSES as readonly string[]).includes(s));
  return list.length ? list : undefined;
}

export function intParam(value: string | null, fallback: number, min: number, max: number) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}
