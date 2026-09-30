import { NextResponse } from 'next/server';
import { pool } from '@/server/db';
import { ALL_ROLES, route, uuidParam } from '@/server/http/route';
import { getResultDetail } from '@/server/services/review';

export const GET = route<{ id: string }>(ALL_ROLES, async ({ params, audit }) =>
  NextResponse.json({ result: await getResultDetail(pool(), uuidParam(params.id, 'Запись'), audit) }),
);
