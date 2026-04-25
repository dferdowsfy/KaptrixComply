'use client';
import React from 'react';
import { cn } from '@/lib/utils';

// ─── Tabs ───
interface TabItem { key: string; label: string; badge?: string | number; }
interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}
export function Tabs({ tabs, activeKey, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex border-b border-slate-200', className)} role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeKey === tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
            'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 outline-none',
            activeKey === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
          )}
        >
          {tab.label}
          {tab.badge != null && (
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full', activeKey === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Stepper ───
interface StepItem { key: string; label: string; }
interface StepperProps {
  steps: StepItem[];
  activeKey: string;
  completedKeys?: string[];
  className?: string;
}
export function Stepper({ steps, activeKey, completedKeys = [], className }: StepperProps) {
  return (
    <nav className={cn('flex items-center gap-0', className)} aria-label="Progress steps">
      {steps.map((step, i) => {
        const isActive = step.key === activeKey;
        const isComplete = completedKeys.includes(step.key);
        return (
          <React.Fragment key={step.key}>
            {i > 0 && <div className={cn('flex-1 h-px mx-1', isComplete ? 'bg-blue-600' : 'bg-slate-200')} aria-hidden="true" />}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2',
                isActive  && 'border-blue-600 bg-blue-600 text-white',
                isComplete && !isActive && 'border-blue-600 bg-blue-600 text-white',
                !isActive && !isComplete && 'border-slate-200 bg-white text-slate-400',
              )} aria-current={isActive ? 'step' : undefined}>
                {isComplete && !isActive
                  ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  : i + 1}
              </div>
              <span className={cn('text-xs font-medium', isActive ? 'text-blue-700' : 'text-slate-500')}>{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
