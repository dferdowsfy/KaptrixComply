import React from 'react';
import Link from 'next/link';
import {
  Check,
  Loader2,
  AlertTriangle,
  Lock,
  Circle,
  ChevronRight,
} from 'lucide-react';
import type { ComplianceEngagement } from '@/lib/compliance/types';
import type {
  EngagementWorkflowState,
  WorkflowStep,
  WorkflowStepStatus,
} from '@/lib/compliance/queries';
import { getFramework } from '@/lib/scoring/frameworks';
import type { FrameworkId } from '@/lib/scoring/frameworks';

interface EngagementContextHeaderProps {
  engagement: ComplianceEngagement;
  orgName: string;
  workflow: EngagementWorkflowState;
  /** Highlight the step matching this key with a ring (the page the user is on) */
  activeStepKey?: WorkflowStep['key'];
}

const STATUS_STYLES: Record<WorkflowStepStatus, {
  ring: string;
  bg: string;
  text: string;
  badge: string;
  badgeText: string;
  label: string;
}> = {
  complete: {
    ring: 'ring-success-200',
    bg: 'bg-success-500',
    text: 'text-white',
    badge: 'bg-success-50 text-success-700 border-success-200',
    badgeText: 'Complete',
    label: 'Complete',
  },
  needs_review: {
    ring: 'ring-warning-200',
    bg: 'bg-warning-500',
    text: 'text-white',
    badge: 'bg-warning-50 text-warning-700 border-warning-200',
    badgeText: 'Needs review',
    label: 'Needs review',
  },
  blocked: {
    ring: 'ring-gray-200',
    bg: 'bg-gray-300',
    text: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-600 border-gray-200',
    badgeText: 'Blocked',
    label: 'Blocked',
  },
  in_progress: {
    ring: 'ring-primary-200',
    bg: 'bg-primary-500',
    text: 'text-white',
    badge: 'bg-primary-50 text-primary-700 border-primary-200',
    badgeText: 'In progress',
    label: 'In progress',
  },
  not_started: {
    ring: 'ring-gray-200',
    bg: 'bg-white border border-gray-300',
    text: 'text-gray-400',
    badge: 'bg-gray-50 text-gray-500 border-gray-200',
    badgeText: 'Not started',
    label: 'Not started',
  },
};

function StepIcon({ status }: { status: WorkflowStepStatus }) {
  const size = 14;
  switch (status) {
    case 'complete':       return <Check size={size} strokeWidth={3} />;
    case 'needs_review':   return <AlertTriangle size={size} strokeWidth={2.5} />;
    case 'blocked':        return <Lock size={size} strokeWidth={2.5} />;
    case 'in_progress':    return <Loader2 size={size} strokeWidth={2.5} className="animate-spin" />;
    case 'not_started':    return <Circle size={size} strokeWidth={2.5} />;
  }
}

export function EngagementContextHeader({
  engagement,
  orgName,
  workflow,
  activeStepKey,
}: EngagementContextHeaderProps) {
  const framework = (() => {
    try {
      return getFramework(engagement.framework_id as FrameworkId);
    } catch {
      return null;
    }
  })();

  const engagementName =
    engagement.engagement_name?.trim() ||
    engagement.vendor_company?.trim() ||
    engagement.vendor_email?.trim() ||
    'Untitled engagement';

  const vendorLabel = engagement.vendor_company ?? engagement.vendor_email ?? 'Unnamed vendor';
  const frameworkLabel = framework?.label ?? engagement.framework_id;

  const progressPct = workflow.totalCount > 0
    ? Math.round((workflow.completedCount / workflow.totalCount) * 100)
    : 0;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Top: contextual breadcrumb + status pill */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
        <div className="min-w-0">
          <nav className="flex items-center flex-wrap gap-1 text-xs text-gray-500" aria-label="Engagement context">
            <span className="font-medium text-gray-700">{orgName}</span>
            <ChevronRight size={12} className="text-gray-300" aria-hidden="true" />
            <span className="text-gray-700">{vendorLabel}</span>
            <ChevronRight size={12} className="text-gray-300" aria-hidden="true" />
            <span className="text-gray-700">{frameworkLabel}</span>
          </nav>
          <h2 className="mt-1 text-base font-semibold text-gray-900 truncate">{engagementName}</h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Progress</p>
            <p className="text-sm font-semibold text-gray-900">
              {workflow.completedCount} / {workflow.totalCount} steps
              <span className="ml-1.5 text-gray-400 font-normal">({progressPct}%)</span>
            </p>
          </div>
          {workflow.nextStep && (
            <Link
              href={workflow.nextStep.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors"
            >
              Next: {workflow.nextStep.label}
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Step tracker */}
      <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0">
        {workflow.steps.map((step, idx) => {
          const styles = STATUS_STYLES[step.status];
          const isActive = activeStepKey === step.key;
          const isLast = idx === workflow.steps.length - 1;

          return (
            <li
              key={step.key}
              className={`relative px-4 py-3 ${!isLast ? 'lg:border-r border-gray-100' : ''} ${isActive ? 'bg-primary-50/40' : ''}`}
            >
              <Link
                href={step.href}
                className="block group"
                aria-current={isActive ? 'step' : undefined}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`flex items-center justify-center h-6 w-6 rounded-full ${styles.bg} ${styles.text} ${isActive ? `ring-2 ring-offset-1 ${styles.ring}` : ''}`}
                  >
                    <StepIcon status={step.status} />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Step {idx + 1}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors leading-tight">
                  {step.label}
                </p>
                <span className={`mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold ${styles.badge}`}>
                  {styles.badgeText}
                </span>
                {step.hint && (
                  <p className="mt-1.5 text-[11px] text-gray-500 leading-snug line-clamp-2">
                    {step.hint}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
