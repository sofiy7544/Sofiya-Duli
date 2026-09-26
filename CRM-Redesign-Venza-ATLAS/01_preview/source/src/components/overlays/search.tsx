import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, Building2, CalendarDays, CheckSquare, Search as SearchIcon, Sun, User, Workflow, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { useRouter } from '@/lib/router';
import { useIsDesktop } from '@/lib/theme/provider';
import { Avatar } from '@/components/ui/avatar';
import { money } from '@/lib/format';
import { PropertyMedia } from '@/components/domain/property-media';
import { ui, useUI } from '@/components/shell/ui-state';
import { STAGE_LABEL } from '@/lib/labels';
import { store } from '@/lib/mock/store';
import type { Client, Lead, Property } from '@/lib/mock/types';
import { tr } from '@/lib/i18n';

/**
 * Поиск: ⌘K/Ctrl+K. Мобайл — полноэкранный; десктоп — командная палитра с клавиатурой.
 * Поиск от 2 символов, debounce 250 мс — как CommandPalette в CRM.
 */
export function SearchOverlay() {
  const { search } = useUI();
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const [term, setTerm] = React.useState('');
  const [res, setRes] = React.useState<{ clients: Client[]; leads: Lead[]; properties: Property[] } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.set({ search: !ui.get().search }); } };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, []);
  React.useEffect(() => { if (!search) { setTerm(''); setRes(null); setCursor(0); } }, [search]);
  React.useEffect(() => {
    if (term.trim().length < 2) { setRes(null); return; }
    setBusy(true);
    const t = setTimeout(() => api.search(term).then((r) => { setRes(r); setBusy(false); setCursor(0); }), 250);
    return () => clearTimeout(t);
  }, [term]);

  const go = (href: string) => { ui.set({ search: false }); router.navigate(href); };
  const nav = [
    { href: '/today', label: tr('Сегодня'), icon: Sun }, { href: '/leads', label: tr('Лиды'), icon: Workflow }, { href: '/properties', label: tr('Объекты'), icon: Building2 },
    { href: '/tasks', label: tr('Задачи'), icon: CheckSquare }, { href: '/clients', label: tr('Клиенты'), icon: User }, { href: '/calendar', label: tr('Календарь'), icon: CalendarDays },
  ];
  const flat: string[] = res
    ? [...res.leads.map((l) => `/leads/${l.id}`), ...res.clients.map((c) => `/clients/${c.id}`), ...res.properties.map((p) => `/properties/${p.id}`)]
    : nav.map((n) => n.href);
  const clientName = (id: string) => store.db.clients.find((c) => c.id === id)?.fullName ?? tr('Клиент');

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(flat.length - 1, c + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    if (e.key === 'Enter' && flat[cursor]) { e.preventDefault(); go(flat[cursor]); }
  };
  let idx = -1;
  const rowCls = (i: number) => cn('flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left transition-colors duration-tap', i === cursor ? 'bg-surface-2' : 'hover:bg-surface-2/70');

  return (
    <Dialog.Root open={search} onOpenChange={(o) => ui.set({ search: o })}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-scrim/[var(--scrim-opacity)] data-[state=open]:animate-scrim-in max-lg:hidden" />
        <Dialog.Content onKeyDown={onKeyDown} aria-describedby={undefined}
          className={cn('fixed z-[71] flex flex-col bg-surface outline-none', isDesktop
            ? 'left-1/2 top-[12vh] max-h-[70vh] w-[640px] -translate-x-1/2 overflow-hidden rounded-modal border border-border shadow-lift data-[state=open]:animate-pop-in'
            : 'inset-0 bg-background data-[state=open]:animate-[page-fade_var(--motion-modal)_var(--ease-standard)_both]')}>
          <Dialog.Title className="sr-only">{tr('Поиск')}</Dialog.Title>
          <div className={cn('flex items-center gap-2', isDesktop ? 'border-b border-border px-4' : 'safe-top px-3 pt-2')}>
            {!isDesktop && <Dialog.Close className="grid h-11 w-11 place-items-center rounded-full" aria-label={tr('Закрыть')}><ArrowLeft className="h-5 w-5" /></Dialog.Close>}
            <div className={cn('flex flex-1 items-center gap-2.5', !isDesktop && 'h-12 rounded-control border border-border bg-surface px-3.5 shadow-soft')}>
              <SearchIcon className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
              <input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder={tr('Имя, телефон, почта или объект')}
                className={cn('min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground', isDesktop ? 'h-14 text-[16px]' : 'h-full text-[16px]')} aria-label={tr('Поиск по CRM')} />
              {term && <button onClick={() => setTerm('')} aria-label={tr('Очистить')} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>}
              {isDesktop && <kbd className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted-foreground">Esc</kbd>}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 pb-8" role="listbox" aria-label={tr('Результаты')}>
            {!res && !busy && (<>
              <div className="t-micro px-3 pb-1.5 pt-3">{tr('Перейти')}</div>
              {nav.map((n) => { idx++; const i = idx; return (
                <button key={n.href} role="option" aria-selected={i === cursor} onMouseEnter={() => setCursor(i)} onClick={() => go(n.href)} className={rowCls(i)}>
                  <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-surface-2 text-muted-foreground"><n.icon className="h-[18px] w-[18px]" aria-hidden /></span>
                  <span className="text-[15px] font-medium">{n.label}</span>
                </button>); })}
              <p className="t-caption px-3 pt-4">{tr('Введите от 2 символов. Попробуйте «Крыловы», «вилла» или «Ницца».')}</p>
            </>)}
            {busy && <div className="space-y-2 p-3" aria-label={tr('Ищем')}>{[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3"><div className="skeleton h-9 w-9 rounded-full" /><div className="skeleton h-3.5 flex-1" /></div>)}</div>}
            {res && !busy && res.leads.length + res.clients.length + res.properties.length === 0 && (
              <div className="px-4 py-10 text-center"><p className="t-h3">{tr('Ничего не найдено')}</p><p className="t-caption mt-1">{tr('Проверьте написание или ищите по номеру телефона.')}</p></div>)}
            {res && !busy && res.leads.length > 0 && (<>
              <div className="t-micro px-3 pb-1.5 pt-3">{tr('Лиды в работе')}</div>
              {res.leads.map((l) => { idx++; const i = idx; return (
                <button key={l.id} role="option" aria-selected={i === cursor} onMouseEnter={() => setCursor(i)} onClick={() => go(`/leads/${l.id}`)} className={rowCls(i)}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary-text"><Workflow className="h-[18px] w-[18px]" aria-hidden /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{clientName(l.clientId)}</span><span className="t-caption">{STAGE_LABEL[l.stage]}</span></span>
                </button>); })}
            </>)}
            {res && !busy && res.clients.length > 0 && (<>
              <div className="t-micro px-3 pb-1.5 pt-3">{tr('Клиенты')}</div>
              {res.clients.map((c) => { idx++; const i = idx; return (
                <button key={c.id} role="option" aria-selected={i === cursor} onMouseEnter={() => setCursor(i)} onClick={() => go(`/clients/${c.id}`)} className={rowCls(i)}>
                  <Avatar name={c.fullName} size={36} /><span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{c.fullName}</span><span className="t-caption tabular">{c.primaryPhone}</span></span>
                </button>); })}
            </>)}
            {res && !busy && res.properties.length > 0 && (<>
              <div className="t-micro px-3 pb-1.5 pt-3">{tr('Объекты')}</div>
              {res.properties.map((p) => { idx++; const i = idx; return (
                <button key={p.id} role="option" aria-selected={i === cursor} onMouseEnter={() => setCursor(i)} onClick={() => go(`/properties/${p.id}`)} className={rowCls(i)}>
                  <PropertyMedia art={p.photos[0]?.art ?? 0} aspect="1/1" className="w-11 shrink-0 !rounded-[10px]" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{p.title}</span><span className="t-caption">{p.district}</span></span>
                  <span className="tabular text-[14px] font-semibold">{money(p.price, p.currency, true)}</span>
                </button>); })}
            </>)}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
