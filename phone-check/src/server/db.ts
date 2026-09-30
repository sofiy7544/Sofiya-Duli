import pg from 'pg';
import { env } from './env';

// bigint (count, bigserial) как number: значения в приложении не выходят за 2^53
pg.types.setTypeParser(20, (v) => Number.parseInt(v, 10));

export type Queryable = Pick<pg.Pool, 'query'> | pg.PoolClient;

const globalForPool = globalThis as unknown as { __phonecheckPool?: pg.Pool };

export function pool(): pg.Pool {
  if (!globalForPool.__phonecheckPool) {
    globalForPool.__phonecheckPool = new pg.Pool({
      connectionString: env().DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
    });
  }
  return globalForPool.__phonecheckPool;
}

export async function closePool() {
  const p = globalForPool.__phonecheckPool;
  globalForPool.__phonecheckPool = undefined;
  if (p) await p.end();
}

export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
