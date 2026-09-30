import type { Writable } from 'node:stream';
import ExcelJS from 'exceljs';
import type { Queryable } from '../db';
import { iterateResults, type ResultsQuery } from './batches';
import { STATUS_LABEL, type ChannelValue } from '@/lib/types';

export const EXPORT_COLUMNS = ['Phone', 'Full Name', 'Customer ID', 'Facebook', 'Telegram', 'Status'] as const;

/** Защита от formula injection: строка, начинающаяся с = + - @, не должна стать формулой в Excel/LibreOffice. */
export function safeCell(value: string | null | undefined): string {
  if (!value) return '';
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

const channelText = (c: ChannelValue | null) => (c ? safeCell(c.url ?? c.value) : '');

/** Потоковая запись XLSX: память не зависит от числа строк. Возвращает число строк. */
export async function writeResultsXlsx(
  q: Queryable,
  batchId: string,
  out: Writable,
  filter: Pick<ResultsQuery, 'status' | 'q'> = {},
): Promise<number> {
  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: out, useStyles: true, useSharedStrings: false });
  wb.creator = 'Phone Check';
  wb.created = new Date();
  const ws = wb.addWorksheet('Results', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: EXPORT_COLUMNS[0], key: 'phone', width: 18 },
    { header: EXPORT_COLUMNS[1], key: 'name', width: 32 },
    { header: EXPORT_COLUMNS[2], key: 'ref', width: 16 },
    { header: EXPORT_COLUMNS[3], key: 'facebook', width: 36 },
    { header: EXPORT_COLUMNS[4], key: 'telegram', width: 28 },
    { header: EXPORT_COLUMNS[5], key: 'status', width: 22 },
  ];
  ws.getRow(1).font = { bold: true };
  let count = 0;
  for await (const r of iterateResults(q, batchId, filter)) {
    ws.addRow({
      // E.164 начинается с "+", но значение записывается как строка (тип s) и не вычисляется
      phone: r.phone ?? safeCell(r.rawInput),
      name: safeCell(r.fullName),
      ref: safeCell(r.customerRef),
      facebook: channelText(r.facebook),
      telegram: channelText(r.telegram),
      status: STATUS_LABEL[r.status],
    }).commit();
    count++;
  }
  ws.commit();
  await wb.commit();
  return count;
}

