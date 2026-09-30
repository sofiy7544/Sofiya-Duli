import { requirePageUser } from '@/server/session';
import { CustomerEdit } from './customer-edit';

export const metadata = { title: 'Карточка клиента' };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  await requirePageUser(['admin', 'manager']);
  const { id } = await params;
  const { from } = await searchParams;
  return <CustomerEdit id={id} from={from && /^[0-9a-f-]{36}$/i.test(from) ? from : null} />;
}
