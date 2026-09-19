import * as React from 'react';
import { getDesignFamily, normalizeTheme, resolveIsDark, type DesignFamily, type Theme } from './themes';

/** Упрощённый ThemeProvider превью. Тот же контракт, что и в пакете Phase 2 (theme, setTheme, isDark, family). */
const KEY = 'crm-preview-theme';
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; isDark: boolean; family: DesignFamily; reducedMotion: boolean };
const ThemeCtx = React.createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => { try { return normalizeTheme(localStorage.getItem(KEY) ?? 'atlas'); } catch { return 'atlas'; } });
  const [sysDark, setSysDark] = React.useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [reducedMotion, setRM] = React.useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  React.useEffect(() => {
    const a = matchMedia('(prefers-color-scheme: dark)'), b = matchMedia('(prefers-reduced-motion: reduce)');
    const fa = (e: MediaQueryListEvent) => setSysDark(e.matches), fb = (e: MediaQueryListEvent) => setRM(e.matches);
    a.addEventListener('change', fa); b.addEventListener('change', fb);
    return () => { a.removeEventListener('change', fa); b.removeEventListener('change', fb); };
  }, []);

  React.useEffect(() => {
    const r = document.documentElement, dark = resolveIsDark(theme, sysDark);
    r.classList.add('theme-switching');
    r.classList.toggle('dark', dark);
    r.dataset.theme = theme; r.dataset.family = getDesignFamily(theme);
    r.style.colorScheme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', getComputedStyle(r).getPropertyValue('--background') ? `hsl(${getComputedStyle(r).getPropertyValue('--background').trim()})` : '#fff');
    requestAnimationFrame(() => requestAnimationFrame(() => r.classList.remove('theme-switching')));
  }, [theme, sysDark]);

  const setTheme = React.useCallback((t: Theme) => { try { localStorage.setItem(KEY, t); } catch { /* ignore */ } setThemeState(t); }, []);
  const value = React.useMemo(() => ({ theme, setTheme, isDark: resolveIsDark(theme, sysDark), family: getDesignFamily(theme), reducedMotion }), [theme, setTheme, sysDark, reducedMotion]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
export function useTheme() { const c = React.useContext(ThemeCtx); if (!c) throw new Error('useTheme outside provider'); return c; }

export function useMediaQuery(q: string) {
  const [m, setM] = React.useState(() => matchMedia(q).matches);
  React.useEffect(() => { const mql = matchMedia(q); const f = (e: MediaQueryListEvent) => setM(e.matches); mql.addEventListener('change', f); setM(mql.matches); return () => mql.removeEventListener('change', f); }, [q]);
  return m;
}
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
