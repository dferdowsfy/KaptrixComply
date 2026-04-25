import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OfficerShell } from '@/components/officer/OfficerShell';

export default async function OfficerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role, org_id, org_name')
    .eq('user_id', user.id)
    .maybeSingle();

  // Allow admins too; redirect vendors to their dashboard
  if (roleRecord && roleRecord.role === 'vendor') redirect('/vendor/dashboard');

  return (
    <OfficerShell user={user} roleRecord={roleRecord}>
      {children}
    </OfficerShell>
  );
}
