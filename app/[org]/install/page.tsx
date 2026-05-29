import { notFound } from 'next/navigation';
import { getOrg } from '@/lib/orgs';
import { InstallApp } from '@/app/install/page';

export default async function OrgInstallPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();
  return <InstallApp orgSlug={org.slug} />;
}
