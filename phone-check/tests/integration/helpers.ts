import { pool } from '@/server/db';
import { hashPassword } from '@/server/crypto';
import { upsertCrmCustomer, type CrmCustomerInput } from '@/server/services/customers';
import type { Role, SessionUser } from '@/lib/types';

export const PASSWORD = 'test-Passw0rd-123';
let passwordHash: Promise<string> | undefined;

export async function createTestUser(role: Role, email = `${role}-${Math.random().toString(36).slice(2, 8)}@test.local`): Promise<SessionUser> {
  passwordHash ??= hashPassword(PASSWORD);
  const { rows } = await pool().query(
    `INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role`,
    [email, `Test ${role}`, role, await passwordHash],
  );
  return rows[0];
}

/** Небольшая CRM с предсказуемыми случаями. */
export const CRM: CrmCustomerInput[] = [
  {
    customerRef: 'T-001',
    fullName: 'Коваленко Олена',
    email: 'olena@example.com',
    source: 'POS',
    consentStatus: 'granted',
    consentAt: '2025-03-14T10:00:00Z',
    phones: [{ phone: '+380671111111', isVerified: true }],
    channels: [
      { channel: 'facebook', value: 'https://www.facebook.com/olena.k', consentStatus: 'granted', consentAt: '2025-03-14T10:00:00Z' },
      { channel: 'telegram', value: '@olena_k', consentStatus: 'granted' },
      { channel: 'whatsapp', value: '+380671111111', consentStatus: 'withdrawn' },
    ],
  },
  { customerRef: 'T-002', fullName: 'Шевченко Андрій', source: 'Сайт', phones: [{ phone: '+380672222222', isVerified: false }] },
  { customerRef: 'T-003', fullName: 'Бондаренко Ірина', source: 'POS', phones: [{ phone: '+380673333333', isVerified: true }] },
  { customerRef: 'T-004', fullName: 'Бондаренко Максим', source: 'POS', phones: [{ phone: '+380673333333', isVerified: true }] },
  { customerRef: 'T-005', fullName: 'Мельник Юлія', source: 'POS', phones: [{ phone: '+380675555555', isVerified: true, isActive: false }] },
  { customerRef: 'T-006', fullName: 'Олійник Роман', source: 'POS', status: 'deleted', phones: [{ phone: '+380676666666', isVerified: true }] },
  { customerRef: 'T-007', fullName: 'Nowak Anna', source: 'Сайт', phones: [{ phone: '+48512345678', isVerified: true }] },
];

let seeded = false;
export async function seedCrm() {
  if (seeded) return;
  for (const c of CRM) await upsertCrmCustomer(pool(), c);
  seeded = true;
}

export async function customerIdByRef(ref: string): Promise<string> {
  const { rows } = await pool().query(`SELECT id FROM customers WHERE customer_ref = $1`, [ref]);
  return rows[0].id;
}

export const CHECK_CSV = [
  'Дата;Телефон',
  '30.09;+380 67 111 11 11', // T-001 exact
  '30.09;067 111 11 11', // дубликат T-001 в национальном формате
  '30.09;380672222222', // T-002 не подтверждён → review
  '30.09;+380673333333', // T-003 + T-004 → multiple
  '30.09;0675555555', // T-005 неактуальный → review
  '30.09;+380676666666', // удалённый клиент → not found
  '30.09;+380679999999', // нет в CRM
  '30.09;12345', // невалидный
  '30.09;0048 512 345 678', // T-007 exact
  '30.09;',
].join('\n');
