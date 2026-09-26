import type { Lead, Urgency } from './mock/types';
import { tr } from '@/lib/i18n';
/** = lib/lead-urgency.ts CRM: overdue → today → hot → stale (нет контакта > 5 дней). */
export function leadUrgency(l: Lead, now = new Date()): Urgency {
  if (l.stage === 'WON' || l.stage === 'LOST') return 'normal';
  if (l.nextActionAt) {
    const t = new Date(l.nextActionAt);
    if (t < now) return 'overdue';
    if (t.toDateString() === now.toDateString()) return 'today';
  }
  if (l.priority === 'hot') return 'hot';
  if (!l.lastContactAt || now.getTime() - new Date(l.lastContactAt).getTime() > 5 * 86_400_000) return 'stale';
  return 'normal';
}
export const URGENCY_LABEL: Record<Urgency, string> = { overdue: tr('Просрочено'), today: tr('Сегодня'), hot: tr('Горячий'), stale: tr('Без контакта'), normal: '' };
export const URGENCY_TONE = { overdue: 'danger', today: 'warning', hot: 'warning', stale: 'neutral', normal: 'neutral' } as const;
