import { NextResponse } from "next/server";
import { isOpenRouterConfigured, getOpenRouterApiKey } from "@/lib/env";
import { getPreviewSnapshot } from "@/lib/preview/data";
import {
  getAdvancedReportConfig,
  type AdvancedReportId,
} from "@/lib/reports/advanced-reports";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  client_id: string;
  report_type: AdvancedReportId;
  knowledge_base?: string;
}

function buildContextFromSnapshot(
  snapshot: Awaited<ReturnType<typeof getPreviewSnapshot>>,
): string {
  const parts: string[] = [];
  parts.push(
    `ENGAGEMENT: target=${snapshot.engagement.target_company_name}, client=${snapshot.engagement.client_firm_name}, deal_stage=${snapshot.engagement.deal_stage}, tier=${snapshot.engagement.tier}.`,
  );

  snapshot.knowledgeInsights.forEach((k) => {
    parts.push(`[${k.source_document}] ${k.insight} — excerpt: ${k.excerpt}`);
  });

  snapshot.analyses.forEach((a) => {
    a.extracted_claims.forEach((c) => {
      parts.push(`[${c.source_doc} ${c.source_location}] claim: ${c.claim}`);
    });
    a.red_flags.forEach((f) => {
      parts.push(`[red flag · ${f.severity} · ${f.dimension}] ${f.flag} — ${f.evidence}`);
    });
    a.regulatory_signals.forEach((r) => {
      parts.push(`[regulatory · ${r.exposure_level}] ${r.regulation} — ${r.relevance}`);
    });
    a.open_questions.forEach((q) => parts.push(`[open question] ${q}`));
    a.vendor_dependencies.forEach((v) => parts.push(`[vendor] ${v}`));
    a.model_dependencies.forEach((m) => parts.push(`[model] ${m}`));
  });

  parts.push(
    `[executive summary] ${snapshot.executiveReport.executive_summary}`,
  );
  parts.push(
    `[strategic context] ${snapshot.executiveReport.strategic_context}`,
  );
  snapshot.executiveReport.critical_findings.forEach((f) => {
    parts.push(
      `[finding · ${f.severity}] ${f.title}. ${f.what_we_found}. Why it matters: ${f.why_it_matters}. Evidence: ${f.operator_evidence}`,
    );
  });
  snapshot.executiveReport.recommended_conditions.forEach((c) => {
    parts.push(`[condition] ${c.condition} (owner ${c.owner}). ${c.rationale}`);
  });
  snapshot.executiveReport.value_creation_levers.forEach((l) => {
    parts.push(
      `[value lever · ${l.time_horizon}] ${l.lever} — ${l.thesis}`,
    );
  });
  snapshot.executiveReport.risk_heat_map.forEach((r) => {
    parts.push(
      `[risk · ${r.category}] ${r.risk} (likelihood ${r.likelihood}, impact ${r.impact})`,
    );
  });

  snapshot.scores.forEach((s) => {
    parts.push(
      `[score · ${s.dimension}/${s.sub_criterion}] ${s.score_0_to_5.toFixed(1)} — ${s.operator_rationale}`,
    );
  });

  snapshot.documents.forEach((d) => {
    parts.push(
      `[document] ${d.filename} (${d.category}, status: ${d.parse_status})`,
    );
  });

  return parts.join("\n").slice(0, 70_000);
}

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

  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      {
        error:
          "OpenRouter API key is not configured. Set OPENROUTER_API_KEY in .env.local or Vercel Project Settings to enable report generation.",
      },
      { status: 503 },
    );
  }

  let evidence = "";
  let targetName = "";
  let clientName = "";
  try {
    const snapshot = await getPreviewSnapshot(clientId);
    evidence = buildContextFromSnapshot(snapshot);
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

  const userPrompt = `${config.userPromptIntro}

TARGET: ${targetName}
CLIENT: ${clientName}

EVIDENCE (use only what is supported here; label uncertainty where the evidence is thin):
"""
${combinedEvidence}
"""

Return the report as clean markdown only. No preamble, no closing remarks, no code fences.`;

  try {
    const openRouterRes = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getOpenRouterApiKey()}`,
          "HTTP-Referer": "https://kaptrix.ai",
          "X-Title": "Kaptrix AI Diligence",
        },
        body: JSON.stringify({
          model: "perplexity/sonar-deep-research",
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 8192,
          temperature: 0.2,
        }),
      },
    );

    if (!openRouterRes.ok) {
      const errText = await openRouterRes.text();
      return NextResponse.json(
        { error: `OpenRouter error ${openRouterRes.status}: ${errText}` },
        { status: 502 },
      );
    }

    const completion = (await openRouterRes.json()) as {
      choices?: Array<{
        message?: { content?: string | null; reasoning?: string | null };
        finish_reason?: string;
      }>;
      error?: { message?: string };
    };

    if (completion.error?.message) {
      return NextResponse.json(
        { error: `OpenRouter error: ${completion.error.message}` },
        { status: 502 },
      );
    }

    const msg = completion.choices?.[0]?.message;
    const rawContent = (msg?.content ?? "").toString();
    const rawReasoning = (msg?.reasoning ?? "").toString();

    // Some reasoning models (incl. perplexity sonar-deep-research) either
    // emit the final answer inside <think>...</think> tags in content, or
    // place the final answer in `reasoning` while content is empty. We
    // strip think tags and fall back to reasoning if content is blank.
    const stripThink = (s: string) =>
      s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    let content = stripThink(rawContent);
    if (!content) content = stripThink(rawReasoning);

    if (!content) {
      return NextResponse.json(
        {
          error:
            "Model returned an empty response. The deep-research model may have timed out or returned only tool traces.",
          debug: {
            finish_reason: completion.choices?.[0]?.finish_reason ?? null,
            content_length: rawContent.length,
            reasoning_length: rawReasoning.length,
          },
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      report_type: reportType,
      title: config.title,
      content,
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
