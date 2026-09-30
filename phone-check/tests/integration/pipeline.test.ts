import ExcelJS from 'exceljs';
import { PassThrough } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closePool, pool } from '@/server/db';
import { createBatch, getBatch, getResults, processBatch } from '@/server/services/batches';
import { getResultDetail, reviewResult } from '@/server/services/review';
import { writeResultsXlsx, EXPORT_COLUMNS } from '@/server/services/export';
import { listAudit, listAuditItems } from '@/server/services/audit';
import { updateCustomer } from '@/server/services/customers';
import { runCleanup } from '@/server/services/cleanup';
import { blindIndex } from '@/server/crypto';
import type { SessionUser } from '@/lib/types';
import { CHECK_CSV, createTestUser, customerIdByRef, seedCrm } from './helpers';

let manager: SessionUser;
let batchId: string;
const ctx = () => ({ actor: manager, ip: '10.0.0.1', userAgent: 'vitest' });

beforeAll(async () => {
  await seedCrm();
  manager = await createTestUser('manager');
  ({ id: batchId } = await createBatch({ fileName: 'day.csv', data: Buffer.from(CHECK_CSV) }, ctx()));
  await processBatch(batchId);
});

afterAll(async () => {
  await closePool();
});

describe('обработка файла', () => {
  it('нормализует, удаляет дубликаты и сопоставляет с CRM', async () => {
    const batch = await getBatch(pool(), batchId);
    expect(batch.status).toBe('completed');
    expect(batch.totalRows).toBe(9);
    expect(batch.uniquePhones).toBe(8);
    expect(batch.duplicateRows).toBe(1);
    expect(batch.phoneColumn).toBe('Телефон');
    expect(batch.counts).toEqual({ exact_match: 2, multiple_matches: 1, needs_review: 2, not_found: 2, invalid_phone: 1 });

    const { rows, total } = await getResults(pool(), batchId, { offset: 0, limit: 50 });
    expect(total).toBe(8);
    const byPhone = Object.fromEntries(rows.map((r) => [r.phone ?? r.rawInput, r]));

    const olena = byPhone['+380671111111']!;
    expect(olena).toMatchObject({ status: 'exact_match', confidence: 100, customerRef: 'T-001', fullName: 'Коваленко Олена', country: 'UA', occurrences: 2, rowNumber: 2 });
    expect(olena.facebook?.url).toBe('https://www.facebook.com/olena.k');
    expect(olena.telegram?.value).toBe('@olena_k');
    expect(olena.whatsapp).toBeNull(); // согласие отозвано — канал не показывается
    expect(olena).toMatchObject({ source: 'POS', consentStatus: 'granted', consentAt: '2025-03-14T10:00:00.000Z' });

    expect(byPhone['+380672222222']).toMatchObject({ status: 'needs_review', confidence: 75, customerRef: 'T-002' });
    expect(byPhone['+380673333333']).toMatchObject({ status: 'multiple_matches', confidence: 50, customerRef: null, candidateCount: 2 });
    expect(byPhone['+380675555555']).toMatchObject({ status: 'needs_review', confidence: 60 });
    expect(byPhone['+380676666666']).toMatchObject({ status: 'not_found', fullName: null });
    expect(byPhone['+380679999999']).toMatchObject({ status: 'not_found' });
    expect(byPhone['12345']).toMatchObject({ status: 'invalid_phone', confidence: null, phone: null });
    expect(byPhone['+48512345678']).toMatchObject({ status: 'exact_match', country: 'PL', customerRef: 'T-007' });
  });

  it('удаляет загруженный файл сразу после обработки', async () => {
    const { rowCount } = await pool().query(`SELECT 1 FROM upload_blobs WHERE batch_id = $1`, [batchId]);
    expect(rowCount).toBe(0);
  });

  it('хранит ПДн только в зашифрованном виде', async () => {
    const { rows } = await pool().query(`SELECT raw_input_enc, phone_enc FROM check_results WHERE batch_id = $1`, [batchId]);
    const dump = JSON.stringify(rows);
    expect(dump).not.toContain('380671111111');
    const { rows: c } = await pool().query(`SELECT full_name_enc FROM customers WHERE customer_ref = 'T-001'`);
    expect(c[0].full_name_enc).not.toContain('Коваленко');
  });

  it('фильтрует по статусу и ищет по номеру и Customer ID', async () => {
    const review = await getResults(pool(), batchId, { offset: 0, limit: 50, status: ['needs_review', 'multiple_matches'] });
    expect(review.total).toBe(3);
    const byPhone = await getResults(pool(), batchId, { offset: 0, limit: 50, q: '067 111 11 11' });
    expect(byPhone.rows.map((r) => r.customerRef)).toEqual(['T-001']);
    const byRef = await getResults(pool(), batchId, { offset: 0, limit: 50, q: 't-007' });
    expect(byRef.rows.map((r) => r.phone)).toEqual(['+48512345678']);
  });

  it('пишет журнал аудита: загрузка, обработка, проверенные номера без открытых ПДн', async () => {
    const entries = await listAudit(pool(), { entityId: batchId });
    expect(entries.map((e) => e.action).sort()).toEqual(['batch.processed', 'batch.uploaded']);
    const uploaded = entries.find((e) => e.action === 'batch.uploaded')!;
    expect(uploaded).toMatchObject({ actorEmail: manager.email, ip: '10.0.0.1' });
    const processed = entries.find((e) => e.action === 'batch.processed')!;
    expect(processed.itemCount).toBe(8);
    const items = await listAuditItems(pool(), processed.id, 0, 100);
    expect(items.find((i) => i.phone === '+38067*****11')).toMatchObject({ status: 'exact_match', customerRef: 'T-001' });
    expect(items.find((i) => i.phone === '+38067*****33')).toMatchObject({ status: 'multiple_matches', customerRef: 'T-003, T-004' });
    expect(JSON.stringify(items)).not.toContain('380671111111');

    // Поиск в аудите «когда проверялся номер»
    const byPhone = await listAudit(pool(), { phoneHash: blindIndex('+380671111111') });
    expect(byPhone.map((e) => e.id)).toContain(processed.id);
  });

  it('журнал аудита нельзя изменить или удалить', async () => {
    await expect(pool().query(`UPDATE audit_log SET action = 'x'`)).rejects.toThrow(/append-only/);
    await expect(pool().query(`DELETE FROM audit_log`)).rejects.toThrow(/append-only/);
    await expect(pool().query(`DELETE FROM audit_batch_items`)).rejects.toThrow(/append-only/);
  });
});

describe('ручная проверка', () => {
  const find = async (phone: string) => (await getResults(pool(), batchId, { offset: 0, limit: 1, q: phone })).rows[0]!;

  it('показывает все данные кандидатов и пишет просмотр в аудит', async () => {
    const row = await find('+380673333333');
    const detail = await getResultDetail(pool(), row.id, ctx());
    expect(detail.candidates.map((c) => c.customerRef).sort()).toEqual(['T-003', 'T-004']);
    expect(detail.candidates[0]!.matchedPhone?.phone).toBe('+380673333333');
    const viewed = await listAudit(pool(), { action: 'customer.viewed', entityId: row.id });
    expect(viewed).toHaveLength(1);
  });

  it('подтверждение выбирает клиента, а решение и автор попадают в аудит', async () => {
    const row = await find('+380673333333');
    const t004 = await customerIdByRef('T-004');
    await reviewResult(row.id, { decision: 'confirm', customerId: t004, note: 'клиент подтвердил' }, ctx());
    const after = await find('+380673333333');
    expect(after).toMatchObject({ status: 'exact_match', confidence: 100, customerRef: 'T-004', reviewDecision: 'confirmed' });
    const detail = await getResultDetail(pool(), row.id, ctx());
    expect(detail.review).toMatchObject({ decision: 'confirmed', by: manager.name, note: 'клиент подтвердил' });
    const [entry] = await listAudit(pool(), { action: 'match.confirmed', entityId: row.id });
    expect(entry).toMatchObject({ actorEmail: manager.email });
    expect(entry!.details).toMatchObject({ customerRef: 'T-004', previousStatus: 'multiple_matches', phone: '+38067*****33' });
  });

  it('нельзя подтвердить клиента не из списка кандидатов', async () => {
    const row = await find('+380672222222');
    const other = await customerIdByRef('T-007');
    await expect(reviewResult(row.id, { decision: 'confirm', customerId: other }, ctx())).rejects.toThrow(/кандидатов/);
  });

  it('отклонение переводит запись в Not found', async () => {
    const row = await find('+380672222222');
    await reviewResult(row.id, { decision: 'reject' }, ctx());
    expect(await find('+380672222222')).toMatchObject({ status: 'not_found', confidence: 0, customerRef: null, reviewDecision: 'rejected' });
    expect(await listAudit(pool(), { action: 'match.rejected', entityId: row.id })).toHaveLength(1);
  });

  it('невалидный номер нельзя сопоставить', async () => {
    const row = (await getResults(pool(), batchId, { offset: 0, limit: 10, status: ['invalid_phone'] })).rows[0]!;
    await expect(reviewResult(row.id, { decision: 'reject' }, ctx())).rejects.toThrow();
  });
});

describe('изменение данных клиента', () => {
  it('сохраняет изменения и пишет в аудит, кто изменил и какие поля — без значений', async () => {
    const id = await customerIdByRef('T-001');
    const res = await updateCustomer(
      id,
      { fullName: 'Коваленко Олена Петрівна', channels: [{ channel: 'viber', value: '+380671111111', source: 'Клієнт сам', consentStatus: 'granted' }] },
      ctx(),
    );
    expect(res.changed).toEqual(['fullName', 'channels.viber:added']);
    const [entry] = await listAudit(pool(), { action: 'customer.updated', entityId: id });
    expect(entry).toMatchObject({ actorEmail: manager.email, details: { customerRef: 'T-001', changedFields: ['fullName', 'channels.viber:added'] } });
    expect(JSON.stringify(entry!.details)).not.toContain('Петрівна');
    const { rows } = await pool().query(`SELECT u.email FROM customers c JOIN users u ON u.id = c.updated_by WHERE c.id = $1`, [id]);
    expect(rows[0].email).toBe(manager.email);
  });
});

describe('экспорт XLSX', () => {
  it('содержит нужные колонки и строки', async () => {
    const out = new PassThrough();
    const chunks: Buffer[] = [];
    out.on('data', (c) => chunks.push(c));
    const count = await writeResultsXlsx(pool(), batchId, out);
    expect(count).toBe(8);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.concat(chunks) as unknown as ArrayBuffer);
    const ws = wb.worksheets[0]!;
    expect(ws.getRow(1).values).toEqual([undefined, ...EXPORT_COLUMNS]);
    const olena = ws.getRow(2).values as unknown[];
    expect(olena.slice(1)).toEqual(['+380671111111', 'Коваленко Олена Петрівна', 'T-001', 'https://www.facebook.com/olena.k', 'https://t.me/olena_k', 'Exact match']);
    expect(ws.rowCount).toBe(9);
  });
});

describe('ошибки и очистка', () => {
  it('файл без номеров — пакет с понятной ошибкой, файл удалён', async () => {
    const { id } = await createBatch({ fileName: 'empty.csv', data: Buffer.from('Имя\nОлена\n') }, ctx());
    await processBatch(id);
    const batch = await getBatch(pool(), id);
    expect(batch.status).toBe('failed');
    expect(batch.error).toMatch(/колонку с номерами/);
    expect((await pool().query(`SELECT 1 FROM upload_blobs WHERE batch_id = $1`, [id])).rowCount).toBe(0);
  });

  it('очистка удаляет просроченные результаты, но сохраняет аудит', async () => {
    const { id } = await createBatch({ fileName: 'old.csv', data: Buffer.from('phone\n+380671111111\n') }, ctx());
    await processBatch(id);
    await pool().query(`UPDATE batches SET expires_at = now() - interval '1 minute' WHERE id = $1`, [id]);
    await runCleanup();
    expect((await getBatch(pool(), id)).status).toBe('expired');
    expect((await pool().query(`SELECT 1 FROM check_results WHERE batch_id = $1`, [id])).rowCount).toBe(0);
    const audit = await listAudit(pool(), { entityId: id });
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(['batch.uploaded', 'batch.processed', 'batch.expired']));
  });

  it('обрабатывает 20 000 строк пакетами', async () => {
    const lines = ['phone'];
    for (let i = 0; i < 20_000; i++) lines.push(`+38067${String(1_000_000 + (i % 4_999)).padStart(7, '0')}`);
    process.env.MAX_ROWS = '50000';
    const { resetEnvCache } = await import('@/server/env');
    resetEnvCache();
    const { id } = await createBatch({ fileName: 'big.csv', data: Buffer.from(lines.join('\n')) }, ctx());
    const started = Date.now();
    await processBatch(id);
    const batch = await getBatch(pool(), id);
    expect(batch).toMatchObject({ status: 'completed', totalRows: 20_000, uniquePhones: 4_999, duplicateRows: 15_001 });
    expect(Date.now() - started).toBeLessThan(20_000);
    const page = await getResults(pool(), id, { offset: 4_900, limit: 200 });
    expect(page.rows).toHaveLength(99);
  });
});
