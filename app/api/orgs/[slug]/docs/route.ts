import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { createDoc, ensureBrainRoot, getDoc, listDocs } from '@/lib/docs';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  // Make sure the brain root exists so callers can always reference it.
  const root = await ensureBrainRoot(org.slug);

  const url = new URL(req.url);
  const parentParam = url.searchParams.get('parent');
  const docs = await listDocs({
    orgSlug: org.slug,
    parentId: parentParam === null ? undefined : parentParam === '' ? null : parentParam,
  });

  return NextResponse.json({ root, docs });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const root = await ensureBrainRoot(org.slug);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawTitle = typeof body.title === 'string' ? body.title : '';
  const title = rawTitle.replace(/\s+/g, ' ').trim();
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const requestedParentId = typeof body.parentId === 'string' && body.parentId.trim()
    ? body.parentId.trim()
    : root.id;
  const parent = await getDoc(requestedParentId);
  if (!parent || parent.orgSlug !== org.slug) {
    return NextResponse.json({ error: 'Parent doc not found' }, { status: 400 });
  }

  const content = typeof body.content === 'string' ? body.content : '';
  const createdBy = typeof body.createdBy === 'string' && body.createdBy.trim()
    ? body.createdBy.trim()
    : 'user';

  const doc = await createDoc({
    orgSlug: org.slug,
    parentId: parent.id,
    title,
    kind: 'subfile',
    content,
    createdBy,
  });

  return NextResponse.json({ doc }, { status: 201 });
}
