/**
 * Единая структура мобильной навигации для ВСЕХ 6 тем.
 * Тема меняет только оформление, но не состав и не порядок пунктов.
 * Маршруты — существующие (SCREEN-MAP), легаси-алиасы подсвечивают нужный пункт.
 */
export type UserRole = 'ADMIN' | 'REALTOR' | 'ASSISTANT' | 'ANALYST' | 'MANAGER' | 'EMPLOYEE';

export type NavIconKey =
  | 'today' | 'leads' | 'properties' | 'tasks' | 'more'
  | 'clients' | 'deals' | 'calendar' | 'notes' | 'communications' | 'team' | 'reports' | 'settings';

export type NavItem = {
  key: NavIconKey;
  href: string;
  /** Префиксы, при которых пункт активен (включая легаси-URL и вложенные маршруты). */
  match: readonly string[];
  /** Текущие гейты проекта. Не ослаблять. */
  roles?: readonly UserRole[];
  requiresIntegrations?: boolean;
};

export const PRIMARY_NAV: readonly NavItem[] = [
  { key: 'today', href: '/today', match: ['/today', '/dashboard'] },
  { key: 'leads', href: '/leads', match: ['/leads', '/pipeline', '/pool'] },
  { key: 'properties', href: '/properties', match: ['/properties', '/inventory'] },
  { key: 'tasks', href: '/tasks', match: ['/tasks'] },
];

export const MORE_NAV: readonly NavItem[] = [
  { key: 'clients', href: '/clients', match: ['/clients', '/contacts'] },
  { key: 'deals', href: '/deals', match: ['/deals'] },
  { key: 'calendar', href: '/calendar', match: ['/calendar'] },
  { key: 'notes', href: '/notes', match: ['/notes'] },
  { key: 'communications', href: '/inbox', match: ['/inbox', '/qualify'], requiresIntegrations: true },
  { key: 'team', href: '/team', match: ['/team'], roles: ['ADMIN'] },
  { key: 'reports', href: '/reports', match: ['/reports', '/insights'], roles: ['ADMIN'] },
  { key: 'settings', href: '/settings', match: ['/settings', '/profile', '/admin'] },
];

export type NavContext = { role: UserRole | null | undefined; integrationsEnabled: boolean };

export function isItemVisible(item: NavItem, ctx: NavContext): boolean {
  if (item.requiresIntegrations && !ctx.integrationsEnabled) return false;
  if (item.roles && (!ctx.role || !item.roles.includes(ctx.role))) return false;
  return true;
}

export function getMoreItems(ctx: NavContext): NavItem[] {
  return MORE_NAV.filter((i) => isItemVisible(i, ctx));
}

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

export function isItemActive(item: NavItem, pathname: string): boolean {
  return item.match.some((p) => matches(pathname, p));
}

/** Какой из 5 слотов подсвечен: один из основных или «Ещё». null — ни один (например, /login). */
export function getActiveSlot(pathname: string): NavIconKey | null {
  const primary = PRIMARY_NAV.find((i) => isItemActive(i, pathname));
  if (primary) return primary.key;
  if (MORE_NAV.some((i) => isItemActive(i, pathname))) return 'more';
  return null;
}

/** Build-time флаг, как в текущем проекте. */
export const INTEGRATIONS_ENABLED = process.env.NEXT_PUBLIC_INTEGRATIONS_ENABLED === 'true';
