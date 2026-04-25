import { redirect } from 'next/navigation';

interface PageProps { params: Promise<{ id: string }> }

// Evidence Mapping is now folded into Evidence Intelligence per engagement.
export default async function LegacyEvidenceMappingPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/officer/engagements/${id}/evidence-intelligence`);
}
