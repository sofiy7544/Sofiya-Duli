import { BarChart3, Building2, CalendarDays, CheckSquare, Handshake, LayoutGrid, MessagesSquare, Settings, StickyNote, Sun, User, Users, Workflow } from 'lucide-react';
import type { NavIconKey } from '@/lib/navigation/mobile-nav';

/** Одна иконка на раздел во всей CRM (icon audit). */
export const NAV_ICON: Record<NavIconKey, typeof Sun> = {
  today: Sun, leads: Workflow, properties: Building2, tasks: CheckSquare, more: LayoutGrid,
  clients: User, deals: Handshake, calendar: CalendarDays, notes: StickyNote, communications: MessagesSquare, team: Users, reports: BarChart3, settings: Settings,
};
export const NAV_LABEL: Record<NavIconKey, string> = {
  today: 'Сегодня', leads: 'Лиды', properties: 'Объекты', tasks: 'Задачи', more: 'Ещё', clients: 'Клиенты', deals: 'Сделки', calendar: 'Календарь',
  notes: 'Заметки', communications: 'Коммуникации', team: 'Команда', reports: 'Отчёты', settings: 'Настройки',
};
