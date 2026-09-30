import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { demoCheckPhones, demoCustomers } from './demo-data';

/**
 * Файлы для проверки, согласованные с `npm run db:seed`:
 *   npm run sample:generate                 → samples/phones-demo.csv, samples/phones-demo.xlsx (500 строк)
 *   npm run sample:generate -- 100000       → samples/phones-100000.csv (нагрузочный)
 */
async function main() {
  const rows = Number(process.argv[2] ?? 500);
  const dir = path.resolve(process.cwd(), 'samples');
  await mkdir(dir, { recursive: true });
  const phones = demoCheckPhones(demoCustomers(), rows);
  const csvName = rows === 500 ? 'phones-demo.csv' : `phones-${rows}.csv`;
  const csv = ['Телефон;Коментар', ...phones.map((p, i) => `${p};Замовлення №${10000 + i}`)].join('\n');
  await writeFile(path.join(dir, csvName), `﻿${csv}\n`);
  console.log(`[samples] ${csvName}: ${phones.length} rows`);
  if (rows === 500) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Клієнти за день');
    ws.addRow(['Дата', 'Сума', 'Mobile phone']);
    phones.slice(0, 300).forEach((p, i) => ws.addRow(['2026-09-30', 250 + i, p]));
    await wb.xlsx.writeFile(path.join(dir, 'phones-demo.xlsx'));
    console.log('[samples] phones-demo.xlsx: 300 rows');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
