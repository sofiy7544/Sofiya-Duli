'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { THEME_OPTIONS, type Theme } from '@/lib/theme/themes';
import { useTheme } from '@/components/theme-provider';

/**
 * Выбор из РОВНО 6 тем. Используется в Settings → Theme и внутри ThemeToggle.
 * radiogroup со стрелочной навигацией; статус выбора не только цветом (галочка + aria-checked).
 */
export function ThemePicker({ compact = false, onPicked }: { compact?: boolean; onPicked?: (t: Theme) => void }) {
  const t = useTranslations('themes');
  const { theme, setTheme, mounted } = useTheme();
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const select = (value: Theme) => {
    setTheme(value);
    onPicked?.(value);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const cols = compact ? 3 : THEME_OPTIONS.length;
    const delta = { ArrowRight: 1, ArrowDown: cols, ArrowLeft: -1, ArrowUp: -cols }[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = (index + delta + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={t('label')}
      className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-6')}
    >
      {THEME_OPTIONS.map((opt, i) => {
        const selected = mounted && theme === opt.value;
        const [bg, surface, accent] = opt.swatch;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!mounted && i === 0) ? 0 : -1}
            onClick={() => select(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'group relative flex min-h-touch flex-col items-center gap-2 rounded-control p-2 text-center',
              'outline-none transition-[background-color,box-shadow,transform] duration-tap ease-standard',
              'hover:bg-muted active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'bg-primary-soft',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'relative block aspect-[4/3] w-full overflow-hidden rounded-[calc(var(--radius-control)-4px)] border border-border',
                'shadow-soft transition-shadow duration-tab ease-standard',
                selected && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
              )}
              style={
                opt.value === 'system'
                  ? { background: `linear-gradient(135deg, ${bg} 0 50%, ${surface} 50% 100%)` }
                  : { background: bg }
              }
            >
              {opt.value !== 'system' && (
                <span
                  className="absolute inset-x-[18%] bottom-0 top-[30%] rounded-t-[6px]"
                  style={{ background: surface, boxShadow: '0 -1px 0 rgba(0,0,0,.04)' }}
                />
              )}
              <span
                className="absolute bottom-[14%] right-[14%] h-[22%] w-[22%] rounded-full"
                style={{ background: accent }}
              />
              {selected && (
                <span className="absolute left-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
              )}
            </span>
            <span className={cn('text-xs font-medium leading-tight', selected ? 'text-foreground' : 'text-muted-foreground')}>
              {t(opt.labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
