import * as React from 'react';
import { BarChart3 } from 'lucide-react';
import { api } from '@/lib/mock/api';
import { dealsApi } from '@/lib/mock/deals';
import { users } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { Link } from '@/lib/router';
import { money, plural } from '@/lib/format';
import { SOURCE_LABEL, STAGES_ACTIVE, STAGE_LABEL } from '@/lib/labels';
import type { Lead, SourceType } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { STAGE_DOT } from '@/components/ui/badge';
import { BarRow, ChartFigure, StatTile, TableToggle } from '@/components/ui/chart';

/**
 * /reports (в CRM /insights ⇒ /reports). Состав по SCREEN-MAP: KPI · воронка ·
 * каналы · таблица агентов · причины отказов. Строки агентов и каналов ведут
 * в /leads с фильтром — те же переходы, что в CRM.
 *
 * Палитра каналов проверена валидатором (светлый режим): полоса светлоты,
 * порог цветности, различимость при дальтонизме и контраст к поверхности.
 * У каждой полосы есть подпись, поэтому цвет не единственный признак.
 */
const SOURCE_COLOR: Record<SourceType, string> = {
  INSTAGRAM: '#B0478A', WEBSITE: '#2B62B0', REFERRAL: '#B8790C',
  TELEGRAM: '#1E8A5F', FACEBOOK: '#7A55C8', MANUAL: '#C4553A',
};
const SOURCES: SourceType[] = ['WEBSITE', 'INSTAGRAM', 'REFERRAL', 'TELEGRAM', 'FACEBOOK', 'MANUAL'];

const avg = (l: Lead) => ((l.budgetMin ?? 0) + (l.budgetMax ?? l.budgetMin ?? 0)) / (l.budgetMax && l.budgetMin ? 2 : 1);

export function ReportsScreen() {
  const r = useResource(() => api.leads());
  const d = useResource(() => dealsApi.list());
  const [asTable, setAsTable] = React.useState(false);

  if (r.error) return <PageBody><PageHeader title="Отчёты" /><ErrorState error={r.error} onRetry={r.retry} what="отчёты" /></PageBody>;
  if (r.loading || !r.data) {
    return (
      <PageBody><PageHeader title="Отчёты" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px]" />)}</div>
        <Skeleton className="mt-4 h-64" /><Skeleton className="mt-4 h-64" />
      </PageBody>
    );
  }

  const leads = r.data;
  const deals = d.data ?? [];
  if (leads.length === 0) {
    return <PageBody><PageHeader title="Отчёты" /><EmptyState icon={BarChart3} title="Пока нечего показывать" text="Отчёты появятся, когда в воронку попадут первые лиды." /></PageBody>;
  }

  const won = leads.filter((l) => l.stage === 'WON');
  const lost = leads.filter((l) => l.stage === 'LOST');
  const active = leads.filter((l) => STAGES_ACTIVE.includes(l.stage));
  const closed = won.length + lost.length;
  const conversion = closed > 0 ? Math.round((won.length / closed) * 100) : 0;
  const completed = deals.filter((x) => x.status === 'COMPLETED');
  const commission = completed.reduce((a, x) => a + (x.amount * x.commissionPercent) / 100, 0);

  /* Воронка: этапы — сущности продукта, поэтому цвета те же, что на «Сегодня» и в канбане. */
  const funnel = STAGES_ACTIVE.map((s) => {
    const items = leads.filter((l) => l.stage === s);
    return { key: s, label: STAGE_LABEL[s], value: items.length, sum: items.reduce((a, l) => a + avg(l), 0), color: STAGE_DOT[s] };
  });
  const funnelMax = Math.max(1, ...funnel.map((x) => x.value));

  const channels = SOURCES.map((s) => {
    const items = leads.filter((l) => l.source === s);
    const w = items.filter((l) => l.stage === 'WON').length;
    return { key: s, label: SOURCE_LABEL[s], value: items.length, won: w, sum: items.reduce((a, l) => a + avg(l), 0), color: SOURCE_COLOR[s] };
  }).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const channelMax = Math.max(1, ...channels.map((x) => x.value));

  const agents = users.map((u) => {
    const mine = leads.filter((l) => l.assignedUserId === u.id);
    const mineWon = mine.filter((l) => l.stage === 'WON').length;
    const mineClosed = mineWon + mine.filter((l) => l.stage === 'LOST').length;
    return {
      user: u,
      active: mine.filter((l) => STAGES_ACTIVE.includes(l.stage)).length,
      won: mineWon,
      conv: mineClosed > 0 ? Math.round((mineWon / mineClosed) * 100) : null,
      volume: deals.filter((x) => x.userId === u.id && x.status === 'COMPLETED').reduce((a, x) => a + x.amount, 0),
    };
  }).filter((a) => a.active + a.won > 0).sort((a, b) => b.active - a.active);

  const reasons = Object.entries(lost.reduce<Record<string, number>>((acc, l) => {
    const key = l.lostReason?.trim() || 'Причина не указана';
    acc[key] = (acc[key] ?? 0) + 1; return acc;
  }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const reasonMax = Math.max(1, ...reasons.map((x) => x.value));

  return (
    <PageBody>
      <PageHeader title="Отчёты" subtitle={`Воронка, каналы и агенты · ${leads.length} ${plural(leads.length, 'лид', 'лида', 'лидов')} всего`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="В работе" value={String(active.length)} hint={`${money(active.reduce((a, l) => a + avg(l), 0), 'EUR', true)} бюджетов`} />
        <StatTile label="Конверсия в сделку" value={closed > 0 ? `${conversion}%` : '—'} hint={closed > 0 ? `${won.length} из ${closed} закрытых` : 'Закрытых лидов пока нет'} />
        <StatTile label="Закрыто сделок" value={String(completed.length)} hint={money(completed.reduce((a, x) => a + x.amount, 0), 'EUR', true)} />
        <StatTile label="Комиссия" value={money(commission, 'EUR', true)} hint="По завершённым сделкам" />
      </div>

      <ChartFigure
        title="Воронка по этапам"
        caption="Сколько лидов стоит на каждом этапе и на какую сумму бюджетов."
        action={<Link href="/leads" className="tap-link text-[13px] font-medium text-primary hover:underline">Открыть канбан</Link>}
      >
        {funnel.map((x) => (
          <BarRow key={x.key} label={x.label} color={x.color} value={x.value} max={funnelMax}
            right={<><b className="tabular">{x.value}</b><span className="t-caption ml-2 tabular">{money(x.sum, 'EUR', true)}</span></>} />
        ))}
      </ChartFigure>

      <ChartFigure
        title="Каналы"
        caption="Откуда пришли лиды и сколько из них дошли до сделки."
        action={<TableToggle on={asTable} onToggle={() => setAsTable((v) => !v)} />}
      >
        {asTable ? (
          <div data-hscroll className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <caption className="sr-only">Лиды по каналам привлечения</caption>
              <thead><tr className="border-b border-border text-left text-[12.5px] text-muted-foreground">
                <th scope="col" className="py-2.5 pr-3 font-medium">Канал</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Лидов</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Сделок</th>
                <th scope="col" className="py-2.5 pl-3 text-right font-medium">Бюджеты</th>
              </tr></thead>
              <tbody>
                {channels.map((c) => (
                  <tr key={c.key} className="border-b border-border/70 last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">{c.label}</th>
                    <td className="px-3 py-2 text-right tabular">{c.value}</td>
                    <td className="px-3 py-2 text-right tabular">{c.won}</td>
                    <td className="py-2 pl-3 text-right tabular">{money(c.sum, 'EUR', true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : channels.map((c) => (
          <BarRow key={c.key} label={c.label} color={c.color} value={c.value} max={channelMax}
            href={`/leads?source=${c.key}`}
            right={<><b className="tabular">{c.value}</b>{c.won > 0 && <span className="t-caption ml-2 tabular">{c.won} в сделку</span>}</>} />
        ))}
      </ChartFigure>

      <section className="surface mt-4 p-4 lg:p-5">
        <h2 className="t-h2">Агенты</h2>
        <p className="t-caption mt-1">Нагрузка и результат. Строка открывает лиды агента.</p>
        <div data-hscroll className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[14px]">
            <caption className="sr-only">Нагрузка и результат агентов</caption>
            <thead>
              <tr className="border-b border-border text-left text-[12.5px] text-muted-foreground">
                <th scope="col" className="py-2.5 pr-3 font-medium">Агент</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">В работе</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Сделок</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Конверсия</th>
                <th scope="col" className="py-2.5 pl-3 text-right font-medium">Объём</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.user.id} className="border-b border-border/70 last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">
                    <Link href={`/leads?assignee=${a.user.id}`} className="tap-link font-medium text-primary hover:underline">{a.user.fullName}</Link>
                  </th>
                  <td className="px-3 py-2 text-right tabular">{a.active}</td>
                  <td className="px-3 py-2 text-right tabular">{a.won}</td>
                  <td className="px-3 py-2 text-right tabular">{a.conv === null ? '—' : `${a.conv}%`}</td>
                  <td className="py-2 pl-3 text-right tabular">{a.volume > 0 ? money(a.volume, 'EUR', true) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface mt-4 p-4 lg:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="t-h2">Причины отказов</h2>
          <span className="t-caption tabular">{lost.length} {plural(lost.length, 'лид', 'лида', 'лидов')}</span>
        </div>
        {reasons.length === 0 ? (
          <p className="t-caption mt-3">Проигранных лидов пока нет.</p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {reasons.map((x) => (
              <BarRow key={x.label} label={x.label} color="hsl(var(--danger))" value={x.value} max={reasonMax}
                right={<b className="tabular">{x.value}</b>} />
            ))}
          </div>
        )}
      </section>

      <p className="t-caption mt-4">Данные превью. В CRM отчёт берёт те же поля из <span className="font-medium">/api/reports</span>.</p>
    </PageBody>
  );
}
