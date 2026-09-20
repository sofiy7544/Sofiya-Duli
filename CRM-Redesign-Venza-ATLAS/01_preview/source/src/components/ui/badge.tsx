import * as React from 'react';
import { Flame, Snowflake, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { LeadStage, Priority, PropertyStatus } from '@/lib/mock/types';
import { PRIORITY_LABEL, PROPERTY_STATUS_LABEL, STAGE_LABEL } from '@/lib/labels';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
const TONE: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-soft text-primary-text',
  success: 'bg-success/12 text-success-text',
  warning: 'bg-warning/14 text-warning-text',
  danger: 'bg-danger/10 text-danger-text',
  info: 'bg-info/10 text-info-text',
  accent: 'bg-accent/15 text-foreground',
};

/** Статус никогда не только цветом: всегда текст (+ точка). */
export function StatusBadge({ tone = 'neutral', children, dot, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium leading-none', TONE[tone], className)}>
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}{children}
    </span>
  );
}

export const STAGE_TONE: Record<LeadStage, Tone> = { NEW: 'info', CONTACTED: 'primary', QUALIFIED: 'warning', SELECTION: 'accent', SHOWING: 'primary', NEGOTIATION: 'warning', WON: 'success', LOST: 'danger' };
/** Цвет точки стадии — из токенов семьи (ATLAS: мягкие поверхности --at-stage-*). */
export const STAGE_DOT: Record<LeadStage, string> = {
  NEW: 'hsl(var(--info))', CONTACTED: 'hsl(var(--primary))', QUALIFIED: 'hsl(var(--warning))', SELECTION: 'hsl(var(--accent))',
  SHOWING: 'hsl(var(--primary) / .7)', NEGOTIATION: 'hsl(var(--warning) / .8)', WON: 'hsl(var(--success))', LOST: 'hsl(var(--danger))',
};
export function StageBadge({ stage }: { stage: LeadStage }) { return <StatusBadge tone={STAGE_TONE[stage]} dot>{STAGE_LABEL[stage]}</StatusBadge>; }

const PRIORITY_ICON = { hot: Flame, warm: Sun, cold: Snowflake } as const;
const PRIORITY_CLASS: Record<Priority, string> = { hot: 'text-danger-text', warm: 'text-warning-text', cold: 'text-info-text' };
export function PriorityMark({ priority, withLabel }: { priority: Priority; withLabel?: boolean }) {
  const Icon = PRIORITY_ICON[priority];
  return (
    <span className={cn('relative inline-flex items-center gap-1 text-[12.5px] font-medium', PRIORITY_CLASS[priority])} title={PRIORITY_LABEL[priority]}>
      <Icon className="h-3.5 w-3.5" aria-hidden />{withLabel ? PRIORITY_LABEL[priority] : <span className="sr-only">{PRIORITY_LABEL[priority]}</span>}
    </span>
  );
}

const PROPERTY_TONE: Record<PropertyStatus, Tone> = { AVAILABLE: 'success', IN_SHOWING: 'warning', RESERVED: 'warning', SOLD: 'neutral', ARCHIVED: 'neutral' };
export function PropertyStatusBadge({ status, className }: { status: PropertyStatus; className?: string }) {
  return <StatusBadge tone={PROPERTY_TONE[status]} dot className={className}>{PROPERTY_STATUS_LABEL[status]}</StatusBadge>;
}

export function Chip({ selected, children, onClick, className, count }: { selected?: boolean; children: React.ReactNode; onClick?: () => void; className?: string; count?: number }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick}
      className={cn('inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13.5px] font-medium lg:h-9 transition-[background-color,color,border-color,transform] duration-tab ease-standard active:scale-[0.96]',
        selected ? 'border-transparent bg-foreground text-background [:root[data-family=venza]_&]:bg-primary [:root[data-family=venza]_&]:text-primary-foreground [:root[data-family=atlas]_&]:bg-primary [:root[data-family=atlas]_&]:text-primary-foreground' : 'border-border bg-surface text-foreground hover:bg-surface-2',
        className)}>
      {children}{count !== undefined && <span className={cn('tabular text-[12px]', selected ? 'opacity-75' : 'text-muted-foreground')}>{count}</span>}
    </button>
  );
}
