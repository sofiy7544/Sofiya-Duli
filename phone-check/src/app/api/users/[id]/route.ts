import { NextResponse } from 'next/server';
import { ADMINS, route, uuidParam } from '@/server/http/route';
import { updateUser } from '@/server/services/users';

export const PATCH = route<{ id: string }>(ADMINS, async ({ req, params, audit }) =>
  NextResponse.json(await updateUser(uuidParam(params.id, 'Пользователь'), await req.json(), audit)),
);
