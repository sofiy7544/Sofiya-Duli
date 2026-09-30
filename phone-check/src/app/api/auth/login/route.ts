import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { env } from '@/server/env';
import { login, SESSION_COOKIE } from '@/server/services/auth';
import { assertSameOrigin, clientIp, errorResponse } from '@/server/http/route';

const schema = z.object({ email: z.string().trim().max(200), password: z.string().max(200) });

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = schema.parse(await req.json());
    const { token, user, maxAge } = await login(body.email, body.password, {
      ip: clientIp(req),
      userAgent: req.headers.get('user-agent'),
    });
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env().COOKIE_SECURE,
      path: '/',
      maxAge,
    });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
