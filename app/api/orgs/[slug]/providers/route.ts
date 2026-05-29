import { NextResponse } from 'next/server';
import { getOrg, setOrgProviders, type OrgProviderId } from '@/lib/orgs';
import { PROVIDER_LABELS, type ProviderId } from '@/lib/providers';

export const dynamic = 'force-dynamic';

const ALL: ProviderId[] = ['gbrain', 'gstack', 'zeroentropy', 'the-hog', 'lightsprint', 'neverzero'];

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  const installed = new Set(org.providers ?? []);
  const available = ALL.map((p) => ({
    id: p,
    label: PROVIDER_LABELS[p].name,
    tagline: PROVIDER_LABELS[p].tagline,
    installed: installed.has(p),
  }));
  return NextResponse.json({ installed: Array.from(installed), available });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const wantInstall = body.install;
  const wantUninstall = body.uninstall;
  const replaceAll = body.providers;

  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  let next: ProviderId[];
  if (Array.isArray(replaceAll)) {
    next = (replaceAll as string[]).filter((p): p is ProviderId => ALL.includes(p as ProviderId));
  } else {
    const set = new Set<ProviderId>((org.providers ?? []) as ProviderId[]);
    if (Array.isArray(wantInstall)) {
      for (const p of wantInstall as string[]) if (ALL.includes(p as ProviderId)) set.add(p as ProviderId);
    }
    if (typeof wantInstall === 'string' && ALL.includes(wantInstall as ProviderId)) set.add(wantInstall as ProviderId);
    if (Array.isArray(wantUninstall)) {
      for (const p of wantUninstall as string[]) set.delete(p as ProviderId);
    }
    if (typeof wantUninstall === 'string') set.delete(wantUninstall as ProviderId);
    next = Array.from(set);
  }

  const updated = await setOrgProviders(slug, next as OrgProviderId[]);
  return NextResponse.json({ installed: updated ?? [] });
}
