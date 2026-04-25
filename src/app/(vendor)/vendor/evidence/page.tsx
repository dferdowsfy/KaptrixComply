import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Badge } from '@/design-system';
import { listVendorEngagements, listDocuments } from '@/lib/compliance/queries';
import { cn } from '@/lib/utils';
import { VendorEvidenceClient } from '@/components/compliance/VendorEvidenceClient';

const EXTRACTION_STYLES = {
  queued:   { label: 'Queued',     bg: 'bg-gray-100',     text: 'text-gray-600' },
  running:  { label: 'Processing', bg: 'bg-info-100',     text: 'text-info-700' },
  complete: { label: 'Complete',   bg: 'bg-success-100',  text: 'text-success-700' },
  failed:   { label: 'Failed',     bg: 'bg-danger-100',   text: 'text-danger-700' },
};

const FILE_ICON_COLORS: Record<string, string> = {
  pdf: '#EF4444', docx: '#2563EB', xlsx: '#059669', pptx: '#D97706', csv: '#7C3AED',
};

export default async function VendorEvidencePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listVendorEngagements(user.id);
  const allDocs = (await Promise.all(engagements.map(e => listDocuments(e.id)))).flat();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Evidence"
        subtitle="Documents you've uploaded across your compliance assessments"
        breadcrumbs={[{ label: 'Dashboard', href: '/vendor/dashboard' }, { label: 'Evidence' }]}
        actions={<VendorEvidenceClient engagements={engagements} />}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Documents',   value: allDocs.length,                                   color: 'text-primary-500' },
          { label: 'Processed',         value: allDocs.filter(d => d.extraction_status === 'complete').length, color: 'text-success-600' },
          { label: 'Pending',           value: allDocs.filter(d => d.extraction_status === 'queued' || d.extraction_status === 'running').length, color: 'text-warning-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-3xl font-bold tabular-nums', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Documents table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All Documents</h2>
        </div>
        {allDocs.length === 0 ? (
          <div className="py-14 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/>
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">No documents uploaded yet</p>
            <p className="text-xs text-gray-400 mb-4">Upload evidence through your questionnaires or click the button above</p>
            <Link href="/vendor/questionnaires" className="text-sm text-primary-500 font-medium hover:underline">
              Go to questionnaires →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Document', 'Type', 'Evidence Types', 'AI Extraction', 'Uploaded'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allDocs.map(doc => {
                  const ext = doc.file_type ?? 'file';
                  const es = EXTRACTION_STYLES[doc.extraction_status] ?? EXTRACTION_STYLES.queued;
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-8 w-8 rounded flex items-center justify-center shrink-0 text-white text-[10px] font-bold uppercase"
                            style={{ backgroundColor: FILE_ICON_COLORS[ext] ?? '#6B7280' }}
                          >
                            {ext.slice(0, 3)}
                          </div>
                          <span className="font-medium text-gray-900 truncate max-w-[180px]">{doc.file_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 uppercase text-xs font-mono">{doc.file_type ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(doc.evidence_types ?? []).length === 0 ? (
                            <span className="text-xs text-gray-300">—</span>
                          ) : (
                            (doc.evidence_types ?? []).map(t => (
                              <span key={t} className="px-2 py-0.5 text-xs bg-primary-50 text-primary-600 rounded-full font-medium">{t.replace(/_/g, ' ')}</span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', es.bg, es.text)}>
                          {es.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
