import type { Config } from 'tailwindcss';
import { themeExtend } from './tailwind.theme-extend';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      ...themeExtend,
      fontSize: { '3xs': ['0.625rem', '0.875rem'], '2xs': ['0.6875rem', '1rem'] },
      minHeight: { touch: '44px' }, minWidth: { touch: '44px' },
      inset: { 'safe-bottom': 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' },
      padding: { 'mobile-nav': 'max(6.5rem, calc(env(safe-area-inset-bottom) + 5.75rem))' },
    },
  },
} satisfies Config;
