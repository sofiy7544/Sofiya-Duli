import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * Единый SegmentedControl вместо ~11 вариантов в CRM. Индикатор движется непрерывно (не мигает).
 * role=tablist + стрелки. Опционально счётчик.
 */
export function SegmentedControl<T extends string>({ value, onChange, options, label, className, size = 'md' }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string; className?: string; size?: 'sm' | 'md';
}) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [ind, setInd] = React.useState<{ x: number; w: number } | null>(null);
  const wrap = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const measure = () => { const el = refs.current[value]; if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth }); };
    measure();
    const ro = new ResizeObserver(measure); if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [value, options.length]);

  const onKey = (e: React.KeyboardEvent) => {
    const i = options.findIndex((o) => o.value === value);
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return; e.preventDefault();
    const next = options[(i + d + options.length) % options.length];
    onChange(next.value); refs.current[next.value]?.focus();
  };

  return (
    <div ref={wrap} role="tablist" aria-label={label} onKeyDown={onKey}
      className={cn('relative inline-flex max-w-full rounded-control bg-muted p-1', className)}>
      {ind && (
        <span aria-hidden className="absolute bottom-1 top-1 rounded-[calc(var(--radius-control)-4px)] bg-surface shadow-soft transition-[transform,width] duration-tab ease-emphasized"
          style={{ width: ind.w, transform: `translateX(${ind.x - 4}px)`, left: 4 }} />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} ref={(el) => { refs.current[o.value] = el; }} role="tab" type="button" aria-selected={active} tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn('relative z-[1] inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[calc(var(--radius-control)-4px)] font-medium transition-colors duration-tab',
              size === 'sm' ? 'h-9 px-3 text-[13px] lg:h-8' : 'h-11 px-3.5 text-sm lg:h-9', active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {o.label}
            {o.count !== undefined && <span className={cn('tabular text-[12px]', active ? 'text-muted-foreground' : 'text-muted-foreground/80')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
