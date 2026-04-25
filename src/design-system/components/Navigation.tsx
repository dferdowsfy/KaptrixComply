'use client';
import React, { createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// ─── Sidebar Context ──────────────────────────────────────────────────────────
interface SidebarContextValue { isCollapsed: boolean; }
const SidebarContext = createContext<SidebarContextValue>({ isCollapsed: false });
export function useSidebar() { return useContext(SidebarContext); }

// ─── Sidebar ─────────────────────────────────────────────────────────────────
interface SidebarProps { children: React.ReactNode; className?: string; isCollapsed?: boolean; }
export function Sidebar({ children, className, isCollapsed = false }: SidebarProps) {
  return (
    <SidebarContext.Provider value={{ isCollapsed }}>
      <nav
        className={cn(
          'flex flex-col shrink-0 min-h-screen transition-all duration-300 ease-in-out',
          'bg-[#222564] border-r border-white/10',
          isCollapsed ? 'w-16' : 'w-60',
          className,
        )}
        aria-label="Main navigation"
      >
        {children}
      </nav>
    </SidebarContext.Provider>
  );
}

// ─── SidebarSection ───────────────────────────────────────────────────────────
interface SidebarSectionProps { title?: string; children: React.ReactNode; className?: string; }
export function SidebarSection({ title, children, className }: SidebarSectionProps) {
  const { isCollapsed } = useSidebar();
  return (
    <div className={cn('py-1', className)}>
      {title && !isCollapsed && (
        <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-white/40">
          {title}
        </p>
      )}
      {title && isCollapsed && <div className="mx-2 mt-3 mb-1 border-t border-white/10" />}
      {children}
    </div>
  );
}

// ─── SidebarItem ─────────────────────────────────────────────────────────────
interface SidebarItemProps {
  href: string;
  label: string;
  descriptor?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  exact?: boolean;
}
export function SidebarItem({ href, label, descriptor, icon, badge, exact }: SidebarItemProps) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      className={cn(
        'group flex items-center transition-colors duration-150 rounded-md mx-2',
        'focus-visible:ring-2 focus-visible:ring-primary-400 outline-none',
        isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5',
        isActive
          ? cn('bg-white/15 border-l-[3px] border-white', !isCollapsed && 'pl-[9px]')
          : 'border-l-[3px] border-transparent hover:bg-white/10',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon && (
        <span
          className={cn(
            'shrink-0 w-5 h-5 flex items-center justify-center',
            isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      {!isCollapsed && (
        <>
          <span className="flex-1 min-w-0">
            <span className={cn(
              'block text-sm font-medium truncate leading-tight',
              isActive ? 'text-white font-semibold' : 'text-white/70 group-hover:text-white',
            )}>
              {label}
            </span>
            {descriptor && (
              <span className="block text-[11px] text-white/40 truncate leading-tight mt-0.5">
                {descriptor}
              </span>
            )}
          </span>
          {badge != null && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0',
              isActive ? 'bg-white text-[#222564]' : 'bg-white/20 text-white',
            )}>
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
interface TopbarProps {
  logo?: React.ReactNode;
  title?: string;
  roleBadge?: React.ReactNode;
  actions?: React.ReactNode;
  engagementSelector?: React.ReactNode;
  className?: string;
}
export function Topbar({ logo, title, roleBadge, actions, engagementSelector, className }: TopbarProps) {
  return (
    <header
      className={cn(
        'h-16 flex items-center gap-4 px-6 bg-white border-b border-gray-200 shrink-0 sticky top-0 z-20',
        className,
      )}
    >
      {logo && <div className="shrink-0">{logo}</div>}
      {title && <span className="font-semibold text-gray-800 text-sm">{title}</span>}
      {roleBadge && <div className="shrink-0">{roleBadge}</div>}
      {engagementSelector && <div className="shrink-0">{engagementSelector}</div>}
      <div className="flex items-center gap-2 ml-auto">{actions}</div>
    </header>
  );
}
