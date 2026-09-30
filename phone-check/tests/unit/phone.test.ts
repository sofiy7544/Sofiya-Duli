import { describe, expect, it } from 'vitest';
import { cleanPhoneInput, maskPhone, normalizePhone } from '@/lib/phone';

describe('normalizePhone', () => {
  it.each([
    ['+380 67 123 45 67', '+380671234567', 'UA', false],
    ['+38 (067) 123-45-67', '+380671234567', 'UA', false],
    ['380671234567', '+380671234567', 'UA', false],
    ['00380671234567', '+380671234567', 'UA', false],
    ['+48 512 345 678', '+48512345678', 'PL', false],
    ['+373 79 123 456', '+37379123456', 'MD', false],
    ['+49 1512 3456789', '+4915123456789', 'DE', false],
  ])('%s → %s', (input, e164, country, inferred) => {
    expect(normalizePhone(input, 'UA')).toEqual({ ok: true, e164, country, countryInferred: inferred });
  });

  it('подставляет страну по умолчанию для национального формата и помечает это', () => {
    expect(normalizePhone('067 123 45 67', 'UA')).toEqual({ ok: true, e164: '+380671234567', country: 'UA', countryInferred: true });
    expect(normalizePhone('(067) 123-45-67', 'UA')).toMatchObject({ ok: true, e164: '+380671234567' });
    expect(normalizePhone('512 345 678', 'PL')).toMatchObject({ ok: true, e164: '+48512345678', country: 'PL' });
  });

  it('понимает число из Excel', () => {
    expect(normalizePhone(380671234567, 'UA')).toMatchObject({ ok: true, e164: '+380671234567' });
  });

  it('отбрасывает добавочный номер', () => {
    expect(normalizePhone('+380 67 123 45 67 доб. 12', 'UA')).toMatchObject({ ok: true, e164: '+380671234567' });
  });

  it.each(['', '   ', 'abc', '12345', '+380 00 000 00 00', '+999123456789', '067-12', 'x'.repeat(100)])('отклоняет «%s»', (input) => {
    expect(normalizePhone(input, 'UA').ok).toBe(false);
  });

  it('разные записи одного номера дают один E.164 (основа дедупликации)', () => {
    const variants = ['+380671234567', '380671234567', '0671234567', '(067) 123-45-67', '00 380 67 123 45 67'];
    const set = new Set(variants.map((v) => {
      const n = normalizePhone(v, 'UA');
      return n.ok ? n.e164 : null;
    }));
    expect([...set]).toEqual(['+380671234567']);
  });
});

describe('cleanPhoneInput / maskPhone', () => {
  it('чистит мусор', () => {
    expect(cleanPhoneInput(' tel: +38 (067) 123-45-67 ')).toBe('+380671234567');
    expect(cleanPhoneInput('0038067')).toBe('+38067');
  });
  it('маскирует середину номера', () => {
    expect(maskPhone('+380671234567')).toBe('+38067*****67');
    expect(maskPhone('12345')).toBe('*****');
    expect(maskPhone('+380671234567')).not.toContain('12345');
  });
});
