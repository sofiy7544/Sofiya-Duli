import { useSyncExternalStore } from 'react';
import { ApiError } from './api';
import { store } from './store';
import type { UserRole } from './types';

/**
 * Подразделы настроек: автоматизация, шаблоны, пользователи, брендинг.
 * Состав по SCREEN-MAP handoff. Хранилище устроено как deals.ts и notes.ts.
 */
export type Rule = {
  id: string;
  name: string;
  /** Событие → действие: так же, как описано в правилах воронки CRM. */
  when: string;
  then: string;
  enabled: boolean;
};
export type Template = { id: string; name: string; channel: 'EMAIL' | 'TELEGRAM' | 'SMS'; subject?: string; body: string; updatedAt: string };
export type Member = { id: string; fullName: string; email: string; role: UserRole; active: boolean; lastSeenAt?: string };
export type Branding = { agencyName: string; logoName?: string; watermark: boolean; watermarkOpacity: number };

const MIN = 60_000;
const back = (ms: number) => new Date(Date.now() - ms).toISOString();

let rules: Rule[] = [
  { id: 'r1', name: 'Новый лид без ответа', when: 'Лид на этапе «Новые» дольше 2 часов', then: 'Напомнить ответственному и поднять приоритет', enabled: true },
  { id: 'r2', name: 'После показа', when: 'Показ завершён', then: 'Создать задачу «Собрать обратную связь» на следующий день', enabled: true },
  { id: 'r3', name: 'Лид остывает', when: 'Нет контакта 7 дней', then: 'Пометить лид холодным и уведомить руководителя', enabled: false },
];
let templates: Template[] = [
  { id: 't1', name: 'Подтверждение показа', channel: 'TELEGRAM', updatedAt: back(3 * 24 * 60 * MIN),
    body: 'Здравствуйте, {имя}! Подтверждаю показ {объект} — {дата} в {время}. Адрес пришлю за час. Если планы изменятся, напишите.' },
  { id: 't2', name: 'Коммерческое предложение', channel: 'EMAIL', subject: 'Подборка объектов по вашему запросу', updatedAt: back(9 * 24 * 60 * MIN),
    body: 'Добрый день, {имя}!\n\nСобрал подборку под ваш бюджет {бюджет}. Во вложении — планировки и условия рассрочки.\n\nС уважением, {агент}' },
  { id: 't3', name: 'Напоминание о встрече', channel: 'SMS', updatedAt: back(20 * 24 * 60 * MIN),
    body: '{имя}, напоминаю о встрече сегодня в {время}. {агент}, On Top Property.' },
];
let members: Member[] = [
  { id: 'u1', fullName: 'Елена Радович', email: 'elena@ontop.property', role: 'ADMIN', active: true, lastSeenAt: back(8 * MIN) },
  { id: 'u2', fullName: 'Matteo Brunelli', email: 'matteo@ontop.property', role: 'REALTOR', active: true, lastSeenAt: back(2 * 60 * MIN) },
  { id: 'u3', fullName: 'Кирилл Дорош', email: 'kirill@ontop.property', role: 'REALTOR', active: true, lastSeenAt: back(26 * 60 * MIN) },
  { id: 'u4', fullName: 'Ольга Кравец', email: 'olga@ontop.property', role: 'ASSISTANT', active: false, lastSeenAt: back(40 * 24 * 60 * MIN) },
];
let branding: Branding = { agencyName: 'On Top Property', logoName: 'ontop-logo.svg', watermark: true, watermarkOpacity: 35 };

const subs = new Set<() => void>(); let v = 0;
const emit = () => { v++; subs.forEach((s) => s()); };
const wait = (ms = store.settings.latencyMs) => new Promise((r) => setTimeout(r, ms));
export function useAdminVersion() { return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => v, () => v); }

async function respond<T>(make: () => T, empty: T): Promise<T> {
  const mode = store.settings.dataMode;
  if (mode === 'loading') return new Promise<T>(() => {});
  await wait();
  if (mode === 'error') throw new ApiError('Не удалось загрузить настройки. Сервер не ответил.', 503);
  if (mode === 'empty') return empty;
  return make();
}

export const adminApi = {
  rules: () => respond(() => [...rules], [] as Rule[]),
  async toggleRule(id: string) {
    await wait(250);
    const r = rules.find((x) => x.id === id); if (!r) throw new ApiError('Правило не найдено', 404);
    r.enabled = !r.enabled; rules = [...rules]; emit(); return r;
  },
  async createRule(input: Pick<Rule, 'name' | 'when' | 'then'>) {
    await wait(400);
    if (!input.name.trim()) throw new ApiError('Назовите правило', 400);
    rules = [{ id: `r${Date.now()}`, ...input, enabled: true }, ...rules]; emit();
  },
  async deleteRule(id: string) { await wait(300); rules = rules.filter((x) => x.id !== id); emit(); },

  templates: () => respond(() => [...templates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [] as Template[]),
  async saveTemplate(t: Omit<Template, 'updatedAt'>) {
    await wait(350);
    if (!t.name.trim()) throw new ApiError('Назовите шаблон', 400);
    const found = templates.find((x) => x.id === t.id);
    if (found) Object.assign(found, t, { updatedAt: new Date().toISOString() });
    else templates = [{ ...t, updatedAt: new Date().toISOString() }, ...templates];
    templates = [...templates]; emit();
  },
  async deleteTemplate(id: string) { await wait(300); templates = templates.filter((x) => x.id !== id); emit(); },

  members: () => respond(() => [...members], [] as Member[]),
  async setMemberActive(id: string, active: boolean) {
    await wait(300);
    const m = members.find((x) => x.id === id); if (!m) throw new ApiError('Сотрудник не найден', 404);
    m.active = active; members = [...members]; emit();
  },
  async setMemberRole(id: string, role: UserRole) {
    await wait(300);
    const m = members.find((x) => x.id === id); if (!m) throw new ApiError('Сотрудник не найден', 404);
    m.role = role; members = [...members]; emit();
  },
  async inviteMember(input: { fullName: string; email: string; role: UserRole }) {
    await wait(450);
    if (!input.fullName.trim()) throw new ApiError('Укажите имя', 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new ApiError('Проверьте адрес почты', 400);
    if (members.some((m) => m.email.toLowerCase() === input.email.toLowerCase())) throw new ApiError('Такой адрес уже есть в команде', 409);
    members = [...members, { id: `u${Date.now()}`, ...input, active: true }]; emit();
  },

  branding: () => respond(() => ({ ...branding }), branding),
  async saveBranding(patch: Partial<Branding>) {
    await wait(400);
    if (patch.agencyName !== undefined && !patch.agencyName.trim()) throw new ApiError('Название агентства не может быть пустым', 400);
    branding = { ...branding, ...patch }; emit(); return { ...branding };
  },
};
