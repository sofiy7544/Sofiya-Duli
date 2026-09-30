import { PassThrough, Readable } from 'node:stream';
import { pool } from '@/server/db';
import { conflict } from '@/server/errors';
import { route, uuidParam, WRITERS } from '@/server/http/route';
import { parseStatusFilter } from '@/server/http/query';
import { getBatch } from '@/server/services/batches';
import { writeResultsXlsx } from '@/server/services/export';
import { writeAudit } from '@/server/services/audit';

export const GET = route<{ id: string }>(WRITERS, async ({ req, params, audit }) => {
  const id = uuidParam(params.id, 'Пакет');
  const batch = await getBatch(pool(), id);
  if (batch.status !== 'completed') throw conflict('Экспорт доступен после завершения обработки');
  const sp = req.nextUrl.searchParams;
  const filter = { status: parseStatusFilter(sp.get('status')), q: sp.get('q')?.slice(0, 64) || undefined };
  await writeAudit(pool(), audit, {
    action: 'batch.exported',
    entityType: 'batch',
    entityId: id,
    details: { fileName: batch.fileName, filter: { status: filter.status ?? 'all', q: filter.q ? 'yes' : undefined } },
  });

  const out = new PassThrough();
  writeResultsXlsx(pool(), id, out, filter).catch((err) => {
    console.error('[export] failed', id, err instanceof Error ? err.message : err);
    out.destroy(err);
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(Readable.toWeb(out) as ReadableStream, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="phone-check-${stamp}.xlsx"`,
    },
  });
});
