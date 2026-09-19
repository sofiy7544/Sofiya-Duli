import { CalendarClock, ChevronRight, PhoneCall, Sparkles, Target } from 'lucide-react';
import { Link } from '@/lib/router';
import { plural, time } from '@/lib/format';
import { STAGE_LABEL } from '@/lib/labels';
import type { CalendarEvent, Lead, Task } from '@/lib/mock/types';
import { store } from '@/lib/mock/store';
import { StatusBadge } from '@/components/ui/badge';

/**
 * AI Briefing на «Сегодня». Блок есть в работающей CRM, но в исходный handoff
 * не попал, поэтому спроектирован по её экрану: та же строка-сводка
 * («N задач на сегодня · M показов в ближайшие 3 ч») и та же метка Beta.
 *
 * Подсказки собираются правилами по данным, а не моделью: просроченный шаг,
 * лид без следующего действия, ближайший показ. Так блок остаётся честным
 * и проверяемым. Когда появится описание настоящей логики, меняется только
 * функция suggest().
 */
type Suggestion = { id: string; icon: typeof PhoneCall; text: string; hint: string; href: string; tone?: 'danger' | 'warning' };

const HOURS_3 = 3 * 60 * 60 * 1000;

function suggest(leads: Lead[], events: CalendarEvent[], nameOf: (id?: string) => string): Suggestion[] {
  const now = Date.now();
  const out: Suggestion[] = [];

  const overdue = leads
    .filter((l) => l.nextActionAt && new Date(l.nextActionAt).getTime() < now)
    .sort((a, b) => (a.nextActionAt ?? '').localeCompare(b.nextActionAt ?? ''));
  for (const l of overdue.slice(0, 2)) {
    out.push({
      id: `late-${l.id}`, icon: PhoneCall, tone: 'danger',
      text: `Связаться: ${nameOf(l.clientId) || 'лид без имени'}`,
      hint: `Шаг просрочен · этап «${STAGE_LABEL[l.stage]}»`,
      href: `/leads/${l.id}`,
    });
  }

  const soon = events
    .filter((e) => e.kind === 'SHOWING' && new Date(e.startsAt).getTime() - now > 0 && new Date(e.startsAt).getTime() - now < HOURS_3)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  for (const e of soon.slice(0, 1)) {
    out.push({
      id: `show-${e.id}`, icon: CalendarClock, tone: 'warning',
      text: `Показ в ${time(e.startsAt)}: ${e.title}`,
      hint: 'Проверить ключи и доступ заранее',
      href: '/calendar',
    });
  }

  if (out.length < 3) {
    const noPlan = leads.filter((l) => !l.nextActionAt && l.stage !== 'WON' && l.stage !== 'LOST' && l.priority === 'hot');
    for (const l of noPlan.slice(0, 3 - out.length)) {
      out.push({
        id: `plan-${l.id}`, icon: Target,
        text: `Запланировать шаг: ${nameOf(l.clientId) || 'горячий лид'}`,
        hint: 'Горячий лид без следующего действия',
        href: `/leads/${l.id}`,
      });
    }
  }
  return out.slice(0, 3);
}

export function BriefingCard({ tasks, events, leads, loading }: {
  tasks: Task[]; events: CalendarEvent[]; leads: Lead[]; loading?: boolean;
}) {
  const clients = store.db.clients;
  const nameOf = (id?: string) => clients.find((c) => c.id === id)?.fullName ?? '';
  const now = Date.now();

  const openTasks = tasks.filter((t) => !t.completedAt).length;
  const showingsSoon = events.filter((e) => {
    const dt = new Date(e.startsAt).getTime() - now;
    return e.kind === 'SHOWING' && dt > 0 && dt < HOURS_3;
  }).length;

  const items = loading ? [] : suggest(leads, events, nameOf);

  return (
    <section className="surface mt-4 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-4">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-primary-soft text-primary">
          <Sparkles className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="t-h2">AI Briefing</h2>
          <p className="t-caption">
            {openTasks} {plural(openTasks, 'задача', 'задачи', 'задач')} на сегодня · {showingsSoon} {plural(showingsSoon, 'показ', 'показа', 'показов')} в ближайшие 3 ч
          </p>
        </div>
        <StatusBadge>Beta</StatusBadge>
      </div>

      {items.length === 0 ? (
        <p className="t-caption px-4 pb-4 pt-2.5">{loading ? 'Собираем сводку…' : 'Срочного нет: просроченных шагов и ближайших показов не найдено.'}</p>
      ) : (
        <ul className="mt-3">
          {items.map((s) => (
            <li key={s.id} className="border-t border-border/70">
              <Link href={s.href} className="pressable flex items-center gap-3 px-4 py-3">
                <span className={
                  s.tone === 'danger' ? 'text-danger-text' : s.tone === 'warning' ? 'text-warning-text' : 'text-muted-foreground'
                }><s.icon className="h-[18px] w-[18px]" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium">{s.text}</span>
                  <span className="t-caption block truncate">{s.hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 flex-none text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
