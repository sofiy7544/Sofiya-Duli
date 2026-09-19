import * as React from 'react';
import { AlertTriangle, ArrowUpRight, Bell, CalendarDays, CheckSquare, ChevronRight, Eye, Handshake, Phone, Sparkles, Users, Workflow, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { store } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { Link } from '@/lib/router';
import { useTheme } from '@/lib/theme/provider';
import { ago, budget, dayLong, money, plural, time } from '@/lib/format';
import { EVENT_KIND_LABEL, STAGES_ACTIVE, STAGE_LABEL, TASK_TYPE_LABEL } from '@/lib/labels';
import type { CalendarEvent, Task } from '@/lib/mock/types';
import { PageBody } from '@/components/shell/page';
import { dealsApi } from '@/lib/mock/deals';
import { ui } from '@/components/shell/ui-state';
import { Avatar } from '@/components/ui/avatar';
import { Button, IconButton } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { TaskCheck } from '@/components/ui/toggle';
import { StatusBadge, STAGE_DOT } from '@/components/ui/badge';
import { BriefingCard } from '@/components/today/briefing';
import { toast } from '@/components/ui/toast';

/**
 * /today. Данные = /api/reports/* (dashboard, today-tasks, upcoming-showings, recent-activity).
 * Погода не показывается: реального источника нет. Тон шапки Venza — от реального времени суток.
 */
function daypart(h: number) {
  if (h < 5) return { greet: 'Доброй ночи', tone: ['#DCE0E4', '#F1EDE3'] };
  if (h < 12) return { greet: 'Доброе утро', tone: ['#F4E6CC', '#F7F4EC'] };
  if (h < 18) return { greet: 'Добрый день', tone: ['#E6EDE4', '#F7F4EC'] };
  return { greet: 'Добрый вечер', tone: ['#EAD9C6', '#F1EDE3'] };
}

type AgendaItem = { id: string; at: string; title: string; meta: string; kind: 'event' | 'task'; task?: Task; event?: CalendarEvent; overdue?: boolean };

export function TodayScreen({ firstEntry }: { firstEntry?: boolean }) {
  const { family } = useTheme();
  const r = useResource(() => api.today());
  const [busyTask, setBusyTask] = React.useState<string | null>(null);
  const clients = store.db.clients;
  const nameOf = (id?: string) => clients.find((c) => c.id === id)?.fullName ?? '';
  const first = store.settings.role ? 'Анна' : '';
  const now = new Date();
  const part = daypart(now.getHours());

  const toggle = async (t: Task) => {
    setBusyTask(t.id);
    const { done } = await api.toggleTask(t.id);
    setBusyTask(null);
    if (done) toast.success('Задача выполнена', { action: { label: 'Вернуть', onClick: () => api.toggleTask(t.id) } });
  };

  const d = r.data;
  const revenue = useResource(() => dealsApi.list());
  const completed = revenue.data?.filter((x) => x.status === 'COMPLETED') ?? [];
  const revenueStrip = completed.length > 0 && (
    <Link href="/deals" className="pressable surface mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
      <span className="flex items-center gap-2 text-[14px] font-medium"><Handshake className="h-4 w-4 text-primary" aria-hidden />Выручка</span>
      <span><span className="t-caption mr-1.5">Сделок закрыто</span><b className="tabular">{completed.length}</b></span>
      <span><span className="t-caption mr-1.5">Объём</span><b className="tabular">{money(completed.reduce((a, x) => a + x.amount, 0), 'EUR', true)}</b></span>
      <span><span className="t-caption mr-1.5">Комиссия получена</span><b className="tabular">{money(completed.reduce((a, x) => a + dealsApi.paid(x), 0), 'EUR', true)}</b></span>
    </Link>
  );
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const overdue = d?.tasks.filter((t) => !t.completedAt && new Date(t.dueAt) < startOfDay) ?? [];
  const todayTasks = d?.tasks.filter((t) => new Date(t.dueAt) >= startOfDay) ?? [];
  const showings = d?.events.filter((e) => e.kind === 'SHOWING') ?? [];
  const agenda: AgendaItem[] = d ? [
    ...d.events.map((e) => ({ id: e.id, at: e.startsAt, title: e.title, meta: [EVENT_KIND_LABEL[e.kind], nameOf(e.clientId)].filter(Boolean).join(', '), kind: 'event' as const, event: e })),
    ...todayTasks.filter((t) => t.type !== 'SHOWING').map((t) => ({ id: t.id, at: t.dueAt, title: t.title, meta: [TASK_TYPE_LABEL[t.type], nameOf(t.clientId)].filter(Boolean).join(', '), kind: 'task' as const, task: t })),
  ].sort((a, b) => a.at.localeCompare(b.at)) : [];
  const nextIdx = agenda.findIndex((a) => new Date(a.at) > now);

  if (r.error) return <PageBody><TitleBlock family={family} part={part} name={first} now={now} /><ErrorState error={r.error} onRetry={r.retry} what="сводку дня" /></PageBody>;

  /* ------------------------------ ATLAS ------------------------------ */
  if (family === 'atlas') {
    const byStage = STAGES_ACTIVE.map((s) => ({ s, items: d?.activeLeads.filter((l) => l.stage === s) ?? [] }));
    const pipelineBudget = d?.activeLeads.reduce((sum, l) => sum + (l.budgetMax ?? 0), 0) ?? 0;
    return (
      <PageBody wide>
        <TitleBlock family={family} part={part} name={first} now={now} />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          <Kpi loading={r.loading} icon={Users} label="Новые лиды" value={d?.newLeads.length} sub="ждут первого контакта" href="/leads" />
          <Kpi loading={r.loading} icon={CheckSquare} label="Задачи сегодня" value={todayTasks.filter((t) => !t.completedAt).length} sub={overdue.length ? `${overdue.length} ${plural(overdue.length, 'просрочена', 'просрочены', 'просрочено')}` : 'без просрочек'} subTone={overdue.length ? 'danger' : undefined} href="/tasks" />
          <Kpi loading={r.loading} icon={Eye} label="Показы" value={showings.length} sub="запланировано на сегодня" href="/calendar" />
          <Kpi loading={r.loading} icon={Workflow} label="Лиды в работе" value={d?.activeLeads.length} sub="во всех этапах" href="/leads" />
          <Kpi loading={r.loading} icon={Handshake} label="Бюджеты в работе" value={d ? money(pipelineBudget, 'EUR', true) : undefined} sub="сумма «до» активных лидов" href="/leads" className="col-span-2 sm:col-span-1" />
        </div>
        {revenueStrip}
        <BriefingCard loading={r.loading} tasks={todayTasks} events={d?.events ?? []} leads={d?.activeLeads ?? []} />

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <section className="surface p-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="t-h2">Воронка</h2><Link href="/leads" className="tap-link text-[13px] font-medium text-primary hover:underline">Открыть канбан</Link></div>
              {r.loading ? <Skeleton className="h-24 w-full" /> : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {byStage.map(({ s, items }) => (
                    <Link key={s} href="/leads" className="pressable rounded-[10px] border border-border/70 p-3" style={{ background: `var(--at-stage-${s === 'NEGOTIATION' ? 'negotiation' : s.toLowerCase()})` }}>
                      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: STAGE_DOT[s] }} />{STAGE_LABEL[s]}</div>
                      <div className="mt-1.5 text-[24px] font-bold leading-7 tabular tracking-[-0.03em]">{items.length}</div>
                      <div className="t-micro mt-0.5 truncate">{items.length ? money(items.reduce((a, l) => a + (l.budgetMax ?? 0), 0), 'EUR', true) : 'нет лидов'}</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section className="surface overflow-hidden">
              <div className="flex items-center justify-between px-4 pb-2 pt-4"><h2 className="t-h2">Последние действия</h2></div>
              {r.loading ? <div className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}</div> : !d?.activity.length ? <p className="t-caption px-4 pb-5">Сегодня ещё ничего не происходило.</p> : (
                <table className="w-full text-[14px]">
                  <caption className="sr-only">Последние действия</caption>
                  <tbody>{d.activity.map((a) => (
                    <tr key={a.id} className="border-t border-border/70">
                      <td className="w-12 py-2.5 pl-4 pr-3"><Avatar name={nameOf(a.clientId) || 'CRM'} size={28} /></td>
                      <td className="py-2.5 pr-3"><Link href={a.clientId ? `/clients/${a.clientId}` : '/today'} className="tap-link font-medium hover:underline">{nameOf(a.clientId)}</Link><div className="t-caption line-clamp-1">{a.text}</div></td>
                      <td className="whitespace-nowrap py-2.5 pr-4 text-right t-caption tabular">{ago(a.at)}</td>
                    </tr>))}</tbody>
                </table>
              )}
            </section>
          </div>
          <div className="space-y-4">
            <section className="surface">
              <div className="flex items-center justify-between px-4 pb-1 pt-4"><h2 className="t-h2">Расписание</h2><Link href="/calendar" className="tap-link text-[13px] font-medium text-primary hover:underline">Календарь</Link></div>
              <AgendaList loading={r.loading} items={agenda} compact nextIdx={nextIdx} busyTask={busyTask} onToggle={toggle} />
            </section>
            <UrgentBlock overdue={overdue} nameOf={nameOf} compact />
          </div>
        </div>
      </PageBody>
    );
  }

  /* --------------------------- VENZA / classic --------------------------- */
  return (
    <>
      {family === 'venza' && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[320px] lg:left-[240px]" style={{ background: `linear-gradient(180deg, ${part.tone[0]}, ${part.tone[1]} 85%, transparent)` }} />}
      <PageBody className="relative">
        <div className={cn(firstEntry && 'stagger')}>
          <TitleBlock family={family} part={part} name={first} now={now} />

          <div className="grid grid-cols-3 gap-2.5 lg:max-w-[720px] lg:gap-3">
            <VzKpi loading={r.loading} label="Задачи" value={todayTasks.filter((t) => !t.completedAt).length} note={overdue.length ? `+${overdue.length} просроч.` : 'на сегодня'} warn={overdue.length > 0} href="/tasks" />
            <VzKpi loading={r.loading} label="Показы" value={showings.length} note={showings[0] ? `с ${time(showings[0].startsAt)}` : 'нет'} href="/calendar" />
            <VzKpi loading={r.loading} label="Новые лиды" value={d?.newLeads.length} note="ждут звонка" href="/leads" />
          </div>
          <div className="lg:max-w-[720px]">{revenueStrip}</div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            <div className="min-w-0 space-y-6">
              <UrgentBlock overdue={overdue} nameOf={nameOf} />
              <section>
                <div className="mb-3 flex items-baseline justify-between"><h2 className="t-h2">Повестка дня</h2><Link href="/calendar" className="tap-link text-[14px] font-medium text-primary">Календарь</Link></div>
                <div className="surface overflow-hidden"><AgendaList loading={r.loading} items={agenda} nextIdx={nextIdx} busyTask={busyTask} onToggle={toggle} /></div>
              </section>
            </div>
            <div className="space-y-6">
              <section>
                <div className="mb-3 flex items-baseline justify-between"><h2 className="t-h2">Новые лиды</h2><Link href="/leads" className="tap-link text-[14px] font-medium text-primary">Все</Link></div>
                {r.loading ? <div className="surface space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div> : !d?.newLeads.length ? (
                  <EmptyState icon={Sparkles} title="Новых лидов нет" text="Все запросы уже в работе." action={<Button size="sm" variant="outline" onClick={() => ui.set({ quickCreate: 'lead' })}>Добавить лид</Button>} />
                ) : (
                  <ul className="surface row-divider overflow-hidden">
                    {d.newLeads.map((l) => (
                      <li key={l.id}><Link href={`/leads/${l.id}`} className="pressable flex items-center gap-3 px-4 py-3.5">
                        <Avatar name={nameOf(l.clientId)} size={40} />
                        <span className="min-w-0 flex-1"><span className="block truncate text-[15.5px] font-medium">{nameOf(l.clientId)}</span><span className="t-caption block truncate">{budget(l.budgetMin, l.budgetMax)}</span></span>
                        <span className="t-caption whitespace-nowrap">{ago(l.createdAt)}</span>
                      </Link></li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h2 className="t-h2 mb-3">Недавно</h2>
                {r.loading ? <Skeleton className="h-28" /> : (
                  <ol className="relative space-y-4 pl-6 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-border">
                    {(d?.activity ?? []).slice(0, 4).map((a) => (
                      <li key={a.id} className="relative"><span aria-hidden className="absolute -left-6 top-1.5 h-[7px] w-[7px] rounded-full bg-primary/55 ring-4 ring-background" />
                        <p className="text-[14.5px] leading-5"><span className="font-medium">{nameOf(a.clientId)}</span> <span className="text-muted-foreground">{a.text}</span></p><p className="t-micro mt-0.5">{ago(a.at)}</p></li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function TitleBlock({ family, part, name, now }: { family: string; part: { greet: string }; name: string; now: Date }) {
  return (
    <header className={cn('safe-top relative', family === 'atlas' ? 'mb-4 pt-3 lg:pt-0' : 'mb-5 pt-5 lg:pt-0')}>
      <p className={cn('first-letter:uppercase', family === 'atlas' ? 't-caption text-[13px]' : 'text-[15px] text-muted-foreground')}>{dayLong(now)}</p>
      <h1 className={cn(family === 'atlas' ? 't-h1 mt-0.5' : 't-hero mt-1')}>{part.greet}, {name}</h1>
      {/* «Молния» и колокольчик — как в работающей CRM: быстрый захват и уведомления в шапке дня. */}
      <div className="absolute right-0 top-[calc(env(safe-area-inset-top)+12px)] flex items-center gap-1.5">
        <IconButton label="Быстрый захват лида" onClick={() => ui.set({ quickCreate: 'capture' })}
          className="bg-primary text-primary-foreground hover:bg-primary/90"><Zap /></IconButton>
        <IconButton label="Уведомления" onClick={() => ui.set({ notifications: true })}><Bell /></IconButton>
      </div>
    </header>
  );
}

function VzKpi({ label, value, note, warn, loading, href }: { label: string; value?: number; note: string; warn?: boolean; loading: boolean; href: string }) {
  return (
    <Link href={href} className="pressable surface block p-3.5 lg:p-4">
      <div className="t-caption text-[13px]">{label}</div>
      {loading || value === undefined ? <Skeleton className="mt-2 h-8 w-10" /> : <div className="t-num count-in mt-1 text-[32px] leading-9">{value}</div>}
      <div className={cn('mt-0.5 truncate text-[12px]', warn ? 'font-medium text-danger-text' : 'text-muted-foreground')}>{note}</div>
    </Link>
  );
}

function Kpi({ icon: Icon, label, value, sub, subTone, loading, href, className }: { icon: typeof Users; label: string; value?: number | string; sub: string; subTone?: 'danger'; loading: boolean; href: string; className?: string }) {
  return (
    <Link href={href} className={cn('pressable surface flex items-start gap-3 p-3.5', className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-primary-soft text-primary"><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium text-muted-foreground">{label}</span>
        {loading || value === undefined ? <Skeleton className="my-1 h-6 w-12" /> : <span className="block text-[22px] font-bold leading-7 tabular tracking-[-0.03em]">{value}</span>}
        <span className={cn('block truncate text-[12px]', subTone === 'danger' ? 'font-medium text-danger-text' : 'text-muted-foreground')}>{sub}</span>
      </span>
    </Link>
  );
}

function UrgentBlock({ overdue, nameOf, compact }: { overdue: Task[]; nameOf: (id?: string) => string; compact?: boolean }) {
  const t = overdue[0];
  if (!t) return null;
  return (
    <section aria-label="Срочно" className={cn('relative overflow-hidden text-primary-foreground', compact ? 'rounded-card border border-danger/25 bg-danger/8 p-4 !text-foreground' : 'rounded-[22px] bg-primary p-5')}>
      <div className={cn('flex items-center gap-2 text-[13px] font-medium', compact ? 'text-danger-text' : 'opacity-85')}><AlertTriangle className="h-4 w-4" aria-hidden />Просрочено со вчера</div>
      <p className={cn('mt-1.5', compact ? 'text-[16px] font-semibold' : 'font-display text-[22px] font-semibold leading-7 tracking-[-0.01em]')}>{t.title}</p>
      <p className="mt-1 text-[14px] opacity-80">{nameOf(t.clientId)}{overdue.length > 1 && `, и ещё ${overdue.length - 1}`}</p>
      <div className="mt-4 flex gap-2">
        <Link href={t.clientId ? `/clients/${t.clientId}` : '/tasks'} className={cn('inline-flex h-10 items-center gap-1.5 px-4 text-[14px] font-semibold transition-colors', compact ? 'rounded-control bg-surface border border-border hover:bg-surface-2' : 'rounded-full bg-white/15 backdrop-blur hover:bg-white/25')}><Phone className="h-4 w-4" aria-hidden />Связаться</Link>
        <Link href="/tasks" className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-[14px] font-medium opacity-90 hover:opacity-100">Все задачи<ChevronRight className="h-4 w-4" aria-hidden /></Link>
      </div>
    </section>
  );
}

function AgendaList({ items, loading, nextIdx, compact, busyTask, onToggle }: { items: AgendaItem[]; loading: boolean; nextIdx: number; compact?: boolean; busyTask: string | null; onToggle: (t: Task) => void }) {
  if (loading) return <div className="space-y-4 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="flex gap-3"><Skeleton className="h-5 w-12" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/3" /></div></div>)}</div>;
  if (!items.length) return <div className="px-5 py-10 text-center"><CalendarDays className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden /><p className="t-h3">На сегодня пусто</p><p className="t-caption mt-1">Самое время разобрать новых лидов.</p></div>;
  return (
    <ol className={cn('row-divider', compact && 'pb-1')}>
      {items.map((it, i) => {
        const isNext = i === nextIdx;
        return (
          <li key={it.id} className={cn('relative flex min-h-[46px] items-center gap-3 transition-opacity duration-row', compact ? 'px-4 py-3' : 'px-4 py-3.5 lg:px-5')}>
            {isNext && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary" />}
            <time dateTime={it.at} className={cn('w-12 shrink-0 tabular', compact ? 'text-[13px] font-semibold' : 't-num text-[17px] font-semibold')}>{time(it.at)}</time>
            <div className="min-w-0 flex-1">
              <p className={cn('truncate font-medium', compact ? 'text-[14px]' : 'text-[15.5px]', it.task?.completedAt && 'line-through decoration-muted-foreground/60')}>{it.title}</p>
              <p className="t-caption truncate">{it.meta}{isNext && <StatusBadge tone="primary" className="ml-2 h-5 align-middle">Следующее</StatusBadge>}</p>
            </div>
            {it.task ? <TaskCheck checked={!!it.task.completedAt} busy={busyTask === it.task.id} onChange={() => onToggle(it.task!)} label={`Выполнено: ${it.title}`} />
              : it.event?.propertyId ? <Link href={`/properties/${it.event.propertyId}`} aria-label="Открыть объект" className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-surface-2"><ArrowUpRight className="h-4 w-4" /></Link> : null}
          </li>
        );
      })}
    </ol>
  );
}
