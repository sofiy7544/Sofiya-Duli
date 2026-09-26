import * as React from 'react';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import { tr } from '@/lib/i18n';

/** Формы для счётчика: «1 лид · 2 лида · 5 лидов». */
export const WORDS: Record<string, [string, string, string]> = {
  lead: [tr('лид'), tr('лида'), tr('лидов')],
  client: [tr('клиент'), tr('клиента'), tr('клиентов')],
  property: [tr('объект'), tr('объекта'), tr('объектов')],
  task: [tr('задача'), tr('задачи'), tr('задач')],
  deal: [tr('сделка'), tr('сделки'), tr('сделок')],
};
export type WordKey = keyof typeof WORDS;

/**
 * Конец списка, который показан не целиком: сколько видно, сколько всего,
 * и как показать ещё.
 *
 * Подгружает сама, когда до неё остаётся полэкрана — пальцем листать привычнее,
 * чем искать кнопку. Кнопка при этом настоящая: без неё список был бы недоступен
 * с клавиатуры и в режиме «уменьшить движение», где авто-подгрузку легко не заметить.
 *
 * Когда показывать нечего, не рисуется вовсе: подсказка, которая обещает
 * продолжение там, где его нет, — та же ложь, что и вечное затухание у края ряда.
 */
export function ShowMore({ more, total, shown, onMore, what, className }: {
  more: number; total: number; shown: number; onMore: () => void;
  /** Что считаем: формы слова берутся из WORDS. */
  what: WordKey; className?: string;
}) {
  const fire = React.useRef(onMore);
  fire.current = onMore;

  /* Ref-функция, а не эффект: узел появляется, только когда список дорисовался.
     Каждая новая порция подменяет узел, поэтому прежнего наблюдателя обязательно
     отключаем — иначе за долгую смену их накапливаются десятки на снятых узлах. */
  const observer = React.useRef<IntersectionObserver | null>(null);
  const sentinel = React.useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) fire.current(); }, { rootMargin: '400px 0px' });
    io.observe(el);
    observer.current = io;
  }, []);
  React.useEffect(() => () => observer.current?.disconnect(), []);

  if (more <= 0) return null;
  const step = Math.min(50, more);
  return (
    <div ref={sentinel} className={cn('flex flex-col items-center gap-2 py-4', className)}>
      <button type="button" onClick={onMore}
        className="min-h-[44px] rounded-full border border-border bg-surface px-5 text-[14.5px] font-medium text-foreground transition-colors duration-tab hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {tr('Показать ещё')} {step}
      </button>
      <p className="t-caption tabular">{tr('Показано')} {shown} {tr('из')} {total} {plural(total, ...WORDS[what])}</p>
    </div>
  );
}
