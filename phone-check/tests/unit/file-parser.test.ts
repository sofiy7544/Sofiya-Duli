import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { decodeText, detectFileType, detectPhoneColumn, extractPhones, readRows, sniffDelimiter } from '@/server/services/file-parser';

async function collect(buf: Buffer, type: 'csv' | 'xlsx', maxRows = 1000) {
  let column: unknown;
  const out = [];
  for await (const cell of extractPhones(readRows(buf, type), { maxRows, onColumn: (c) => (column = c) })) out.push(cell);
  return { cells: out, column };
}

describe('detectFileType', () => {
  it('проверяет сигнатуру, а не только расширение', () => {
    expect(detectFileType('a.csv', Buffer.from('phone\n1'))).toBe('csv');
    expect(detectFileType('a.xlsx', Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe('xlsx');
    expect(() => detectFileType('a.xlsx', Buffer.from('phone'))).toThrow();
    expect(() => detectFileType('a.csv', Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toThrow();
    expect(() => detectFileType('a.exe', Buffer.from('MZ'))).toThrow();
    expect(() => detectFileType('a.csv', Buffer.from([0x41, 0x00, 0x42]))).toThrow();
  });
});

describe('CSV', () => {
  it('определяет разделитель', () => {
    expect(sniffDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(sniffDelimiter('a,b\n1,2')).toBe(',');
    expect(sniffDelimiter('a\tb\n1\t2')).toBe('\t');
  });

  it('декодирует cp1251 и BOM', () => {
    const cp1251 = Buffer.from([0xd2, 0xe5, 0xeb, 0xe5, 0xf4, 0xee, 0xed]); // «Телефон»
    expect(decodeText(cp1251)).toBe('Телефон');
    expect(decodeText(Buffer.from('﻿Телефон'))).toBe('Телефон');
  });

  it('находит колонку по заголовку и сохраняет номера строк', async () => {
    const csv = 'Имя;Телефон;Сумма\nОлена;+380671234567;100\n;;\nІгор;0501234567;200\n';
    const { cells, column } = await collect(Buffer.from(csv), 'csv');
    expect(column).toMatchObject({ index: 1, header: 'Телефон', hasHeader: true });
    expect(cells).toEqual([
      { rowNumber: 2, value: '+380671234567' },
      { rowNumber: 4, value: '0501234567' },
    ]);
  });

  it('файл без заголовка: колонка по содержимому, первая строка — данные', async () => {
    const csv = '100,+380671234567\n200,+380501234567\n';
    const { cells, column } = await collect(Buffer.from(csv), 'csv');
    expect(column).toMatchObject({ index: 1, hasHeader: false });
    expect(cells.map((c) => c.value)).toEqual(['+380671234567', '+380501234567']);
  });

  it('ограничивает число строк', async () => {
    const csv = ['phone', ...Array.from({ length: 30 }, (_, i) => `+38067123${String(i).padStart(4, '0')}`)].join('\n');
    await expect(collect(Buffer.from(csv), 'csv', 10)).rejects.toThrow(/больше 10/);
  });
});

describe('XLSX', () => {
  it('читает первый лист, числовые ячейки и заголовок', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('S');
    ws.addRow(['Дата', 'Mobile phone']);
    ws.addRow(['2026-09-30', 380671234567]);
    ws.addRow([]);
    ws.addRow(['2026-09-30', '+48 512 345 678']);
    wb.addWorksheet('Other').addRow(['+380999999999']);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const { cells, column } = await collect(buf, 'xlsx');
    expect(column).toMatchObject({ index: 1, header: 'Mobile phone' });
    expect(cells).toEqual([
      { rowNumber: 2, value: '380671234567' },
      { rowNumber: 4, value: '+48 512 345 678' },
    ]);
  });
});

describe('detectPhoneColumn', () => {
  it('если номеров нет — колонка не выбирается', async () => {
    expect(detectPhoneColumn([['Имя'], ['Олена']]).index).toBe(-1);
    await expect(collect(Buffer.from('Имя\nОлена\n'), 'csv')).rejects.toThrow(/колонку с номерами/);
  });

  it('без подходящего заголовка выбирает колонку с номерами', () => {
    expect(detectPhoneColumn([['id', 'contact'], ['1', '+380671234567'], ['2', '0501234567']])).toMatchObject({ index: 1, hasHeader: true, header: 'contact' });
  });
});
