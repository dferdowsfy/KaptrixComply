'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Home,
  ClipboardList,
  FileText,
  AlertCircle,
  History,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Sidebar, SidebarSection, SidebarItem } from '@/design-system';

const NAV_ITEMS = [
  { href: '/vendor/dashboard',      label: 'Home',           descriptor: 'Overview & status',   icon: <Home size={18} />,         exact: true },
  { href: '/vendor/questionnaires', label: 'Questionnaires', descriptor: 'Active reviews',       icon: <ClipboardList size={18} /> },
  { href: '/vendor/evidence',       label: 'Evidence',       descriptor: 'Upload & manage',      icon: <FileText size={18} /> },
  { href: '/vendor/gaps',           label: 'Gaps',           descriptor: 'Items to address',     icon: <AlertCircle size={18} /> },
  { href: '/vendor/profile',        label: 'Profile',        descriptor: 'Company information',  icon: <User size={18} /> },
  { href: '/vendor/history',        label: 'History',        descriptor: 'Past submissions',     icon: <History size={18} /> },
];

interface VendorSidebarProps {
  orgName: string;
  userName?: string;
  userEmail?: string;
}

export function VendorSidebar({ orgName, userName, userEmail: _userEmail }: VendorSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('vendor-sidebar-collapsed');
    if (stored === 'true') setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('vendor-sidebar-collapsed', String(next));
      return next;
    });
  };

  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'V';

  return (
    <Sidebar isCollapsed={isCollapsed}>
      {/* Brand + collapse toggle */}
      <div className={`border-b border-white/10 ${isCollapsed ? 'px-2 py-4 flex flex-col items-center gap-3' : 'px-4 py-4 flex items-center justify-between gap-2'}`}>
        <Link href="/vendor/dashboard" className="flex items-center min-w-0">
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

      {/* Org selector */}
      {!isCollapsed ? (
        <div className="px-4 py-3 border-b border-white/10">
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 transition-colors text-left group"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-white truncate">{orgName}</span>
              <span className="block text-[10px] text-white/50 truncate uppercase tracking-wider">Vendor</span>
            </span>
            <ChevronDown size={14} className="text-white/40 shrink-0 group-hover:text-white/70" />
          </button>
        </div>
      ) : (
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
      </div>

      {/* Footer */}
      <div className="border-t border-white/10">
        {!isCollapsed ? (
          <div className="px-4 pt-3 pb-2">
            <div className="rounded-lg bg-white/10 border border-white/15 p-3 mb-3">
              <p className="text-xs font-semibold text-white mb-0.5">Need help?</p>
              <p className="text-[11px] text-white/60 mb-2 leading-relaxed">
                Ask our AI assistant about your compliance submissions.
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
