import { Sparkles } from 'lucide-react';
import { api } from '@/lib/mock/api';
import { useResource } from '@/lib/use-resource';
import { plural } from '@/lib/format';
import { SEVERITY_LABEL, type Severity } from '@/lib/briefing';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { SignalRow, useSignals } from '@/components/today/briefing';
import { tr } from '@/lib/i18n';

/**
 * /briefing — весь разбор дня. Сгруппирован по срочности, у каждого пункта
 * видно, почему он здесь, и действие выполняется прямо в строке.
 */
const ORDER: Severity[] = ['now', 'today', 'week'];

export function BriefingScreen() {
  const r = useResource(() => api.today());
  const d = r.data;
  const signals = useSignals(d?.activeLeads ?? [], d?.tasks ?? [], d?.events ?? []);

  const header = <PageHeader title={tr('Сводка дня')} back="/today" subtitle={tr('Что требует внимания и почему')} />;
  if (r.error) return <PageBody className="lg:max-w-[760px]">{header}<ErrorState error={r.error} onRetry={r.retry} what={tr('сводку')} /></PageBody>;
  if (r.loading || !d) return <PageBody className="lg:max-w-[760px]">{header}<Skeleton className="h-64" /></PageBody>;

  if (signals.length === 0) {
    return (
      <PageBody className="lg:max-w-[760px]">{header}
        <EmptyState icon={Sparkles} title={tr('Всё под контролем')} text={tr('Просроченных шагов нет, ближайших показов нет, лиды не остывают.')} />
      </PageBody>
    );
  }

  return (
    <PageBody className="lg:max-w-[760px]">
      {header}
      {ORDER.map((sev) => {
        const items = signals.filter((s) => s.severity === sev);
        if (items.length === 0) return null;
        return (
          <section key={sev} className="mb-4">
            <h2 className="t-h3 mb-2">{SEVERITY_LABEL[sev]} <span className="t-caption font-normal">· {items.length} {plural(items.length, 'пункт', 'пункта', 'пунктов')}</span></h2>
            <div className="surface overflow-hidden">
              {items.map((s) => <div key={s.id} className="border-b border-border/70 last:border-0"><SignalRow s={s} /></div>)}
            </div>
          </section>
        );
      })}
      <p className="t-caption">
        Сводку считают правила по данным CRM, а не языковая модель: просроченный шаг, показ в ближайшие 3 часа,
        горячий лид без плана, переговоры без движения дольше 3 дней, молчание дольше 7 дней, новые лиды без ответственного.
        Поэтому у каждого пункта видно причину, а результат повторяем.
      </p>
    </PageBody>
  );
}
