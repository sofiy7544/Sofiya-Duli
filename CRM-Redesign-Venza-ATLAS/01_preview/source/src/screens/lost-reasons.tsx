import * as React from 'react';
import { ThumbsDown } from 'lucide-react';
import { api } from '@/lib/mock/api';
import { store } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { Link } from '@/lib/router';
import { ago, plural } from '@/lib/format';
import { SOURCE_LABEL } from '@/lib/labels';
import { DEFAULT_PERIOD, inPeriod, normalizePeriod, PERIODS, PERIOD_HINT, PERIOD_LABEL, PERIOD_STORAGE_KEY, type Period } from '@/lib/period';
import { SegmentedControl } from '@/components/ui/segmented';
import type { Lead } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { BarRow, ChartFigure } from '@/components/ui/chart';
import { tr } from '@/lib/i18n';

/**
 * /insights/lost-reasons. По SCREEN-MAP: топ причин · по источникам · по месяцам ·
 * недавние проигранные со ссылкой на карточку. Открывается ссылкой «Подробнее»
 * из блока причин на /reports.
 */
const MONTH = [tr('январь'), tr('февраль'), tr('март'), tr('апрель'), tr('май'), tr('июнь'), tr('июль'), tr('август'), tr('сентябрь'), tr('октябрь'), tr('ноябрь'), tr('декабрь')];

const count = <T extends string>(rows: T[]) => rows.reduce<Record<string, number>>((a, k) => { a[k] = (a[k] ?? 0) + 1; return a; }, {});
const top = (m: Record<string, number>) => Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

export function LostReasonsScreen() {
  const r = useResource(() => api.leads());
  const clients = store.db.clients;
  const nameOf = (id?: string) => clients.find((c) => c.id === id)?.fullName ?? tr('Без имени');
  /* Период тот же, что на «Отчётах»: экран открывается оттуда, и смена
     периода не должна теряться при переходе. */
  const [period, setPeriodState] = React.useState<Period>(() => {
    try { return normalizePeriod(localStorage.getItem(PERIOD_STORAGE_KEY)); } catch { return DEFAULT_PERIOD; }
  });
  const setPeriod = (p: Period) => { try { localStorage.setItem(PERIOD_STORAGE_KEY, p); } catch { /* ignore */ } setPeriodState(p); };

  const header = (
    <PageHeader title={tr('Причины отказов')} back="/reports" subtitle={`Почему лиды уходят · ${PERIOD_HINT[period]}`}>
      <SegmentedControl<Period> label={tr('Период')} size="sm" className="w-full sm:w-auto" value={period} onChange={setPeriod}
        options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABEL[p] }))} />
    </PageHeader>
  );
  if (r.error) return <PageBody className="lg:max-w-[860px]">{header}<ErrorState error={r.error} onRetry={r.retry} what={tr('причины отказов')} /></PageBody>;
  if (r.loading || !r.data) return <PageBody className="lg:max-w-[860px]">{header}<Skeleton className="h-64" /><Skeleton className="mt-4 h-64" /></PageBody>;

  const lost: Lead[] = r.data.filter((l) => l.stage === 'LOST' && inPeriod(l.createdAt, period));
  if (lost.length === 0) {
    return <PageBody className="lg:max-w-[860px]">{header}<EmptyState icon={ThumbsDown} title={tr('Проигранных лидов нет')} text={`За ${PERIOD_HINT[period]} проигранных лидов нет. Выберите период шире.`} /></PageBody>;
  }

  const reasons = top(count(lost.map((l) => l.lostReason?.trim() || tr('Причина не указана'))));
  const sources = top(count(lost.map((l) => SOURCE_LABEL[l.source])));
  const months = top(count(lost.map((l) => { const d = new Date(l.createdAt); return `${MONTH[d.getMonth()]} ${d.getFullYear()}`; })));
  const max = (rows: { value: number }[]) => Math.max(1, ...rows.map((x) => x.value));

  const recent = [...lost].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  return (
    <PageBody className="lg:max-w-[860px]">
      {header}

      <ChartFigure title={tr('Топ причин')} caption={`${lost.length} ${plural(lost.length, 'проигранный лид', 'проигранных лида', 'проигранных лидов')} всего`}>
        {reasons.map((x) => <BarRow key={x.label} label={x.label} value={x.value} max={max(reasons)} color="hsl(var(--danger))" right={<b className="tabular">{x.value}</b>} />)}
      </ChartFigure>

      <ChartFigure title={tr('По источникам')} caption="Канал, из которого пришёл лид, закрывшийся отказом.">
        {sources.map((x) => <BarRow key={x.label} label={x.label} value={x.value} max={max(sources)} color="hsl(var(--warning))" right={<b className="tabular">{x.value}</b>} />)}
      </ChartFigure>

      <ChartFigure title={tr('По месяцам')} caption="Месяц создания лида, а не закрытия: так видно, какие когорты не дошли.">
        {months.map((x) => <BarRow key={x.label} label={x.label} value={x.value} max={max(months)} color="hsl(var(--muted-foreground))" right={<b className="tabular">{x.value}</b>} />)}
      </ChartFigure>

      <section className="surface mt-4 p-4 lg:p-5">
        <h2 className="t-h2">{tr('Недавние отказы')}</h2>
        <ul className="row-divider mt-2 -mx-4 lg:-mx-5">
          {recent.map((l) => (
            <li key={l.id}>
              <Link href={`/leads/${l.id}`} className="pressable flex items-center gap-3 px-4 py-3 lg:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium">{nameOf(l.clientId)}</span>
                  <span className="t-caption block truncate">{l.lostReason?.trim() || tr('Причина не указана')} · {SOURCE_LABEL[l.source]}</span>
                </span>
                <span className="t-caption flex-none">{ago(l.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageBody>
  );
}
