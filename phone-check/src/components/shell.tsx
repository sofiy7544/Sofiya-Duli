'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, PhoneCall, ScrollText, ShieldCheck, Users } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { initials } from './ui';
import { api } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { createContext, useContext } from 'react';

const ROLE_LABEL = { admin: 'Admin', manager: 'Manager', viewer: 'Viewer' } as const;

const UserContext = createContext<SessionUser | null>(null);
export const useUser = () => useContext(UserContext)!;
export const canWrite = (u: SessionUser) => u.role === 'admin' || u.role === 'manager';

export function Shell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = [
    { href: '/', label: 'Проверки', icon: PhoneCall, match: (p: string) => p === '/' || p.startsWith('/batches') || p.startsWith('/results') || p.startsWith('/customers') },
    ...(user.role === 'admin'
      ? [
          { href: '/audit', label: 'Журнал аудита', icon: ScrollText, match: (p: string) => p.startsWith('/audit') },
          { href: '/users', label: 'Пользователи', icon: Users, match: (p: string) => p.startsWith('/users') },
        ]
      : []),
  ];

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  };

  return (
    <UserContext.Provider value={user}>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">
              <ShieldCheck size={16} />
            </span>
            Phone Check
          </div>
          <nav className="row-wrap" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2 }} aria-label="Основная навигация">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="nav-link" aria-current={n.match(pathname) ? 'page' : undefined}>
                <n.icon size={16} />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-foot">
            <div className="user-chip">
              <span className="avatar">{initials(user.name)}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="ellipsis" style={{ fontWeight: 550 }}>
                  {user.name}
                </div>
                <div className="muted small">{ROLE_LABEL[user.role]}</div>
              </div>
            </div>
            <div className="row">
              <ThemeToggle />
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                <LogOut size={14} /> Выйти
              </button>
            </div>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
    </UserContext.Provider>
  );
}
