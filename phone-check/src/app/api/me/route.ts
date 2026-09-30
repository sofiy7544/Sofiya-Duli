import { NextResponse } from 'next/server';
import { ALL_ROLES, route } from '@/server/http/route';

export const GET = route(ALL_ROLES, async ({ user }) => NextResponse.json({ user }));
