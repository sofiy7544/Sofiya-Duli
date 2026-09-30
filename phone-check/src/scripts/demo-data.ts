/**
 * Детерминированные демо-данные: вымышленные клиенты магазина.
 * Одинаковый seed → одинаковые клиенты, поэтому файлы из samples/ совпадают с базой после `npm run db:seed`.
 */
import type { CrmCustomerInput } from '@/server/services/customers';
import type { Channel } from '@/lib/types';

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_F = ['Олена', 'Ірина', 'Наталія', 'Оксана', 'Юлія', 'Марія', 'Тетяна', 'Катерина', 'Анна', 'Світлана'];
const FIRST_M = ['Андрій', 'Максим', 'Дмитро', 'Сергій', 'Віктор', 'Олександр', 'Ігор', 'Роман', 'Павло', 'Богдан'];
const LAST = ['Коваленко', 'Шевченко', 'Бондаренко', 'Ткаченко', 'Кравченко', 'Олійник', 'Мельник', 'Поліщук', 'Лисенко', 'Гребенюк', 'Савченко', 'Руденко', 'Марченко', 'Мороз', 'Павленко', 'Кузьменко', 'Левченко', 'Гончар', 'Семенюк', 'Зінченко'];
const PATRON_F = ['Олександрівна', 'Іванівна', 'Миколаївна', 'Василівна'];
const PATRON_M = ['Сергійович', 'Петрович', 'Андрійович', 'Юрійович'];
const SOURCES = ['POS — каса магазину', 'Сайт — оформлення замовлення', 'Програма лояльності', 'Доставка — форма замовлення', 'Менеджер — дзвінок клієнта'];
const UA_OPERATORS = ['50', '63', '66', '67', '68', '73', '93', '95', '96', '97', '98', '99'];

export const DEMO_CUSTOMER_COUNT = 2000;
export const DEMO_SEED = 20260930;

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)]!;
}

function uaPhone(r: () => number) {
  return `+380${pick(r, UA_OPERATORS)}${String(Math.floor(r() * 1e7)).padStart(7, '0')}`;
}
function plPhone(r: () => number) {
  return `+48${pick(r, ['50', '51', '53', '60', '66', '69', '72', '78', '79', '88'])}${String(Math.floor(r() * 1e7)).padStart(7, '0')}`;
}
function mdPhone(r: () => number) {
  return `+373${pick(r, ['60', '68', '69', '78', '79'])}${String(Math.floor(r() * 1e6)).padStart(6, '0')}`;
}

function dateBetween(r: () => number, fromYear: number, toYear: number) {
  const from = Date.UTC(fromYear, 0, 1);
  const to = Date.UTC(toYear, 8, 1);
  return new Date(from + r() * (to - from)).toISOString();
}

export function demoCustomers(count = DEMO_CUSTOMER_COUNT, seed = DEMO_SEED): CrmCustomerInput[] {
  const r = rng(seed);
  const out: CrmCustomerInput[] = [];
  for (let i = 1; i <= count; i++) {
    const female = r() < 0.55;
    const first = pick(r, female ? FIRST_F : FIRST_M);
    const last = pick(r, LAST);
    const fullName = `${last} ${first}${r() < 0.4 ? ` ${pick(r, female ? PATRON_F : PATRON_M)}` : ''}`;
    const source = pick(r, SOURCES);
    const roll = r();
    const primary = roll < 0.85 ? uaPhone(r) : roll < 0.95 ? plPhone(r) : mdPhone(r);
    const consentRoll = r();
    const consentStatus = consentRoll < 0.7 ? 'granted' : consentRoll < 0.8 ? 'withdrawn' : 'unknown';
    const consentAt = consentStatus === 'unknown' ? null : dateBetween(r, 2022, 2026);

    const phones: CrmCustomerInput['phones'] = [
      { phone: primary, isVerified: r() < 0.85, isActive: r() < 0.95, source, collectedAt: dateBetween(r, 2021, 2026), label: 'Основний' },
    ];
    if (r() < 0.15) phones.push({ phone: uaPhone(r), isVerified: r() < 0.5, isActive: true, source: 'Програма лояльності', label: 'Додатковий' });

    const channels: NonNullable<CrmCustomerInput['channels']> = [];
    const latinHandle = `client${i}_${Math.floor(r() * 1000)}`;
    const chConsent = () => (r() < 0.9 ? 'granted' : 'withdrawn') as 'granted' | 'withdrawn';
    const add = (channel: Channel, value: string, src: string) =>
      channels.push({ channel, value, source: src, consentStatus: chConsent(), consentAt: dateBetween(r, 2022, 2026) });
    if (r() < 0.35) add('facebook', `https://www.facebook.com/${latinHandle}`, 'Клієнт указав у анкеті лояльності');
    else if (r() < 0.1) add('messenger', `https://m.me/${latinHandle}`, 'Клієнт написав у Messenger сторінки магазину');
    if (r() < 0.45) add('telegram', `@${pick(r, ['shop_', 'tg_', 'my_', ''])}${latinHandle}`, 'Клієнт написав у Telegram-бот магазину');
    if (r() < 0.3) add('viber', primary, 'Клієнт підписався на Viber-розсилку');
    if (r() < 0.4) add('whatsapp', primary, 'Клієнт написав у WhatsApp магазину');

    out.push({
      customerRef: `CUS-${String(i).padStart(6, '0')}`,
      fullName,
      email: r() < 0.6 ? `${latinHandle}@example.com` : null,
      status: r() < 0.02 ? 'merged' : 'active',
      source,
      consentStatus,
      consentAt,
      consentSource: consentStatus === 'unknown' ? null : pick(r, ['Анкета лояльності', 'Чекбокс на сайті', 'Усна згода, зафіксована менеджером']),
      phones,
      channels,
    });
  }
  // Спільний номер (сімʼя на одному телефоні) → Multiple matches
  for (let k = 0; k < 15; k++) {
    const a = out[k * 7]!;
    const b = out[k * 7 + 1000]!;
    b.phones.push({ phone: a.phones[0]!.phone, isVerified: true, isActive: true, source: 'Менеджер — дзвінок клієнта', label: 'Сімейний' });
    if (a.status !== 'active') a.status = 'active';
    if (b.status !== 'active') b.status = 'active';
    a.phones[0]!.isActive = true;
  }
  return out;
}

/** Номера для проверки: известные клиенты в разных форматах, дубликаты, чужие и невалидные номера. */
export function demoCheckPhones(customers: CrmCustomerInput[], rows: number, seed = DEMO_SEED + 1): string[] {
  const r = rng(seed);
  const out: string[] = [];
  const formats = [
    (e: string) => e,
    (e: string) => e.slice(1),
    (e: string) => (e.startsWith('+380') ? `0${e.slice(4, 6)} ${e.slice(6, 9)}-${e.slice(9, 11)}-${e.slice(11)}` : e),
    (e: string) => (e.startsWith('+380') ? `(0${e.slice(4, 6)}) ${e.slice(6, 9)} ${e.slice(9)}` : `00${e.slice(1)}`),
    (e: string) => `${e.slice(0, 4)} ${e.slice(4, 6)} ${e.slice(6, 9)} ${e.slice(9)}`,
  ];
  const invalid = ['12345', 'нет номера', '+380 00 000 00 00', '067-12', 'abc', '+1 555 0100', '+999123456789'];
  while (out.length < rows) {
    const roll = r();
    if (roll < 0.62) {
      const c = customers[Math.floor(r() * customers.length)]!;
      const p = c.phones[Math.floor(r() * c.phones.length)]!.phone;
      out.push(pick(r, formats)(p));
    } else if (roll < 0.9) {
      out.push(uaPhone(r)); // номер не из CRM
    } else if (roll < 0.95 && out.length) {
      out.push(out[Math.floor(r() * out.length)]!); // дубликат
    } else {
      out.push(pick(r, invalid));
    }
  }
  return out;
}
