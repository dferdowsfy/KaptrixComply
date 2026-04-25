'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FRAMEWORKS as FRAMEWORK_CONFIGS, DIMENSION_LABELS } from '@/lib/scoring/frameworks';
import type { FrameworkId } from '@/lib/scoring/frameworks';

const FRAMEWORKS = [
  {
    id: 'agnostic',
    label: 'Auto-detect from document',
    description: 'Upload a document and the AI will identify the correct framework automatically — SOC 2, VDD, or Financial Controls.',
    questions: 'detected on upload',
    popular: false,
    iconBg: '#F0FDF4',
    iconStroke: '#16A34A',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>
      </svg>
    ),
  },
  {
    id: 'soc2',
    label: 'SOC 2',
    description: 'Trust Services Criteria — Security, Availability, Confidentiality, Privacy',
    questions: '~20 questions',
    popular: true,
    iconBg: '#EDE9FE',
    iconStroke: '#6D28D9',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>
      </svg>
    ),
  },
  {
    id: 'vdd',
    label: 'Vendor Due Diligence',
    description: 'Comprehensive vendor risk — financial, operational, data handling, contractual',
    questions: '~25 questions',
    popular: false,
    iconBg: '#D1FAE5',
    iconStroke: '#059669',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/>
      </svg>
    ),
  },
  {
    id: 'financial_controls',
    label: 'Financial Controls',
    description: 'SOX-style ITGC — access controls, change management, segregation of duties',
    questions: '~20 questions',
    popular: false,
    iconBg: '#FFE4E6',
    iconStroke: '#E11D48',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"/>
      </svg>
    ),
  },
  {
    id: 'agnostic',
    label: 'Framework-Agnostic',
    description: 'General-purpose questionnaire with equal dimension weighting — use when no specific framework applies',
    questions: '~15 questions',
    popular: false,
    iconBg: '#F0F9FF',
    iconStroke: '#0284C7',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"/>
      </svg>
    ),
  },
] as const;

interface SavedVendorOption {
  key: string;
  label: string;
  email: string | null;
  vendor_user_id: string | null;
  source: 'directory' | 'engagement';
}

interface CustomTemplate {
  id: string;
  template_key: string;
  label: string;
  description: string | null;
  framework_id: string;
  is_custom: boolean;
  is_published: boolean;
}

export default function NewEngagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFramework = (() => {
    const fw = searchParams.get('framework');
    return fw && FRAMEWORKS.some(f => f.id === fw) ? fw : 'agnostic';
  })();
  const initialTemplate = searchParams.get('template') ?? '';
  const [selectedFw, setSelectedFw] = useState<string>(initialFramework);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>(initialTemplate);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [savedVendors, setSavedVendors] = useState<SavedVendorOption[]>([]);
  const [savedVendorsLoading, setSavedVendorsLoading] = useState(true);
  const [selectedVendorKey, setSelectedVendorKey] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorCompany, setVendorCompany] = useState('');
  const [engagementName, setEngagementName] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedVendors() {
      try {
        const res = await fetch('/api/compliance/engagements');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? 'Failed to load saved vendors');
        }
        if (!cancelled) {
          setSavedVendors(Array.isArray(data.vendors) ? data.vendors : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load saved vendors');
        }
      } finally {
        if (!cancelled) {
          setSavedVendorsLoading(false);
        }
      }
    }

    void loadSavedVendors();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/compliance/templates');
        const data = await res.json();
        if (!res.ok) return;
        if (cancelled) return;
        const templates = (data.templates ?? []).filter((t: CustomTemplate) => t.is_custom && t.is_published);
        setCustomTemplates(templates);
      } catch {
        /* ignore — custom templates optional */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedVendor = useMemo(
    () => savedVendors.find((vendor) => vendor.key === selectedVendorKey) ?? null,
    [savedVendors, selectedVendorKey],
  );

  const handleCreate = async () => {
    if (!vendorCompany.trim() && !vendorEmail.trim() && !selectedVendor?.vendor_user_id) {
      setError('Choose a saved vendor or enter a vendor company or email.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/compliance/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          framework_id: selectedFw,
          template_id: selectedTemplateKey || undefined,
          vendor_user_id: selectedVendor?.vendor_user_id || undefined,
          vendor_email: vendorEmail || undefined,
          vendor_company: vendorCompany || undefined,
          engagement_name: engagementName.trim() || undefined,
          notes: notes.trim() || undefined,
          due_date: dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create engagement');
      router.push(`/officer/engagements/${data.id}`);
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  const fw = FRAMEWORKS.find(f => f.id === selectedFw);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/officer/vendors"
          className="h-8 w-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label="Back"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Engagement</h1>
          <p className="text-sm text-gray-400">Choose a framework, pick a saved vendor, and jump straight into the questionnaire.</p>
        </div>
      </div>

      {/* Engagement name (top-of-form per UX redesign) */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Engagement details</h2>
          <p className="text-xs text-gray-400 mt-0.5">Give this engagement a name so it&rsquo;s easy to find later. The vendor and framework you pick below get bound to it.</p>
        </div>
        <div>
          <label htmlFor="engagement-name" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Engagement name
          </label>
          <input
            id="engagement-name"
            type="text"
            value={engagementName}
            onChange={e => {
              setEngagementName(e.target.value);
              setError('');
            }}
            placeholder="e.g. Acme — Q2 SOC 2 review"
            className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-[11px] text-gray-400 mt-1">Optional — defaults to the vendor name when blank.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Choose a compliance framework</h2>
        <p className="text-xs text-gray-400 mb-5">
          Selecting a framework determines the exact question set. Starting the engagement will take you directly to those questions.
        </p>
        <div className="space-y-3">
          {FRAMEWORKS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setSelectedFw(f.id);
                setSelectedTemplateKey('');
                setError('');
              }}
              aria-pressed={selectedFw === f.id && !selectedTemplateKey}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all',
                selectedFw === f.id && !selectedTemplateKey
                  ? 'border-primary-500 bg-primary-50 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: f.iconBg }}
              >
                <span style={{ color: f.iconStroke }}>{f.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-900">{f.label}</span>
                  {f.popular && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-100 text-primary-700">
                      POPULAR
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto shrink-0">{f.questions}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
              </div>
              <div className={cn(
                'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                selectedFw === f.id && !selectedTemplateKey ? 'border-primary-500 bg-primary-500' : 'border-gray-300',
              )}>
                {selectedFw === f.id && !selectedTemplateKey && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
            </button>
          ))}

          {customTemplates.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Your custom frameworks</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              {customTemplates.map(t => {
                const isSelected = selectedTemplateKey === t.template_key;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedFw(t.framework_id);
                      setSelectedTemplateKey(t.template_key);
                      setError('');
                    }}
                    aria-pressed={isSelected}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all',
                      isSelected
                        ? 'border-primary-500 bg-primary-50 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 bg-primary-50">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.75" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900">{t.label}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-100 text-primary-700">
                          CUSTOM
                        </span>
                        <span className="text-xs text-gray-400 ml-auto shrink-0">{t.framework_id}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {t.description || 'Custom questionnaire template.'}
                      </p>
                    </div>
                    <div className={cn(
                      'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                      isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300',
                    )}>
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Choose a vendor</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pick a saved vendor or enter a new one below. Saved vendors come from engagements you&rsquo;ve already created.</p>
          </div>
          {savedVendorsLoading && <span className="text-xs text-gray-400">Loading saved vendors…</span>}
        </div>

        <div>
          <label htmlFor="saved-vendor" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Saved vendors
          </label>
          <select
            id="saved-vendor"
            value={selectedVendorKey}
            onChange={(event) => {
              const nextKey = event.target.value;
              const nextVendor = savedVendors.find((vendor) => vendor.key === nextKey) ?? null;
              setSelectedVendorKey(nextKey);
              setVendorCompany(nextVendor?.label ?? '');
              setVendorEmail(nextVendor?.email ?? '');
              setError('');
            }}
            className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Create or enter a new vendor</option>
            {savedVendors.map((vendor) => (
              <option key={vendor.key} value={vendor.key}>
                {vendor.label}{vendor.email ? ` — ${vendor.email}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="vendor-company" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Company / vendor name
            </label>
            <input
              id="vendor-company"
              type="text"
              value={vendorCompany}
              onChange={e => {
                setVendorCompany(e.target.value);
                setError('');
              }}
              placeholder="Acme Corp"
              className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="vendor-email" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Vendor email
            </label>
            <input
              id="vendor-email"
              type="email"
              value={vendorEmail}
              onChange={e => {
                setVendorEmail(e.target.value);
                setError('');
              }}
              placeholder="vendor@example.com"
              className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="due-date" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Due date
            <span className="ml-1 text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="due-date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Notes
            <span className="ml-1 text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Context for this engagement — scope, stakeholders, anything reviewers should know."
            className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
          />
        </div>

        {fw && (() => {
          const cfg = (FRAMEWORK_CONFIGS as Record<string, typeof FRAMEWORK_CONFIGS[FrameworkId] | undefined>)[fw.id];
          const showScoring = fw.id !== 'agnostic' && cfg;
          return (
            <div className={cn(
              'rounded-lg border px-4 py-3',
              fw.id === 'agnostic' ? 'bg-green-50 border-green-100' : 'bg-primary-50 border-primary-100',
            )}>
              <p className={cn('text-xs font-semibold uppercase tracking-wider mb-1', fw.id === 'agnostic' ? 'text-green-700' : 'text-primary-700')}>
                {fw.id === 'agnostic' ? 'Framework auto-detection' : 'Selected framework'}
              </p>
              <p className={cn('text-sm font-semibold', fw.id === 'agnostic' ? 'text-green-900' : 'text-primary-900')}>{fw.label}</p>
              <p className={cn('text-xs mt-1', fw.id === 'agnostic' ? 'text-green-700' : 'text-primary-700')}>
                {fw.id === 'agnostic'
                  ? 'When you upload a document, the AI reads it and automatically assigns the right question set — SOC 2, VDD, or Financial Controls.'
                  : `Starting this engagement opens the ${fw.questions} questionnaire.`}
              </p>

              {showScoring && cfg && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-md bg-white/70 border border-primary-100 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary-700 mb-1.5">Dimension weights</p>
                    <ul className="space-y-1">
                      {cfg.weights.map(w => {
                        const pct = Math.round(w.weight * 100);
                        return (
                          <li key={w.dimension} className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-700">{DIMENSION_LABELS[w.dimension]}</span>
                            <span className="tabular-nums font-semibold text-gray-900">{pct}%</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="rounded-md bg-white/70 border border-primary-100 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary-700 mb-1.5">Decision thresholds</p>
                    <ul className="space-y-1 text-[11px]">
                      <li className="flex items-center justify-between">
                        <span className="text-gray-700">Approved score</span>
                        <span className="tabular-nums font-semibold text-success-700">≥ {cfg.decision_thresholds.approved_min_score}</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-gray-700">Approved confidence</span>
                        <span className="tabular-nums font-semibold text-success-700">≥ {Math.round(cfg.decision_thresholds.approved_min_confidence * 100)}%</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-gray-700">High risk score</span>
                        <span className="tabular-nums font-semibold text-danger-700">≤ {cfg.decision_thresholds.high_risk_max_score}</span>
                      </li>
                    </ul>
                    <Link
                      href="/officer/methodology"
                      className="mt-2 inline-block text-[11px] text-primary-700 hover:text-primary-800 font-semibold"
                    >
                      See full methodology →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {error && (
          <div className="rounded-md bg-danger-50 border border-danger-200 px-3 py-2 text-xs text-danger-700">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-lg bg-primary-50 border border-primary-100 px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500 shrink-0 mt-0.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/>
        </svg>
        <p className="text-xs text-primary-700 leading-relaxed">
          After the engagement opens, the questionnaire is already scoped to the selected framework. Upload the vendor&rsquo;s evidence there and the extraction pipeline can map documents directly into answers and supporting evidence.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className={cn(
            'inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-md transition-colors',
            creating
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-500 text-white hover:bg-primary-600',
          )}
        >
          {creating ? 'Starting…' : fw && fw.id !== 'agnostic' ? `Start ${fw.label} questionnaire` : 'Create engagement'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
