import {
  buildEngineInputFromPreview,
  intakePayloadToResponses,
} from "@/lib/scoring/engine-preview-adapter";
import { runScoringEngine } from "@/lib/scoring/engine";
import type {
  IntakePayload,
  PreAnalysisPayload,
} from "@/lib/preview/kb-format";
import type { UploadedDoc } from "@/lib/preview/uploaded-docs";
import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";

function mkIntake(overrides: Partial<IntakePayload> = {}): IntakePayload {
  return {
    kind: "intake",
    answered_fields: 0,
    regulatory_exposure: [],
    diligence_priorities: [],
    red_flag_priors: [],
    ...overrides,
  };
}

function mkDoc(overrides: Partial<UploadedDoc> = {}): UploadedDoc {
  return {
    id: "doc-1",
    client_id: "c1",
    filename: "soc2.pdf",
    category: "security",
    mime_type: "application/pdf",
    file_size_bytes: 1024,
    uploaded_at: "2026-01-01T00:00:00.000Z",
    parse_status: "parsed",
    parsed_text: "SOC 2 attestation text.",
    ...overrides,
  };
}

function mkInsight(overrides: Partial<KnowledgeInsight> = {}): KnowledgeInsight {
  return {
    id: "i1",
    source_document: "deck.pdf",
    excerpt: "…",
    insight: "Product uses fine-tuned model",
    category: "technical",
    confidence: "high",
    ...overrides,
  };
}

describe("intakePayloadToResponses", () => {
  it("skips empty / null / zero-length fields", () => {
    const out = intakePayloadToResponses(mkIntake({}));
    expect(out).toEqual([]);
  });

  it("emits string + array fields that are populated", () => {
    const out = intakePayloadToResponses(
      mkIntake({
        regulatory_exposure: ["HIPAA"],
        customer_data_usage_rights: "ambiguous / not documented",
        kill_criteria: "   ",
      }),
    );
    const fields = out.map((r) => r.field).sort();
    expect(fields).toEqual(["customer_data_usage_rights", "regulatory_exposure"]);
  });
});

describe("buildEngineInputFromPreview", () => {
  it("returns empty-but-valid input when nothing is provided", () => {
    const input = buildEngineInputFromPreview({});
    expect(input.intake).toEqual([]);
    expect(input.artifacts).toEqual([]);
  });

  it("maps security documents onto governance + isolation sub-criteria", () => {
    const input = buildEngineInputFromPreview({
      uploadedDocs: [mkDoc({ id: "d1", category: "security" })],
    });
    const subs = input.artifacts.map((a) => `${a.dimension}.${a.sub_criterion}`);
    expect(subs).toContain("governance_safety.access_controls");
    expect(subs).toContain("governance_safety.logging_observability");
    expect(subs).toContain("data_sensitivity.customer_isolation");
    for (const a of input.artifacts) {
      expect(a.signal).toBe("supports_high");
    }
  });

  it("ignores unparsed documents", () => {
    const input = buildEngineInputFromPreview({
      uploadedDocs: [mkDoc({ parse_status: "queued" })],
    });
    expect(input.artifacts).toHaveLength(0);
  });

  it("converts high-confidence insights to supports_high artifacts", () => {
    const input = buildEngineInputFromPreview({
      extractedInsights: [mkInsight({ category: "regulatory", confidence: "high" })],
    });
    expect(input.artifacts).toHaveLength(1);
    const a = input.artifacts[0];
    expect(a.signal).toBe("supports_high");
    expect(a.dimension).toBe("data_sensitivity");
    expect(a.sub_criterion).toBe("regulated_data");
  });

  it("drops low-confidence insights", () => {
    const input = buildEngineInputFromPreview({
      extractedInsights: [mkInsight({ confidence: "low" })],
    });
    expect(input.artifacts).toHaveLength(0);
  });

  it("maps pre-analysis critical flags to supports_low artifacts", () => {
    const preAnalysis: PreAnalysisPayload = {
      kind: "pre_analysis",
      analyses_total: 1,
      critical_red_flags: [
        { flag: "No incident response plan", dimension: "production_readiness" },
      ],
      high_red_flags: [],
      open_questions_total: 0,
    };
    const input = buildEngineInputFromPreview({ preAnalysis });
    expect(input.artifacts).toHaveLength(1);
    expect(input.artifacts[0].signal).toBe("supports_low");
    expect(input.artifacts[0].sub_criterion).toBe("incident_response");
  });

  it("end-to-end: intake + security doc → artifact_supported on access_controls", () => {
    const out = runScoringEngine(
      buildEngineInputFromPreview({
        intake: mkIntake({ artifacts_received: ["SOC 2"] }),
        uploadedDocs: [mkDoc({ id: "soc2", category: "security" })],
      }),
    );
    const s = out.sub_criteria.find(
      (x) =>
        x.dimension === "governance_safety" &&
        x.sub_criterion === "access_controls",
    );
    expect(s).toBeDefined();
    expect(s!.source_mix).toBe("artifact_supported");
    expect(["MEDIUM", "HIGH"]).toContain(s!.confidence);
    expect(s!.score).toBeGreaterThan(3);
  });

  it("end-to-end: determinism preserved through the adapter", () => {
    const sources = {
      intake: mkIntake({
        regulatory_exposure: ["HIPAA"],
        artifacts_received: ["SOC 2"],
      }),
      uploadedDocs: [mkDoc({ id: "d1", category: "security" })],
    };
    const a = runScoringEngine(buildEngineInputFromPreview(sources));
    const b = runScoringEngine(buildEngineInputFromPreview(sources));
    expect(a).toEqual(b);
  });
});
