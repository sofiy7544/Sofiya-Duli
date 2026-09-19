import { useSyncExternalStore } from 'react';
import { ApiError } from './api';
import { store } from './store';

/**
 * /inbox. По SCREEN-MAP: омниканальный ящик + панель квалификации + разбор
 * дубликатов. Канал приходит из интеграции, поэтому экран закрыт флагом
 * integrationsEnabled — как в CRM.
 */
export type Channel = 'TELEGRAM' | 'WHATSAPP' | 'EMAIL' | 'INSTAGRAM';
export type Message = { id: string; at: string; text: string; mine: boolean };
export type Conversation = {
  id: string;
  channel: Channel;
  author: string;
  handle: string;
  messages: Message[];
  status: 'new' | 'qualified' | 'dismissed';
  /** Совпадение с существующим клиентом: причина показать разбор дубликата. */
  duplicateOf?: { clientId: string; name: string; reason: string };
};

const MIN = 60_000;
const back = (ms: number) => new Date(Date.now() - ms).toISOString();

let items: Conversation[] = [
  { id: 'i1', channel: 'TELEGRAM', author: 'Ирина Ковальчук', handle: '@irynak', status: 'new',
    messages: [
      { id: 'm1', at: back(18 * MIN), text: 'Добрый день! Смотрю двушку в вашем объявлении на набережной. Она ещё актуальна?', mine: false },
      { id: 'm2', at: back(12 * MIN), text: 'И какой этаж? Хотелось бы повыше.', mine: false },
    ] },
  { id: 'i2', channel: 'WHATSAPP', author: 'Максим Дорош', handle: '+380 67 214-88-10', status: 'new',
    duplicateOf: { clientId: 'c1', name: 'Максим Дорош', reason: 'Совпадает телефон' },
    messages: [
      { id: 'm3', at: back(55 * MIN), text: 'Здравствуйте, подтверждаю показ в субботу. Приедем вдвоём с женой.', mine: false },
      { id: 'm4', at: back(50 * MIN), text: 'Принято, записала вас на 16:30.', mine: true },
    ] },
  { id: 'i3', channel: 'EMAIL', author: 'Andrea Bianchi', handle: 'a.bianchi@studio-mb.it', status: 'new',
    messages: [
      { id: 'm5', at: back(4 * 60 * MIN), text: 'Buongiorno! Ищем помещение под студию, 120–150 м², желательно с отдельным входом. Бюджет до 900 тыс. €.', mine: false },
    ] },
  { id: 'i4', channel: 'INSTAGRAM', author: 'kateryna.home', handle: '@kateryna.home', status: 'qualified',
    messages: [
      { id: 'm6', at: back(26 * 60 * MIN), text: 'Подскажите, а рассрочка от застройщика есть?', mine: false },
      { id: 'm7', at: back(25 * 60 * MIN), text: 'Да, до 18 месяцев. Пришлю таблицу в личные сообщения.', mine: true },
    ] },
];

const subs = new Set<() => void>(); let v = 0;
const emit = () => { v++; subs.forEach((s) => s()); };
const wait = (ms = store.settings.latencyMs) => new Promise((r) => setTimeout(r, ms));
export function useInboxVersion() { return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => v, () => v); }

export const inboxApi = {
  /** GET /api/inbox */
  async list() {
    const mode = store.settings.dataMode;
    if (mode === 'loading') return new Promise<Conversation[]>(() => {});
    await wait();
    if (mode === 'error') throw new ApiError('Не удалось загрузить переписку. Сервер не ответил.', 503);
    if (mode === 'empty') return [] as Conversation[];
    const last = (c: Conversation) => c.messages[c.messages.length - 1]?.at ?? '';
    return [...items].sort((a, b) => last(b).localeCompare(last(a)));
  },
  /** POST /api/inbox/:id/qualify — создаёт лид из обращения */
  async qualify(id: string) {
    await wait(400);
    const c = items.find((x) => x.id === id); if (!c) throw new ApiError('Обращение не найдено', 404);
    c.status = 'qualified'; emit(); return c;
  },
  /** POST /api/inbox/:id/dismiss — не лид (спам, ошибка номером) */
  async dismiss(id: string) {
    await wait(300);
    const c = items.find((x) => x.id === id); if (!c) throw new ApiError('Обращение не найдено', 404);
    c.status = 'dismissed'; emit();
  },
  /** POST /api/inbox/:id/reply */
  async reply(id: string, text: string) {
    await wait(300);
    const c = items.find((x) => x.id === id); if (!c) throw new ApiError('Обращение не найдено', 404);
    c.messages = [...c.messages, { id: `m${Date.now()}`, at: new Date().toISOString(), text, mine: true }];
    items = [...items]; emit();
  },
};
