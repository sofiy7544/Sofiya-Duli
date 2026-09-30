import { BatchView } from './batch-view';

export const metadata = { title: 'Результаты проверки' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BatchView id={id} />;
}
