import { closePool } from '@/server/db';
import { createUser } from '@/server/services/users';

/** Создание первого администратора: npm run user:create -- email@shop.ua "Имя" admin 'пароль' */
async function main() {
  const [email, name, role = 'admin', password = process.env.ADMIN_PASSWORD] = process.argv.slice(2);
  if (!email || !name || !password) {
    console.error('Usage: user:create <email> <name> [admin|manager|viewer] [password]  (or ADMIN_PASSWORD env)');
    process.exit(1);
  }
  const { id } = await createUser({ email, name, role: role as 'admin', password }, { actor: null, userAgent: 'cli' });
  console.log(`[user] created ${email} (${role}) id=${id}`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
