import { NextResponse, type NextRequest } from 'next/server';
import { logout, SESSION_COOKIE } from '@/server/services/auth';
import { assertSameOrigin, clientIp, errorResponse } from '@/server/http/route';

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (token) await logout(token, { ip: clientIp(req), userAgent: req.headers.get('user-agent') });
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
