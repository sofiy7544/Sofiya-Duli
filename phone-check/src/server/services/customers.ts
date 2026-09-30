import { z } from 'zod';
import { tx, type Queryable } from '../db';
import { blindIndex, decrypt, decryptNullable, encrypt, encryptNullable } from '../crypto';
import { badRequest, notFound } from '../errors';
import { writeAudit, type AuditContext } from './audit';
import { channelUrl } from '@/lib/channels';
import { normalizePhone } from '@/lib/phone';
import { CHANNELS, type Channel, type ChannelValue, type ConsentStatus } from '@/lib/types';
import { env } from '../env';

export interface CustomerBrief {
  id: string;
  customerRef: string;
  fullName: string;
  source: string;
  consentStatus: ConsentStatus;
  consentAt: string | null;
  channels: Partial<Record<Channel, ChannelValue>>;
}

export interface CustomerPhone {
  id: string;
  phone: string;
  country: string | null;
  label: string | null;
  isVerified: boolean;
  isActive: boolean;
  source: string;
  collectedAt: string | null;
}

export interface CustomerDetail extends CustomerBrief {
  email: string | null;
  status: 'active' | 'merged' | 'deleted';
  consentSource: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  phones: CustomerPhone[];
  /** Все каналы, включая отозванные (значение отозванного канала скрыто). */
  allChannels: (ChannelValue & { withdrawn: boolean })[];
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

function toChannelValue(r: { channel: Channel; value_enc: string; source: string; consent_status: ConsentStatus; consent_at: Date | null }): ChannelValue {
  const value = decrypt(r.value_enc);
  return { channel: r.channel, value, url: channelUrl(r.channel, value), source: r.source, consentStatus: r.consent_status, consentAt: iso(r.consent_at) };
}

/** Краткие данные для таблицы результатов. Каналы с отозванным согласием не возвращаются. */
export async function loadCustomerBriefs(q: Queryable, ids: string[]): Promise<Map<string, CustomerBrief>> {
  const out = new Map<string, CustomerBrief>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return out;
  const [{ rows: customers }, { rows: channels }] = await Promise.all([
    q.query(
      `SELECT id, customer_ref, full_name_enc, source, consent_status, consent_at FROM customers WHERE id = ANY($1::uuid[])`,
      [unique],
    ),
    q.query(
      `SELECT customer_id, channel, value_enc, source, consent_status, consent_at
         FROM customer_channels WHERE customer_id = ANY($1::uuid[]) AND consent_status <> 'withdrawn'`,
      [unique],
    ),
  ]);
  for (const c of customers) {
    out.set(c.id, {
      id: c.id,
      customerRef: c.customer_ref,
      fullName: decrypt(c.full_name_enc),
      source: c.source,
      consentStatus: c.consent_status,
      consentAt: iso(c.consent_at),
      channels: {},
    });
  }
  for (const ch of channels) {
    const brief = out.get(ch.customer_id);
    if (brief) brief.channels[ch.channel as Channel] = toChannelValue(ch);
  }
  return out;
}

export async function loadCustomerDetail(q: Queryable, id: string): Promise<CustomerDetail> {
  const { rows } = await q.query(
    `SELECT c.*, u.name AS updated_by_name FROM customers c LEFT JOIN users u ON u.id = c.updated_by WHERE c.id = $1`,
    [id],
  );
  const c = rows[0];
  if (!c) throw notFound('Клиент');
  const [{ rows: phones }, { rows: channels }] = await Promise.all([
    q.query(`SELECT * FROM customer_phones WHERE customer_id = $1 ORDER BY is_active DESC, is_verified DESC, created_at`, [id]),
    q.query(`SELECT * FROM customer_channels WHERE customer_id = $1 ORDER BY channel`, [id]),
  ]);
  const visible: Partial<Record<Channel, ChannelValue>> = {};
  const allChannels = channels.map((ch) => {
    const withdrawn = ch.consent_status === 'withdrawn';
    const v: ChannelValue & { withdrawn: boolean } = withdrawn
      ? { channel: ch.channel, value: '', url: null, source: ch.source, consentStatus: ch.consent_status, consentAt: iso(ch.consent_at), withdrawn }
      : { ...toChannelValue(ch), withdrawn };
    if (!withdrawn) visible[ch.channel as Channel] = v;
    return v;
  });
  return {
    id: c.id,
    customerRef: c.customer_ref,
    fullName: decrypt(c.full_name_enc),
    email: decryptNullable(c.email_enc),
    status: c.status,
    source: c.source,
    consentStatus: c.consent_status,
    consentAt: iso(c.consent_at),
    consentSource: c.consent_source,
    notes: decryptNullable(c.notes_enc),
    createdAt: c.created_at.toISOString(),
    updatedAt: c.updated_at.toISOString(),
    updatedBy: c.updated_by_name,
    channels: visible,
    allChannels,
    phones: phones.map((p) => ({
      id: p.id,
      phone: decrypt(p.phone_enc),
      country: p.country,
      label: p.label,
      isVerified: p.is_verified,
      isActive: p.is_active,
      source: p.source,
      collectedAt: iso(p.collected_at),
    })),
  };
}

const consentEnum = z.enum(['granted', 'withdrawn', 'unknown']);
const channelInput = z.object({
  channel: z.enum(CHANNELS),
  value: z.string().trim().max(256),
  source: z.string().trim().min(1).max(100),
  consentStatus: consentEnum,
  consentAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

export const customerUpdateSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    email: z.email().max(200).nullable(),
    consentStatus: consentEnum,
    consentAt: z.iso.datetime({ offset: true }).nullable(),
    consentSource: z.string().trim().max(100).nullable(),
    notes: z.string().max(2000).nullable(),
    channels: z.array(channelInput).max(CHANNELS.length),
  })
  .partial();

export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;

/** Изменение карточки менеджером. В аудит пишутся имена изменённых полей, без самих ПДн. */
export async function updateCustomer(id: string, input: CustomerUpdate, ctx: AuditContext) {
  const data = customerUpdateSchema.parse(input);
  return tx(async (client) => {
    const current = await loadCustomerDetail(client, id);
    const changed: string[] = [];
    const sets: string[] = [];
    const params: unknown[] = [id];
    const set = (col: string, value: unknown) => {
      params.push(value);
      sets.push(`${col} = $${params.length}`);
    };
    if (data.fullName !== undefined && data.fullName !== current.fullName) {
      set('full_name_enc', encrypt(data.fullName));
      changed.push('fullName');
    }
    if (data.email !== undefined && (data.email || null) !== current.email) {
      set('email_enc', encryptNullable(data.email));
      changed.push('email');
    }
    if (data.consentStatus !== undefined && data.consentStatus !== current.consentStatus) {
      set('consent_status', data.consentStatus);
      changed.push('consentStatus');
    }
    if (data.consentAt !== undefined && data.consentAt !== current.consentAt) {
      set('consent_at', data.consentAt);
      changed.push('consentAt');
    }
    if (data.consentSource !== undefined && (data.consentSource || null) !== current.consentSource) {
      set('consent_source', data.consentSource || null);
      changed.push('consentSource');
    }
    if (data.notes !== undefined && (data.notes || null) !== current.notes) {
      set('notes_enc', encryptNullable(data.notes));
      changed.push('notes');
    }

    if (data.channels) {
      const seen = new Set<Channel>();
      for (const ch of data.channels) {
        if (seen.has(ch.channel)) throw badRequest(`Канал ${ch.channel} указан дважды`);
        seen.add(ch.channel);
        const before = current.allChannels.find((c) => c.channel === ch.channel);
        if (!ch.value) {
          if (before) {
            await client.query(`DELETE FROM customer_channels WHERE customer_id = $1 AND channel = $2`, [id, ch.channel]);
            changed.push(`channels.${ch.channel}:removed`);
          }
          continue;
        }
        const same =
          before &&
          !before.withdrawn &&
          before.value === ch.value &&
          before.source === ch.source &&
          before.consentStatus === ch.consentStatus &&
          (before.consentAt ?? null) === (ch.consentAt ?? null);
        if (same) continue;
        await client.query(
          `INSERT INTO customer_channels (customer_id, channel, value_enc, source, consent_status, consent_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (customer_id, channel) DO UPDATE
             SET value_enc = EXCLUDED.value_enc, source = EXCLUDED.source, consent_status = EXCLUDED.consent_status,
                 consent_at = EXCLUDED.consent_at, updated_at = now()`,
          [id, ch.channel, encrypt(ch.value), ch.source, ch.consentStatus, ch.consentAt ?? null],
        );
        changed.push(`channels.${ch.channel}:${before ? 'updated' : 'added'}`);
      }
    }

    if (changed.length === 0) return { changed };
    set('updated_by', ctx.actor?.id ?? null);
    await client.query(`UPDATE customers SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, params);
    await writeAudit(client, ctx, {
      action: 'customer.updated',
      entityType: 'customer',
      entityId: id,
      details: { customerRef: current.customerRef, changedFields: changed },
    });
    return { changed };
  });
}

// Импорт из CRM ----------------------------------------------------------------

export interface CrmCustomerInput {
  customerRef: string;
  fullName: string;
  email?: string | null;
  status?: 'active' | 'merged' | 'deleted';
  source: string;
  consentStatus?: ConsentStatus;
  consentAt?: string | null;
  consentSource?: string | null;
  phones: { phone: string; isVerified?: boolean; isActive?: boolean; source?: string; collectedAt?: string | null; label?: string | null }[];
  channels?: { channel: Channel; value: string; source?: string; consentStatus?: ConsentStatus; consentAt?: string | null }[];
}

/** Идемпотентный upsert клиента по Customer ID. Номера нормализуются так же, как при проверке. */
export async function upsertCrmCustomer(q: Queryable, c: CrmCustomerInput): Promise<{ id: string; skippedPhones: number }> {
  const { rows } = await q.query(
    `INSERT INTO customers (customer_ref, full_name_enc, email_enc, status, source, consent_status, consent_at, consent_source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (customer_ref) DO UPDATE SET
       full_name_enc = EXCLUDED.full_name_enc, email_enc = EXCLUDED.email_enc, status = EXCLUDED.status,
       source = EXCLUDED.source, consent_status = EXCLUDED.consent_status, consent_at = EXCLUDED.consent_at,
       consent_source = EXCLUDED.consent_source, updated_at = now()
     RETURNING id`,
    [
      c.customerRef,
      encrypt(c.fullName),
      encryptNullable(c.email),
      c.status ?? 'active',
      c.source,
      c.consentStatus ?? 'unknown',
      c.consentAt ?? null,
      c.consentSource ?? null,
    ],
  );
  const id = rows[0].id as string;
  let skipped = 0;
  for (const p of c.phones) {
    const n = normalizePhone(p.phone, env().DEFAULT_REGION);
    if (!n.ok) {
      skipped++;
      continue;
    }
    await q.query(
      `INSERT INTO customer_phones (customer_id, phone_hash, phone_enc, country, label, is_verified, is_active, source, collected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (customer_id, phone_hash) DO UPDATE SET
         is_verified = EXCLUDED.is_verified, is_active = EXCLUDED.is_active, source = EXCLUDED.source,
         collected_at = EXCLUDED.collected_at, label = EXCLUDED.label`,
      [id, blindIndex(n.e164), encrypt(n.e164), n.country, p.label ?? null, p.isVerified ?? false, p.isActive ?? true, p.source ?? c.source, p.collectedAt ?? null],
    );
  }
  for (const ch of c.channels ?? []) {
    if (!ch.value?.trim()) continue;
    await q.query(
      `INSERT INTO customer_channels (customer_id, channel, value_enc, source, consent_status, consent_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (customer_id, channel) DO UPDATE SET
         value_enc = EXCLUDED.value_enc, source = EXCLUDED.source, consent_status = EXCLUDED.consent_status,
         consent_at = EXCLUDED.consent_at, updated_at = now()`,
      [id, ch.channel, encrypt(ch.value.trim()), ch.source ?? c.source, ch.consentStatus ?? 'unknown', ch.consentAt ?? null],
    );
  }
  return { id, skippedPhones: skipped };
}
