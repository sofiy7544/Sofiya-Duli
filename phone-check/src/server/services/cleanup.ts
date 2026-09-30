import { pool, tx } from '../db';
import { env } from '../env';
import { writeAudit } from './audit';

/**
 * Регламентная очистка: временные файлы, просроченные результаты, сессии.
 * Журнал аудита не удаляется.
 */
export async function runCleanup() {
  const db = pool();
  const e = env();
  const blobs = await db.query(
    `DELETE FROM upload_blobs WHERE created_at < now() - make_interval(mins => $1) RETURNING batch_id`,
    [e.UPLOAD_BLOB_TTL_MINUTES],
  );
  // Файл удалён по TTL, а пакет так и не обработан — помечаем как ошибку
  if (blobs.rowCount) {
    await db.query(
      `UPDATE batches SET status = 'failed', error = 'Файл удалён по сроку хранения до обработки', finished_at = now()
        WHERE id = ANY($1::uuid[]) AND status IN ('queued', 'processing')`,
      [blobs.rows.map((r) => r.batch_id)],
    );
  }

  const { rows: expired } = await db.query(`SELECT id FROM batches WHERE expires_at < now() AND status <> 'expired'`);
  for (const { id } of expired) {
    await tx(async (client) => {
      await client.query(`DELETE FROM check_results WHERE batch_id = $1`, [id]);
      await client.query(`DELETE FROM upload_blobs WHERE batch_id = $1`, [id]);
      await client.query(`UPDATE batches SET status = 'expired' WHERE id = $1`, [id]);
      await writeAudit(client, { actor: null, userAgent: 'worker' }, { action: 'batch.expired', entityType: 'batch', entityId: id });
    });
  }

  const sessions = await db.query(`DELETE FROM sessions WHERE expires_at < now()`);
  await db.query(`DELETE FROM login_attempts WHERE at < now() - interval '30 days'`);
  return { blobs: blobs.rowCount ?? 0, expiredBatches: expired.length, sessions: sessions.rowCount ?? 0 };
}
