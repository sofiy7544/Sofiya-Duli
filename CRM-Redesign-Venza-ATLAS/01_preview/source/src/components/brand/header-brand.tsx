import { cn } from '@/lib/cn';
import { BRAND } from '@/lib/brand';
import { Link, usePathname } from '@/lib/router';
import { LogoMark } from './logo';

/**
 * Знак агентства в шапке мобильных экранов.
 *
 * На телефоне сайдбара нет, и верхняя строка оставалась пустой: слева ничего,
 * справа пара иконок. Знак занимает это место и на каждом экране выглядит
 * одинаково — как в сайдбаре десктопа, поэтому на lg он скрыт (иначе бренд
 * дублировался бы).
 *
 * Только знак, без слов «On Top Property»: замер на 360–390 px показал, что
 * справа в шапке стоит до четырёх кнопок, и словесная часть обрезалась —
 * на «Сделках» от названия оставалось 25 px, на «Календаре» — половина.
 * Обрезка разная на каждом экране, а знак нужен одинаковый.
 *
 * compact — вариант для /today: там над заголовком ещё дата и крупное
 * приветствие, и знак в полный размер забирал бы у них высоту.
 */
export function HeaderBrand({ compact, className }: { compact?: boolean; className?: string }) {
  const home = usePathname() === '/today';
  const mark = <LogoMark title={BRAND.name} className={cn('text-foreground', compact ? 'w-[28px]' : 'w-[38px]')} />;
  // На самой «Сегодня» ссылка вела бы на текущую страницу — оставляем просто знак.
  if (home) return <span className={cn('flex items-center lg:hidden', className)}>{mark}</span>;
  return (
    <Link href="/today" aria-label={`${BRAND.name} — на главную`}
      className={cn('flex min-h-[44px] items-center pr-2 lg:hidden', className)}>
      {mark}
    </Link>
  );
}
