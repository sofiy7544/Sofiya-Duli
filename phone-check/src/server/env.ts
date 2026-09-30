import { z } from 'zod';

const key32 = z
  .string({ message: 'required' })
  .min(1, 'required')
  .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes in base64 (openssl rand -base64 32)');

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DATA_ENCRYPTION_KEY: key32,
  DATA_ENCRYPTION_KEY_VERSION: z.string().regex(/^v\d+$/).default('v1'),
  DATA_ENCRYPTION_KEYS_OLD: z.string().optional().default(''),
  BLIND_INDEX_KEY: key32,
  DEFAULT_REGION: z.string().length(2).toUpperCase().default('UA'),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(49).default(25),
  MAX_ROWS: z.coerce.number().int().positive().default(200_000),
  UPLOAD_BLOB_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  RESULT_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Конфигурация читается лениво, чтобы `next build` не требовал секретов. */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`Invalid configuration: ${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function resetEnvCache() {
  cached = undefined;
}
