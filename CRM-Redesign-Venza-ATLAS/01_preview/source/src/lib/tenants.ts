/**
 * Кобрендинг входа: домен рабочей почты → бренд агентства.
 * В CRM: GET /api/tenants/resolve?domain= (публичный, без раскрытия, существует ли пользователь).
 */
export type Tenant = { id: string; name: string; short: string; domains: string[]; accent: string; accentSoft: string; glowA: string; glowB: string; logo: 'ontop' | 'monogram' };

export const PLATFORM = { name: 'RealtorsOS', accent: '#34D399', glowA: 'rgba(16,185,129,.55)', glowB: 'rgba(99,102,241,.45)' };

export const TENANTS: Tenant[] = [
  { id: 'ontop', name: 'On Top Property', short: 'TOP OS', domains: ['ontop.property', 'top.com.ua', 'toprealestate.com'], accent: '#344A39', accentSoft: '#E5EBE3', glowA: 'rgba(198,165,104,.55)', glowB: 'rgba(102,118,90,.5)', logo: 'ontop' },
  { id: 'riviera', name: 'Riviera Estates', short: 'Riviera', domains: ['riviera-estates.com'], accent: '#1F5E8C', accentSoft: '#E3EEF6', glowA: 'rgba(56,152,214,.5)', glowB: 'rgba(240,196,120,.45)', logo: 'monogram' },
];

/** Совпадение по мере ввода: домен или его начало от 3 символов после «@». */
export function detectTenant(email: string): Tenant | null {
  const at = email.indexOf('@');
  if (at < 0) return null;
  const typed = email.slice(at + 1).trim().toLowerCase();
  if (typed.length < 3) return null;
  return TENANTS.find((t) => t.domains.some((d) => d.startsWith(typed) || typed.startsWith(d))) ?? null;
}
