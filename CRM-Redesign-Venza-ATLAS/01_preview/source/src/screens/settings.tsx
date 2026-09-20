import * as React from 'react';
import { Bell, Check, ChevronRight, Globe, Image, ListX, Palette, Plug, Send, User, Users, Wand2 } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/page';
import { ThemeSwatches } from '@/components/overlays/preview-panel';
import { toast } from '@/components/ui/toast';
import { InstallCard } from '@/components/shell/install';
import { Sheet } from '@/components/ui/sheet';
import { LOCALES, setLocale, useLocale, type LocaleCode } from '@/lib/locale';
import { MODE_OPTIONS, type Mode } from '@/lib/theme/themes';
import { useTheme } from '@/lib/theme/provider';
import { SegmentedControl } from '@/components/ui/segmented';
import { cn } from '@/lib/cn';
import { Link } from '@/lib/router';

/** /settings: оформление + разделы. Выбор темы — ThemePicker из пакета Phase 2. */
export function SettingsScreen() {
  const locale = useLocale();
  const { mode, setMode } = useTheme();
  const [langOpen, setLangOpen] = React.useState(false);
  const lang = LOCALES.find((l) => l.code === locale)!;
  type Row = { icon: typeof User; label: string; text: string; action?: () => void; href?: string };
  const rows: Row[] = [
    { icon: Wand2, label: 'Автоматизация', text: 'Правила: событие — действие', href: '/settings/automation' },
    { icon: Send, label: 'Шаблоны', text: 'Готовые сообщения клиентам', href: '/settings/templates' },
    { icon: Users, label: 'Пользователи', text: 'Доступы сотрудников', href: '/settings/users' },
    { icon: Image, label: 'Брендинг', text: 'Логотип и водяной знак', href: '/settings/branding' },
    { icon: Plug, label: 'Интеграции', text: 'Telegram, WhatsApp, почта', href: '/settings/integrations' },
    { icon: Globe, label: 'Язык', text: `${lang.flag} ${lang.label}`, action: () => setLangOpen(true) },
    { icon: User, label: 'Профиль', text: 'Имя, фото, телефон, пароль', href: '/profile' },
    { icon: Bell, label: 'Уведомления', text: 'Задачи, лиды, показы' },
    { icon: ListX, label: 'Причины проигрыша', text: 'Справочник и разбор отказов', href: '/insights/lost-reasons' },
  ];
  const rowInner = (r: Row) => (<>
    <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-surface-2"><r.icon className="h-[18px] w-[18px]" aria-hidden /></span>
    <span className="min-w-0 flex-1"><span className="block text-[15.5px] font-medium">{r.label}</span><span className="t-caption">{r.text}</span></span>
    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
  </>);
  return (
    <PageBody className="lg:max-w-[760px]">
      <PageHeader title="Настройки" />
      <section className="surface p-4 lg:p-5">
        <div className="mb-3 flex items-center gap-2"><Palette className="h-[18px] w-[18px] text-primary" aria-hidden /><h2 className="t-h3">Оформление</h2></div>
        <p className="t-caption mb-4">Меняется только внешний вид. Разделы и навигация остаются прежними.</p>
        <ThemeSwatches />
        {/* Режим — отдельно от темы: тёмный вариант есть у каждой из трёх. */}
        <div className="mt-5">
          <h3 className="t-h3 mb-2 text-[15px]">Режим</h3>
          <SegmentedControl<Mode> label="Режим оформления" className="w-full sm:w-auto" value={mode} onChange={setMode}
            options={MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </div>
      </section>
      <div className="mt-4"><InstallCard /></div>
      <ul className="surface row-divider mt-4 overflow-hidden">
        {rows.map((r) => (
          <li key={r.label}>
            {r.href
              ? <Link href={r.href} className="pressable flex w-full items-center gap-3.5 px-4 py-3.5 text-left">{rowInner(r)}</Link>
              : <button onClick={() => (r.action ? r.action() : toast.message(`${r.label}: экран в Preview 2`))} className="pressable flex w-full items-center gap-3.5 px-4 py-3.5 text-left">{rowInner(r)}</button>}
          </li>
        ))}
      </ul>
      <Sheet open={langOpen} onOpenChange={setLangOpen} title="Язык интерфейса" description="Пока меняются форматы дат и чисел: подписи интерфейса переводятся в CRM." desktop="center" size="sm">
        <ul role="radiogroup" aria-label="Язык интерфейса" className="space-y-1">
          {LOCALES.map((l) => {
            const on = l.code === locale;
            return (
              <li key={l.code}>
                <button role="radio" aria-checked={on} onClick={() => { setLocale(l.code as LocaleCode); setLangOpen(false); toast.success(`Язык: ${l.label}`); }}
                  className={cn('flex min-h-[56px] w-full items-center gap-3 rounded-control px-3 text-left transition-colors', on ? 'bg-primary-soft' : 'hover:bg-surface-2')}>
                  <span className="text-[22px] leading-none" aria-hidden>{l.flag}</span>
                  <span className="flex-1 text-[16px] font-medium">{l.label}</span>
                  {on && <Check className="h-4 w-4 text-primary" aria-label="Выбран" />}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="t-caption mt-3">В CRM подписи берутся из next-intl (messages/ru.json, uk, en, fr, it). В превью переключение меняет форматы дат, времени и чисел.</p>
      </Sheet>
    </PageBody>
  );
}
