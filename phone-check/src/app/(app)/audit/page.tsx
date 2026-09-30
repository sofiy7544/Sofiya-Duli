import { requirePageUser } from '@/server/session';
import { AuditView } from './audit-view';

export const metadata = { title: 'Журнал аудита' };

export default async function Page() {
  await requirePageUser(['admin']);
  return <AuditView />;
}
