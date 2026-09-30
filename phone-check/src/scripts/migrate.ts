import { migrate } from '@/server/migrate';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
migrate(url)
  .then(() => console.log('[migrate] done'))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
