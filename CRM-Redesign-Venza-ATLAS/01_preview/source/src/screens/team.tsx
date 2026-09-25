import { Users } from 'lucide-react';
import { api } from '@/lib/mock/api';
import { users } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { Link } from '@/lib/router';
import { plural } from '@/lib/format';
import { STAGES_ACTIVE } from '@/lib/labels';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';

/**
 * /team (ADMIN). По SCREEN-MAP: таблица нагрузки команды, строки ведут
 * в /leads?assignee=. Права проверяет маршрутизатор, здесь только экран.
 */
const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Администратор', MANAGER: 'Руководитель', REALTOR: 'Риелтор',
  ASSISTANT: 'Ассистент', ANALYST: 'Аналитик', EMPLOYEE: 'Сотрудник',
};

export function TeamScreen() {
  const r = useResource(() => api.leads());

  if (r.error) return <PageBody><PageHeader title="Команда" /><ErrorState error={r.error} onRetry={r.retry} what="команду" /></PageBody>;
  if (r.loading || !r.data) return <PageBody><PageHeader title="Команда" /><Skeleton className="h-80" /></PageBody>;

  const leads = r.data;
  const rows = users.map((u) => {
    const mine = leads.filter((l) => l.assignedUserId === u.id);
    const activeLeads = mine.filter((l) => STAGES_ACTIVE.includes(l.stage));
    const overdue = activeLeads.filter((l) => l.nextActionAt && new Date(l.nextActionAt) < new Date()).length;
    const noAction = activeLeads.filter((l) => !l.nextActionAt).length;
    return { user: u, active: activeLeads.length, hot: activeLeads.filter((l) => l.priority === 'hot').length, won: mine.filter((l) => l.stage === 'WON').length, overdue, noAction };
  }).sort((a, b) => b.active - a.active);

  const unassigned = leads.filter((l) => !l.assignedUserId && STAGES_ACTIVE.includes(l.stage)).length;
  if (rows.length === 0) return <PageBody><PageHeader title="Команда" /><EmptyState icon={Users} title="В команде пока никого" text="Сотрудники появятся здесь после приглашения в настройках." /></PageBody>;

  const total = rows.reduce((a, x) => a + x.active, 0);

  return (
    <PageBody>
      <PageHeader title="Команда" subtitle={`${rows.length} ${plural(rows.length, 'сотрудник', 'сотрудника', 'сотрудников')} · ${total} ${plural(total, 'лид', 'лида', 'лидов')} в работе`} />

      {unassigned > 0 && (
        <Link href="/leads?assignee=none" className="pressable surface mb-4 flex items-center justify-between gap-3 p-4">
          <span className="text-[14.5px]"><b className="tabular">{unassigned}</b> {plural(unassigned, 'лид', 'лида', 'лидов')} без ответственного</span>
          <span className="text-[13px] font-medium text-primary">Распределить</span>
        </Link>
      )}

      <div data-hscroll className="surface overflow-x-auto">
        <table className="w-full min-w-[620px] text-[14px]">
          <caption className="sr-only">Нагрузка сотрудников</caption>
          <thead>
            <tr className="border-b border-border text-left text-[12.5px] text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">Сотрудник</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">В работе</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Горячих</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Сделок</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Требуют внимания</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.user.id} className="border-b border-border/70 last:border-0">
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  <Link href={`/leads?assignee=${x.user.id}`} className="tap-link flex items-center gap-2.5">
                    <Avatar name={x.user.fullName} src={x.user.avatarUrl} size={32} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-primary">{x.user.fullName}</span>
                      <span className="t-caption block">{ROLE_LABEL[x.user.role] ?? x.user.role}</span>
                    </span>
                  </Link>
                </th>
                <td className="px-3 py-2 text-right tabular">{x.active}</td>
                <td className="px-3 py-2 text-right tabular">{x.hot || '—'}</td>
                <td className="px-3 py-2 text-right tabular">{x.won || '—'}</td>
                <td className="px-4 py-2 text-right">
                  {x.overdue > 0
                    ? <StatusBadge tone="danger">{x.overdue} просрочено</StatusBadge>
                    : x.noAction > 0
                      ? <StatusBadge tone="warning">{x.noAction} без плана</StatusBadge>
                      : <span className="t-caption">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="t-caption mt-4">«Требуют внимания» — лиды с просроченным следующим действием или вовсе без запланированного.</p>
    </PageBody>
  );
}
