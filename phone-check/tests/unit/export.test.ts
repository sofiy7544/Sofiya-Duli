import { describe, expect, it } from 'vitest';
import { safeCell } from '@/server/services/export';

describe('safeCell — защита от formula injection', () => {
  it.each([
    ['=HYPERLINK("http://evil")', `'=HYPERLINK("http://evil")`],
    ['+1+1', `'+1+1`],
    ['-2', `'-2`],
    ['@SUM(A1)', `'@SUM(A1)`],
    ['Олена', 'Олена'],
    ['', ''],
  ])('%s', (input, expected) => {
    expect(safeCell(input)).toBe(expected);
  });
});
