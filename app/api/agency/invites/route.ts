import { NextResponse } from 'next/server';
import { kickNotifications } from '@/lib/notify';
import { currentUser } from '@/lib/session';
import { inviteMember, listInvites } from '@/lib/team';
import { agencyCan, isAgencyRole } from '@/lib/teamRoles';

/** Запрошення активної команди — для власника й менеджера. */
export async function GET() {
  const user = await currentUser();
  if (!user?.agencyId || !agencyCan(user, 'team')) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: await listInvites(user.agencyId) });
}

/** Запросити колегу листом: {email, role}. Лист іде через чергу сповіщень. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const email = typeof b.email === 'string' ? b.email.trim().slice(0, 200) : '';
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
  const role = isAgencyRole(b.role) ? b.role : 'agent';
  const r = await inviteMember(email, role);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  kickNotifications();
  return NextResponse.json({ invite: r.invite }, { status: 201 });
}
