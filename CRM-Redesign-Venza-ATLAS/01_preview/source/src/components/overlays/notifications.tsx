import { BellOff, CalendarClock, CheckSquare, UserPlus } from 'lucide-react';
import { ui, useUI } from '@/components/shell/ui-state';
import { Sheet } from '@/components/ui/sheet';
import { Link } from '@/lib/router';
import { ago, time } from '@/lib/format';
import { api } from '@/lib/mock/api';
import { store } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { EmptyState } from '@/components/ui/state';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Колокольчик в шапке. В работающей CRM это панель со списком и честным
 * «Уведомлений пока нет», когда ничего не произошло, — здесь так же.
 * Уведомления собираются из тех же данных, что и «Сегодня»: просроченные
 * задачи, ближайшие показы, новые лиды без ответственного.
 */
type Item = { id: string; icon: typeof CheckSquare; title: string; meta: string; href: string; tone?: 'danger' | 'warning' };

export function NotificationsPanel() {
  const { notifications } = useUI();
  const r = useResource(() => api.today(), [notifications]);
  const clients = store.db.clients;
  const nameOf = (id?: string) => clients.find((c) => c.id === id)?.fullName ?? 'Без имени';
  const now = Date.now();

  const d = r.data;
  const items: Item[] = [];
  if (d) {
    for (const t of d.tasks.filter((x) => !x.completedAt && new Date(x.dueAt).getTime() < now).slice(0, 4)) {
      items.push({ id: `t-${t.id}`, icon: CheckSquare, tone: 'danger', title: t.title, meta: `Срок прошёл ${ago(t.dueAt)}`, href: '/tasks' });
    }
    for (const e of d.events.filter((x) => new Date(x.startsAt).getTime() > now).slice(0, 3)) {
      items.push({ id: `e-${e.id}`, icon: CalendarClock, tone: 'warning', title: e.title, meta: `Сегодня в ${time(e.startsAt)}`, href: '/calendar' });
    }
    for (const l of d.newLeads.filter((x) => !x.assignedUserId).slice(0, 3)) {
      items.push({ id: `l-${l.id}`, icon: UserPlus, title: `Новый лид: ${nameOf(l.clientId)}`, meta: 'Без ответственного', href: `/leads/${l.id}` });
    }
  }

  return (
    <Sheet open={notifications} onOpenChange={(o) => !o && ui.set({ notifications: false })}
      title="Уведомления" description="Просроченные задачи, ближайшие показы и новые лиды." desktop="side" size="sm">
      {r.loading && !d ? (
        <div className="space-y-2.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={BellOff} title="Уведомлений пока нет" text="Здесь появятся просроченные задачи, ближайшие показы и лиды без ответственного." />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.href} onClick={() => ui.set({ notifications: false })} className="pressable surface flex items-start gap-3 p-3.5">
                <span className={n.tone === 'danger' ? 'text-danger-text' : n.tone === 'warning' ? 'text-warning-text' : 'text-muted-foreground'}>
                  <n.icon className="mt-0.5 h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium">{n.title}</span>
                  <span className="t-caption block">{n.meta}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
