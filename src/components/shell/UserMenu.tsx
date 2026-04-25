'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, User as UserIcon, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserMenuProps {
  userName: string;
  userEmail?: string;
  initials: string;
  /** Tailwind background class for the avatar circle (e.g. 'bg-primary-500') */
  avatarClass?: string;
  /** Where the "Profile" link goes (defaults to /account) */
  profileHref?: string;
  /** Where the "Settings" link goes (defaults to /account) */
  settingsHref?: string;
}

export function UserMenu({
  userName,
  userEmail,
  initials,
  avatarClass = 'bg-primary-500 hover:bg-primary-600',
  profileHref = '/account',
  settingsHref = '/account',
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore — fall through to redirect anyway
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
        className="ml-1 inline-flex items-center gap-1.5 rounded-full pl-0.5 pr-1.5 py-0.5 hover:bg-gray-100 transition-colors"
      >
        <span
          className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors ${avatarClass}`}
        >
          {initials}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
            {userEmail && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{userEmail}</p>
            )}
          </div>

          <div className="py-1">
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <UserIcon size={15} className="text-gray-500" />
              Profile
            </Link>
            <Link
              href={settingsHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings size={15} className="text-gray-500" />
              Settings
            </Link>
          </div>

          <div className="py-1 border-t border-gray-100">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 disabled:opacity-60"
            >
              <LogOut size={15} />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
