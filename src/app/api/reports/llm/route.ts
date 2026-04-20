import { NextResponse } from "next/server";
import { isSelfHostedLlmConfigured, getSelfHostedLlmModelForTask, isOpenRouterConfigured } from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, OPENROUTER_REPORT_MODEL } from "@/lib/llm/openrouter";
import { getPreviewSnapshot } from "@/lib/preview/data";
import { buildReportEvidenceContext } from "@/lib/reports/context";
import {
  getAdvancedReportConfig,
  buildUpdateSystemPrompt,
  type AdvancedReportId,
} from "@/lib/reports/advanced-reports";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  client_id: string;
  report_type: AdvancedReportId;
  knowledge_base?: string;
  /** Full markdown of a previously-generated saved report. When present,
   *  the LLM operates in update mode (REPORT_UPDATE_PROTOCOL) instead
   *  of generating from scratch. */
  existing_report?: string;
}

// Context assembly is now handled by the shared builder in
// @/lib/reports/context — keep this route thin so every data source
// flows into both report routes uniformly.

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clientId = (body.client_id ?? "").trim();
  const reportType = body.report_type;

  if (!clientId) {
    return NextResponse.json({ error: "Missing client_id" }, { status: 400 });
  }

  const config = getAdvancedReportConfig(reportType);
  if (!config) {
    return NextResponse.json(
      { error: `Unknown report_type: ${reportType}` },
      { status: 400 },
    );
  }

  const useOpenRouter = isOpenRouterConfigured();
  if (!useOpenRouter && !isSelfHostedLlmConfigured()) {
    return NextResponse.json(
      {
        error:
          "No LLM provider configured. Set OPENROUTER_API_KEY or SELF_HOSTED_LLM_BASE_URL + SELF_HOSTED_LLM_MODEL in .env.local / Vercel.",
      },
      { status: 503 },
    );
  }

  let evidence = "";
  let targetName = "";
  let clientName = "";
  try {
    const snapshot = await getPreviewSnapshot(clientId);
    evidence = buildReportEvidenceContext(snapshot, { maxChars: 90_000 });
    targetName = snapshot.engagement.target_company_name;
    clientName = snapshot.engagement.client_firm_name;
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not load engagement snapshot: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 500 },
    );
  }

  const kbText = (body.knowledge_base ?? "").slice(0, 20_000);
  const combinedEvidence = kbText
    ? `${evidence}\n\n--- OPERATOR-SUBMITTED KNOWLEDGE BASE ---\n${kbText}`.slice(
        0,
        90_000,
      )
    : evidence;

  const existingReport = (body.existing_report ?? "").slice(0, 48_000);
  const isUpdateMode = existingReport.length > 0;

  const systemPrompt = isUpdateMode
    ? buildUpdateSystemPrompt(config.systemPrompt)
    : config.systemPrompt;

  const userPrompt = isUpdateMode
    ? `${config.userPromptIntro} — UPDATE MODE

TARGET: ${targetName}
CLIENT: ${clientName}

PRIOR REPORT (existing version — parse baseline state from this):
"""
${existingReport}
"""

NEW / UPDATED EVIDENCE (delta since prior report was generated):
"""
${combinedEvidence}
"""

Follow the REPORT UPDATE PROTOCOL. Return the updated report as clean markdown only. No preamble, no closing remarks, no code fences.`
    : `${config.userPromptIntro}

TARGET: ${targetName}
CLIENT: ${clientName}

EVIDENCE (use only what is supported here; label uncertainty where the evidence is thin):
"""
${combinedEvidence}
"""

Return the report as clean markdown only. No preamble, no closing remarks, no code fences.`;

  try {
    let content: string;
    let finishReason: string | null;

    if (useOpenRouter) {
      const resp = await openRouterChat({
        model: OPENROUTER_REPORT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: 4096,
      });
      content = resp.content;
      finishReason = resp.finishReason;
    } else {
      const resp = await llmChat({
        model: getSelfHostedLlmModelForTask("report"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: 1100,
      });
      content = resp.content;
      finishReason = resp.finishReason;
    }

    if (!content) {
      return NextResponse.json(
        {
          error:
            "Model returned an empty response. The self-hosted model may have timed out or run out of memory.",
          debug: { finish_reason: finishReason },
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      report_type: reportType,
      title: config.title,
      content,
      is_update: isUpdateMode,
      generated_at: new Date().toISOString(),
      target: targetName,
      client: clientName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Report generation failed: ${message}` },
      { status: 502 },
    );
  }
}
