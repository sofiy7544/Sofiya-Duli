import { NextResponse } from 'next/server';
import { pool } from '@/server/db';
import { ALL_ROLES, route, uuidParam } from '@/server/http/route';
import { intParam, parseStatusFilter } from '@/server/http/query';
import { getResults } from '@/server/services/batches';

export const GET = route<{ id: string }>(ALL_ROLES, async ({ req, params }) => {
  const sp = req.nextUrl.searchParams;
  const data = await getResults(pool(), uuidParam(params.id, 'Пакет'), {
    offset: intParam(sp.get('offset'), 0, 0, 10_000_000),
    limit: intParam(sp.get('limit'), 200, 1, 500),
    status: parseStatusFilter(sp.get('status')),
    q: sp.get('q')?.slice(0, 64) || undefined,
  });
  return NextResponse.json(data);
});
