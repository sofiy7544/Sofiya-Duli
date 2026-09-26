import { Compass, Construction, Lock, MessagesSquare } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/page';
import { EmptyState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { store } from '@/lib/mock/store';
import { NAV_LABEL } from '@/components/shell/nav-icons';
import { Link } from '@/lib/router';
import type { NavIconKey } from '@/lib/navigation/mobile-nav';
import { tr } from '@/lib/i18n';

/** Разделы вне Preview 1: маршрут и навигация настоящие, экран — честная заглушка. */
export function PlaceholderScreen({ section }: { section: NavIconKey }) {
  if (section === 'communications' && !store.settings.integrationsEnabled) {
    return <PageBody><PageHeader title={NAV_LABEL[section]} /><EmptyState icon={MessagesSquare} title={tr('Мессенджеры не подключены')} text={tr('Когда администратор подключит Telegram, WhatsApp или почту, переписка появится здесь.')} /></PageBody>;
  }
  return (
    <PageBody><PageHeader title={NAV_LABEL[section]} />
      <EmptyState icon={Construction} title={tr('Экран войдёт в Preview 2')} text={tr('Навигация, права и маршрут уже настоящие. Дизайн раздела будет в следующей итерации.')}
        action={<Button variant="outline" size="sm" onClick={() => history.back()}>{tr('Вернуться')}</Button>} />
    </PageBody>
  );
}
export function ForbiddenScreen() {
  return <PageBody><PageHeader title={tr('Нет доступа')} /><EmptyState icon={Lock} title={tr('Раздел только для администратора')} text={tr('Переключите роль в панели превью, чтобы посмотреть экран.')} /></PageBody>;
}

/** not-found.tsx: адрес не совпал ни с одним экраном. Раньше здесь показывалась
 *  заглушка раздела «Сегодня» — человек думал, что раздел не готов, хотя просто
 *  ошибся ссылкой. */
export function NotFoundScreen({ path }: { path: string }) {
  return (
    <PageBody>
      <PageHeader title={tr('Страница не найдена')} />
      <EmptyState icon={Compass} title={tr('Адрес {path} не существует', { path })}
        text={tr('Возможно, ссылка устарела или в ней опечатка. Разделы CRM — в нижней панели и в «Ещё».')}
        action={<Link href="/today" className="pressable inline-flex h-11 items-center rounded-control bg-primary px-4 text-[15px] font-semibold text-primary-foreground">{tr('На сегодня')}</Link>} />
    </PageBody>
  );
}
