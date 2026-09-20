import * as React from 'react';
import { AlertTriangle, CalendarClock, ChevronRight, Clock, PhoneCall, Sparkles, Target, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Link } from '@/lib/router';
import { plural } from '@/lib/format';
import { api } from '@/lib/mock/api';
import { store } from '@/lib/mock/store';
import type { CalendarEvent, Lead, Task } from '@/lib/mock/types';
import { buildBriefing, briefingHeadline, type BriefingAction, type Signal, type SignalKind } from '@/lib/briefing';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

/**
 * AI Briefing. Логика — в lib/briefing.ts: правила по данным, а не модель.
 * Карточка показывает первые три сигнала и даёт закрыть их не уходя с экрана;
 * весь список — на отдельной странице /briefing.
 */
export const SIGNAL_ICON: Record<SignalKind, typeof PhoneCall> = {
  'overdue-action': PhoneCall, 'showing-soon': CalendarClock, 'task-overdue': Clock,
  'hot-no-plan': Target, 'negotiation-stale': AlertTriangle, cooling: Clock, unassigned: Users,
};

const TONE: Record<string, string> = { now: 'text-danger-text', today: 'text-warning-text', week: 'text-muted-foreground' };

/** Выполняет действие подсказки. Возвращает текст для тоста. */
export async function runAction(a: BriefingAction): Promise<string | null> {
  if (a.kind === 'plan-today' || a.kind === 'plan-tomorrow') {
    await api.updateLead(a.leadId, { nextActionAt: a.at });
    return 'Следующий шаг запланирован';
  }
  if (a.kind === 'task-call') {
    await api.createTask({ title: a.title, type: 'CALL', dueAt: new Date(Date.now() + 30 * 60_000).toISOString(), leadId: a.leadId });
    return 'Звонок поставлен в задачи';
  }
  return null;
}

export function useSignals(leads: Lead[], tasks: Task[], events: CalendarEvent[]): Signal[] {
  const clients = store.db.clients;
  return React.useMemo(() => {
    const nameOf = (id?: string) => clients.find((c) => c.id === id)?.fullName ?? 'Лид без имени';
    return buildBriefing({ leads, tasks, events, nameOf });
  }, [leads, tasks, events, clients]);
}

export function SignalRow({ s, compact }: { s: Signal; compact?: boolean }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const Icon = SIGNAL_ICON[s.kind];

  const run = async (a: BriefingAction) => {
    if (a.kind === 'open') return;
    setBusy(a.label);
    try { const msg = await runAction(a); if (msg) toast.success(msg); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <div className={cn('px-4 py-3', compact ? '' : 'lg:px-5')}>
      {/* Вся строка — одна цель нажатия: раньше заголовок и стрелка были
          отдельными ссылками по 16-39px, в них трудно попасть пальцем. */}
      <Link href={s.href} className="flex min-h-[44px] items-start gap-3">
        <span className={cn('mt-0.5 flex-none', TONE[s.severity])}><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-medium">{s.title}</span>
          <span className="t-caption block">{s.why}</span>
        </span>
        <ChevronRight className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" aria-hidden />
      </Link>
      <div className="pl-[30px]">
          {/* В карточке на «Сегодня» — одно действие, чтобы блок не разрастался; остальные на /briefing. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(compact ? s.actions.slice(0, 1) : s.actions).map((a) => a.kind === 'open' ? (
              <Link key={a.label} href={a.href} className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-3.5 text-sm font-medium transition-colors hover:bg-surface-2 lg:h-9">{a.label}</Link>
            ) : (
              <Button key={a.label} size="sm" variant="outline" loading={busy === a.label} onClick={() => void run(a)}>{a.label}</Button>
            ))}
        </div>
      </div>
    </div>
  );
}

export function BriefingCard({ tasks, events, leads, loading }: {
  tasks: Task[]; events: CalendarEvent[]; leads: Lead[]; loading?: boolean;
}) {
  const signals = useSignals(leads, tasks, events);
  const head = briefingHeadline();
  const now = Date.now();

  const openTasks = tasks.filter((t) => !t.completedAt).length;
  const showingsSoon = events.filter((e) => {
    const dt = new Date(e.startsAt).getTime() - now;
    return e.kind === 'SHOWING' && dt > 0 && dt < 3 * 3_600_000;
  }).length;
  const urgent = signals.filter((s) => s.severity === 'now').length;
  const shown = signals.slice(0, 3);

  return (
    <section className="surface mt-4 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-4">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-primary-soft text-primary">
          <Sparkles className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="t-h2">AI Briefing</h2>
          <p className="t-caption">
            {openTasks} {plural(openTasks, 'задача', 'задачи', 'задач')} на сегодня · {showingsSoon} {plural(showingsSoon, 'показ', 'показа', 'показов')} в ближайшие 3 ч
          </p>
        </div>
        {urgent > 0 ? <StatusBadge tone="danger">{urgent} срочно</StatusBadge> : <StatusBadge>Beta</StatusBadge>}
      </div>

      <p className="t-caption px-4 pt-2"><b className="font-medium text-foreground/80">{head.title}.</b> {head.text}.</p>

      {shown.length === 0 ? (
        <p className="t-caption px-4 pb-4 pt-2.5">{loading ? 'Собираем сводку…' : 'Срочного нет: просроченных шагов, ближайших показов и остывающих лидов не найдено.'}</p>
      ) : (
        <>
          <div className="mt-2.5 border-t border-border/70">
            {shown.map((s) => <div key={s.id} className="border-b border-border/70 last:border-0"><SignalRow s={s} compact /></div>)}
          </div>
          {signals.length > shown.length && (
            <Link href="/briefing" className="pressable flex items-center justify-between px-4 py-3 text-[14px] font-medium text-primary">
              Вся сводка · ещё {signals.length - shown.length}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </>
      )}
    </section>
  );
}
