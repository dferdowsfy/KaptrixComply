import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { MiShell } from "@/components/market-intelligence/mi-shell";

export const dynamic = "force-dynamic";

interface Props {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function CategoryLayout({ children, params }: Props) {
  const { id } = await params;

  // Auth check only — session verification, not data reads.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use service client so RLS doesn't block the reads (same pattern as
  // the category API routes). Auth has been verified above.
  const service = getServiceClient();
  if (!service) notFound();

  // Fetch engagement to confirm it's a category engagement.
  const { data: engagement } = await service
    .from("engagements")
    .select("id, subject_kind, status, subject_label, target_company_name")
    .eq("id", id)
    .eq("subject_kind", "category")
    .maybeSingle();

  if (!engagement) {
    notFound();
  }

  // Fetch category profile.
  const { data: profile } = await service
    .from("engagement_category_profile")
    .select("category_name, thesis")
    .eq("engagement_id", id)
    .maybeSingle();

  const categoryName =
    profile?.category_name ??
    engagement.subject_label ??
    engagement.target_company_name;

  return (
    <MiShell
      engagementId={id}
      categoryName={categoryName}
      thesis={profile?.thesis ?? null}
      status={engagement.status}
    >
      {children}
    </MiShell>
  );
}
