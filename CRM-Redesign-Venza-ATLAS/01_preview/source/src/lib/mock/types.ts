/**
 * Типы повторяют сущности и enum'ы реальной CRM (packages/shared, lib/api.ts).
 * Разработчику: заменить импорт на `@crm/shared` — поля и значения совпадают по документации.
 */
export type UserRole = 'ADMIN' | 'REALTOR' | 'ASSISTANT' | 'ANALYST' | 'MANAGER' | 'EMPLOYEE';

export type LeadStage =
  | 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'SELECTION' | 'SHOWING' | 'NEGOTIATION' | 'WON' | 'LOST';
export type Priority = 'hot' | 'warm' | 'cold';
export type Urgency = 'overdue' | 'today' | 'hot' | 'stale' | 'normal';
export type ClientType = 'BUYER' | 'SELLER' | 'INVESTOR';
export type PropertyType = 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'LAND';
export type PropertyStatus = 'AVAILABLE' | 'IN_SHOWING' | 'RESERVED' | 'SOLD' | 'ARCHIVED';
export type TaskType = 'CALL' | 'SHOWING' | 'FOLLOWUP' | 'CUSTOM';
export type EventKind = 'SHOWING' | 'MEETING' | 'CALL' | 'TASK' | 'DEADLINE' | 'CONTRACT' | 'PAYMENT';
export type SourceType = 'INSTAGRAM' | 'FACEBOOK' | 'WEBSITE' | 'REFERRAL' | 'TELEGRAM' | 'MANUAL';
export type ActivityType = 'CALL' | 'NOTE' | 'STAGE' | 'SHOWING' | 'TASK' | 'CREATED';

export type User = { id: string; fullName: string; role: UserRole; email: string };

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };

export type Client = {
  id: string;
  fullName: string;
  primaryPhone: string;
  email?: string;
  type: ClientType;
  source: SourceType;
  assignedUserId: string | null;
  isArchived: boolean;
  isBlacklisted: boolean;
  createdAt: string;
  notes?: string;
  preferences?: {
    propertyType?: PropertyType;
    districts: string[];
    rooms?: { min?: number; max?: number };
    price?: { min?: number; max?: number };
    currency: string;
  };
};

export type Lead = {
  id: string;
  clientId: string;
  stage: LeadStage;
  priority: Priority;
  assignedUserId: string | null;
  source: SourceType;
  purpose: 'LIVING' | 'INVESTMENT' | 'RELOCATION';
  budgetMin?: number;
  budgetMax?: number;
  budgetCurrency: string;
  interestPropertyId?: string;
  interestNote?: string;
  nextActionAt?: string;
  lastContactAt?: string;
  lostReason?: string;
  createdAt: string;
};

export type Property = {
  id: string;
  type: PropertyType;
  status: PropertyStatus;
  title: string;
  district: string;
  address: string;
  rooms?: number;
  floor?: number;
  totalFloors?: number;
  area: number;
  price: number;
  currency: string;
  description: string;
  ownerUserId: string;
  photos: { id: string; art: number }[];
  features: string[];
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  type: TaskType;
  dueAt: string;
  completedAt?: string | null;
  userId: string;
  clientId?: string;
  leadId?: string;
  description?: string;
};

export type CalendarEvent = {
  id: string;
  kind: EventKind;
  title: string;
  startsAt: string;
  endsAt: string;
  clientId?: string;
  propertyId?: string;
  userId: string;
  readOnly?: boolean;
};

export type Activity = {
  id: string;
  type: ActivityType;
  text: string;
  at: string;
  userId: string;
  clientId?: string;
  leadId?: string;
};

/** Режимы данных превью: переключаются в панели, чтобы показать все состояния экрана. */
export type DataMode = 'ready' | 'loading' | 'empty' | 'error';
