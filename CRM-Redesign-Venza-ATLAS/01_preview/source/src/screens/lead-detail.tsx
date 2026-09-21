import * as React from 'react';
import { BellRing, CalendarPlus, CheckSquare, ChevronRight, Handshake, Mail, MessageCircle, Phone, PhoneCall, Search, Trash2, Workflow } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { store, usePreviewSettings, users } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { Link, useRouter } from '@/lib/router';
import { useIsDesktop, useTheme } from '@/lib/theme/provider';
import { budget, money, relDay, time } from '@/lib/format';
import { CLIENT_TYPE_LABEL, PURPOSE_LABEL, SOURCE_LABEL, STAGES_ACTIVE, STAGE_LABEL, TASK_TYPE_LABEL } from '@/lib/labels';
import type { Client, Lead, Task } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { ui } from '@/components/shell/ui-state';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PriorityMark, StageBadge, STAGE_DOT } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { ConfirmDialog, Sheet } from '@/components/ui/sheet';
import { Field, Input } from '@/components/ui/field';
import { TaskCheck } from '@/components/ui/toggle';
import { toast } from '@/components/ui/toast';
import { ActivityTimeline, NoteComposer } from '@/components/domain/activity';
import { PropertyMedia } from '@/components/domain/property-media';
import { StageSheet, useStageMove } from '@/components/overlays/lead-stage';
import { CallDispositionSheet, RemindSheet } from '@/components/overlays/person-actions';
import { leadUrgency } from '@/lib/lead-urgency';
import { PRIORITY_LABEL } from '@/lib/labels';
import type { Priority } from '@/lib/mock/types';

export function LeadDetailScreen({ id }: { id: string }) {
  const { family } = useTheme();
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const r = useResource(() => api.lead(id), [id]);
  const [tab, setTab] = React.useState<'info' | 'tasks' | 'history'>('info');
  const [stageOpen, setStageOpen] = React.useState(false);
  const [showing, setShowing] = React.useState(false);
  const [del, setDel] = React.useState(false);
  const [call, setCall] = React.useState(false);
  const [remind, setRemind] = React.useState(false);
  const settings = usePreviewSettings();
  const { move, lostSheet } = useStageMove();

  if (r.error) return <PageBody><PageHeader title="Лид" back="/leads" /><ErrorState error={r.error} onRetry={r.retry} what="карточку лида" /></PageBody>;
  if (r.loading || !r.data) return <PageBody><PageHeader title="Загружаем…" back="/leads" large={false} /><DetailSkeleton /></PageBody>;

  const lead = r.data;
  const client = store.db.clients.find((c) => c.id === lead.clientId)!;
  const property = store.db.properties.find((p) => p.id === lead.interestPropertyId);
  const tasks = store.db.tasks.filter((t) => t.leadId === lead.id);
  const owner = users.find((u) => u.id === lead.assignedUserId);

  const readyToBuy = async () => {
    if (lead.stage !== 'NEGOTIATION' && lead.stage !== 'WON' && lead.stage !== 'LOST') await api.moveLead(lead.id, 'NEGOTIATION').catch(() => {});
    router.navigate(`/deals/new?leadId=${lead.id}`);
  };
  const actions = <QuickActions client={client} onCall={() => setCall(true)} onRemind={() => setRemind(true)} onTask={() => ui.set({ quickCreate: 'task' })} onShowing={() => setShowing(true)} />;
  const controls = <LeadControls lead={lead} canAssign={settings.role === 'ADMIN' || settings.role === 'MANAGER'} onStage={() => setStageOpen(true)} onReady={readyToBuy} />;
  const overlays = (<>
    <StageSheet lead={lead} open={stageOpen} onOpenChange={setStageOpen} onPick={(s) => move(lead, s)} />
    <CallDispositionSheet open={call} onOpenChange={setCall} clientId={client.id} leadId={lead.id} name={client.fullName} phone={client.primaryPhone} />
    <RemindSheet open={remind} onOpenChange={setRemind} leadId={lead.id} current={lead.nextActionAt} />
    <ScheduleShowingSheet open={showing} onOpenChange={setShowing} client={client} defaultPropertyId={lead.interestPropertyId} />
    <ConfirmDialog open={del} onOpenChange={setDel} title="Удалить лид?" text={`Лид ${client.fullName} и его история будут удалены. Клиент останется в базе.`} confirmLabel="Удалить"
      onConfirm={() => { setDel(false); router.navigate('/leads', { replace: true }); toast.success('Лид удалён'); }} />
    {lostSheet}
  </>);

  /* ------------------------------ ATLAS desktop ------------------------------ */
  if (family === 'atlas' && isDesktop) {
    return (
      <PageBody wide>
        <PageHeader title={client.fullName} back="/leads" large={false} subtitle={<span className="flex items-center gap-2"><StageBadge stage={lead.stage} /><PriorityMark priority={lead.priority} withLabel />Создан {relDay(lead.createdAt).toLowerCase()}, {SOURCE_LABEL[lead.source]}</span>}
          actions={<><Button variant="outline" size="sm" onClick={() => setStageOpen(true)}><Workflow />Этап</Button><Button variant="outline" size="sm" onClick={() => setDel(true)} aria-label="Удалить лид"><Trash2 /></Button></>} />
        <StageStepper lead={lead} onPick={(s) => move(lead, s)} />
        <div className="mt-4 grid grid-cols-[240px_300px_minmax(0,1fr)_320px] gap-4 max-2xl:grid-cols-[300px_minmax(0,1fr)_320px]">
          <LeadSwitcher currentId={lead.id} />
          <div className="space-y-4">
            <section className="surface p-4"><div className="mb-3 flex items-center gap-3"><Avatar name={client.fullName} size={44} /><div className="min-w-0"><Link href={`/clients/${client.id}`} className="block truncate font-semibold hover:underline">{client.fullName}</Link><div className="t-caption">{CLIENT_TYPE_LABEL[client.type]}</div></div></div>{actions}</section>
            <section className="surface p-4"><h2 className="t-h3 mb-2">Запрос</h2><RequestList lead={lead} client={client} /></section>
            <section className="surface p-4"><h2 className="t-h3 mb-2">Ответственный</h2><div className="flex items-center gap-2.5"><Avatar name={owner?.fullName ?? '—'} size={32} /><div><div className="text-[14px] font-medium">{owner?.fullName ?? 'Не назначен'}</div><div className="t-caption">Риелтор</div></div></div></section>
          </div>
          <section className="surface min-w-0 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="t-h2">История</h2></div><div className="mb-4"><NoteComposer clientId={client.id} leadId={lead.id} /></div><ActivityTimeline leadId={lead.id} /></section>
          <div className="space-y-4">
            <section className="surface p-4">{controls}</section>
            <NextAction lead={lead} onShowing={() => setShowing(true)} />
            {property && <InterestProperty id={property.id} />}
            <section className="surface p-4"><h2 className="t-h3 mb-1">Задачи по лиду</h2><TaskMini tasks={tasks} /></section>
          </div>
        </div>
        {overlays}
      </PageBody>
    );
  }

  /* ------------------------------ Venza / mobile ------------------------------ */
  return (
    <PageBody className="lg:max-w-[880px]">
      <PageHeader title="" back="/leads" large={false} />
      <div className="-mt-6 flex flex-col items-center text-center lg:-mt-2 lg:flex-row lg:items-center lg:gap-5 lg:text-left">
        <Avatar name={client.fullName} size={84} className="shadow-soft ring-4 ring-surface" />
        <div className="mt-3 lg:mt-0">
          <h1 className="t-h1">{client.fullName}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <button onClick={() => setStageOpen(true)} className="inline-flex min-h-[40px] items-center rounded-full px-1 focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Этап: ${STAGE_LABEL[lead.stage]}. Сменить`}><StageBadge stage={lead.stage} /></button>
            <PriorityMark priority={lead.priority} withLabel />
          </div>
        </div>
      </div>
      <div className="mx-auto mt-5 max-w-[420px] lg:mx-0">{actions}</div>

      <SegmentedControl label="Разделы лида" className="mt-6 w-full lg:w-auto" value={tab} onChange={setTab}
        options={[{ value: 'info', label: 'Инфо' }, { value: 'tasks', label: 'Задачи', count: tasks.filter((t) => !t.completedAt).length }, { value: 'history', label: 'История' }]} />

      <div key={tab} className="page-fade mt-4 space-y-4 pb-24 lg:pb-0">
        {tab === 'info' && (<>
          <section className="surface p-4">{controls}</section>
          <NextAction lead={lead} onShowing={() => setShowing(true)} />
          <section className="surface p-4"><h2 className="t-h3 mb-2">Запрос клиента</h2><RequestList lead={lead} client={client} /></section>
          {property && <InterestProperty id={property.id} />}
          <section className="surface p-4"><h2 className="t-h3 mb-2">Ответственный</h2><div className="flex items-center gap-2.5"><Avatar name={owner?.fullName ?? '—'} size={36} /><span className="text-[15px] font-medium">{owner?.fullName ?? 'Не назначен'}</span></div></section>
          <Button variant="ghost" className="w-full text-danger-text" onClick={() => setDel(true)}><Trash2 />Удалить лид</Button>
        </>)}
        {tab === 'tasks' && <section className="surface p-4"><TaskMini tasks={tasks} /></section>}
        {tab === 'history' && <><NoteComposer clientId={client.id} leadId={lead.id} /><section className="surface p-4"><ActivityTimeline leadId={lead.id} /></section></>}
      </div>

      <div className="material fixed inset-x-0 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+80px)] z-30 mx-3 flex gap-2 rounded-[20px] border border-[var(--glass-border)] p-2 shadow-lift lg:static lg:mx-0 lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
        <Button variant="outline" className="flex-1" onClick={() => setStageOpen(true)}><Workflow />Этап</Button>
        {lead.stage === 'NEGOTIATION'
          ? <Button className="flex-[1.6]" onClick={readyToBuy}><Handshake />Оформить сделку</Button>
          : <Button className="flex-[1.6]" onClick={() => setShowing(true)}><CalendarPlus />Назначить показ</Button>}
      </div>
      {overlays}
    </PageBody>
  );
}

export function QuickActions({ client, onTask, onShowing, onCall, onRemind }: { client: Client; onTask: () => void; onShowing: () => void; onCall?: () => void; onRemind?: () => void }) {
  const settings = usePreviewSettings();
  const router = useRouter();
  const items = [
    onCall ? { label: 'Звонок', icon: PhoneCall, onClick: onCall } : { label: 'Позвонить', icon: Phone, href: `tel:${client.primaryPhone.replace(/\s/g, '')}` },
    onRemind ? { label: 'Напомнить', icon: BellRing, onClick: onRemind } : null,
    settings.integrationsEnabled ? { label: 'Написать', icon: MessageCircle, onClick: () => router.navigate('/inbox') } : client.email ? { label: 'Почта', icon: Mail, href: `mailto:${client.email}` } : null,
    onRemind ? null : { label: 'Задача', icon: CheckSquare, onClick: onTask },
    { label: 'Показ', icon: CalendarPlus, onClick: onShowing },
  ].filter(Boolean) as { label: string; icon: typeof Phone; href?: string; onClick?: () => void }[];
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => {
        const inner = <><span className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary transition-transform duration-tap group-active:scale-90 [:root[data-family=atlas]_&]:h-9 [:root[data-family=atlas]_&]:w-9 [:root[data-family=atlas]_&]:rounded-[9px]"><it.icon className="h-[18px] w-[18px]" aria-hidden /></span><span className="text-[12.5px] font-medium">{it.label}</span></>;
        const cls = 'group flex flex-col items-center gap-1.5 rounded-control py-1.5 hover:bg-surface-2/60';
        return it.href ? <a key={it.label} href={it.href} className={cls}>{inner}</a> : <button key={it.label} onClick={it.onClick} className={cls}>{inner}</button>;
      })}
    </div>
  );
}

function RequestList({ lead, client }: { lead: Lead; client: Client }) {
  const rows: [string, React.ReactNode][] = [
    ['Цель', PURPOSE_LABEL[lead.purpose]], ['Бюджет', <span className="tabular">{budget(lead.budgetMin, lead.budgetMax, lead.budgetCurrency)}</span>],
    ['Районы', client.preferences?.districts.join(', ') || '—'], ['Комнат', client.preferences?.rooms?.min ? `от ${client.preferences.rooms.min}` : '—'],
    ['Телефон', <a href={`tel:${client.primaryPhone}`} className="tabular text-primary">{client.primaryPhone}</a>], ['Источник', SOURCE_LABEL[lead.source]],
  ];
  return <dl className="row-divider -mx-1">{rows.map(([k, v]) => <div key={k} className="flex items-baseline justify-between gap-4 px-1 py-2.5 text-[14.5px]"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl>;
}

function NextAction({ lead, onShowing }: { lead: Lead; onShowing: () => void }) {
  const overdue = lead.nextActionAt && new Date(lead.nextActionAt) < new Date();
  return (
    <section className={cn('rounded-card p-4', overdue ? 'border border-danger/25 bg-danger/8' : 'bg-primary-soft')}>
      <h2 className={cn('text-[13px] font-medium', overdue ? 'text-danger-text' : 'text-primary')}>{overdue ? 'Следующее действие просрочено' : 'Следующее действие'}</h2>
      {lead.nextActionAt ? <p className="mt-1 text-[17px] font-semibold tabular">{relDay(lead.nextActionAt)}, {time(lead.nextActionAt)}</p> : <p className="mt-1 text-[15px]">Не запланировано</p>}
      {lead.interestNote && <p className="mt-1 text-[14px] text-foreground/70">{lead.interestNote}</p>}
      {!lead.nextActionAt && <Button size="sm" variant="outline" className="mt-3" onClick={onShowing}><CalendarPlus />Запланировать</Button>}
    </section>
  );
}

function InterestProperty({ id }: { id: string }) {
  const p = store.db.properties.find((x) => x.id === id)!;
  return (
    <Link href={`/properties/${p.id}`} className="pressable surface flex items-center gap-3 p-2.5 pr-3">
      <PropertyMedia art={p.photos[0]?.art ?? 0} aspect="1/1" className="w-[72px] shrink-0 !rounded-[12px]" />
      <div className="min-w-0 flex-1"><div className="t-micro">Интересуется</div><div className="truncate text-[15px] font-semibold">{p.title}</div><div className="t-caption truncate">{p.district}</div></div>
      <div className="text-right"><div className="t-num text-[16px] font-semibold">{money(p.price, p.currency, true)}</div><ChevronRight className="ml-auto mt-1 h-4 w-4 text-muted-foreground" aria-hidden /></div>
    </Link>
  );
}

function TaskMini({ tasks }: { tasks: Task[] }) {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  if (!tasks.length) return <p className="t-caption py-4 text-center">Задач нет</p>;
  return (
    <ul className="row-divider">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2.5">
          <TaskCheck checked={!!t.completedAt} label={t.title} onChange={async () => { await api.toggleTask(t.id); force(); }} />
          <div className="min-w-0 flex-1"><p className={cn('truncate text-[14.5px] font-medium', t.completedAt && 'text-muted-foreground line-through')}>{t.title}</p><p className="t-caption">{TASK_TYPE_LABEL[t.type]}, {relDay(t.dueAt).toLowerCase()} {time(t.dueAt)}</p></div>
        </li>
      ))}
    </ul>
  );
}

function StageStepper({ lead, onPick }: { lead: Lead; onPick: (s: typeof STAGES_ACTIVE[number]) => void }) {
  const idx = STAGES_ACTIVE.indexOf(lead.stage as typeof STAGES_ACTIVE[number]);
  return (
    <ol className="surface flex overflow-hidden p-1" aria-label="Этапы воронки">
      {STAGES_ACTIVE.map((s, i) => (
        <li key={s} className="flex-1">
          <button onClick={() => i !== idx && onPick(s)} aria-current={i === idx ? 'step' : undefined}
            className={cn('flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] text-[13px] font-medium transition-colors duration-tab', i === idx ? 'bg-primary text-primary-foreground' : i < idx ? 'text-foreground hover:bg-surface-2' : 'text-muted-foreground hover:bg-surface-2')}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: i === idx ? 'currentColor' : STAGE_DOT[s] }} />{STAGE_LABEL[s]}
          </button>
        </li>
      ))}
    </ol>
  );
}

/** ScheduleShowingDialog: объект + дата/время + длительность (5–480, шаг 15) + проверка конфликтов. */
export function ScheduleShowingSheet({ open, onOpenChange, client, defaultPropertyId }: { open: boolean; onOpenChange: (o: boolean) => void; client: Client; defaultPropertyId?: string }) {
  const [propertyId, setPropertyId] = React.useState(defaultPropertyId ?? store.db.properties[0].id);
  const [day, setDay] = React.useState(0); const [hour, setHour] = React.useState('16:30'); const [busy, setBusy] = React.useState(false);
  const d = new Date(); d.setDate(d.getDate() + day); const [hh, mm] = hour.split(':').map(Number); d.setHours(hh, mm, 0, 0);
  const conflict = store.db.events.find((e) => Math.abs(new Date(e.startsAt).getTime() - d.getTime()) < 60 * 60_000);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Назначить показ" description={client.fullName} desktop="side" size="sm"
      footer={<><Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Отмена</Button><Button className="flex-[2]" loading={busy} onClick={async () => {
        /* Показ создаётся по-настоящему: появляется в календаре и в истории
           клиента. Раньше здесь был только тост, и назначенного показа потом
           нигде не было. */
        setBusy(true);
        const property = store.db.properties.find((p) => p.id === propertyId);
        try {
          await api.createEvent({ kind: 'SHOWING', title: `Показ · ${property?.title ?? client.fullName}`, startsAt: d.toISOString(), minutes: 60, clientId: client.id, propertyId });
          onOpenChange(false);
          toast.success(`Показ назначен: ${relDay(d.toISOString()).toLowerCase()}, ${time(d.toISOString())}`);
        } catch (err) { toast.error((err as Error).message); }
        finally { setBusy(false); }
      }}>Назначить</Button></>}>
      <div className="space-y-5">
        <fieldset><legend className="mb-2 text-[13px] font-medium">Объект</legend>
          <div className="space-y-2">{store.db.properties.filter((p) => p.status !== 'SOLD').slice(0, 4).map((p) => (
            <button key={p.id} onClick={() => setPropertyId(p.id)} aria-pressed={propertyId === p.id} className={cn('flex w-full min-w-0 items-center gap-3 rounded-control border p-2 text-left transition-colors', propertyId === p.id ? 'border-primary bg-primary-soft' : 'border-border bg-surface')}>
              <PropertyMedia art={p.photos[0].art} aspect="1/1" className="w-12 shrink-0 !rounded-[10px]" /><span className="min-w-0 flex-1"><span className="block truncate text-[14.5px] font-medium">{p.title}</span><span className="t-caption">{p.district}</span></span>
            </button>))}</div>
        </fieldset>
        <fieldset><legend className="mb-2 text-[13px] font-medium">День</legend>
          <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((k) => <button key={k} onClick={() => setDay(k)} aria-pressed={day === k} className={cn('h-10 min-w-0 truncate rounded-full border px-2 text-[14px] font-medium', day === k ? 'border-primary bg-primary-soft text-primary-text' : 'border-border bg-surface')}>{relDay(new Date(Date.now() + k * 86_400_000).toISOString())}</button>)}</div>
        </fieldset>
        <Field label="Время" hint="Длительность 60 минут">{(id) => <Input id={id} type="time" step={900} value={hour} onChange={(e) => setHour(e.target.value)} className="tabular" />}</Field>
        {conflict && <div role="status" className="rounded-control border border-warning/35 bg-warning/12 px-3.5 py-3 text-[14px] text-warning-text">Пересекается с «{conflict.title}» в {time(conflict.startsAt)}. Показ можно назначить, но проверьте расписание.</div>}
      </div>
    </Sheet>
  );
}

export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Загрузка" className="space-y-4">
      <div className="flex flex-col items-center gap-3"><Skeleton className="h-20 w-20 rounded-full" /><Skeleton className="h-7 w-48" /><Skeleton className="h-5 w-28 rounded-full" /></div>
      <div className="grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-control" />)}</div>
      <Skeleton className="h-10 rounded-control" /><Skeleton className="h-40 rounded-card" /><Skeleton className="h-24 rounded-card" />
    </div>
  );
}
export const _unused = EmptyState;

/** Правая панель лида: этап · приоритет · ответственный (ADMIN/MANAGER) · «Готов купить». */
function LeadControls({ lead, canAssign, onStage, onReady }: { lead: Lead; canAssign: boolean; onStage: () => void; onReady: () => void }) {
  const setPriority = async (p: Priority) => { await api.updateLead(lead.id, { priority: p }); toast.success(`Приоритет: ${PRIORITY_LABEL[p].toLowerCase()}`); };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3"><span className="t-caption text-[13.5px]">Этап</span><button onClick={onStage} className="rounded-full focus-visible:ring-2 focus-visible:ring-ring" aria-label="Сменить этап"><StageBadge stage={lead.stage} /></button></div>
      <div>
        <div className="t-caption mb-1.5 text-[13.5px]">Приоритет</div>
        <SegmentedControl<Priority> label="Приоритет" className="w-full" value={lead.priority} onChange={setPriority} options={(['hot', 'warm', 'cold'] as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`as-${lead.id}`} className="t-caption text-[13.5px]">Ответственный</label>
        {canAssign ? (
          <select id={`as-${lead.id}`} value={lead.assignedUserId ?? ''} onChange={async (e) => { await api.updateLead(lead.id, { assignedUserId: e.target.value || null }); toast.success('Ответственный изменён'); }}
            className="h-9 max-w-[60%] rounded-control border border-input bg-surface px-2.5 text-[14px] font-medium outline-none focus:border-primary">
            <option value="">Не назначен</option>{users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
        ) : <span className="text-[14px] font-medium">{users.find((u) => u.id === lead.assignedUserId)?.fullName ?? 'Не назначен'}</span>}
      </div>
      {lead.stage !== 'WON' && lead.stage !== 'LOST' && <Button className="w-full" onClick={onReady}><Handshake />Готов купить</Button>}
    </div>
  );
}

/** Левая панель рабочего места: поиск и переключение между лидами без возврата в воронку. */
function LeadSwitcher({ currentId }: { currentId: string }) {
  const [q, setQ] = React.useState('');
  const list = store.db.leads.filter((l) => l.stage !== 'WON' && l.stage !== 'LOST').map((l) => ({ l, c: store.db.clients.find((c) => c.id === l.clientId)! })).filter(({ c }) => !q || c.fullName.toLowerCase().includes(q.toLowerCase()));
  return (
    <aside className="surface flex max-h-[calc(100dvh-180px)] min-w-0 flex-col overflow-hidden max-2xl:hidden" aria-label="Другие лиды">
      <div className="relative border-b border-border/70 p-2"><Search className="pointer-events-none absolute left-4.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ left: 18 }} aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти лид" aria-label="Найти лид" className="h-9 w-full rounded-control bg-surface-2 pl-8 pr-2 text-[13.5px] outline-none focus:ring-2 focus:ring-ring" /></div>
      <ul className="relative min-h-0 flex-1 overflow-y-auto p-1.5">
        {list.map(({ l, c }) => { const u = leadUrgency(l); return (
          <li key={l.id}><Link href={`/leads/${l.id}`} aria-current={l.id === currentId ? 'page' : undefined} className={cn('flex items-center gap-2.5 rounded-[9px] px-2 py-2 transition-colors', l.id === currentId ? 'bg-primary-soft' : 'hover:bg-surface-2')}>
            <Avatar name={c.fullName} size={28} /><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{c.fullName}</span><span className="block truncate text-[11.5px] text-muted-foreground">{STAGE_LABEL[l.stage]}</span></span>
            {(u === 'overdue' || u === 'today') && <span aria-label={u === 'overdue' ? 'Просрочено' : 'Сегодня'} className={cn('h-2 w-2 shrink-0 rounded-full', u === 'overdue' ? 'bg-danger' : 'bg-warning')} />}
          </Link></li>); })}
      </ul>
    </aside>
  );
}
