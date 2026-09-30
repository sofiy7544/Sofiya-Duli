import { redirect } from 'next/navigation';
import { currentUser } from '@/server/session';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Вход' };

export default async function LoginPage() {
  if (await currentUser()) redirect('/');
  return <LoginForm />;
}
