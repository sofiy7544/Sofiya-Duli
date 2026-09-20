/**
 * Период для отчётов. Фильтр стоит одной строкой над графиками и меняет
 * все блоки сразу — иначе цифры в соседних карточках перестают сходиться.
 *
 * Отсчёт ведём от даты создания лида: вопрос отчёта — «что принёс этот
 * месяц», а не «что закрылось в этом месяце». Для сделок период считается
 * по дате закрытия, потому что выручка относится к моменту закрытия.
 */
export const PERIODS = ['7d', '30d', 'quarter', 'year', 'all'] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  '7d': '7 дней',
  '30d': '30 дней',
  quarter: 'Квартал',
  year: 'Год',
  all: 'Всё время',
};

/** Подпись под заголовком: человеку нужен не код периода, а границы. */
export const PERIOD_HINT: Record<Period, string> = {
  '7d': 'последние 7 дней',
  '30d': 'последние 30 дней',
  quarter: 'последние 3 месяца',
  year: 'последние 12 месяцев',
  all: 'за всё время',
};

const DAY = 86_400_000;
const SPAN: Record<Exclude<Period, 'all'>, number> = {
  '7d': 7 * DAY, '30d': 30 * DAY, quarter: 91 * DAY, year: 365 * DAY,
};

export const PERIOD_STORAGE_KEY = 'crm-preview-period';
export const DEFAULT_PERIOD: Period = '30d';

export function normalizePeriod(value: unknown): Period {
  return typeof value === 'string' && (PERIODS as readonly string[]).includes(value) ? (value as Period) : DEFAULT_PERIOD;
}

/** Начало периода в миллисекундах; для «всё время» — ноль. */
export function periodStart(p: Period, now = Date.now()): number {
  return p === 'all' ? 0 : now - SPAN[p];
}

export function inPeriod(iso: string | undefined, p: Period, now = Date.now()): boolean {
  if (p === 'all') return true;
  if (!iso) return false;
  return new Date(iso).getTime() >= periodStart(p, now);
}
