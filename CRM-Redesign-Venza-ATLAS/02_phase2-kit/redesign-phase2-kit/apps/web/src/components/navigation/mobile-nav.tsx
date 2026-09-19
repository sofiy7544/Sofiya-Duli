'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import {
  BarChart3, Building2, CalendarDays, CheckSquare, ChevronRight, Handshake, LayoutGrid,
  MessagesSquare, Settings, StickyNote, Sun, User, Users, Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  INTEGRATIONS_ENABLED, PRIMARY_NAV, getActiveSlot, getMoreItems, isItemActive,
  type NavIconKey, type UserRole,
} from '@/lib/navigation/mobile-nav';

const ICON: Record<NavIconKey, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  today: Sun, leads: Workflow, properties: Building2, tasks: CheckSquare, more: LayoutGrid,
  clients: User, deals: Handshake, calendar: CalendarDays, notes: StickyNote,
  communications: MessagesSquare, team: Users, reports: BarChart3, settings: Settings,
};

/**
 * Нижняя навигация < md. Одинаковые 5 пунктов во всех темах.
 * Оформление — через data-family на <html> (см. themes.css / nav-стили Phase 4).
 * role передаётся из текущего auth-store проекта: <MobileNav role={user?.role} />.
 */
export function MobileNav({ role }: { role: UserRole | null | undefined }) {
  const t = useTranslations('mobileNav');
  const pathname = usePathname() ?? '';
  const [moreOpen, setMoreOpen] = React.useState(false);
  const active = getActiveSlot(pathname);
  const moreItems = getMoreItems({ role, integrationsEnabled: INTEGRATIONS_ENABLED });

  // Закрываем «Ещё» при переходе.
  React.useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
      <nav
        aria-label={t('label')}
        className="crm-bottom-nav fixed inset-x-3 bottom-safe-bottom z-50 md:hidden"
      >
        <ul className="grid grid-cols-5">
          {PRIMARY_NAV.map((item) => {
            const Icon = ICON[item.key];
            const isActive = active === item.key;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  data-active={isActive || undefined}
                  className="crm-bottom-nav__item"
                >
                  <span className="crm-bottom-nav__icon"><Icon className="h-5 w-5" /></span>
                  <span className="crm-bottom-nav__label">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <Dialog.Trigger asChild>
              <button
                type="button"
                data-active={active === 'more' || moreOpen || undefined}
                aria-current={active === 'more' ? 'page' : undefined}
                className="crm-bottom-nav__item"
              >
                <span className="crm-bottom-nav__icon"><LayoutGrid className="h-5 w-5" /></span>
                <span className="crm-bottom-nav__label">{t('more')}</span>
              </button>
            </Dialog.Trigger>
          </li>
        </ul>
      </nav>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/[var(--scrim-opacity)] data-[state=open]:animate-scrim-in md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-sheet bg-surface shadow-lift md:hidden',
            'pb-[max(1rem,env(safe-area-inset-bottom))] data-[state=open]:animate-sheet-up data-[state=closed]:animate-sheet-down',
          )}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 rounded-full bg-border" />
          <Dialog.Title className="px-5 pb-2 pt-4 text-lg font-semibold font-display">{t('more')}</Dialog.Title>
          <ul className="px-3">
            {moreItems.map((item) => {
              const Icon = ICON[item.key];
              const isActive = isItemActive(item, pathname);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex min-h-touch items-center gap-3 rounded-control px-3 py-3 text-base',
                      'transition-colors duration-tap ease-standard hover:bg-muted active:bg-muted',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive && 'bg-primary-soft font-medium text-foreground',
                    )}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-surface-2 text-muted-foreground">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="flex-1">{t(item.key)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
