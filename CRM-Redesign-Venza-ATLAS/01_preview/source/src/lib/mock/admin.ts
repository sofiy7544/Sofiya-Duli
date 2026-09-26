import { useSyncExternalStore } from 'react';
import { ApiError } from './api';
import { store, users } from './store';
import type { User, UserRole } from './types';

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
/**
 * Сотрудник — тот же пользователь, что и во всей CRM (store.users). Раньше
 * настройки держали свой отдельный список: приглашённый там не появлялся ни в
 * «Команде», ни в ответственных. Теперь список один.
 */
export type Member = User & { active: boolean };
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
let branding: Branding = { agencyName: 'On Top Property', logoName: 'ontop-logo.svg', watermark: true, watermarkOpacity: 35 };

const subs = new Set<() => void>(); let v = 0;
const emit = () => { v++; subs.forEach((s) => s()); store.touch(); };
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

  members: () => respond(() => users.map((u) => ({ ...u, active: u.active !== false })), [] as Member[]),
  async setMemberActive(id: string, active: boolean) {
    await wait(300);
    const m = users.find((x) => x.id === id); if (!m) throw new ApiError('Сотрудник не найден', 404);
    m.active = active; emit();
  },
  async setMemberRole(id: string, role: UserRole) {
    await wait(300);
    const m = users.find((x) => x.id === id); if (!m) throw new ApiError('Сотрудник не найден', 404);
    m.role = role; emit();
  },
  async inviteMember(input: { fullName: string; email: string; role: UserRole }) {
    await wait(450);
    if (!input.fullName.trim()) throw new ApiError('Укажите имя', 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new ApiError('Проверьте адрес почты', 400);
    if (users.some((m) => m.email.toLowerCase() === input.email.toLowerCase())) throw new ApiError('Такой адрес уже есть в команде', 409);
    users.push({ id: `u${Date.now()}`, ...input, active: true }); emit();
  },
  /** PUT /api/users/:id/avatar — в CRM файл уходит в хранилище, сюда приходит ссылка. */
  async setMemberPhoto(id: string, file: File) {
    await wait(400);
    const m = users.find((x) => x.id === id); if (!m) throw new ApiError('Сотрудник не найден', 404);
    if (!file.type.startsWith('image/')) throw new ApiError('Нужен файл с фотографией', 400);
    if (file.size > 10 * 1024 * 1024) throw new ApiError('Фото до 10 МБ', 400);
    if (m.avatarUrl) URL.revokeObjectURL(m.avatarUrl);
    m.avatarUrl = URL.createObjectURL(file); emit();
  },
  async removeMemberPhoto(id: string) {
    await wait(250);
    const m = users.find((x) => x.id === id); if (!m) throw new ApiError('Сотрудник не найден', 404);
    if (m.avatarUrl) URL.revokeObjectURL(m.avatarUrl);
    m.avatarUrl = undefined; emit();
  },
  /**
   * DELETE /api/users/:id. Лиды, задачи, показы и объекты уволенного переходят
   * на администратора: иначе строки остаются с пустым ответственным и теряются
   * из виду. Последнего администратора удалить нельзя.
   */
  async deleteMember(id: string) {
    await wait(450);
    const i = users.findIndex((x) => x.id === id);
    if (i < 0) throw new ApiError('Сотрудник не найден', 404);
    const admins = users.filter((u) => u.role === 'ADMIN');
    if (users[i].role === 'ADMIN' && admins.length < 2) throw new ApiError('Это последний администратор — сначала назначьте другого', 409);
    const heir = users.find((u) => u.id !== id && u.role === 'ADMIN')!.id;
    const moved = { leads: 0, tasks: 0, events: 0, properties: 0 };
    store.mutate((d) => {
      d.leads.forEach((l) => { if (l.assignedUserId === id) { l.assignedUserId = heir; moved.leads++; } });
      d.clients.forEach((c) => { if (c.assignedUserId === id) c.assignedUserId = heir; });
      d.tasks.forEach((t) => { if (t.userId === id) { t.userId = heir; moved.tasks++; } });
      d.events.forEach((e) => { if (e.userId === id) { e.userId = heir; moved.events++; } });
      d.properties.forEach((pr) => { if (pr.ownerUserId === id) { pr.ownerUserId = heir; moved.properties++; } });
      d.activities.forEach((a) => { if (a.userId === id) a.userId = heir; });
    });
    if (users[i].avatarUrl) URL.revokeObjectURL(users[i].avatarUrl!);
    users.splice(i, 1); emit();
    return moved;
  },

  branding: () => respond(() => ({ ...branding }), branding),
  async saveBranding(patch: Partial<Branding>) {
    await wait(400);
    if (patch.agencyName !== undefined && !patch.agencyName.trim()) throw new ApiError('Название агентства не может быть пустым', 400);
    branding = { ...branding, ...patch }; emit(); return { ...branding };
  },
};
