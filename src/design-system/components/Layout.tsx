import React from 'react';
import { cn } from '@/lib/utils';

// ─── AppShell ─────────────────────────────────────────────────────────────────
interface AppShellProps {
  sidebar: React.ReactNode;
  topbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}
export function AppShell({ sidebar, topbar, children, className }: AppShellProps) {
  return (
    <div className={cn('flex h-screen overflow-hidden bg-gray-50', className)}>
      <aside className="hidden md:flex flex-col shrink-0">
        {sidebar}
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden">
        {topbar}
        <main
          className="flex-1 overflow-auto"
          id="main-content"
          style={{ padding: '32px', maxWidth: '100%' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
}
export function PageHeader({ title, subtitle, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.label}>
                {i > 0 && <span aria-hidden="true" className="text-gray-300">/</span>}
                {crumb.href
                  ? <a href={crumb.href} className="hover:text-gray-600 transition-colors">{crumb.label}</a>
                  : <span className="text-gray-500">{crumb.label}</span>}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ─── SplitView ────────────────────────────────────────────────────────────────
interface SplitViewProps {
  list: React.ReactNode;
  detail: React.ReactNode;
  detailVisible?: boolean;
  className?: string;
}
export function SplitView({ list, detail, detailVisible = true, className }: SplitViewProps) {
  return (
    <div className={cn('flex h-full gap-0 overflow-hidden', className)}>
      <div className={cn('flex flex-col w-80 shrink-0 border-r border-gray-200 overflow-y-auto', detailVisible && 'hidden md:flex')}>
        {list}
      </div>
      <div className="flex-1 overflow-auto">
        {detail}
      </div>
    </div>
  );
}
