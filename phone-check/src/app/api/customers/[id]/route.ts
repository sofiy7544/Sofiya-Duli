import { NextResponse } from 'next/server';
import { pool } from '@/server/db';
import { ALL_ROLES, route, uuidParam, WRITERS } from '@/server/http/route';
import { loadCustomerDetail, updateCustomer } from '@/server/services/customers';
import { writeAudit } from '@/server/services/audit';

type P = { id: string };

export const GET = route<P>(ALL_ROLES, async ({ params, audit }) => {
  const customer = await loadCustomerDetail(pool(), uuidParam(params.id, 'Клиент'));
  await writeAudit(pool(), audit, { action: 'customer.viewed', entityType: 'customer', entityId: customer.id, details: { customerRef: customer.customerRef } });
  return NextResponse.json({ customer });
});

export const PATCH = route<P>(WRITERS, async ({ req, params, audit }) => {
  const result = await updateCustomer(uuidParam(params.id, 'Клиент'), await req.json(), audit);
  return NextResponse.json(result);
});
