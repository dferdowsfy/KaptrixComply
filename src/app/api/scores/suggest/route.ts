// LLM-based scoring suggestion for the preview workspace.
//
// POST /api/scores/suggest
//   body: { knowledge_base: string }
//   → { scores: SuggestedScore[] }
//
// Strategy: fan out into 6 parallel dimension-level LLM calls (one per
// scoring dimension, 4-5 sub-criteria each) instead of one monolithic
// prompt. Each call is fast (~15-30s), they run concurrently, so the
// total wall-clock time is bounded by the slowest dimension rather than
// the sum of all 24 sub-criteria. This prevents the 295s timeout.

import { NextResponse } from "next/server";
import {
  isSelfHostedLlmConfigured,
  getSelfHostedLlmModelForTask,
  isOpenRouterConfigured,
} from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { SCORING_DIMENSIONS } from "@/lib/constants";
import type { DimensionConfig } from "@/lib/types";
import {
  AuthError,
  assertPreviewTabVisible,
  authErrorResponse,
  requireAuth,
} from "@/lib/security/authz";

export const runtime = "nodejs";
export const maxDuration = 300;

export interface SuggestedScore {
  dimension: string;
  sub_criterion: string;
  score_0_to_5: number;
  rationale: string;
}

interface SuggestBody {
  knowledge_base?: string;
}

// ── Terse prompt builder for one dimension ────────────────────────────────────
//
// Full band descriptions are omitted from the prompt — they add many tokens
// but the model only needs the label to calibrate. The operator can read the
// full band description in the UI.

function buildDimensionSystemPrompt(dim: DimensionConfig): string {
  const criteria = dim.sub_criteria
    .map((sub) => {
      const bands = sub.score_bands
        ? sub.score_bands
            .map((b) => `${b.max}="${b.label}"`)
            .join(", ")
        : "0–5";
      return `  • ${sub.key} (${sub.name}): ${sub.description}\n    Bands: ${bands}`;
    })
    .join("\n\n");

  return `You are an AI diligence analyst scoring the "${dim.name}" dimension.

RULES
- Scores must be multiples of 0.5 in [0, 5].
- Ground every score in specific evidence from the knowledge base. Do NOT invent facts.
- If no relevant evidence: score 0.0, rationale "Insufficient evidence provided."
- Default toward the lower band when uncertain (lack of evidence = risk signal).
- Rationale: 1–2 sentences citing the specific evidence.

SUB-CRITERIA FOR THIS DIMENSION
${criteria}

Return ONLY valid JSON — no prose, no markdown, no code fences:
{"scores":[{"dimension":"${dim.key}","sub_criterion":"<key>","score_0_to_5":<0–5 in 0.5 steps>,"rationale":"<1-2 sentences>"},...]}

Return exactly ${dim.sub_criteria.length} score object(s), one per sub-criterion listed above.`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

function isValidSuggestedScore(v: unknown): v is SuggestedScore {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.dimension === "string" &&
    typeof s.sub_criterion === "string" &&
    typeof s.score_0_to_5 === "number" &&
    s.score_0_to_5 >= 0 &&
    s.score_0_to_5 <= 5 &&
    typeof s.rationale === "string"
  );
}

function snapToHalf(n: number): number {
  return Math.round(Math.max(0, Math.min(5, n)) * 2) / 2;
}

// ── Per-dimension LLM call ────────────────────────────────────────────────────

async function scoreDimension(
  dim: DimensionConfig,
  knowledge_base: string,
  useSelfHosted: boolean,
): Promise<SuggestedScore[]> {
  const systemPrompt = buildDimensionSystemPrompt(dim);
  const userPrompt = `ENGAGEMENT KNOWLEDGE BASE\n${knowledge_base}\n\nScore the ${dim.sub_criteria.length} sub-criteria above. Return only the JSON.`;

  const messages: { role: "system" | "user"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // Output per dimension: ~4 scores × ~80 tokens each ≈ 320 tokens max.
  const maxTokens = 600;

  let raw: string;
  if (useSelfHosted) {
    const result = await llmChat({
      messages,
      model: getSelfHostedLlmModelForTask("report"),
      temperature: 0.1,
      maxTokens,
      jsonMode: true,
    });
    raw = result.content;
  } else {
    const result = await openRouterChat({
      model: getOpenRouterModel("scoring"),
      messages,
      temperature: 0.1,
      maxTokens,
      jsonMode: true,
    });
    raw = result.content;
  }

  const parsed = extractJson(raw) as Record<string, unknown>;
  const rawScores = Array.isArray(parsed?.scores) ? parsed.scores : [];
  return rawScores
    .filter(isValidSuggestedScore)
    .map((s) => ({ ...s, score_0_to_5: snapToHalf(s.score_0_to_5) }));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Anonymous callers may use the public preview demo. Authenticated users
  // respect admin-hidden tab visibility.
  try {
    const authCtx = await requireAuth();
    assertPreviewTabVisible(authCtx, "scoring");
  } catch (err) {
    if (!(err instanceof AuthError) || err.status !== 401) {
      return authErrorResponse(err);
    }
  }

  let body: SuggestBody;
  try {
    body = (await req.json()) as SuggestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Cap KB text to avoid inflating each prompt unnecessarily.
  const knowledge_base = (body.knowledge_base ?? "").trim().slice(0, 6_000);
  if (!knowledge_base) {
    return NextResponse.json(
      { error: "knowledge_base is required" },
      { status: 400 },
    );
  }

  const useSelfHosted = isSelfHostedLlmConfigured();
  const useOpenRouter = isOpenRouterConfigured();

  if (!useSelfHosted && !useOpenRouter) {
    return NextResponse.json(
      { error: "No LLM provider configured (set SELF_HOSTED_LLM_* or OPENROUTER_API_KEY)." },
      { status: 503 },
    );
  }

  // Fan out: 6 parallel dimension-level calls. Each generates 4-5 scores and
  // finishes in seconds; total time = max(all 6), not sum(all 24).
  const results = await Promise.allSettled(
    SCORING_DIMENSIONS.map((dim) => scoreDimension(dim, knowledge_base, useSelfHosted && !useOpenRouter)),
  );

  const scores: SuggestedScore[] = [];
  const errors: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const dim = SCORING_DIMENSIONS[i];
    if (result.status === "fulfilled") {
      // Backfill any missing sub-criteria with a 0 score so the panel always
      // has a complete set (avoids rendering gaps in the scoring panel).
      const returned = new Set(result.value.map((s) => s.sub_criterion));
      scores.push(...result.value);
      for (const sub of dim.sub_criteria) {
        if (!returned.has(sub.key)) {
          scores.push({
            dimension: dim.key,
            sub_criterion: sub.key,
            score_0_to_5: 0,
            rationale: "Insufficient evidence provided.",
          });
        }
      }
    } else {
      errors.push(`${dim.key}: ${result.reason instanceof Error ? result.reason.message : "failed"}`);
      // Backfill the whole dimension with 0s on error.
      for (const sub of dim.sub_criteria) {
        scores.push({
          dimension: dim.key,
          sub_criterion: sub.key,
          score_0_to_5: 0,
          rationale: "Score generation failed for this dimension.",
        });
      }
    }
  }

  if (scores.length === 0) {
    return NextResponse.json(
      { error: `All dimensions failed: ${errors.join("; ")}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ scores, ...(errors.length > 0 ? { partial_errors: errors } : {}) });
}
