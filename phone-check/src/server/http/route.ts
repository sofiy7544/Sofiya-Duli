import { isIP } from 'node:net';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { AppError, forbidden, notFound, unauthorized } from '../errors';
import { SESSION_COOKIE, userFromToken } from '../services/auth';
import type { AuditContext } from '../services/audit';
import type { Role, SessionUser } from '@/lib/types';

export interface RouteContext<P> {
  req: NextRequest;
  params: P;
  user: SessionUser;
  audit: AuditContext;
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = fwd || req.headers.get('x-real-ip') || '';
  return isIP(ip) ? ip : null;
}

/** CSRF: изменяющие запросы принимаются только с того же origin. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw forbidden();
    }
    if (originHost !== host) throw forbidden();
    return;
  }
  if (req.headers.get('sec-fetch-site') !== 'same-origin') throw forbidden();
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, details: err.details } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: 'validation', message: 'Некорректные данные', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) } },
      { status: 400 },
    );
  }
  console.error('[api] unhandled error', err instanceof Error ? err.stack : err);
  return NextResponse.json({ error: { code: 'internal', message: 'Внутренняя ошибка сервера' } }, { status: 500 });
}

type Handler<P> = (ctx: RouteContext<P>) => Promise<Response>;

/**
 * Обёртка для API: сессия, проверка роли, CSRF для изменяющих методов, единый формат ошибок.
 */
export function route<P = Record<string, never>>(roles: readonly Role[], handler: Handler<P>) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) assertSameOrigin(req);
      const user = await userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
      if (!user) throw unauthorized();
      if (!roles.includes(user.role)) throw forbidden();
      const params = (await context?.params) ?? ({} as P);
      const res = await handler({
        req,
        params,
        user,
        audit: { actor: user, ip: clientIp(req), userAgent: req.headers.get('user-agent') },
      });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export const ALL_ROLES: readonly Role[] = ['admin', 'manager', 'viewer'];
export const WRITERS: readonly Role[] = ['admin', 'manager'];
export const ADMINS: readonly Role[] = ['admin'];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Некорректный UUID в пути — это 404, а не ошибка БД. */
export function uuidParam(value: string, what?: string): string {
  if (!UUID.test(value)) throw notFound(what);
  return value;
}
