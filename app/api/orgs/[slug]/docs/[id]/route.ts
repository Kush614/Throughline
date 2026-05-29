import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { deleteDocTree, getDoc, updateDoc } from '@/lib/docs';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  const doc = await getDoc(id);
  if (!doc || doc.orgSlug !== org.slug) return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
  return NextResponse.json({ doc });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  const doc = await getDoc(id);
  if (!doc || doc.orgSlug !== org.slug) return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
  if (doc.kind === 'brain' && doc.parentId === null) {
    return NextResponse.json({ error: 'Root brain doc cannot be renamed here' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: { title?: string; content?: string } = {};
  if (typeof body.title === 'string') {
    const title = body.title.replace(/\s+/g, ' ').trim();
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    patch.title = title;
  }
  if (typeof body.content === 'string') patch.content = body.content;

  const updated = await updateDoc(id, patch);
  if (!updated) return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
  return NextResponse.json({ doc: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  const doc = await getDoc(id);
  if (!doc || doc.orgSlug !== org.slug) return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
  if (doc.kind === 'brain' && doc.parentId === null) {
    return NextResponse.json({ error: 'Root brain doc cannot be deleted' }, { status: 400 });
  }

  const deletedIds = await deleteDocTree(id);
  return NextResponse.json({ deletedIds });
}
