import { cn } from '@/lib/cn';
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) { return <div className={cn('skeleton', className)} style={style} aria-hidden />; }
/** Skeleton по форме строк списка — не спиннер на всю страницу. */
export function RowsSkeleton({ rows = 6, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <div role="status" aria-label="Загрузка" className="surface row-divider overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          {avatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5" style={{ width: `${55 + ((i * 17) % 30)}%` }} /><Skeleton className="h-3 w-1/3" /></div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
