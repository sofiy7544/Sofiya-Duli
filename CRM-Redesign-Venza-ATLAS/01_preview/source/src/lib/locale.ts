import { useSyncExternalStore } from 'react';

/** Языки интерфейса CRM (next-intl: messages/ru.json и т.д.). */
export const LOCALES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺', intl: 'ru-RU' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦', intl: 'uk-UA' },
  { code: 'en', label: 'English', flag: '🇬🇧', intl: 'en-GB' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', intl: 'fr-FR' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', intl: 'it-IT' },
] as const;
export type LocaleCode = typeof LOCALES[number]['code'];

const KEY = 'crm-locale';
let current: LocaleCode = (() => { try { const v = localStorage.getItem(KEY); return (LOCALES.some((l) => l.code === v) ? v : 'ru') as LocaleCode; } catch { return 'ru'; } })();
const subs = new Set<() => void>();

export function getLocale() { return current; }
export function getIntlLocale() { return LOCALES.find((l) => l.code === current)!.intl; }
export function setLocale(code: LocaleCode) {
  current = code;
  try { localStorage.setItem(KEY, code); } catch { /* ignore */ }
  document.documentElement.lang = code;
  subs.forEach((f) => f());
}
export function useLocale() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, getLocale, getLocale);
}
