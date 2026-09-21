import * as React from 'react';

/**
 * Hash-роутер превью. Пути совпадают с маршрутами реальной CRM (App Router),
 * чтобы экраны переносились в app/(app)/<route>/page.tsx без переименований.
 */
type RouteState = { path: string; depth: number; direction: 'forward' | 'back' | 'none' };
const Ctx = React.createContext<{ route: RouteState; navigate: (to: string, opts?: { replace?: boolean }) => void; back: (fallback?: string) => void } | null>(null);

const readPath = () => (window.location.hash.replace(/^#/, '') || '/login').split('?')[0];

/**
 * Позиция прокрутки для каждого экрана истории.
 *
 * Списки в CRM длинные (клиентов под полсотни), и при возврате из карточки
 * браузер SPA-страницу не восстанавливает: человек каждый раз оказывался
 * в начале списка и искал, где остановился. Храним позицию по «глубина+путь»
 * и возвращаем её, когда список дорисовался: данные приходят с задержкой,
 * и сразу после рендера страница ещё короткая.
 */
const scrollMemory = new Map<string, number>();
const scrollKey = (depth: number, path: string) => `${depth}:${path}`;
/* Запись идёт внутри updater-а setRoute — только там видна предыдущая запись истории.
   Значение одно и то же при любом числе вызовов, поэтому двойной прогон в StrictMode безопасен. */

function restoreScroll(top: number) {
  if (top <= 0) { window.scrollTo({ top: 0 }); return; }
  /* Список приходит с задержкой мока (~0,65 с) и дорисовывается ещё несколько кадров,
     а каждый такой рендер сбрасывает прокрутку. Поэтому не «поставить один раз»,
     а удерживать позицию, пока она не закрепится — и сразу отпустить, если человек
     начал крутить сам. */
  const deadline = performance.now() + 2500;
  let settled = 0, stop = false;
  const release = () => { stop = true; };
  addEventListener('wheel', release, { once: true, passive: true });
  addEventListener('touchstart', release, { once: true, passive: true });
  const tick = () => {
    if (stop) return done();
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.min(top, Math.max(0, max));
    if (Math.abs(window.scrollY - top) < 2) settled++; else { settled = 0; window.scrollTo({ top: target }); }
    if (settled < 3 && performance.now() < deadline) requestAnimationFrame(tick); else done();
  };
  const done = () => { removeEventListener('wheel', release); removeEventListener('touchstart', release); };
  requestAnimationFrame(tick);
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = React.useState<RouteState>(() => ({ path: readPath(), depth: (history.state?.depth as number) ?? 0, direction: 'none' }));

  React.useEffect(() => {
    if (history.state?.depth === undefined) history.replaceState({ depth: 0 }, '');
    const onPop = () => {
      const depth = (history.state?.depth as number) ?? 0;
      const path = readPath();
      setRoute((r) => { scrollMemory.set(scrollKey(r.depth, r.path), window.scrollY); return { path, depth, direction: depth < r.depth ? 'back' : 'forward' }; });
      restoreScroll(scrollMemory.get(scrollKey(depth, path)) ?? 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = React.useCallback((to: string, opts?: { replace?: boolean }) => {
    setRoute((r) => {
      const path = to.split('?')[0];
      if (to === r.path) return r;
      scrollMemory.set(scrollKey(r.depth, r.path), window.scrollY);
      const depth = opts?.replace ? r.depth : r.depth + 1;
      if (opts?.replace) history.replaceState({ depth }, '', `#${to}`); else history.pushState({ depth }, '', `#${to}`);
      return { path, depth, direction: opts?.replace ? 'none' : isDeeper(r.path, path) ? 'forward' : 'none' };
    });
    window.scrollTo({ top: 0 });
  }, []);

  const back = React.useCallback((fallback = '/today') => {
    if (((history.state?.depth as number) ?? 0) > 0) history.back();
    else { history.replaceState({ depth: 0 }, '', `#${fallback}`); setRoute({ path: fallback, depth: 0, direction: 'back' }); }
  }, []);

  return <Ctx.Provider value={{ route, navigate, back }}>{children}</Ctx.Provider>;
}

/** Переход «вглубь» (список → карточка) анимируется push-ом; между разделами — мягкий crossfade. */
function isDeeper(from: string, to: string) { return to.split('/').length > from.split('/').length && to.startsWith('/' + from.split('/')[1]); }

export function useRouter() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error('useRouter outside RouterProvider');
  return c;
}

export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/'), s = path.split('/');
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

/** <Link> с тем же API, что next/link (href), чтобы разметка экранов переносилась без изменений. */
export const Link = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
  function Link({ href, onClick, ...rest }, ref) {
    const { navigate } = useRouter();
    return (
      <a
        ref={ref}
        href={`#${href}`}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.button !== 0) return;
          e.preventDefault();
          navigate(href);
        }}
        {...rest}
      />
    );
  },
);

export function usePathname() { return useRouter().route.path; }
