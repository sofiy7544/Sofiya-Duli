import type { Queryable } from '../db';
import type { SessionUser } from '@/lib/types';

export interface AuditContext {
  actor: Pick<SessionUser, 'id' | 'email'> | null;
  ip?: string | null;
  userAgent?: string | null;
}

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'batch.uploaded'
  | 'batch.processed'
  | 'batch.failed'
  | 'batch.exported'
  | 'batch.deleted'
  | 'batch.expired'
  | 'customer.viewed'
  | 'customer.updated'
  | 'match.confirmed'
  | 'match.rejected'
  | 'user.created'
  | 'user.updated'
  | 'crm.imported';

export interface AuditEntry {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export async function writeAudit(q: Queryable, ctx: AuditContext, entry: AuditEntry): Promise<number> {
  const { rows } = await q.query<{ id: number }>(
    `INSERT INTO audit_log (actor_id, actor_email, action, entity_type, entity_id, details, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      ctx.actor?.id ?? null,
      ctx.actor?.email ?? null,
      entry.action,
      entry.entityType ?? null,
      entry.entityId ?? null,
      JSON.stringify(entry.details ?? {}),
      ctx.ip || null,
      ctx.userAgent?.slice(0, 500) ?? null,
    ],
  );
  return rows[0]!.id;
}

export interface AuditListFilter {
  action?: string;
  actorId?: string;
  entityId?: string;
  phoneHash?: Buffer;
  before?: number;
  limit?: number;
}

export interface AuditRow {
  id: number;
  at: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown>;
  ip: string | null;
  itemCount: number;
}

export async function listAudit(q: Queryable, f: AuditListFilter): Promise<AuditRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (f.action) where.push(`a.action = ${p(f.action)}`);
  if (f.actorId) where.push(`a.actor_id = ${p(f.actorId)}`);
  if (f.entityId) where.push(`a.entity_id = ${p(f.entityId)}`);
  if (f.before) where.push(`a.id < ${p(f.before)}`);
  if (f.phoneHash)
    where.push(`(a.id IN (SELECT audit_id FROM audit_batch_items WHERE phone_hash = ${p(f.phoneHash)})
                 OR a.details->>'phoneHash' = ${p(f.phoneHash.toString('hex'))})`);
  const limit = Math.min(Math.max(f.limit ?? 100, 1), 500);
  const { rows } = await q.query(
    `SELECT a.id, a.at, a.actor_id, a.actor_email, a.action, a.entity_type, a.entity_id, a.details, host(a.ip) AS ip,
            (SELECT count(*) FROM audit_batch_items i WHERE i.audit_id = a.id) AS item_count
       FROM audit_log a
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.id DESC
      LIMIT ${limit}`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    at: r.at.toISOString(),
    actorId: r.actor_id,
    actorEmail: r.actor_email,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    details: r.details,
    ip: r.ip,
    itemCount: r.item_count,
  }));
}

export async function listAuditItems(q: Queryable, auditId: number, offset: number, limit: number) {
  const { rows } = await q.query(
    `SELECT phone_masked, status, customer_ref FROM audit_batch_items
      WHERE audit_id = $1 ORDER BY id OFFSET $2 LIMIT $3`,
    [auditId, offset, Math.min(limit, 1000)],
  );
  return rows.map((r) => ({ phone: r.phone_masked as string, status: r.status as string, customerRef: r.customer_ref as string | null }));
}
