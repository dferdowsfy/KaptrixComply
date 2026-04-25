import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/design-system';
import { getEngagement, getEngagementContext, getEvidenceIntelligence } from '@/lib/compliance/queries';
import { OfficerUploadEvidenceClient } from '@/components/compliance/OfficerUploadEvidenceClient';
import {
  EvidenceIntelligenceClient,
  HeaderActions,
} from '@/components/compliance/EvidenceIntelligenceClient';
import { EngagementContextHeader } from '@/components/officer/EngagementContextHeader';

interface PageProps { params: Promise<{ id: string }> }

export default async function EvidenceIntelligencePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagement = await getEngagement(id);
  if (!engagement) notFound();

  const [data, context] = await Promise.all([
    getEvidenceIntelligence(engagement.id, engagement.template_id),
    getEngagementContext(engagement, user.id),
  ]);

  const vendorLabel = engagement.vendor_company ?? engagement.vendor_email ?? 'this engagement';

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <EngagementContextHeader
        engagement={engagement}
        orgName={context.orgName}
        workflow={context.workflow}
        activeStepKey="extraction"
      />
      <PageHeader
        title="Evidence Intelligence"
        subtitle="AI-extracted answers mapped to questions with evidence, confidence, and rationale."
        breadcrumbs={[
          { label: 'Engagements', href: '/officer/engagements' },
          { label: 'Workspace', href: `/officer/engagements/${id}` },
          { label: 'Evidence Intelligence' },
        ]}
        actions={<HeaderActions />}
      />

      <OfficerUploadEvidenceClient
        engagements={[{
          id: engagement.id,
          template_id: engagement.template_id,
          framework_id: engagement.framework_id,
          status: engagement.status,
          vendor_company: engagement.vendor_company,
          vendor_email: engagement.vendor_email,
          vendor_user_id: engagement.vendor_user_id,
        }]}
        size="md"
        hint="Drop a PDF, Word or spreadsheet. The AI extracts evidence and maps it to questionnaire answers."
      />

      <EvidenceIntelligenceClient
        vendorLabel={vendorLabel}
        data={data}
      />
    </div>
  );
}
