// LLM-based scoring suggestion for the preview workspace.
//
// POST /api/scores/suggest
//   body: { knowledge_base: string }
//   → { scores: SuggestedScore[], rationale: string }
//
// Takes the formatted KB evidence for an engagement and returns
// suggested 0–5 scores for every sub-criterion, with a brief rationale
// per dimension. The operator sees these as starting points in the
// scoring panel — they can accept, adjust, or override each one.

import { NextResponse } from "next/server";
import {
  isSelfHostedLlmConfigured,
  getSelfHostedLlmModelForTask,
  isOpenRouterConfigured,
} from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, OPENROUTER_REPORT_MODEL } from "@/lib/llm/openrouter";
import { SCORING_DIMENSIONS } from "@/lib/constants";
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

// Build the flat list of all sub-criteria for the prompt.
const ALL_CRITERIA = SCORING_DIMENSIONS.flatMap((dim) =>
  dim.sub_criteria.map((sub) => ({
    dimension: dim.key,
    dimension_name: dim.name,
    sub_criterion: sub.key,
    sub_criterion_name: sub.name,
    description: sub.description,
    bands: sub.score_bands
      ? sub.score_bands
          .map((b) => `${b.max}: "${b.label}" — ${b.description}`)
          .join("; ")
      : "",
  })),
);

const SYSTEM_PROMPT = `You are an expert AI product diligence analyst. Your job is to suggest evidence-based 0–5 scores for a six-dimension scoring framework, given structured operator notes about an AI product under diligence.

SCORING RULES
- Scores must be multiples of 0.5 in the range [0, 5].
- Ground every score in specific evidence from the knowledge base. Do NOT invent facts.
- If the knowledge base has no relevant evidence for a criterion, score it 0.0 and say "Insufficient evidence provided."
- Be conservative: a lack of evidence is a signal of risk, not neutrality. Default toward the lower band when uncertain.
- The rationale must be 1–2 sentences citing the specific evidence that drives the score.

SCORING DIMENSIONS
${ALL_CRITERIA.map(
  (c) =>
    `${c.dimension}/${c.sub_criterion} (${c.sub_criterion_name}): ${c.description}
  Score bands — ${c.bands}`,
).join("\n\n")}

Return ONLY valid JSON — no prose, no markdown, no code fences:
{
  "scores": [
    {
      "dimension": "<dimension key>",
      "sub_criterion": "<sub_criterion key>",
      "score_0_to_5": <number 0–5 in 0.5 steps>,
      "rationale": "<1-2 sentences citing specific evidence>"
    },
    ...
  ]
}

Return one object per sub-criterion listed above. Do not omit any.`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

function isValidSuggestedScore(v: unknown): v is SuggestedScore {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  if (typeof s.dimension !== "string") return false;
  if (typeof s.sub_criterion !== "string") return false;
  if (typeof s.score_0_to_5 !== "number") return false;
  if (s.score_0_to_5 < 0 || s.score_0_to_5 > 5) return false;
  if (typeof s.rationale !== "string") return false;
  return true;
}

function snapToHalf(n: number): number {
  return Math.round(Math.max(0, Math.min(5, n)) * 2) / 2;
}

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

  const knowledge_base = (body.knowledge_base ?? "").trim();
  if (!knowledge_base) {
    return NextResponse.json(
      { error: "knowledge_base is required" },
      { status: 400 },
    );
  }

  const userPrompt = `ENGAGEMENT KNOWLEDGE BASE\n${knowledge_base}\n\nBased on the evidence above, suggest scores for all sub-criteria. Return only the JSON.`;

  const useSelfHosted = isSelfHostedLlmConfigured();
  const useOpenRouter = isOpenRouterConfigured();

  if (!useSelfHosted && !useOpenRouter) {
    return NextResponse.json(
      { error: "No LLM provider configured (set SELF_HOSTED_LLM_* or OPENROUTER_API_KEY)." },
      { status: 503 },
    );
  }

  let raw: string;
  try {
    if (useSelfHosted) {
      const result = await llmChat({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        model: getSelfHostedLlmModelForTask("report"),
        temperature: 0.1,
        maxTokens: 4096,
        jsonMode: true,
      });
      raw = result.content;
    } else {
      const result = await openRouterChat({
        model: OPENROUTER_REPORT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        maxTokens: 4096,
        jsonMode: true,
      });
      raw = result.content;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    return NextResponse.json(
      { error: "LLM returned invalid JSON", raw: raw.slice(0, 500) },
      { status: 502 },
    );
  }

  const container = parsed as Record<string, unknown>;
  const rawScores = Array.isArray(container?.scores) ? container.scores : [];
  const scores: SuggestedScore[] = rawScores
    .filter(isValidSuggestedScore)
    .map((s) => ({ ...s, score_0_to_5: snapToHalf(s.score_0_to_5) }));

  if (scores.length === 0) {
    return NextResponse.json(
      { error: "LLM returned no valid scores", raw: raw.slice(0, 500) },
      { status: 502 },
    );
  }

  return NextResponse.json({ scores });
}
