import * as React from 'react';

/**
 * Затухание у края листаемого вбок ряда.
 *
 * Фишки этапов обрезались ровно по краю экрана и читались как целые: понять,
 * что ряд продолжается, было неоткуда. Затухание убирает «стену» — надрезанная
 * фишка видна именно надрезанной.
 *
 * Подсказка должна быть честной, иначе она превращается в украшение:
 *  — нет переполнения (всё влезло, обычно десктоп) — затухания нет совсем;
 *  — долистали до конца — гаснет с той стороны, где листать больше нечего.
 *
 * Состояние отдаётся в `data-fade`, рисует его CSS (styles/app.css): так ни один
 * кадр прокрутки не проходит через React.
 */
export function useHScrollFade<T extends HTMLElement>() {
  const detach = React.useRef<(() => void) | null>(null);

  /* Ref-функция, а не useRef+useEffect: ряд появляется не сразу — сначала
     скелетон, и эффект с пустыми зависимостями успевал отработать раньше,
     когда узла ещё не было, и больше не повторялся. */
  return React.useCallback((el: T | null) => {
    detach.current?.();
    detach.current = null;
    if (!el) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const left = max > 2 && el.scrollLeft > 2;
      const right = max > 2 && el.scrollLeft < max - 2;
      const state = left && right ? 'both' : left ? 'left' : right ? 'right' : null;
      if (state) el.setAttribute('data-fade', state); else el.removeAttribute('data-fade');
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    // Ширина ряда меняется от поворота экрана, а его содержимое — когда приходят
    // данные (счётчики у фишек). Первое ловит ResizeObserver, второе — Mutation.
    const ro = new ResizeObserver(update); ro.observe(el);
    const mo = new MutationObserver(update); mo.observe(el, { childList: true, subtree: true, characterData: true });
    detach.current = () => { el.removeEventListener('scroll', update); ro.disconnect(); mo.disconnect(); };
  }, []);
}
