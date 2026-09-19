import * as React from 'react';
import { cn } from '@/lib/cn';
import { useRouter } from '@/lib/router';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { Fab } from './page';
import { QuickCreate } from '@/components/overlays/quick-create';
import { SearchOverlay } from '@/components/overlays/search';

/** (app)/layout.tsx: оболочка + глобальные оверлеи, смонтированные один раз. */
export function AppShell({ children, routeKey, fab = true }: { children: React.ReactNode; routeKey: string; fab?: boolean }) {
  const { route } = useRouter();
  const anim = route.direction === 'forward' ? 'page-forward' : route.direction === 'back' ? 'page-back' : 'page-fade';
  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">К содержимому</a>
      <Sidebar />
      <main id="main" className="min-w-0 flex-1 overflow-x-clip">
        <div key={routeKey} className={cn('min-w-0', anim)}>{children}</div>
      </main>
      <MobileNav />
      {fab && <Fab />}
      <QuickCreate />
      <SearchOverlay />
    </div>
  );
}
