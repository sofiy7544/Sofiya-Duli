import * as React from 'react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme/provider';

/** Фото объектов агентства (src/assets/photos, порядок = индекс art). Процедурные сцены — только запасной вариант. */
const PHOTO_MODULES = import.meta.glob('/src/assets/photos/*.jpg', { eager: true, import: 'default' }) as Record<string, string>;
export const PHOTOS: string[] = Object.keys(PHOTO_MODULES).sort().map((k) => PHOTO_MODULES[k]);

/**
 * Заглушка медиа объекта. В CRM заменить на BlurImage (url + blurhash + width/height из /api/uploads/media).
 * Props совместимы: aspect, className, priority. `art` — индекс сцены вместо url.
 */
const SCENES = [
  { sky: ['#F3D9B1', '#CFE0E6'], sea: '#7FA5B5', wall: '#F1E7D6', roof: '#B9785A', green: '#5E7355', kind: 'villa' },
  { sky: ['#DCE8EE', '#F6EEDF'], sea: '#6F98AD', wall: '#FBF7EF', roof: '#8D9A8B', green: '#6B7F5C', kind: 'interior' },
  { sky: ['#CFE3EC', '#EEF3F1'], sea: '#5E8FA8', wall: '#E9E2D6', roof: '#6E7D8A', green: '#5D7458', kind: 'tower' },
  { sky: ['#F5DFC4', '#E8D7C8'], sea: '#8BA7AE', wall: '#E7C9A5', roof: '#A5603E', green: '#6E7B4E', kind: 'oldtown' },
  { sky: ['#E6EEF0', '#F9F4EA'], sea: '#88A9B6', wall: '#F4F1EA', roof: '#3F4B45', green: '#63775B', kind: 'shop' },
  { sky: ['#F7E3C5', '#F2EBDF'], sea: '#7DA0B0', wall: '#EFE3CD', roof: '#C08658', green: '#72835B', kind: 'terrace' },
  { sky: ['#EAD9C0', '#DDE5DA'], sea: '#90A79C', wall: '#D9C7A7', roof: '#8C6A4B', green: '#57683F', kind: 'olive' },
  { sky: ['#D6E4EA', '#F1ECE2'], sea: '#557F98', wall: '#F6F3EC', roof: '#2F3A40', green: '#5A6E55', kind: 'penthouse' },
] as const;

function Scene({ art }: { art: number }) {
  const s = SCENES[art % SCENES.length];
  const id = `g${art}`;
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.sky[0]} /><stop offset="1" stopColor={s.sky[1]} /></linearGradient>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={s.wall} /><stop offset="1" stopColor={s.wall} stopOpacity=".82" /></linearGradient>
        <radialGradient id={`${id}l`} cx=".78" cy=".18" r=".6"><stop offset="0" stopColor="#FFF7E6" stopOpacity=".9" /><stop offset="1" stopColor="#FFF7E6" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}v`} x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#1C211D" stopOpacity=".28" /></linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#${id}s)`} />
      <rect width="400" height="260" fill={`url(#${id}l)`} />
      {s.kind !== 'interior' && <rect y="150" width="400" height="40" fill={s.sea} opacity=".85" />}
      {s.kind !== 'interior' && <path d="M0 152 C 90 146 160 156 250 150 S 360 148 400 152 V 160 H0Z" fill="#fff" opacity=".18" />}
      {s.kind === 'villa' && (<g>
        <path d="M0 190 Q120 168 400 186 V260 H0Z" fill={s.green} opacity=".9" />
        <rect x="120" y="112" width="170" height="70" rx="2" fill={`url(#${id}w)`} />
        <rect x="150" y="84" width="96" height="36" rx="2" fill={s.wall} />
        <path d="M112 114 H298 L290 106 H120Z" fill={s.roof} />
        {[138, 176, 214, 252].map((x) => <rect key={x} x={x} y="132" width="22" height="30" rx="1" fill="#6E8C99" opacity=".75" />)}
        {[166, 204].map((x) => <rect key={x} x={x} y="92" width="20" height="20" rx="1" fill="#6E8C99" opacity=".7" />)}
        <rect x="104" y="180" width="200" height="8" fill="#9FC3CC" />
        <path d="M60 196 C 58 150 64 120 66 96 C 70 124 74 150 72 196Z" fill="#3F5140" />
        <path d="M330 196 C 328 160 334 136 336 116 C 340 138 344 160 342 196Z" fill="#3F5140" />
      </g>)}
      {s.kind === 'interior' && (<g>
        <rect width="400" height="260" fill="#EFE7DA" />
        <rect x="40" y="30" width="190" height="140" rx="3" fill={`url(#${id}s)`} />
        <rect x="40" y="110" width="190" height="30" fill={s.sea} opacity=".8" />
        <path d="M135 30 V170 M40 100 H230" stroke="#fff" strokeWidth="5" />
        <rect y="196" width="400" height="64" fill="#D8C8AE" />
        <rect x="236" y="148" width="130" height="40" rx="10" fill="#B7A58A" /><rect x="244" y="126" width="114" height="30" rx="10" fill="#C9B89C" />
        <circle cx="300" cy="60" r="16" fill="#F7E8C8" /><path d="M300 76 V120" stroke="#8C7A5F" strokeWidth="2" />
        <path d="M64 196 C 60 180 70 170 78 176 C 86 160 100 170 96 186 L92 196Z" fill={s.green} />
      </g>)}
      {s.kind === 'tower' && (<g>
        <path d="M0 196 Q200 180 400 196 V260 H0Z" fill={s.green} />
        <rect x="150" y="50" width="100" height="146" fill={`url(#${id}w)`} />
        {Array.from({ length: 7 }).map((_, r) => <rect key={r} x="150" y={62 + r * 19} width="100" height="3" fill={s.roof} opacity=".45" />)}
        <rect x="250" y="96" width="60" height="100" fill={s.wall} opacity=".9" /><rect x="96" y="112" width="54" height="84" fill={s.wall} opacity=".75" />
      </g>)}
      {s.kind === 'oldtown' && (<g>
        {[[20, 90, 70], [86, 70, 64], [146, 100, 58], [200, 60, 76], [270, 84, 62], [326, 74, 74]].map(([x, y, w], i) => (
          <g key={i}><rect x={x} y={y} width={w} height={200 - y} fill={i % 2 ? s.wall : '#E2B890'} />
            <path d={`M${x - 3} ${y} H${x + w + 3} L${x + w / 2} ${y - 16}Z`} fill={s.roof} />
            {[0, 1].map((k) => <rect key={k} x={x + 12 + k * 26} y={y + 20} width="12" height="18" fill="#6C8791" opacity=".6" />)}</g>))}
        <rect y="196" width="400" height="64" fill="#C9B18E" />
      </g>)}
      {s.kind === 'shop' && (<g>
        <rect y="190" width="400" height="70" fill="#D8CDBB" />
        <rect x="60" y="70" width="280" height="124" fill={`url(#${id}w)`} />
        <rect x="60" y="70" width="280" height="22" fill={s.roof} />
        {[80, 176, 272].map((x) => <rect key={x} x={x} y="108" width="52" height="86" fill="#8FAAB4" opacity=".6" />)}
        <path d="M60 92 H340 L330 104 H70Z" fill="#F4EEE2" opacity=".7" />
      </g>)}
      {s.kind === 'terrace' && (<g>
        <rect y="176" width="400" height="84" fill="#E6D6BC" />
        <rect x="0" y="168" width="400" height="10" fill="#FFFFFF" opacity=".85" />
        {Array.from({ length: 16 }).map((_, i) => <rect key={i} x={i * 26} y="140" width="3" height="30" fill="#FFFFFF" opacity=".9" />)}
        <rect x="0" y="138" width="400" height="4" fill="#FFFFFF" />
        <path d="M300 176 C 292 120 318 96 330 70 C 338 100 360 124 348 176Z" fill={s.green} />
        <rect x="80" y="196" width="90" height="10" rx="5" fill="#B58D66" /><rect x="96" y="206" width="6" height="26" fill="#9C7A58" /><rect x="148" y="206" width="6" height="26" fill="#9C7A58" />
      </g>)}
      {s.kind === 'olive' && (<g>
        <path d="M0 176 Q200 150 400 178 V260 H0Z" fill="#B7A777" />
        <rect x="150" y="110" width="130" height="70" fill={s.wall} /><path d="M140 112 H290 L215 80Z" fill={s.roof} />
        <rect x="200" y="140" width="24" height="40" fill="#7B6147" />
        {[[50, 150], [110, 170], [320, 156], [370, 176]].map(([x, y], i) => (<g key={i}><rect x={x - 3} y={y} width="6" height="26" fill="#6A5842" /><ellipse cx={x} cy={y - 8} rx="34" ry="22" fill={s.green} opacity=".92" /></g>))}
      </g>)}
      {s.kind === 'penthouse' && (<g>
        <rect y="186" width="400" height="74" fill="#C8CFCB" />
        <rect x="40" y="96" width="320" height="92" fill={`url(#${id}w)`} />
        <rect x="40" y="96" width="320" height="10" fill={s.roof} />
        {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={56 + i * 50} y="118" width="38" height="64" fill="#7C9DAE" opacity=".62" />)}
        <rect x="30" y="182" width="340" height="6" fill="#FFFFFF" />
      </g>)}
      <rect width="400" height="260" fill={`url(#${id}v)`} />
    </svg>
  );
}

export function PropertyMedia({ art, className, aspect = '4/3', parallax, children, rounded = true }: {
  art: number; className?: string; aspect?: string; parallax?: boolean; children?: React.ReactNode; rounded?: boolean;
}) {
  const { family, reducedMotion } = useTheme();
  const ref = React.useRef<HTMLDivElement>(null);
  const inner = React.useRef<HTMLDivElement>(null);
  const enabled = parallax && family === 'venza' && !reducedMotion;

  React.useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect(); if (!r || !inner.current) return;
        const y = Math.max(-14, Math.min(14, (r.top + r.height / 2 - innerHeight / 2) * -0.05)); // ≤ 14px (§4.6)
        inner.current.style.transform = `translate3d(0, ${y}px, 0) scale(1.08)`;
      });
    };
    onScroll(); addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [enabled]);

  return (
    <div ref={ref} className={cn('relative overflow-hidden bg-surface-2', rounded && 'rounded-card', className)} style={{ aspectRatio: aspect }}>
      <div ref={inner} data-parallax={enabled || undefined} className="absolute inset-0 will-change-transform" style={enabled ? { transform: 'scale(1.08)' } : undefined}>
        {PHOTOS.length ? <img src={PHOTOS[art % PHOTOS.length]} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" /> : <Scene art={art} />}
      </div>
      {children}
    </div>
  );
}
