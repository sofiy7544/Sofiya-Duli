'use client';

import * as React from 'react';
import {
  THEME_STORAGE_KEY,
  getDesignFamily,
  normalizeTheme,
  resolveIsDark,
  type DesignFamily,
  type Theme,
} from '@/lib/theme/themes';

type ThemeContextValue = {
  /** Выбор пользователя (хранится как есть, 'system' не подменяется). */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Фактическая палитра для classic: 'light' | 'dark'; для atlas/venza — их имя. */
  resolvedTheme: Exclude<Theme, 'system'>;
  isDark: boolean;
  family: DesignFamily;
  /** false до гидрации: UI, зависящий от темы (галочка в селекторе), рендерить после mounted. */
  mounted: boolean;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function applyTheme(theme: Theme, systemDark: boolean) {
  const root = document.documentElement;
  const isDark = resolveIsDark(theme, systemDark);
  // Глушим transition на время смены токенов, чтобы экран не «переливался» (§25: мгновенно).
  root.classList.add('theme-switching');
  root.classList.toggle('dark', isDark);
  root.dataset.theme = theme;
  root.dataset.family = getDesignFamily(theme);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  // два кадра: стили применились → возвращаем transitions
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
  return isDark;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // null до монтирования: сервер и первый клиентский рендер совпадают,
  // а DOM уже корректно выставлен bootstrap-скриптом — не трогаем его до чтения storage.
  const [stored, setStored] = React.useState<Theme | null>(null);
  const [systemDark, setSystemDark] = React.useState(false);

  React.useEffect(() => {
    setStored(readStoredTheme());
    const mql = window.matchMedia(DARK_QUERY);
    setSystemDark(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  React.useEffect(() => {
    if (stored !== null) applyTheme(stored, systemDark);
  }, [stored, systemDark]);

  // Синхронизация между вкладками.
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) setStored(normalizeTheme(e.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    const value = normalizeTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      /* private mode — тема всё равно применится на сессию */
    }
    setStored(value);
  }, []);

  const theme: Theme = stored ?? 'system';
  const mounted = stored !== null;

  const value = React.useMemo<ThemeContextValue>(() => {
    const isDark = resolveIsDark(theme, systemDark);
    const resolvedTheme = theme === 'system' ? (isDark ? 'dark' : 'light') : theme;
    return { theme, setTheme, resolvedTheme, isDark, family: getDesignFamily(theme), mounted };
  }, [theme, systemDark, setTheme, mounted]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}

/** Удобный хук для компонентов, которым нужна только семья (layout/shell/motion). */
export function useDesignFamily(): DesignFamily {
  return useTheme().family;
}
