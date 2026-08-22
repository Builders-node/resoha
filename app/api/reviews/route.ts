import { NextResponse } from 'next/server';
import { createReview, listReviews } from '@/lib/db';
import { currentUser } from '@/lib/session';

export async function GET(req: Request) {
  const agentId = new URL(req.url).searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  return NextResponse.json({ items: await listReviews(agentId) });
}

/** Один відгук на ріелтора від акаунта; повторний — оновлює попередній. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to leave a review' }, { status: 401 });

  const { agentId, rating, body } = await req.json().catch(() => ({}));
  const value = Number(rating);
  if (!agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  if (!(value >= 1 && value <= 5)) return NextResponse.json({ error: 'Rating must be 1 to 5' }, { status: 400 });
  if (agentId === user.id) return NextResponse.json({ error: 'You cannot review yourself' }, { status: 400 });

  const review = await createReview({ agentId, authorId: user.id, rating: value, body: body ?? '' });
  if (!review) return NextResponse.json({ error: 'Could not save the review' }, { status: 400 });
  return NextResponse.json({ review }, { status: 201 });
}
