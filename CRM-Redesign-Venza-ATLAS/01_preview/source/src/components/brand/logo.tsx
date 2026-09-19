import { cn } from '@/lib/cn';

/**
 * On Top Property — векторная версия знака (5 граней «крыши») и словесного знака.
 * Грани тонируются от тёмной к светлой, как металл на оригинале; цвет берётся из currentColor,
 * поэтому знак работает на светлом (Venza, Светлая) и тёмном (ATLAS сайдбар) фоне.
 */
export const FACETS = [
  { id: 'left', d: 'M70 400 L305 400 L305 228 Z', shade: 1 },
  { id: 'midLow', d: 'M340 222 L535 348 L535 400 L340 400 Z', shade: 0.62 },
  { id: 'midHigh', d: 'M362 182 L535 56 L535 302 Z', shade: 0.72 },
  { id: 'bar', d: 'M575 92 L630 128 L630 400 L575 400 Z', shade: 0.55 },
  { id: 'right', d: 'M668 200 L940 400 L668 400 Z', shade: 0.4 },
] as const;

export function LogoMark({ className, animated, title = 'On Top Property' }: { className?: string; animated?: boolean; title?: string }) {
  return (
    <svg viewBox="60 40 890 372" className={cn('block', className)} role="img" aria-label={title}>
      <defs>
        <linearGradient id="otp-sheen" x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="otp-clip">{FACETS.map((f) => <path key={f.id} d={f.d} />)}</clipPath>
      </defs>
      {FACETS.map((f, i) => (
        <path key={f.id} d={f.d} fill="currentColor" fillOpacity={f.shade} className={animated ? 'otp-facet' : undefined} style={animated ? { animationDelay: `${160 + i * 110}ms` } : undefined} />
      ))}
      {animated && <g clipPath="url(#otp-clip)"><rect className="otp-sheen" x="-900" y="0" width="900" height="460" fill="url(#otp-sheen)" /></g>}
    </svg>
  );
}

/** Полный логотип: знак + ON TOP + PROPERTY. size — ширина словесного знака в px. */
export function Logo({ size = 220, className, animated, tone = 'ink' }: { size?: number; className?: string; animated?: boolean; tone?: 'ink' | 'light' }) {
  return (
    <div className={cn('inline-flex flex-col items-center', tone === 'light' ? 'text-white' : 'text-[hsl(var(--foreground))]', className)} style={{ width: size }}>
      <LogoMark animated={animated} className="w-[56%]" />
      <div className={cn('otp-word mt-[5%] overflow-hidden leading-none', animated && 'otp-word--animated')}>
        <span className="block font-[Montserrat,Inter,sans-serif] font-extrabold" style={{ fontSize: size * 0.205, letterSpacing: '-0.01em' }}>ON TOP</span>
      </div>
      <div className={cn('otp-sub mt-[3%] leading-none', animated && 'otp-sub--animated')}>
        <span className="block font-[Montserrat,Inter,sans-serif] font-semibold" style={{ fontSize: size * 0.088, letterSpacing: '0.42em', marginRight: '-0.42em' }}>PROPERTY</span>
      </div>
    </div>
  );
}

/** Компактный знак для сайдбара / топбара. */
export function LogoBadge({ className, tone = 'ink' }: { className?: string; tone?: 'ink' | 'light' }) {
  return <LogoMark className={cn('h-auto w-8', tone === 'light' ? 'text-white' : 'text-[hsl(var(--foreground))]', className)} />;
}
