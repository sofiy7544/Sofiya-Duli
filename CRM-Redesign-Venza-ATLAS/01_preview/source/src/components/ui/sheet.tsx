import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIsDesktop } from '@/lib/theme/provider';
import { Button } from './button';
import { tr } from '@/lib/i18n';

/**
 * PremiumSheet: снизу на мобиле (вес + контролируемая посадка, свайп вниз закрывает),
 * справа панелью на десктопе. Radix: focus trap, Esc, возврат фокуса.
 * Заменяет в CRM пару Sheet/SlideOver.
 */
export function Sheet({ open, onOpenChange, title, description, children, footer, desktop = 'side', size = 'md' }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode;
  desktop?: 'side' | 'center' | 'bottom'; size?: 'sm' | 'md' | 'lg';
}) {
  const isDesktop = useIsDesktop();
  const mode = isDesktop ? desktop : 'bottom';
  const [drag, setDrag] = React.useState(0);
  const start = React.useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => { if (mode !== 'bottom') return; start.current = e.clientY; (e.target as HTMLElement).setPointerCapture(e.pointerId); };
  const onPointerMove = (e: React.PointerEvent) => { if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current)); };
  const onPointerUp = () => { if (start.current === null) return; start.current = null; if (drag > 110) onOpenChange(false); setDrag(0); };

  const width = { sm: 'lg:w-[420px]', md: 'lg:w-[520px]', lg: 'lg:w-[680px]' }[size];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-scrim/[var(--scrim-opacity)] data-[state=open]:animate-scrim-in data-[state=closed]:animate-[crm-scrim-in_var(--motion-toast-out)_var(--ease-exit)_reverse_both]" />
        <Dialog.Content
          aria-describedby={description ? undefined : undefined}
          onOpenAutoFocus={(e) => { if (!isDesktop) e.preventDefault(); }}
          className={cn(
            'fixed z-[71] flex max-w-[100vw] flex-col overflow-hidden bg-surface text-foreground outline-none',
            mode === 'bottom' && 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-sheet shadow-lift data-[state=open]:animate-sheet-up data-[state=closed]:animate-sheet-down',
            mode === 'side' && cn('bottom-3 right-3 top-3 w-[calc(100%-1.5rem)] rounded-modal border border-border shadow-lift data-[state=open]:animate-[side-in_var(--motion-sheet)_var(--ease-emphasized)_both] data-[state=closed]:animate-[side-out_var(--motion-toast-out)_var(--ease-exit)_both]', width),
            mode === 'center' && cn('left-1/2 top-[12vh] max-h-[76vh] w-[calc(100%-2rem)] -translate-x-1/2 rounded-modal border border-border shadow-lift data-[state=open]:animate-pop-in', width),
          )}
          style={drag ? { transform: `translate3d(0, ${drag}px, 0)`, transition: 'none' } : undefined}
        >
          {mode === 'bottom' && (
            <div className="flex touch-none justify-center pb-1 pt-2.5" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
              <span aria-hidden className="h-1 w-10 rounded-full bg-border" />
            </div>
          )}
          <div className={cn('flex items-start gap-3 px-5', mode === 'bottom' ? 'pb-3 pt-2' : 'pb-3 pt-5')}>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="t-h2">{title}</Dialog.Title>
              {description ? <Dialog.Description className="t-caption mt-1">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="iconSm" aria-label={tr('Закрыть')} className="-mr-2 -mt-1 text-muted-foreground"><X /></Button></Dialog.Close>
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-5 [&>*]:min-w-0">{children}</div>
          {footer && <div className="flex gap-2.5 border-t border-border/70 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Подтверждение опасного действия: разрушительная кнопка изолирована справа, фокус по умолчанию на «Отмена». */
export function ConfirmDialog({ open, onOpenChange, title, text, confirmLabel, onConfirm, tone = 'danger', busy }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; text: string; confirmLabel: string; onConfirm: () => void; tone?: 'danger' | 'primary'; busy?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-scrim/[var(--scrim-opacity)] data-[state=open]:animate-scrim-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2.5rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-modal border border-border bg-surface p-6 shadow-lift data-[state=open]:animate-pop-in">
          <Dialog.Title className="t-h2">{title}</Dialog.Title>
          <Dialog.Description className="t-caption mt-2 text-[14px] leading-5">{text}</Dialog.Description>
          <div className="mt-6 flex gap-2.5">
            <Dialog.Close asChild><Button variant="outline" className="flex-1" autoFocus>{tr('Отмена')}</Button></Dialog.Close>
            <Button variant={tone === 'danger' ? 'destructive' : 'default'} className="flex-1" loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
