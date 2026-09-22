import * as React from 'react';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { store } from '@/lib/mock/store';
import { EVENT_KIND_LABEL } from '@/lib/labels';
import { relDay, time } from '@/lib/format';
import { defaultDue, duePresets, toLocalInput } from '@/lib/due';
import type { CalendarEvent, EventKind } from '@/lib/mock/types';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented';
import { toast } from '@/components/ui/toast';

/**
 * EventDialog по SCREEN-MAP: создание события календаря и перенос существующего.
 *
 * Один лист на два случая. При переносе меняется только начало: длительность
 * событие уже знает, и спрашивать её второй раз незачем.
 *
 * Время — системным полем (barrel на iPhone), плюс те же пресеты, что у срока
 * задачи: см. lib/due.ts.
 */
const KINDS: EventKind[] = ['SHOWING', 'MEETING', 'CALL'];
const MINUTES = ['30', '60', '90'] as const;
type Minutes = (typeof MINUTES)[number];

export function EventFormSheet({ open, onOpenChange, move, kind: initialKind = 'SHOWING', clientId, propertyId, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  /** Перенос: событие, у которого меняем время. */
  move?: CalendarEvent | null;
  kind?: EventKind; clientId?: string; propertyId?: string;
  onDone?: () => void;
}) {
  const presets = React.useMemo(() => duePresets(), [open]);
  const clients = store.db.clients.filter((c) => !c.isArchived);
  const properties = store.db.properties.filter((p) => p.status !== 'SOLD');
  const [v, setV] = React.useState(() => ({
    kind: initialKind, title: '', at: toLocalInput(defaultDue(presets)), minutes: 60,
    clientId: clientId ?? '', propertyId: propertyId ?? '',
  }));
  const [errors, setErrors] = React.useState<{ title?: string; at?: string }>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setV(move
      ? { kind: move.kind, title: move.title, at: toLocalInput(move.startsAt), minutes: Math.max(15, Math.round((new Date(move.endsAt).getTime() - new Date(move.startsAt).getTime()) / 60_000)), clientId: move.clientId ?? '', propertyId: move.propertyId ?? '' }
      : { kind: initialKind, title: '', at: toLocalInput(defaultDue(presets)), minutes: 60, clientId: clientId ?? '', propertyId: propertyId ?? '' });
  }, [open, move, initialKind, clientId, propertyId, presets]);

  /* Название можно не писать: «Показ · Вилла с панорамой» собирается само. */
  const suggested = () => {
    const client = clients.find((c) => c.id === v.clientId);
    const property = properties.find((p) => p.id === v.propertyId);
    return [EVENT_KIND_LABEL[v.kind], property?.title ?? client?.fullName].filter(Boolean).join(' · ');
  };

  const iso = v.at && !Number.isNaN(new Date(v.at).getTime()) ? new Date(v.at).toISOString() : null;
  /* Пересечение по времени — предупреждение, а не запрет: бывает и намеренно. */
  const clash = iso ? store.db.events.find((e) => e.id !== move?.id && Math.abs(new Date(e.startsAt).getTime() - new Date(iso).getTime()) < 45 * 60_000) : undefined;

  const submit = async () => {
    const e: typeof errors = {};
    const title = (v.title.trim() || suggested()).trim();
    if (title.length < 3) e.title = 'Название — минимум 3 символа';
    if (!iso) e.at = 'Проверьте дату и время';
    setErrors(e);
    if (Object.keys(e).length || !iso) return;
    setBusy(true);
    try {
      if (move) {
        await api.moveEvent(move.id, iso);
        toast.success(`Перенесено на ${relDay(iso).toLowerCase()}, ${time(iso)}`);
      } else {
        await api.createEvent({ kind: v.kind, title, startsAt: iso, minutes: v.minutes, clientId: v.clientId || undefined, propertyId: v.propertyId || undefined });
        toast.success(`${EVENT_KIND_LABEL[v.kind]} в календаре: ${relDay(iso).toLowerCase()}, ${time(iso)}`);
      }
      onOpenChange(false);
      onDone?.();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} desktop="side" size="sm"
      title={move ? 'Перенести событие' : 'Новое событие'}
      description={move ? move.title : 'Показ, встреча или звонок. Появится в календаре и в сводке дня.'}
      footer={<><Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Отмена</Button>
        <Button className="flex-[2]" loading={busy} onClick={submit}>{move ? 'Перенести' : 'Создать'}</Button></>}>
      <div className="space-y-5">
        {!move && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">Тип</legend>
            <SegmentedControl<EventKind> label="Тип события" className="w-full" value={v.kind} onChange={(kind) => setV({ ...v, kind })}
              options={KINDS.map((k) => ({ value: k, label: EVENT_KIND_LABEL[k] }))} />
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium">Когда</legend>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const on = v.at === toLocalInput(p.at);
              return (
                <button key={p.k} type="button" aria-pressed={on} onClick={() => { setV({ ...v, at: toLocalInput(p.at) }); setErrors({ ...errors, at: undefined }); }}
                  className={cn('h-11 rounded-full border px-4 text-[14px] font-medium transition-colors duration-tab', on ? 'border-primary bg-primary-soft text-primary-text' : 'border-border bg-surface text-muted-foreground')}>{p.label}</button>
              );
            })}
          </div>
          <div className="mt-3">
            <Field label="или точное время" error={errors.at}>
              {(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.at} required type="datetime-local" value={v.at}
                onChange={(e) => { setV({ ...v, at: e.target.value }); setErrors({ ...errors, at: undefined }); }} />}
            </Field>
          </div>
          {clash && iso && (
            <p className="t-caption mt-2 flex items-center gap-1.5 text-warning-text">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />Рядом уже стоит «{clash.title}» в {time(clash.startsAt)}
            </p>
          )}
        </fieldset>

        {!move && (<>
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium">Длительность</legend>
            <SegmentedControl<Minutes> label="Длительность" className="w-full" value={String(v.minutes) as Minutes} onChange={(m) => setV({ ...v, minutes: Number(m) })}
              options={MINUTES.map((m) => ({ value: m, label: `${m} мин` }))} />
          </fieldset>

          <Field label="Клиент" hint="Событие попадёт в его историю">
            {(id) => (
              <Select id={id} value={v.clientId} onChange={(e) => setV({ ...v, clientId: e.target.value })}>
                <option value="">Без клиента</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </Select>
            )}
          </Field>

          <Field label="Объект">
            {(id) => (
              <Select id={id} value={v.propertyId} onChange={(e) => setV({ ...v, propertyId: e.target.value })}>
                <option value="">Без объекта</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            )}
          </Field>

          <Field label="Название" hint={`Если оставить пустым: «${suggested()}»`} error={errors.title}>
            {(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.title} value={v.title} maxLength={120}
              onChange={(e) => { setV({ ...v, title: e.target.value }); setErrors({ ...errors, title: undefined }); }} placeholder={suggested()} />}
          </Field>
        </>)}
      </div>
    </Sheet>
  );
}
