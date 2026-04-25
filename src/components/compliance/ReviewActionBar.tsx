'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  answerId: string;
  engagementId: string;
  currentAnswer: string;
  reviewStatus: string | null;
}

type ActionState = 'idle' | 'editing' | 'loading' | 'done';

export function ReviewActionBar({ answerId, engagementId, currentAnswer, reviewStatus }: Props) {
  const [state, setState] = useState<ActionState>(reviewStatus ? 'done' : 'idle');
  const [editText, setEditText] = useState(currentAnswer);
  const [overrideReason, setOverrideReason] = useState('');
  const [finalStatus, setFinalStatus] = useState<string | null>(reviewStatus);

  const submit = async (action: 'approved' | 'rejected' | 'edited') => {
    setState('loading');
    const body: Record<string, unknown> = {
      answer_id: answerId,
      engagement_id: engagementId,
      review_status: action,
    };
    if (action === 'edited') {
      body.answer_text = editText;
      body.override_reason = overrideReason || 'Edited by reviewer';
    }
    const res = await fetch('/api/compliance/answers/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setFinalStatus(action);
      setState('done');
    } else {
      setState(action === 'edited' ? 'editing' : 'idle');
    }
  };

  if (state === 'done') {
    const labels: Record<string, string> = { approved: 'Approved', rejected: 'Rejected', edited: 'Edited & approved' };
    const colors: Record<string, string> = {
      approved: 'text-success-600 bg-success-50 border-success-200',
      rejected: 'text-danger-600 bg-danger-50 border-danger-200',
      edited: 'text-warning-700 bg-warning-50 border-warning-200',
    };
    return (
      <div className={cn('flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold', colors[finalStatus ?? 'approved'])}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        {labels[finalStatus ?? 'approved']}
      </div>
    );
  }

  if (state === 'editing') {
    return (
      <div className="space-y-2 pt-1">
        <textarea
          value={editText}
          onChange={e => setEditText(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          placeholder="Edit the extracted answer…"
        />
        <input
          type="text"
          value={overrideReason}
          onChange={e => setOverrideReason(e.target.value)}
          placeholder="Reason for edit (optional)"
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => submit('edited')}
            disabled={!editText.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save edit
          </button>
          <button
            onClick={() => setState('idle')}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 pt-1 border-t border-gray-50 mt-2">
      <button
        onClick={() => submit('approved')}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-success-300 text-success-700 bg-success-50 hover:bg-success-100 disabled:opacity-40 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Approve
      </button>
      <button
        onClick={() => setState('editing')}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
        </svg>
        Edit
      </button>
      <button
        onClick={() => submit('rejected')}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-danger-200 text-danger-600 bg-danger-50 hover:bg-danger-100 disabled:opacity-40 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
        Reject
      </button>
      {state === 'loading' && (
        <svg className="animate-spin h-4 w-4 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
    </div>
  );
}
