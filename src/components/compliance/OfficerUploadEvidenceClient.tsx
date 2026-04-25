'use client';

import React, { useState } from 'react';
import { EvidenceUploadModal } from './EvidenceUploadModal';

interface Engagement {
  id: string;
  template_id: string;
  framework_id: string;
  status: string;
  vendor_company?: string | null;
  vendor_email?: string | null;
  vendor_user_id?: string | null;
}

interface Props {
  engagements: Engagement[];
  /** Visual size of the trigger button */
  size?: 'md' | 'lg';
  /** Optional extra label shown on large variant */
  hint?: string;
}

/**
 * Officer-facing "Upload evidence" button + modal.
 * One obvious entry point: click, pick an engagement, drop a file, AI fills answers.
 */
export function OfficerUploadEvidenceClient({ engagements, size = 'md', hint }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const disabled = engagements.length === 0;

  if (size === 'lg') {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={disabled}
          className="w-full flex items-center gap-4 rounded-xl border-2 border-dashed border-primary-300 bg-white px-6 py-5 text-left transition-colors hover:border-primary-500 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0 text-primary-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Upload evidence document</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {disabled
                ? 'Create a vendor engagement first — evidence is linked to an engagement.'
                : hint ?? 'Drop a PDF, Word or spreadsheet. AI reads it and auto-fills questionnaire answers.'}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary-500 text-white text-sm font-semibold shrink-0 group-hover:bg-primary-600">
            Upload
          </span>
        </button>

        {modalOpen && (
          <EvidenceUploadModal engagements={engagements} onClose={() => setModalOpen(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        Upload Evidence
      </button>

      {modalOpen && (
        <EvidenceUploadModal engagements={engagements} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
