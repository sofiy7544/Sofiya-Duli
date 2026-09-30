import { NextResponse } from 'next/server';
import { pool } from '@/server/db';
import { ADMINS, ALL_ROLES, route, uuidParam } from '@/server/http/route';
import { deleteBatch, getBatch } from '@/server/services/batches';

type P = { id: string };

export const GET = route<P>(ALL_ROLES, async ({ params }) =>
  NextResponse.json({ batch: await getBatch(pool(), uuidParam(params.id, 'Пакет')) }),
);

export const DELETE = route<P>(ADMINS, async ({ params, audit }) => {
  await deleteBatch(uuidParam(params.id, 'Пакет'), audit);
  return NextResponse.json({ ok: true });
});
