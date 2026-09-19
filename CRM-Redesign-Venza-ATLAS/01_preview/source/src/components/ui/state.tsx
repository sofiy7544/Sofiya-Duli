import * as React from 'react';
import { RotateCw, type LucideIcon } from 'lucide-react';
import { Button } from './button';

/** Пустое состояние: сдержанная иконка, заголовок, одно предложение, одно действие. */
export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted-foreground"><Icon className="h-[22px] w-[22px]" aria-hidden /></span>
      <h2 className="t-h3">{title}</h2>
      <p className="t-caption mt-1 max-w-[30ch]">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Ошибка: что не получилось + Повторить. Навигация остаётся доступной. */
export function ErrorState({ error, onRetry, what = 'данные' }: { error: Error; onRetry: () => void; what?: string }) {
  return (
    <div role="alert" className="surface flex flex-col items-center border-danger/25 px-6 py-10 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger-text"><RotateCw className="h-[22px] w-[22px]" aria-hidden /></span>
      <h2 className="t-h3">Не удалось загрузить {what}</h2>
      <p className="t-caption mt-1 max-w-[34ch]">{error.message} Остальные разделы работают.</p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}><RotateCw aria-hidden />Повторить</Button>
    </div>
  );
}
