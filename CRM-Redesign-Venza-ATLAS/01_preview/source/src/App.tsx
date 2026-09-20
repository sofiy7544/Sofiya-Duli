import * as React from 'react';
import { RouterProvider, matchRoute, useRouter } from '@/lib/router';
import { ThemeProvider } from '@/lib/theme/provider';
import { usePreviewSettings } from '@/lib/mock/store';
import { AppShell } from '@/components/shell/app-shell';
import { Toaster } from '@/components/ui/toast';
import { PreviewPanel } from '@/components/overlays/preview-panel';
import { TodayScreen } from '@/screens/today';
import { ForbiddenScreen, PlaceholderScreen } from '@/screens/placeholder';
import { SCREENS } from '@/screens/registry';
import { FilmLogin } from '@/components/brand/intro';

/** Маршруты = маршруты CRM (app/(app)/*). Легаси-алиасы редиректят так же, как next.config/redirect-страницы. */
const LEGACY: Record<string, string> = { '/': '/today', '/dashboard': '/today', '/pipeline': '/leads', '/pool': '/leads', '/contacts': '/clients', '/inventory': '/properties', '/insights': '/reports', '/qualify': '/inbox' };

function Routes() {
  const { route, navigate } = useRouter();
  const settings = usePreviewSettings();
  const [firstEntry, setFirstEntry] = React.useState(false);
  let path = route.path;

  /* Свой маршрут сильнее легаси-алиаса: /insights ⇒ /reports, но
     /insights/lost-reasons — настоящий экран и редиректить его нельзя. */
  const hasOwnScreen = Object.keys(SCREENS).some((pattern) => matchRoute(pattern, path));
  const legacyTarget = hasOwnScreen ? undefined
    : Object.entries(LEGACY).find(([from]) => path === from || (from !== '/' && path.startsWith(from + '/')));
  React.useEffect(() => { if (legacyTarget) navigate(path.replace(legacyTarget[0], legacyTarget[1]).replace('//', '/'), { replace: true }); });
  if (legacyTarget) return null;

  if (path === '/login') return <FilmLogin onSuccess={() => { setFirstEntry(true); navigate('/today', { replace: true }); }} />;

  let screen: React.ReactNode = null;
  for (const [pattern, render] of Object.entries(SCREENS)) {
    const params = matchRoute(pattern, path);
    if (params) { screen = render(params); break; }
  }
  if (path === '/today') screen = <TodayScreen firstEntry={firstEntry} />;
  if ((path === '/team' || path === '/reports') && settings.role !== 'ADMIN') screen = <ForbiddenScreen />;
  if (!screen) {
    const section = ({ '/deals': 'deals', '/notes': 'notes', '/inbox': 'communications', '/team': 'team', '/reports': 'reports' } as const)[path];
    screen = section ? <PlaceholderScreen section={section} /> : <PlaceholderScreen section="today" />;
  }
  const hasStickyCta = /^\/(leads|properties)\/[^/]+$/.test(path) || path === '/deals/new';
  return <AppShell routeKey={path} fab={!hasStickyCta}>{screen}</AppShell>;
}

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider>
        <Routes />
        <PreviewPanel />
        <Toaster />
      </RouterProvider>
    </ThemeProvider>
  );
}
