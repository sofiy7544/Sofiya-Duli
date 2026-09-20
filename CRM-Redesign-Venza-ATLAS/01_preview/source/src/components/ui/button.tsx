import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Совместим с ui/button.tsx CRM: variant (default|outline|ghost|link|destructive|glass), size (default|sm|lg|icon|iconSm), asChild не нужен в превью.
 * Добавлено: variant 'soft', prop loading (раньше вызывающие вставляли Loader2 вручную).
 */
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'glass' | 'soft';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'iconSm';
  loading?: boolean;
};

const VARIANT: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-primary text-primary-foreground shadow-soft hover:brightness-[1.06] active:brightness-95',
  outline: 'border border-border bg-surface text-foreground shadow-soft hover:bg-surface-2',
  ghost: 'text-foreground hover:bg-muted',
  link: 'text-primary underline-offset-4 hover:underline px-0 h-auto',
  destructive: 'bg-danger text-white shadow-soft hover:brightness-105',
  glass: 'material border border-[var(--glass-border)] text-foreground',
  soft: 'bg-primary-soft text-primary-text hover:brightness-[.98]',
};
const SIZE: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-12 px-5 text-[15px] lg:h-11',
  sm: 'h-11 px-3.5 text-sm lg:h-9',
  lg: 'h-14 px-6 text-base',
  icon: 'h-11 w-11',
  iconSm: 'h-11 w-11 lg:h-9 lg:w-9',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'default', loading, className, children, disabled, ...props }, ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold tracking-[-0.01em]',
        'transition-[transform,filter,background-color,box-shadow] duration-tap ease-standard active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        '[&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0',
        VARIANT[variant], SIZE[size], (size === 'icon' || size === 'iconSm') && 'px-0', className,
      )}
      {...props}
    >
      {loading && <Loader2 className="absolute animate-spin" aria-hidden />}
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>{children}</span>
    </button>
  );
});

/** Иконка-кнопка всегда с доступной подписью. */
export const IconButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'size'> & { label: string; size?: 'icon' | 'iconSm' }>(
  function IconButton({ label, variant = 'ghost', size = 'icon', ...p }, ref) {
    return <Button ref={ref} aria-label={label} title={label} variant={variant} size={size} {...p} />;
  },
);
