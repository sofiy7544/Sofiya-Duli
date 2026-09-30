import { PgBoss } from 'pg-boss';
import { env } from './env';

export const QUEUE_PROCESS_BATCH = 'process-batch';
export const QUEUE_CLEANUP = 'cleanup';

const g = globalThis as unknown as { __phonecheckBoss?: Promise<PgBoss> };

/** pg-boss живёт в схеме pgboss той же БД — отдельный брокер не нужен. */
export function boss(): Promise<PgBoss> {
  g.__phonecheckBoss ??= (async () => {
    const b = new PgBoss({ connectionString: env().DATABASE_URL, schema: 'pgboss', max: 3 });
    b.on('error', (err) => console.error('[queue] error', err instanceof Error ? err.message : err));
    await b.start();
    await b.createQueue(QUEUE_PROCESS_BATCH);
    await b.createQueue(QUEUE_CLEANUP);
    return b;
  })().catch((err) => {
    g.__phonecheckBoss = undefined;
    throw err;
  });
  return g.__phonecheckBoss;
}

export async function enqueueBatch(batchId: string) {
  const b = await boss();
  await b.send(QUEUE_PROCESS_BATCH, { batchId }, { retryLimit: 2, retryDelay: 30, expireInSeconds: 30 * 60, singletonKey: batchId });
}

export async function stopBoss() {
  const b = g.__phonecheckBoss;
  g.__phonecheckBoss = undefined;
  if (b) await (await b).stop({ graceful: true, timeout: 20_000 });
}
