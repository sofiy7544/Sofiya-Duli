import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { closePool, pool, tx } from '@/server/db';
import { upsertCrmCustomer, type CrmCustomerInput } from '@/server/services/customers';
import { writeAudit } from '@/server/services/audit';
import { CHANNELS, type Channel } from '@/lib/types';
import { decodeText, sniffDelimiter } from '@/server/services/file-parser';

/**
 * Синхронизация клиентов из CRM бизнеса.
 *   npm run crm:import -- export.jsonl   (одна запись CrmCustomerInput на строку)
 *   npm run crm:import -- export.csv     (колонки: customer_id, full_name, email, status, source, consent_status,
 *                                        consent_at, consent_source, phones ("|" между номерами), phone_verified,
 *                                        facebook, messenger, telegram, viber, whatsapp, channels_consent)
 * Загружаются только данные, которые уже есть в CRM. Внешние источники не используются.
 */
function fromCsv(text: string): CrmCustomerInput[] {
  const records: Record<string, string>[] = parse(text, { columns: (h: string[]) => h.map((x) => x.trim().toLowerCase()), delimiter: sniffDelimiter(text), skip_empty_lines: true, bom: true, trim: true });
  return records.map((r) => {
    const consent = (r.channels_consent || r.consent_status || 'unknown') as CrmCustomerInput['consentStatus'];
    return {
      customerRef: r.customer_id!,
      fullName: r.full_name!,
      email: r.email || null,
      status: (r.status || 'active') as CrmCustomerInput['status'],
      source: r.source || 'CRM',
      consentStatus: (r.consent_status || 'unknown') as CrmCustomerInput['consentStatus'],
      consentAt: r.consent_at || null,
      consentSource: r.consent_source || null,
      phones: (r.phones || r.phone || '')
        .split('|')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((phone) => ({ phone, isVerified: ['1', 'true', 'yes', 'так', 'да'].includes((r.phone_verified || '').toLowerCase()) })),
      channels: CHANNELS.filter((ch) => r[ch]).map((ch: Channel) => ({ channel: ch, value: r[ch]!, consentStatus: consent, consentAt: r.consent_at || null })),
    };
  });
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: crm:import <file.jsonl|file.csv>');
    process.exit(1);
  }
  const buf = await readFile(file);
  const list: CrmCustomerInput[] = file.endsWith('.jsonl')
    ? decodeText(buf).split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l))
    : fromCsv(decodeText(buf));
  let skipped = 0;
  let invalid = 0;
  for (let i = 0; i < list.length; i += 500) {
    await tx(async (client) => {
      for (const c of list.slice(i, i + 500)) {
        if (!c.customerRef || !c.fullName) {
          invalid++;
          continue;
        }
        skipped += (await upsertCrmCustomer(client, c)).skippedPhones;
      }
    });
    console.log(`[crm] ${Math.min(i + 500, list.length)} / ${list.length}`);
  }
  await writeAudit(pool(), { actor: null, userAgent: 'crm-import' }, { action: 'crm.imported', details: { file: file.split('/').pop(), customers: list.length - invalid, invalidRecords: invalid, skippedPhones: skipped } });
  console.log(`[crm] imported ${list.length - invalid}, invalid records ${invalid}, unparseable phones ${skipped}`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
