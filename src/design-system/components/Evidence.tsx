import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';

// ─── EvidenceSnippet ───
interface EvidenceSnippetProps {
  snippet: string;
  documentName: string;
  documentUrl?: string;
  pageNumber?: number;
  strength: 'strong' | 'partial' | 'none';
  className?: string;
}
export function EvidenceSnippet({ snippet, documentName, documentUrl, pageNumber, strength, className }: EvidenceSnippetProps) {
  return (
    <div className={cn('rounded border p-3 bg-slate-50 text-sm', className)} data-testid="evidence-snippet">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          {documentUrl
            ? <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">{documentName}</a>
            : <span>{documentName}</span>}
          {pageNumber != null && <span className="font-mono ml-1 text-slate-400">p.{pageNumber}</span>}
        </span>
        <Badge variant="evidence" strength={strength} />
      </div>
      <blockquote className="border-l-2 border-slate-300 pl-2 text-slate-600 italic text-xs line-clamp-3">
        "{snippet}"
      </blockquote>
    </div>
  );
}

// ─── AuditEntry ───
interface AuditEntryProps {
  actor: string;
  timestamp: string;
  action: string;
  entity?: string;
  diff?: { before?: string; after?: string };
  className?: string;
}
export function AuditEntry({ actor, timestamp, action, entity, diff, className }: AuditEntryProps) {
  return (
    <div className={cn('flex gap-3 py-3 border-b border-slate-100 last:border-0 text-sm', className)} data-testid="audit-entry">
      <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs shrink-0 mt-0.5" aria-hidden="true">
        {actor.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium text-slate-800">{actor}</span>
          <span className="text-slate-600">{action}</span>
          {entity && <span className="font-mono text-xs text-slate-500 truncate">{entity}</span>}
          <time className="ml-auto text-xs text-slate-400 shrink-0" dateTime={timestamp}>
            {new Date(timestamp).toLocaleString()}
          </time>
        </div>
        {diff && (
          <div className="mt-1.5 flex flex-col gap-1">
            {diff.before && <div className="text-xs font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded line-clamp-2">- {diff.before}</div>}
            {diff.after  && <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded line-clamp-2">+ {diff.after}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
