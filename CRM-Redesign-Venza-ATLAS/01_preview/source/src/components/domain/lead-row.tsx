import { CalendarClock, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Link } from '@/lib/router';
import { store, users, shortName } from '@/lib/mock/store';
import { budget, relDay, time } from '@/lib/format';
import { leadUrgency, URGENCY_LABEL, URGENCY_TONE } from '@/lib/lead-urgency';
import { PURPOSE_LABEL, SOURCE_LABEL } from '@/lib/labels';
import type { Lead } from '@/lib/mock/types';
import { Avatar } from '@/components/ui/avatar';
import { PriorityMark, StageBadge, StatusBadge } from '@/components/ui/badge';

/** LeadRow (мобайл/список) и LeadCard (канбан). Данные: Lead + client + assignee из store. */
export function LeadRow({ lead, onActions, showStage }: { lead: Lead; onActions?: (l: Lead) => void; showStage?: boolean }) {
  const client = store.db.clients.find((c) => c.id === lead.clientId);
  const u = leadUrgency(lead);
  return (
    <div className="relative flex items-center">
      <Link href={`/leads/${lead.id}`} className="pressable flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-4 pr-14">
        <Avatar name={client?.fullName ?? '?'} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><span className="truncate text-[15.5px] font-semibold tracking-[-0.01em]">{client?.fullName}</span><PriorityMark priority={lead.priority} /></div>
          <div className="t-caption truncate">{budget(lead.budgetMin, lead.budgetMax, lead.budgetCurrency)}, {PURPOSE_LABEL[lead.purpose].toLowerCase()}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {showStage && <StageBadge stage={lead.stage} />}
            {u !== 'normal' && <StatusBadge tone={URGENCY_TONE[u]}>{URGENCY_LABEL[u]}</StatusBadge>}
            {lead.nextActionAt && <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" aria-hidden />{relDay(lead.nextActionAt)}, {time(lead.nextActionAt)}</span>}
          </div>
        </div>
      </Link>
      {onActions && <button onClick={() => onActions(lead)} aria-label={`Действия: ${client?.fullName}`} className="absolute right-2 grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-surface-2"><MoreHorizontal className="h-5 w-5" /></button>}
    </div>
  );
}

export function LeadCard({ lead, dragging }: { lead: Lead; dragging?: boolean }) {
  const client = store.db.clients.find((c) => c.id === lead.clientId);
  const ownerUser = lead.assignedUserId ? users.find((u) => u.id === lead.assignedUserId) : undefined;
  const owner = ownerUser ? shortName(ownerUser.fullName) : 'Не назначен';
  const u = leadUrgency(lead);
  return (
    <Link href={`/leads/${lead.id}`} draggable={false}
      className={cn('pressable surface block p-3 [:root[data-family=venza]_&]:p-3.5', dragging && 'drag-lift')}>
      <div className="flex items-start gap-2.5">
        <Avatar name={client?.fullName ?? '?'} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1"><span className="truncate text-[14px] font-semibold">{client?.fullName}</span><PriorityMark priority={lead.priority} /></div>
          <div className="truncate text-[12.5px] text-muted-foreground tabular">{budget(lead.budgetMin, lead.budgetMax, lead.budgetCurrency)}</div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
        <span className="truncate">{SOURCE_LABEL[lead.source]}</span><span className="truncate">{owner}</span>
      </div>
      {(lead.nextActionAt || u !== 'normal') && (
        <div className={cn('mt-2 flex items-center gap-1.5 rounded-[8px] px-2 py-1.5 text-[12px] font-medium', u === 'overdue' ? 'bg-danger/10 text-danger-text' : u === 'today' ? 'bg-warning/12 text-warning-text' : 'bg-surface-2 text-muted-foreground')}>
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />{lead.nextActionAt ? `${relDay(lead.nextActionAt)}, ${time(lead.nextActionAt)}` : URGENCY_LABEL[u]}
        </div>
      )}
    </Link>
  );
}
