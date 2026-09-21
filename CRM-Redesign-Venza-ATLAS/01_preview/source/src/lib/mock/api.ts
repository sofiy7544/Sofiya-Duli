import { store } from './store';
import type { Activity, CalendarEvent, Client, EventKind, Lead, LeadStage, Paginated, Property, Task } from './types';
import { EVENT_KIND_LABEL, isStageTransitionAllowed } from '../labels';

/**
 * Mock-API. Сигнатуры и формы ответов совпадают с реальным `apps/web/src/lib/api.ts`
 * (пути указаны в комментариях). Разработчику: заменить тело функции на реальный запрос.
 */
export class ApiError extends Error { constructor(message: string, public status = 500) { super(message); } }

const wait = (ms = store.settings.latencyMs) => new Promise((r) => setTimeout(r, ms));
async function respond<T>(make: () => T, empty: T): Promise<T> {
  const mode = store.settings.dataMode;
  if (mode === 'loading') return new Promise<T>(() => {}); // вечная загрузка — показать skeleton
  await wait();
  if (mode === 'error') throw new ApiError('Не удалось загрузить данные. Сервер не ответил за 15 секунд.', 503);
  if (mode === 'empty') return empty;
  return make();
}
const page = <T,>(items: T[]): Paginated<T> => ({ items, total: items.length, page: 1, pageSize: 50 });
const emptyPage = { items: [], total: 0, page: 1, pageSize: 50 };
const q = (s: string) => s.toLowerCase().trim();


/** Проверки полей клиента и объекта. Ошибки формулируются так, чтобы их можно было показать рядом с полем. */
function validateClient(c: Pick<Client, 'fullName' | 'primaryPhone' | 'email'>) {
  if (c.fullName.trim().length < 2) throw new ApiError('Имя — минимум 2 символа', 400);
  if (!/^[+0-9()\-\s]{6,32}$/.test(c.primaryPhone)) throw new ApiError('Телефон: 6–32 символа, цифры, +, скобки и дефис', 400);
  if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) throw new ApiError('Проверьте адрес почты', 400);
}
function validateProperty(p: Pick<Property, 'title' | 'district' | 'address' | 'area' | 'price'>) {
  if (p.title.trim().length < 3) throw new ApiError('Название — минимум 3 символа', 400);
  if (!p.district.trim()) throw new ApiError('Укажите район', 400);
  if (!p.address.trim()) throw new ApiError('Укажите адрес', 400);
  if (!(p.area > 0)) throw new ApiError('Площадь должна быть больше нуля', 400);
  if (!(p.price > 0)) throw new ApiError('Цена должна быть больше нуля', 400);
}

export const api = {
  /** GET /api/reports/dashboard + today-tasks + upcoming-showings + recent-activity */
  today: () => respond(() => {
    const { tasks, events, leads, activities } = store.db;
    const d0 = new Date(); d0.setHours(0, 0, 0, 0); const d1 = new Date(d0); d1.setDate(d1.getDate() + 1);
    const inDay = (iso: string) => { const t = new Date(iso); return t >= d0 && t < d1; };
    return {
      tasks: tasks.filter((t) => new Date(t.dueAt) < d1).sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      events: events.filter((e) => inDay(e.startsAt)).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      newLeads: leads.filter((l) => l.stage === 'NEW'),
      activeLeads: leads.filter((l) => l.stage !== 'WON' && l.stage !== 'LOST'),
      activity: [...activities].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6),
    };
  }, { tasks: [] as Task[], events: [] as CalendarEvent[], newLeads: [] as Lead[], activeLeads: [] as Lead[], activity: [] as Activity[] }),

  /** GET /api/leads (полный список, без пагинации) */
  leads: () => respond(() => [...store.db.leads], [] as Lead[]),
  /** GET /api/leads/:id */
  lead: (id: string) => respond(() => { const l = store.db.leads.find((x) => x.id === id); if (!l) throw new ApiError('Лид не найден', 404); return l; }, null as Lead | null),

  /** PATCH /api/leads/:id/stage { stage, lostReason } — правила из enums.ts isStageTransitionAllowed */
  async moveLead(id: string, stage: LeadStage, lostReason?: string) {
    await wait(280);
    const lead = store.db.leads.find((l) => l.id === id);
    if (!lead) throw new ApiError('Лид не найден', 404);
    if (!isStageTransitionAllowed(lead.stage, stage)) throw new ApiError('«Сделка» доступна только из этапа «Переговоры»', 400);
    if (stage === 'LOST' && !lostReason?.trim()) throw new ApiError('Укажите причину проигрыша', 400);
    const prev = lead.stage;
    store.mutate((d) => {
      const l = d.leads.find((x) => x.id === id)!; l.stage = stage; l.lostReason = stage === 'LOST' ? lostReason : undefined;
      d.activities.unshift({ id: `a${Date.now()}`, type: 'STAGE', text: `Этап изменён`, at: new Date().toISOString(), userId: 'u1', clientId: l.clientId, leadId: l.id });
    });
    return { prev };
  },

  /** PATCH /api/leads/:id { priority | assignedUserId | nextActionAt } — assignee только ADMIN/MANAGER */
  async updateLead(id: string, patch: Partial<Pick<Lead, 'priority' | 'assignedUserId' | 'nextActionAt'>>) {
    await wait(260);
    store.mutate((d) => { Object.assign(d.leads.find((l) => l.id === id)!, patch); });
  },
  /** POST /api/activities (CALL) + POST /api/tasks при перезвоне — как CallDispositionDialog */
  async logCall(input: { clientId: string; leadId?: string; outcome: 'answered' | 'no_answer' | 'busy'; note: string; callbackAt?: string }) {
    await wait(400);
    const label = { answered: 'отвечен', no_answer: 'нет ответа', busy: 'занято' }[input.outcome];
    store.mutate((d) => {
      d.activities.unshift({ id: `a${Date.now()}`, type: 'CALL', text: `Звонок: ${label}.${input.note ? ' ' + input.note : ''}`, at: new Date().toISOString(), userId: 'u1', clientId: input.clientId, leadId: input.leadId });
      if (input.callbackAt) d.tasks.push({ id: `t${Date.now()}`, title: 'Перезвонить', type: 'CALL', dueAt: input.callbackAt, userId: 'u1', clientId: input.clientId, leadId: input.leadId, completedAt: null });
      const l = input.leadId && d.leads.find((x) => x.id === input.leadId); if (l) { l.lastContactAt = new Date().toISOString(); if (input.callbackAt) l.nextActionAt = input.callbackAt; }
    });
  },
  /** GET /api/clients?status=active|archived|blacklisted&search= */
  clients: (status: 'active' | 'archived' | 'blacklisted', search = '') => respond(() => page(store.db.clients.filter((c) =>
    (status === 'active' ? !c.isArchived && !c.isBlacklisted : status === 'archived' ? c.isArchived : c.isBlacklisted) &&
    (!search || q(c.fullName).includes(q(search)) || c.primaryPhone.replace(/\s/g, '').includes(search.replace(/\s/g, ''))))), emptyPage as Paginated<Client>),
  client: (id: string) => respond(() => { const c = store.db.clients.find((x) => x.id === id); if (!c) throw new ApiError('Клиент не найден', 404); return c; }, null as Client | null),

  /** GET /api/properties?search&type&status&mine&includeInactive */
  properties: (f: { search?: string; type?: string; status?: string; mine?: boolean; includeInactive?: boolean }) => respond(() => page(store.db.properties.filter((p) =>
    (f.includeInactive || (p.status !== 'SOLD' && p.status !== 'ARCHIVED')) && (!f.type || p.type === f.type) && (!f.status || p.status === f.status) &&
    (!f.mine || p.ownerUserId === 'u1') && (!f.search || q(p.title + p.district + p.address).includes(q(f.search))))), emptyPage as Paginated<Property>),
  property: (id: string) => respond(() => { const p = store.db.properties.find((x) => x.id === id); if (!p) throw new ApiError('Объект не найден', 404); return p; }, null as Property | null),

  /** GET /api/tasks */
  tasks: () => respond(() => [...store.db.tasks].sort((a, b) => a.dueAt.localeCompare(b.dueAt)), [] as Task[]),
  /** POST /api/tasks/:id/complete · PATCH /api/tasks/:id { completedAt: null } */
  async toggleTask(id: string) {
    await wait(220);
    let done = false;
    store.mutate((d) => { const t = d.tasks.find((x) => x.id === id)!; t.completedAt = t.completedAt ? null : new Date().toISOString(); done = !!t.completedAt; });
    return { done };
  },
  /** POST /api/tasks { title, dueAt, type, clientId?, leadId? } */
  async createTask(input: Pick<Task, 'title' | 'dueAt' | 'type'> & { clientId?: string; leadId?: string }) {
    await wait(400);
    if (input.title.trim().length < 1) throw new ApiError('Введите название задачи', 400);
    const t: Task = { id: `t${Date.now()}`, userId: 'u1', completedAt: null, ...input };
    store.mutate((d) => { d.tasks.push(t); });
    return t;
  },
  /** POST /api/clients + POST /api/leads (как Quick Capture) */
  async createLead(input: { fullName: string; primaryPhone: string; priority: Lead['priority']; budgetMax?: number }) {
    await wait(500);
    if (input.fullName.trim().length < 2) throw new ApiError('Имя — минимум 2 символа', 400);
    if (!/^[+0-9()\-\s]{6,32}$/.test(input.primaryPhone)) throw new ApiError('Телефон: 6–32 символа, цифры, +, скобки и дефис', 400);
    const c: Client = { id: `c${Date.now()}`, fullName: input.fullName.trim(), primaryPhone: input.primaryPhone, type: 'BUYER', source: 'MANUAL', assignedUserId: 'u1', isArchived: false, isBlacklisted: false, createdAt: new Date().toISOString() };
    const l: Lead = { id: `l${Date.now()}`, clientId: c.id, stage: 'NEW', priority: input.priority, assignedUserId: 'u1', source: 'MANUAL', purpose: 'LIVING', budgetMax: input.budgetMax, budgetCurrency: 'EUR', createdAt: new Date().toISOString() };
    store.mutate((d) => { d.clients.unshift(c); d.leads.unshift(l); d.activities.unshift({ id: `a${Date.now()}`, type: 'CREATED', text: 'Новый лид', at: l.createdAt, userId: 'u1', clientId: c.id, leadId: l.id }); });
    return l;
  },
  /** POST /api/clients — карточка клиента целиком, а не быстрое создание */
  async createClient(input: Omit<Client, 'id' | 'createdAt' | 'isArchived' | 'isBlacklisted'>) {
    await wait(500);
    validateClient(input);
    const c: Client = { ...input, id: `c${Date.now()}`, isArchived: false, isBlacklisted: false, createdAt: new Date().toISOString() };
    store.mutate((d) => { d.clients.unshift(c); d.activities.unshift({ id: `a${Date.now()}`, type: 'CREATED', text: 'Клиент добавлен', at: c.createdAt, userId: 'u1', clientId: c.id }); });
    return c;
  },
  /** PATCH /api/clients/:id */
  async updateClient(id: string, patch: Partial<Client>) {
    await wait(450);
    const cur = store.db.clients.find((c) => c.id === id);
    if (!cur) throw new ApiError('Клиент не найден', 404);
    validateClient({ ...cur, ...patch });
    store.mutate((d) => { Object.assign(d.clients.find((c) => c.id === id)!, patch); });
    return { ...cur, ...patch } as Client;
  },
  /** POST /api/properties */
  async createProperty(input: Omit<Property, 'id' | 'createdAt' | 'photos'>) {
    await wait(500);
    validateProperty(input);
    const p: Property = { ...input, id: `p${Date.now()}`, photos: [], createdAt: new Date().toISOString() };
    store.mutate((d) => { d.properties.unshift(p); });
    return p;
  },
  /** PATCH /api/properties/:id */
  async updateProperty(id: string, patch: Partial<Property>) {
    await wait(450);
    const cur = store.db.properties.find((p) => p.id === id);
    if (!cur) throw new ApiError('Объект не найден', 404);
    validateProperty({ ...cur, ...patch });
    store.mutate((d) => { Object.assign(d.properties.find((p) => p.id === id)!, patch); });
    return { ...cur, ...patch } as Property;
  },
  /** POST /api/clients/:id/note */
  async addNote(clientId: string, text: string, leadId?: string) {
    await wait(300);
    store.mutate((d) => { d.activities.unshift({ id: `a${Date.now()}`, type: 'NOTE', text, at: new Date().toISOString(), userId: 'u1', clientId, leadId }); });
  },
  /** GET /api/activities/client/:id | /lead/:id */
  activities: (by: { clientId?: string; leadId?: string }) => respond(() => store.db.activities.filter((a) => (by.leadId ? a.leadId === by.leadId : a.clientId === by.clientId)).sort((a, b) => b.at.localeCompare(a.at)), [] as Activity[]),
  /** GET /api/showings?from&to (+ задачи/сделки в календаре) */
  events: () => respond(() => [...store.db.events], [] as CalendarEvent[]),
  /** POST /api/showings — событие календаря: показ, встреча, звонок */
  async createEvent(input: { kind: EventKind; title: string; startsAt: string; minutes: number; clientId?: string; propertyId?: string }) {
    await wait(450);
    if (input.title.trim().length < 3) throw new ApiError('Название — минимум 3 символа', 400);
    const start = new Date(input.startsAt);
    if (Number.isNaN(start.getTime())) throw new ApiError('Проверьте дату и время', 400);
    if (!(input.minutes > 0)) throw new ApiError('Длительность должна быть больше нуля', 400);
    const event: CalendarEvent = {
      id: `e${Date.now()}`, kind: input.kind, title: input.title.trim(),
      startsAt: start.toISOString(), endsAt: new Date(start.getTime() + input.minutes * 60_000).toISOString(),
      clientId: input.clientId || undefined, propertyId: input.propertyId || undefined, userId: 'u1',
    };
    store.mutate((d) => {
      d.events.push(event);
      if (event.clientId) d.activities.unshift({ id: `a${Date.now()}`, type: event.kind === 'SHOWING' ? 'SHOWING' : 'NOTE', text: `${EVENT_KIND_LABEL[event.kind]}: ${event.title}`, at: new Date().toISOString(), userId: 'u1', clientId: event.clientId });
    });
    return event;
  },
  /** PATCH /api/showings/:id — перенос. Длительность сохраняется: меняется только начало. */
  async moveEvent(id: string, startsAt: string) {
    await wait(420);
    const cur = store.db.events.find((e) => e.id === id);
    if (!cur) throw new ApiError('Событие не найдено', 404);
    if (cur.readOnly) throw new ApiError('Событие сделки переносится в карточке сделки', 409);
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) throw new ApiError('Проверьте дату и время', 400);
    const span = new Date(cur.endsAt).getTime() - new Date(cur.startsAt).getTime();
    store.mutate((d) => {
      const e = d.events.find((x) => x.id === id)!;
      e.startsAt = start.toISOString(); e.endsAt = new Date(start.getTime() + span).toISOString();
    });
    return { ...cur, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + span).toISOString() };
  },
  /** PATCH /api/showings/:id { status: DONE } — из календаря уходит, в истории клиента остаётся. */
  async completeEvent(id: string) {
    await wait(380);
    const cur = store.db.events.find((e) => e.id === id);
    if (!cur) throw new ApiError('Событие не найдено', 404);
    store.mutate((d) => {
      d.events = d.events.filter((e) => e.id !== id);
      if (cur.clientId) d.activities.unshift({ id: `a${Date.now()}`, type: cur.kind === 'SHOWING' ? 'SHOWING' : 'NOTE', text: `${EVENT_KIND_LABEL[cur.kind]} проведён: ${cur.title}`, at: new Date().toISOString(), userId: 'u1', clientId: cur.clientId });
    });
  },
  /** Глобальный поиск палитры: contacts / leads / properties (≥ 2 символов, debounce 250) */
  async search(term: string) {
    await wait(180);
    const s = q(term); if (s.length < 2) return { clients: [], properties: [] };
    return {
      clients: store.db.clients.filter((c) => q(c.fullName).includes(s) || c.primaryPhone.replace(/\s/g, '').includes(s.replace(/\s/g, ''))).slice(0, 5),
      properties: store.db.properties.filter((p) => q(p.title + ' ' + p.district).includes(s)).slice(0, 5),
    };
  },
  /** PATCH /api/clients/:id { isArchived } */
  async setArchived(id: string, isArchived: boolean) { await wait(300); store.mutate((d) => { d.clients.find((c) => c.id === id)!.isArchived = isArchived; }); },
};
