import { useSyncExternalStore } from 'react';
/** Глобальные оверлеи — как stores/ui-store.ts в CRM (zustand). */
type S = { search: boolean; quickCreate: null | 'menu' | 'lead' | 'task' | 'capture'; preview: boolean; more: boolean; notifications: boolean; eventForm: boolean;
  /** Задача, которую надо показать в списке: экран сам откроет нужную вкладку и подсветит строку. */
  focusTask: string | null };
let s: S = { search: false, quickCreate: null, preview: false, more: false, notifications: false, eventForm: false, focusTask: null };
const subs = new Set<() => void>();
export const ui = {
  get: () => s,
  set(p: Partial<S>) { s = { ...s, ...p }; subs.forEach((f) => f()); },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};
export function useUI() { return useSyncExternalStore(ui.subscribe, ui.get, ui.get); }
