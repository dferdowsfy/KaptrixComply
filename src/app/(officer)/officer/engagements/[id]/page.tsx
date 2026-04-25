import React from 'react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import {
  Upload,
  ScanSearch,
  AlertCircle,
  ShieldCheck,
  FileCheck,
  History,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  getEngagement,
  getEngagementContext,
} from '@/lib/compliance/queries';
import { EngagementContextHeader } from '@/components/officer/EngagementContextHeader';
import { OfficerUploadEvidenceClient } from '@/components/compliance/OfficerUploadEvidenceClient';
import { getFramework } from '@/lib/scoring/frameworks';
import type { FrameworkId } from '@/lib/scoring/frameworks';

interface PageProps { params: Promise<{ id: string }> }

const QUICK_LINKS = [
  { href: 'evidence-intelligence', label: 'Evidence Intelligence', description: 'Answers, evidence, confidence',  icon: ScanSearch },
  { href: 'gaps',                  label: 'Gap Review',            description: 'Missing & weak evidence',        icon: AlertCircle },
  { href: 'risk-score',            label: 'Risk Score',            description: 'Score breakdown & decision',     icon: ShieldCheck },
  { href: 'report',                label: 'Report',                description: 'Generate the diligence report',  icon: FileCheck },
  { href: 'audit-trail',           label: 'Audit Trail',           description: 'Activity & changes',             icon: History },
] as const;

export default async function EngagementWorkspacePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagement = await getEngagement(id);
  if (!engagement) notFound();

  const { orgName, workflow } = await getEngagementContext(engagement, user.id);
  let frameworkLabel: string = engagement.framework_id;
  let frameworkDescription = '';
  try {
    const fw = getFramework(engagement.framework_id as FrameworkId);
    frameworkLabel = fw.label;
    frameworkDescription = fw.description;
  } catch { /* unknown framework */ }

  const engagementName =
    engagement.engagement_name?.trim() ||
    engagement.vendor_company?.trim() ||
    engagement.vendor_email?.trim() ||
    'Untitled engagement';

  const next = workflow.nextStep;

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-500" aria-label="Breadcrumb">
        <Link href="/officer/dashboard" className="hover:text-gray-700">Dashboard</Link>
        <ChevronRight size={12} className="text-gray-300" aria-hidden="true" />
        <Link href="/officer/engagements" className="hover:text-gray-700">Engagements</Link>
        <ChevronRight size={12} className="text-gray-300" aria-hidden="true" />
        <span className="text-gray-700">{engagementName}</span>
      </nav>

      <EngagementContextHeader
        engagement={engagement}
        orgName={orgName}
        workflow={workflow}
      />

      {/* Next step callout */}
      {next && (
        <section className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-5 flex flex-wrap items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0">
            <ArrowRight size={18} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-700">Next up</p>
            <h3 className="text-base font-semibold text-gray-900 mt-0.5">{next.label}</h3>
            <p className="text-sm text-gray-600 mt-1">{next.hint ?? next.description}</p>
          </div>
          <Link
            href={next.href}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
          >
            Continue
            <ChevronRight size={14} />
          </Link>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: upload evidence */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Upload size={16} className="text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-900">Upload evidence</h3>
            </div>
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
              hint="Drop a PDF, Word, or spreadsheet. The AI extracts answers and maps them to the questionnaire."
            />
          </section>

          {/* Quick links */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Jump to</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUICK_LINKS.map(link => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={`/officer/engagements/${id}/${link.href}`}
                    className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-primary-300 hover:shadow-sm transition-all"
                  >
                    <div className="h-9 w-9 rounded-lg bg-gray-50 group-hover:bg-primary-50 flex items-center justify-center shrink-0 transition-colors">
                      <Icon size={16} className="text-gray-500 group-hover:text-primary-600 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{link.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-primary-500 mt-1 shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right: engagement details */}
        <aside className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Engagement details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Vendor</dt>
                <dd className="text-gray-900 mt-0.5">{engagement.vendor_company ?? engagement.vendor_email ?? '—'}</dd>
              </div>
              {engagement.vendor_email && engagement.vendor_company && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Email</dt>
                  <dd className="text-gray-700 mt-0.5">{engagement.vendor_email}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Framework</dt>
                <dd className="text-gray-900 mt-0.5">{frameworkLabel}</dd>
                {frameworkDescription && (
                  <p className="text-xs text-gray-500 mt-1 leading-snug">{frameworkDescription}</p>
                )}
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Due date</dt>
                <dd className="text-gray-900 mt-0.5">
                  {engagement.due_date
                    ? new Date(engagement.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : <span className="text-gray-400">Not set</span>}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Started</dt>
                <dd className="text-gray-700 mt-0.5">
                  {new Date(engagement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </dd>
              </div>
              {engagement.notes && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Notes</dt>
                  <dd className="text-gray-700 mt-0.5 whitespace-pre-wrap leading-snug">{engagement.notes}</dd>
                </div>
              )}
            </dl>
          </section>

          <Link
            href="/officer/methodology"
            className="block rounded-2xl border border-gray-200 bg-white p-4 hover:border-primary-300 hover:shadow-sm transition-all"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Reference</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">Framework methodology</p>
            <p className="text-xs text-gray-500 mt-1">See how Kaptrix scores this framework — weights, thresholds, decision rules.</p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
