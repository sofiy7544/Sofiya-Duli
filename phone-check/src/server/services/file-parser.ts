import { Readable } from 'node:stream';
import { parse } from 'csv-parse';
import ExcelJS from 'exceljs';
import { badRequest } from '../errors';

export type FileType = 'csv' | 'xlsx';

const PHONE_HEADER = /(phone|mobile|msisdn|tel|whats\s*app|viber|телефон|тел\b|тел\.|номер|моб|мобільний|мобильный)/i;
const MAX_CELL_LENGTH = 256;
const SNIFF_ROWS = 25;

/** Определяет тип по расширению и сигнатуре, чтобы не доверять одному имени файла. */
export function detectFileType(fileName: string, head: Buffer): FileType {
  const ext = fileName.toLowerCase().split('.').pop();
  const isZip = head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
  if (ext === 'xlsx') {
    if (!isZip) throw badRequest('Файл XLSX повреждён или имеет другой формат');
    return 'xlsx';
  }
  if (ext === 'csv' || ext === 'txt') {
    if (isZip || head.subarray(0, 4096).includes(0)) throw badRequest('Файл CSV содержит двоичные данные');
    return 'csv';
  }
  throw badRequest('Поддерживаются только файлы .csv и .xlsx');
}

export function decodeText(buf: Buffer): string {
  let data = buf;
  if (data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) data = data.subarray(3);
  if (data[0] === 0xff && data[1] === 0xfe) return new TextDecoder('utf-16le').decode(data.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    // Excel в русской/украинской локали сохраняет CSV в cp1251
    return new TextDecoder('windows-1251').decode(data);
  }
}

export function sniffDelimiter(text: string): string {
  const firstLines = text.split(/\r?\n/, 5).filter(Boolean);
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestScore = 0;
  for (const d of candidates) {
    const counts = firstLines.map((l) => l.split(d).length - 1);
    const min = Math.min(...counts);
    const score = min > 0 && counts.every((c) => c === counts[0]) ? min + 100 : min;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

function cellToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isInteger(value) ? BigInt(value).toString() : String(value);
  if (typeof value === 'string') return value;
  if (value instanceof Date) return '';
  if (typeof value === 'object') {
    const v = value as { text?: unknown; result?: unknown; richText?: { text: string }[] };
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('');
    if (v.result !== undefined) return cellToString(v.result);
    if (v.text !== undefined) return cellToString(v.text);
  }
  return String(value);
}

async function* csvRows(buf: Buffer): AsyncGenerator<string[]> {
  const text = decodeText(buf);
  const parser = Readable.from([text]).pipe(
    parse({
      delimiter: sniffDelimiter(text),
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: false,
      bom: true,
      max_record_size: 64 * 1024,
    }),
  );
  for await (const record of parser) yield (record as string[]).map((c) => c.slice(0, MAX_CELL_LENGTH));
}

async function* xlsxRows(buf: Buffer): AsyncGenerator<string[]> {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(Readable.from([buf]), {
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'ignore',
    worksheets: 'emit',
    entries: 'emit',
  });
  for await (const worksheet of reader) {
    let expected = 1;
    for await (const row of worksheet as AsyncIterable<ExcelJS.Row>) {
      // Пустые строки в XLSX пропускаются ридером — восстанавливаем нумерацию
      while (expected < row.number) {
        yield [];
        expected++;
      }
      const values = (row.values as unknown[]).slice(1);
      yield values.map((v) => cellToString(v).slice(0, MAX_CELL_LENGTH));
      expected++;
    }
    return; // только первый лист
  }
}

export function readRows(buf: Buffer, type: FileType): AsyncGenerator<string[]> {
  return type === 'csv' ? csvRows(buf) : xlsxRows(buf);
}

function phoneLikeScore(cell: string | undefined): number {
  if (!cell) return 0;
  const digits = cell.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15 && digits / cell.replace(/\s/g, '').length > 0.6 ? 1 : 0;
}

export interface ColumnChoice {
  /** -1 — колонка с номерами не найдена */
  index: number;
  header: string | null;
  hasHeader: boolean;
}

/** Выбирает колонку с телефонами: по заголовку, иначе по доле значений, похожих на номер. */
export function detectPhoneColumn(sample: string[][]): ColumnChoice {
  const first = sample.find((r) => r.some((c) => c.trim())) ?? [];
  const byName = first.findIndex((c) => PHONE_HEADER.test(c));
  if (byName >= 0) return { index: byName, header: first[byName]!.trim(), hasHeader: true };

  const width = Math.max(0, ...sample.map((r) => r.length));
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < width; i++) {
    const score = sample.reduce((s, r) => s + phoneLikeScore(r[i]), 0);
    if (score > bestScore) {
      bestIdx = i;
      bestScore = score;
    }
  }
  if (bestScore <= 0) return { index: -1, header: null, hasHeader: false };
  const hasHeader = phoneLikeScore(first[bestIdx]) === 0 && !!first[bestIdx]?.trim() && !/\d{5,}/.test(first[bestIdx]!);
  return { index: bestIdx, header: hasHeader ? first[bestIdx]!.trim() : null, hasHeader };
}

export interface PhoneCell {
  rowNumber: number;
  value: string;
}

/**
 * Потоково извлекает значения колонки телефона. Пустые строки пропускаются.
 * onColumn вызывается один раз, когда колонка определена.
 */
export async function* extractPhones(
  rows: AsyncIterable<string[]>,
  opts: { maxRows: number; onColumn?: (c: ColumnChoice) => void },
): AsyncGenerator<PhoneCell> {
  const buffered: string[][] = [];
  let column: ColumnChoice | undefined;
  let rowNumber = 0;
  let dataRows = 0;
  let headerRow = 0;

  function* drain(list: string[][], startRow: number) {
    if (column!.index < 0) throw badRequest('Не удалось найти колонку с номерами телефонов. Добавьте заголовок «Телефон».');
    let n = startRow;
    for (const r of list) {
      n++;
      if (column!.hasHeader && n === headerRow) continue;
      const value = (r[column!.index] ?? '').trim();
      if (!value) continue;
      if (++dataRows > opts.maxRows) throw badRequest(`В файле больше ${opts.maxRows} строк с номерами`);
      yield { rowNumber: n, value };
    }
  }
  for await (const row of rows) {
    if (!column) {
      buffered.push(row);
      if (buffered.length < SNIFF_ROWS) continue;
      column = detectPhoneColumn(buffered);
      headerRow = buffered.findIndex((r) => r.some((c) => c.trim())) + 1;
      opts.onColumn?.(column);
      yield* drain(buffered, 0);
      rowNumber = buffered.length;
      continue;
    }
    yield* drain([row], rowNumber);
    rowNumber++;
  }
  if (!column) {
    column = detectPhoneColumn(buffered);
    headerRow = buffered.findIndex((r) => r.some((c) => c.trim())) + 1;
    opts.onColumn?.(column);
    yield* drain(buffered, 0);
  }
}
