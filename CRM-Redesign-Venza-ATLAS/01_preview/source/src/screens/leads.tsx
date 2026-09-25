import * as React from 'react';
import { Inbox, LayoutList, MoreHorizontal, Phone, Plus, SquareKanban, Workflow, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { store, usePreviewSettings, users, shortName } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { useHScrollFade } from '@/lib/use-hscroll';
import { useChunked } from '@/lib/use-chunked';
import { ShowMore } from '@/components/ui/show-more';
import { useIsDesktop, useTheme } from '@/lib/theme/provider';
import { useRouter } from '@/lib/router';
import { money, plural } from '@/lib/format';
import { STAGES_ACTIVE, STAGE_LABEL, SOURCE_LABEL, PRIORITY_LABEL, isStageTransitionAllowed } from '@/lib/labels';
import { leadUrgency } from '@/lib/lead-urgency';
import type { Lead, LeadStage } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { ui } from '@/components/shell/ui-state';
import { Button, IconButton } from '@/components/ui/button';
import { Chip, STAGE_DOT } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented';
import { RowsSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { LeadCard, LeadRow } from '@/components/domain/lead-row';
import { FilterButton, FiltersSheet, activeFilterCount, type FilterValue } from '@/components/domain/filters';
import { StageSheet, useStageMove } from '@/components/overlays/lead-stage';
import { tr } from '@/lib/i18n';

/** /leads. Desktop: канбан (DnD). Mobile: чипы этапов + список. Bulk-действия и фильтр ответственного — ADMIN. */
export function LeadsScreen() {
  const router = useRouter();
  const { family } = useTheme();
  const isDesktop = useIsDesktop();
  const settings = usePreviewSettings();
  const r = useResource(() => api.leads());
  const [stage, setStage] = React.useState<LeadStage | 'ALL'>('ALL');
  const stageRow = useHScrollFade<HTMLDivElement>();   // край ряда этапов растворяется, если есть что листать
  const [view, setView] = React.useState<'board' | 'list'>('board');
  const [filters, setFilters] = React.useState<FilterValue>({});
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [actionsFor, setActionsFor] = React.useState<Lead | null>(null);
  const [stageFor, setStageFor] = React.useState<Lead | null>(null);
  const { move, lostSheet } = useStageMove();
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const isAdmin = settings.role === 'ADMIN';
  React.useEffect(() => { if (!isAdmin) { setSelectMode(false); setSelected([]); } }, [isAdmin]);
  const toggleSel = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const bulk = async (patch: Partial<Pick<Lead, 'priority' | 'assignedUserId'>>, label: string) => {
    await Promise.all(selected.map((id) => api.updateLead(id, patch)));
    toast.success(`${label}: ${selected.length} ${plural(selected.length, 'лид', 'лида', 'лидов')}`); setSelected([]); setSelectMode(false);
  };

  const groups = [
    { key: 'priority', label: tr('Приоритет'), options: (['hot', 'warm', 'cold'] as const).map((p) => ({ value: p, label: PRIORITY_LABEL[p] })) },
    { key: 'source', label: tr('Источник'), options: (['INSTAGRAM', 'WEBSITE', 'REFERRAL', 'FACEBOOK', 'TELEGRAM', 'MANUAL'] as const).map((s) => ({ value: s, label: SOURCE_LABEL[s] })) },
    ...(settings.role === 'ADMIN' ? [{ key: 'assignee', label: tr('Ответственный'), options: [...users.map((u) => ({ value: u.id, label: shortName(u.fullName) })), { value: 'none', label: tr('Не назначен') }] }] : []),
    { key: 'urgency', label: tr('Срочность'), options: [{ value: 'overdue', label: tr('Просрочено') }, { value: 'today', label: tr('Сегодня') }, { value: 'stale', label: tr('Без контакта') }] },
  ];
  const apply = (leads: Lead[], f: FilterValue) => leads.filter((l) =>
    (!f.priority?.length || f.priority.includes(l.priority)) && (!f.source?.length || f.source.includes(l.source)) &&
    (!f.assignee?.length || f.assignee.includes(l.assignedUserId ?? 'none')) && (!f.urgency?.length || f.urgency.includes(leadUrgency(l))));
  const all = r.data ?? [];
  const active = apply(all.filter((l) => l.stage !== 'WON' && l.stage !== 'LOST'), filters);
  const countFor = (f: FilterValue) => apply(all.filter((l) => l.stage !== 'WON' && l.stage !== 'LOST'), f).length;
  /* Список рисуется порциями. Счётчики над ним — всегда по всей воронке:
     «39 активных» и числа на фишках этапов не должны зависеть от того,
     сколько строк человек успел долистать. */
  const list = stage === 'ALL' ? active : active.filter((l) => l.stage === stage);
  const page = useChunked(list, `leads:${stage}:${activeFilterCount(filters)}`);

  const header = (
    <PageHeader title={tr('Лиды')} subtitle={r.data ? `${active.length} ${plural(active.length, 'активный', 'активных', 'активных')}` : 'Загружаем воронку'}
      actions={<>
        {isDesktop && <SegmentedControl label={tr('Вид')} size="sm" value={view} onChange={setView} options={[{ value: 'board', label: tr('Канбан') }, { value: 'list', label: tr('Список') }]} />}
        <IconButton label={tr('Новый лид')} onClick={() => router.navigate('/leads/new')}><Plus /></IconButton>
      </>} />
  );

  const body = () => {
    if (r.error) return <ErrorState error={r.error} onRetry={r.retry} what={tr('воронку')} />;
    if (r.loading) return isDesktop && view === 'board' ? <BoardSkeleton /> : <RowsSkeleton rows={6} />;
    if (!all.length) return <EmptyState icon={Inbox} title={tr('В воронке пока пусто')} text={tr('Добавьте первый лид — он появится в колонке «Новые».')} action={<Button onClick={() => ui.set({ quickCreate: 'lead' })}><Plus />{tr('Добавить лид')}</Button>} />;
    if (isDesktop && view === 'board') return <Board leads={active} onMove={move} family={family} selectMode={selectMode} selected={selected} onToggle={toggleSel} onStage={setStageFor} />;
    return (
      <>
        {!isDesktop && (
          /* Обёртка держит ползунок: сам ряд прокручивается, и полоска внутри него уехала бы. */
          <div data-hscroll-wrap className="mb-4 pb-2">
            <div ref={stageRow} data-hscroll className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2.5" role="group" aria-label={tr('Фильтр по этапам')}>
              <Chip selected={stage === 'ALL'} onClick={() => setStage('ALL')} count={active.length}>{tr('Все')}</Chip>
              {STAGES_ACTIVE.map((s) => <Chip key={s} selected={stage === s} onClick={() => setStage(s)} count={active.filter((l) => l.stage === s).length}>{STAGE_LABEL[s]}</Chip>)}
            </div>
          </div>
        )}
        {list.length === 0 ? <EmptyState icon={Workflow} title={tr('На этом этапе пусто')} text={tr('Попробуйте другой этап или сбросьте фильтры.')} action={activeFilterCount(filters) ? <Button variant="outline" size="sm" onClick={() => setFilters({})}>{tr('Сбросить фильтры')}</Button> : undefined} /> : (<>
          <ul className="surface row-divider overflow-hidden">
            {page.visible.map((l) => <li key={l.id}><LeadRow lead={l} showStage={stage === 'ALL'} onActions={setActionsFor} /></li>)}
          </ul>
          <ShowMore more={page.more} total={page.total} shown={page.visible.length} onMore={page.loadMore} what="lead" />
        </>)}
      </>
    );
  };

  return (
    <PageBody wide={isDesktop && view === 'board'}>
      {header}
      <div className="mb-4 flex items-center gap-2">
        <FilterButton count={activeFilterCount(filters)} onClick={() => setFiltersOpen(true)} />
        {activeFilterCount(filters) > 0 && <Button variant="ghost" size="sm" onClick={() => setFilters({})}>{tr('Сбросить')}</Button>}
        <div className="flex-1" />
        {isDesktop && isAdmin && view === 'board' && <Button size="sm" variant={selectMode ? 'soft' : 'ghost'} onClick={() => { setSelectMode(!selectMode); setSelected([]); }}>{selectMode ? tr('Готово') : tr('Выбрать')}</Button>}
        {isDesktop && <span className="t-caption hidden items-center gap-1.5 xl:flex">{view === 'board' ? <SquareKanban className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}Перетащите карточку или нажмите «…» на ней, чтобы сменить этап</span>}
      </div>
      {body()}
      {selectMode && selected.length > 0 && (
        <div role="region" aria-label={tr('Массовые действия')} className="material fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-[18px] border border-[var(--glass-border)] p-2 pl-4 shadow-lift animate-pop-in">
          <span className="whitespace-nowrap text-[14px] font-semibold tabular">{tr('Выбрано:')}{selected.length}</span>
          <span className="mx-1 h-6 w-px bg-border" />
          <label className="sr-only" htmlFor="bulk-assignee">{tr('Переназначить')}</label>
          <select id="bulk-assignee" defaultValue="" onChange={(e) => { if (e.target.value) bulk({ assignedUserId: e.target.value === 'none' ? null : e.target.value }, tr('Переназначено')); }}
            className="h-9 rounded-control border border-input bg-surface px-2.5 text-[14px] outline-none focus:border-primary">
            <option value="" disabled>{tr('Переназначить')}</option>{users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}<option value="none">{tr('Снять ответственного')}</option>
          </select>
          {(['hot', 'warm', 'cold'] as const).map((pr) => <Button key={pr} size="sm" variant="outline" onClick={() => bulk({ priority: pr }, PRIORITY_LABEL[pr])}>{PRIORITY_LABEL[pr]}</Button>)}
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>{tr('Отмена')}</Button>
        </div>
      )}
      <FiltersSheet open={filtersOpen} onOpenChange={setFiltersOpen} groups={groups} value={filters} onApply={setFilters} countFor={countFor} />
      <LeadActions lead={actionsFor} onClose={() => setActionsFor(null)} onStage={(l) => { setActionsFor(null); setStageFor(l); }} onLost={(l) => { setActionsFor(null); move(l, 'LOST'); }} />
      <StageSheet lead={stageFor} open={!!stageFor} onOpenChange={(o) => !o && setStageFor(null)} onPick={(s) => stageFor && move(stageFor, s)} />
      {lostSheet}
    </PageBody>
  );
}

/** LeadActionSheet (мобайл): звонок, этап, закрыть как проигранный — разрушительное действие отделено. */
function LeadActions({ lead, onClose, onStage, onLost }: { lead: Lead | null; onClose: () => void; onStage: (l: Lead) => void; onLost: (l: Lead) => void }) {
  const router = useRouter();
  const client = lead ? store.db.clients.find((c) => c.id === lead.clientId) : null;
  const row = 'pressable flex min-h-[54px] w-full items-center gap-3.5 rounded-control px-3 text-left text-[16px] font-medium';
  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()} title={client?.fullName ?? ''} description={lead ? `Этап: ${STAGE_LABEL[lead.stage]}` : undefined} desktop="center" size="sm">
      {lead && (<div className="space-y-3">
        <div className="surface-quiet p-1.5">
          <a href={`tel:${client?.primaryPhone.replace(/\s/g, '')}`} className={row} onClick={onClose}><Phone className="h-5 w-5 text-primary" aria-hidden />Позвонить<span className="t-caption ml-auto tabular">{client?.primaryPhone}</span></a>
          <button className={row} onClick={() => onStage(lead)}><Workflow className="h-5 w-5 text-primary" aria-hidden />{tr('Сменить этап')}</button>
          <button className={row} onClick={() => { onClose(); router.navigate(`/leads/${lead.id}`); }}><LayoutList className="h-5 w-5 text-primary" aria-hidden />{tr('Открыть карточку')}</button>
        </div>
        <div className="surface-quiet p-1.5"><button className={cn(row, 'text-danger-text')} onClick={() => onLost(lead)}><XCircle className="h-5 w-5" aria-hidden />{tr('Закрыть как проигранный')}</button></div>
      </div>)}
    </Sheet>
  );
}

function Board({ leads, onMove, family, selectMode, selected, onToggle, onStage }: { leads: Lead[]; onMove: (l: Lead, s: LeadStage) => Promise<boolean>; family: string; selectMode: boolean; selected: string[]; onToggle: (id: string) => void; onStage: (l: Lead) => void }) {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<LeadStage | null>(null);
  const [settled, setSettled] = React.useState<string | null>(null);
  const boardRow = useHScrollFade<HTMLDivElement>();   // колонок больше, чем влезает даже на широком экране
  const columns: LeadStage[] = [...STAGES_ACTIVE, 'LOST'];
  const dragLead = leads.find((l) => l.id === dragId);
  /* В колонке показываем первые 25 карточек. На объёме за год канбан рисовал
     2 620 карточек и 84 тысячи узлов — экран открывался 6,6 с. Счётчик в шапке
     колонки при этом остаётся по всем лидам этапа. */
  const PER_COLUMN = 25;
  const [shown, setShown] = React.useState<Record<string, number>>({});

  const drop = async (s: LeadStage) => {
    setOver(null);
    const l = dragLead; setDragId(null);
    if (!l || l.stage === s) return;
    if (!isStageTransitionAllowed(l.stage, s)) { toast.error(tr('Этот переход недоступен')); return; }
    const ok = await onMove(l, s);
    if (ok) { setSettled(l.id); setTimeout(() => setSettled(null), 260); }
  };

  return (
    <div ref={boardRow} data-hscroll className="no-scrollbar relative -mx-3.5 flex gap-3 overflow-x-auto px-3.5 pb-4 lg:-mx-6 lg:px-6 2xl:gap-2.5" aria-label={tr('Канбан воронки')}>
      {columns.map((s) => {
        const items = s === 'LOST' ? [] : leads.filter((l) => l.stage === s);
        const take = shown[s] ?? PER_COLUMN;
        const visible = items.length > take ? items.slice(0, take) : items;
        const sum = items.reduce((a, l) => a + (l.budgetMax ?? 0), 0);
        const canDrop = !!dragLead && dragLead.stage !== s && isStageTransitionAllowed(dragLead.stage, s);
        return (
          <section key={s} aria-label={STAGE_LABEL[s]}
            onDragOver={(e) => { if (canDrop) { e.preventDefault(); setOver(s); } }} onDragLeave={() => setOver((o) => (o === s ? null : o))} onDrop={() => drop(s)}
            className={cn('flex shrink-0 flex-col rounded-card transition-[background-color,outline-color] duration-row',
              s === 'LOST' ? 'w-[180px] 2xl:w-[170px]' : family === 'venza' ? 'w-[292px] 2xl:w-[252px]' : 'w-[268px] 2xl:w-[232px]',
              family === 'atlas' ? 'border border-border/70' : 'bg-surface-2/60', over === s && 'drop-target', dragLead && !canDrop && s !== dragLead.stage && 'opacity-60')}
            style={family === 'atlas' ? { background: `var(--at-stage-${s.toLowerCase()})` } : undefined}>
            <header className="flex items-center gap-2 px-3 pb-2 pt-3">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: STAGE_DOT[s] }} />
              <h2 className="text-[14px] font-semibold">{STAGE_LABEL[s]}</h2>
              <span className="rounded-full bg-surface/80 px-1.5 text-[12px] font-medium text-muted-foreground tabular">{s === 'LOST' ? '' : items.length}</span>
              <span className="t-micro ml-auto tabular">{sum ? money(sum, 'EUR', true) : ''}</span>
            </header>
            <div className="flex min-h-[140px] flex-1 flex-col gap-2 px-2 pb-2">
              {s === 'LOST' ? (
                <div className="grid flex-1 place-items-center rounded-[10px] border border-dashed border-border p-4 text-center t-caption">{tr('Перетащите сюда, чтобы закрыть с причиной')}</div>
              ) : visible.map((l) => (
                <div key={l.id} draggable={!selectMode} onDragStart={(e) => { setDragId(l.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', l.id); }} onDragEnd={() => { setDragId(null); setOver(null); }}
                  className={cn('group/card relative', selectMode ? '' : 'cursor-grab active:cursor-grabbing', settled === l.id && 'settle', selected.includes(l.id) && 'rounded-card ring-2 ring-primary')}>
                  <LeadCard lead={l} dragging={dragId === l.id} />
                  {!selectMode && <button onClick={(e) => { e.preventDefault(); onStage(l); }} aria-label={`Сменить этап: ${store.db.clients.find((c) => c.id === l.clientId)?.fullName ?? ''}`}
                    className="absolute right-1.5 top-1.5 z-10 grid h-8 w-8 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-surface-2 focus-visible:opacity-100 group-hover/card:opacity-100"><MoreHorizontal className="h-4 w-4" /></button>}
                  {selectMode && <button onClick={() => onToggle(l.id)} role="checkbox" aria-checked={selected.includes(l.id)} aria-label={tr('Выбрать лид')} className="absolute inset-0 z-10 flex items-start justify-end rounded-card p-2">
                    <span className={cn('grid h-5 w-5 place-items-center rounded-[6px] border-[1.5px] text-[11px] font-bold', selected.includes(l.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50 bg-surface')}>{selected.includes(l.id) ? '✓' : ''}</span>
                  </button>}
                </div>
              ))}
              {items.length > visible.length && (
                <button type="button" onClick={() => setShown((v) => ({ ...v, [s]: take + PER_COLUMN }))}
                  className="min-h-[44px] rounded-control border border-border bg-surface/80 text-[13.5px] font-medium text-muted-foreground transition-colors duration-tab hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Ещё {Math.min(PER_COLUMN, items.length - visible.length)} из {items.length - visible.length}
                </button>
              )}
              {s !== 'LOST' && items.length === 0 && <div className="t-caption grid flex-1 place-items-center text-center">{tr('Пусто')}</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BoardSkeleton() {
  return <div className="flex gap-3 overflow-hidden" role="status" aria-label={tr('Загрузка')}>{[0, 1, 2, 3, 4].map((i) => <div key={i} className="w-[268px] shrink-0 space-y-2 rounded-card bg-surface-2/60 p-2"><Skeleton className="m-1 h-4 w-24" />{Array.from({ length: 3 - (i % 2) }).map((_, k) => <Skeleton key={k} className="h-[104px] rounded-card" />)}</div>)}</div>;
}
