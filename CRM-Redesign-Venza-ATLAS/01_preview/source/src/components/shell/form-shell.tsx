import * as React from 'react';
import { useRouter } from '@/lib/router';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/sheet';

/**
 * Каркас формы создания и правки. По SCREEN-MAP у клиентских форм есть
 * правило: «Отмена» при несохранённых изменениях спрашивает подтверждение.
 * Здесь это общее поведение, чтобы оно не разъехалось между формами.
 */
export function useDirty<T>(initial: T) {
  const [value, setValue] = React.useState<T>(initial);
  const start = React.useRef(JSON.stringify(initial));
  React.useEffect(() => { start.current = JSON.stringify(initial); setValue(initial); }, [initial]);
  const dirty = JSON.stringify(value) !== start.current;
  const patch = React.useCallback((p: Partial<T>) => setValue((v) => ({ ...v, ...p })), []);
  return { value, setValue, patch, dirty };
}

export function FormShell({ title, subtitle, back, dirty, busy, submitLabel, onSubmit, children }: {
  title: string; subtitle?: string; back: string; dirty: boolean; busy?: boolean;
  submitLabel: string; onSubmit: () => void; children: React.ReactNode;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState(false);

  const leave = () => { if (dirty) setConfirm(true); else router.navigate(back); };

  /* Уход по системной кнопке «назад» тоже не должен терять введённое. */
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  return (
    <PageBody className="lg:max-w-[760px]">
      <PageHeader title={title} subtitle={subtitle} back={back} />
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="surface p-4 lg:p-5">
        {children}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={leave}>Отмена</Button>
          <Button type="submit" loading={busy}>{submitLabel}</Button>
        </div>
      </form>

      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Выйти без сохранения?"
        text="Введённое не сохранится. Вернуться к форме и продолжить?" confirmLabel="Выйти"
        onConfirm={() => { setConfirm(false); router.navigate(back); }} />
    </PageBody>
  );
}

/** Две колонки на десктопе, одна на телефоне — общий ритм для всех форм. */
export function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3.5 sm:grid-cols-2">{children}</div>;
}
export function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h2 className="t-h3 mb-3 text-[15px]">{title}</h2>
      {children}
    </section>
  );
}
