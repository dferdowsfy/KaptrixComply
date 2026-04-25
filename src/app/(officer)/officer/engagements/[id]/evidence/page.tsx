import { redirect } from 'next/navigation';

interface PageProps { params: Promise<{ id: string }> }

// The standalone Evidence list is now part of Evidence Intelligence (Documents view).
export default async function LegacyEvidencePage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/officer/engagements/${id}/evidence-intelligence`);
}
