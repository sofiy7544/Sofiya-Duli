import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      /* Вид остаётся 48×28, но зона нажатия растянута до 44px по высоте —
         иначе в переключатель трудно попасть пальцем. */
      className={cn('relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-tab ease-standard',
        'before:absolute before:left-0 before:top-1/2 before:h-11 before:w-full before:-translate-y-1/2 before:content-[""]',
        checked ? 'bg-primary' : 'bg-muted-foreground/30')}>
      <span className={cn('absolute left-0.5 h-6 w-6 rounded-full bg-white shadow-soft transition-transform duration-tab ease-emphasized', checked && 'translate-x-5')} />
    </button>
  );
}

/** Круглый чекбокс задачи: галочка «прорисовывается», без прыжков. */
export function TaskCheck({ checked, onChange, label, busy }: { checked: boolean; onChange: () => void; label: string; busy?: boolean }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} data-checked={checked} onClick={onChange} disabled={busy}
      className="group grid h-11 w-11 shrink-0 place-items-center rounded-full -m-2">
      <span className={cn('grid h-[22px] w-[22px] place-items-center rounded-full border-[1.5px] transition-[background-color,border-color,transform] duration-tab ease-emphasized group-active:scale-90',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/45 group-hover:border-primary')}>
        <svg viewBox="0 0 16 16" className="check-draw h-3.5 w-3.5" aria-hidden><path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <Check className="hidden" />
      </span>
    </button>
  );
}
