'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Briefcase,
  FileText,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Wrench,
  FileCheck,
  History,
  ChevronDown,
  ScanSearch,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Sidebar, SidebarSection, SidebarItem } from '@/design-system';

const NAV_ITEMS = [
  { href: '/officer/dashboard',             label: 'Home',                  descriptor: 'Overview & KPIs',                icon: <Home size={18} />,        exact: true },
  { href: '/officer/engagements',           label: 'Engagements',           descriptor: 'All vendor assessments',         icon: <Briefcase size={18} /> },
  { href: '/officer/evidence-intelligence', label: 'Evidence Intelligence', descriptor: 'Answers, evidence & confidence', icon: <Sparkles size={18} /> },
  { href: '/officer/gaps',                  label: 'Gap Review',            descriptor: 'Missing & weak evidence',        icon: <AlertCircle size={18} /> },
  { href: '/officer/risk-score',            label: 'Risk Score',            descriptor: 'Overall risk assessment',        icon: <ShieldCheck size={18} /> },
  { href: '/officer/report',                label: 'Reports',               descriptor: 'Final diligence reports',        icon: <FileCheck size={18} /> },
  { href: '/officer/audit-trail',           label: 'Audit Trail',           descriptor: 'Activity & changes',             icon: <History size={18} /> },
  { href: '/officer/methodology',           label: 'Framework Methodology', descriptor: 'How Kaptrix evaluates',          icon: <BookOpen size={18} /> },
  { href: '/account',                       label: 'Settings',              descriptor: 'Profile & preferences',          icon: <SettingsIcon size={18} /> },
];

interface OfficerSidebarProps {
  orgName: string;
  userName?: string;
  userEmail?: string;
  engagementId?: string;
}

export function OfficerSidebar({ orgName, userName, userEmail, engagementId: propEngagementId }: OfficerSidebarProps) {
  const pathname = usePathname();
  // Auto-detect engagement ID from URL if not provided as prop
  const engagementId = propEngagementId ?? (() => {
    const match = pathname.match(/\/officer\/engagements\/([^/]+)/);
    return match?.[1] ?? undefined;
  })();

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('officer-sidebar-collapsed');
    if (stored === 'true') setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('officer-sidebar-collapsed', String(next));
      return next;
    });
  };

  const engagementItems = engagementId
    ? [
        { href: `/officer/engagements/${engagementId}`,                       label: 'Workspace',             descriptor: 'Progress & next steps',        icon: <Home size={14} />, exact: true },
        { href: `/officer/engagements/${engagementId}/questionnaire`,         label: 'Questionnaire',         descriptor: 'Review answers',               icon: <FileText size={14} /> },
        { href: `/officer/engagements/${engagementId}/review`,                label: 'AI Review',             descriptor: 'Approve extractions',          icon: <ScanSearch size={14} /> },
        { href: `/officer/engagements/${engagementId}/evidence-intelligence`, label: 'Evidence Intelligence', descriptor: 'Answers + evidence',           icon: <Sparkles size={14} /> },
        { href: `/officer/engagements/${engagementId}/gaps`,                  label: 'Gap Review',            descriptor: 'Missing & weak evidence',      icon: <AlertCircle size={14} /> },
        { href: `/officer/engagements/${engagementId}/risk-score`,            label: 'Risk Score',            descriptor: 'Score breakdown',              icon: <ShieldCheck size={14} /> },
        { href: `/officer/engagements/${engagementId}/remediation`,           label: 'Remediation',           descriptor: 'Action items',                 icon: <Wrench size={14} /> },
        { href: `/officer/engagements/${engagementId}/report`,                label: 'Report',                descriptor: 'Generate & export',            icon: <FileCheck size={14} /> },
        { href: `/officer/engagements/${engagementId}/audit-trail`,           label: 'Audit Trail',           descriptor: 'Activity log',                 icon: <History size={14} /> },
      ]
    : [];

  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'CO';

  return (
    <Sidebar isCollapsed={isCollapsed}>
      {/* Brand + collapse toggle */}
      <div className={`border-b border-white/10 ${isCollapsed ? 'px-2 py-4 flex flex-col items-center gap-3' : 'px-4 py-4 flex items-center justify-between gap-2'}`}>
        <Link href="/officer/dashboard" className="flex items-center min-w-0">
          {!isCollapsed ? (
            <span className="text-lg font-extrabold text-white tracking-[0.14em] truncate">KAPTRIXCOMPLY</span>
          ) : (
            <span className="text-xl font-extrabold text-white tracking-tight">KC</span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Engagement context selector */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-white/10">
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 transition-colors text-left group"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-white truncate">{orgName}</span>
              <span className="block text-[10px] text-white/50 truncate uppercase tracking-wider">Institutional</span>
            </span>
            <ChevronDown size={14} className="text-white/40 shrink-0 group-hover:text-white/70" />
          </button>
        </div>
      )}

      {isCollapsed && (
        <div className="flex justify-center py-3 border-b border-white/10">
          <span
            className="h-2 w-2 rounded-full bg-emerald-400"
            aria-label={orgName}
            title={orgName}
          />
        </div>
      )}

      {/* Main nav */}
      <div className="flex-1 py-2 overflow-y-auto">
        <SidebarSection>
          {NAV_ITEMS.map(item => (
            <SidebarItem
              key={item.href}
              href={item.href}
              label={item.label}
              descriptor={item.descriptor}
              icon={item.icon}
              exact={item.exact}
            />
          ))}
        </SidebarSection>

        {/* Engagement sub-nav */}
        {engagementId && engagementItems.length > 0 && (
          <SidebarSection title="Current Engagement">
            {engagementItems.map(item => (
              <SidebarItem
                key={item.href}
                href={item.href}
                label={item.label}
                descriptor={item.descriptor}
                icon={item.icon}
                exact={'exact' in item ? item.exact : undefined}
              />
            ))}
          </SidebarSection>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10">
        {/* Need help? */}
        {!isCollapsed ? (
          <div className="px-4 pt-3 pb-2">
            <div className="rounded-lg bg-white/10 border border-white/15 p-3 mb-3">
              <p className="text-xs font-semibold text-white mb-0.5">Need help?</p>
              <p className="text-[11px] text-white/60 mb-2 leading-relaxed">
                Ask our AI assistant about your compliance analysis.
              </p>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-md transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                  <path d="M19 3v4M21 5h-4"/>
                </svg>
                Ask AI
              </button>
            </div>

            {/* User chip */}
            <div className="flex items-center gap-2.5 px-1 pb-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{userName ?? 'Demo User'}</p>
                <p className="text-[11px] text-white/50 truncate">{orgName}</p>
              </div>
              <ChevronDown size={14} className="text-white/40 shrink-0" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <button
              type="button"
              title="Ask AI"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                <path d="M19 3v4M21 5h-4"/>
              </svg>
            </button>
            <div
              className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold"
              title={userName ?? 'Demo User'}
            >
              {initials}
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}
