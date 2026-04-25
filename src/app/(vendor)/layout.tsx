import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VendorShell } from '@/components/vendor/VendorShell';

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role, org_id, org_name')
    .eq('user_id', user.id)
    .maybeSingle();

  // Redirect officers to their dashboard
  if (roleRecord && roleRecord.role === 'compliance_officer') redirect('/officer/dashboard');

  return (
    <VendorShell user={user} roleRecord={roleRecord}>
      {children}
    </VendorShell>
  );
}
