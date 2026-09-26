/**
 * Срок задачи и время перезвона.
 *
 * Два способа рядом, а не вместо друг друга:
 *  — фишки-пресеты закрывают обычные случаи в один тап;
 *  — точное время — полем `datetime-local`. На iPhone оно открывает
 *    системный барабан (как в будильнике), на Android — системные часы,
 *    на десктопе — обычный ввод. Свой «красивый» выбор времени всегда
 *    хуже системного: он не знает про 12/24 часа, локаль и VoiceOver.
 *
 * Пресеты, которые уже прошли, не показываем: «Сегодня, 18:00» в 22:30
 * создавало задачу просроченной в момент создания.
 */
import { tr } from '@/lib/i18n';
export type DuePreset = { k: string; label: string; at: string };

const at = (days: number, h: number, now: Date) => {
  const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d;
};

export function duePresets(now = new Date()): DuePreset[] {
  const hourAhead = new Date(now.getTime() + 3_600_000); hourAhead.setMinutes(0, 0, 0);
  const list: DuePreset[] = [
    { k: '1h', label: tr('Через час'), at: hourAhead },
    { k: 'today18', label: tr('Сегодня, 18:00'), at: at(0, 18, now) },
    { k: 'tmr10', label: tr('Завтра, 10:00'), at: at(1, 10, now) },
    { k: 'tmr18', label: tr('Завтра, 18:00'), at: at(1, 18, now) },
    { k: '3d', label: tr('Через 3 дня'), at: at(3, 10, now) },
    { k: 'week', label: tr('Через неделю'), at: at(7, 10, now) },
  ].filter((p) => p.at.getTime() > now.getTime())
    .map((p) => ({ k: p.k, label: p.label, at: p.at.toISOString() }));
  return list;
}

/** Срок по умолчанию: ближайший вечер, а если он прошёл — утро следующего дня. */
export function defaultDue(list: DuePreset[]): string {
  return (list.find((p) => p.k === 'today18') ?? list.find((p) => p.k === 'tmr10') ?? list[0]).at;
}

/** ISO → значение для input[type=datetime-local] (оно всегда в местном времени). */
export const toLocalInput = (iso: string) => {
  const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
