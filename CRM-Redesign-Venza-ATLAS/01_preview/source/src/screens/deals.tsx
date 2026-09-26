import * as React from 'react';
import { AlertTriangle, CheckCircle2, FileText, Handshake, Plus, Printer, Trash2, Upload, Wallet, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { store, usePreviewSettings, users } from '@/lib/mock/store';
import { dealsApi, useDealsVersion, DEAL_STATUS_LABEL, type Deal, type DealStatus } from '@/lib/mock/deals';
import { useResource } from '@/lib/use-resource';
import { useChunked } from '@/lib/use-chunked';
import { ShowMore } from '@/components/ui/show-more';
import { useHScrollFade } from '@/lib/use-hscroll';
import { Link, useRouter } from '@/lib/router';
import { useIsDesktop, useTheme } from '@/lib/theme/provider';
import { money, relDay } from '@/lib/format';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Avatar } from '@/components/ui/avatar';
import { Button, IconButton } from '@/components/ui/button';
import { StatusBadge, type Tone } from '@/components/ui/badge';
import { Field, Input, Select } from '@/components/ui/field';
import { PickerField } from '@/components/ui/picker';
import { SegmentedControl } from '@/components/ui/segmented';
import { RowsSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { ConfirmDialog, Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { PropertyMedia } from '@/components/domain/property-media';
import { LostReasonSheet } from '@/components/overlays/lead-stage';
import { tr } from '@/lib/i18n';

const STATUS_TONE: Record<DealStatus, Tone> = { ACTIVE: 'primary', COMPLETED: 'success', CANCELLED: 'neutral' };
const clientName = (id: string) => store.db.clients.find((c) => c.id === id)?.fullName ?? '—';
const property = (id?: string) => store.db.properties.find((p) => p.id === id);

/** /deals — список | доска. Перенос в «Отменена» требует причину (как LOST в воронке). */
export function DealsScreen() {
  const boardRow = useHScrollFade<HTMLDivElement>();   // на телефоне колонки сделок листаются вбок
  const { family } = useTheme();
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const dv = useDealsVersion();
  const r = useResource(() => dealsApi.list(), [dv]);
  const [view, setView] = React.useState<'list' | 'board'>(isDesktop ? 'board' : 'list');
  const [cancelFor, setCancelFor] = React.useState<Deal | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<DealStatus | null>(null);
  const all = r.data ?? [];
  /* Доска рисует три колонки целиком — там порции только мешали бы перетаскиванию.
     Порциями идёт список. */
  const page = useChunked(all, 'deals:list');
  const items = view === 'board' ? all : page.visible;
  const active = items.filter((d) => d.status === 'ACTIVE');
  const expected = active.reduce((a, d) => a + dealsApi.commission(d), 0);

  const move = async (d: Deal, s: DealStatus, reason?: string) => {
    if (d.status === s) return;
    if (s === 'CANCELLED' && !reason) { setCancelFor(d); return; }
    const { prev } = await dealsApi.setStatus(d.id, s, reason);
    toast.success(s === 'COMPLETED' ? tr('Сделка завершена, лид — «Сделка»') : s === 'CANCELLED' ? tr('Сделка отменена, лид — «Проиграно»') : tr('Сделка снова в работе'),
      { action: { label: tr('Отменить'), onClick: () => dealsApi.setStatus(d.id, prev) } });
  };

  const body = () => {
    if (r.error) return <ErrorState error={r.error} onRetry={r.retry} what={tr('сделки')} />;
    if (r.loading) return <RowsSkeleton rows={5} />;
    if (!items.length) return <EmptyState icon={Handshake} title={tr('Сделок пока нет')} text={tr('Сделка появляется из карточки лида кнопкой «Готов купить».')} action={<Button onClick={() => router.navigate('/deals/new')}><Plus />{tr('Новая сделка')}</Button>} />;
    if (view === 'board') {
      const cols: DealStatus[] = ['ACTIVE', 'COMPLETED', 'CANCELLED'];
      return (
        /* Полоски-ползунка здесь нет намеренно: колонки высокие, и низ ряда
           оказывается далеко за экраном — подсказку там никто не увидит.
           Про прокрутку говорит затухание у края. */
        <div ref={boardRow} data-hscroll className="no-scrollbar relative -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
          {cols.map((s) => { const list = items.filter((d) => d.status === s); const drag = items.find((d) => d.id === dragId); return (
            <section key={s} aria-label={DEAL_STATUS_LABEL[s]} onDragOver={(e) => { if (drag && drag.status !== s) { e.preventDefault(); setOver(s); } }} onDragLeave={() => setOver(null)}
              onDrop={() => { setOver(null); if (drag) move(drag, s); setDragId(null); }}
              className={cn('flex w-[84vw] max-w-[340px] shrink-0 snap-center flex-col rounded-card p-2 lg:w-auto lg:max-w-none', family === 'atlas' ? 'border border-border/70 bg-surface-2/50' : 'bg-surface-2/60', over === s && 'drop-target')}>
              <header className="flex items-center gap-2 px-2 pb-2 pt-1.5"><StatusBadge tone={STATUS_TONE[s]} dot>{DEAL_STATUS_LABEL[s]}</StatusBadge><span className="t-caption tabular">{list.length}</span><span className="t-micro ml-auto tabular">{money(list.reduce((a, d) => a + d.amount, 0), 'EUR', true)}</span></header>
              <div className="flex min-h-[120px] flex-col gap-2">
                {list.map((d) => <div key={d.id} draggable onDragStart={() => setDragId(d.id)} onDragEnd={() => { setDragId(null); setOver(null); }} className={cn('cursor-grab', dragId === d.id && 'drag-lift')}><DealCard d={d} /></div>)}
                {!list.length && <div className="t-caption grid flex-1 place-items-center rounded-[10px] border border-dashed border-border p-4 text-center">{tr('Пусто')}</div>}
              </div>
            </section>); })}
        </div>
      );
    }
    return (
      <>
      <ul className="surface row-divider overflow-hidden">
        {items.map((d) => { const p = property(d.propertyId); return (
          <li key={d.id}><Link href={`/deals/${d.id}`} className="pressable flex items-center gap-3 px-4 py-3.5">
            {p ? <PropertyMedia art={p.photos[0].art} aspect="1/1" className="w-12 shrink-0 !rounded-[12px]" /> : <Avatar name={clientName(d.clientId)} size={48} />}
            <div className="min-w-0 flex-1"><div className="truncate text-[15.5px] font-semibold">{clientName(d.clientId)}</div><div className="t-caption truncate">{p?.title ?? tr('Объект не выбран')}</div></div>
            <div className="text-right"><div className={cn('tabular', family === 'atlas' ? 'text-[15px] font-bold' : 't-num text-[17px] font-semibold')}>{money(d.amount, d.currency, true)}</div><StatusBadge tone={STATUS_TONE[d.status]} className="mt-1">{DEAL_STATUS_LABEL[d.status]}</StatusBadge></div>
          </Link></li>); })}
      </ul>
      <ShowMore more={page.more} total={page.total} shown={items.length} onMore={page.loadMore} what="deal" />
      </>
    );
  };

  return (
    <PageBody wide={family === 'atlas'}>
      <PageHeader title={tr('Сделки')} subtitle={r.data ? tr('{n} в работе, ожидаемая комиссия {sum}', { n: active.length, sum: money(expected, 'EUR', true) }) : ' '}
        actions={<><SegmentedControl label={tr('Вид')} size="sm" value={view} onChange={setView} options={[{ value: 'list', label: tr('Список') }, { value: 'board', label: tr('Доска') }]} /><Button size="sm" variant="soft" className="max-lg:hidden" onClick={() => router.navigate('/deals/new')}><Plus />{tr('Сделка')}</Button></>} />
      {body()}
      <LostReasonSheet open={!!cancelFor} onOpenChange={(o) => !o && setCancelFor(null)} onConfirm={async (reason) => { if (cancelFor) await move(cancelFor, 'CANCELLED', reason); }} />
    </PageBody>
  );
}

function DealCard({ d }: { d: Deal }) {
  const p = property(d.propertyId);
  const paid = dealsApi.paid(d); const commission = dealsApi.commission(d);
  return (
    <Link href={`/deals/${d.id}`} draggable={false} className="pressable surface block overflow-hidden">
      {p && <PropertyMedia art={p.photos[0].art} aspect="16/7" rounded={false} />}
      <div className="p-3">
        <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[14.5px] font-semibold">{clientName(d.clientId)}</span><span className="text-[14px] font-bold tabular">{money(d.amount, d.currency, true)}</span></div>
        <div className="t-caption truncate">{p?.title ?? tr('Объект не выбран')}</div>
        <div className="mt-2.5">
          <div className="flex justify-between text-[12px] text-muted-foreground"><span>{tr('Комиссия')}{d.commissionPercent}%</span><span className="tabular">{money(paid, d.currency, true)} {tr('из')} {money(commission, d.currency, true)}</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-row" style={{ width: `${Math.min(100, (paid / Math.max(1, commission)) * 100)}%` }} /></div>
        </div>
      </div>
    </Link>
  );
}

/** /deals/new?leadId= — лид*, объект (предупреждение о конфликте), сумма*, комиссия* (3%). Отмена с изменениями → Confirm. */
export function DealNewScreen() {
  const router = useRouter();
  const leadFromUrl = new URLSearchParams(location.hash.split('?')[1] ?? '').get('leadId') ?? '';
  const candidates = store.db.leads.filter((l) => l.stage !== 'WON' && l.stage !== 'LOST');
  const initialLead = store.db.leads.find((l) => l.id === leadFromUrl);
  const [v, setV] = React.useState({ leadId: leadFromUrl, propertyId: initialLead?.interestPropertyId ?? '', amount: initialLead?.budgetMax ? String(initialLead.budgetMax) : '', commission: '3' });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [discard, setDiscard] = React.useState(false);
  const dirty = v.leadId !== leadFromUrl || v.amount !== (initialLead?.budgetMax ? String(initialLead.budgetMax) : '') || v.commission !== '3';
  const conflict = v.propertyId ? dealsApi.activeOnProperty(v.propertyId) : undefined;
  const amount = Number(v.amount.replace(/\s/g, '')); const pct = Number(v.commission.replace(',', '.'));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!v.leadId) er.leadId = tr('Выберите лид');
    if (!(amount > 0)) er.amount = tr('Сумма больше нуля');
    if (!(pct >= 0 && pct <= 100) || v.commission === '') er.commission = tr('От 0 до 100');
    setErrors(er); if (Object.keys(er).length) return;
    setBusy(true);
    try { const d = await dealsApi.create({ leadId: v.leadId, propertyId: v.propertyId || undefined, amount, commissionPercent: pct }); toast.success(tr('Сделка создана')); router.navigate(`/deals/${d.id}`, { replace: true }); }
    catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <PageBody className="lg:max-w-[680px]">
      <PageHeader title={tr('Новая сделка')} back="/deals" subtitle={initialLead ? tr('Из лида: {name}', { name: clientName(initialLead.clientId) }) : undefined} />
      <form onSubmit={submit} noValidate className="surface space-y-4 p-4 lg:p-6">
        <PickerField label={tr('Лид')} required error={errors.leadId} emptyLabel={tr('Выберите лид')}
          value={v.leadId} onChange={(leadId) => { const l = store.db.leads.find((x) => x.id === leadId); setV({ ...v, leadId, propertyId: l?.interestPropertyId ?? v.propertyId }); }}
          options={candidates.map((l) => ({ value: l.id, label: clientName(l.clientId) }))} />
        <PickerField label={tr('Объект')} hint={tr('Можно выбрать позже')} emptyLabel={tr('Не выбран')} searchPlaceholder={tr('Найти по названию или району')}
          value={v.propertyId} onChange={(propertyId) => setV({ ...v, propertyId })}
          options={store.db.properties.filter((p) => p.status !== 'SOLD').map((p) => ({ value: p.id, label: p.title, meta: p.district }))} />
        {conflict && <div role="status" className="flex gap-2.5 rounded-control border border-warning/35 bg-warning/12 px-3.5 py-3 text-[14px] text-warning-text"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{tr('По этому объекту уже есть активная сделка с {name}. Создать можно, но проверьте, не дубль ли это.', { name: clientName(conflict.clientId) })}</div>}
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label={tr('Сумма, €')} required error={errors.amount}>{(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.amount} inputMode="numeric" className="tabular" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value.replace(/[^\d\s]/g, '') })} />}</Field>
          <Field label={tr('Комиссия, %')} required error={errors.commission}>{(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.commission} inputMode="decimal" className="tabular" value={v.commission} onChange={(e) => setV({ ...v, commission: e.target.value.replace(/[^\d.,]/g, '') })} />}</Field>
        </div>
        {amount > 0 && pct >= 0 && pct <= 100 && <p className="rounded-control bg-primary-soft px-3.5 py-3 text-[14.5px]">{tr('Комиссия агентства:')} <b className="tabular">{money(Math.round((amount * pct) / 100))}</b></p>}
        <div className="flex gap-2.5 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => (dirty ? setDiscard(true) : router.back('/deals'))}>{tr('Отмена')}</Button>
          <Button type="submit" className="flex-[2]" loading={busy}>{tr('Создать сделку')}</Button>
        </div>
      </form>
      <ConfirmDialog open={discard} onOpenChange={setDiscard} title={tr('Отменить изменения?')} text={tr('Введённые данные не сохранятся.')} confirmLabel={tr('Не сохранять')} onConfirm={() => { setDiscard(false); router.back('/deals'); }} />
    </PageBody>
  );
}

/** /deals/:id — статус, сумма/комиссия/остаток, платежи (ADMIN/MANAGER), печать договора из шаблона, документы, удаление. */
export function DealDetailScreen({ id }: { id: string }) {
  const { family } = useTheme();
  const router = useRouter();
  const settings = usePreviewSettings();
  const dv = useDealsVersion();
  const r = useResource(() => dealsApi.get(id), [id, dv]);
  const [payOpen, setPayOpen] = React.useState(false);
  const [contract, setContract] = React.useState(false);
  const [confirm, setConfirm] = React.useState<null | 'complete' | 'delete' | { doc: string }>(null);
  const [cancel, setCancel] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const canManage = settings.role === 'ADMIN' || settings.role === 'MANAGER';

  if (r.error) return <PageBody><PageHeader title={tr('Сделка')} back="/deals" /><ErrorState error={r.error} onRetry={r.retry} what={tr('сделку')} /></PageBody>;
  if (r.loading || !r.data) return <PageBody><PageHeader title="" back="/deals" large={false} /><Skeleton className="h-40 rounded-card" /><Skeleton className="mt-4 h-28 rounded-card" /><Skeleton className="mt-4 h-28 rounded-card" /></PageBody>;
  const d = r.data; const p = property(d.propertyId);
  const commission = dealsApi.commission(d); const paid = dealsApi.paid(d); const left = commission - paid;
  const owner = users.find((u) => u.id === d.userId)?.fullName;
  const num = family === 'atlas' ? 'text-[17px] sm:text-[22px] font-bold tabular tracking-[-0.03em]' : 't-num text-[19px] sm:text-[26px] font-semibold';

  return (
    <PageBody className={family === 'atlas' ? 'lg:max-w-[1180px]' : 'lg:max-w-[980px]'}>
      <PageHeader title={clientName(d.clientId)} back="/deals" large={false}
        subtitle={<span className="flex flex-wrap items-center gap-2"><StatusBadge tone={STATUS_TONE[d.status]} dot>{DEAL_STATUS_LABEL[d.status]}</StatusBadge>{tr('Создана')}{relDay(d.createdAt).toLowerCase()}, {owner}</span>}
        actions={canManage ? <IconButton label={tr('Удалить сделку')} variant="outline" onClick={() => setConfirm('delete')}><Trash2 /></IconButton> : undefined} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <section className="surface grid grid-cols-3 divide-x divide-border/70 p-0">
            {[[tr('Сумма сделки'), money(d.amount, d.currency, true)], [tr('Комиссия {pct}%', { pct: d.commissionPercent }), money(commission, d.currency, true)], [tr('Остаток'), money(Math.max(0, left), d.currency, true)]].map(([k, val], i) => (
              <div key={k} className="min-w-0 p-3 sm:p-3.5 lg:p-4"><div className="t-caption truncate">{k}</div><div className={cn('mt-1 whitespace-nowrap', num, i === 2 && left > 0 && d.status !== 'CANCELLED' && 'text-warning-text')}>{val}</div></div>))}
          </section>

          <section className="surface p-4">
            <div className="mb-2 flex items-center justify-between"><h2 className="t-h3">{tr('Платежи')}</h2>{canManage && d.status !== 'CANCELLED' && <Button size="sm" variant="soft" onClick={() => setPayOpen(true)}><Plus />{tr('Платёж')}</Button>}</div>
            {d.payments.length ? (
              <ul className="row-divider">{d.payments.map((pm) => (
                <li key={pm.id} className="flex items-center gap-3 py-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-success/12 text-success-text"><Wallet className="h-4 w-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1"><div className="text-[14.5px] font-medium">{({ COMMISSION: tr('Комиссия'), DEPOSIT: tr('Задаток'), OTHER: tr('Платёж') } as const)[pm.type]}</div><div className="t-caption truncate">{relDay(pm.paidAt)}{pm.note ? `, ${pm.note}` : ''}</div></div>
                  <span className="font-semibold tabular">{money(pm.amount, d.currency)}</span></li>))}</ul>
            ) : <p className="t-caption py-3">{tr('Платежей пока нет.')}{!canManage && tr(' Добавляет администратор или менеджер.')}</p>}
          </section>

          <section className="surface p-4">
            <div className="mb-2 flex items-center justify-between"><h2 className="t-h3">{tr('Документы')}</h2>
              <Button size="sm" variant="soft" loading={uploading} onClick={async () => { setUploading(true); await dealsApi.addDoc(d.id, tr('Скан подписанного договора.pdf')); setUploading(false); toast.success(tr('Документ загружен')); }}><Upload />{tr('Загрузить')}</Button></div>
            {d.documents.length ? (
              <ul className="row-divider">{d.documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 py-2.5"><span className="grid h-9 w-9 place-items-center rounded-[10px] bg-surface-2 text-muted-foreground"><FileText className="h-4 w-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1"><div className="truncate text-[14.5px] font-medium">{doc.name}</div><div className="t-caption">{doc.size}, {relDay(doc.addedAt).toLowerCase()}</div></div>
                  <IconButton label={tr('Удалить {name}', { name: doc.name })} size="iconSm" className="text-muted-foreground" onClick={() => setConfirm({ doc: doc.id })}><Trash2 /></IconButton></li>))}</ul>
            ) : <p className="t-caption py-3">{tr('Документов нет. Загрузите договор или скан паспорта.')}</p>}
          </section>
        </div>

        <div className="space-y-4">
          {p && <Link href={`/properties/${p.id}`} className="pressable surface block overflow-hidden"><PropertyMedia art={p.photos[0].art} aspect="16/9" rounded={false} /><div className="p-3.5"><div className="truncate font-semibold">{p.title}</div><div className="t-caption">{p.district}</div></div></Link>}
          <Link href={`/leads/${d.leadId}`} className="pressable surface flex items-center gap-3 p-3.5"><Avatar name={clientName(d.clientId)} size={40} /><div className="min-w-0 flex-1"><div className="t-caption">{tr('Лид')}</div><div className="truncate font-medium">{clientName(d.clientId)}</div></div></Link>
          <section className="surface space-y-2 p-3.5">
            <Button variant="outline" className="w-full" onClick={() => setContract(true)}><Printer />{tr('Печать договора')}</Button>
            {d.status === 'ACTIVE' ? (<>
              <Button className="w-full" onClick={() => setConfirm('complete')}><CheckCircle2 />{tr('Завершить сделку')}</Button>
              <Button variant="ghost" className="w-full text-danger-text" onClick={() => setCancel(true)}><XCircle />{tr('Отменить сделку')}</Button>
            </>) : <Button variant="outline" className="w-full" onClick={async () => { await dealsApi.setStatus(d.id, 'ACTIVE'); toast.success(tr('Сделка снова в работе')); }}>{tr('Вернуть в работу')}</Button>}
          </section>
        </div>
      </div>

      <PaymentSheet open={payOpen} onOpenChange={setPayOpen} deal={d} />
      <Sheet open={contract} onOpenChange={setContract} title={tr('Печать договора')} description={tr('Документ откроется в новой вкладке.')} desktop="center" size="sm"
        footer={<Button className="flex-1" onClick={() => { setContract(false); toast.success(tr('Договор открыт для печати')); }}><Printer />{tr('Открыть договор')}</Button>}>
        <Field label={tr('Шаблон')}>{(fid) => <Select id={fid} defaultValue="t1"><option value="t1">{tr('Договор купли-продажи (ru)')}</option><option value="t2">Договір купівлі-продажу (uk)</option><option value="t3">Агентский договор (ru)</option></Select>}</Field>
      </Sheet>
      <LostReasonSheet open={cancel} onOpenChange={setCancel} onConfirm={async (reason) => { await dealsApi.setStatus(d.id, 'CANCELLED', reason); toast.success(tr('Сделка отменена, лид — «Проиграно»')); }} />
      <ConfirmDialog open={confirm === 'complete'} onOpenChange={(o) => !o && setConfirm(null)} tone="primary" title={tr('Завершить сделку?')} text={left > 0 ? tr('Комиссия оплачена не полностью: остаток {sum}. Лид перейдёт в «Сделка».', { sum: money(left, d.currency) }) : tr('Лид перейдёт в этап «Сделка».')} confirmLabel={tr('Завершить')}
        onConfirm={async () => { setConfirm(null); const { prev } = await dealsApi.setStatus(d.id, 'COMPLETED'); toast.success(tr('Сделка завершена'), { action: { label: tr('Отменить'), onClick: () => dealsApi.setStatus(d.id, prev) } }); }} />
      <ConfirmDialog open={confirm === 'delete'} onOpenChange={(o) => !o && setConfirm(null)} title={tr('Удалить сделку?')} text={tr('Платежи и документы удалятся. Лид останется в воронке.')} confirmLabel={tr('Удалить')}
        onConfirm={async () => { setConfirm(null); await dealsApi.remove(d.id); router.navigate('/deals', { replace: true }); toast.success(tr('Сделка удалена')); }} />
      <ConfirmDialog open={typeof confirm === 'object' && confirm !== null} onOpenChange={(o) => !o && setConfirm(null)} title={tr('Удалить документ?')} text={tr('Файл будет удалён без возможности восстановления.')} confirmLabel={tr('Удалить')}
        onConfirm={async () => { const docId = (confirm as { doc: string }).doc; setConfirm(null); await dealsApi.removeDoc(d.id, docId); toast.success(tr('Документ удалён')); }} />
    </PageBody>
  );
}

function PaymentSheet({ open, onOpenChange, deal }: { open: boolean; onOpenChange: (o: boolean) => void; deal: Deal }) {
  const [v, setV] = React.useState({ amount: '', type: 'COMMISSION' as 'COMMISSION' | 'DEPOSIT' | 'OTHER', note: '' });
  const [error, setError] = React.useState<string | null>(null); const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) { setV({ amount: String(Math.max(0, dealsApi.commission(deal) - dealsApi.paid(deal)) || ''), type: 'COMMISSION', note: '' }); setError(null); } }, [open, deal]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={tr('Новый платёж')} desktop="side" size="sm"
      footer={<><Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{tr('Отмена')}</Button><Button className="flex-[2]" loading={busy} onClick={async () => {
        const amount = Number(v.amount.replace(/\s/g, '')); if (!(amount > 0)) { setError(tr('Сумма больше нуля')); return; }
        setBusy(true); await dealsApi.addPayment(deal.id, { amount, type: v.type, note: v.note || undefined, paidAt: new Date().toISOString() }); setBusy(false); onOpenChange(false); toast.success(tr('Платёж добавлен'));
      }}>{tr('Добавить платёж')}</Button></>}>
      <div className="space-y-4">
        <Field label={tr('Сумма, €')} required error={error}>{(id, d) => <Input id={id} aria-describedby={d} invalid={!!error} inputMode="numeric" className="tabular" value={v.amount} onChange={(e) => { setV({ ...v, amount: e.target.value.replace(/[^\d\s]/g, '') }); setError(null); }} />}</Field>
        <div><div className="mb-1.5 text-[13px] font-medium">{tr('Тип')}</div><SegmentedControl label={tr('Тип платежа')} className="w-full" value={v.type} onChange={(t) => setV({ ...v, type: t })} options={[{ value: 'COMMISSION', label: tr('Комиссия') }, { value: 'DEPOSIT', label: tr('Задаток') }, { value: 'OTHER', label: tr('Другое') }]} /></div>
        <Field label={tr('Комментарий')} hint={tr('До 500 символов')}>{(id, d) => <Input id={id} aria-describedby={d} maxLength={500} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />}</Field>
      </div>
    </Sheet>
  );
}
