import * as React from 'react';
import { AtSign, Camera, MessageCircle, Plug, Plus, Send, Trash2, UserMinus, Wand2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { adminApi, useAdminVersion, type Member, type Template } from '@/lib/mock/admin';
import { usePreviewSettings } from '@/lib/mock/store';
import { FormGrid } from '@/components/shell/form-shell';
import { useResource } from '@/lib/use-resource';
import { ago } from '@/lib/format';
import type { UserRole } from '@/lib/mock/types';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { Button, IconButton } from '@/components/ui/button';
import { ConfirmDialog, Sheet } from '@/components/ui/sheet';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Avatar } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/toggle';
import { StatusBadge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { tr } from '@/lib/i18n';

/**
 * Подразделы настроек по SCREEN-MAP: автоматизация, шаблоны, интеграции,
 * брендинг, пользователи. Права (ADMIN/MANAGER) в CRM проверяет сервер —
 * здесь показываем те же экраны, роль переключается в панели превью.
 */

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: tr('Администратор'), MANAGER: tr('Руководитель'), REALTOR: tr('Риелтор'),
  ASSISTANT: tr('Ассистент'), ANALYST: tr('Аналитик'), EMPLOYEE: tr('Сотрудник'),
};

/* ─────────────────────────── Автоматизация ─────────────────────────── */

export function AutomationScreen() {
  const av = useAdminVersion();
  const r = useResource(() => adminApi.rules(), [av]);
  const [open, setOpen] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: '', when: '', then: '' });
  const [busy, setBusy] = React.useState(false);

  const header = <PageHeader title={tr('Автоматизация')} back="/settings" subtitle={tr('Правила срабатывают на события воронки')}
    actions={<IconButton label={tr('Новое правило')} onClick={() => setOpen(true)}><Plus /></IconButton>} />;

  if (r.error) return <PageBody className="lg:max-w-[760px]">{header}<ErrorState error={r.error} onRetry={r.retry} what={tr('правила')} /></PageBody>;
  if (r.loading || !r.data) return <PageBody className="lg:max-w-[760px]">{header}<Skeleton className="h-64" /></PageBody>;

  const submit = async () => {
    setBusy(true);
    try { await adminApi.createRule(form); setOpen(false); setForm({ name: '', when: '', then: '' }); toast.success(tr('Правило создано')); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <PageBody className="lg:max-w-[760px]">
      {header}
      {r.data.length === 0
        ? <EmptyState icon={Wand2} title={tr('Правил пока нет')} text={tr('Автоматизация избавляет от ручных напоминаний: событие — действие.')} action={<Button onClick={() => setOpen(true)}><Plus />{tr('Новое правило')}</Button>} />
        : (
          <ul className="space-y-2.5">
            {r.data.map((rule) => (
              <li key={rule.id} className="surface p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[15.5px] font-medium">{rule.name}</h2>
                    <p className="t-caption mt-1"><b className="font-medium text-foreground/80">{tr('Когда:')}</b> {rule.when}</p>
                    <p className="t-caption mt-0.5"><b className="font-medium text-foreground/80">{tr('Тогда:')}</b> {rule.then}</p>
                  </div>
                  <Switch label={tr('Правило «{name}»', { name: rule.name })} checked={rule.enabled} onChange={() => void adminApi.toggleRule(rule.id)} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <StatusBadge tone={rule.enabled ? 'success' : 'neutral'}>{rule.enabled ? tr('Включено') : tr('Выключено')}</StatusBadge>
                  <Button size="sm" variant="outline" className="text-danger-text" onClick={() => setConfirmId(rule.id)}><Trash2 />{tr('Удалить')}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}

      <Sheet open={open} onOpenChange={setOpen} title={tr('Новое правило')} description={tr('Опишите событие и действие простыми словами.')} size="sm"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>{tr('Отмена')}</Button><Button loading={busy} onClick={submit}>{tr('Создать')}</Button></>}>
        <div className="space-y-3">
          <Field label={tr('Название')}>{(id, d) => <Input id={id} aria-describedby={d} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tr('Например: лид без ответа')} />}</Field>
          <Field label={tr('Когда')} hint={tr('Событие, после которого правило срабатывает')}>{(id, d) => <Input id={id} aria-describedby={d} value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} placeholder={tr('Лид на этапе «Новые» дольше 2 часов')} />}</Field>
          <Field label={tr('Тогда')} hint={tr('Что система сделает')}>{(id, d) => <Input id={id} aria-describedby={d} value={form.then} onChange={(e) => setForm({ ...form, then: e.target.value })} placeholder={tr('Напомнить ответственному')} />}</Field>
        </div>
      </Sheet>

      <ConfirmDialog open={confirmId !== null} onOpenChange={(v) => !v && setConfirmId(null)} title={tr('Удалить правило?')}
        text={tr('Автоматизация перестанет срабатывать. Действие необратимо.')} confirmLabel={tr('Удалить')}
        onConfirm={async () => { if (confirmId) await adminApi.deleteRule(confirmId); setConfirmId(null); toast.success(tr('Правило удалено')); }} />
    </PageBody>
  );
}

/* ───────────────────────────── Шаблоны ───────────────────────────── */

const CHANNEL_ICON = { EMAIL: AtSign, TELEGRAM: Send, SMS: MessageCircle } as const;
const CHANNEL_LABEL = { EMAIL: tr('Почта'), TELEGRAM: 'Telegram', SMS: 'SMS' } as const;
const EMPTY_TEMPLATE: Omit<Template, 'updatedAt'> = { id: '', name: '', channel: 'TELEGRAM', subject: '', body: '' };

export function TemplatesScreen() {
  const av = useAdminVersion();
  const r = useResource(() => adminApi.templates(), [av]);
  const [edit, setEdit] = React.useState<Omit<Template, 'updatedAt'> | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const header = <PageHeader title={tr('Шаблоны')} back="/settings" subtitle={tr('Готовые сообщения с подстановкой полей')}
    actions={<IconButton label={tr('Новый шаблон')} onClick={() => setEdit({ ...EMPTY_TEMPLATE, id: `t${Date.now()}` })}><Plus /></IconButton>} />;

  if (r.error) return <PageBody className="lg:max-w-[760px]">{header}<ErrorState error={r.error} onRetry={r.retry} what={tr('шаблоны')} /></PageBody>;
  if (r.loading || !r.data) return <PageBody className="lg:max-w-[760px]">{header}<Skeleton className="h-64" /></PageBody>;

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    try { await adminApi.saveTemplate(edit); setEdit(null); toast.success(tr('Шаблон сохранён')); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <PageBody className="lg:max-w-[760px]">
      {header}
      {r.data.length === 0
        ? <EmptyState icon={Send} title={tr('Шаблонов пока нет')} text={tr('Сохраните текст, который отправляете чаще всего.')} action={<Button onClick={() => setEdit({ ...EMPTY_TEMPLATE, id: `t${Date.now()}` })}><Plus />{tr('Новый шаблон')}</Button>} />
        : (
          <ul className="space-y-2.5">
            {r.data.map((t) => {
              const Icon = CHANNEL_ICON[t.channel];
              return (
                <li key={t.id} className="surface p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 flex-none text-muted-foreground" aria-hidden />
                    <h2 className="min-w-0 flex-1 truncate text-[15.5px] font-medium">{t.name}</h2>
                    <StatusBadge>{CHANNEL_LABEL[t.channel]}</StatusBadge>
                  </div>
                  {t.subject && <p className="t-caption mt-1.5">{tr('Тема:')}{t.subject}</p>}
                  <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-[14px] text-foreground/75">{t.body}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="t-caption">{tr('Изменён')}{ago(t.updatedAt)}</span>
                    <span className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEdit({ id: t.id, name: t.name, channel: t.channel, subject: t.subject ?? '', body: t.body })}>{tr('Изменить')}</Button>
                      <Button size="sm" variant="outline" className="text-danger-text" onClick={() => setConfirmId(t.id)}><Trash2 />{tr('Удалить')}</Button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      <Sheet open={edit !== null} onOpenChange={(v) => !v && setEdit(null)} title={edit?.name ? tr('Шаблон') : tr('Новый шаблон')}
        description={tr('В фигурных скобках — подстановки: имя, объект, дата, время, бюджет, агент.')}
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>{tr('Отмена')}</Button><Button loading={busy} onClick={save}>{tr('Сохранить')}</Button></>}>
        {edit && (
          <div className="space-y-3">
            <Field label={tr('Название')}>{(id, d) => <Input id={id} aria-describedby={d} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={tr('Подтверждение показа')} />}</Field>
            <Field label={tr('Канал')}>{(id, d) => (
              <Select id={id} aria-describedby={d} value={edit.channel} onChange={(e) => setEdit({ ...edit, channel: e.target.value as Template['channel'] })}>
                <option value="TELEGRAM">Telegram</option><option value="EMAIL">{tr('Почта')}</option><option value="SMS">SMS</option>
              </Select>
            )}</Field>
            {edit.channel === 'EMAIL' && <Field label={tr('Тема письма')}>{(id, d) => <Input id={id} aria-describedby={d} value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} />}</Field>}
            <Field label={tr('Текст')}>{(id, d) => <Textarea id={id} aria-describedby={d} rows={7} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />}</Field>
          </div>
        )}
      </Sheet>

      <ConfirmDialog open={confirmId !== null} onOpenChange={(v) => !v && setConfirmId(null)} title={tr('Удалить шаблон?')}
        text={tr('Отправленные сообщения останутся, шаблон пропадёт из списка.')} confirmLabel={tr('Удалить')}
        onConfirm={async () => { if (confirmId) await adminApi.deleteTemplate(confirmId); setConfirmId(null); toast.success(tr('Шаблон удалён')); }} />
    </PageBody>
  );
}

/* ──────────────────────────── Интеграции ──────────────────────────── */

const INTEGRATIONS = [
  { key: 'telegram', name: 'Telegram', text: tr('Сообщения из бота агентства попадают в «Коммуникации».'), icon: Send },
  { key: 'whatsapp', name: 'WhatsApp Business', text: tr('Переписка с клиентами и шаблоны сообщений.'), icon: MessageCircle },
  { key: 'email', name: tr('Почта'), text: tr('Входящие заявки с сайта и переписка по объектам.'), icon: AtSign },
];

export function IntegrationsScreen() {
  return (
    <PageBody className="lg:max-w-[760px]">
      <PageHeader title={tr('Интеграции')} back="/settings" subtitle={tr('Каналы, из которых приходят обращения')} />
      <ul className="space-y-2.5">
        {INTEGRATIONS.map((i) => (
          <li key={i.key} className="surface flex items-start gap-3 p-4">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-surface-2"><i.icon className="h-[18px] w-[18px]" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15.5px] font-medium">{i.name}</h2>
              <p className="t-caption mt-0.5">{i.text}</p>
            </div>
            <Button size="sm" variant="outline" disabled>{tr('Подключить')}</Button>
          </li>
        ))}
      </ul>
      <p className="t-caption mt-4 flex items-start gap-1.5">
        <Plug className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden />
        {tr('Подключение делает администратор на стороне CRM — в превью кнопки выключены намеренно. Чтобы посмотреть, как выглядит раздел с подключёнными каналами, включите «Интеграции» в панели превью.')}
      </p>
    </PageBody>
  );
}

/* ───────────────────────────── Брендинг ───────────────────────────── */

export function BrandingScreen() {
  const logoRef = React.useRef<HTMLInputElement>(null);
  const av = useAdminVersion();
  const r = useResource(() => adminApi.branding(), [av]);
  const [name, setName] = React.useState('');
  const [watermark, setWatermark] = React.useState(true);
  const [opacity, setOpacity] = React.useState(35);
  const [busy, setBusy] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (r.data && !ready) { setName(r.data.agencyName); setWatermark(r.data.watermark); setOpacity(r.data.watermarkOpacity); setReady(true); }
  }, [r.data, ready]);

  const header = <PageHeader title={tr('Брендинг')} back="/settings" subtitle={tr('Логотип и подпись на презентациях объектов')} />;
  if (r.error) return <PageBody className="lg:max-w-[760px]">{header}<ErrorState error={r.error} onRetry={r.retry} what={tr('настройки бренда')} /></PageBody>;
  if (!r.data) return <PageBody className="lg:max-w-[760px]">{header}<Skeleton className="h-64" /></PageBody>;

  const save = async () => {
    setBusy(true);
    try { await adminApi.saveBranding({ agencyName: name, watermark, watermarkOpacity: opacity }); toast.success(tr('Сохранено')); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <PageBody className="lg:max-w-[760px]">
      {header}
      <section className="surface p-4 lg:p-5">
        <h2 className="t-h3">{tr('Логотип')}</h2>
        <input ref={logoRef} type="file" accept="image/png,image/svg+xml" className="sr-only" aria-label={tr('Файл логотипа')}
          onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            e.target.value = '';
            if (f.size > 2 * 1024 * 1024) { toast.error(tr('Файл больше 2 МБ')); return; }
            void adminApi.saveBranding({ logoName: f.name }).then(() => toast.success(tr('Логотип «{name}» загружен', { name: f.name })));
          }} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="grid h-16 w-16 place-items-center rounded-card bg-surface-2 text-[12px] text-muted-foreground">{r.data.logoName ? 'SVG' : tr('нет')}</span>
          <div className="min-w-0">
            <p className="text-[14.5px]">{r.data.logoName ?? tr('Логотип не загружен')}</p>
            <p className="t-caption mt-0.5">{tr('PNG или SVG, от 512 px по длинной стороне')}</p>
          </div>
          <span className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => logoRef.current?.click()}>{tr('Заменить')}</Button>
            {r.data.logoName && <Button size="sm" variant="outline" className="text-danger-text" onClick={() => void adminApi.saveBranding({ logoName: undefined }).then(() => toast.success(tr('Логотип удалён')))}>{tr('Удалить')}</Button>}
          </span>
        </div>
      </section>

      <section className="surface mt-4 p-4 lg:p-5">
        <h2 className="t-h3">{tr('Агентство')}</h2>
        <div className="mt-3"><Field label={tr('Название')} hint={tr('Подставляется в презентации и письма')}>{(id, d) => <Input id={id} aria-describedby={d} value={name} onChange={(e) => setName(e.target.value)} />}</Field></div>
      </section>

      <section className="surface mt-4 p-4 lg:p-5">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="t-h3">{tr('Водяной знак на фото')}</h2>
            <p className="t-caption mt-0.5">{tr('Логотип поверх фотографий объектов в PDF и презентациях.')}</p>
          </div>
          <Switch label={tr('Водяной знак')} checked={watermark} onChange={setWatermark} />
        </div>
        {watermark && (
          <label className="mt-4 block">
            <span className="t-caption">{tr('Прозрачность:')}{opacity}%</span>
            {/* Сам ползунок высотой 44px — иначе цель нажатия всего 8px по высоте дорожки. */}
            <input type="range" min={10} max={80} step={5} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
              className="range-control mt-1 h-11 w-full cursor-pointer appearance-none bg-transparent accent-primary" />
          </label>
        )}
      </section>

      <div className="mt-4 flex justify-end"><Button loading={busy} onClick={save}>{tr('Сохранить')}</Button></div>
    </PageBody>
  );
}

/* ──────────────────────────── Пользователи ──────────────────────────── */

export function UsersScreen() {
  const av = useAdminVersion();
  const r = useResource(() => adminApi.members(), [av]);
  const [invite, setInvite] = React.useState(false);
  const [form, setForm] = React.useState({ fullName: '', email: '', role: 'REALTOR' as UserRole });
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState<Member | null>(null);
  const [fire, setFire] = React.useState<Member | null>(null);
  /* Один скрытый выбор файла на всю таблицу: какому сотруднику — помним отдельно. */
  const photoFor = React.useRef<string | null>(null);
  const photoPick = React.useRef<HTMLInputElement>(null);
  const takePhoto = async (file?: File) => {
    const id = photoFor.current;
    if (!file || !id) return;
    try { await adminApi.setMemberPhoto(id, file); toast.success(tr('Фото обновлено')); }
    catch (e) { toast.error((e as Error).message); }
    finally { photoFor.current = null; if (photoPick.current) photoPick.current.value = ''; }
  };

  const header = <PageHeader title={tr('Пользователи')} back="/settings" subtitle={tr('Доступы сотрудников агентства')}
    actions={<IconButton label={tr('Пригласить сотрудника')} onClick={() => setInvite(true)}><Plus /></IconButton>} />;

  if (r.error) return <PageBody className="lg:max-w-[860px]">{header}<ErrorState error={r.error} onRetry={r.retry} what={tr('пользователей')} /></PageBody>;
  if (r.loading || !r.data) return <PageBody className="lg:max-w-[860px]">{header}<Skeleton className="h-64" /></PageBody>;

  const send = async () => {
    setBusy(true);
    try { await adminApi.inviteMember(form); setInvite(false); setForm({ fullName: '', email: '', role: 'REALTOR' }); toast.success(tr('Приглашение отправлено')); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <PageBody className="lg:max-w-[860px]">
      {header}
      <div data-hscroll className="surface overflow-x-auto">
        <table className="w-full min-w-[620px] text-[14px]">
          <caption className="sr-only">{tr('Сотрудники и их доступы')}</caption>
          <thead>
            <tr className="border-b border-border text-left text-[12.5px] text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">{tr('Сотрудник')}</th>
              <th scope="col" className="px-3 py-2.5 font-medium">{tr('Роль')}</th>
              <th scope="col" className="px-3 py-2.5 font-medium">{tr('Был в системе')}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">{tr('Доступ')}</th>
            </tr>
          </thead>
          <tbody>
            {r.data.map((m) => (
              <tr key={m.id} className={cn('border-b border-border/70 last:border-0', !m.active && 'text-muted-foreground')}>
                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                  <span className="flex items-center gap-3">
                    <button type="button" className="pressable relative grid h-11 w-11 shrink-0 place-items-center rounded-full"
                      onClick={() => { photoFor.current = m.id; photoPick.current?.click(); }}
                      aria-label={m.avatarUrl ? tr('Сменить фото: {name}', { name: m.fullName }) : tr('Добавить фото: {name}', { name: m.fullName })}>
                      <Avatar name={m.fullName} src={m.avatarUrl} size={40} />
                      <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-primary text-primary-foreground" aria-hidden>
                        <Camera className="h-3 w-3" />
                      </span>
                    </button>
                    <span className="min-w-0">
                      <span className="block font-medium">{m.fullName}</span>
                      <span className="t-caption block">{m.email}</span>
                      {m.avatarUrl && (
                        <button type="button" className="t-caption underline decoration-dotted"
                          onClick={() => void adminApi.removeMemberPhoto(m.id).then(() => toast.success(tr('Фото убрано')))}>{tr('Убрать фото')}</button>
                      )}
                    </span>
                  </span>
                </th>
                <td className="px-3 py-2.5">
                  <Select aria-label={tr('Роль: {name}', { name: m.fullName })} value={m.role} onChange={(e) => void adminApi.setMemberRole(m.id, e.target.value as UserRole).then(() => toast.success(tr('Роль изменена')))}>
                    {(Object.keys(ROLE_LABEL) as UserRole[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
                  </Select>
                </td>
                <td className="px-3 py-2.5 t-caption">{m.lastSeenAt ? ago(m.lastSeenAt) : '—'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    {m.active
                      ? <Button size="sm" variant="outline" onClick={() => setConfirm(m)}>{tr('Отключить')}</Button>
                      : <Button size="sm" variant="outline" onClick={() => void adminApi.setMemberActive(m.id, true).then(() => toast.success(tr('Доступ возвращён')))}>{tr('Включить')}</Button>}
                    <IconButton label={tr('Удалить из команды: {name}', { name: m.fullName })} variant="outline" className="text-danger-text" onClick={() => setFire(m)}><UserMinus /></IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Поле скрыто, но подпись нужна: скринридер читает его как «поле без имени». */}
      <input ref={photoPick} type="file" accept="image/*" aria-label={tr('Фотография сотрудника')} className="sr-only" tabIndex={-1}
        onChange={(e) => void takePhoto(e.target.files?.[0])} />
      <p className="t-caption mt-4">{tr('Отключённый сотрудник не входит в систему, но его лиды, задачи и история остаются на месте. Удаление — на случай, когда человек ушёл совсем: его лиды, задачи, показы и объекты переходят администратору.')}</p>

      <Sheet open={invite} onOpenChange={setInvite} title={tr('Пригласить сотрудника')} description={tr('Придёт письмо со ссылкой для входа.')} size="sm"
        footer={<><Button variant="outline" onClick={() => setInvite(false)}>{tr('Отмена')}</Button><Button loading={busy} onClick={send}>{tr('Отправить')}</Button></>}>
        <div className="space-y-3">
          <Field label={tr('Имя и фамилия')}>{(id, d) => <Input id={id} aria-describedby={d} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />}</Field>
          <Field label={tr('Рабочая почта')}>{(id, d) => <Input id={id} aria-describedby={d} type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@ontop.property" />}</Field>
          <Field label={tr('Роль')}>{(id, d) => (
            <Select id={id} aria-describedby={d} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              {(Object.keys(ROLE_LABEL) as UserRole[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
            </Select>
          )}</Field>
        </div>
      </Sheet>

      <ConfirmDialog open={fire !== null} onOpenChange={(v) => !v && setFire(null)} title={tr('Удалить из команды?')}
        text={fire ? tr('{name} исчезнет из списков и фильтров. Лиды, задачи, показы и объекты перейдут администратору — ничего не потеряется.', { name: fire.fullName }) : ''} confirmLabel={tr('Удалить')}
        onConfirm={async () => {
          if (!fire) return;
          try {
            const moved = await adminApi.deleteMember(fire.id);
            const parts = [moved.leads && `${tr('лиды')}: ${moved.leads}`, moved.tasks && `${tr('задачи')}: ${moved.tasks}`, moved.properties && `${tr('объекты')}: ${moved.properties}`].filter(Boolean).join(', ');
            toast.success(parts ? tr('Сотрудник удалён. Передано администратору — {parts}', { parts }) : tr('Сотрудник удалён'));
          } catch (e) { toast.error((e as Error).message); }
          finally { setFire(null); }
        }} />
      <ConfirmDialog open={confirm !== null} onOpenChange={(v) => !v && setConfirm(null)} title={tr('Отключить доступ?')}
        text={confirm ? tr('{name} не сможет войти. Лиды и задачи останутся закреплены за ним.', { name: confirm.fullName }) : ''} confirmLabel={tr('Отключить')}
        onConfirm={async () => { if (confirm) await adminApi.setMemberActive(confirm.id, false); setConfirm(null); toast.success(tr('Доступ отключён')); }} />
    </PageBody>
  );
}

/* ------------------------------ Уведомления ------------------------------ */

/**
 * /settings/notifications. В работающей CRM такого экрана нет: колокольчик
 * показывает всё подряд. Здесь набор событий взят из того, что CRM уже умеет
 * считать (см. components/overlays/notifications.tsx), и разложен по каналам.
 *
 * Тихие часы — одним переключателем и двумя полями времени: ночной показ
 * переносить некуда, а будить риелтора в три ночи незачем.
 */
type NotifyChannel = 'push' | 'email' | 'telegram';
type NotifyKey = 'tasksDue' | 'tasksOverdue' | 'leadNew' | 'leadUnassigned' | 'showingSoon' | 'dealStage';

const NOTIFY_ROWS: { key: NotifyKey; title: string; text: string }[] = [
  { key: 'tasksDue', title: tr('Задачи на сегодня'), text: tr('Утром списком, без звука') },
  { key: 'tasksOverdue', title: tr('Просроченные задачи'), text: tr('Как только срок прошёл') },
  { key: 'leadNew', title: tr('Новый лид'), text: tr('С сайта, из Instagram и вручную') },
  { key: 'leadUnassigned', title: tr('Лид без ответственного'), text: tr('Через 30 минут после появления') },
  { key: 'showingSoon', title: tr('Показ скоро'), text: tr('За час до начала') },
  { key: 'dealStage', title: tr('Сделка сменила этап'), text: tr('Только по своим сделкам') },
];
const NOTIFY_CHANNEL: Record<NotifyChannel, string> = { push: 'Push', email: tr('Почта'), telegram: 'Telegram' };

export function NotificationsSettingsScreen() {
  const settings = usePreviewSettings();
  const [rows, setRows] = React.useState<Record<NotifyKey, boolean>>({
    tasksDue: true, tasksOverdue: true, leadNew: true, leadUnassigned: true, showingSoon: true, dealStage: false,
  });
  const [channels, setChannels] = React.useState<Record<NotifyChannel, boolean>>({ push: true, email: false, telegram: false });
  const [quiet, setQuiet] = React.useState({ on: true, from: '21:00', to: '08:00' });
  const [busy, setBusy] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const touch = <T,>(set: (v: T) => void) => (v: T) => { set(v); setDirty(true); };

  const save = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 450));
    setBusy(false); setDirty(false);
    toast.success(tr('Уведомления сохранены'));
  };

  return (
    <PageBody className="lg:max-w-[760px]">
      <PageHeader title={tr('Уведомления')} back="/settings" subtitle={tr('Что присылать и куда')} />

      <section className="surface p-4 lg:p-5">
        <h2 className="t-h3 text-[15px]">{tr('О чём сообщать')}</h2>
        <ul className="row-divider mt-2">
          {NOTIFY_ROWS.map((row) => (
            <li key={row.key} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{row.title}</span>
                <span className="t-caption">{row.text}</span>
              </span>
              <Switch label={row.title} checked={rows[row.key]} onChange={touch((v: boolean) => setRows({ ...rows, [row.key]: v }))} />
            </li>
          ))}
        </ul>
      </section>

      <section className="surface mt-4 p-4 lg:p-5">
        <h2 className="t-h3 text-[15px]">{tr('Куда присылать')}</h2>
        <p className="t-caption mt-1">{tr('Колокольчик в CRM работает всегда — это дополнительные каналы.')}</p>
        <ul className="row-divider mt-2">
          {(Object.keys(NOTIFY_CHANNEL) as NotifyChannel[]).map((ch) => {
            const off = ch === 'telegram' && !settings.integrationsEnabled;
            return (
              <li key={ch} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{NOTIFY_CHANNEL[ch]}</span>
                  {off && <span className="t-caption">{tr('Появится, когда администратор подключит мессенджеры')}</span>}
                </span>
                {off
                  ? <span className="t-caption shrink-0">{tr('выключено')}</span>
                  : <Switch label={NOTIFY_CHANNEL[ch]} checked={channels[ch]} onChange={touch((v: boolean) => setChannels({ ...channels, [ch]: v }))} />}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="surface mt-4 p-4 lg:p-5">
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">{tr('Тихие часы')}</span>
            <span className="t-caption">{tr('Ночью уведомления придут утром. Просрочку всё равно покажет колокольчик.')}</span>
          </span>
          <Switch label={tr('Тихие часы')} checked={quiet.on} onChange={touch((v: boolean) => setQuiet({ ...quiet, on: v }))} />
        </div>
        {quiet.on && (
          <div className="mt-3">
            <FormGrid>
              <Field label={tr('С')}>{(id) => <Input id={id} required type="time" value={quiet.from} onChange={(e) => { setQuiet({ ...quiet, from: e.target.value }); setDirty(true); }} />}</Field>
              <Field label={tr('До')}>{(id) => <Input id={id} required type="time" value={quiet.to} onChange={(e) => { setQuiet({ ...quiet, to: e.target.value }); setDirty(true); }} />}</Field>
            </FormGrid>
          </div>
        )}
      </section>

      <div className="mt-5 flex justify-end">
        <Button loading={busy} disabled={!dirty} onClick={save}>{tr('Сохранить')}</Button>
      </div>
    </PageBody>
  );
}
