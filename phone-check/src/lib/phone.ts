import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';

export type NormalizedPhone =
  | { ok: true; e164: string; country: string | null; countryInferred: boolean }
  | { ok: false; reason: 'empty' | 'not_a_number' | 'invalid' | 'too_long'; cleaned: string };

const MAX_INPUT_LENGTH = 64;

/** Приводит строку из файла к виду, пригодному для разбора: убирает мусор, 00 → +. */
export function cleanPhoneInput(raw: unknown): string {
  let s = raw == null ? '' : String(raw);
  // Excel иногда отдаёт номер числом: 380671234567 или 3.80671234567E+11
  if (typeof raw === 'number' && Number.isFinite(raw)) s = BigInt(Math.round(raw)).toString();
  s = s.normalize('NFKC').trim();
  // Отбрасываем добавочный номер ("ext 12", "доб. 12", "#12")
  s = s.replace(/\s*(ext\.?|x|доб\.?|вн\.?|#)\s*\d+\s*$/i, '');
  // «+» до первой цифры ("tel: +38…") означает международный формат
  const hasPlus = /^[^\d]*\+/.test(s);
  let digits = s.replace(/\D+/g, '');
  if (!hasPlus && digits.startsWith('00')) return `+${digits.slice(2)}`;
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Нормализует номер в E.164. Номер без международного кода разбирается
 * в стране по умолчанию; такое совпадение помечается countryInferred.
 */
export function normalizePhone(raw: unknown, defaultRegion: string): NormalizedPhone {
  const text = raw == null ? '' : String(raw);
  if (text.length > MAX_INPUT_LENGTH) return { ok: false, reason: 'too_long', cleaned: text.slice(0, MAX_INPUT_LENGTH) };
  const cleaned = cleanPhoneInput(raw);
  if (!cleaned || cleaned === '+') return { ok: false, reason: text.trim() ? 'not_a_number' : 'empty', cleaned };
  if (cleaned.replace('+', '').length < 5) return { ok: false, reason: 'invalid', cleaned };

  const international = cleaned.startsWith('+');
  if (international) {
    const parsed = parsePhoneNumberFromString(cleaned);
    return parsed?.isValid()
      ? { ok: true, e164: parsed.number, country: parsed.country ?? null, countryInferred: false }
      : { ok: false, reason: 'invalid', cleaned };
  }

  const national = parsePhoneNumberFromString(cleaned, defaultRegion as CountryCode);
  // Номер вроде "380671234567": код страны есть, просто без "+"
  const asIntl = parsePhoneNumberFromString(`+${cleaned}`);
  const intlValid = asIntl?.isValid() ?? false;
  if (national?.isValid()) {
    const sameAsIntl = intlValid && asIntl!.number === national.number;
    return { ok: true, e164: national.number, country: national.country ?? null, countryInferred: !sameAsIntl };
  }
  if (intlValid) return { ok: true, e164: asIntl!.number, country: asIntl!.country ?? null, countryInferred: false };
  return { ok: false, reason: 'invalid', cleaned };
}

/** +380671234567 → +38067*****67 — для журнала аудита и логов. */
export function maskPhone(e164OrRaw: string): string {
  const s = e164OrRaw.trim();
  if (s.length <= 6) return '*'.repeat(s.length);
  const head = s.startsWith('+') ? 6 : 5;
  const keep = Math.min(head, s.length - 4);
  return s.slice(0, keep) + '*'.repeat(s.length - keep - 2) + s.slice(-2);
}
