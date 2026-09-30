export const ROLES = ['admin', 'manager', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const MATCH_STATUSES = ['exact_match', 'multiple_matches', 'needs_review', 'not_found', 'invalid_phone'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const STATUS_LABEL: Record<MatchStatus, string> = {
  exact_match: 'Exact match',
  multiple_matches: 'Multiple matches',
  needs_review: 'Needs manual review',
  not_found: 'Not found',
  invalid_phone: 'Invalid phone',
};

export const CHANNELS = ['facebook', 'messenger', 'telegram', 'viber', 'whatsapp'] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<Channel, string> = {
  facebook: 'Facebook',
  messenger: 'Messenger',
  telegram: 'Telegram',
  viber: 'Viber',
  whatsapp: 'WhatsApp',
};

export type ConsentStatus = 'granted' | 'withdrawn' | 'unknown';
export type BatchStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ChannelValue {
  channel: Channel;
  value: string;
  url: string | null;
  source: string;
  consentStatus: ConsentStatus;
  consentAt: string | null;
}

export interface ResultRow {
  id: string;
  seq: number;
  rowNumber: number;
  occurrences: number;
  rawInput: string;
  phone: string | null;
  country: string | null;
  customerId: string | null;
  customerRef: string | null;
  fullName: string | null;
  facebook: ChannelValue | null;
  telegram: ChannelValue | null;
  viber: ChannelValue | null;
  whatsapp: ChannelValue | null;
  source: string | null;
  consentStatus: ConsentStatus | null;
  consentAt: string | null;
  confidence: number | null;
  status: MatchStatus;
  candidateCount: number;
  matchReason: string | null;
  reviewDecision: 'confirmed' | 'rejected' | null;
}

export interface BatchSummary {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'xlsx';
  status: BatchStatus;
  totalRows: number;
  processedRows: number;
  uniquePhones: number;
  duplicateRows: number;
  phoneColumn: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  expiresAt: string;
  createdBy: { id: string; name: string; email: string };
  counts: Record<MatchStatus, number>;
}
