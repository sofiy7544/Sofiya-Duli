import * as React from 'react';
import { Field, Input, Select } from '@/components/ui/field';
import { tr } from '@/lib/i18n';

export type PickerOption = { value: string; label: string; meta?: string };

/**
 * Выбор из длинного справочника.
 *
 * Обычный `<select>` со всем списком перестаёт работать на объёме: в агентстве
 * за год в поле «Клиент» оказалось 4 644 варианта — их и браузер рисует долго,
 * и человек не пролистает. Поэтому над списком появляется поиск, а в самом
 * списке остаются первые 50 совпадений.
 *
 * Поле остаётся системным `<select>`: на телефоне это привычный барабан,
 * он знает про VoiceOver и не требует своей клавиатурной логики. Поиск
 * показывается только когда вариантов действительно много, — на тринадцати
 * объектах лишнее поле только мешало бы.
 */
const LIMIT = 50;
const THRESHOLD = 30;

export function PickerField({ label, hint, required, error, value, onChange, options, emptyLabel, searchPlaceholder = tr('Найти по имени или номеру') }: {
  label: string; hint?: string; required?: boolean; error?: string;
  value: string; onChange: (value: string) => void;
  options: PickerOption[];
  /** Подпись пустого варианта; без неё выбор обязателен. */
  emptyLabel?: string;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = React.useState('');
  const big = options.length > THRESHOLD;

  const list = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    const matched = !big ? options
      : !t ? options.slice(0, LIMIT)
      : options.filter((o) => o.label.toLowerCase().includes(t) || (o.meta ?? '').toLowerCase().includes(t)).slice(0, LIMIT);
    // Выбранный вариант обязан быть в списке, иначе поле покажется пустым.
    if (!value || matched.some((o) => o.value === value)) return matched;
    const chosen = options.find((o) => o.value === value);
    return chosen ? [chosen, ...matched] : matched;
  }, [options, q, big, value]);

  return (
    <Field label={label} hint={hint} required={required} error={error}>
      {(id, d) => (
        <div className="space-y-2">
          {big && (
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder}
              aria-label={`Поиск: ${label.toLowerCase()}`} autoComplete="off" />
          )}
          <Select id={id} aria-describedby={d} value={value} onChange={(e) => onChange(e.target.value)}>
            {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
            {list.map((o) => <option key={o.value} value={o.value}>{o.meta ? `${o.label}, ${o.meta}` : o.label}</option>)}
          </Select>
          {big && options.length > list.length && (
            <p className="t-caption tabular">{tr('Показаны первые')}{list.length} из {options.length} — уточните поиск</p>
          )}
          {big && q.trim() && list.length === 0 && <p className="t-caption">{tr('Никого не нашли по запросу «')}{q.trim()}»</p>}
        </div>
      )}
    </Field>
  );
}
