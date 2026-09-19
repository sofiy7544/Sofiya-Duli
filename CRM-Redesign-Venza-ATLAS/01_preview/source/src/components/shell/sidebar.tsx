import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Link, usePathname } from '@/lib/router';
import { MORE_NAV, PRIMARY_NAV, getMoreItems, isItemActive } from '@/lib/navigation/mobile-nav';
import { usePreviewSettings, currentUser } from '@/lib/mock/store';
import { useTheme } from '@/lib/theme/provider';
import { Avatar } from '@/components/ui/avatar';
import { BRAND } from '@/lib/brand';
import { LogoMark } from '@/components/brand/logo';
import { NAV_ICON, NAV_LABEL } from './nav-icons';
import { ui } from './ui-state';

/**
 * Десктопная навигация. Порядок тот же, что на мобиле: 4 основных → остальные → Настройки внизу.
 * ATLAS — тёмный операционный сайдбар; Venza — светлый спокойный rail; classic — surface-card как в CRM.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { family } = useTheme();
  const settings = usePreviewSettings();
  const secondary = getMoreItems({ role: settings.role, integrationsEnabled: settings.integrationsEnabled }).filter((i) => i.key !== 'settings');
  const settingsItem = MORE_NAV.find((i) => i.key === 'settings')!;
  const atlas = family === 'atlas';
  const user = currentUser();

  const item = (it: typeof PRIMARY_NAV[number]) => {
    const Icon = NAV_ICON[it.key]; const active = isItemActive(it, pathname);
    return (
      <Link key={it.key} href={it.href} aria-current={active ? 'page' : undefined}
        className={cn('group relative flex items-center gap-3 rounded-[10px] px-3 font-medium transition-colors duration-tab ease-standard',
          atlas ? 'h-10 text-[14px] text-[var(--at-sidebar-muted)] hover:bg-[var(--at-sidebar-surface)] hover:text-[var(--at-sidebar-text)]' : 'h-11 text-[14.5px] text-muted-foreground hover:bg-surface-2 hover:text-foreground',
          active && (atlas ? '!bg-[var(--at-sidebar-active)] !text-[var(--at-sidebar-text)]' : family === 'venza' ? '!bg-primary-soft !text-primary' : '!bg-primary !text-primary-foreground'))}>
        {active && atlas && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[var(--at-accent,#D0A34A)]" style={{ background: 'hsl(var(--accent))' }} />}
        <Icon className="h-[18px] w-[18px]" aria-hidden />{NAV_LABEL[it.key]}
      </Link>
    );
  };

  return (
    <aside className={cn('sticky top-0 hidden h-dvh shrink-0 flex-col lg:flex', atlas ? 'w-[232px] border-r border-[var(--at-sidebar-border)] bg-[var(--at-sidebar-bg)] px-3 py-4' : family === 'venza' ? 'w-[240px] border-r border-border/70 bg-background px-4 py-6' : 'w-[232px] p-3')}>
      <div className={cn('flex h-full flex-col', family === 'classic' && 'surface px-2.5 py-3')}>
        <div className={cn('mb-5 flex items-center gap-2.5 px-2', atlas && 'mb-4')}>
          <LogoMark className={cn('w-9 shrink-0', atlas ? 'text-[var(--at-sidebar-text)]' : 'text-foreground')} />
          <div className="min-w-0">
            <div className={cn('truncate text-[15px] font-semibold leading-5', atlas ? 'text-[var(--at-sidebar-text)]' : family === 'venza' ? 'font-display text-[19px] tracking-[-0.01em]' : '')}>{BRAND.name}</div>
            <div className={cn('truncate text-[11.5px]', atlas ? 'text-[var(--at-sidebar-muted)]' : 'text-muted-foreground')}>{BRAND.tagline}</div>
          </div>
        </div>

        <button onClick={() => ui.set({ search: true })}
          className={cn('mb-4 flex h-10 items-center gap-2.5 rounded-[10px] px-3 text-[13.5px] transition-colors', atlas ? 'bg-[var(--at-sidebar-surface)] text-[var(--at-sidebar-muted)] hover:text-[var(--at-sidebar-text)]' : 'border border-border bg-surface text-muted-foreground shadow-soft hover:text-foreground')}>
          <Search className="h-4 w-4" aria-hidden /><span className="flex-1 text-left">Поиск</span>
          <kbd className={cn('rounded-md px-1.5 text-[11px] font-medium', atlas ? 'bg-[var(--at-sidebar-bg)]' : 'bg-surface-2')}>⌘K</kbd>
        </button>

        <nav aria-label="Основная навигация" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto no-scrollbar">
          {PRIMARY_NAV.map(item)}
          <div className={cn('mx-3 my-3 h-px', atlas ? 'bg-[var(--at-sidebar-border)]' : 'bg-border/70')} />
          {secondary.map(item)}
          <div className="flex-1" />
          {item(settingsItem)}
        </nav>

        <div className={cn('mt-3 flex items-center gap-2.5 rounded-xl p-2', atlas ? 'bg-[var(--at-sidebar-surface)]' : 'bg-surface-2/70')}>
          <Avatar name={user.fullName} size={34} />
          <div className="min-w-0 flex-1">
            <div className={cn('truncate text-[13.5px] font-medium', atlas && 'text-[var(--at-sidebar-text)]')}>{user.fullName}</div>
            <div className={cn('truncate text-[11.5px]', atlas ? 'text-[var(--at-sidebar-muted)]' : 'text-muted-foreground')}>{user.role === 'ADMIN' ? 'Администратор' : 'Риелтор'}</div>
          </div>
          <button onClick={() => ui.set({ quickCreate: 'menu' })} aria-label="Создать"
            className={cn('grid h-8 w-8 place-items-center rounded-lg', atlas ? 'bg-[hsl(var(--primary))] text-white' : 'bg-primary text-primary-foreground')}><Plus className="h-4 w-4" /></button>
        </div>
      </div>
    </aside>
  );
}
