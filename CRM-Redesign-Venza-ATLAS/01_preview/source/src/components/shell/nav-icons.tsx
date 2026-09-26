import { BarChart3, Building2, CalendarDays, CheckSquare, Handshake, LayoutGrid, MessagesSquare, Settings, StickyNote, Sun, User, Users, Workflow } from 'lucide-react';
import { translated } from '@/lib/i18n';
import type { NavIconKey } from '@/lib/navigation/mobile-nav';
import { tr } from '@/lib/i18n';

/** Одна иконка на раздел во всей CRM (icon audit). */
export const NAV_ICON: Record<NavIconKey, typeof Sun> = {
  today: Sun, leads: Workflow, properties: Building2, tasks: CheckSquare, more: LayoutGrid,
  clients: User, deals: Handshake, calendar: CalendarDays, notes: StickyNote, communications: MessagesSquare, team: Users, reports: BarChart3, settings: Settings,
};
export const NAV_LABEL: Record<NavIconKey, string> = translated({
  today: tr('Сегодня'), leads: tr('Лиды'), properties: tr('Объекты'), tasks: tr('Задачи'), more: tr('Ещё'), clients: tr('Клиенты'), deals: tr('Сделки'), calendar: tr('Календарь'),
  notes: tr('Заметки'), communications: tr('Коммуникации'), team: tr('Команда'), reports: tr('Отчёты'), settings: tr('Настройки'),
});
