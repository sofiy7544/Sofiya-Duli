import { getIntlLocale } from './locale';
import { plural as tPlural, tr } from './i18n';

const loc = () => getIntlLocale();
export function money(v: number | undefined, currency = 'EUR', compact = false): string {
  if (v === undefined) return '—';
  if (compact && v >= 1_000_000) return `${(v / 1_000_000).toLocaleString(loc(), { maximumFractionDigits: 2 })} ${tr('млн')} ${cur(currency)}`;
  if (compact && v >= 10_000) return `${Math.round(v / 1000).toLocaleString(loc())} ${tr('тыс.')} ${cur(currency)}`;
  return `${v.toLocaleString(loc())} ${cur(currency)}`;
}
const cur = (c: string) => ({ EUR: '€', CHF: 'CHF', USD: '$' } as Record<string, string>)[c] ?? c;
export const budget = (min?: number, max?: number, c = 'EUR') =>
  min && max ? `${money(min, c, true)} – ${money(max, c, true)}` : max ? tr('до {v}', { v: money(max, c, true) }) : min ? tr('от {v}', { v: money(min, c, true) }) : tr('Бюджет не указан');
export const time = (iso: string) => new Date(iso).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' });
export const dayLong = (d: Date) => d.toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' });
export function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
export function relDay(iso: string): string {
  const d = new Date(iso); const n = new Date();
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(n).setHours(0, 0, 0, 0)) / 86_400_000);
  if (diff === 0) return tr('Сегодня'); if (diff === 1) return tr('Завтра'); if (diff === -1) return tr('Вчера');
  return d.toLocaleDateString(loc(), { day: 'numeric', month: 'short' });
}
export function ago(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return tr('только что'); if (m < 60) return `${m} ${tr('мин назад')}`;
  const h = Math.round(m / 60); if (h < 24) return `${h} ${tr('ч назад')}`;
  const d = Math.round(h / 24); return d === 1 ? tr('вчера') : `${d} ${tr('дн. назад')}`;
}
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
/** Склонение с учётом языка интерфейса: см. lib/i18n.ts. */
export const plural = (n: number, one: string, few: string, many: string) => tPlural(n, one, few, many);
