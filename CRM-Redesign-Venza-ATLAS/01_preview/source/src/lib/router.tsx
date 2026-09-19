import * as React from 'react';

/**
 * Hash-роутер превью. Пути совпадают с маршрутами реальной CRM (App Router),
 * чтобы экраны переносились в app/(app)/<route>/page.tsx без переименований.
 */
type RouteState = { path: string; depth: number; direction: 'forward' | 'back' | 'none' };
const Ctx = React.createContext<{ route: RouteState; navigate: (to: string, opts?: { replace?: boolean }) => void; back: (fallback?: string) => void } | null>(null);

const readPath = () => (window.location.hash.replace(/^#/, '') || '/login').split('?')[0];

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = React.useState<RouteState>(() => ({ path: readPath(), depth: (history.state?.depth as number) ?? 0, direction: 'none' }));

  React.useEffect(() => {
    if (history.state?.depth === undefined) history.replaceState({ depth: 0 }, '');
    const onPop = () => {
      const depth = (history.state?.depth as number) ?? 0;
      setRoute((r) => ({ path: readPath(), depth, direction: depth < r.depth ? 'back' : 'forward' }));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = React.useCallback((to: string, opts?: { replace?: boolean }) => {
    setRoute((r) => {
      const path = to.split('?')[0];
      if (to === r.path) return r;
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
