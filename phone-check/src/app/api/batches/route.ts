import { NextResponse } from 'next/server';
import { pool } from '@/server/db';
import { env } from '@/server/env';
import { badRequest } from '@/server/errors';
import { ALL_ROLES, route, WRITERS } from '@/server/http/route';
import { createBatch, listBatches } from '@/server/services/batches';
import { enqueueBatch } from '@/server/queue';

export const GET = route(ALL_ROLES, async () => NextResponse.json({ batches: await listBatches(pool()) }));

export const POST = route(WRITERS, async ({ req, audit }) => {
  const maxBytes = env().MAX_UPLOAD_MB * 1024 * 1024;
  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > maxBytes + 64 * 1024) throw badRequest(`Файл больше ${env().MAX_UPLOAD_MB} МБ`);
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw badRequest('Приложите файл в поле file');
  if (file.size > maxBytes) throw badRequest(`Файл больше ${env().MAX_UPLOAD_MB} МБ`);
  const { id } = await createBatch({ fileName: file.name, data: Buffer.from(await file.arrayBuffer()) }, audit);
  await enqueueBatch(id);
  return NextResponse.json({ id }, { status: 201 });
});
