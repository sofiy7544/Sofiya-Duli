import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

/** Монограмма без фейковых фото. Оттенок стабильный по имени, приглушённый в Venza. */
const HUES = [150, 30, 210, 95, 340, 260, 190, 15];
export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  return (
    <span aria-hidden className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: `hsl(${hue} 28% 90%)`, color: `hsl(${hue} 32% 28%)` }}>
      {initials(name)}
    </span>
  );
}
