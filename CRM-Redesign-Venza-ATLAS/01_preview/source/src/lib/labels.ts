import type { ClientType, EventKind, LeadStage, Priority, PropertyStatus, PropertyType, SourceType, TaskType } from './mock/types';
import { translated } from './i18n';

/** Строки для порта в next-intl (неймспейсы leads.stages, properties.types …). В превью — ru. */
export const STAGES_ACTIVE: LeadStage[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'SELECTION', 'SHOWING', 'NEGOTIATION'];
export const STAGES_ALL: LeadStage[] = [...STAGES_ACTIVE, 'WON', 'LOST'];

export const STAGE_LABEL: Record<LeadStage, string> = translated({
  NEW: 'Новые', CONTACTED: 'Контакт', QUALIFIED: 'Квалификация', SELECTION: 'Подбор', SHOWING: 'Показ', NEGOTIATION: 'Переговоры', WON: 'Сделка', LOST: 'Проиграно',
});
/** Та же логика, что enums.ts isStageTransitionAllowed: LOST из любого активного, reopen из WON/LOST, WON только из NEGOTIATION. */
export function isStageTransitionAllowed(from: LeadStage, to: LeadStage): boolean {
  if (from === to) return false;
  if (to === 'WON') return from === 'NEGOTIATION';
  if (from === 'WON' || from === 'LOST') return STAGES_ACTIVE.includes(to);
  return true;
}
export const PRIORITY_LABEL: Record<Priority, string> = translated({ hot: 'Горячий', warm: 'Тёплый', cold: 'Холодный' });
export const CLIENT_TYPE_LABEL: Record<ClientType, string> = translated({ BUYER: 'Покупатель', SELLER: 'Продавец', INVESTOR: 'Инвестор' });
export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = translated({ APARTMENT: 'Квартира', HOUSE: 'Дом', COMMERCIAL: 'Коммерция', LAND: 'Участок' });
export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = translated({ AVAILABLE: 'В продаже', IN_SHOWING: 'Идут показы', RESERVED: 'Резерв', SOLD: 'Продан', ARCHIVED: 'Архив' });
export const TASK_TYPE_LABEL: Record<TaskType, string> = translated({ CALL: 'Звонок', SHOWING: 'Показ', FOLLOWUP: 'Follow-up', CUSTOM: 'Задача' });
export const EVENT_KIND_LABEL: Record<EventKind, string> = translated({ SHOWING: 'Показ', MEETING: 'Встреча', CALL: 'Звонок', TASK: 'Задача', DEADLINE: 'Дедлайн', CONTRACT: 'Договор', PAYMENT: 'Оплата' });
export const SOURCE_LABEL: Record<SourceType, string> = translated({ INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', WEBSITE: 'Сайт', REFERRAL: 'Рекомендация', TELEGRAM: 'Telegram', MANUAL: 'Вручную' });
export const PURPOSE_LABEL = translated({ LIVING: 'Для жизни', INVESTMENT: 'Инвестиция', RELOCATION: 'Переезд' });

/** Что с объектом у клиента: подборка → показ → решение. */
export const INTEREST_LABEL: Record<import('./mock/types').InterestStatus, string> = translated({
  SELECTED: 'В подборке', SHOWN: 'Показан', LIKED: 'Нравится', REJECTED: 'Отказ',
});
export const INTEREST_ORDER: import('./mock/types').InterestStatus[] = ['SELECTED', 'SHOWN', 'LIKED', 'REJECTED'];
