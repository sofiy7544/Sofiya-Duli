import { Bell, ChevronRight, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Link, usePathname } from '@/lib/router';
import { PRIMARY_NAV, getActiveSlot, getMoreItems, isItemActive } from '@/lib/navigation/mobile-nav';
import { usePreviewSettings } from '@/lib/mock/store';
import { Sheet } from '@/components/ui/sheet';
import { NAV_ICON, NAV_LABEL } from './nav-icons';
import { ui, useUI } from './ui-state';
import { tr } from '@/lib/i18n';

/** Нижняя навигация — одинаковые 5 пунктов во всех темах; стили .crm-bottom-nav в themes.css. */
export function MobileNav() {
  const pathname = usePathname();
  const settings = usePreviewSettings();
  const { more } = useUI();
  const active = getActiveSlot(pathname);
  const moreItems = getMoreItems({ role: settings.role, integrationsEnabled: settings.integrationsEnabled });

  return (
    <>
      <nav aria-label={tr('Основная навигация')} className="crm-bottom-nav fixed inset-x-3 bottom-safe-bottom z-50 lg:hidden">
        <ul className="grid grid-cols-5">
          {PRIMARY_NAV.map((it) => {
            const Icon = NAV_ICON[it.key]; const on = active === it.key;
            return (
              <li key={it.key}>
                <Link href={it.href} aria-current={on ? 'page' : undefined} data-active={on || undefined} className="crm-bottom-nav__item">
                  <span className="crm-bottom-nav__icon"><Icon className="h-5 w-5" aria-hidden /></span>
                  <span className="crm-bottom-nav__label">{NAV_LABEL[it.key]}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => ui.set({ more: true })} aria-haspopup="dialog" data-active={active === 'more' || more || undefined} aria-current={active === 'more' ? 'page' : undefined} className="crm-bottom-nav__item">
              <span className="crm-bottom-nav__icon"><LayoutGrid className="h-5 w-5" aria-hidden /></span>
              <span className="crm-bottom-nav__label">{tr('Ещё')}</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={more} onOpenChange={(o) => ui.set({ more: o })} title={tr('Ещё')}>
        <ul className="-mx-2">
          {/* Колокольчик на телефоне был только на «Сегодня» — на остальных
              экранах уведомления были недоступны. В шапке для него нет места
              (там уже до четырёх кнопок), поэтому он здесь, первой строкой. */}
          <li>
            <button type="button" onClick={() => ui.set({ more: false, notifications: true })}
              className="pressable flex min-h-[56px] w-full items-center gap-3.5 rounded-control px-2.5 text-left">
              <span className="relative grid h-10 w-10 place-items-center rounded-[12px] bg-surface-2 text-foreground">
                <Bell className="h-[19px] w-[19px]" aria-hidden />
                <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
              </span>
              <span className="flex-1 text-[16px] font-medium">{tr('Уведомления')}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </button>
          </li>
          {moreItems.map((it) => {
            const Icon = NAV_ICON[it.key]; const on = isItemActive(it, pathname);
            return (
              <li key={it.key}>
                <Link href={it.href} onClick={() => ui.set({ more: false })} aria-current={on ? 'page' : undefined}
                  className={cn('pressable flex min-h-[56px] items-center gap-3.5 rounded-control px-2.5', on && 'bg-primary-soft')}>
                  <span className={cn('grid h-10 w-10 place-items-center rounded-[12px]', on ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-foreground')}><Icon className="h-[19px] w-[19px]" aria-hidden /></span>
                  <span className="flex-1 text-[16px] font-medium">{NAV_LABEL[it.key]}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
        {!settings.integrationsEnabled && <p className="t-caption mt-3 px-1">{tr('Коммуникации появятся, когда администратор подключит мессенджеры.')}</p>}
      </Sheet>
    </>
  );
}
