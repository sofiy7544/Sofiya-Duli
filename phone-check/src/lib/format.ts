import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const numberFmt = new Intl.NumberFormat('ru-RU');
let regionNames: Intl.DisplayNames | undefined;

export const fmtDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : '—');
export const fmtDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : '—');
export const fmtNumber = (n: number) => numberFmt.format(n);
// В браузере — компактные метаданные libphonenumber (только форматирование)
export const fmtPhone = (e164: string | null | undefined) => (e164 ? (parsePhoneNumberFromString(e164)?.formatInternational() ?? e164) : '—');

export function countryName(code: string | null | undefined) {
  if (!code) return '—';
  regionNames ??= new Intl.DisplayNames(['ru'], { type: 'region' });
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function flag(code: string | null | undefined) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}
