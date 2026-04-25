import React from 'react';
import { cn } from '@/lib/utils';

// ─── EmptyState ───
interface EmptyStateProps { title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode; className?: string; }
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)} data-testid="empty-state">
      {icon && <div className="mb-4 text-slate-300">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── ErrorState ───
interface ErrorStateProps { title?: string; message?: string; retry?: () => void; className?: string; }
export function ErrorState({ title = 'Something went wrong', message, retry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)} role="alert" data-testid="error-state">
      <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"/>
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {message && <p className="mt-1 text-xs text-slate-500">{message}</p>}
      {retry && <button onClick={retry} className="mt-3 text-xs text-blue-600 hover:underline">Retry</button>}
    </div>
  );
}

// ─── LoadingState ───
interface LoadingStateProps { message?: string; className?: string; }
export function LoadingState({ message = 'Loading…', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)} data-testid="loading-state" aria-live="polite" aria-busy="true">
      <svg className="h-8 w-8 animate-spin text-blue-500 motion-reduce:hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </div>
  );
}
