import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ engagements: [] });
  }

  const { data, error } = await supabase
    .from("engagements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ engagements: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const body = await request.json();
  const {
    client_firm_name,
    target_company_name,
    deal_stage,
    tier,
    client_contact_email,
    referral_source,
    engagement_fee,
    delivery_deadline,
    industry,
    summary,
  } = body;

  if (!client_firm_name || !target_company_name || !deal_stage) {
    return NextResponse.json(
      { error: "Missing required fields: client_firm_name, target_company_name, deal_stage" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("engagements")
    .insert({
      client_firm_name,
      target_company_name,
      deal_stage: deal_stage || "preliminary",
      tier: tier || "standard",
      status: "intake",
      client_contact_email: client_contact_email || null,
      referral_source: referral_source || null,
      engagement_fee: engagement_fee || null,
      delivery_deadline: delivery_deadline || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
