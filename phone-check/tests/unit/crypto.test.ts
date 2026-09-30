import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  blindIndex,
  decrypt,
  decryptBuffer,
  encrypt,
  encryptBuffer,
  hashPassword,
  resetKeyring,
  verifyPassword,
} from '@/server/crypto';
import { resetEnvCache } from '@/server/env';

describe('шифрование', () => {
  afterEach(() => {
    resetEnvCache();
    resetKeyring();
  });

  it('шифрует и расшифровывает строки, каждый раз с новым IV', () => {
    const a = encrypt('Шевченко Олена');
    const b = encrypt('Шевченко Олена');
    expect(a).not.toBe(b);
    expect(a).not.toContain('Шевченко');
    expect(a.startsWith('v1:')).toBe(true);
    expect(decrypt(a)).toBe('Шевченко Олена');
  });

  it('обнаруживает подмену шифротекста (GCM)', () => {
    const token = encrypt('secret');
    const raw = Buffer.from(token.slice(3), 'base64');
    raw[raw.length - 1]! ^= 1;
    expect(() => decrypt(`v1:${raw.toString('base64')}`)).toThrow();
  });

  it('шифрует бинарные файлы', () => {
    const data = randomBytes(10_000);
    expect(decryptBuffer(encryptBuffer(data)).equals(data)).toBe(true);
  });

  it('поддерживает ротацию ключей: старые данные читаются, новые пишутся новым ключом', () => {
    const oldKey = process.env.DATA_ENCRYPTION_KEY!;
    const legacy = encrypt('старые данные');
    process.env.DATA_ENCRYPTION_KEYS_OLD = `v1:${oldKey}`;
    process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    process.env.DATA_ENCRYPTION_KEY_VERSION = 'v2';
    resetEnvCache();
    resetKeyring();
    try {
      expect(decrypt(legacy)).toBe('старые данные');
      expect(encrypt('новое').startsWith('v2:')).toBe(true);
    } finally {
      process.env.DATA_ENCRYPTION_KEY = oldKey;
      process.env.DATA_ENCRYPTION_KEY_VERSION = 'v1';
      delete process.env.DATA_ENCRYPTION_KEYS_OLD;
    }
  });

  it('слепой индекс детерминирован и не раскрывает номер', () => {
    expect(blindIndex('+380671234567').equals(blindIndex('+380671234567'))).toBe(true);
    expect(blindIndex('+380671234567').equals(blindIndex('+380671234568'))).toBe(false);
    expect(blindIndex('+380671234567').toString('hex')).not.toContain('380671234567');
  });
});

describe('пароли', () => {
  it('scrypt-хеш проверяется только верным паролем', async () => {
    const hash = await hashPassword('correct horse 42');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse 42', hash)).toBe(true);
    expect(await verifyPassword('wrong horse 42', hash)).toBe(false);
    expect(await verifyPassword('x', 'garbage')).toBe(false);
  });
});
