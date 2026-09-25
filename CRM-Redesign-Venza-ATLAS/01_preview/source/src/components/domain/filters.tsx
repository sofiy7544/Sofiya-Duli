import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { tr } from '@/lib/i18n';

/** Фильтры: bottom sheet на мобиле, боковая панель на десктопе. Футер: Сбросить / Показать N. */
export type FilterGroup = { key: string; label: string; options: { value: string; label: string }[]; multi?: boolean };
export type FilterValue = Record<string, string[]>;

export function FilterButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className={cn('shrink-0', count > 0 && 'border-primary/40 text-primary')} aria-label={count ? `Фильтры, выбрано ${count}` : tr('Фильтры')}>
      <SlidersHorizontal />{tr('Фильтры')}{count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground tabular">{count}</span>}
    </Button>
  );
}

export function FiltersSheet({ open, onOpenChange, groups, value, onApply, countFor }: {
  open: boolean; onOpenChange: (o: boolean) => void; groups: FilterGroup[]; value: FilterValue; onApply: (v: FilterValue) => void; countFor: (v: FilterValue) => number;
}) {
  const [draft, setDraft] = React.useState<FilterValue>(value);
  React.useEffect(() => { if (open) setDraft(value); }, [open, value]);
  const toggle = (g: FilterGroup, v: string) => setDraft((d) => {
    const cur = d[g.key] ?? [];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : g.multi === false ? [v] : [...cur, v];
    return { ...d, [g.key]: next };
  });
  const n = countFor(draft);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={tr('Фильтры')} desktop="side" size="sm"
      footer={<><Button variant="outline" className="flex-1" onClick={() => setDraft({})}>{tr('Сбросить')}</Button><Button className="flex-[2]" onClick={() => { onApply(draft); onOpenChange(false); }}>{n ? `Показать ${n}` : tr('Ничего не найдено')}</Button></>}>
      <div className="space-y-6">
        {groups.map((g) => (
          <fieldset key={g.key}>
            <legend className="t-h3 mb-2.5">{g.label}</legend>
            <div className="flex flex-wrap gap-2">
              {g.options.map((o) => <Chip key={o.value} selected={(draft[g.key] ?? []).includes(o.value)} onClick={() => toggle(g, o.value)}>{o.label}</Chip>)}
            </div>
          </fieldset>
        ))}
      </div>
    </Sheet>
  );
}
export const activeFilterCount = (v: FilterValue) => Object.values(v).reduce((a, x) => a + x.length, 0);
