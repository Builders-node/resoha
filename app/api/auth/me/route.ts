import { NextResponse } from 'next/server';
import { currentUserWithAgency, toSession } from '@/lib/session';

export async function GET() {
  const { user, agency } = await currentUserWithAgency();
  return NextResponse.json({ session: user ? toSession(user) : null, agency });
}
