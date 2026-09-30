import { closePool, pool, tx } from '@/server/db';
import { hashPassword } from '@/server/crypto';
import { upsertCrmCustomer } from '@/server/services/customers';
import { writeAudit } from '@/server/services/audit';
import { demoCustomers } from './demo-data';

/**
 * Демо-данные: вымышленные клиенты CRM и пользователи трёх ролей.
 * Пароли демо-пользователей берутся из SEED_PASSWORD (по умолчанию — только для локальной разработки).
 */
async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Refusing to seed demo data in production (set ALLOW_DEMO_SEED=true to override)');
  }
  const password = process.env.SEED_PASSWORD ?? 'demo-Passw0rd-2026';
  const hash = await hashPassword(password);
  for (const [email, name, role] of [
    ['admin@example.com', 'Адміністратор', 'admin'],
    ['manager@example.com', 'Менеджер магазину', 'manager'],
    ['viewer@example.com', 'Аналітик (перегляд)', 'viewer'],
  ] as const) {
    await pool().query(
      `INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role`,
      [email, name, role, hash],
    );
  }

  const customers = demoCustomers();
  let skipped = 0;
  for (let i = 0; i < customers.length; i += 200) {
    await tx(async (client) => {
      for (const c of customers.slice(i, i + 200)) skipped += (await upsertCrmCustomer(client, c)).skippedPhones;
    });
  }
  await writeAudit(pool(), { actor: null, userAgent: 'seed' }, { action: 'crm.imported', details: { customers: customers.length, skippedPhones: skipped, source: 'demo seed' } });
  console.log(`[seed] users: admin@example.com / manager@example.com / viewer@example.com, password: ${process.env.SEED_PASSWORD ? '(SEED_PASSWORD)' : password}`);
  console.log(`[seed] customers: ${customers.length}, skipped phones: ${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
