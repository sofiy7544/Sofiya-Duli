import { NextResponse } from 'next/server';
import { ADMINS, route } from '@/server/http/route';
import { createUser, listUsers } from '@/server/services/users';

export const GET = route(ADMINS, async () => NextResponse.json({ users: await listUsers() }));

export const POST = route(ADMINS, async ({ req, audit }) => NextResponse.json(await createUser(await req.json(), audit), { status: 201 }));
