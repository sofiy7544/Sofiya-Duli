/**
 * Единая модель тем CRM. Темы меняют ТОЛЬКО presentation layer.
 * Источник истины для: провайдера, селектора, no-flash bootstrap, тостов.
 */
export const THEMES = ['atlas', 'sepia', 'venza'] as const;
export type Theme = (typeof THEMES)[number];
export type DesignFamily = 'classic' | 'atlas' | 'venza';

export const THEME_STORAGE_KEY = 'crm-theme';
export const DEFAULT_THEME: Theme = 'atlas'; // ATLAS — стандартная тема

/** Легаси-пресеты больше не показываются. Сохранённое значение мягко мигрирует. */
export const LEGACY_THEME_MAP: Readonly<Record<string, Theme>> = {
  system: 'atlas', light: 'atlas', dark: 'atlas',
  midnight: 'atlas', graphite: 'atlas', arctic: 'atlas', ocean: 'atlas', lavender: 'atlas', rose: 'atlas',
};

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function normalizeTheme(value: unknown): Theme {
  if (isTheme(value)) return value;
  if (typeof value === 'string' && value in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[value];
  return DEFAULT_THEME;
}

export function getDesignFamily(theme: Theme): DesignFamily {
  if (theme === 'atlas') return 'atlas';
  if (theme === 'venza') return 'venza';
  return 'classic';
}

/** Тёмная тема удалена: ни одна из тем не включает класс `.dark`. */
export function resolveIsDark(_theme: Theme, _systemPrefersDark: boolean): boolean {
  return false;
}

/** Порядок и подписи в селекторе. labelKey — ключ next-intl в неймспейсе `themes`. */
export const THEME_OPTIONS: ReadonlyArray<{
  value: Theme;
  labelKey: Theme;
  /** Мини-превью для свотча: фон / поверхность / акцент. */
  swatch: readonly [string, string, string];
}> = [
  { value: 'atlas', labelKey: 'atlas', swatch: ['#121A24', '#F5F7FA', '#235F91'] },
  { value: 'sepia', labelKey: 'sepia', swatch: ['#F2EDE3', '#F9F6F0', '#A6541D'] },
  { value: 'venza', labelKey: 'venza', swatch: ['#F7F4EC', '#FFFEFB', '#344A39'] },
];

/** Тайминги в мс для JS-анимаций (framer-motion, DnD settle, счётчики). CSS берёт те же значения из переменных. */
export const MOTION = {
  classic: { tap: 100, tab: 160, dropdown: 160, accordion: 200, row: 200, modal: 220, sheet: 280, toastIn: 180, toastOut: 160, skeleton: 1100, page: 200, dndSettle: 180 },
  atlas: { tap: 80, tab: 140, dropdown: 150, accordion: 180, row: 160, modal: 200, sheet: 240, toastIn: 160, toastOut: 140, skeleton: 1000, page: 190, dndSettle: 180 },
  venza: { tap: 100, tab: 180, dropdown: 180, accordion: 240, row: 220, modal: 240, sheet: 300, toastIn: 220, toastOut: 180, skeleton: 1200, page: 280, dndSettle: 320 },
} as const satisfies Record<DesignFamily, Record<string, number>>;

export const EASING = {
  classic: [0.22, 1, 0.36, 1],
  atlas: [0.2, 0, 0, 1],
  venza: [0.16, 1, 0.3, 1],
} as const satisfies Record<DesignFamily, readonly [number, number, number, number]>;
