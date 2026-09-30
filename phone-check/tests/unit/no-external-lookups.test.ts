import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Гарантия политики: приложение не ходит во внешние сервисы (Facebook/Meta, мессенджеры,
 * сервисы «пробива» номеров). Серверный код не делает исходящих HTTP-запросов.
 */
async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)])));
  return nested.flat().filter((f) => /\.(ts|tsx)$/.test(f));
}

describe('нет внешних запросов', () => {
  it('в src нет fetch/http-клиентов к внешним адресам', async () => {
    const src = path.resolve(__dirname, '../../src');
    const offenders: string[] = [];
    for (const f of await files(src)) {
      const text = await readFile(f, 'utf8');
      const rel = path.relative(src, f);
      if (/from ['"](axios|got|node-fetch|undici|puppeteer|playwright|cheerio)['"]/.test(text)) offenders.push(`${rel}: http/scraping library`);
      if (/from ['"]node:(http|https)['"]|require\(['"](http|https)['"]\)/.test(text)) offenders.push(`${rel}: node http client`);
      for (const m of text.matchAll(/fetch\(\s*[`'"]([^`'"]+)/g)) {
        if (!m[1]!.startsWith('/')) offenders.push(`${rel}: fetch(${m[1]})`);
      }
      if (/graph\.facebook\.com|api\.telegram\.org/.test(text)) offenders.push(`${rel}: external API host`);
    }
    expect(offenders).toEqual([]);
  });
});
