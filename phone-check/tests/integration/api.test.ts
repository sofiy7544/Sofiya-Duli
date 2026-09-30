import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { closePool, pool } from '@/server/db';
import { CHECK_CSV, createTestUser, PASSWORD, seedCrm } from './helpers';

// Очередь в тестах: задание выполняется сразу, без pg-boss
vi.mock('@/server/queue', async () => {
  const { processBatch } = await import('@/server/services/batches');
  return { enqueueBatch: (id: string) => processBatch(id) };
});

const { POST: loginRoute } = await import('@/app/api/auth/login/route');
const { POST: logoutRoute } = await import('@/app/api/auth/logout/route');
const { GET: listBatchesRoute, POST: uploadRoute } = await import('@/app/api/batches/route');
const { GET: resultsRoute } = await import('@/app/api/batches/[id]/results/route');
const { GET: exportRoute } = await import('@/app/api/batches/[id]/export/route');
const { POST: reviewRoute } = await import('@/app/api/results/[id]/review/route');
const { GET: auditRoute } = await import('@/app/api/audit/route');
const { POST: createUserRoute } = await import('@/app/api/users/route');
const { PATCH: patchUserRoute } = await import('@/app/api/users/[id]/route');

const BASE = 'http://phonecheck.test';
const sameOrigin = { origin: BASE, host: 'phonecheck.test' };

function req(path: string, init: { method?: string; token?: string; json?: unknown; body?: BodyInit; headers?: Record<string, string> } = {}) {
  const headers = new Headers({ host: 'phonecheck.test', 'x-forwarded-for': '10.1.2.3', ...init.headers });
  if (init.token) headers.set('cookie', `pc_session=${init.token}`);
  if (init.json !== undefined) headers.set('content-type', 'application/json');
  return new NextRequest(`${BASE}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
}
const params = <T,>(p: T) => ({ params: Promise.resolve(p) });
const noParams = params({} as Record<string, never>);

async function loginAs(email: string, password = PASSWORD) {
  const res = await loginRoute(req('/api/auth/login', { method: 'POST', json: { email, password }, headers: sameOrigin }));
  const cookie = res.headers.get('set-cookie') ?? '';
  return { res, token: /pc_session=([^;]+)/.exec(cookie)?.[1], cookie };
}

function uploadReq(token: string, csv = CHECK_CSV, headers: Record<string, string> = sameOrigin) {
  const form = new FormData();
  form.append('file', new File([csv], 'today.csv', { type: 'text/csv' }));
  return req('/api/batches', { method: 'POST', token, body: form, headers });
}

let admin: { email: string; id: string };
let manager: { email: string; id: string };
let viewer: { email: string; id: string };
let adminToken: string;
let managerToken: string;
let viewerToken: string;

beforeAll(async () => {
  await seedCrm();
  admin = await createTestUser('admin');
  manager = await createTestUser('manager');
  viewer = await createTestUser('viewer');
  adminToken = (await loginAs(admin.email)).token!;
  managerToken = (await loginAs(manager.email)).token!;
  viewerToken = (await loginAs(viewer.email)).token!;
});
afterAll(() => closePool());

describe('аутентификация', () => {
  it('ставит HttpOnly cookie и хранит в БД только хеш токена', async () => {
    const { res, token, cookie } = await loginAs(manager.email);
    expect(res.status).toBe(200);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    const { rows } = await pool().query(`SELECT token_hash FROM sessions`);
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it('без сессии — 401', async () => {
    expect((await listBatchesRoute(req('/api/batches'), noParams)).status).toBe(401);
  });

  it('блокирует перебор пароля после 5 неудач', async () => {
    const victim = await createTestUser('viewer');
    for (let i = 0; i < 5; i++) expect((await loginAs(victim.email, 'wrong-password-1')).res.status).toBe(401);
    expect((await loginAs(victim.email)).res.status).toBe(429);
    const { rows } = await pool().query(`SELECT count(*) AS n FROM audit_log WHERE action = 'auth.login_failed' AND details->>'email' = $1`, [victim.email]);
    expect(rows[0].n).toBe(5);
  });

  it('выход завершает сессию', async () => {
    const { token } = await loginAs(viewer.email);
    expect((await logoutRoute(req('/api/auth/logout', { method: 'POST', token, headers: sameOrigin }))).status).toBe(200);
    expect((await listBatchesRoute(req('/api/batches', { token }), noParams)).status).toBe(401);
  });
});

describe('CSRF', () => {
  it('отклоняет изменяющий запрос с чужого origin', async () => {
    const res = await uploadRoute(uploadReq(managerToken, CHECK_CSV, { origin: 'https://evil.example', host: 'phonecheck.test' }), noParams);
    expect(res.status).toBe(403);
  });
  it('отклоняет запрос без Origin и без Sec-Fetch-Site', async () => {
    const res = await uploadRoute(uploadReq(managerToken, CHECK_CSV, { host: 'phonecheck.test' }), noParams);
    expect(res.status).toBe(403);
  });
});

describe('роли и сквозной сценарий', () => {
  let batchId: string;

  it('Viewer не может загружать файлы', async () => {
    expect((await uploadRoute(uploadReq(viewerToken), noParams)).status).toBe(403);
  });

  it('Manager загружает файл и получает результат', async () => {
    const res = await uploadRoute(uploadReq(managerToken), noParams);
    expect(res.status).toBe(201);
    batchId = (await res.json()).id;
    const results = await resultsRoute(req(`/api/batches/${batchId}/results?limit=50&status=exact_match`, { token: viewerToken }), params({ id: batchId }));
    expect(results.status).toBe(200);
    const body = await results.json();
    expect(body.total).toBe(2);
    expect(results.headers.get('cache-control')).toBe('no-store');
  });

  it('некорректный id — 404, а не 500', async () => {
    const res = await resultsRoute(req(`/api/batches/not-a-uuid/results`, { token: managerToken }), params({ id: 'not-a-uuid' }));
    expect(res.status).toBe(404);
  });

  it('Viewer не может экспортировать и подтверждать', async () => {
    expect((await exportRoute(req(`/api/batches/${batchId}/export`, { token: viewerToken }), params({ id: batchId }))).status).toBe(403);
    const row = (await (await resultsRoute(req(`/api/batches/${batchId}/results?status=needs_review`, { token: viewerToken }), params({ id: batchId }))).json()).rows[0];
    const res = await reviewRoute(req(`/api/results/${row.id}/review`, { method: 'POST', token: viewerToken, json: { decision: 'reject' }, headers: sameOrigin }), params({ id: row.id }));
    expect(res.status).toBe(403);
  });

  it('Manager экспортирует XLSX, экспорт попадает в аудит', async () => {
    const res = await exportRoute(req(`/api/batches/${batchId}/export`, { token: managerToken }), params({ id: batchId }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('spreadsheetml');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 2).toString()).toBe('PK');
    const { rows } = await pool().query(`SELECT actor_email FROM audit_log WHERE action = 'batch.exported' AND entity_id = $1`, [batchId]);
    expect(rows[0].actor_email).toBe(manager.email);
  });

  it('журнал аудита доступен только Admin', async () => {
    expect((await auditRoute(req('/api/audit', { token: managerToken }), noParams)).status).toBe(403);
    const res = await auditRoute(req(`/api/audit?entityId=${batchId}`, { token: adminToken }), noParams);
    expect(res.status).toBe(200);
    const { entries } = await res.json();
    expect(entries.map((e: { action: string }) => e.action)).toEqual(expect.arrayContaining(['batch.uploaded', 'batch.processed', 'batch.exported']));
  });
});

describe('управление пользователями', () => {
  it('Admin создаёт пользователя; слабый пароль отклоняется', async () => {
    const weak = await createUserRoute(req('/api/users', { method: 'POST', token: adminToken, headers: sameOrigin, json: { email: 'new@test.local', name: 'New', role: 'manager', password: 'short' } }), noParams);
    expect(weak.status).toBe(400);
    const ok = await createUserRoute(
      req('/api/users', { method: 'POST', token: adminToken, headers: sameOrigin, json: { email: 'new@test.local', name: 'New', role: 'manager', password: 'long-enough-pass-1' } }),
      noParams,
    );
    expect(ok.status).toBe(201);
  });

  it('Manager не может создавать пользователей', async () => {
    const res = await createUserRoute(req('/api/users', { method: 'POST', token: managerToken, headers: sameOrigin, json: {} }), noParams);
    expect(res.status).toBe(403);
  });

  it('смена роли завершает сессии пользователя', async () => {
    const u = await createTestUser('manager');
    const { token } = await loginAs(u.email);
    const res = await patchUserRoute(req(`/api/users/${u.id}`, { method: 'PATCH', token: adminToken, headers: sameOrigin, json: { role: 'viewer' } }), params({ id: u.id }));
    expect(res.status).toBe(200);
    expect((await listBatchesRoute(req('/api/batches', { token }), noParams)).status).toBe(401);
  });

  it('Admin не может заблокировать сам себя', async () => {
    const res = await patchUserRoute(req(`/api/users/${admin.id}`, { method: 'PATCH', token: adminToken, headers: sameOrigin, json: { isActive: false } }), params({ id: admin.id }));
    expect(res.status).toBe(400);
  });
});
