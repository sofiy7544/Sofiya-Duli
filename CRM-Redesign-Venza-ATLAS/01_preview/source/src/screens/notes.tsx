import * as React from 'react';
import { ArrowLeft, Pin, PinOff, Plus, RotateCcw, StickyNote, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { notesApi, useNotesVersion, type Note } from '@/lib/mock/notes';
import { store } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { Link } from '@/lib/router';
import { ago, plural } from '@/lib/format';
import { useIsDesktop } from '@/lib/theme/provider';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { Button, IconButton } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented';
import { toast } from '@/components/ui/toast';

/**
 * /notes. Устройство по SCREEN-MAP: мастер-деталь, вкладки «Заметки / Корзина»,
 * закрепление, восстановление, удаление насовсем.
 *
 * Редактор здесь — обычное поле: в CRM на этом месте Tiptap. Разметку и
 * поведение вокруг (сохранение, закрепление, корзина) прототип задаёт полностью,
 * подключение редактора — строчка в месте <textarea>.
 */
export function NotesScreen() {
  const [tab, setTab] = React.useState<'notes' | 'trash'>('notes');
  const [openId, setOpenId] = React.useState<string | null>(null);
  const isDesktop = useIsDesktop();
  /* Версия — в зависимостях: без неё список не перечитывается после создания и правки заметки. */
  const nv = useNotesVersion();
  const r = useResource(() => notesApi.list(tab === 'trash'), [tab, store.settings.dataMode, nv]);

  const items = r.data ?? [];
  const current = items.find((n) => n.id === openId) ?? (isDesktop ? items[0] : undefined);

  /* busy: второе нажатие по «плюсу», пока летит запрос, не должно плодить пустые заметки.
     fresh — только что созданная: её название сразу под курсором, как в «Заметках» на iPhone. */
  const [busy, setBusy] = React.useState(false);
  const [freshId, setFreshId] = React.useState<string | null>(null);
  const create = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const n = await notesApi.create();
      setTab('notes'); setOpenId(n.id); setFreshId(n.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const header = (
    <PageHeader title="Заметки" subtitle={tab === 'notes' ? 'Личные записи и заметки по сделкам' : 'Удалённое хранится 30 дней'}
      actions={tab === 'notes' ? <IconButton label="Новая заметка" onClick={create} disabled={busy}><Plus /></IconButton> : undefined}>
      <SegmentedControl<'notes' | 'trash'> label="Раздел заметок" className="w-full sm:w-auto" value={tab}
        onChange={(v) => { setTab(v); setOpenId(null); setFreshId(null); }}
        options={[{ value: 'notes', label: 'Заметки' }, { value: 'trash', label: 'Корзина' }]} />
    </PageHeader>
  );

  if (r.error) return <PageBody>{header}<ErrorState error={r.error} onRetry={r.retry} what="заметки" /></PageBody>;
  if (r.loading || !r.data) return <PageBody>{header}<div className="space-y-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[74px]" />)}</div></PageBody>;

  /* Телефон: открытая заметка занимает экран целиком, список прячется. */
  if (!isDesktop && current && openId) {
    return (
      <PageBody>
        <div className="mb-3 flex items-center gap-1">
          <IconButton label="К списку" variant="ghost" className="-ml-1 rounded-full" onClick={() => setOpenId(null)}><ArrowLeft /></IconButton>
          <span className="t-caption">{tab === 'trash' ? 'Корзина' : 'Заметки'}</span>
        </div>
        <NoteEditor note={current} trashed={tab === 'trash'} fresh={current.id === freshId} onClose={() => setOpenId(null)} />
      </PageBody>
    );
  }

  const list = items.length === 0 ? (
    tab === 'trash'
      ? <EmptyState icon={Trash2} title="Корзина пуста" text="Удалённые заметки будут появляться здесь и хранятся 30 дней." />
      : <EmptyState icon={StickyNote} title="Заметок пока нет" text="Записывайте договорённости и скрипты — они останутся под рукой." action={<Button onClick={create} loading={busy}><Plus />Новая заметка</Button>} />
  ) : (
    <ul className="space-y-2.5">
      {items.map((n) => (
        <li key={n.id}>
          <button type="button" onClick={() => { setOpenId(n.id); setFreshId(null); }}
            className={cn('pressable surface w-full p-3.5 text-left transition-shadow',
              current?.id === n.id && isDesktop && 'bg-primary-soft/50 shadow-none ring-2 ring-primary/45')}>
            <div className="flex items-center gap-2">
              {n.pinned && !n.deletedAt && <Pin className="h-3.5 w-3.5 flex-none text-primary" aria-label="Закреплено" />}
              <span className="truncate font-medium">{n.title || 'Без названия'}</span>
            </div>
            <p className="t-caption mt-1 line-clamp-2">{n.body || 'Пустая заметка'}</p>
            <div className="t-caption mt-1.5 flex items-center gap-2">
              <span>{n.deletedAt ? `удалена ${ago(n.deletedAt)}` : ago(n.updatedAt)}</span>
              {/* Ссылка на лид живёт в самой заметке: интерактивный элемент внутри кнопки ломает клавиатуру и скринридер. */}
              {n.leadId && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium">по лиду</span>}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );

  if (!isDesktop) return <PageBody>{header}{list}</PageBody>;

  return (
    <PageBody>
      {header}
      <div className="grid grid-cols-[minmax(260px,340px)_1fr] gap-4 items-start">
        <div>
          <p className="t-caption mb-2">{items.length} {plural(items.length, 'заметка', 'заметки', 'заметок')}</p>
          {list}
        </div>
        {current
          ? <NoteEditor note={current} trashed={tab === 'trash'} fresh={current.id === freshId} onClose={() => setOpenId(null)} />
          : <div className="surface grid min-h-[320px] place-items-center p-6"><p className="t-caption">Выберите заметку слева.</p></div>}
      </div>
    </PageBody>
  );
}

/** Редактор одной заметки. Сохранение по уходу с поля — как в CRM, без кнопки «Сохранить». */
function NoteEditor({ note, trashed, fresh, onClose }: { note: Note; trashed: boolean; fresh?: boolean; onClose: () => void }) {
  const [title, setTitle] = React.useState(note.title);
  const [body, setBody] = React.useState(note.body);
  const titleRef = React.useRef<HTMLInputElement>(null);
  /* Черновик перезаписывается только при смене заметки. Если подтягивать сюда каждое
     обновление note, перечитанный список стирает текст, который человек набирает прямо сейчас. */
  React.useEffect(() => { setTitle(note.title); setBody(note.body); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [note.id]);
  /* Название новой заметки выделено целиком: первый же символ заменяет «Новая заметка». */
  React.useEffect(() => { if (fresh) titleRef.current?.select(); }, [fresh, note.id]);

  const commit = () => { if (title !== note.title || body !== note.body) void notesApi.save(note.id, { title, body }); };

  if (trashed) {
    return (
      <section className="surface p-4 lg:p-5">
        <h2 className="t-h2">{note.title || 'Без названия'}</h2>
        <p className="t-caption mt-1">Удалена {ago(note.deletedAt ?? note.updatedAt)}</p>
        <p className="mt-3 whitespace-pre-wrap text-[15px] text-foreground/80">{note.body || 'Пустая заметка'}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={async () => { await notesApi.restore(note.id); onClose(); toast.success('Заметка восстановлена'); }}>
            <RotateCcw />Восстановить
          </Button>
          <Button variant="outline" size="sm" className="text-danger-text"
            onClick={async () => { await notesApi.destroy(note.id); onClose(); toast.success('Удалено насовсем'); }}>
            <Trash2 />Удалить насовсем
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="surface p-4 lg:p-5">
      <div className="flex items-start gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Название заметки</span>
          <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commit} placeholder="Название"
            className="w-full bg-transparent text-[19px] font-semibold outline-none placeholder:text-muted-foreground" />
        </label>
        <IconButton label={note.pinned ? 'Открепить' : 'Закрепить'} variant="ghost"
          onClick={() => void notesApi.save(note.id, { pinned: !note.pinned })}>
          {note.pinned ? <PinOff /> : <Pin />}
        </IconButton>
        <IconButton label="В корзину" variant="ghost"
          onClick={async () => { await notesApi.trash(note.id); onClose(); toast.success('Заметка в корзине', { action: { label: 'Вернуть', onClick: () => void notesApi.restore(note.id) } }); }}>
          <Trash2 />
        </IconButton>
      </div>
      <p className="t-caption mt-0.5">Изменена {ago(note.updatedAt)}</p>
      <label className="mt-3 block">
        <span className="sr-only">Текст заметки</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} onBlur={commit} rows={12} placeholder="Текст заметки"
          className="w-full resize-y rounded-control bg-surface-2/60 p-3 text-[15px] leading-relaxed outline-none ring-primary/40 placeholder:text-muted-foreground focus:ring-2" />
      </label>
      {note.leadId && (
        <p className="t-caption mt-2">Заметка связана с <Link href={`/leads/${note.leadId}`} className="tap-link font-medium text-primary hover:underline">лидом</Link>.</p>
      )}
    </section>
  );
}
