import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api, ApiError } from '@/lib/mock/api';
import { STAGES_ALL, STAGE_LABEL, isStageTransitionAllowed } from '@/lib/labels';
import type { Lead, LeadStage } from '@/lib/mock/types';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';
import { STAGE_DOT } from '@/components/ui/badge';

/** Причины из /settings/lost-reasons (в превью — фикстура). */
const LOST_REASONS = ['Купил через другое агентство', 'Не устроила цена', 'Отложил покупку', 'Не выходит на связь'];

/** LostReasonDialog: причина обязательна до вызова API (правило CRM). */
export function LostReasonSheet({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = React.useState(''); const [custom, setCustom] = React.useState('');
  const [error, setError] = React.useState<string | null>(null); const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) { setReason(''); setCustom(''); setError(null); } }, [open]);
  const final = reason === 'other' ? custom.trim() : reason;
  const submit = async () => {
    if (!final) { setError('Выберите причину — без неё лид нельзя закрыть'); return; }
    setBusy(true); try { await onConfirm(final); onOpenChange(false); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Почему лид проигран?" description="Причина попадёт в отчёт по потерям." desktop="center" size="sm"
      footer={<><Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Отмена</Button><Button variant="destructive" className="flex-1" loading={busy} onClick={submit}>Закрыть лид</Button></>}>
      <div role="radiogroup" aria-label="Причина" className="space-y-2">
        {[...LOST_REASONS, 'other'].map((r) => (
          <button key={r} role="radio" aria-checked={reason === r} onClick={() => { setReason(r); setError(null); }}
            className={cn('flex min-h-[52px] w-full items-center gap-3 rounded-control border px-4 text-left text-[15px] transition-colors duration-tab', reason === r ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-2')}>
            <span className={cn('grid h-5 w-5 place-items-center rounded-full border-[1.5px]', reason === r ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>{reason === r && <Check className="h-3 w-3" strokeWidth={3} />}</span>
            {r === 'other' ? 'Другая причина' : r}
          </button>
        ))}
        {reason === 'other' && <Field label="Опишите причину" required>{(id) => <Textarea id={id} maxLength={500} value={custom} onChange={(e) => setCustom(e.target.value)} autoFocus />}</Field>}
        {error && <p role="alert" className="pt-1 text-[13px] text-danger-text">{error}</p>}
      </div>
    </Sheet>
  );
}

/** Смена этапа: недоступные переходы видны, но объяснены (WON только из «Переговоров»). Оптимистично + Undo. */
export function useStageMove() {
  const [lostFor, setLostFor] = React.useState<Lead | null>(null);
  const move = React.useCallback(async (lead: Lead, stage: LeadStage, lostReason?: string) => {
    if (stage === 'LOST' && !lostReason) { setLostFor(lead); return false; }
    try {
      const { prev } = await api.moveLead(lead.id, stage, lostReason);
      toast.success(`Этап: ${STAGE_LABEL[stage]}`, { action: { label: 'Отменить', onClick: () => { api.moveLead(lead.id, prev, prev === 'LOST' ? lead.lostReason : undefined).catch(() => {}); } } });
      return true;
    } catch (e) { toast.error((e as ApiError).message); return false; }
  }, []);
  const lostSheet = <LostReasonSheet open={!!lostFor} onOpenChange={(o) => !o && setLostFor(null)} onConfirm={async (r) => { if (lostFor) await move(lostFor, 'LOST', r); }} />;
  return { move, lostSheet };
}

export function StageSheet({ lead, open, onOpenChange, onPick }: { lead: Lead | null; open: boolean; onOpenChange: (o: boolean) => void; onPick: (s: LeadStage) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Этап лида" desktop="center" size="sm">
      <ul className="space-y-1">
        {STAGES_ALL.map((s) => {
          const current = lead?.stage === s; const allowed = lead ? isStageTransitionAllowed(lead.stage, s) : false;
          return (
            <li key={s}>
              <button disabled={!allowed && !current} onClick={() => { onOpenChange(false); if (!current) onPick(s); }}
                className={cn('flex min-h-[52px] w-full items-center gap-3 rounded-control px-3 text-left transition-colors', current ? 'bg-primary-soft' : 'hover:bg-surface-2', !allowed && !current && 'opacity-50')}>
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: STAGE_DOT[s] }} />
                <span className="flex-1 text-[15.5px] font-medium">{STAGE_LABEL[s]}</span>
                {current && <Check className="h-4 w-4 text-primary" aria-label="Текущий" />}
                {!allowed && !current && s === 'WON' && <span className="t-caption">после «Переговоров»</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
