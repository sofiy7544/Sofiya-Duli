import * as React from 'react';
import { CalendarCheck, CheckSquare, Eye, Phone, Plus, StickyNote, Workflow } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { useResource } from '@/lib/use-resource';
import { ago, relDay, time } from '@/lib/format';
import { users } from '@/lib/mock/store';
import type { Activity, ActivityType } from '@/lib/mock/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state';
import { toast } from '@/components/ui/toast';

const ICON: Record<ActivityType, typeof Phone> = { CALL: Phone, NOTE: StickyNote, STAGE: Workflow, SHOWING: Eye, TASK: CheckSquare, CREATED: CalendarCheck };
const TYPE_LABEL: Record<ActivityType, string> = { CALL: 'Звонок', NOTE: 'Заметка', STAGE: 'Этап', SHOWING: 'Показ', TASK: 'Задача', CREATED: 'Создан' };

/** ActivityTimeline: /api/activities/lead/:id или client/:id, группировка по дням. */
export function ActivityTimeline({ clientId, leadId }: { clientId?: string; leadId?: string }) {
  const r = useResource(() => api.activities({ clientId, leadId }), [clientId, leadId]);
  if (r.error) return <ErrorState error={r.error} onRetry={r.retry} what="историю" />;
  if (r.loading) return <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="flex gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3.5 w-4/5" /></div></div>)}</div>;
  if (!r.data?.length) return <p className="t-caption py-6 text-center">История пока пустая. Первая заметка появится здесь.</p>;
  const groups = r.data.reduce<Record<string, Activity[]>>((acc, a) => { const k = relDay(a.at); (acc[k] ||= []).push(a); return acc; }, {});
  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([day, items]) => (
        <section key={day}>
          <h4 className="t-micro mb-2">{day}</h4>
          <ol className="space-y-1">
            {items.map((a, i) => { const Icon = ICON[a.type]; return (
              <li key={a.id} className="relative flex gap-3 pb-3">
                {i < items.length - 1 && <span aria-hidden className="absolute bottom-0 left-[17px] top-10 w-px bg-border" />}
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', a.type === 'STAGE' ? 'bg-primary-soft text-primary-text' : 'bg-surface-2 text-muted-foreground')}><Icon className="h-4 w-4" aria-hidden /></span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-baseline gap-2"><span className="text-[13.5px] font-semibold">{TYPE_LABEL[a.type]}</span><span className="t-caption tabular">{time(a.at)}</span><span className="t-caption ml-auto truncate">{users.find((u) => u.id === a.userId)?.fullName.split(' ')[0]}</span></div>
                  <p className="mt-0.5 text-[14.5px] leading-[21px]">{a.text}</p>
                </div>
              </li>); })}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** Быстрая заметка. В CRM рядом VoiceRecorder — место под кнопку оставлено. */
export function NoteComposer({ clientId, leadId }: { clientId: string; leadId?: string }) {
  const [text, setText] = React.useState(''); const [busy, setBusy] = React.useState(false); const [open, setOpen] = React.useState(false);
  if (!open) return <Button variant="outline" className="w-full" onClick={() => setOpen(true)}><Plus />Добавить заметку</Button>;
  return (
    <div className="surface p-3">
      <label className="sr-only" htmlFor="note">Заметка</label>
      <Textarea id="note" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Что обсудили, о чём договорились" className="border-0 !shadow-none focus:!shadow-none" />
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setText(''); }}>Отмена</Button>
        <Button size="sm" loading={busy} disabled={!text.trim()} onClick={async () => { setBusy(true); await api.addNote(clientId, text.trim(), leadId); setBusy(false); setText(''); setOpen(false); toast.success('Заметка сохранена'); }}>Сохранить</Button>
      </div>
    </div>
  );
}

export const ago_ = ago;
