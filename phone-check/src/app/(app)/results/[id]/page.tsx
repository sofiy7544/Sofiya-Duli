import { ReviewView } from './review-view';

export const metadata = { title: 'Ручная проверка' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewView id={id} />;
}
