import { pool, type Queryable } from '../db';
import { env } from '../env';
import { hashPassword, randomToken, sha256, verifyPassword } from '../crypto';
import { tooMany, unauthorized } from '../errors';
import { writeAudit } from './audit';
import type { Role, SessionUser } from '@/lib/types';

export const SESSION_COOKIE = 'pc_session';
const MAX_FAILS = 5;
const FAIL_WINDOW_MIN = 15;
const MAX_FAILS_PER_IP = 30;

// Хеш-заглушка, чтобы время ответа не выдавало существование пользователя
let dummyHash: Promise<string> | undefined;

export interface LoginContext {
  ip: string | null;
  userAgent: string | null;
}

export async function login(email: string, password: string, ctx: LoginContext) {
  const db = pool();
  const normalizedEmail = email.trim().toLowerCase();

  const { rows: fails } = await db.query<{ by_email: number; by_ip: number }>(
    `SELECT count(*) FILTER (WHERE email = $1) AS by_email,
            count(*) FILTER (WHERE ip = $2) AS by_ip
       FROM login_attempts
      WHERE success = false AND at > now() - make_interval(mins => $3)`,
    [normalizedEmail, ctx.ip, FAIL_WINDOW_MIN],
  );
  if (fails[0]!.by_email >= MAX_FAILS || (ctx.ip && fails[0]!.by_ip >= MAX_FAILS_PER_IP)) {
    throw tooMany(`Слишком много попыток входа. Повторите через ${FAIL_WINDOW_MIN} минут.`);
  }

  const { rows } = await db.query(
    `SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = $1`,
    [normalizedEmail],
  );
  const user = rows[0];
  dummyHash ??= hashPassword('dummy-password-for-timing');
  const ok = await verifyPassword(password, user?.password_hash ?? (await dummyHash));

  if (!user || !ok || !user.is_active) {
    await db.query(`INSERT INTO login_attempts (email, ip, success) VALUES ($1, $2, false)`, [normalizedEmail, ctx.ip]);
    await writeAudit(db, { actor: null, ...ctx }, { action: 'auth.login_failed', details: { email: normalizedEmail } });
    throw unauthorized();
  }

  const token = randomToken();
  const ttlHours = env().SESSION_TTL_HOURS;
  await db.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at, ip, user_agent)
     VALUES ($1, $2, now() + make_interval(secs => $3), $4, $5)`,
    [sha256(token), user.id, ttlHours * 3600, ctx.ip, ctx.userAgent?.slice(0, 500) ?? null],
  );
  await db.query(`INSERT INTO login_attempts (email, ip, success) VALUES ($1, $2, true)`, [normalizedEmail, ctx.ip]);
  const sessionUser: SessionUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  await writeAudit(db, { actor: sessionUser, ...ctx }, { action: 'auth.login', entityType: 'user', entityId: user.id });
  return { token, user: sessionUser, maxAge: ttlHours * 3600 };
}

export async function logout(token: string, ctx: LoginContext) {
  const db = pool();
  const { rows } = await db.query(
    `DELETE FROM sessions s USING users u WHERE s.token_hash = $1 AND u.id = s.user_id RETURNING u.id, u.email`,
    [sha256(token)],
  );
  if (rows[0]) await writeAudit(db, { actor: rows[0], ...ctx }, { action: 'auth.logout', entityType: 'user', entityId: rows[0].id });
}

/** Возвращает пользователя по токену и продлевает сессию (скользящее истечение). */
export async function userFromToken(token: string | undefined | null, q: Queryable = pool()): Promise<SessionUser | null> {
  if (!token || token.length > 128) return null;
  const { rows } = await q.query(
    `UPDATE sessions s
        SET last_seen_at = now(),
            expires_at = greatest(s.expires_at, now() + make_interval(secs => $2))
       FROM users u
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.id = s.user_id AND u.is_active
      RETURNING u.id, u.email, u.name, u.role`,
    [sha256(token), env().SESSION_TTL_HOURS * 3600],
  );
  return rows[0] ? { id: rows[0].id, email: rows[0].email, name: rows[0].name, role: rows[0].role } : null;
}

export function hasRole(user: SessionUser, roles: readonly Role[]) {
  return roles.includes(user.role);
}
