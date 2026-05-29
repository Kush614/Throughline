import { notFound } from 'next/navigation';
import { LivingDoc } from '@/app/doc-minimal/_components/LivingDoc';
import { getOrg } from '@/lib/orgs';
import '@/app/workstation/workstation.css';
import '@/app/doc-minimal/doc-minimal.css';

export const dynamic = 'force-dynamic';

export default async function OrgWorkstationPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();

  return (
    <div className="workstation-root doc-minimal-workstation">
      <LivingDoc
        mode="blank"
        storageNamespace={`neverzero.${org.slug}.workstation`}
        workspaceName={org.name}
        projectName={org.name}
        docName="Workstation"
        fileTreeTitle={`${org.name} Workstation`}
        createdBy={org.name}
        createdLabel="blank doc"
      />
    </div>
  );
}
