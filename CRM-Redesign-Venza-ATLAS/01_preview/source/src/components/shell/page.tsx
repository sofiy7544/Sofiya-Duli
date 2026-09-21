import * as React from 'react';
import { ArrowLeft, Bell, Plus, Search, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useRouter } from '@/lib/router';
import { useTheme } from '@/lib/theme/provider';
import { Button, IconButton } from '@/components/ui/button';
import { HeaderBrand } from '@/components/brand/header-brand';
import { useAlertCount } from '@/components/overlays/notifications';
import { ui } from './ui-state';

/** Шапка страницы. Один H1 на страницу (исправляет дубль Topbar+page из CRM). */
export function PageHeader({ title, subtitle, back, actions, large = true, children }: {
  title: string; subtitle?: React.ReactNode; back?: string; actions?: React.ReactNode; large?: boolean; children?: React.ReactNode;
}) {
  const router = useRouter();
  const { family } = useTheme();
  return (
    <header className={cn('safe-top', family === 'atlas' ? 'mb-4 lg:mb-5' : 'mb-5 lg:mb-7')}>
      <div className="flex min-h-[52px] items-center gap-2 pt-2 lg:pt-0">
        {back && <IconButton label="Назад" onClick={() => router.back(back)} variant={family === 'venza' ? 'outline' : 'ghost'} className={cn('-ml-1 rounded-full', family === 'venza' && 'bg-surface')}><ArrowLeft /></IconButton>}
        {/* Знак агентства: на телефоне слева в шапке было пусто. */}
        <HeaderBrand className={back ? 'pl-1.5' : undefined} />
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 lg:hidden">
          {actions}
          <IconButton label="Быстрый захват лида" onClick={() => ui.set({ quickCreate: 'capture' })}
            className="bg-primary text-primary-foreground hover:bg-primary/90"><Zap /></IconButton>
          <IconButton label="Поиск" onClick={() => ui.set({ search: true })}><Search /></IconButton>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          {actions}
          <IconButton label="Быстрый захват лида" onClick={() => ui.set({ quickCreate: 'capture' })}
            className="bg-primary text-primary-foreground hover:bg-primary/90"><Zap /></IconButton>
          <NotificationsButton />
          <Button size="sm" onClick={() => ui.set({ quickCreate: 'menu' })}><Plus />Создать</Button>
        </div>
      </div>
      <div className={cn(back ? 'mt-1' : 'mt-0')}>
        {title ? <h1 className={large ? 't-h1' : 't-h2'}>{title}</h1> : null}
        {subtitle && <div className="t-caption mt-1 text-[14px]">{subtitle}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}

/** Колокольчик с точкой. Точка — только когда есть что показать. */
export function NotificationsButton({ className }: { className?: string }) {
  const alerts = useAlertCount();
  return (
    <IconButton label={alerts ? `Уведомления: ${alerts}` : 'Уведомления'} className={cn('relative', className)} onClick={() => ui.set({ notifications: true })}>
      <Bell />
      {alerts > 0 && <span aria-hidden className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-background" />}
    </IconButton>
  );
}

/** FAB визуально связан с Quick Create: лист «вырастает» из того же угла. */
export function Fab() {
  const { family } = useTheme();
  const { route } = useRouter();
  // Прячется при прокрутке вниз, возвращается при прокрутке вверх — не перекрывает содержимое
  const [hidden, setHidden] = React.useState(false);
  const last = React.useRef(0);
  /* Прячет только живая прокрутка. Страницу двигает и сам интерфейс — переход на экран,
     восстановление позиции при возврате, — и от такого движения кнопка пряталась на
     только что открытом экране и не возвращалась, пока человек не крутанёт вверх. */
  const byHand = React.useRef(false);
  React.useEffect(() => {
    let raf = 0;
    const hand = () => { byHand.current = true; };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = scrollY;
        if (!byHand.current) { last.current = y; return; }
        if (Math.abs(y - last.current) > 6) { setHidden(y > last.current && y > 120); last.current = y; }
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    for (const e of ['wheel', 'touchmove', 'keydown'] as const) addEventListener(e, hand, { passive: true });
    return () => {
      removeEventListener('scroll', onScroll); cancelAnimationFrame(raf);
      for (const e of ['wheel', 'touchmove', 'keydown'] as const) removeEventListener(e, hand);
    };
  }, []);
  // Новый экран — кнопка на месте.
  React.useEffect(() => { byHand.current = false; last.current = scrollY; setHidden(false); }, [route.path]);
  return (
    <button type="button" aria-label="Создать" onClick={() => ui.set({ quickCreate: 'menu' })}
      className={cn('fixed right-4 z-40 grid h-14 w-14 place-items-center bg-primary text-primary-foreground shadow-fab ring-4 ring-background/70 transition-[transform,opacity] duration-sheet ease-emphasized active:scale-90 lg:hidden',
        family === 'atlas' ? 'bottom-[calc(80px+env(safe-area-inset-bottom))] rounded-[18px]' : 'bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+88px)] rounded-full',
        hidden && 'pointer-events-none translate-y-[130%] opacity-0')}>
      <Plus className="h-6 w-6" strokeWidth={2} aria-hidden />
    </button>
  );
}

/** Контейнер страницы: ширина и отступы семьи. */
export function PageBody({ children, wide, className }: { children: React.ReactNode; wide?: boolean; className?: string }) {
  const { family } = useTheme();
  return (
    <div className={cn('mx-auto w-full pb-mobile-nav lg:pb-12',
      family === 'atlas' ? 'px-3.5 lg:px-6 lg:pt-5' : family === 'venza' ? 'px-4 sm:px-5 lg:px-10 lg:pt-8' : 'px-4 lg:px-8 lg:pt-6',
      wide ? 'max-w-[1480px] 2xl:max-w-[1720px]' : family === 'venza' ? 'max-w-[1120px]' : 'max-w-[1280px]', className)}>
      {children}
    </div>
  );
}
