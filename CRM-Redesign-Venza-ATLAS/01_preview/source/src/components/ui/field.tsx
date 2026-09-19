import * as React from 'react';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Поле с видимой подписью, связанной с input (id), ошибкой и успехом. Ошибка никогда не «трясёт» поле. */
type FieldProps = { label: string; hint?: string; error?: string | null; success?: string | null; required?: boolean; children: (id: string, describedBy?: string) => React.ReactNode; className?: string };

export function Field({ label, hint, error, success, required, children, className }: FieldProps) {
  const id = React.useId();
  const msgId = `${id}-msg`;
  const msg = error || success || hint;
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-foreground">
        {label}{required && <span className="ml-0.5 text-danger-text" aria-hidden>*</span>}
      </label>
      {children(id, msg ? msgId : undefined)}
      {msg && (
        <p id={msgId} className={cn('flex items-center gap-1.5 text-[12.5px]', error ? 'text-danger-text' : success ? 'text-success-text' : 'text-muted-foreground')} role={error ? 'alert' : undefined}>
          {error && <AlertCircle className="h-3.5 w-3.5" aria-hidden />}{success && !error && <Check className="h-3.5 w-3.5" aria-hidden />}{msg}
        </p>
      )}
    </div>
  );
}

const control = 'block w-full min-w-0 max-w-full rounded-control border bg-surface text-foreground placeholder:text-muted-foreground/80 transition-[border-color,box-shadow] duration-tab ease-standard focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px_hsl(var(--primary)/.12)] disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-[0_0_0_4px_hsl(var(--danger)/.1)]';
const height = 'h-12 px-3.5 text-[16px] lg:text-[15px] [:root[data-family=atlas]_&]:h-11 [:root[data-family=atlas]_&]:lg:h-10 [:root[data-family=atlas]_&]:lg:text-sm';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...p }, ref) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, height, 'border-input', className)} {...p} />;
  },
);
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...p }, ref) {
    return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(control, 'min-h-[96px] resize-y border-input px-3.5 py-3 text-[16px] leading-6 lg:text-[15px]', className)} {...p} />;
  },
);
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...p }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={cn(control, height, 'appearance-none border-input pr-10', className)} {...p}>{children}</select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </div>
    );
  },
);
