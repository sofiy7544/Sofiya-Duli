import { useSyncExternalStore } from 'react';
import { ApiError } from './api';
import { store } from './store';

/**
 * /notes. Модель по SCREEN-MAP: список «Заметки / Корзина», закрепление,
 * восстановление, удаление насовсем. Устроено так же, как deals.ts:
 * локальный массив + подписка, чтобы экран жил без бэкенда.
 */
export type Note = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  deletedAt?: string;
  updatedAt: string;
  /** Привязка к карточке: заметка может быть как личной, так и по лиду или клиенту. */
  clientId?: string;
  leadId?: string;
};

const MIN = 60_000;
const back = (ms: number) => new Date(Date.now() - ms).toISOString();

let notes: Note[] = [
  { id: 'n1', title: 'Скрипт первого звонка', pinned: true, updatedAt: back(40 * MIN),
    body: 'Представиться, уточнить задачу и сроки. Спросить про бюджет вилкой, а не точной суммой. Договориться о следующем шаге до конца разговора — иначе лид остывает.' },
  { id: 'n2', title: 'Lacroix — пожелания к показу', pinned: true, updatedAt: back(3 * 60 * MIN), clientId: 'c1', leadId: 'l1',
    body: 'Второй показ с супругой. Важен вид на воду и не выше четвёртого этажа. Готовы ждать сдачу до весны, если будет фиксированная цена.' },
  { id: 'n3', title: 'Комиссия и рассрочка: как объяснять', pinned: false, updatedAt: back(26 * 60 * MIN),
    body: 'Комиссия обсуждается до показа, а не после. Рассрочка от застройщика — отдельная таблица, брать актуальную у Марко.' },
  { id: 'n6', title: 'Крыловы — требования по школе', pinned: false, updatedAt: back(5 * 60 * MIN), clientId: 'c13', leadId: 'l10',
    body: 'Школа в пешей доступности, тихая улица, переезд до сентября. Показывать только Эз и Больё — дальше не поедут.' },
  { id: 'n4', title: 'Чек-лист перед показом', pinned: false, updatedAt: back(3 * 24 * 60 * MIN),
    body: 'Ключи, доступ в паркинг, свет включён, кондиционер за полчаса. Взять распечатку планировки и два стакана воды.' },
  { id: 'n7', title: 'Скрипт для «дорого»', pinned: false, updatedAt: back(7 * 60 * MIN),
    body: 'Не спорить с ценой. Спросить, с чем сравнивают, и показать два объекта: дешевле с недостатком и дороже с явным плюсом. Решение приходит само.' },
  { id: 'n8', title: 'Банки и ипотека для нерезидентов', pinned: false, updatedAt: back(2 * 24 * 60 * MIN),
    body: 'Два банка дают до 60% для нерезидентов, ставка плавающая. Нужен счёт заранее: открытие занимает три недели, это ломает сроки сделки чаще всего.' },
  { id: 'n9', title: 'Осенние показы: что учесть', pinned: false, updatedAt: back(4 * 24 * 60 * MIN),
    body: 'Темнеет в семь — последний показ ставить не позже пяти. В домах с садом смотреть до дождя: после дождя дорожки выглядят хуже, чем есть.' },
  { id: 'n10', title: 'Тарасенко — коммерция', pinned: false, updatedAt: back(9 * 60 * MIN), clientId: 'c10', leadId: 'l9',
    body: 'Смотрит только помещения с действующим арендатором. Просила сразу присылать срок договора и ставку — без этого не открывает подборку.' },
  { id: 'n5', title: 'Старый список объектов', pinned: false, updatedAt: back(9 * 24 * 60 * MIN), deletedAt: back(2 * 24 * 60 * MIN),
    body: 'Неактуально: половина квартир продана, цены выросли.' },
];

const subs = new Set<() => void>(); let v = 0;
const emit = () => { v++; subs.forEach((s) => s()); store.touch(); };
const wait = (ms = store.settings.latencyMs) => new Promise((r) => setTimeout(r, ms));
export function useNotesVersion() { return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => v, () => v); }

async function respond<T>(make: () => T, empty: T): Promise<T> {
  const mode = store.settings.dataMode;
  if (mode === 'loading') return new Promise<T>(() => {});
  await wait();
  if (mode === 'error') throw new ApiError('Не удалось загрузить заметки. Сервер не ответил.', 503);
  if (mode === 'empty') return empty;
  return make();
}

const byRecent = (a: Note, b: Note) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt);

export const notesApi = {
  /** GET /api/notes?trash= */
  list: (trash = false) => respond(() => notes.filter((n) => (trash ? n.deletedAt : !n.deletedAt)).sort(byRecent), [] as Note[]),
  /** POST /api/notes */
  async create() {
    await wait(300);
    const n: Note = { id: `n${Date.now()}`, title: 'Новая заметка', body: '', pinned: false, updatedAt: new Date().toISOString() };
    notes = [n, ...notes]; emit(); return n;
  },
  /** PATCH /api/notes/:id */
  async save(id: string, patch: Partial<Pick<Note, 'title' | 'body' | 'pinned'>>) {
    await wait(200);
    const n = notes.find((x) => x.id === id); if (!n) throw new ApiError('Заметка не найдена', 404);
    Object.assign(n, patch, { updatedAt: new Date().toISOString() }); emit(); return n;
  },
  /** DELETE /api/notes/:id — в корзину, обратимо */
  async trash(id: string) {
    await wait(250);
    const n = notes.find((x) => x.id === id); if (!n) throw new ApiError('Заметка не найдена', 404);
    n.deletedAt = new Date().toISOString(); emit();
  },
  /** POST /api/notes/:id/restore */
  async restore(id: string) {
    await wait(250);
    const n = notes.find((x) => x.id === id); if (!n) throw new ApiError('Заметка не найдена', 404);
    delete n.deletedAt; n.updatedAt = new Date().toISOString(); emit();
  },
  /** DELETE /api/notes/:id?forever=1 — необратимо */
  async destroy(id: string) {
    await wait(250);
    notes = notes.filter((x) => x.id !== id); emit();
  },
};
