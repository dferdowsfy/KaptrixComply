'use client';

import React, { useState } from 'react';
import { EvidenceUploadModal } from './EvidenceUploadModal';

interface Engagement {
  id: string;
  template_id: string;
  framework_id: string;
  status: string;
}

interface Props {
  engagements: Engagement[];
}

export function VendorEvidenceClient({ engagements }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        disabled={engagements.length === 0}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/>
        </svg>
        Upload Document
      </button>

      {modalOpen && (
        <EvidenceUploadModal
          engagements={engagements}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
