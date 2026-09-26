import * as React from 'react';
import { Archive, ArchiveRestore, Ban, ChevronRight, GitMerge, MoreHorizontal, Pencil, Plus, Search, UserPlus, Users, Workflow, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { store, usePreviewSettings, users } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { useChunked } from '@/lib/use-chunked';
import { ShowMore } from '@/components/ui/show-more';
import { Link, useRouter } from '@/lib/router';
import { useIsDesktop, useTheme } from '@/lib/theme/provider';
import { budget, money, relDay } from '@/lib/format';
import { CLIENT_TYPE_LABEL, INTEREST_LABEL, INTEREST_ORDER, PROPERTY_TYPE_LABEL, SOURCE_LABEL, STAGE_LABEL } from '@/lib/labels';
import type { Client, Interest } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { ui } from '@/components/shell/ui-state';
import { Avatar } from '@/components/ui/avatar';
import { Button, IconButton } from '@/components/ui/button';
import { StageBadge, StatusBadge } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented';
import { RowsSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { ConfirmDialog, Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { ActivityTimeline, NoteComposer } from '@/components/domain/activity';
import { PropertyMedia } from '@/components/domain/property-media';
import { PickerField } from '@/components/ui/picker';
import { CallDispositionSheet } from '@/components/overlays/person-actions';
import { DetailSkeleton, QuickActions, ScheduleShowingSheet } from './lead-detail';
import { tr } from '@/lib/i18n';

type Status = 'active' | 'archived' | 'blacklisted';

export function ClientsScreen() {
  const router = useRouter();
  const { family } = useTheme();
  const isDesktop = useIsDesktop();
  const [status, setStatus] = React.useState<Status>('active');
  const [term, setTerm] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => { const t = setTimeout(() => setDebounced(term), 250); return () => clearTimeout(t); }, [term]);
  const r = useResource(() => api.clients(status, debounced), [status, debounced]);
  /* Список порциями: на объёме за год экран открывался около пяти секунд.
     Ключ включает вкладку и запрос — у каждого списка своя позиция. */
  const page = useChunked(r.data?.items ?? [], `clients:${status}:${debounced}`);
  const leadOf = (c: Client) => store.db.leads.find((l) => l.clientId === c.id && l.stage !== 'WON' && l.stage !== 'LOST');

  const list = () => {
    if (r.error) return <ErrorState error={r.error} onRetry={r.retry} what={tr('клиентов')} />;
    if (r.loading) return <RowsSkeleton rows={7} />;
    const items = page.visible;
    if (!items.length) return debounced
      ? <EmptyState icon={Search} title={tr('Никого не нашли')} text={tr('По запросу «{q}» клиентов нет. Проверьте номер или имя.', { q: debounced })} action={<Button variant="outline" size="sm" onClick={() => setTerm('')}>{tr('Очистить поиск')}</Button>} />
      : status === 'active' ? <EmptyState icon={Users} title={tr('Клиентов пока нет')} text={tr('Клиент появится, когда вы создадите первый лид.')} action={<Button onClick={() => ui.set({ quickCreate: 'lead' })}><UserPlus />{tr('Новый лид')}</Button>} />
      : <EmptyState icon={status === 'archived' ? Archive : Ban} title={status === 'archived' ? tr('Архив пуст') : tr('Чёрный список пуст')} text={status === 'archived' ? tr('Сюда попадают клиенты, с которыми работа завершена.') : tr('Клиенты из чёрного списка не могут стать лидами.')} />;

    if (family === 'atlas' && isDesktop) {
      return (
        <div data-hscroll className="surface overflow-x-auto">
          <table className="w-full min-w-[760px] text-[14px]">
            <thead><tr className="border-b border-border text-left text-[12.5px] text-muted-foreground">{[tr('Клиент'), tr('Тип'), tr('Телефон'), tr('Активный лид'), tr('Источник'), tr('Ответственный'), tr('Создан')].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{items.map((c) => { const l = leadOf(c); return (
              <tr key={c.id} className="group border-b border-border/70 last:border-0 hover:bg-surface-2/60">
                <td className="px-4 py-2"><Link href={`/clients/${c.id}`} className="flex items-center gap-2.5 font-medium group-hover:underline"><Avatar name={c.fullName} size={30} />{c.fullName}</Link></td>
                <td className="px-4 py-2 text-muted-foreground">{CLIENT_TYPE_LABEL[c.type]}</td>
                <td className="px-4 py-2 tabular">{c.primaryPhone}</td>
                <td className="px-4 py-2">{l ? <StageBadge stage={l.stage} /> : <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-2 text-muted-foreground">{SOURCE_LABEL[c.source]}</td>
                <td className="px-4 py-2 text-muted-foreground">{users.find((u) => u.id === c.assignedUserId)?.fullName ?? tr('Не назначен')}</td>
                <td className="px-4 py-2 text-muted-foreground tabular">{relDay(c.createdAt)}</td>
              </tr>); })}</tbody>
          </table>
          <ShowMore more={page.more} total={page.total} shown={items.length} onMore={page.loadMore} what="client" />
        </div>
      );
    }
    return (
      <>
      <ul className="surface row-divider overflow-hidden">
        {items.map((c) => { const l = leadOf(c); return (
          <li key={c.id}><Link href={`/clients/${c.id}`} className="pressable flex items-center gap-3 px-4 py-3.5">
            <Avatar name={c.fullName} size={44} />
            <div className="min-w-0 flex-1"><div className="truncate text-[15.5px] font-semibold">{c.fullName}</div><div className="t-caption truncate tabular">{CLIENT_TYPE_LABEL[c.type]}, {c.primaryPhone}</div></div>
            {l ? <StageBadge stage={l.stage} /> : null}
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link></li>); })}
      </ul>
      <ShowMore more={page.more} total={page.total} shown={items.length} onMore={page.loadMore} what="client" />
    </>
    );
  };


  const total = r.data?.total;
  return (
    <PageBody wide={family === 'atlas'}>
      <PageHeader title={tr('Клиенты')} subtitle={total !== undefined ? tr('{n} в разделе', { n: total }) : ' '}
        actions={<IconButton label={tr('Новый клиент')} onClick={() => router.navigate('/clients/new')}><UserPlus /></IconButton>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SegmentedControl<Status> label={tr('Статус клиентов')} value={status} onChange={setStatus} className="w-full sm:w-auto"
          options={[{ value: 'active', label: tr('Активные') }, { value: 'archived', label: tr('Архив') }, { value: 'blacklisted', label: tr('Чёрный список') }]} />
        <div className="relative flex-1 sm:max-w-[320px] sm:ml-auto">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={tr('Имя или телефон')} aria-label={tr('Поиск клиентов')}
            className="h-11 w-full rounded-control border border-input bg-surface pl-10 pr-3 text-[16px] shadow-soft outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[0_0_0_4px_hsl(var(--primary)/.12)] lg:h-10 lg:text-[14px]" />
        </div>
      </div>
      {list()}
      {total !== undefined && total > 0 && <p className="t-caption mt-3 text-center">{tr('Показано')} {total} {tr('из')} {total}</p>}
    </PageBody>
  );
}

export function ClientDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const { family } = useTheme();
  const isDesktop = useIsDesktop();
  const settings = usePreviewSettings();
  const r = useResource(() => api.client(id), [id]);
  const [menu, setMenu] = React.useState(false);
  const [confirm, setConfirm] = React.useState<null | 'archive' | 'blacklist' | 'merge'>(null);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [mergeWith, setMergeWith] = React.useState<string | null>(null);
  const [showing, setShowing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [call, setCall] = React.useState(false);
  const [attach, setAttach] = React.useState(false);
  const canMerge = settings.role === 'ADMIN' || settings.role === 'MANAGER';

  if (r.error) return <PageBody><PageHeader title={tr('Клиент')} back="/clients" /><ErrorState error={r.error} onRetry={r.retry} what={tr('карточку клиента')} /></PageBody>;
  if (r.loading || !r.data) return <PageBody><PageHeader title={tr('Загружаем…')} back="/clients" large={false} /><DetailSkeleton /></PageBody>;
  const c = r.data;
  const lead = store.db.leads.find((l) => l.clientId === c.id && l.stage !== 'WON' && l.stage !== 'LOST');
  const owner = users.find((u) => u.id === c.assignedUserId);
  const prefs = c.preferences;

  const menuRow = 'pressable flex min-h-[54px] w-full items-center gap-3.5 rounded-control px-3 text-left text-[16px] font-medium';
  const overlays = (<>
    <Sheet open={menu} onOpenChange={setMenu} title={c.fullName} desktop="center" size="sm">
      <div className="space-y-3">
        <div className="surface-quiet p-1.5">
          <button className={menuRow} onClick={() => { setMenu(false); router.navigate(`/clients/${id}/edit`); }}><Pencil className="h-5 w-5 text-primary" />{tr('Редактировать')}</button>
          <button className={menuRow} onClick={() => { setMenu(false); setConfirm('archive'); }}>{c.isArchived ? <ArchiveRestore className="h-5 w-5 text-primary" /> : <Archive className="h-5 w-5 text-primary" />}{c.isArchived ? tr('Вернуть из архива') : tr('В архив')}</button>
          {canMerge && <button className={menuRow} onClick={() => { setMenu(false); setMergeOpen(true); }}><GitMerge className="h-5 w-5 text-primary" />{tr('Объединить с дублем')}</button>}
        </div>
        <div className="surface-quiet p-1.5"><button className={cn(menuRow, 'text-danger-text')} onClick={() => { setMenu(false); setConfirm('blacklist'); }}><Ban className="h-5 w-5" />{tr('В чёрный список')}</button></div>
      </div>
    </Sheet>
    <Sheet open={mergeOpen} onOpenChange={setMergeOpen} title={tr('Объединить клиентов')} description={tr('История, лиды и заметки дубля перейдут в эту карточку.')} desktop="center" size="sm"
      footer={<><Button variant="outline" className="flex-1" onClick={() => setMergeOpen(false)}>{tr('Отмена')}</Button><Button className="flex-[2]" disabled={!mergeWith} onClick={() => { setMergeOpen(false); setConfirm('merge'); }}>{tr('Продолжить')}</Button></>}>
      <ul className="space-y-2">{store.db.clients.filter((x) => x.id !== c.id).slice(0, 5).map((x) => (
        <li key={x.id}><button onClick={() => setMergeWith(x.id)} aria-pressed={mergeWith === x.id} className={cn('flex w-full items-center gap-3 rounded-control border p-3 text-left', mergeWith === x.id ? 'border-primary bg-primary-soft' : 'border-border bg-surface')}><Avatar name={x.fullName} size={36} /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{x.fullName}</span><span className="t-caption tabular">{x.primaryPhone}</span></span></button></li>))}</ul>
    </Sheet>
    <AttachPropertySheet open={attach} onOpenChange={setAttach} clientId={c.id} />
    <ConfirmDialog open={confirm === 'archive'} onOpenChange={(o) => !o && setConfirm(null)} tone="primary" busy={busy}
      title={c.isArchived ? tr('Вернуть из архива?') : tr('Перенести в архив?')} text={c.isArchived ? tr('Клиент снова появится в активных.') : tr('Клиент исчезнет из активных, история сохранится. Вернуть можно в любой момент.')} confirmLabel={c.isArchived ? tr('Вернуть') : tr('В архив')}
      onConfirm={async () => { setBusy(true); await api.setArchived(c.id, !c.isArchived); setBusy(false); setConfirm(null); toast.success(c.isArchived ? tr('Клиент возвращён') : tr('Клиент в архиве'), { action: { label: tr('Отменить'), onClick: () => api.setArchived(c.id, c.isArchived) } }); }} />
    <ConfirmDialog open={confirm === 'blacklist'} onOpenChange={(o) => !o && setConfirm(null)} title={tr('Добавить в чёрный список?')} text={tr('По этому клиенту нельзя будет создать лид. Действие можно отменить в карточке.')} confirmLabel={tr('В чёрный список')} onConfirm={() => { setConfirm(null); toast.success(tr('Клиент в чёрном списке')); }} />
    <ConfirmDialog open={confirm === 'merge'} onOpenChange={(o) => !o && setConfirm(null)} title={tr('Объединить карточки?')} text={tr('Дубль будет удалён, его данные перейдут сюда. Отменить объединение нельзя.')} confirmLabel={tr('Объединить')} onConfirm={() => { setConfirm(null); toast.success(tr('Карточки объединены')); }} />
    <ScheduleShowingSheet open={showing} onOpenChange={setShowing} client={c} />
    <CallDispositionSheet open={call} onOpenChange={setCall} clientId={c.id} name={c.fullName} phone={c.primaryPhone} />
  </>);

  const leadBanner = lead ? (
    <Link href={`/leads/${lead.id}`} className="pressable flex items-center gap-3 rounded-card bg-primary-soft p-4">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-primary"><Workflow className="h-5 w-5" aria-hidden /></span>
      <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-primary">{tr('Активный лид')}</span><span className="block truncate text-[15px] font-semibold">{STAGE_LABEL[lead.stage]}, {budget(lead.budgetMin, lead.budgetMax)}</span></span>
      <ChevronRight className="h-4 w-4 text-primary" aria-hidden />
    </Link>
  ) : (
    <div className="surface flex items-center gap-3 p-4"><span className="t-caption flex-1 text-[14px]">{tr('Активного лида нет.')}</span><Button size="sm" variant="outline" onClick={() => ui.set({ quickCreate: 'lead' })}>{tr('Добавить в воронку')}</Button></div>
  );

  const prefsBlock = (
    <section className="surface p-4">
      <h2 className="t-h3 mb-2">{tr('Предпочтения')}</h2>
      {prefs ? (
        <dl className="row-divider -mx-1 text-[14.5px]">
          {[[tr('Тип'), prefs.propertyType ? PROPERTY_TYPE_LABEL[prefs.propertyType] : tr('Любой')], [tr('Районы'), prefs.districts.join(', ') || '—'], [tr('Комнат'), prefs.rooms?.min ? tr('от {n}', { n: prefs.rooms.min }) : '—'], [tr('Бюджет'), budget(prefs.price?.min, prefs.price?.max, prefs.currency)]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-1 py-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>))}
        </dl>
      ) : <p className="t-caption">{tr('Не заполнены. Добавьте в форме клиента.')}</p>}
      {c.notes && <p className="mt-3 rounded-control bg-surface-2 p-3 text-[14.5px] leading-[21px]">{c.notes}</p>}
    </section>
  );

  const interestsBlock = <ClientProperties clientId={c.id} onAttach={() => setAttach(true)} />;

  const identity = (
    <div className={cn('flex items-center gap-4', family !== 'atlas' && 'max-lg:flex-col max-lg:text-center')}>
      <Avatar name={c.fullName} size={family === 'atlas' ? 56 : 84} className="ring-4 ring-surface" />
      <div className="min-w-0">
        <h1 className={family === 'atlas' ? 't-h1' : 't-h1'}>{c.fullName}</h1>
        <div className={cn('mt-1.5 flex flex-wrap items-center gap-2', family !== 'atlas' && 'max-lg:justify-center')}>
          <StatusBadge tone="neutral">{CLIENT_TYPE_LABEL[c.type]}</StatusBadge>
          {c.isArchived && <StatusBadge tone="warning" dot>{tr('В архиве')}</StatusBadge>}
          <span className="t-caption">{SOURCE_LABEL[c.source]}, {tr('с')} {relDay(c.createdAt).toLowerCase()}</span>
        </div>
      </div>
    </div>
  );

  if (family === 'atlas' && isDesktop) {
    return (
      <PageBody wide>
        <PageHeader title="" back="/clients" large={false} actions={<IconButton label={tr('Действия')} variant="outline" onClick={() => setMenu(true)}><MoreHorizontal /></IconButton>} />
        <div className="surface -mt-4 flex items-center gap-6 p-4">{identity}<div className="ml-auto w-[340px]"><QuickActions client={c} onCall={() => setCall(true)} onShowing={() => setShowing(true)} onTask={() => ui.set({ quickCreate: 'task' })} /></div></div>
        <div className="mt-4 grid grid-cols-[320px_minmax(0,1fr)_320px] gap-4">
          <div className="space-y-4">{prefsBlock}<section className="surface p-4"><h2 className="t-h3 mb-2">{tr('Ответственный')}</h2><div className="flex items-center gap-2.5"><Avatar name={owner?.fullName ?? '—'} src={owner?.avatarUrl} size={32} /><span className="font-medium">{owner?.fullName ?? tr('Не назначен')}</span></div></section></div>
          <section className="surface min-w-0 p-4"><h2 className="t-h2 mb-3">{tr('История взаимодействий')}</h2><div className="mb-4"><NoteComposer clientId={c.id} /></div><ActivityTimeline clientId={c.id} /></section>
          <div className="space-y-4">{leadBanner}{interestsBlock}</div>
        </div>
        {overlays}
      </PageBody>
    );
  }

  return (
    <PageBody className="lg:max-w-[1040px]">
      <PageHeader title="" back="/clients" large={false} actions={<IconButton label={tr('Действия')} onClick={() => setMenu(true)}><MoreHorizontal /></IconButton>} />
      <div className="-mt-6 lg:-mt-2">{identity}</div>
      <div className="mx-auto mt-5 max-w-[420px] lg:mx-0"><QuickActions client={c} onCall={() => setCall(true)} onShowing={() => setShowing(true)} onTask={() => ui.set({ quickCreate: 'task' })} /></div>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="min-w-0 space-y-4 lg:order-2">{leadBanner}{prefsBlock}{interestsBlock}</div>
        <div className="min-w-0 space-y-4 lg:order-1"><h2 className="t-h2">{tr('История')}</h2><NoteComposer clientId={c.id} /><section className="surface p-4"><ActivityTimeline clientId={c.id} /></section></div>
      </div>
      {overlays}
    </PageBody>
  );
}

/**
 * Объекты, которые клиент смотрит. Риелтор ведёт одного покупателя по
 * трём-четырём объектам сразу; без этого списка он держит их в переписке,
 * а на показе выясняется, что дом уже смотрели с другим агентом.
 *
 * Показ по объекту прикрепляет его сюда сам (api.createEvent) — список и
 * календарь не расходятся.
 */
function ClientProperties({ clientId, onAttach }: { clientId: string; onAttach: () => void }) {
  const r = useResource(() => api.clientInterests(clientId), [clientId]);
  const [remove, setRemove] = React.useState<Interest | null>(null);
  const items = r.data ?? [];

  return (
    <section className="surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="t-h3">{tr('Объекты клиента')}</h2>
        <Button size="sm" variant="outline" onClick={onAttach}><Plus />{tr('Прикрепить')}</Button>
      </div>
      {r.loading && !r.data ? <Skeleton className="mt-3 h-24" /> : items.length === 0 ? (
        <p className="t-caption mt-2">{tr('Пока ничего. Прикрепите объекты из подборки — они соберутся здесь вместе с показами.')}</p>
      ) : (
        <ul className="row-divider mt-2">
          {items.map((x) => {
            const p = store.db.properties.find((pr) => pr.id === x.propertyId);
            if (!p) return null;
            return (
              <li key={x.id} className="py-2.5">
                <div className="flex items-center gap-3">
                  <Link href={`/properties/${p.id}`} className="pressable flex min-w-0 flex-1 items-center gap-3 rounded-control">
                    <PropertyMedia art={p.photos[0]?.art ?? 0} src={p.photos[0]?.url} video={p.photos[0]?.kind === 'video'} aspect="1/1" className="w-12 shrink-0 !rounded-[10px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-medium">{p.title}</span>
                      <span className="t-caption block truncate">{p.district} · {money(p.price, p.currency, true)}</span>
                    </span>
                  </Link>
                  <IconButton label={tr('Убрать {name}', { name: p.title })} variant="ghost" onClick={() => setRemove(x)}><X /></IconButton>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {INTEREST_ORDER.map((st) => (
                    <button key={st} type="button" aria-pressed={x.status === st}
                      onClick={() => void api.setInterest(x.id, { status: st })}
                      className={cn('min-h-[44px] rounded-full border px-3 text-[12.5px] font-medium transition-colors lg:min-h-[32px]',
                        x.status === st ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-muted-foreground hover:bg-surface-2')}>
                      {INTEREST_LABEL[st]}
                    </button>
                  ))}
                </div>
                {x.note && <p className="t-caption mt-1.5">{x.note}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog open={remove !== null} onOpenChange={(v) => !v && setRemove(null)} title={tr('Убрать объект?')}
        text={tr('Объект пропадёт из списка клиента. Сам объект и прошедшие показы останутся на месте.')} confirmLabel={tr('Убрать')}
        onConfirm={async () => { if (remove) await api.detachProperty(remove.id); setRemove(null); toast.success(tr('Объект убран')); }} />
    </section>
  );
}

/** Прикрепить объект: поиск по названию, району и цене — как в подборке. */
function AttachPropertySheet({ open, onOpenChange, clientId }: { open: boolean; onOpenChange: (o: boolean) => void; clientId: string }) {
  const [pick, setPick] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) setPick(''); }, [open]);

  const taken = store.db.interests.filter((x) => x.clientId === clientId).map((x) => x.propertyId);
  const options = store.db.properties
    .filter((p) => p.status !== 'SOLD' && p.status !== 'ARCHIVED' && !taken.includes(p.id))
    .map((p) => ({ value: p.id, label: p.title, meta: `${p.district} · ${money(p.price, p.currency, true)}` }));

  const save = async () => {
    if (!pick) return;
    setBusy(true);
    try { await api.attachProperty(clientId, pick); onOpenChange(false); toast.success(tr('Объект прикреплён к клиенту')); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={tr('Прикрепить объект')} description={tr('Объект появится в карточке клиента и в подборке к показу.')} desktop="center" size="sm"
      footer={<><Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{tr('Отмена')}</Button><Button className="flex-[2]" loading={busy} disabled={!pick} onClick={save}>{tr('Прикрепить')}</Button></>}>
      {options.length === 0
        ? <p className="t-caption">{tr('Свободных объектов не осталось — все уже прикреплены к этому клиенту.')}</p>
        : <PickerField label={tr('Объект')} value={pick} onChange={setPick} options={options} emptyLabel={tr('Выберите объект')} searchPlaceholder={tr('Название, район или цена')} />}
    </Sheet>
  );
}
