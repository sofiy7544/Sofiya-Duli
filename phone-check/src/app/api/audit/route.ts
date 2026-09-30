import { NextResponse } from 'next/server';
import { pool } from '@/server/db';
import { env } from '@/server/env';
import { blindIndex } from '@/server/crypto';
import { badRequest } from '@/server/errors';
import { ADMINS, route } from '@/server/http/route';
import { intParam } from '@/server/http/query';
import { listAudit } from '@/server/services/audit';
import { normalizePhone } from '@/lib/phone';

export const GET = route(ADMINS, async ({ req }) => {
  const sp = req.nextUrl.searchParams;
  const phone = sp.get('phone');
  let phoneHash: Buffer | undefined;
  if (phone) {
    const n = normalizePhone(phone, env().DEFAULT_REGION);
    if (!n.ok) throw badRequest('Некорректный номер для поиска');
    phoneHash = blindIndex(n.e164);
  }
  const rows = await listAudit(pool(), {
    action: sp.get('action') || undefined,
    entityId: sp.get('entityId') || undefined,
    before: sp.get('before') ? intParam(sp.get('before'), 0, 0, Number.MAX_SAFE_INTEGER) : undefined,
    phoneHash,
    limit: intParam(sp.get('limit'), 100, 1, 500),
  });
  return NextResponse.json({ entries: rows });
});
