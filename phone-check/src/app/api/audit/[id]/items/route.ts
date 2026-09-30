import { NextResponse } from 'next/server';
import { pool } from '@/server/db';
import { notFound } from '@/server/errors';
import { ADMINS, route } from '@/server/http/route';
import { intParam } from '@/server/http/query';
import { listAuditItems } from '@/server/services/audit';

export const GET = route<{ id: string }>(ADMINS, async ({ req, params }) => {
  const id = Number.parseInt(params.id, 10);
  if (!Number.isSafeInteger(id)) throw notFound('Запись аудита');
  const sp = req.nextUrl.searchParams;
  const items = await listAuditItems(pool(), id, intParam(sp.get('offset'), 0, 0, 10_000_000), intParam(sp.get('limit'), 200, 1, 1000));
  return NextResponse.json({ items });
});
