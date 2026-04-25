import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Briefcase, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { listOfficerEngagements } from '@/lib/compliance/queries';
import { PageHeader, Badge } from '@/design-system';
import { getFramework } from '@/lib/scoring/frameworks';
import type { FrameworkId } from '@/lib/scoring/frameworks';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft:        { label: 'Draft',        className: 'bg-gray-100 text-gray-700 border-gray-200' },
  in_progress:  { label: 'In progress',  className: 'bg-primary-50 text-primary-700 border-primary-200' },
  pending:      { label: 'Pending',      className: 'bg-warning-50 text-warning-700 border-warning-200' },
  ready:        { label: 'Ready',        className: 'bg-success-50 text-success-700 border-success-200' },
  approved:     { label: 'Approved',     className: 'bg-success-50 text-success-700 border-success-200' },
  rejected:     { label: 'Rejected',     className: 'bg-danger-50 text-danger-700 border-danger-200' },
};

export default async function EngagementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listOfficerEngagements(user.id);

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <PageHeader
        title="Engagements"
        subtitle="Every vendor assessment in one place. Open one to see its workflow, evidence, and report."
        breadcrumbs={[
          { label: 'Dashboard', href: '/officer/dashboard' },
          { label: 'Engagements' },
        ]}
        actions={
          <Link
            href="/officer/vendors/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus size={14} />
            New Engagement
          </Link>
        }
      />

      {engagements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center mb-3">
            <Briefcase size={20} className="text-primary-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">No engagements yet</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
            Start a new engagement to bind a framework, collect evidence, and generate a risk-backed report.
          </p>
          <Link
            href="/officer/vendors/new"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus size={14} />
            Create your first engagement
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Engagement</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Framework</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Due</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Created</th>
                <th className="px-5 py-3" aria-label="Open" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {engagements.map(eng => {
                const name =
                  eng.engagement_name?.trim() ||
                  eng.vendor_company?.trim() ||
                  eng.vendor_email?.trim() ||
                  'Untitled engagement';
                const vendorSubline = eng.vendor_company || eng.vendor_email || '—';
                const showSubline = (eng.engagement_name?.trim() ?? '') && vendorSubline !== name;
                let frameworkLabel: string = eng.framework_id;
                try {
                  frameworkLabel = getFramework(eng.framework_id as FrameworkId).label;
                } catch { /* unknown framework — show raw id */ }
                const statusBadge = STATUS_BADGES[eng.status] ?? STATUS_BADGES.draft;
                return (
                  <tr key={eng.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/officer/engagements/${eng.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-primary-700 transition-colors"
                      >
                        {name}
                      </Link>
                      {showSubline && (
                        <p className="text-xs text-gray-500 mt-0.5">{vendorSubline}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="framework" framework={eng.framework_id as 'soc2' | 'vdd' | 'financial_controls' | 'agnostic'} />
                        <span className="text-xs text-gray-500">{frameworkLabel}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {eng.due_date
                        ? new Date(eng.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {new Date(eng.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/officer/engagements/${eng.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800"
                      >
                        Open
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
