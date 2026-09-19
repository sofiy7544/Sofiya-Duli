import { useSyncExternalStore } from 'react';
/** Глобальные оверлеи — как stores/ui-store.ts в CRM (zustand). */
type S = { search: boolean; quickCreate: null | 'menu' | 'lead' | 'task'; preview: boolean; more: boolean };
let s: S = { search: false, quickCreate: null, preview: false, more: false };
const subs = new Set<() => void>();
export const ui = {
  get: () => s,
  set(p: Partial<S>) { s = { ...s, ...p }; subs.forEach((f) => f()); },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};
export function useUI() { return useSyncExternalStore(ui.subscribe, ui.get, ui.get); }
