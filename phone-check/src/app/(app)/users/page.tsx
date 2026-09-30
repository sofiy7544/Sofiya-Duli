import { requirePageUser } from '@/server/session';
import { UsersView } from './users-view';

export const metadata = { title: 'Пользователи' };

export default async function Page() {
  await requirePageUser(['admin']);
  return <UsersView />;
}
