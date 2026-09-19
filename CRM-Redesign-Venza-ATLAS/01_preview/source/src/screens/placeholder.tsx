import { Construction, Lock, MessagesSquare } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/shell/page';
import { EmptyState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { store } from '@/lib/mock/store';
import { NAV_LABEL } from '@/components/shell/nav-icons';
import type { NavIconKey } from '@/lib/navigation/mobile-nav';

/** Разделы вне Preview 1: маршрут и навигация настоящие, экран — честная заглушка. */
export function PlaceholderScreen({ section }: { section: NavIconKey }) {
  if (section === 'communications' && !store.settings.integrationsEnabled) {
    return <PageBody><PageHeader title={NAV_LABEL[section]} /><EmptyState icon={MessagesSquare} title="Мессенджеры не подключены" text="Когда администратор подключит Telegram, WhatsApp или почту, переписка появится здесь." /></PageBody>;
  }
  return (
    <PageBody><PageHeader title={NAV_LABEL[section]} />
      <EmptyState icon={Construction} title="Экран войдёт в Preview 2" text="Навигация, права и маршрут уже настоящие. Дизайн раздела будет в следующей итерации."
        action={<Button variant="outline" size="sm" onClick={() => history.back()}>Вернуться</Button>} />
    </PageBody>
  );
}
export function ForbiddenScreen() {
  return <PageBody><PageHeader title="Нет доступа" /><EmptyState icon={Lock} title="Раздел только для администратора" text="Переключите роль в панели превью, чтобы посмотреть экран." /></PageBody>;
}
