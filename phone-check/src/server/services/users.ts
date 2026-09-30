import { z } from 'zod';
import { pool, tx } from '../db';
import { hashPassword } from '../crypto';
import { badRequest, conflict, notFound } from '../errors';
import { writeAudit, type AuditContext } from './audit';
import { ROLES } from '@/lib/types';

const password = z
  .string()
  .min(12, 'Пароль — минимум 12 символов')
  .max(200)
  .refine((p) => /[a-zа-я]/i.test(p) && /\d/.test(p), 'Пароль должен содержать буквы и цифры');

export const createUserSchema = z.object({
  email: z.email().max(200),
  name: z.string().trim().min(1).max(100),
  role: z.enum(ROLES),
  password,
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  password: password.optional(),
});

export async function listUsers() {
  const { rows } = await pool().query(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at,
            (SELECT max(last_seen_at) FROM sessions s WHERE s.user_id = u.id) AS last_seen_at
       FROM users u ORDER BY u.created_at`,
  );
  return rows.map((r) => ({
    id: r.id as string,
    email: r.email as string,
    name: r.name as string,
    role: r.role as (typeof ROLES)[number],
    isActive: r.is_active as boolean,
    createdAt: r.created_at.toISOString() as string,
    lastSeenAt: (r.last_seen_at?.toISOString() ?? null) as string | null,
  }));
}

export async function createUser(input: z.infer<typeof createUserSchema>, ctx: AuditContext) {
  const data = createUserSchema.parse(input);
  const hash = await hashPassword(data.password);
  return tx(async (client) => {
    const exists = await client.query(`SELECT 1 FROM users WHERE email = $1`, [data.email]);
    if (exists.rowCount) throw conflict('Пользователь с таким email уже есть');
    const { rows } = await client.query(
      `INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id`,
      [data.email.toLowerCase(), data.name, data.role, hash],
    );
    await writeAudit(client, ctx, { action: 'user.created', entityType: 'user', entityId: rows[0].id, details: { email: data.email, role: data.role } });
    return { id: rows[0].id as string };
  });
}

export async function updateUser(id: string, input: z.infer<typeof updateUserSchema>, ctx: AuditContext) {
  const data = updateUserSchema.parse(input);
  if (ctx.actor?.id === id && (data.role !== undefined || data.isActive === false)) {
    throw badRequest('Нельзя менять собственную роль или блокировать себя');
  }
  const hash = data.password ? await hashPassword(data.password) : undefined;
  return tx(async (client) => {
    const { rows } = await client.query(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [id]);
    if (!rows[0]) throw notFound('Пользователь');
    const changes: Record<string, unknown> = {};
    if (data.name !== undefined && data.name !== rows[0].name) changes.name = data.name;
    if (data.role !== undefined && data.role !== rows[0].role) changes.role = data.role;
    if (data.isActive !== undefined && data.isActive !== rows[0].is_active) changes.isActive = data.isActive;
    if (hash) changes.password = true;
    if (Object.keys(changes).length === 0) return { changed: [] };
    await client.query(
      `UPDATE users SET name = coalesce($2, name), role = coalesce($3, role), is_active = coalesce($4, is_active),
              password_hash = coalesce($5, password_hash), updated_at = now() WHERE id = $1`,
      [id, data.name ?? null, data.role ?? null, data.isActive ?? null, hash ?? null],
    );
    // Смена роли, пароля или блокировка завершает активные сессии
    if (changes.role || changes.isActive === false || changes.password) await client.query(`DELETE FROM sessions WHERE user_id = $1`, [id]);
    await writeAudit(client, ctx, {
      action: 'user.updated',
      entityType: 'user',
      entityId: id,
      details: { email: rows[0].email, changes: { ...changes, password: changes.password ? 'changed' : undefined } },
    });
    return { changed: Object.keys(changes) };
  });
}
