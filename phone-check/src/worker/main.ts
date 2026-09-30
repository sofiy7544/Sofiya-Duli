import { boss, QUEUE_CLEANUP, QUEUE_PROCESS_BATCH, stopBoss } from '@/server/queue';
import { processBatch } from '@/server/services/batches';
import { runCleanup } from '@/server/services/cleanup';
import { closePool } from '@/server/db';
import { env } from '@/server/env';

async function main() {
  env(); // проверка конфигурации до старта
  const b = await boss();
  const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 2);

  await b.work<{ batchId: string }>(QUEUE_PROCESS_BATCH, { batchSize: 1, localConcurrency: concurrency }, async ([job]) => {
    if (!job) return;
    const started = Date.now();
    await processBatch(job.data.batchId);
    console.log(`[worker] batch ${job.data.batchId} done in ${Date.now() - started} ms`);
  });

  await b.work(QUEUE_CLEANUP, async () => {
    const r = await runCleanup();
    if (r.blobs || r.expiredBatches || r.sessions) console.log('[worker] cleanup', r);
  });
  await b.schedule(QUEUE_CLEANUP, '*/10 * * * *');

  // Подхватываем пакеты, которые остались в очереди после перезапуска без задания
  const { pool } = await import('@/server/db');
  const { rows } = await pool().query(`SELECT b.id FROM batches b JOIN upload_blobs u ON u.batch_id = b.id WHERE b.status = 'queued'`);
  for (const r of rows) await b.send(QUEUE_PROCESS_BATCH, { batchId: r.id }, { singletonKey: r.id, retryLimit: 2 });

  console.log(`[worker] started, concurrency=${concurrency}`);
}

async function shutdown(signal: string) {
  console.log(`[worker] ${signal}, stopping…`);
  await stopBoss().catch(() => {});
  await closePool().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
