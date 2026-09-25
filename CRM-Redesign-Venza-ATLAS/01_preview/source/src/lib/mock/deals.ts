import { useSyncExternalStore } from 'react';
import { store } from './store';
import { ApiError } from './api';

/**
 * Сделки (= /api/deals, /api/payments, /api/documents, /api/contracts/deal/:id).
 * Правила CRM: amount > 0, commission 0–100 (по умолчанию 3), lead обязателен,
 * предупреждение, если на объекте уже есть активная сделка; ADMIN/MANAGER — платежи и удаление.
 */
export type DealStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type Payment = { id: string; amount: number; paidAt: string; type: 'COMMISSION' | 'DEPOSIT' | 'OTHER'; note?: string };
export type DealDoc = { id: string; name: string; type: 'CONTRACT' | 'PASSPORT' | 'OTHER'; size: string; addedAt: string };
export type Deal = {
  id: string; leadId: string; clientId: string; propertyId?: string; userId: string;
  amount: number; currency: string; commissionPercent: number; status: DealStatus;
  createdAt: string; closedAt?: string; payments: Payment[]; documents: DealDoc[];
};

const DAY = 86_400_000; const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();
let deals: Deal[] = [
  { id: 'd1', leadId: 'l2', clientId: 'c2', propertyId: 'p2', userId: 'u2', amount: 1_600_000, currency: 'EUR', commissionPercent: 3, status: 'ACTIVE', createdAt: ago(4),
    payments: [{ id: 'pay1', amount: 10_000, paidAt: ago(2), type: 'DEPOSIT', note: 'Задаток за резерв' }], documents: [{ id: 'doc1', name: 'Предварительный договор.pdf', type: 'CONTRACT', size: '248 КБ', addedAt: ago(2) }] },
  { id: 'd2', leadId: 'l11', clientId: 'c7', propertyId: 'p9', userId: 'u1', amount: 1_420_000, currency: 'CHF', commissionPercent: 2.5, status: 'COMPLETED', createdAt: ago(60), closedAt: ago(21),
    payments: [{ id: 'pay2', amount: 35_500, paidAt: ago(20), type: 'COMMISSION' }], documents: [{ id: 'doc2', name: 'Договор купли-продажи.pdf', type: 'CONTRACT', size: '1,2 МБ', addedAt: ago(21) }, { id: 'doc3', name: 'Паспорт покупателя.jpg', type: 'PASSPORT', size: '640 КБ', addedAt: ago(40) }] },
  { id: 'd3', leadId: 'l1', clientId: 'c1', propertyId: 'p1', userId: 'u1', amount: 4_750_000, currency: 'EUR', commissionPercent: 3, status: 'ACTIVE', createdAt: ago(1), payments: [], documents: [] },
  { id: 'd4', leadId: 'l12', clientId: 'c11', propertyId: 'p6', userId: 'u3', amount: 520_000, currency: 'EUR', commissionPercent: 3, status: 'CANCELLED', createdAt: ago(100), closedAt: ago(80), payments: [], documents: [] },
  { id: 'd5', leadId: 'l14', clientId: 'c16', propertyId: 'p8', userId: 'u2', amount: 1_900_000, currency: 'EUR', commissionPercent: 2.5, status: 'ACTIVE', createdAt: ago(9),
    payments: [{ id: 'pay3', amount: 20_000, paidAt: ago(7), type: 'DEPOSIT', note: 'Задаток по участку' }], documents: [{ id: 'doc4', name: 'Разрешение на строительство.pdf', type: 'OTHER', size: '870 КБ', addedAt: ago(8) }] },
  /* Сделки по сгенерированным лидам: без них экран «Сделки» выглядел пустым
     на фоне сорока лидов. Лиды выбраны те, что стоят на «Переговорах» и
     «Выиграно» — в CRM сделка заводится только с них. */
  { id: 'd6', leadId: 'l22', clientId: 'c24', propertyId: 'p5', userId: 'u2', amount: 3_050_000, currency: 'EUR', commissionPercent: 3, status: 'ACTIVE', createdAt: ago(12),
    payments: [{ id: 'pay4', amount: 30_000, paidAt: ago(10), type: 'DEPOSIT', note: 'Задаток' }], documents: [{ id: 'doc5', name: 'Предварительный договор.pdf', type: 'CONTRACT', size: '310 КБ', addedAt: ago(10) }] },
  { id: 'd7', leadId: 'l27', clientId: 'c29', propertyId: 'p3', userId: 'u1', amount: 385_000, currency: 'EUR', commissionPercent: 3, status: 'COMPLETED', createdAt: ago(48), closedAt: ago(15),
    payments: [{ id: 'pay5', amount: 11_550, paidAt: ago(14), type: 'COMMISSION' }], documents: [{ id: 'doc6', name: 'Договор купли-продажи.pdf', type: 'CONTRACT', size: '980 КБ', addedAt: ago(15) }] },
  { id: 'd8', leadId: 'l37', clientId: 'c39', propertyId: 'p6', userId: 'u3', amount: 530_000, currency: 'EUR', commissionPercent: 2.5, status: 'ACTIVE', createdAt: ago(6), payments: [], documents: [] },
  { id: 'd9', leadId: 'l42', clientId: 'c44', propertyId: 'p7', userId: 'u1', amount: 960_000, currency: 'EUR', commissionPercent: 3, status: 'COMPLETED', createdAt: ago(75), closedAt: ago(33),
    payments: [{ id: 'pay6', amount: 14_400, paidAt: ago(32), type: 'COMMISSION', note: 'Половина комиссии' }, { id: 'pay7', amount: 14_400, paidAt: ago(20), type: 'COMMISSION', note: 'Остаток' }],
    documents: [{ id: 'doc7', name: 'Акт приёма-передачи.pdf', type: 'OTHER', size: '420 КБ', addedAt: ago(33) }] },
  { id: 'd10', leadId: 'l31', clientId: 'c33', propertyId: 'p2', userId: 'u2', amount: 1_600_000, currency: 'EUR', commissionPercent: 3, status: 'CANCELLED', createdAt: ago(40), closedAt: ago(26), payments: [], documents: [] },
];
const subs = new Set<() => void>(); let v = 0;
const emit = () => { v++; subs.forEach((s) => s()); store.touch(); };
const wait = (ms = store.settings.latencyMs) => new Promise((r) => setTimeout(r, ms));
export function useDealsVersion() { return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => v, () => v); }

async function respond<T>(make: () => T, empty: T): Promise<T> {
  const mode = store.settings.dataMode;
  if (mode === 'loading') return new Promise<T>(() => {});
  await wait();
  if (mode === 'error') throw new ApiError('Не удалось загрузить сделки. Сервер не ответил.', 503);
  if (mode === 'empty') return empty;
  return make();
}

export const dealsApi = {
  /** GET /api/deals */
  list: () => respond(() => [...deals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [] as Deal[]),
  /** GET /api/deals/:id — в CRM skeleton «висит» при ошибке; здесь показываем ErrorState */
  get: (id: string) => respond(() => { const d = deals.find((x) => x.id === id); if (!d) throw new ApiError('Сделка не найдена', 404); return d; }, null as Deal | null),
  /** POST /api/deals */
  async create(input: { leadId: string; propertyId?: string; amount: number; commissionPercent: number }) {
    await wait(500);
    if (!(input.amount > 0)) throw new ApiError('Сумма должна быть больше нуля', 400);
    if (input.commissionPercent < 0 || input.commissionPercent > 100) throw new ApiError('Комиссия — от 0 до 100%', 400);
    const lead = store.db.leads.find((l) => l.id === input.leadId); if (!lead) throw new ApiError('Выберите лид', 400);
    const d: Deal = { id: `d${Date.now()}`, leadId: lead.id, clientId: lead.clientId, propertyId: input.propertyId, userId: 'u1', amount: input.amount, currency: 'EUR', commissionPercent: input.commissionPercent, status: 'ACTIVE', createdAt: new Date().toISOString(), payments: [], documents: [] };
    deals = [d, ...deals]; emit(); return d;
  },
  /** PATCH /api/deals/:id { status } — побочный эффект: COMPLETED → лид WON, CANCELLED → лид LOST */
  async setStatus(id: string, status: DealStatus, lostReason?: string) {
    await wait(350);
    const d = deals.find((x) => x.id === id)!; const prev = d.status;
    deals = deals.map((x) => (x.id === id ? { ...x, status, closedAt: status === 'ACTIVE' ? undefined : new Date().toISOString() } : x));
    store.mutate((db) => { const l = db.leads.find((x) => x.id === d.leadId); if (l) { l.stage = status === 'COMPLETED' ? 'WON' : status === 'CANCELLED' ? 'LOST' : 'NEGOTIATION'; l.lostReason = status === 'CANCELLED' ? lostReason : undefined; } });
    emit(); return { prev };
  },
  /** POST /api/payments (ADMIN/MANAGER) */
  async addPayment(dealId: string, p: Omit<Payment, 'id'>) {
    await wait(400);
    if (!(p.amount > 0)) throw new ApiError('Сумма платежа должна быть больше нуля', 400);
    deals = deals.map((x) => (x.id === dealId ? { ...x, payments: [...x.payments, { ...p, id: `pay${Date.now()}` }] } : x)); emit();
  },
  async removeDoc(dealId: string, docId: string) { await wait(250); deals = deals.map((x) => (x.id === dealId ? { ...x, documents: x.documents.filter((d) => d.id !== docId) } : x)); emit(); },
  async addDoc(dealId: string, name: string) { await wait(700); deals = deals.map((x) => (x.id === dealId ? { ...x, documents: [...x.documents, { id: `doc${Date.now()}`, name, type: 'OTHER', size: '312 КБ', addedAt: new Date().toISOString() }] } : x)); emit(); },
  async remove(id: string) { await wait(300); deals = deals.filter((x) => x.id !== id); emit(); },
  activeOnProperty: (propertyId?: string, exceptId?: string) => deals.find((d) => d.propertyId === propertyId && d.status === 'ACTIVE' && d.id !== exceptId),
  commission: (d: Pick<Deal, 'amount' | 'commissionPercent'>) => Math.round((d.amount * d.commissionPercent) / 100),
  paid: (d: Deal) => d.payments.reduce((a, p) => a + p.amount, 0),
};
export const DEAL_STATUS_LABEL: Record<DealStatus, string> = { ACTIVE: 'В работе', COMPLETED: 'Завершена', CANCELLED: 'Отменена' };
