import path from 'node:path';
import pg from 'pg';
import { migrate } from '../../src/server/migrate';

/** Чистая схема перед прогоном: интеграционные тесты работают с настоящей PostgreSQL. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://app:app@localhost:5432/phonecheck_test';
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS pgboss CASCADE; CREATE SCHEMA public;');
  await client.end();
  await migrate(url, path.resolve(__dirname, '../../db/migrations'), () => {});
}
