'use client';

import React, { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

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
  onClose: () => void;
}

type UploadState = 'idle' | 'uploading' | 'extracting' | 'done' | 'error';

interface ExtractionResult {
  answers_written: number;
  questions_processed: number;
  unanswered_count?: number;
  detected_framework?: string;
  llm_errors?: string[];
}

const FRAMEWORK_LABELS: Record<string, string> = {
  soc2: 'SOC 2',
  vdd: 'VDD',
  financial_controls: 'Financial Controls',
  agnostic: 'Agnostic',
};

function vendorLabel(e: Engagement): string {
  return (
    e.vendor_company?.trim() ||
    e.vendor_email?.trim() ||
    (e.vendor_user_id ? `Vendor ${e.vendor_user_id.slice(0, 8)}` : `Engagement ${e.id.slice(0, 8)}`)
  );
}

export function EvidenceUploadModal({ engagements, onClose }: Props) {
  const [selectedEngagementId, setSelectedEngagementId] = useState<string>(
    engagements.length === 1 ? engagements[0].id : '',
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [runExtraction, setRunExtraction] = useState(true);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedEngagement = engagements.find(e => e.id === selectedEngagementId) ?? null;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) setFile(picked);
  };

  const handleSubmit = async () => {
    if (!file || !selectedEngagementId) return;
    setUploadState('uploading');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.set('engagement_id', selectedEngagementId);
      formData.set('file', file);

      const uploadRes = await fetch('/api/compliance/documents', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed');

      if (runExtraction) {
        setUploadState('extracting');
        const extractRes = await fetch('/api/compliance/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: uploadData.id,
            engagement_id: selectedEngagementId,
          }),
        });
        const extractData = await extractRes.json();
        if (!extractRes.ok) {
          throw new Error(extractData.detail ?? extractData.error ?? 'Extraction failed');
        }
        setExtractionResult(extractData as ExtractionResult);
      }

      setUploadState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setUploadState('error');
    }
  };

  const canSubmit = !!file && !!selectedEngagementId && uploadState === 'idle';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 id="upload-modal-title" className="text-base font-semibold text-gray-900">
              Upload evidence
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              AI reads the document and auto-fills the questionnaire for this vendor.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Done state */}
          {uploadState === 'done' && (
            <div className="py-8 text-center">
              {/* Icon — warning if extraction ran but wrote 0 answers */}
              {runExtraction && extractionResult && extractionResult.answers_written === 0 ? (
                <div className="h-14 w-14 rounded-full bg-warning-100 flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning-600" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
              ) : (
                <div className="h-14 w-14 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-600" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}
              <p className="text-sm font-semibold text-gray-900 mb-1">
                {!runExtraction
                  ? 'Document uploaded'
                  : extractionResult && extractionResult.answers_written === 0
                  ? 'Document uploaded — no answers extracted'
                  : `Extracted ${extractionResult?.answers_written ?? '?'} answer${extractionResult?.answers_written !== 1 ? 's' : ''} from ${extractionResult?.questions_processed ?? '?'} questions`}
              </p>
              {extractionResult?.detected_framework && (
                <p className="text-xs text-success-700 bg-success-50 border border-success-200 rounded px-2 py-1 mb-2 inline-block">
                  Framework auto-detected: <strong>{extractionResult.detected_framework.replace('_', ' ').toUpperCase()}</strong>
                </p>
              )}
              <p className="text-xs text-gray-500 mb-3">
                {!runExtraction
                  ? 'Document saved. Run AI extraction from the questionnaire page when ready.'
                  : extractionResult && extractionResult.answers_written === 0
                  ? 'The document was uploaded but the AI could not match content to any questionnaire questions. See the extractor detail below, or try a document more closely aligned with this framework.'
                  : 'Open the questionnaire to review confidence scores and approve or edit each answer.'}
              </p>
              {/* LLM error detail */}
              {extractionResult?.llm_errors && extractionResult.llm_errors.length > 0 && (
                <div className="mb-4 rounded-md bg-danger-50 border border-danger-200 px-3 py-2 text-left">
                  <p className="text-xs font-semibold text-danger-700 mb-1">Extractor detail</p>
                  <p className="text-xs text-danger-600 font-mono break-all">{extractionResult.llm_errors[0]}</p>
                </div>
              )}
              <div className="flex items-center justify-center gap-3">
                {runExtraction && selectedEngagementId && (
                  <a
                    href={`/officer/engagements/${selectedEngagementId}/questionnaire?filter=extracted`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Review Answers
                  </a>
                )}
                <button
                  onClick={() => { setUploadState('idle'); setFile(null); setExtractionResult(null); onClose(); }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-colors',
                    runExtraction && selectedEngagementId
                      ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'bg-primary-500 text-white hover:bg-primary-600',
                  )}
                >
                  {runExtraction && selectedEngagementId ? 'Upload another' : 'Done'}
                </button>

              </div>
            </div>
          )}

          {/* In-progress state */}
          {(uploadState === 'uploading' || uploadState === 'extracting') && (
            <div className="py-8 text-center">
              <div className="h-14 w-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
                <svg className="animate-spin h-7 w-7 text-primary-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {uploadState === 'uploading' ? 'Uploading document\u2026' : 'Running AI extraction\u2026'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {uploadState === 'extracting'
                  ? 'Mapping document evidence to every question in the questionnaire.'
                  : 'Sending file securely\u2026'}
              </p>
            </div>
          )}

          {/* Error state */}
          {uploadState === 'error' && (
            <div className="rounded-lg bg-danger-50 border border-danger-200 px-4 py-3 flex items-start gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger-600 shrink-0 mt-0.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-danger-700">Upload failed</p>
                <p className="text-xs text-danger-600 mt-0.5">{errorMsg}</p>
              </div>
              <button
                onClick={() => { setUploadState('idle'); setExtractionResult(null); }}
                className="ml-auto text-danger-500 hover:text-danger-700 text-xs font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Form (idle or error) */}
          {(uploadState === 'idle' || uploadState === 'error') && (
            <>
              {/* Step 1: Vendor / engagement selector */}
              {engagements.length === 0 ? (
                <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
                  No vendor engagements yet. Create one from the Vendors page first, then upload evidence against it.
                </div>
              ) : engagements.length === 1 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Vendor</p>
                  <p className="text-sm font-semibold text-gray-900">{vendorLabel(engagements[0])}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {FRAMEWORK_LABELS[engagements[0].framework_id] ?? engagements[0].framework_id.toUpperCase()} &middot; {engagements[0].status.replace('_', ' ')}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Vendor</label>
                  <select
                    value={selectedEngagementId}
                    onChange={e => setSelectedEngagementId(e.target.value)}
                    className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select a vendor\u2026</option>
                    {engagements.map(e => (
                      <option key={e.id} value={e.id}>
                        {vendorLabel(e)} &mdash; {FRAMEWORK_LABELS[e.framework_id] ?? e.framework_id.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  {selectedEngagement && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      Evidence will be linked to <span className="font-medium text-gray-700">{vendorLabel(selectedEngagement)}</span> and applied across their entire questionnaire.
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: File drop zone */}
              {engagements.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Document</label>
                  {file ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-success-300 bg-success-50">
                      <div className="h-9 w-9 rounded bg-success-200 flex items-center justify-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-700" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600" aria-label="Remove file">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all',
                        dragActive
                          ? 'border-primary-400 bg-primary-50 scale-[1.01]'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50',
                      )}
                    >
                      <div className="relative h-16 w-14 mb-1">
                        <div className="absolute bottom-0 left-2 w-10 h-12 rounded-md bg-gray-100 border border-gray-200" aria-hidden="true" />
                        <div className="absolute bottom-1 left-1 w-10 h-12 rounded-md bg-gray-200 border border-gray-300" aria-hidden="true" />
                        <div className="absolute bottom-2 left-0 w-10 h-12 rounded-md bg-white border border-gray-300 shadow-sm flex flex-col items-center justify-center gap-1" aria-hidden="true">
                          <div className="w-6 h-0.5 rounded bg-gray-300" />
                          <div className="w-6 h-0.5 rounded bg-gray-300" />
                          <div className="w-4 h-0.5 rounded bg-gray-200" />
                        </div>
                        <div className={cn(
                          'absolute -top-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center shadow-sm border transition-colors',
                          dragActive ? 'bg-primary-500 border-primary-600' : 'bg-white border-gray-200',
                        )}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            className={cn('transition-colors', dragActive ? 'text-white' : 'text-primary-500')}
                            aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                          </svg>
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-800">
                          {dragActive ? 'Release to upload' : <>Drop your document here, or <span className="text-primary-500">browse</span></>}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          SOC 2 report, privacy policy, DPA, audit report &mdash; PDF, DOCX, XLSX, PPTX
                        </p>
                        <p className="text-[11px] text-gray-300 mt-0.5">Max 100 MB</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv"
                        onChange={handleFileInput}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Run extraction toggle */}
              {engagements.length > 0 && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={runExtraction}
                      onChange={e => setRunExtraction(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={cn(
                      'h-5 w-9 rounded-full transition-colors',
                      runExtraction ? 'bg-primary-500' : 'bg-gray-200',
                    )}>
                      <div className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                        runExtraction ? 'translate-x-4' : 'translate-x-0.5',
                      )} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Auto-fill questionnaire from this document</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      AI reads the document, finds evidence for every question in this vendor&rsquo;s questionnaire, and fills answers with confidence scores and cited snippets. Low-confidence answers are flagged for your review.
                    </p>
                  </div>
                </label>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {(uploadState === 'idle' || uploadState === 'error') && engagements.length > 0 && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-colors',
                canSubmit
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              {runExtraction ? 'Upload & Extract' : 'Upload Document'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
