'use client';
import React from 'react';
import type { User } from '@supabase/supabase-js';
import { Search, Bell, HelpCircle, ChevronDown } from 'lucide-react';
import { AppShell } from '@/design-system';
import { VendorSidebar } from './VendorSidebar';
import { UserMenu } from '@/components/shell/UserMenu';

interface VendorShellProps {
  user: User;
  roleRecord: { role: string; org_id: string | null; org_name: string | null } | null;
  children: React.ReactNode;
}

export function VendorShell({ user, roleRecord, children }: VendorShellProps) {
  const orgName = roleRecord?.org_name ?? 'My Company';
  const userName = user.user_metadata?.full_name as string | undefined
    ?? user.email?.split('@')[0] ?? 'User';
  const initials = userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const topbar = (
    <header className="h-16 flex items-center gap-4 px-6 bg-white border-b border-gray-200 shrink-0 sticky top-0 z-20">
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors text-left"
      >
        <span className="h-2 w-2 rounded-full bg-success-500 shrink-0" aria-hidden="true" />
        <span className="block text-sm font-semibold text-gray-900">{orgName}</span>
        <ChevronDown size={14} className="text-gray-400 ml-1" />
      </button>

      <div className="flex items-center gap-1 ml-auto">
        <button type="button" className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Search">
          <Search size={18} />
        </button>
        <button type="button" className="relative h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <button type="button" className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Help">
          <HelpCircle size={18} />
        </button>
        <UserMenu
          userName={userName}
          userEmail={user.email}
          initials={initials}
          avatarClass="bg-success-500 hover:bg-success-600"
          profileHref="/vendor/profile"
          settingsHref="/account"
        />
      </div>
    </header>
  );

  return (
    <AppShell
      sidebar={
        <VendorSidebar
          orgName={orgName}
          userName={userName}
          userEmail={user.email}
        />
      }
      topbar={topbar}
    >
      {children}
    </AppShell>
  );
}
