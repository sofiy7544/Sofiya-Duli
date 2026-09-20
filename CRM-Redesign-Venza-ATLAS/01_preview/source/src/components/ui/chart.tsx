import * as React from 'react';
import { Table2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Link } from '@/lib/router';

/**
 * Детали графиков отчётов. Правила, которых держимся:
 * — значение не передаётся одним цветом: у каждой полосы есть подпись и число;
 * — числа и подписи носят текстовые токены, цвет остаётся у самой метки;
 * — тонкие полосы, скруглённый конец, спокойная подложка вместо сетки;
 * — у набора данных есть альтернативный вид таблицей.
 */

/** Число-заголовок: своя цифра крупно, расшифровка под ней. График здесь не нужен. */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface p-3.5 lg:p-4">
      <div className="t-caption">{label}</div>
      <div className="mt-1 text-[22px] font-semibold leading-none tabular lg:text-[24px]">{value}</div>
      {hint && <div className="t-caption mt-1.5">{hint}</div>}
    </div>
  );
}

/** Рамка блока с графиком: заголовок, пояснение, действие, сам график. */
export function ChartFigure({ title, caption, action, children }: {
  title: string; caption?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="surface mt-4 p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="t-h2">{title}</h2>
          {caption && <p className="t-caption mt-1 max-w-[46ch]">{caption}</p>}
        </div>
        {action && <div className="flex-none pt-0.5">{action}</div>}
      </div>
      <div className="mt-3.5 space-y-2.5">{children}</div>
    </section>
  );
}

/**
 * Строка-полоса: подпись слева, значение справа, полоса под ними.
 * Доля показана и шириной, и числом — при отключённых цветах смысл не теряется.
 */
export function BarRow({ label, value, max, color, right, href }: {
  label: string; value: number; max: number; color: string; right?: React.ReactNode; href?: string;
}) {
  const pct = Math.max(value > 0 ? 4 : 0, Math.round((value / max) * 100));
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-[14px]">
          <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: color }} aria-hidden />
          <span className="truncate">{label}</span>
        </span>
        <span className="flex-none text-[14px]">{right}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </>
  );
  if (!href) return <div>{body}</div>;
  return (
    <Link href={href} className="block rounded-control py-1.5 outline-offset-2 transition-colors hover:bg-surface-2/60">
      {body}
    </Link>
  );
}

/** Переключатель «график ↔ таблица»: обязательная альтернатива цветовому кодированию. */
export function TableToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on}
      className={cn('tap-link inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1.5 text-[13px] font-medium transition-colors',
        on ? 'bg-surface-2 text-foreground' : 'text-muted-foreground hover:text-foreground')}>
      <Table2 className="h-3.5 w-3.5" aria-hidden />
      {on ? 'График' : 'Таблица'}
    </button>
  );
}
