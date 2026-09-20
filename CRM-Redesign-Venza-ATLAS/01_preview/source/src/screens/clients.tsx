import * as React from 'react';
import { Archive, ArchiveRestore, Ban, ChevronRight, GitMerge, MoreHorizontal, Pencil, Search, UserPlus, Users, Workflow } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { store, usePreviewSettings, users } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { Link, useRouter } from '@/lib/router';
import { useIsDesktop, useTheme } from '@/lib/theme/provider';
import { budget, relDay } from '@/lib/format';
import { CLIENT_TYPE_LABEL, PROPERTY_TYPE_LABEL, SOURCE_LABEL, STAGE_LABEL } from '@/lib/labels';
import type { Client } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { ui } from '@/components/shell/ui-state';
import { Avatar } from '@/components/ui/avatar';
import { Button, IconButton } from '@/components/ui/button';
import { StageBadge, StatusBadge } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented';
import { RowsSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { ConfirmDialog, Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { ActivityTimeline, NoteComposer } from '@/components/domain/activity';
import { CallDispositionSheet } from '@/components/overlays/person-actions';
import { DetailSkeleton, QuickActions, ScheduleShowingSheet } from './lead-detail';

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
  const leadOf = (c: Client) => store.db.leads.find((l) => l.clientId === c.id && l.stage !== 'WON' && l.stage !== 'LOST');

  const list = () => {
    if (r.error) return <ErrorState error={r.error} onRetry={r.retry} what="клиентов" />;
    if (r.loading) return <RowsSkeleton rows={7} />;
    const items = r.data?.items ?? [];
    if (!items.length) return debounced
      ? <EmptyState icon={Search} title="Никого не нашли" text={`По запросу «${debounced}» клиентов нет. Проверьте номер или имя.`} action={<Button variant="outline" size="sm" onClick={() => setTerm('')}>Очистить поиск</Button>} />
      : status === 'active' ? <EmptyState icon={Users} title="Клиентов пока нет" text="Клиент появится, когда вы создадите первый лид." action={<Button onClick={() => ui.set({ quickCreate: 'lead' })}><UserPlus />Новый лид</Button>} />
      : <EmptyState icon={status === 'archived' ? Archive : Ban} title={status === 'archived' ? 'Архив пуст' : 'Чёрный список пуст'} text={status === 'archived' ? 'Сюда попадают клиенты, с которыми работа завершена.' : 'Клиенты из чёрного списка не могут стать лидами.'} />;

    if (family === 'atlas' && isDesktop) {
      return (
        <div data-hscroll className="surface overflow-x-auto">
          <table className="w-full min-w-[760px] text-[14px]">
            <thead><tr className="border-b border-border text-left text-[12.5px] text-muted-foreground">{['Клиент', 'Тип', 'Телефон', 'Активный лид', 'Источник', 'Ответственный', 'Создан'].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{items.map((c) => { const l = leadOf(c); return (
              <tr key={c.id} className="group border-b border-border/70 last:border-0 hover:bg-surface-2/60">
                <td className="px-4 py-2"><Link href={`/clients/${c.id}`} className="flex items-center gap-2.5 font-medium group-hover:underline"><Avatar name={c.fullName} size={30} />{c.fullName}</Link></td>
                <td className="px-4 py-2 text-muted-foreground">{CLIENT_TYPE_LABEL[c.type]}</td>
                <td className="px-4 py-2 tabular">{c.primaryPhone}</td>
                <td className="px-4 py-2">{l ? <StageBadge stage={l.stage} /> : <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-2 text-muted-foreground">{SOURCE_LABEL[c.source]}</td>
                <td className="px-4 py-2 text-muted-foreground">{users.find((u) => u.id === c.assignedUserId)?.fullName ?? 'Не назначен'}</td>
                <td className="px-4 py-2 text-muted-foreground tabular">{relDay(c.createdAt)}</td>
              </tr>); })}</tbody>
          </table>
        </div>
      );
    }
    return (
      <ul className="surface row-divider overflow-hidden">
        {items.map((c) => { const l = leadOf(c); return (
          <li key={c.id}><Link href={`/clients/${c.id}`} className="pressable flex items-center gap-3 px-4 py-3.5">
            <Avatar name={c.fullName} size={44} />
            <div className="min-w-0 flex-1"><div className="truncate text-[15.5px] font-semibold">{c.fullName}</div><div className="t-caption truncate tabular">{CLIENT_TYPE_LABEL[c.type]}, {c.primaryPhone}</div></div>
            {l ? <StageBadge stage={l.stage} /> : null}
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link></li>); })}
      </ul>
    );
  };

  const total = r.data?.total;
  return (
    <PageBody wide={family === 'atlas'}>
      <PageHeader title="Клиенты" subtitle={total !== undefined ? `${total} в разделе` : ' '}
        actions={<IconButton label="Новый клиент" onClick={() => router.navigate('/clients/new')}><UserPlus /></IconButton>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SegmentedControl<Status> label="Статус клиентов" value={status} onChange={setStatus} className="w-full sm:w-auto"
          options={[{ value: 'active', label: 'Активные' }, { value: 'archived', label: 'Архив' }, { value: 'blacklisted', label: 'Чёрный список' }]} />
        <div className="relative flex-1 sm:max-w-[320px] sm:ml-auto">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Имя или телефон" aria-label="Поиск клиентов"
            className="h-11 w-full rounded-control border border-input bg-surface pl-10 pr-3 text-[16px] shadow-soft outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[0_0_0_4px_hsl(var(--primary)/.12)] lg:h-10 lg:text-[14px]" />
        </div>
      </div>
      {list()}
      {total !== undefined && total > 0 && <p className="t-caption mt-3 text-center">Показано {total} из {total}</p>}
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
  const canMerge = settings.role === 'ADMIN' || settings.role === 'MANAGER';

  if (r.error) return <PageBody><PageHeader title="Клиент" back="/clients" /><ErrorState error={r.error} onRetry={r.retry} what="карточку клиента" /></PageBody>;
  if (r.loading || !r.data) return <PageBody><PageHeader title="Загружаем…" back="/clients" large={false} /><DetailSkeleton /></PageBody>;
  const c = r.data;
  const lead = store.db.leads.find((l) => l.clientId === c.id && l.stage !== 'WON' && l.stage !== 'LOST');
  const owner = users.find((u) => u.id === c.assignedUserId);
  const prefs = c.preferences;

  const menuRow = 'pressable flex min-h-[54px] w-full items-center gap-3.5 rounded-control px-3 text-left text-[16px] font-medium';
  const overlays = (<>
    <Sheet open={menu} onOpenChange={setMenu} title={c.fullName} desktop="center" size="sm">
      <div className="space-y-3">
        <div className="surface-quiet p-1.5">
          <button className={menuRow} onClick={() => { setMenu(false); router.navigate(`/clients/${id}/edit`); }}><Pencil className="h-5 w-5 text-primary" />Редактировать</button>
          <button className={menuRow} onClick={() => { setMenu(false); setConfirm('archive'); }}>{c.isArchived ? <ArchiveRestore className="h-5 w-5 text-primary" /> : <Archive className="h-5 w-5 text-primary" />}{c.isArchived ? 'Вернуть из архива' : 'В архив'}</button>
          {canMerge && <button className={menuRow} onClick={() => { setMenu(false); setMergeOpen(true); }}><GitMerge className="h-5 w-5 text-primary" />Объединить с дублем</button>}
        </div>
        <div className="surface-quiet p-1.5"><button className={cn(menuRow, 'text-danger-text')} onClick={() => { setMenu(false); setConfirm('blacklist'); }}><Ban className="h-5 w-5" />В чёрный список</button></div>
      </div>
    </Sheet>
    <Sheet open={mergeOpen} onOpenChange={setMergeOpen} title="Объединить клиентов" description="История, лиды и заметки дубля перейдут в эту карточку." desktop="center" size="sm"
      footer={<><Button variant="outline" className="flex-1" onClick={() => setMergeOpen(false)}>Отмена</Button><Button className="flex-[2]" disabled={!mergeWith} onClick={() => { setMergeOpen(false); setConfirm('merge'); }}>Продолжить</Button></>}>
      <ul className="space-y-2">{store.db.clients.filter((x) => x.id !== c.id).slice(0, 5).map((x) => (
        <li key={x.id}><button onClick={() => setMergeWith(x.id)} aria-pressed={mergeWith === x.id} className={cn('flex w-full items-center gap-3 rounded-control border p-3 text-left', mergeWith === x.id ? 'border-primary bg-primary-soft' : 'border-border bg-surface')}><Avatar name={x.fullName} size={36} /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{x.fullName}</span><span className="t-caption tabular">{x.primaryPhone}</span></span></button></li>))}</ul>
    </Sheet>
    <ConfirmDialog open={confirm === 'archive'} onOpenChange={(o) => !o && setConfirm(null)} tone="primary" busy={busy}
      title={c.isArchived ? 'Вернуть из архива?' : 'Перенести в архив?'} text={c.isArchived ? 'Клиент снова появится в активных.' : 'Клиент исчезнет из активных, история сохранится. Вернуть можно в любой момент.'} confirmLabel={c.isArchived ? 'Вернуть' : 'В архив'}
      onConfirm={async () => { setBusy(true); await api.setArchived(c.id, !c.isArchived); setBusy(false); setConfirm(null); toast.success(c.isArchived ? 'Клиент возвращён' : 'Клиент в архиве', { action: { label: 'Отменить', onClick: () => api.setArchived(c.id, c.isArchived) } }); }} />
    <ConfirmDialog open={confirm === 'blacklist'} onOpenChange={(o) => !o && setConfirm(null)} title="Добавить в чёрный список?" text="По этому клиенту нельзя будет создать лид. Действие можно отменить в карточке." confirmLabel="В чёрный список" onConfirm={() => { setConfirm(null); toast.success('Клиент в чёрном списке'); }} />
    <ConfirmDialog open={confirm === 'merge'} onOpenChange={(o) => !o && setConfirm(null)} title="Объединить карточки?" text="Дубль будет удалён, его данные перейдут сюда. Отменить объединение нельзя." confirmLabel="Объединить" onConfirm={() => { setConfirm(null); toast.success('Карточки объединены'); }} />
    <ScheduleShowingSheet open={showing} onOpenChange={setShowing} client={c} />
    <CallDispositionSheet open={call} onOpenChange={setCall} clientId={c.id} name={c.fullName} phone={c.primaryPhone} />
  </>);

  const leadBanner = lead ? (
    <Link href={`/leads/${lead.id}`} className="pressable flex items-center gap-3 rounded-card bg-primary-soft p-4">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-primary"><Workflow className="h-5 w-5" aria-hidden /></span>
      <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-primary">Активный лид</span><span className="block truncate text-[15px] font-semibold">{STAGE_LABEL[lead.stage]}, {budget(lead.budgetMin, lead.budgetMax)}</span></span>
      <ChevronRight className="h-4 w-4 text-primary" aria-hidden />
    </Link>
  ) : (
    <div className="surface flex items-center gap-3 p-4"><span className="t-caption flex-1 text-[14px]">Активного лида нет.</span><Button size="sm" variant="outline" onClick={() => ui.set({ quickCreate: 'lead' })}>Добавить в воронку</Button></div>
  );

  const prefsBlock = (
    <section className="surface p-4">
      <h2 className="t-h3 mb-2">Предпочтения</h2>
      {prefs ? (
        <dl className="row-divider -mx-1 text-[14.5px]">
          {[['Тип', prefs.propertyType ? PROPERTY_TYPE_LABEL[prefs.propertyType] : 'Любой'], ['Районы', prefs.districts.join(', ') || '—'], ['Комнат', prefs.rooms?.min ? `от ${prefs.rooms.min}` : '—'], ['Бюджет', budget(prefs.price?.min, prefs.price?.max, prefs.currency)]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-1 py-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>))}
        </dl>
      ) : <p className="t-caption">Не заполнены. Добавьте в форме клиента.</p>}
      {c.notes && <p className="mt-3 rounded-control bg-surface-2 p-3 text-[14.5px] leading-[21px]">{c.notes}</p>}
    </section>
  );

  const identity = (
    <div className={cn('flex items-center gap-4', family !== 'atlas' && 'max-lg:flex-col max-lg:text-center')}>
      <Avatar name={c.fullName} size={family === 'atlas' ? 56 : 84} className="ring-4 ring-surface" />
      <div className="min-w-0">
        <h1 className={family === 'atlas' ? 't-h1' : 't-h1'}>{c.fullName}</h1>
        <div className={cn('mt-1.5 flex flex-wrap items-center gap-2', family !== 'atlas' && 'max-lg:justify-center')}>
          <StatusBadge tone="neutral">{CLIENT_TYPE_LABEL[c.type]}</StatusBadge>
          {c.isArchived && <StatusBadge tone="warning" dot>В архиве</StatusBadge>}
          <span className="t-caption">{SOURCE_LABEL[c.source]}, с {relDay(c.createdAt).toLowerCase()}</span>
        </div>
      </div>
    </div>
  );

  if (family === 'atlas' && isDesktop) {
    return (
      <PageBody wide>
        <PageHeader title="" back="/clients" large={false} actions={<IconButton label="Действия" variant="outline" onClick={() => setMenu(true)}><MoreHorizontal /></IconButton>} />
        <div className="surface -mt-4 flex items-center gap-6 p-4">{identity}<div className="ml-auto w-[340px]"><QuickActions client={c} onCall={() => setCall(true)} onShowing={() => setShowing(true)} onTask={() => ui.set({ quickCreate: 'task' })} /></div></div>
        <div className="mt-4 grid grid-cols-[320px_minmax(0,1fr)_320px] gap-4">
          <div className="space-y-4">{prefsBlock}<section className="surface p-4"><h2 className="t-h3 mb-2">Ответственный</h2><div className="flex items-center gap-2.5"><Avatar name={owner?.fullName ?? '—'} size={32} /><span className="font-medium">{owner?.fullName ?? 'Не назначен'}</span></div></section></div>
          <section className="surface min-w-0 p-4"><h2 className="t-h2 mb-3">История взаимодействий</h2><div className="mb-4"><NoteComposer clientId={c.id} /></div><ActivityTimeline clientId={c.id} /></section>
          <div className="space-y-4">{leadBanner}</div>
        </div>
        {overlays}
      </PageBody>
    );
  }

  return (
    <PageBody className="lg:max-w-[1040px]">
      <PageHeader title="" back="/clients" large={false} actions={<IconButton label="Действия" onClick={() => setMenu(true)}><MoreHorizontal /></IconButton>} />
      <div className="-mt-6 lg:-mt-2">{identity}</div>
      <div className="mx-auto mt-5 max-w-[420px] lg:mx-0"><QuickActions client={c} onCall={() => setCall(true)} onShowing={() => setShowing(true)} onTask={() => ui.set({ quickCreate: 'task' })} /></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="min-w-0 space-y-4 lg:order-2">{leadBanner}{prefsBlock}</div>
        <div className="min-w-0 space-y-4 lg:order-1"><h2 className="t-h2">История</h2><NoteComposer clientId={c.id} /><section className="surface p-4"><ActivityTimeline clientId={c.id} /></section></div>
      </div>
      {overlays}
    </PageBody>
  );
}
