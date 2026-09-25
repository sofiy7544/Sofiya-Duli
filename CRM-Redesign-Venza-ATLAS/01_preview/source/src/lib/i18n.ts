import { getIntlLocale, getLocale, useLocale } from './locale';
import { uk } from './i18n/uk';
import { en } from './i18n/en';
import { fr } from './i18n/fr';
import { it } from './i18n/it';

/**
 * Перевод интерфейса.
 *
 * Функция называется tr, а не t: в экранах `t` уже занято под задачу (Task)
 * и шаблон — импорт с тем же именем молча перекрывался бы локальной переменной.
 *
 * Ключ — сама русская строка, как msgid в gettext. Так перевод невозможно
 * «потерять»: если строки нет в словаре, человек видит русский текст, а не
 * `leads.empty.title`. Для переноса в CRM словари ложатся в messages/<код>.json
 * next-intl один в один, ключами станут те же строки.
 *
 * Переводится интерфейс. Демо-данные (имена клиентов, тексты заметок, адреса)
 * остаются как есть: в работающей CRM они приходят из базы и не переводятся.
 */
const DICT: Record<string, Record<string, string>> = { uk, en, fr, it };

export function tr(ru: string, vars?: Record<string, string | number>): string {
  const code = getLocale();
  const out = code === 'ru' ? ru : DICT[code]?.[ru] ?? ru;
  return vars ? out.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : out;
}

/** Хук для компонентов: подписывает на смену языка и возвращает тот же t. */
export function useT() { useLocale(); return tr; }

/**
 * Склонение по числу. В русском и украинском три формы, в английском,
 * французском и итальянском — две; Intl.PluralRules решает это за нас.
 * В словарях формы лежат одной строкой через «|».
 */
export function plural(n: number, one: string, few: string, many: string): string {
  const forms = tr(`${one}|${few}|${many}`).split('|');
  const rule = new Intl.PluralRules(getIntlLocale()).select(n);
  if (forms.length < 3) return rule === 'one' ? forms[0] : forms[forms.length - 1];
  const map: Record<string, number> = { one: 0, few: 1, many: 2, two: 1, other: 2, zero: 2 };
  return forms[map[rule] ?? 2] ?? forms[2];
}

/**
 * Подписи-справочники (этапы, типы, статусы) переводятся в момент обращения:
 * экраны обращаются к ним как к обычному объекту, а язык может смениться
 * в любую секунду. Прокси ничего не меняет в местах использования.
 */
export function translated<T extends Record<string, string>>(src: T): T {
  return new Proxy(src, { get: (o, k) => (typeof k === 'string' && k in o ? tr(o[k]) : (o as Record<string | symbol, unknown>)[k]) }) as T;
}
