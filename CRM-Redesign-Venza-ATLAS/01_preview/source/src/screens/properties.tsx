import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, BedDouble, Building, CalendarPlus, Plus, ChevronLeft, ChevronRight, FileDown, Heart, Layers, MapPin, MoreHorizontal, Pencil, Ruler, Search, Share2, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/mock/api';
import { store, usePreviewSettings, users } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { Link, useRouter } from '@/lib/router';
import { useIsDesktop, useTheme } from '@/lib/theme/provider';
import { money, plural } from '@/lib/format';
import { PROPERTY_STATUS_LABEL, PROPERTY_TYPE_LABEL } from '@/lib/labels';
import type { Property, PropertyStatus, PropertyType } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { ui } from '@/components/shell/ui-state';
import { EventFormSheet } from '@/components/overlays/event-form';
import { Avatar } from '@/components/ui/avatar';
import { Button, IconButton } from '@/components/ui/button';
import { PropertyStatusBadge } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { ConfirmDialog, Sheet } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/toggle';
import { toast } from '@/components/ui/toast';
import { PropertyMedia } from '@/components/domain/property-media';
import { FilterButton, FiltersSheet, activeFilterCount, type FilterValue } from '@/components/domain/filters';

export function PropertiesScreen() {
  const router = useRouter();
  const { family } = useTheme();
  const [scope, setScope] = React.useState<'all' | 'mine'>('all');
  const [term, setTerm] = React.useState(''); const [debounced, setDebounced] = React.useState('');
  const [filters, setFilters] = React.useState<FilterValue>({}); const [open, setOpen] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setDebounced(term), 250); return () => clearTimeout(t); }, [term]);
  const query = (f: FilterValue) => ({ search: debounced, mine: scope === 'mine', type: f.type?.[0], status: f.status?.[0], includeInactive: !!f.inactive?.length });
  const r = useResource(() => api.properties(query(filters)), [scope, debounced, JSON.stringify(filters)]);
  const countFor = (f: FilterValue) => store.db.properties.filter((p) => (f.inactive?.length || (p.status !== 'SOLD' && p.status !== 'ARCHIVED')) && (!f.type?.[0] || p.type === f.type[0]) && (!f.status?.[0] || p.status === f.status[0]) && (scope === 'all' || p.ownerUserId === 'u1')).length;

  const groups = [
    { key: 'type', label: 'Тип', multi: false, options: (Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((t) => ({ value: t, label: PROPERTY_TYPE_LABEL[t] })) },
    { key: 'status', label: 'Статус', multi: false, options: (['AVAILABLE', 'IN_SHOWING', 'RESERVED', 'SOLD'] as PropertyStatus[]).map((s) => ({ value: s, label: PROPERTY_STATUS_LABEL[s] })) },
    { key: 'inactive', label: 'Показывать', options: [{ value: '1', label: 'Проданные и архив' }] },
  ];
  const items = r.data?.items ?? [];

  return (
    <PageBody wide={family === 'atlas'}>
      <PageHeader title="Объекты" subtitle={r.data ? `${r.data.total} ${plural(r.data.total, 'объект', 'объекта', 'объектов')}` : ' '}
        actions={<IconButton label="Новый объект" onClick={() => router.navigate('/properties/new')}><Plus /></IconButton>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SegmentedControl label="Чьи объекты" value={scope} onChange={setScope} options={[{ value: 'all', label: 'Все' }, { value: 'mine', label: 'Мои' }]} />
        <div className="relative order-last w-full sm:order-none sm:ml-auto sm:w-[280px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Название, район, адрес" aria-label="Поиск объектов" className="h-11 w-full rounded-control border border-input bg-surface pl-10 pr-3 text-[16px] shadow-soft outline-none focus:border-primary focus:shadow-[0_0_0_4px_hsl(var(--primary)/.12)] lg:h-10 lg:text-[14px]" />
        </div>
        <FilterButton count={activeFilterCount(filters)} onClick={() => setOpen(true)} />
      </div>

      {r.error ? <ErrorState error={r.error} onRetry={r.retry} what="объекты" /> : r.loading ? (
        <div className={cn('grid gap-4', family === 'atlas' ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-3')} role="status" aria-label="Загрузка">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="surface overflow-hidden"><Skeleton className="aspect-[4/3] rounded-none" /><div className="space-y-2 p-4"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-4 w-3/4" /></div></div>)}
        </div>
      ) : !items.length ? (
        <EmptyState icon={Building} title={debounced || activeFilterCount(filters) ? 'Под фильтры ничего не подходит' : 'Объектов пока нет'} text={debounced || activeFilterCount(filters) ? 'Сбросьте фильтры или измените запрос.' : 'Добавьте первый объект — с фото он будет выглядеть как на сайте.'}
          action={activeFilterCount(filters) || debounced ? <Button variant="outline" size="sm" onClick={() => { setFilters({}); setTerm(''); }}>Сбросить</Button> : <Button onClick={() => router.navigate('/properties/new')}>Добавить объект</Button>} />
      ) : (
        <ul className={cn('grid gap-4', family === 'atlas' ? 'sm:grid-cols-2 xl:grid-cols-4 lg:gap-3' : 'sm:grid-cols-2 xl:grid-cols-3 lg:gap-6')}>
          {items.map((p) => <li key={p.id}><PropertyCard p={p} /></li>)}
        </ul>
      )}
      <FiltersSheet open={open} onOpenChange={setOpen} groups={groups} value={filters} onApply={setFilters} countFor={countFor} />
    </PageBody>
  );
}

function PropertyCard({ p }: { p: Property }) {
  const { family } = useTheme();
  const [fav, setFav] = React.useState(false);
  const atlas = family === 'atlas';
  return (
    <div className="pressable surface group relative overflow-hidden">
      <Link href={`/properties/${p.id}`} className="block">
        <PropertyMedia art={p.photos[0]?.art ?? 0} aspect={atlas ? '16/10' : '4/3'} rounded={false} parallax>
          <PropertyStatusBadge status={p.status} className="absolute left-3 top-3 bg-surface/90 backdrop-blur" />
        </PropertyMedia>
        <div className={atlas ? 'p-3' : 'p-4'}>
          <div className={cn(atlas ? 'text-[18px] font-bold tabular tracking-[-0.02em]' : 't-num text-[22px] font-semibold')}>{money(p.price, p.currency)}</div>
          <div className={cn('mt-0.5 truncate font-medium', atlas ? 'text-[14px]' : 'text-[15.5px]')}>{p.title}</div>
          <div className="t-caption mt-0.5 flex items-center gap-1 truncate"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />{p.district}</div>
          <div className={cn('mt-3 flex items-center gap-3 text-[13px] text-muted-foreground', atlas && 'mt-2 border-t border-border/70 pt-2')}>
            {p.rooms && <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" aria-hidden />{p.rooms} {plural(p.rooms, 'комн.', 'комн.', 'комн.')}</span>}
            <span className="inline-flex items-center gap-1 tabular"><Ruler className="h-3.5 w-3.5" aria-hidden />{p.area.toLocaleString('ru-RU')} м²</span>
            {p.floor && <span className="inline-flex items-center gap-1 tabular"><Layers className="h-3.5 w-3.5" aria-hidden />{p.floor}/{p.totalFloors}</span>}
          </div>
        </div>
      </Link>
      <button onClick={() => { setFav(!fav); toast.success(fav ? 'Убрано из подборки' : 'Добавлено в подборку'); }} aria-pressed={fav} aria-label="В подборку"
        className="material absolute right-2.5 top-2.5 grid h-11 w-11 place-items-center rounded-full border border-[var(--glass-border)] transition-transform duration-tap active:scale-90">
        <Heart className={cn('h-4 w-4 transition-colors', fav && 'fill-danger text-danger')} aria-hidden />
      </button>
    </div>
  );
}

export function PropertyDetailScreen({ id }: { id: string }) {
  const { family } = useTheme();
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const settings = usePreviewSettings();
  const r = useResource(() => api.property(id), [id]);
  const [tab, setTab] = React.useState<'about' | 'match'>('about');
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [pdf, setPdf] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const [showing, setShowing] = React.useState(false);
  const [del, setDel] = React.useState(false);
  const [slide, setSlide] = React.useState(0);
  const track = React.useRef<HTMLDivElement>(null);

  if (r.error) return <PageBody><PageHeader title="Объект" back="/properties" /><ErrorState error={r.error} onRetry={r.retry} what="объект" /></PageBody>;
  if (r.loading || !r.data) return <PageBody><PageHeader title="" back="/properties" large={false} /><Skeleton className="aspect-[4/3] rounded-card" /><Skeleton className="mt-4 h-8 w-40" /><Skeleton className="mt-2 h-5 w-64" /><Skeleton className="mt-6 h-32 rounded-card" /></PageBody>;
  const p = r.data;
  const canEdit = settings.role === 'ADMIN' || p.ownerUserId === 'u1';
  const matches = store.db.clients.filter((c) => c.preferences && (!c.preferences.price?.max || c.preferences.price.max >= p.price * 0.9) && (!c.preferences.propertyType || c.preferences.propertyType === p.type)).slice(0, 4);
  const owner = users.find((u) => u.id === p.ownerUserId)?.fullName ?? 'Не назначен';

  const facts = [
    { icon: Building, label: 'Тип', value: PROPERTY_TYPE_LABEL[p.type] },
    p.rooms ? { icon: BedDouble, label: 'Комнат', value: String(p.rooms) } : null,
    { icon: Ruler, label: 'Площадь', value: `${p.area.toLocaleString('ru-RU')} м²` },
    p.floor ? { icon: Layers, label: 'Этаж', value: `${p.floor} из ${p.totalFloors}` } : null,
  ].filter(Boolean) as { icon: typeof Building; label: string; value: string }[];

  const onScroll = () => { const el = track.current; if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth)); };
  const go = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' });

  const gallery = (
    <div className={cn('relative overflow-hidden bg-surface-2', isDesktop ? 'rounded-card' : '-mx-4 sm:-mx-5')}>
      <div ref={track} onScroll={onScroll} data-hscroll className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" aria-label="Фотографии" role="region">
        {p.photos.map((ph, i) => (
          <button key={ph.id} onClick={() => setLightbox(i)} className="w-full shrink-0 snap-center" aria-label={`Фото ${i + 1} из ${p.photos.length}, открыть`}>
            <PropertyMedia art={ph.art} aspect={isDesktop ? (family === 'atlas' ? '16/10' : '16/9') : '4/3'} rounded={false} parallax={i === 0} />
          </button>
        ))}
      </div>
      {!isDesktop && (
        <div className="safe-top absolute inset-x-0 top-0 flex items-center gap-2 p-3">
          <button onClick={() => router.back('/properties')} aria-label="Назад" className="material grid h-11 w-11 place-items-center rounded-full border border-[var(--glass-border)]"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1" />
          <button onClick={() => toast.success('Ссылка скопирована')} aria-label="Поделиться" className="material grid h-11 w-11 place-items-center rounded-full border border-[var(--glass-border)]"><Share2 className="h-[18px] w-[18px]" /></button>
          <button onClick={() => setMenu(true)} aria-label="Действия" className="material grid h-11 w-11 place-items-center rounded-full border border-[var(--glass-border)]"><MoreHorizontal className="h-5 w-5" /></button>
        </div>
      )}
      {p.photos.length > 1 && (<>
        <div className="material absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full px-2.5 py-1.5" aria-hidden>
          {p.photos.map((_, i) => <span key={i} className={cn('h-1.5 rounded-full bg-foreground transition-[width,opacity] duration-tab', i === slide ? 'w-4 opacity-90' : 'w-1.5 opacity-35')} />)}
        </div>
        {isDesktop && slide > 0 && <button onClick={() => go(slide - 1)} aria-label="Предыдущее фото" className="material absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--glass-border)]"><ChevronLeft className="h-5 w-5" /></button>}
        {isDesktop && slide < p.photos.length - 1 && <button onClick={() => go(slide + 1)} aria-label="Следующее фото" className="material absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--glass-border)]"><ChevronRight className="h-5 w-5" /></button>}
      </>)}
    </div>
  );

  const priceBlock = (
    <div>
      <div className="flex flex-wrap items-center gap-2"><PropertyStatusBadge status={p.status} /><span className="t-caption">ID {p.id.toUpperCase()}</span></div>
      <div className={cn('mt-2', family === 'atlas' ? 'text-[30px] font-bold leading-9 tabular tracking-[-0.03em]' : 't-num text-[36px] font-semibold leading-[40px]')}>{money(p.price, p.currency)}</div>
      <h1 className={cn('mt-1', family === 'atlas' ? 'text-[18px] font-semibold' : 'font-display text-[22px] font-semibold leading-7')}>{p.title}</h1>
      <p className="t-caption mt-1 flex items-center gap-1 text-[14px]"><MapPin className="h-4 w-4" aria-hidden />{p.address}, {p.district}</p>
    </div>
  );
  const factsBlock = (
    <dl className={cn('grid gap-2', facts.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4')}>
      {facts.map((f) => (
        <div key={f.label} className="surface p-3"><dt className="t-caption flex items-center gap-1.5"><f.icon className="h-3.5 w-3.5" aria-hidden />{f.label}</dt><dd className={cn('mt-1 tabular', family === 'atlas' ? 'text-[16px] font-semibold' : 't-num text-[20px] font-semibold')}>{f.value}</dd></div>
      ))}
    </dl>
  );
  const about = (
    <div className="space-y-4">
      <section className="surface p-4 lg:p-5"><h2 className="t-h3 mb-2">Описание</h2><p className="max-w-[68ch] text-[15.5px] leading-[25px] text-foreground/90">{p.description}</p>
        <ul className="mt-4 flex flex-wrap gap-2">{p.features.map((f) => <li key={f} className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-medium">{f}</li>)}</ul></section>
      <section className="surface flex items-center gap-3 p-4"><Avatar name={owner} size={40} /><div className="flex-1"><div className="t-caption">Ответственный</div><div className="font-medium">{owner}</div></div></section>
    </div>
  );
  const matchBlock = (
    <section className="surface p-4"><h2 className="t-h3 mb-1">Подходящие клиенты</h2><p className="t-caption mb-3">По бюджету и типу объекта из предпочтений.</p>
      {matches.length ? <ul className="row-divider">{matches.map((c) => <li key={c.id}><Link href={`/clients/${c.id}`} className="pressable -mx-2 flex items-center gap-3 rounded-control px-2 py-2.5"><Avatar name={c.fullName} size={36} /><span className="min-w-0 flex-1 truncate font-medium">{c.fullName}</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link></li>)}</ul> : <p className="t-caption">Пока никого.</p>}
    </section>
  );
  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" onClick={() => setPdf(true)}><FileDown />PDF</Button>
      <Button className="flex-[1.6]" onClick={() => setShowing(true)}><CalendarPlus />Назначить показ</Button>
    </div>
  );

  const overlays = (<>
    <Lightbox photos={p.photos.map((x) => x.art)} index={lightbox} onChange={setLightbox} title={p.title} />
    <PdfSheet open={pdf} onOpenChange={setPdf} />
    <Sheet open={menu} onOpenChange={setMenu} title={p.title} desktop="center" size="sm">
      <div className="space-y-3">
        <div className="surface-quiet p-1.5">
          <button disabled={!canEdit} className="pressable flex min-h-[54px] w-full items-center gap-3.5 rounded-control px-3 text-left text-[16px] font-medium disabled:opacity-45" onClick={() => { setMenu(false); router.navigate(`/properties/${p.id}/edit`); }}><Pencil className="h-5 w-5 text-primary" />Редактировать</button>
          <button className="pressable flex min-h-[54px] w-full items-center gap-3.5 rounded-control px-3 text-left text-[16px] font-medium" onClick={() => { setMenu(false); setPdf(true); }}><FileDown className="h-5 w-5 text-primary" />Скачать PDF</button>
        </div>
        {canEdit ? <div className="surface-quiet p-1.5"><button className="pressable flex min-h-[54px] w-full items-center gap-3.5 rounded-control px-3 text-left text-[16px] font-medium text-danger-text" onClick={() => { setMenu(false); setDel(true); }}><Trash2 className="h-5 w-5" />Удалить объект</button></div>
          : <p className="t-caption px-1">Редактировать и удалять может ответственный или администратор.</p>}
      </div>
    </Sheet>
    <EventFormSheet open={showing} onOpenChange={setShowing} kind="SHOWING" propertyId={p.id} />
    <ConfirmDialog open={del} onOpenChange={setDel} title="Удалить объект?" text="Объект и все фото будут удалены. Показы по нему останутся в истории клиентов." confirmLabel="Удалить" onConfirm={() => { setDel(false); router.navigate('/properties', { replace: true }); toast.success('Объект удалён'); }} />
  </>);

  if (isDesktop) {
    return (
      <PageBody wide={family === 'atlas'}>
        <PageHeader title="" back="/properties" large={false} actions={<><IconButton label="Поделиться" variant="outline" onClick={() => toast.success('Ссылка скопирована')}><Share2 /></IconButton><IconButton label="Действия" variant="outline" onClick={() => setMenu(true)}><MoreHorizontal /></IconButton></>} />
        <div className={cn('-mt-4 grid gap-6', family === 'atlas' ? 'grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)] gap-4' : 'grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]')}>
          <div className="min-w-0 space-y-4">{gallery}{about}</div>
          <div className="space-y-4"><div className="surface space-y-5 p-5">{priceBlock}{factsBlock}{actions}</div>{matchBlock}</div>
        </div>
        {overlays}
      </PageBody>
    );
  }
  return (
    <PageBody>
      {gallery}
      <div className="mt-5 space-y-5">
        {priceBlock}
        {factsBlock}
        <SegmentedControl label="Разделы объекта" className="w-full" value={tab} onChange={setTab} options={[{ value: 'about', label: 'Об объекте' }, { value: 'match', label: 'Клиенты', count: matches.length }]} />
        <div key={tab} className="page-fade pb-24">{tab === 'about' ? about : matchBlock}</div>
      </div>
      <div className="material fixed inset-x-0 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+80px)] z-30 mx-3 rounded-[20px] border border-[var(--glass-border)] p-2 shadow-lift">{actions}</div>
      {overlays}
    </PageBody>
  );
}

/** Лайтбокс: полноэкранно, свайп/стрелки/Esc, счётчик. */
function Lightbox({ photos, index, onChange, title }: { photos: number[]; index: number | null; onChange: (i: number | null) => void; title: string }) {
  const touch = React.useRef<number | null>(null);
  const i = index ?? 0;
  const step = (d: number) => onChange(Math.max(0, Math.min(photos.length - 1, i + d)));
  return (
    <Dialog.Root open={index !== null} onOpenChange={(o) => !o && onChange(null)}>
      <Dialog.Portal>
        <Dialog.Content aria-describedby={undefined} onKeyDown={(e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }}
          className="fixed inset-0 z-[85] flex flex-col bg-[#0E100F] text-white outline-none data-[state=open]:animate-[page-fade_var(--motion-modal)_var(--ease-standard)_both]"
          onTouchStart={(e) => { touch.current = e.touches[0].clientX; }} onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); touch.current = null; }}>
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <div className="safe-top flex items-center justify-between p-3">
            <span className="px-2 text-[14px] tabular opacity-80">{i + 1} / {photos.length}</span>
            <Dialog.Close className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Закрыть"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-2 pb-10">
            <div key={i} className="w-full max-w-[1100px] animate-pop-in"><PropertyMedia art={photos[i]} aspect="4/3" className="!rounded-[10px]" /></div>
            {i > 0 && <button onClick={() => step(-1)} aria-label="Предыдущее" className="absolute left-4 hidden h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/20 md:grid"><ChevronLeft /></button>}
            {i < photos.length - 1 && <button onClick={() => step(1)} aria-label="Следующее" className="absolute right-4 hidden h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/20 md:grid"><ChevronRight /></button>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** PDF-презентация объекта: логотип, водяной знак, язык (как PdfDownloadButton CRM). */
function PdfSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [logo, setLogo] = React.useState(true); const [mark, setMark] = React.useState(false); const [lang, setLang] = React.useState('ru'); const [busy, setBusy] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="PDF-презентация" description="Для отправки клиенту." desktop="center" size="sm"
      footer={<Button className="flex-1" loading={busy} onClick={async () => { setBusy(true); await new Promise((r) => setTimeout(r, 1200)); setBusy(false); onOpenChange(false); toast.success('PDF готов, загрузка началась'); }}><FileDown />Скачать PDF</Button>}>
      <div className="space-y-4">
        <div className="flex items-center gap-3"><span className="flex-1 text-[15px] font-medium">Логотип агентства</span><Switch label="Логотип" checked={logo} onChange={setLogo} /></div>
        <div className="flex items-center gap-3"><span className="flex-1 text-[15px] font-medium">Водяной знак</span><Switch label="Водяной знак" checked={mark} onChange={setMark} /></div>
        <div><div className="mb-2 text-[15px] font-medium">Язык</div><SegmentedControl label="Язык PDF" className="w-full" value={lang} onChange={setLang} options={['ru', 'uk', 'en', 'fr', 'it'].map((l) => ({ value: l, label: l.toUpperCase() }))} /></div>
      </div>
    </Sheet>
  );
}
export const _u = ui;
