import type { CalendarEvent, Lead, Task } from './mock/types';
import { STAGE_LABEL } from './labels';

/**
 * Правила AI Briefing.
 *
 * В работающей CRM блок — пустая заглушка без логики, описания не было,
 * поэтому поведение спроектировано здесь. Главное решение: блок отвечает
 * на один вопрос — «что делать прямо сейчас» — и всегда показывает, почему
 * он так считает. Без объяснения подсказка превращается в гадание, которому
 * риелтор не поверит.
 *
 * Считают правила, а не модель: результат воспроизводим и проверяем.
 * Порядок — по severity; ниже 0 не опускаемся, выше 100 не поднимаемся.
 */
export type Severity = 'now' | 'today' | 'week';
export type SignalKind =
  | 'overdue-action' | 'showing-soon' | 'task-overdue'
  | 'hot-no-plan' | 'negotiation-stale' | 'cooling' | 'unassigned';

export type BriefingAction =
  | { kind: 'open'; label: string; href: string }
  | { kind: 'plan-today'; label: string; leadId: string; at: string }
  | { kind: 'plan-tomorrow'; label: string; leadId: string; at: string }
  | { kind: 'task-call'; label: string; leadId: string; title: string };

export type Signal = {
  id: string;
  kind: SignalKind;
  severity: Severity;
  score: number;
  title: string;
  /** Почему пункт здесь: одна фраза с фактом, а не оценкой. */
  why: string;
  href: string;
  actions: BriefingAction[];
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const COOLING_DAYS = 7;
const STALE_NEGOTIATION_DAYS = 3;

const atToday = (h: number, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };
const atTomorrow = (h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(h, m, 0, 0); return d.toISOString(); };
const days = (iso: string, now: number) => Math.floor((now - new Date(iso).getTime()) / DAY);

const bySeverity = (score: number): Severity => (score >= 85 ? 'now' : score >= 60 ? 'today' : 'week');

export const SEVERITY_LABEL: Record<Severity, string> = { now: 'Сейчас', today: 'Сегодня', week: 'На этой неделе' };

export type BriefingInput = {
  leads: Lead[];
  tasks: Task[];
  events: CalendarEvent[];
  nameOf: (clientId?: string) => string;
  now?: number;
};

export function buildBriefing({ leads, tasks, events, nameOf, now = Date.now() }: BriefingInput): Signal[] {
  const out: Signal[] = [];
  const add = (s: Omit<Signal, 'severity'>) => out.push({ ...s, severity: bySeverity(s.score) });

  /* Просроченный следующий шаг — самое дорогое: клиент уже ждёт. */
  for (const l of leads.filter((x) => x.nextActionAt && new Date(x.nextActionAt).getTime() < now)) {
    const late = days(l.nextActionAt!, now);
    add({
      id: `overdue-${l.id}`, kind: 'overdue-action', score: 100 - Math.min(10, late),
      title: `Связаться: ${nameOf(l.clientId)}`,
      why: late >= 1 ? `Шаг просрочен на ${late} ${late === 1 ? 'день' : late < 5 ? 'дня' : 'дней'} · этап «${STAGE_LABEL[l.stage]}»` : `Шаг просрочен сегодня · этап «${STAGE_LABEL[l.stage]}»`,
      href: `/leads/${l.id}`,
      actions: [
        { kind: 'task-call', label: 'Звонок сейчас', leadId: l.id, title: `Звонок: ${nameOf(l.clientId)}` },
        { kind: 'plan-tomorrow', label: 'Перенести на завтра', leadId: l.id, at: atTomorrow(10) },
      ],
    });
  }

  /* Показ в ближайшие три часа: подготовка занимает время, о ней забывают. */
  for (const e of events.filter((x) => x.kind === 'SHOWING')) {
    const left = new Date(e.startsAt).getTime() - now;
    if (left <= 0 || left > 3 * HOUR) continue;
    add({
      id: `showing-${e.id}`, kind: 'showing-soon', score: 95 - Math.round(left / HOUR),
      title: `Показ: ${e.title}`,
      why: `Начало через ${Math.max(1, Math.round(left / 60_000))} мин · проверьте ключи и доступ`,
      href: '/calendar',
      actions: [{ kind: 'open', label: 'В календарь', href: '/calendar' }],
    });
  }

  /* Просроченные задачи: их видно и в «Задачах», но утром сводка важнее списка. */
  const lateTasks = tasks.filter((t) => !t.completedAt && new Date(t.dueAt).getTime() < now);
  if (lateTasks.length > 0) {
    add({
      id: 'tasks-overdue', kind: 'task-overdue', score: 88,
      title: `Просроченные задачи: ${lateTasks.length}`,
      why: `Самая старая — «${lateTasks[0].title}»`,
      href: '/tasks',
      actions: [{ kind: 'open', label: 'Открыть задачи', href: '/tasks' }],
    });
  }

  /* Горячий лид без следующего шага — источник потерь, которого не видно в списках. */
  for (const l of leads.filter((x) => x.priority === 'hot' && !x.nextActionAt)) {
    add({
      id: `noplan-${l.id}`, kind: 'hot-no-plan', score: 72,
      title: `Нет следующего шага: ${nameOf(l.clientId)}`,
      why: `Горячий лид на этапе «${STAGE_LABEL[l.stage]}» без запланированного действия`,
      href: `/leads/${l.id}`,
      actions: [
        { kind: 'plan-today', label: 'Сегодня в 18:00', leadId: l.id, at: atToday(18) },
        { kind: 'plan-tomorrow', label: 'Завтра в 10:00', leadId: l.id, at: atTomorrow(10) },
      ],
    });
  }

  /* Переговоры без движения: на этом этапе пауза читается как отказ. */
  for (const l of leads.filter((x) => x.stage === 'NEGOTIATION' && x.lastContactAt)) {
    const d = days(l.lastContactAt!, now);
    if (d < STALE_NEGOTIATION_DAYS) continue;
    add({
      id: `stale-${l.id}`, kind: 'negotiation-stale', score: 68,
      title: `Переговоры замерли: ${nameOf(l.clientId)}`,
      why: `Нет контакта ${d} ${d < 5 ? 'дня' : 'дней'} на этапе «Переговоры»`,
      href: `/leads/${l.id}`,
      actions: [{ kind: 'task-call', label: 'Запланировать звонок', leadId: l.id, title: `Звонок: ${nameOf(l.clientId)}` }],
    });
  }

  /* Остывающие лиды: неделя молчания — граница, после которой отвечают заметно реже. */
  for (const l of leads.filter((x) => x.stage !== 'NEGOTIATION' && x.lastContactAt)) {
    const d = days(l.lastContactAt!, now);
    if (d < COOLING_DAYS) continue;
    add({
      id: `cool-${l.id}`, kind: 'cooling', score: 52,
      title: `Остывает: ${nameOf(l.clientId)}`,
      why: `Последний контакт ${d} дней назад · этап «${STAGE_LABEL[l.stage]}»`,
      href: `/leads/${l.id}`,
      actions: [{ kind: 'plan-tomorrow', label: 'Напомнить завтра', leadId: l.id, at: atTomorrow(11) }],
    });
  }

  /* Новые лиды без ответственного: пока никого не назначили, отвечать некому. */
  const orphans = leads.filter((l) => l.stage === 'NEW' && !l.assignedUserId);
  if (orphans.length > 0) {
    add({
      id: 'unassigned', kind: 'unassigned', score: 58,
      title: `Без ответственного: ${orphans.length}`,
      why: 'Новые лиды ждут распределения — за них никто не отвечает',
      href: '/leads',
      actions: [{ kind: 'open', label: 'Распределить', href: '/leads' }],
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

/** Заголовок сводки зависит от времени суток: утром это план, вечером — хвосты. */
export function briefingHeadline(now = new Date()) {
  const h = now.getHours();
  if (h < 11) return { title: 'План на день', text: 'С чего начать, пока все на связи' };
  if (h < 17) return { title: 'Что успеть сегодня', text: 'Срочное и то, что нельзя переносить' };
  return { title: 'Хвосты дня', text: 'Что закрыть до вечера и перенести на завтра' };
}
