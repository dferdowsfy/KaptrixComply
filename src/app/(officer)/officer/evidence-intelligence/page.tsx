import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Badge } from '@/design-system';
import { listOfficerEngagements } from '@/lib/compliance/queries';
import { OfficerUploadEvidenceClient } from '@/components/compliance/OfficerUploadEvidenceClient';

export default async function EvidenceIntelligenceIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listOfficerEngagements(user.id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Evidence Intelligence"
        subtitle="AI-extracted answers mapped to questions with evidence, confidence, and rationale."
        breadcrumbs={[
          { label: 'Dashboard', href: '/officer/dashboard' },
          { label: 'Evidence Intelligence' },
        ]}
      />

      <OfficerUploadEvidenceClient engagements={engagements} size="lg" />

      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Pick an engagement</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Evidence Intelligence is scoped to a single vendor engagement so we can show the answer, evidence, and rationale together.
          </p>
        </div>

        {engagements.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-500 mb-2">No engagements yet.</p>
            <Link href="/officer/vendors" className="text-sm text-primary-500 hover:underline font-medium">
              Start a vendor assessment →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {engagements.map(eng => {
              const vendorName = eng.vendor_company ?? eng.vendor_email ?? 'Unnamed Vendor';
              return (
                <li key={eng.id}>
                  <Link
                    href={`/officer/engagements/${eng.id}/evidence-intelligence`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0 text-primary-600">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{vendorName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="framework" framework={eng.framework_id as 'soc2' | 'vdd' | 'financial_controls' | 'agnostic'} />
                        <Badge variant="status" status={eng.status === 'in_review' ? 'info' : eng.status === 'completed' ? 'success' : 'neutral'}>
                          {eng.status === 'in_review' ? 'In Progress' : eng.status === 'completed' ? 'Completed' : 'Draft'}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {eng.created_at
                        ? `Started ${new Date(eng.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : ''}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-gray-500 shrink-0" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
