import { createHash } from 'node:crypto';

// Фиксированные тестовые ключи: БД общая для всех тестовых файлов прогона. Реальные ключи в тестах не используются.
const testKey = (label: string) => createHash('sha256').update(`phone-check-test:${label}`).digest('base64');

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://app:app@localhost:5432/phonecheck_test';
process.env.DATA_ENCRYPTION_KEY = testKey('data');
process.env.BLIND_INDEX_KEY = testKey('blind-index');
process.env.DATA_ENCRYPTION_KEY_VERSION = 'v1';
process.env.DEFAULT_REGION = 'UA';
process.env.MAX_ROWS = '5000';
process.env.MAX_UPLOAD_MB = '5';
