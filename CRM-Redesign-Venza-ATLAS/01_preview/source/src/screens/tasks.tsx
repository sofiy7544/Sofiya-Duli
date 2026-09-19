import * as React from 'react';
import { CheckCircle2, CheckSquare, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { store, users } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { Link } from '@/lib/router';
import { useIsDesktop, useTheme } from '@/lib/theme/provider';
import { relDay, sameDay, time } from '@/lib/format';
import { TASK_TYPE_LABEL } from '@/lib/labels';
import type { Task } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { ui } from '@/components/shell/ui-state';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented';
import { RowsSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { StatusBadge } from '@/components/ui/badge';
import { TaskCheck } from '@/components/ui/toggle';
import { toast } from '@/components/ui/toast';

type Filter = 'today' | 'overdue' | 'upcoming' | 'done';

/** /tasks. Выполнение — оптимистично, строка «успокаивается», не прыгает; Undo в тосте. */
export function TasksScreen() {
  const { family } = useTheme();
  const isDesktop = useIsDesktop();
  const r = useResource(() => api.tasks());
  const [filter, setFilter] = React.useState<Filter>('today');
  const [pending, setPending] = React.useState<Record<string, boolean>>({});
  const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0);
  const all = r.data ?? [];
  const isDone = (t: Task) => pending[t.id] ?? !!t.completedAt;
  const buckets: Record<Filter, Task[]> = {
    today: all.filter((t) => sameDay(new Date(t.dueAt), now)),
    overdue: all.filter((t) => !t.completedAt && new Date(t.dueAt) < start),
    upcoming: all.filter((t) => !t.completedAt && new Date(t.dueAt) >= new Date(start.getTime() + 86_400_000)),
    done: all.filter((t) => !!t.completedAt),
  };
  const items = buckets[filter];

  const toggle = async (t: Task) => {
    const next = !isDone(t);
    setPending((p) => ({ ...p, [t.id]: next }));
    await api.toggleTask(t.id);
    setPending((p) => { const n = { ...p }; delete n[t.id]; return n; });
    if (next) toast.success('Задача выполнена', { action: { label: 'Вернуть', onClick: () => api.toggleTask(t.id) } });
  };
  const clientName = (id?: string) => store.db.clients.find((c) => c.id === id)?.fullName;

  const content = () => {
    if (r.error) return <ErrorState error={r.error} onRetry={r.retry} what="задачи" />;
    if (r.loading) return <RowsSkeleton rows={6} avatar={false} />;
    if (!items.length) return filter === 'overdue'
      ? <EmptyState icon={CheckCircle2} title="Просроченных нет" text="Все сроки под контролем." />
      : <EmptyState icon={CheckSquare} title={filter === 'done' ? 'Пока ничего не выполнено' : 'Задач нет'} text="Создайте задачу — звонок, показ или напоминание." action={<Button onClick={() => ui.set({ quickCreate: 'task' })}><Plus />Новая задача</Button>} />;

    if (family === 'atlas' && isDesktop) {
      return (
        <div data-hscroll className="surface overflow-x-auto">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead><tr className="border-b border-border text-left text-[12.5px] text-muted-foreground"><th scope="col" className="w-12 px-4 py-2.5"><span className="sr-only">Статус</span></th>{['Задача', 'Тип', 'Клиент', 'Срок', 'Ответственный'].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{items.map((t) => { const done = isDone(t); const over = !done && new Date(t.dueAt) < now; return (
              <tr key={t.id} className={cn('border-b border-border/70 last:border-0 transition-opacity duration-row', done && 'opacity-60')}>
                <td className="px-4 py-1.5"><TaskCheck checked={done} onChange={() => toggle(t)} label={t.title} /></td>
                <td className={cn('px-3 py-2 font-medium', done && 'line-through decoration-muted-foreground/60')}>{t.title}</td>
                <td className="px-3 py-2"><StatusBadge>{TASK_TYPE_LABEL[t.type]}</StatusBadge></td>
                <td className="px-3 py-2">{t.clientId ? <Link href={`/clients/${t.clientId}`} className="hover:underline">{clientName(t.clientId)}</Link> : '—'}</td>
                <td className={cn('px-3 py-2 tabular', over ? 'font-medium text-danger-text' : 'text-muted-foreground')}>{relDay(t.dueAt)}, {time(t.dueAt)}</td>
                <td className="px-3 py-2 text-muted-foreground">{users.find((u) => u.id === t.userId)?.fullName}</td>
              </tr>); })}</tbody>
          </table>
        </div>
      );
    }
    return (
      <ul className="surface row-divider overflow-hidden">
        {items.map((t) => { const done = isDone(t); const over = !done && new Date(t.dueAt) < now; return (
          <li key={t.id} className="flex items-center gap-3 px-4 py-3">
            <TaskCheck checked={done} onChange={() => toggle(t)} label={t.title} />
            <div className="min-w-0 flex-1">
              <p className={cn('text-[15.5px] font-medium leading-[22px]', done && 'line-through decoration-muted-foreground/60')}>{t.title}</p>
              <p className="t-caption mt-0.5 flex flex-wrap items-center gap-x-2">
                <span className={cn('tabular', over && 'font-medium text-danger-text')}>{relDay(t.dueAt)}, {time(t.dueAt)}</span>
                <span>{TASK_TYPE_LABEL[t.type]}</span>
                {t.clientId && <Link href={`/clients/${t.clientId}`} className="tap-link truncate text-primary">{clientName(t.clientId)}</Link>}
              </p>
            </div>
          </li>); })}
      </ul>
    );
  };

  return (
    <PageBody wide={family === 'atlas'}>
      <PageHeader title="Задачи" subtitle={r.data ? (buckets.overdue.length ? <span className="font-medium text-danger-text">{buckets.overdue.length} просрочено</span> : 'Без просрочек') : ' '} />
      <SegmentedControl<Filter> label="Фильтр задач" className="mb-4 w-full sm:w-auto" value={filter} onChange={setFilter}
        options={[{ value: 'today', label: 'Сегодня', count: r.data ? buckets.today.length : undefined }, { value: 'overdue', label: 'Просрочено', count: r.data ? buckets.overdue.length : undefined }, { value: 'upcoming', label: 'Далее' }, { value: 'done', label: 'Готово' }]} />
      {content()}
    </PageBody>
  );
}
