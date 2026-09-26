import * as React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Тосты: вход / удержание / выход. API как у sonner: toast.success / error / message (+ action Undo). */
type T = { id: number; kind: 'success' | 'error' | 'info'; text: string; action?: { label: string; onClick: () => void }; leaving?: boolean };
let items: T[] = []; const subs = new Set<() => void>(); let n = 0;
const emit = () => subs.forEach((s) => s());
function push(kind: T['kind'], text: string, action?: T['action']) {
  const id = ++n; items = [...items.slice(-2), { id, kind, text, action }]; emit();
  setTimeout(() => dismiss(id), action ? 5000 : 3200);
}
function dismiss(id: number) {
  items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t)); emit();
  setTimeout(() => { items = items.filter((t) => t.id !== id); emit(); }, 200);
}
export const toast = {
  success: (t: string, o?: { action?: T['action'] }) => push('success', t, o?.action),
  error: (t: string) => push('error', t),
  message: (t: string, o?: { action?: T['action'] }) => push('info', t, o?.action),
};

export function Toaster() {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => { subs.add(force); return () => { subs.delete(force); }; }, []);
  return (
    /* На телефоне тост поднят выше FAB: на 84 px он ложился ровно на кнопку «Создать»,
       и пока тост висел (3–5 с), тап по кнопке уходил в него. 152 px = 88 (низ FAB
       у venza) + 56 (высота) + 8. */
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+152px)] z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:right-6 lg:left-auto lg:items-end">
      {items.map((t) => {
        const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info;
        return (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn('pointer-events-auto flex w-full max-w-[380px] items-center gap-3 rounded-2xl bg-foreground py-3 pl-4 pr-2 text-[14px] text-background shadow-lift', t.leaving ? 'toast-out' : 'toast-in')}>
            <Icon className={cn('h-[18px] w-[18px] shrink-0', t.kind === 'error' ? 'text-[hsl(0_85%_75%)]' : t.kind === 'success' ? 'text-[hsl(145_55%_70%)]' : 'opacity-70')} aria-hidden />
            <span className="flex-1 leading-5">{t.text}</span>
            {t.action && <button className="h-11 rounded-xl px-3 text-[13.5px] font-semibold hover:bg-background/10 lg:h-9" onClick={() => { t.action!.onClick(); dismiss(t.id); }}>{t.action.label}</button>}
          </div>
        );
      })}
    </div>
  );
}
