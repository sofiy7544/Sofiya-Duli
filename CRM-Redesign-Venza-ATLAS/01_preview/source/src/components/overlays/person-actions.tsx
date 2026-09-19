import * as React from 'react';
import { BellRing, PhoneCall, PhoneMissed, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { relDay, time } from '@/lib/format';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';

/** Пресеты перезвона / напоминания (как в PersonQuickActions CRM). */
function presets() {
  const at = (days: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const inH = (h: number) => { const d = new Date(Date.now() + h * 3_600_000); d.setMinutes(0, 0, 0); return d.toISOString(); };
  return [{ k: '1h', label: 'Через час', at: inH(1) }, { k: 'eve', label: 'Сегодня, 18:00', at: at(0, 18) }, { k: 'tmr', label: 'Завтра, 10:00', at: at(1, 10) }, { k: '3d', label: 'Через 3 дня', at: at(3, 10) }];
}
const toLocalInput = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

/** CallDispositionDialog: результат* (ответил / нет ответа / занято) + заметка + перезвон (пресет или точное время) → задача. */
export function CallDispositionSheet({ open, onOpenChange, clientId, leadId, name, phone }: { open: boolean; onOpenChange: (o: boolean) => void; clientId: string; leadId?: string; name: string; phone: string }) {
  const [outcome, setOutcome] = React.useState<'answered' | 'no_answer' | 'busy' | null>(null);
  const [note, setNote] = React.useState(''); const [preset, setPreset] = React.useState<string | null>(null); const [exact, setExact] = React.useState('');
  const [error, setError] = React.useState<string | null>(null); const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) { setOutcome(null); setNote(''); setPreset(null); setExact(''); setError(null); } }, [open]);
  const list = presets();
  const callbackAt = exact ? new Date(exact).toISOString() : list.find((p) => p.k === preset)?.at;
  const tiles = [
    { v: 'answered' as const, label: 'Ответил', icon: PhoneCall, cls: 'border-success/40 bg-success/12 text-success-text' },
    { v: 'no_answer' as const, label: 'Нет ответа', icon: PhoneMissed, cls: 'border-warning/40 bg-warning/12 text-warning-text' },
    { v: 'busy' as const, label: 'Занято', icon: PhoneOff, cls: 'border-border bg-surface-2 text-foreground' },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Итог звонка" description={`${name}, ${phone}`} desktop="center" size="sm"
      footer={<><Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Отмена</Button><Button className="flex-[2]" loading={busy} onClick={async () => {
        if (!outcome) { setError('Выберите результат звонка'); return; }
        setBusy(true); await api.logCall({ clientId, leadId, outcome, note: note.trim(), callbackAt }); setBusy(false); onOpenChange(false);
        toast.success(callbackAt ? `Звонок сохранён, перезвон ${relDay(callbackAt).toLowerCase()} в ${time(callbackAt)}` : 'Звонок сохранён');
      }}>Сохранить</Button></>}>
      <div className="space-y-5">
        <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex h-12 items-center justify-center gap-2 rounded-control bg-primary-soft text-[15px] font-semibold text-primary"><PhoneCall className="h-[18px] w-[18px]" aria-hidden />Позвонить {phone}</a>
        <fieldset><legend className="mb-2 text-[13px] font-medium">Результат<span className="text-danger-text">*</span></legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {tiles.map((t) => <button key={t.v} role="radio" aria-checked={outcome === t.v} onClick={() => { setOutcome(t.v); setError(null); }}
              className={cn('flex flex-col items-center gap-1.5 rounded-control border py-3 text-[13.5px] font-medium transition-[background-color,border-color,transform] duration-tab active:scale-[.97]', outcome === t.v ? t.cls : 'border-border bg-surface text-muted-foreground')}><t.icon className="h-5 w-5" aria-hidden />{t.label}</button>)}
          </div>
          {error && <p role="alert" className="mt-2 text-[13px] text-danger-text">{error}</p>}
        </fieldset>
        <Field label="Заметка">{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="О чём договорились" className="min-h-[80px]" />}</Field>
        <fieldset><legend className="mb-2 text-[13px] font-medium">Перезвонить</legend>
          <div className="flex flex-wrap gap-2">{list.map((p) => <button key={p.k} aria-pressed={preset === p.k && !exact} onClick={() => { setPreset(preset === p.k ? null : p.k); setExact(''); }} className={cn('h-10 rounded-full border px-3.5 text-[14px] font-medium', preset === p.k && !exact ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface')}>{p.label}</button>)}</div>
          <div className="mt-3"><Field label="или точное время">{(id) => <Input id={id} type="datetime-local" value={exact} onChange={(e) => { setExact(e.target.value); setPreset(null); }} />}</Field></div>
          {callbackAt && <p className="t-caption mt-2 flex items-center gap-1.5"><BellRing className="h-3.5 w-3.5" aria-hidden />Создастся задача «Перезвонить» на {relDay(callbackAt).toLowerCase()}, {time(callbackAt)}</p>}
        </fieldset>
      </div>
    </Sheet>
  );
}

/** Remind: пресеты + дата/время → PATCH nextActionAt. */
export function RemindSheet({ open, onOpenChange, leadId, current }: { open: boolean; onOpenChange: (o: boolean) => void; leadId: string; current?: string }) {
  const [value, setValue] = React.useState(''); const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) setValue(current ? toLocalInput(current) : ''); }, [open, current]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Напомнить" description="Время следующего действия по лиду." desktop="center" size="sm"
      footer={<><Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Отмена</Button><Button className="flex-[2]" disabled={!value} loading={busy} onClick={async () => { setBusy(true); const iso = new Date(value).toISOString(); await api.updateLead(leadId, { nextActionAt: iso }); setBusy(false); onOpenChange(false); toast.success(`Напомню ${relDay(iso).toLowerCase()} в ${time(iso)}`); }}>Сохранить</Button></>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">{presets().map((p) => <button key={p.k} aria-pressed={value === toLocalInput(p.at)} onClick={() => setValue(toLocalInput(p.at))} className={cn('h-10 rounded-full border px-3.5 text-[14px] font-medium', value === toLocalInput(p.at) ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface')}>{p.label}</button>)}</div>
        <Field label="Дата и время">{(id) => <Input id={id} type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />}</Field>
      </div>
    </Sheet>
  );
}
