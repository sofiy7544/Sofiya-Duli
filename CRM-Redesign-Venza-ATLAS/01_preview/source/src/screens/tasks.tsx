import * as React from 'react';
import { CheckCircle2, CheckSquare, ListPlus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { store, users } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { useChunked } from '@/lib/use-chunked';
import { ShowMore } from '@/components/ui/show-more';
import { Link } from '@/lib/router';
import { useIsDesktop, useTheme } from '@/lib/theme/provider';
import { relDay, sameDay, time } from '@/lib/format';
import { TASK_TYPE_LABEL } from '@/lib/labels';
import type { Task } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { ui, useUI } from '@/components/shell/ui-state';
import { Button, IconButton } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented';
import { RowsSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { StatusBadge } from '@/components/ui/badge';
import { TaskCheck } from '@/components/ui/toggle';
import { toast } from '@/components/ui/toast';
import { tr } from '@/lib/i18n';

type Filter = 'today' | 'overdue' | 'upcoming' | 'done';

/** /tasks. Выполнение — оптимистично, строка «успокаивается», не прыгает; Undo в тосте. */
export function TasksScreen() {
  const { family } = useTheme();
  const isDesktop = useIsDesktop();
  const r = useResource(() => api.tasks());
  const [filter, setFilter] = React.useState<Filter>('today');
  const { focusTask } = useUI();
  /* Подсветка живёт в экране, а не в общем состоянии: из стора задачу снимаем сразу,
     как только открыли нужную вкладку. Иначе значение остаётся висеть (уход с экрана
     раньше 2,6 с обрывает таймер) и на следующем визите любое обновление списка
     перекидывает человека на чужую вкладку — например, когда он закрывает просроченную. */
  const [glow, setGlow] = React.useState<string | null>(null);
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
  /* «Готово» за год — это тысячи строк. Показываем порциями, счётчики на
     вкладках при этом остаются по всему списку. */
  /* Задача из тоста может лежать за порцией: её номер в списке передаём в useChunked,
     иначе «Показать» открывает вкладку, а строки на ней нет. */
  const focusIndex = glow ? buckets[filter].findIndex((t) => t.id === glow) : -1;
  const page = useChunked(buckets[filter], `tasks:${filter}`, undefined, focusIndex);
  const items = page.visible;

  /* Задача из тоста «Показать»: открываем вкладку, в которой она лежит, и подсвечиваем строку. */
  React.useEffect(() => {
    if (!focusTask || !r.data) return;
    const t = r.data.find((x) => x.id === focusTask);
    if (!t) return;
    const bucket: Filter = t.completedAt ? 'done'
      : new Date(t.dueAt) < start ? 'overdue'
      : sameDay(new Date(t.dueAt), now) ? 'today' : 'upcoming';
    setFilter(bucket);
    setGlow(focusTask);
    ui.set({ focusTask: null });
    const id = setTimeout(() => setGlow(null), 2600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTask, r.data]);
  React.useEffect(() => {
    if (!glow) return;
    const el = document.getElementById(`task-${glow}`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // items.length — потому что строка может появиться на шаг позже, когда дорисуется нужная порция.
  }, [glow, filter, items.length]);

  const toggle = async (t: Task) => {
    const next = !isDone(t);
    setPending((p) => ({ ...p, [t.id]: next }));
    await api.toggleTask(t.id);
    setPending((p) => { const n = { ...p }; delete n[t.id]; return n; });
    if (next) toast.success(tr('Задача выполнена'), { action: { label: tr('Вернуть'), onClick: () => api.toggleTask(t.id) } });
  };
  const clientName = (id?: string) => store.db.clients.find((c) => c.id === id)?.fullName;

  const content = () => {
    if (r.error) return <ErrorState error={r.error} onRetry={r.retry} what={tr('задачи')} />;
    if (r.loading) return <RowsSkeleton rows={6} avatar={false} />;
    if (!items.length) return filter === 'overdue'
      ? <EmptyState icon={CheckCircle2} title={tr('Просроченных нет')} text={tr('Все сроки под контролем.')} />
      : <EmptyState icon={CheckSquare} title={filter === 'done' ? tr('Пока ничего не выполнено') : tr('Задач нет')} text={tr('Создайте задачу — звонок, показ или напоминание.')} action={<Button onClick={() => ui.set({ quickCreate: 'task' })}><Plus />{tr('Новая задача')}</Button>} />;

    if (family === 'atlas' && isDesktop) {
      return (
        <div data-hscroll className="surface overflow-x-auto">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead><tr className="border-b border-border text-left text-[12.5px] text-muted-foreground"><th scope="col" className="w-12 px-4 py-2.5"><span className="sr-only">{tr('Статус')}</span></th>{[tr('Задача'), tr('Тип'), tr('Клиент'), tr('Срок'), tr('Ответственный')].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{items.map((t) => { const done = isDone(t); const over = !done && new Date(t.dueAt) < now; return (
              <tr key={t.id} id={`task-${t.id}`} className={cn('border-b border-border/70 last:border-0 transition-[opacity,background-color] duration-row', done && 'opacity-60', glow === t.id && 'bg-primary-soft')}>
                <td className="px-4 py-1.5"><TaskCheck checked={done} onChange={() => toggle(t)} label={t.title} /></td>
                <td className={cn('px-3 py-2 font-medium', done && 'line-through decoration-muted-foreground/60')}>{t.title}</td>
                <td className="px-3 py-2"><StatusBadge>{TASK_TYPE_LABEL[t.type]}</StatusBadge></td>
                <td className="px-3 py-2">{t.clientId ? <Link href={`/clients/${t.clientId}`} className="hover:underline">{clientName(t.clientId)}</Link> : '—'}</td>
                <td className={cn('px-3 py-2 tabular', over ? 'font-medium text-danger-text' : 'text-muted-foreground')}>{relDay(t.dueAt)}, {time(t.dueAt)}</td>
                <td className="px-3 py-2 text-muted-foreground">{users.find((u) => u.id === t.userId)?.fullName}</td>
              </tr>); })}</tbody>
          </table>
          <ShowMore more={page.more} total={page.total} shown={items.length} onMore={page.loadMore} what="task" />
        </div>
      );
    }
    return (
      <>
      <ul className="surface row-divider overflow-hidden">
        {items.map((t) => { const done = isDone(t); const over = !done && new Date(t.dueAt) < now; return (
          <li key={t.id} id={`task-${t.id}`} className={cn('flex items-center gap-3 px-4 py-3 transition-colors duration-500', glow === t.id && 'bg-primary-soft')}>
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
      <ShowMore more={page.more} total={page.total} shown={items.length} onMore={page.loadMore} what="task" />
      </>
    );
  };

  return (
    <PageBody wide={family === 'atlas'}>
      <PageHeader title={tr('Задачи')} subtitle={r.data ? (buckets.overdue.length ? <span className="font-medium text-danger-text">{buckets.overdue.length} {tr('просрочено')}</span> : tr('Без просрочек')) : ' '}
        /* Кнопка в шапке — как «Новый клиент» на «Клиентах»: задача создаётся отсюда сразу,
           без выбора типа в общем меню. Значок со списком, а не голый плюс: рядом на
           компьютере стоит «+ Создать», два одинаковых плюса читались бы как одно и то же. */
        actions={<IconButton label={tr('Новая задача')} onClick={() => ui.set({ quickCreate: 'task' })}><ListPlus /></IconButton>} />
      <SegmentedControl<Filter> label={tr('Фильтр задач')} className="mb-4 w-full sm:w-auto" value={filter} onChange={setFilter}
        options={[{ value: 'today', label: tr('Сегодня'), count: r.data ? buckets.today.length : undefined }, { value: 'overdue', label: tr('Просрочено'), count: r.data ? buckets.overdue.length : undefined }, { value: 'upcoming', label: tr('Далее') }, { value: 'done', label: tr('Готово') }]} />
      {content()}
    </PageBody>
  );
}
