import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/design-system';
import { listVendorEngagements } from '@/lib/compliance/queries';

export default async function VendorProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role, org_id, org_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const engagements = await listVendorEngagements(user.id);
  const userName = user.user_metadata?.full_name as string | undefined ?? user.email?.split('@')[0] ?? 'User';
  const initials = userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const stats = [
    { label: 'Total Engagements',   value: engagements.length },
    { label: 'Active Reviews',       value: engagements.filter(e => e.status === 'in_review').length },
    { label: 'Completed',            value: engagements.filter(e => e.status === 'completed').length },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Your organization and compliance profile"
        breadcrumbs={[{ label: 'Dashboard', href: '/vendor/dashboard' }, { label: 'Profile' }]}
      />

      {/* Profile card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-6">
        <div className="flex items-start gap-5">
          <div className="h-16 w-16 rounded-full bg-success-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{userName}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-success-100 text-success-700">
                Vendor
              </span>
              {roleRecord?.org_name && (
                <span className="text-sm text-gray-500">{roleRecord.org_name}</span>
              )}
            </div>
          </div>
          <button className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Account details */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Account Details</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Email',       value: user.email ?? '—' },
            { label: 'User ID',     value: user.id,           mono: true },
            { label: 'Role',        value: roleRecord?.role ?? 'vendor' },
            { label: 'Organization',value: roleRecord?.org_name ?? '—' },
            { label: 'Member since',value: user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-6 px-6 py-3.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 shrink-0">{row.label}</span>
              <span className={row.mono ? 'text-xs font-mono text-gray-500 truncate' : 'text-sm text-gray-900'}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Security</h2>
        </div>
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Password</p>
            <p className="text-xs text-gray-400 mt-0.5">Last updated — unknown</p>
          </div>
          <a
            href="/account"
            className="px-3 py-2 text-sm font-medium text-primary-500 border border-primary-200 rounded-md hover:bg-primary-50 transition-colors"
          >
            Change password
          </a>
        </div>
      </div>
    </div>
  );
}
