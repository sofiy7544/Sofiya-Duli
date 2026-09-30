import { NextResponse } from 'next/server';
import { route, uuidParam, WRITERS } from '@/server/http/route';
import { reviewResult } from '@/server/services/review';

export const POST = route<{ id: string }>(WRITERS, async ({ req, params, audit }) => {
  await reviewResult(uuidParam(params.id, 'Запись'), await req.json(), audit);
  return NextResponse.json({ ok: true });
});
