import { createCipheriv, createDecipheriv, createHmac, randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { env } from './env';

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

type Keyring = { current: string; keys: Map<string, Buffer> };
let ring: Keyring | undefined;

function keyring(): Keyring {
  if (ring) return ring;
  const e = env();
  const keys = new Map<string, Buffer>();
  for (const pair of e.DATA_ENCRYPTION_KEYS_OLD.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [version, b64] = pair.split(':');
    const key = Buffer.from(b64 ?? '', 'base64');
    if (!version || key.length !== 32) throw new Error('DATA_ENCRYPTION_KEYS_OLD: expected "vN:BASE64" entries');
    keys.set(version, key);
  }
  keys.set(e.DATA_ENCRYPTION_KEY_VERSION, Buffer.from(e.DATA_ENCRYPTION_KEY, 'base64'));
  ring = { current: e.DATA_ENCRYPTION_KEY_VERSION, keys };
  return ring;
}

export function resetKeyring() {
  ring = undefined;
}

function encryptRaw(plain: Buffer): { version: string; payload: Buffer } {
  const { current, keys } = keyring();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keys.get(current)!, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return { version: current, payload: Buffer.concat([iv, cipher.getAuthTag(), body]) };
}

function decryptRaw(version: string, payload: Buffer): Buffer {
  const key = keyring().keys.get(version);
  if (!key) throw new Error(`Unknown encryption key version ${version}`);
  const decipher = createDecipheriv('aes-256-gcm', key, payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]);
}

/** Шифрует строку в формат "v1:base64(iv|tag|ciphertext)". */
export function encrypt(plain: string): string {
  const { version, payload } = encryptRaw(Buffer.from(plain, 'utf8'));
  return `${version}:${payload.toString('base64')}`;
}

export function encryptNullable(plain: string | null | undefined): string | null {
  return plain == null || plain === '' ? null : encrypt(plain);
}

export function decrypt(token: string): string {
  const idx = token.indexOf(':');
  if (idx < 0) throw new Error('Malformed ciphertext');
  return decryptRaw(token.slice(0, idx), Buffer.from(token.slice(idx + 1), 'base64')).toString('utf8');
}

export function decryptNullable(token: string | null | undefined): string | null {
  return token == null ? null : decrypt(token);
}

/** Шифрование бинарных данных (загруженные файлы): [len(version)][version][payload]. */
export function encryptBuffer(plain: Buffer): Buffer {
  const { version, payload } = encryptRaw(plain);
  const v = Buffer.from(version, 'utf8');
  return Buffer.concat([Buffer.from([v.length]), v, payload]);
}

export function decryptBuffer(data: Buffer): Buffer {
  const len = data[0]!;
  return decryptRaw(data.subarray(1, 1 + len).toString('utf8'), data.subarray(1 + len));
}

/** Слепой индекс: детерминированный HMAC для поиска без расшифровки. */
export function blindIndex(value: string): Buffer {
  return createHmac('sha256', Buffer.from(env().BLIND_INDEX_KEY, 'base64')).update(value, 'utf8').digest();
}

export function sha256(value: string | Buffer): Buffer {
  return createHash('sha256').update(value).digest();
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

// Пароли: scrypt, формат scrypt$N$r$p$salt$hash
const SCRYPT = { N: 1 << 15, r: 8, p: 1, keylen: 64 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, hashB64] = stored.split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
