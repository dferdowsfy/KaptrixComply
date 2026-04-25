'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type ActionType = 'scores' | 'gaps' | 'remediation' | 'report';

interface Action {
  type: ActionType;
  label: string;
  endpoint: string;
  icon: React.ReactNode;
  variant: 'primary' | 'secondary';
}

interface Props {
  engagementId: string;
  /** Which actions to show */
  actions?: ActionType[];
}

const ACTION_DEFS: Action[] = [
  {
    type: 'scores',
    label: 'Compute Scores',
    endpoint: '/api/compliance/scores/compute',
    variant: 'secondary',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/>
      </svg>
    ),
  },
  {
    type: 'gaps',
    label: 'Generate Gaps',
    endpoint: '/api/compliance/gaps/generate',
    variant: 'secondary',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
      </svg>
    ),
  },
  {
    type: 'remediation',
    label: 'Generate Remediation',
    endpoint: '/api/compliance/remediation/generate',
    variant: 'secondary',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"/>
      </svg>
    ),
  },
  {
    type: 'report',
    label: 'Generate Report',
    endpoint: '/api/compliance/reports/generate',
    variant: 'primary',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
      </svg>
    ),
  },
];

type ActionState = 'idle' | 'loading' | 'done' | 'error';

export function EngagementActionBar({ engagementId, actions: enabledActions }: Props) {
  const router = useRouter();
  const [states, setStates] = useState<Record<ActionType, ActionState>>({
    scores: 'idle', gaps: 'idle', remediation: 'idle', report: 'idle',
  });
  const [errors, setErrors] = useState<Record<ActionType, string>>({
    scores: '', gaps: '', remediation: '', report: '',
  });

  const visibleActions = enabledActions
    ? ACTION_DEFS.filter(a => enabledActions.includes(a.type))
    : ACTION_DEFS;

  const run = async (action: Action) => {
    setStates(prev => ({ ...prev, [action.type]: 'loading' }));
    setErrors(prev => ({ ...prev, [action.type]: '' }));
    try {
      const res = await fetch(action.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engagement_id: engagementId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      setStates(prev => ({ ...prev, [action.type]: 'done' }));
      router.refresh();
    } catch (err) {
      setStates(prev => ({ ...prev, [action.type]: 'error' }));
      setErrors(prev => ({ ...prev, [action.type]: err instanceof Error ? err.message : 'Unknown error' }));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visibleActions.map(action => {
        const state = states[action.type];
        const isPrimary = action.variant === 'primary';
        return (
          <div key={action.type} className="flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={() => run(action)}
              disabled={state === 'loading'}
              className={cn(
                'inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                state === 'done'
                  ? 'bg-success-50 border border-success-300 text-success-700'
                  : isPrimary
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
              )}
            >
              {state === 'loading' ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : state === 'done' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                action.icon
              )}
              {state === 'loading' ? `${action.label}…` : state === 'done' ? 'Done' : action.label}
            </button>
            {state === 'error' && errors[action.type] && (
              <p className="text-xs text-danger-600 max-w-[200px] leading-tight">{errors[action.type]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
