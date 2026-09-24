import * as React from 'react';

/**
 * Список порциями.
 *
 * Экраны рисовали все строки сразу. На нынешних сорока лидах это незаметно,
 * а на объёме за год списки открывались 6–8 секунд и держали под сотню тысяч
 * узлов DOM: прогон агентства из 40 человек показал ровный рост от 0,85 с при
 * 44 лидах до 6,4 с при пяти тысячах. Порция в 50 строк делает время открытия
 * постоянным — mock-API и так отдаёт `Paginated` с `pageSize: 50`.
 *
 * Сколько строк уже показано, помним по ключу экрана и фильтра. Иначе возврат
 * из карточки ломался бы дважды: список схлопывался к первым пятидесяти, и
 * восстановление прокрутки (lib/router.tsx) упиралось в короткую страницу.
 */
const CHUNK = 50;
const shownMemory = new Map<string, number>();

export function useChunked<T>(items: T[], key: string, chunk = CHUNK) {
  const [shown, setShown] = React.useState(() => shownMemory.get(key) ?? chunk);

  // Сменили фильтр или вкладку — это другой список: начинаем с его собственной позиции.
  React.useEffect(() => { setShown(shownMemory.get(key) ?? chunk); }, [key, chunk]);
  React.useEffect(() => { shownMemory.set(key, shown); }, [key, shown]);

  const visible = React.useMemo(() => (items.length > shown ? items.slice(0, shown) : items), [items, shown]);
  const more = Math.max(0, items.length - visible.length);
  const loadMore = React.useCallback(() => setShown((s) => s + chunk), [chunk]);

  return { visible, more, total: items.length, loadMore };
}
