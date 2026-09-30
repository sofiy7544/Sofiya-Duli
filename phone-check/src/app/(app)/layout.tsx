import { Shell } from '@/components/shell';
import { requirePageUser } from '@/server/session';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return <Shell user={user}>{children}</Shell>;
}
