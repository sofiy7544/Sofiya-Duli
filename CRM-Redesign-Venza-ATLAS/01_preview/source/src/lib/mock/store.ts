import { useSyncExternalStore } from 'react';
import * as fx from './fixtures';
import type { Activity, CalendarEvent, Client, DataMode, Lead, LeadStage, Property, Task, UserRole } from './types';

/**
 * In-memory «база» превью. Мутации меняют только память вкладки.
 * В реальной CRM этого файла нет — вместо него lib/api.ts.
 */
type DB = {
  clients: Client[]; leads: Lead[]; properties: Property[]; tasks: Task[]; events: CalendarEvent[]; activities: Activity[];
};
export type PreviewSettings = { dataMode: DataMode; role: UserRole; integrationsEnabled: boolean; latencyMs: number };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
let db: DB = { clients: clone(fx.clients), leads: clone(fx.leads), properties: clone(fx.properties), tasks: clone(fx.tasks), events: clone(fx.events), activities: clone(fx.activities) };
let settings: PreviewSettings = { dataMode: 'ready', role: 'ADMIN', integrationsEnabled: false, latencyMs: 650 };
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach((l) => l()); };

export const store = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  getVersion: () => version,
  get db() { return db; },
  get settings() { return settings; },
  setSettings(patch: Partial<PreviewSettings>) { settings = { ...settings, ...patch }; emit(); },
  reset() { db = { clients: clone(fx.clients), leads: clone(fx.leads), properties: clone(fx.properties), tasks: clone(fx.tasks), events: clone(fx.events), activities: clone(fx.activities) }; emit(); },
  mutate(fn: (d: DB) => void) { fn(db); emit(); },
  /* Общий сигнал «данные изменились». Свои хранилища (заметки, коммуникации,
     настройки, сделки) дёргают его из своих emit: тогда открытый экран
     перечитывает список, даже если его версию забыли внести в зависимости. */
  touch() { emit(); },
};

/* Только для нагрузочных прогонов: скрипт наполняет «базу» данными за год
   и проверяет, как экраны держат объём. В собранное превью не попадает —
   import.meta.env.DEV в сборке false, и блок вырезается. */
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__crm = { store, users: fx.users };
}

export function useStoreVersion() { return useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion); }
export function usePreviewSettings(): PreviewSettings { useStoreVersion(); return store.settings; }

export const currentUser = () => ({ ...fx.users[0], role: settings.role });
export const users = fx.users;
export const shortName = fx.shortName;
export type { LeadStage };
