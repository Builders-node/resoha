import { NextResponse } from 'next/server';
import { agencyBoard, listAgents } from '@/lib/db';

export async function GET() {
  const [items, board] = await Promise.all([listAgents(), agencyBoard()]);
  return NextResponse.json({ items, board });
}
