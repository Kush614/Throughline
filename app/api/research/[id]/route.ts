import { NextResponse } from 'next/server';
import { getResearch } from '@/lib/research';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = await getResearch(id);
  if (!rec) return NextResponse.json({ error: 'Research not found' }, { status: 404 });
  return NextResponse.json({ research: rec });
}
