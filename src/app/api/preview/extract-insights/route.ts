// POST /api/preview/extract-insights
//
// Accepts parsed text from an uploaded document and runs an LLM pass
// to extract structured KnowledgeInsight objects. The caller stores
// the results in localStorage and merges them into the Insights page.
//
// Body: { filename: string; category: string; text: string }
// Response: { insights: KnowledgeInsight[] }

import { NextRequest, NextResponse } from "next/server";
import {
  isSelfHostedLlmConfigured,
  isOpenRouterConfigured,
  getSelfHostedLlmModelForTask,
} from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { requireAuth, authErrorResponse } from "@/lib/security/authz";
import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";

export const runtime = "nodejs";
export const maxDuration = 120;

const CATEGORIES = [
  "commercial",
  "technical",
  "regulatory",
  "financial",
  "operational",
] as const;

const SYSTEM_PROMPT = `You are an AI investment-diligence analyst. You receive the extracted text from a diligence document and must surface the most important, verifiable insights for an investment committee reviewing an AI-systems company.

For each insight you find:
- Quote the most relevant excerpt verbatim (≤80 words).
- Write a concise one-sentence insight that adds analytical value beyond the raw quote.
- Classify into exactly one category: commercial, technical, regulatory, financial, operational.
- Assign confidence: high (explicit statement), medium (implied), low (inference/speculation).
- If the insight maps to a known intake field (e.g. "revenue_arr", "customer_count", "team_size"), set suggested_intake_field and suggested_intake_value.

Rules:
- Return 4–10 insights. More text does not mean more insights — be selective.
- Only include insights a professional analyst would actually act on.
- Do NOT invent facts. Every insight must trace to text in the document.
- Each insight id must be unique — use pattern: "ext-<slug>-<n>" where slug is the filename slug.

Return ONLY valid JSON, no prose:
{
  "insights": [
    {
      "id": "ext-<slug>-1",
      "source_document": "<filename>",
      "excerpt": "<verbatim quote ≤80 words>",
      "insight": "<one analytical sentence>",
      "category": "<commercial|technical|regulatory|financial|operational>",
      "confidence": "<high|medium|low>",
      "suggested_intake_field": "<field key or omit>",
      "suggested_intake_value": "<value or omit>"
    }
  ]
}`;

interface ExtractBody {
  filename?: string;
  category?: string;
  text?: string;
}

function makeSlug(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 24);
}

async function callLlm(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  if (isSelfHostedLlmConfigured()) {
    const result = await llmChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      maxTokens: 1200,
      model: getSelfHostedLlmModelForTask("report"),
      jsonMode: true,
      timeoutMs: 90_000,
    });
    return result.content;
  }
  if (isOpenRouterConfigured()) {
    const result = await openRouterChat({
      model: getOpenRouterModel("extract"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      maxTokens: 1200,
      jsonMode: true,
      timeoutMs: 90_000,
    });
    return result.content;
  }
  throw new Error(
    "No LLM provider configured. Set SELF_HOSTED_LLM_BASE_URL or OPENROUTER_API_KEY.",
  );
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }

  let body: ExtractBody;
  try {
    body = (await request.json()) as ExtractBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { filename, category, text } = body;

  if (!filename || !text) {
    return NextResponse.json(
      { error: "Missing required fields: filename, text" },
      { status: 400 },
    );
  }

  // Cap text to avoid excessive token usage. ~6000 chars ≈ 1500 tokens.
  const cappedText = text.length > 8000 ? text.slice(0, 8000) + "\n[…truncated]" : text;

  const slug = makeSlug(filename);
  const userMessage = `Document: "${filename}" (category: ${category ?? "unknown"})

--- BEGIN DOCUMENT TEXT ---
${cappedText}
--- END DOCUMENT TEXT ---

Extract the key diligence insights. Use the id prefix "ext-${slug}-".`;

  let rawContent: string;
  try {
    rawContent = await callLlm(SYSTEM_PROMPT, userMessage);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM call failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Parse the JSON response; be forgiving about extra whitespace / fences.
  let parsed: { insights?: unknown } = {};
  try {
    const clean = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(clean) as { insights?: unknown };
  } catch {
    return NextResponse.json(
      { error: "LLM returned non-JSON output", raw: rawContent.slice(0, 500) },
      { status: 502 },
    );
  }

  const rawInsights = Array.isArray(parsed.insights) ? parsed.insights : [];

  // Validate and sanitize each insight to match the KnowledgeInsight shape.
  const insights: KnowledgeInsight[] = [];
  for (const item of rawInsights) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.insight !== "string") continue;
    if (!CATEGORIES.includes(r.category as (typeof CATEGORIES)[number])) continue;

    insights.push({
      id: String(r.id),
      source_document: String(r.source_document ?? filename),
      excerpt: String(r.excerpt ?? ""),
      insight: String(r.insight),
      category: r.category as KnowledgeInsight["category"],
      confidence: (["high", "medium", "low"].includes(String(r.confidence))
        ? r.confidence
        : "medium") as KnowledgeInsight["confidence"],
      ...(typeof r.suggested_intake_field === "string" && r.suggested_intake_field
        ? { suggested_intake_field: r.suggested_intake_field }
        : {}),
      ...(typeof r.suggested_intake_value === "string" && r.suggested_intake_value
        ? { suggested_intake_value: r.suggested_intake_value }
        : {}),
    });
  }

  return NextResponse.json({ insights });
}
