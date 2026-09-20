import * as React from 'react';
import { AlertTriangle, ArrowLeft, AtSign, Instagram, MessageCircle, MessagesSquare, Send, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { inboxApi, useInboxVersion, type Channel, type Conversation } from '@/lib/mock/inbox';
import { store } from '@/lib/mock/store';
import { useResource } from '@/lib/use-resource';
import { Link } from '@/lib/router';
import { ago, plural, time } from '@/lib/format';
import { useIsDesktop } from '@/lib/theme/provider';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { Button, IconButton } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { toast } from '@/components/ui/toast';

/**
 * /inbox. По SCREEN-MAP: омниканальный ящик, панель квалификации, разбор
 * дубликата. Флаг integrationsEnabled выключен — тогда вместо ящика честное
 * пустое состояние, как и было в заглушке.
 */
const CHANNEL_ICON: Record<Channel, typeof MessageCircle> = {
  TELEGRAM: Send, WHATSAPP: MessageCircle, EMAIL: AtSign, INSTAGRAM: Instagram,
};
const CHANNEL_LABEL: Record<Channel, string> = {
  TELEGRAM: 'Telegram', WHATSAPP: 'WhatsApp', EMAIL: 'Почта', INSTAGRAM: 'Instagram',
};

export function InboxScreen() {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const isDesktop = useIsDesktop();
  useInboxVersion();
  const enabled = store.settings.integrationsEnabled;
  const r = useResource(() => inboxApi.list(), [enabled]);

  if (!enabled) {
    return (
      <PageBody>
        <PageHeader title="Коммуникации" />
        <EmptyState icon={MessagesSquare} title="Мессенджеры не подключены"
          text="Когда администратор подключит Telegram, WhatsApp или почту, переписка появится здесь."
          action={<Link href="/settings" className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-3.5 text-sm font-medium transition-colors hover:bg-surface-2 lg:h-9">Открыть настройки</Link>} />
      </PageBody>
    );
  }

  const header = (
    <PageHeader title="Коммуникации" subtitle="Обращения из всех каналов в одном списке" />
  );
  if (r.error) return <PageBody>{header}<ErrorState error={r.error} onRetry={r.retry} what="переписку" /></PageBody>;
  if (r.loading || !r.data) return <PageBody>{header}<div className="space-y-2.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[88px]" />)}</div></PageBody>;

  const items = r.data;
  const waiting = items.filter((c) => c.status === 'new');
  const current = items.find((c) => c.id === openId) ?? (isDesktop ? waiting[0] ?? items[0] : undefined);

  if (items.length === 0) {
    return <PageBody>{header}<EmptyState icon={MessagesSquare} title="Новых обращений нет" text="Сообщения из Telegram, WhatsApp, почты и Instagram будут приходить сюда." /></PageBody>;
  }

  const list = (
    <ul className="space-y-2.5">
      {items.map((c) => {
        const Icon = CHANNEL_ICON[c.channel];
        const last = c.messages[c.messages.length - 1];
        return (
          <li key={c.id}>
            <button type="button" onClick={() => setOpenId(c.id)}
              className={cn('pressable surface w-full p-3.5 text-left', current?.id === c.id && isDesktop && 'bg-primary-soft/50 shadow-none ring-2 ring-primary/45')}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 flex-none text-muted-foreground" aria-hidden />
                <span className="truncate font-medium">{c.author}</span>
                <span className="t-caption ml-auto flex-none">{last ? ago(last.at) : ''}</span>
              </div>
              <p className="t-caption mt-1 line-clamp-2">{last?.text}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusBadge>{CHANNEL_LABEL[c.channel]}</StatusBadge>
                {c.status === 'new' && <StatusBadge tone="info">Новое</StatusBadge>}
                {c.status === 'qualified' && <StatusBadge tone="success">Лид создан</StatusBadge>}
                {c.status === 'dismissed' && <StatusBadge>Не лид</StatusBadge>}
                {c.duplicateOf && <StatusBadge tone="warning">Возможный дубликат</StatusBadge>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );

  if (!isDesktop) {
    if (current && openId) {
      return (
        <PageBody>
          <div className="mb-3 flex items-center gap-1">
            <IconButton label="К списку" variant="ghost" className="-ml-1 rounded-full" onClick={() => setOpenId(null)}><ArrowLeft /></IconButton>
            <span className="t-caption">Коммуникации</span>
          </div>
          <Thread c={current} />
        </PageBody>
      );
    }
    return <PageBody>{header}<p className="t-caption mb-2">{waiting.length} {plural(waiting.length, 'новое обращение', 'новых обращения', 'новых обращений')}</p>{list}</PageBody>;
  }

  return (
    <PageBody>
      {header}
      <div className="grid grid-cols-[minmax(280px,360px)_1fr] items-start gap-4">
        <div>
          <p className="t-caption mb-2">{waiting.length} {plural(waiting.length, 'новое обращение', 'новых обращения', 'новых обращений')}</p>
          {list}
        </div>
        {current ? <Thread c={current} /> : <div className="surface grid min-h-[320px] place-items-center p-6"><p className="t-caption">Выберите обращение слева.</p></div>}
      </div>
    </PageBody>
  );
}

/** Переписка + панель квалификации: решение по обращению принимается здесь же. */
function Thread({ c }: { c: Conversation }) {
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const Icon = CHANNEL_ICON[c.channel];

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim(); if (!t) return;
    setText(''); await inboxApi.reply(c.id, t);
  };

  return (
    <section className="surface overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Avatar name={c.author} size={36} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15.5px] font-semibold">{c.author}</h2>
          <p className="t-caption flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" aria-hidden />{CHANNEL_LABEL[c.channel]} · {c.handle}</p>
        </div>
      </header>

      {c.duplicateOf && (
        <div className="flex items-start gap-2.5 border-b border-border bg-warning/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warning-text" aria-hidden />
          <div className="text-[13.5px]">
            <b className="font-semibold">Похоже на существующего клиента.</b>{' '}
            {c.duplicateOf.reason} с карточкой{' '}
            <Link href={`/clients/${c.duplicateOf.clientId}`} className="tap-link font-medium text-primary hover:underline">{c.duplicateOf.name}</Link>.
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={`/clients/${c.duplicateOf.clientId}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-3.5 text-sm font-medium transition-colors hover:bg-surface-2 lg:h-9">Открыть карточку</Link>
              <Button size="sm" variant="outline" onClick={() => toast.success('Обращение привязано к карточке клиента')}>Это тот же человек</Button>
            </div>
          </div>
        </div>
      )}

      <ol className="space-y-3 px-4 py-4">
        {c.messages.map((m) => (
          <li key={m.id} className={cn('flex', m.mine && 'justify-end')}>
            <div className={cn('max-w-[36ch] rounded-card px-3 py-2 text-[14.5px]', m.mine ? 'bg-primary text-primary-foreground' : 'bg-surface-2')}>
              {m.text}
              <span className={cn('mt-1 block text-[11.5px]', m.mine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{time(m.at)}</span>
            </div>
          </li>
        ))}
      </ol>

      {c.status === 'new' ? (
        <div className="border-t border-border bg-surface-2/50 px-4 py-3">
          <p className="text-[13.5px] font-medium">Это обращение — лид?</p>
          <p className="t-caption mt-0.5">Создадим карточку лида и перенесём переписку в его историю.</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button size="sm" loading={busy}
              onClick={async () => { setBusy(true); await inboxApi.qualify(c.id); setBusy(false); toast.success('Лид создан', { action: { label: 'Открыть', onClick: () => { location.hash = '/leads'; } } }); }}>
              <UserPlus />Создать лид
            </Button>
            <Button size="sm" variant="outline" onClick={async () => { await inboxApi.dismiss(c.id); toast.success('Убрано из новых'); }}>
              <X />Не лид
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t border-border px-4 py-2.5">
          <p className="t-caption">{c.status === 'qualified' ? 'Лид по этому обращению уже создан.' : 'Помечено как «не лид».'}</p>
        </div>
      )}

      <form onSubmit={send} className="flex items-end gap-2 border-t border-border px-4 py-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Ответ в {CHANNEL_LABEL[c.channel]}</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Ответить в ${CHANNEL_LABEL[c.channel]}`}
            className="h-11 w-full rounded-control bg-surface-2/60 px-3 text-[14.5px] outline-none ring-primary/40 placeholder:text-muted-foreground focus:ring-2" />
        </label>
        <Button type="submit" size="sm" disabled={!text.trim()}><Send />Отправить</Button>
      </form>
    </section>
  );
}
