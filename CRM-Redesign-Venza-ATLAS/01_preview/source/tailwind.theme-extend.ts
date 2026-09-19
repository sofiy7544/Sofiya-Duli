/**
 * Фрагмент для apps/web/tailwind.config.ts (Tailwind 3.4, darkMode: ['class']).
 * НЕ отдельный движок стилей: только маппинг существующих CSS-переменных.
 *
 * Как применить (Claude Code):
 *   import { themeExtend } from './tailwind.theme-extend';
 *   theme: { extend: deepMerge(existingExtend, themeExtend) }
 * Существующие ключи primary-50…700 оставить (логотип), но в Phase 3 заменить их использования на токены.
 */
const c = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export const themeExtend = {
  colors: {
    background: c('background'),
    foreground: c('foreground'),
    surface: { DEFAULT: c('surface'), 2: c('surface-2') },
    'surface-2': c('surface-2'), // чинит bg-surface-2/40 в notes (сейчас не генерируется)
    primary: {
      DEFAULT: c('primary'),
      foreground: c('primary-foreground'),
      soft: c('primary-soft'), // было не смаплено
    },
    accent: { DEFAULT: c('accent'), foreground: c('accent-foreground') },
    muted: { DEFAULT: c('muted'), foreground: c('muted-foreground') },
    border: c('border'),
    input: c('input'),
    ring: c('ring'),
    // Семантика теперь theme-aware (раньше статичные hex, без dark-вариантов)
    // DEFAULT — заливки/точки/иконки; text — текст на surface/background (AA ≥ 4.5)
    success: { DEFAULT: c('success'), text: c('success-text') },
    warning: { DEFAULT: c('warning'), text: c('warning-text') },
    danger: { DEFAULT: c('danger'), text: c('danger-text') },
    info: { DEFAULT: c('info'), text: c('info-text') },
    // Алиасы для классов, которые сейчас в коде НЕ генерируют CSS (DESIGN-HANDOFF §10.1)
    card: { DEFAULT: c('surface'), foreground: c('foreground') }, // bg-card в мобильных карточках лидов
    popover: { DEFAULT: c('surface'), foreground: c('foreground') },
    secondary: { DEFAULT: c('muted'), foreground: c('foreground') },
    destructive: { DEFAULT: c('danger'), foreground: 'hsl(0 0% 100% / <alpha-value>)' }, // text-destructive
    scrim: 'hsl(var(--scrim) / <alpha-value>)',
  },
  fontFamily: {
    sans: ['var(--font-sans)'],
    display: ['var(--font-display)'],
  },
  borderRadius: {
    // Classic-значения совпадают с текущими 14/18/24px → без регрессии.
    xl: 'var(--radius-control)',
    '2xl': 'var(--radius-card)',
    '3xl': 'var(--radius-sheet)',
    control: 'var(--radius-control)',
    card: 'var(--radius-card)',
    modal: 'var(--radius-modal)',
    sheet: 'var(--radius-sheet)',
  },
  boxShadow: {
    soft: 'var(--shadow-soft, 0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.05))',
    card: 'var(--shadow-card)', // одна система теней вместо двух (§10.3)
    lift: 'var(--shadow-lift)',
    fab: 'var(--shadow-fab, var(--shadow-lift))',
  },
  opacity: { 8: '0.08', 12: '0.12', 14: '0.14', 45: '0.45', 55: '0.55', 65: '0.65', 85: '0.85' }, // bg-primary/8 сейчас не генерируется
  spacing: { 4.5: '1.125rem' }, // h-4.5 w-4.5
  transitionDuration: {
    tap: 'var(--motion-tap)',
    tab: 'var(--motion-tab)',
    dropdown: 'var(--motion-dropdown)',
    row: 'var(--motion-row)',
    modal: 'var(--motion-modal)',
    sheet: 'var(--motion-sheet)',
    page: 'var(--motion-page)',
  },
  transitionTimingFunction: {
    standard: 'var(--ease-standard)',
    emphasized: 'var(--ease-emphasized)',
    exit: 'var(--ease-exit)',
  },
  animation: {
    'page-enter': 'crm-page-enter var(--motion-page) var(--ease-emphasized) both',
    'sheet-up': 'crm-sheet-up var(--motion-sheet) var(--ease-emphasized) both',
    'sheet-down': 'crm-sheet-down var(--motion-toast-out) var(--ease-exit) both',
    'scrim-in': 'crm-scrim-in var(--motion-modal) var(--ease-standard) both',
    'pop-in': 'crm-pop-in var(--motion-dropdown) var(--ease-emphasized) both',
  },
};
