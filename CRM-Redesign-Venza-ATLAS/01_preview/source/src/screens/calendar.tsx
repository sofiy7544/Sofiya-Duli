import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Lock, MapPin, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { store } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { Link } from '@/lib/router';
import { useIsDesktop, useTheme } from '@/lib/theme/provider';
import { sameDay, time } from '@/lib/format';
import { EVENT_KIND_LABEL } from '@/lib/labels';
import type { CalendarEvent, EventKind } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Button, IconButton } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';

type View = 'month' | 'week' | 'day' | 'agenda';
/** Цвета типов событий — токены семьи; тип всегда подписан текстом. */
const KIND_COLOR: Record<EventKind, string> = { SHOWING: 'var(--primary)', MEETING: 'var(--info)', CALL: 'var(--success)', TASK: 'var(--muted-foreground)', DEADLINE: 'var(--danger)', CONTRACT: 'var(--warning)', PAYMENT: 'var(--accent)' };
const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i); // 08–20
const startOfWeek = (d: Date) => { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export function CalendarScreen() {
  const { family } = useTheme();
  const isDesktop = useIsDesktop();
  const r = useResource(() => api.events());
  const [view, setView] = React.useState<View>(isDesktop ? 'week' : 'agenda');
  const [cursor, setCursor] = React.useState(new Date());
  const [selected, setSelected] = React.useState<CalendarEvent | null>(null);
  const events = r.data ?? [];
  const weekStart = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const on = (d: Date) => events.filter((e) => sameDay(new Date(e.startsAt), d)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const shift = (dir: number) => setCursor((c) => view === 'month' ? new Date(c.getFullYear(), c.getMonth() + dir, 1) : addDays(c, dir * (view === 'day' ? 1 : 7)));
  const title = view === 'month' ? cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : view === 'day' ? cursor.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) : `${days[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;

  const toolbar = (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <IconButton label="Назад" variant="outline" size="iconSm" onClick={() => shift(-1)}><ChevronLeft /></IconButton>
        <IconButton label="Вперёд" variant="outline" size="iconSm" onClick={() => shift(1)}><ChevronRight /></IconButton>
        <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>Сегодня</Button>
      </div>
      <h2 className={cn('min-w-0 flex-1 truncate first-letter:uppercase', family === 'atlas' ? 'text-[16px] font-semibold' : 'font-display text-[19px] font-semibold')}>{title}</h2>
      <SegmentedControl<View> label="Вид календаря" size="sm" value={view} onChange={setView} className="max-sm:w-full"
        options={[{ value: 'month', label: 'Месяц' }, { value: 'week', label: 'Неделя' }, { value: 'day', label: 'День' }, { value: 'agenda', label: 'Список' }]} />
    </div>
  );

  const weekStrip = !isDesktop && view !== 'month' && (
    <div className="-mx-1 mb-4 grid grid-cols-7 gap-1" role="tablist" aria-label="Дни недели">
      {days.map((d) => { const active = sameDay(d, cursor); const today = sameDay(d, new Date()); const has = on(d).length > 0; return (
        <button key={d.toISOString()} role="tab" aria-selected={active} onClick={() => { setCursor(d); if (view === 'week') setView('day'); }}
          className={cn('flex flex-col items-center gap-1 rounded-[14px] py-2 transition-colors duration-tab', active ? 'bg-primary text-primary-foreground' : 'hover:bg-surface-2')}>
          <span className={cn('text-[11px] font-medium uppercase', !active && 'text-muted-foreground')}>{d.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2)}</span>
          <span className={cn('tabular', family === 'venza' ? 'font-display text-[19px] font-semibold' : 'text-[16px] font-semibold', today && !active && 'text-primary')}>{d.getDate()}</span>
          <span aria-hidden className={cn('h-1 w-1 rounded-full', has ? (active ? 'bg-primary-foreground' : 'bg-primary') : 'bg-transparent')} />
        </button>); })}
    </div>
  );

  const body = () => {
    if (r.error) return <ErrorState error={r.error} onRetry={r.retry} what="календарь" />;
    if (r.loading) return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-card" />)}</div>;
    if (!events.length) return <EmptyState icon={CalendarDays} title="Событий нет" text="Показы, встречи и дедлайны сделок появятся здесь." />;

    if (view === 'month') {
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const gridStart = startOfWeek(first);
      return (
        <div className="surface overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border text-center text-[12px] font-medium text-muted-foreground">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => <div key={d} className="py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).map((d, i) => { const list = on(d); const other = d.getMonth() !== cursor.getMonth(); return (
              <button key={i} onClick={() => { setCursor(d); setView(isDesktop ? 'day' : 'agenda'); }} className={cn('min-h-[64px] border-b border-r border-border/60 p-1.5 text-left align-top hover:bg-surface-2/60 lg:min-h-[104px]', other && 'bg-surface-2/40 text-muted-foreground', (i + 1) % 7 === 0 && 'border-r-0')}>
                <span className={cn('grid h-6 w-6 place-items-center rounded-full text-[12.5px] font-medium tabular', sameDay(d, new Date()) && 'bg-primary text-primary-foreground')}>{d.getDate()}</span>
                <span className="mt-1 hidden space-y-0.5 lg:block">{list.slice(0, 2).map((e) => <span key={e.id} className="block truncate rounded px-1 text-[11.5px]" style={{ background: `hsl(${KIND_COLOR[e.kind]} / .14)` }}>{time(e.startsAt)} {e.title}</span>)}{list.length > 2 && <span className="t-micro px-1">ещё {list.length - 2}</span>}</span>
                {list.length > 0 && <span className="mt-1 flex gap-0.5 lg:hidden">{list.slice(0, 3).map((e) => <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${KIND_COLOR[e.kind]})` }} />)}</span>}
              </button>); })}
          </div>
        </div>
      );
    }

    if ((view === 'week' || view === 'day') && isDesktop) {
      const cols = view === 'week' ? days : [cursor];
      return (
        <div data-hscroll className="surface overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid border-b border-border" style={{ gridTemplateColumns: `56px repeat(${cols.length}, minmax(0,1fr))` }}>
              <div />
              {cols.map((d) => <div key={d.toISOString()} className={cn('px-2 py-2.5 text-center', sameDay(d, new Date()) && 'text-primary')}><div className="text-[12px] font-medium uppercase text-muted-foreground">{d.toLocaleDateString('ru-RU', { weekday: 'short' })}</div><div className={cn('tabular', family === 'venza' ? 'font-display text-[20px] font-semibold' : 'text-[17px] font-bold')}>{d.getDate()}</div></div>)}
            </div>
            <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${cols.length}, minmax(0,1fr))` }}>
              <div>{HOURS.map((h) => <div key={h} className="h-14 pr-2 text-right text-[11.5px] text-muted-foreground tabular -translate-y-2">{String(h).padStart(2, '0')}:00</div>)}</div>
              {cols.map((d) => (
                <div key={d.toISOString()} className={cn('relative border-l border-border/60', sameDay(d, new Date()) && 'bg-primary-soft/40')}>
                  {HOURS.map((h) => <div key={h} className="h-14 border-b border-border/50" />)}
                  {sameDay(d, new Date()) && new Date().getHours() >= 8 && new Date().getHours() < 21 && <div aria-hidden className="absolute inset-x-0 z-10 h-px bg-danger" style={{ top: ((new Date().getHours() - 8) * 60 + new Date().getMinutes()) / 60 * 56 }}><span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-danger" /></div>}
                  {on(d).map((e) => { const s = new Date(e.startsAt), en = new Date(e.endsAt); const top = ((s.getHours() - 8) * 60 + s.getMinutes()) / 60 * 56; const h = Math.max(26, (en.getTime() - s.getTime()) / 3_600_000 * 56 - 2); return (
                    <button key={e.id} onClick={() => setSelected(e)} className="absolute inset-x-1 overflow-hidden rounded-[8px] border-l-[3px] px-2 py-1 text-left text-[12px] leading-4 shadow-soft transition-transform duration-tap hover:brightness-[.98] active:scale-[.98]"
                      style={{ top, height: h, background: `hsl(${KIND_COLOR[e.kind]} / .13)`, borderColor: `hsl(${KIND_COLOR[e.kind]})` }}>
                      <span className="block truncate font-semibold">{e.title}</span><span className="block truncate text-foreground/70 tabular">{time(e.startsAt)}</span>
                    </button>); })}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const agendaDays = view === 'day' ? [cursor] : days;
    const withEvents = agendaDays.filter((d) => on(d).length);
    if (!withEvents.length) return <EmptyState icon={CalendarDays} title="В этот период свободно" text="Выберите другой день или неделю." />;
    return (
      <div className="space-y-5">
        {withEvents.map((d) => (
          <section key={d.toISOString()}>
            <h3 className={cn('mb-2 first-letter:uppercase', sameDay(d, new Date()) ? 'text-primary' : '', family === 'atlas' ? 'text-[13px] font-semibold' : 'font-display text-[17px] font-semibold')}>{sameDay(d, new Date()) ? 'Сегодня' : d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            <ul className="surface row-divider overflow-hidden">
              {on(d).map((e) => (
                <li key={e.id}><button onClick={() => setSelected(e)} className="pressable flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="w-12 shrink-0 text-[14px] font-semibold tabular">{time(e.startsAt)}</span>
                  <span aria-hidden className="h-9 w-[3px] rounded-full" style={{ background: `hsl(${KIND_COLOR[e.kind]})` }} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{e.title}</span><span className="t-caption">{EVENT_KIND_LABEL[e.kind]}, до {time(e.endsAt)}</span></span>
                  {e.readOnly && <Lock className="h-4 w-4 text-muted-foreground" aria-label="Только просмотр" />}
                </button></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  };

  return (
    <PageBody wide={family === 'atlas'}>
      <PageHeader title="Календарь" actions={<Button size="sm" variant="soft" className="lg:hidden" onClick={() => toast.message('Новое событие: EventDialog')}><Plus />Событие</Button>} />
      {toolbar}{weekStrip}{body()}
      <EventSheet event={selected} onClose={() => setSelected(null)} />
    </PageBody>
  );
}

/** EventDialog: сделки/дедлайны — только просмотр (readOnly), остальное можно перенести. */
function EventSheet({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  const client = event?.clientId ? store.db.clients.find((c) => c.id === event.clientId) : null;
  const property = event?.propertyId ? store.db.properties.find((p) => p.id === event.propertyId) : null;
  return (
    <Sheet open={!!event} onOpenChange={(o) => !o && onClose()} title={event?.title ?? ''} description={event ? `${EVENT_KIND_LABEL[event.kind]}, ${new Date(event.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${time(event.startsAt)}–${time(event.endsAt)}` : undefined} desktop="side" size="sm"
      footer={event && !event.readOnly ? <><Button variant="outline" className="flex-1" onClick={() => { onClose(); toast.message('Перенос: выберите новое время'); }}>Перенести</Button><Button className="flex-1" onClick={() => { onClose(); toast.success('Отмечено как проведённое'); }}>Проведено</Button></> : undefined}>
      {event && (
        <div className="space-y-3">
          {event.readOnly && <div className="flex items-center gap-2 rounded-control bg-surface-2 px-3.5 py-3 text-[14px] text-muted-foreground"><Lock className="h-4 w-4" aria-hidden />Событие сделки. Изменяется в карточке сделки.</div>}
          {client && <Link href={`/clients/${client.id}`} onClick={onClose} className="pressable surface flex items-center justify-between p-3.5"><span><span className="t-caption block">Клиент</span><span className="font-medium">{client.fullName}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>}
          {property && <Link href={`/properties/${property.id}`} onClick={onClose} className="pressable surface flex items-center justify-between p-3.5"><span><span className="t-caption block">Объект</span><span className="font-medium">{property.title}</span><span className="t-caption flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{property.address}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>}
        </div>
      )}
    </Sheet>
  );
}
