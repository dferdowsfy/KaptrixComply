/**
 * Tiered pricing + limits for Kaptrix.
 *
 * Three tiers: starter | professional | institutional.
 * Admins are forced to 'institutional' via the DB trigger.
 *
 * Limits can be overridden per-user via public.users.tier_overrides
 * (JSONB). A value of `null` or `-1` on an override field means
 * "unlimited" and bypasses the gate.
 */

export type Tier = "starter" | "professional" | "institutional";

export interface TierLimits {
  /** Max concurrently-active engagements. -1 = unlimited. */
  max_engagements: number;
  /** Max reports generated per calendar month (UTC). -1 = unlimited. */
  max_reports_per_month: number;
  /** Max AI/chat queries per calendar month (UTC). -1 = unlimited. */
  max_ai_queries_per_month: number;
  /** Whether benchmarking / positioning module is unlocked. */
  benchmarking_enabled: boolean;
  /** Whether advanced / IC-grade report exports are unlocked. */
  advanced_reports_enabled: boolean;
  /** Whether priority processing indicator is shown. */
  priority_processing: boolean;
  /** Whether the tier supports multi-user collaboration. */
  team_collaboration: boolean;
}

export interface TierDefinition {
  id: Tier;
  label: string;
  tagline: string;
  target: string;
  limits: TierLimits;
}

export const TIERS: Record<Tier, TierDefinition> = {
  starter: {
    id: "starter",
    label: "Starter",
    tagline: "For individual operators getting started",
    target: "Individual operators · small teams",
    limits: {
      max_engagements: 3,
      max_reports_per_month: 10,
      max_ai_queries_per_month: 100,
      benchmarking_enabled: false,
      advanced_reports_enabled: false,
      priority_processing: false,
      team_collaboration: false,
    },
  },
  professional: {
    id: "professional",
    label: "Professional",
    tagline: "For small funds and active diligence teams",
    target: "Small funds · active diligence teams",
    limits: {
      max_engagements: 10,
      max_reports_per_month: 40,
      max_ai_queries_per_month: 500,
      benchmarking_enabled: true,
      advanced_reports_enabled: true,
      priority_processing: false,
      team_collaboration: false,
    },
  },
  institutional: {
    id: "institutional",
    label: "Institutional",
    tagline: "For large PE / enterprise users",
    target: "Large PE · enterprise",
    limits: {
      max_engagements: -1,
      max_reports_per_month: -1,
      max_ai_queries_per_month: 2000,
      benchmarking_enabled: true,
      advanced_reports_enabled: true,
      priority_processing: true,
      team_collaboration: true,
    },
  },
};

export const ALL_TIERS: Tier[] = ["starter", "professional", "institutional"];

export function isValidTier(value: unknown): value is Tier {
  return typeof value === "string" && (ALL_TIERS as string[]).includes(value);
}

/** Merge a user's tier defaults with per-user overrides. */
export function resolveLimits(
  tier: Tier | null | undefined,
  overrides: Partial<TierLimits> | null | undefined,
): TierLimits {
  const base = TIERS[tier ?? "starter"].limits;
  if (!overrides) return base;
  return {
    max_engagements: pickLimit(overrides.max_engagements, base.max_engagements),
    max_reports_per_month: pickLimit(
      overrides.max_reports_per_month,
      base.max_reports_per_month,
    ),
    max_ai_queries_per_month: pickLimit(
      overrides.max_ai_queries_per_month,
      base.max_ai_queries_per_month,
    ),
    benchmarking_enabled:
      typeof overrides.benchmarking_enabled === "boolean"
        ? overrides.benchmarking_enabled
        : base.benchmarking_enabled,
    advanced_reports_enabled:
      typeof overrides.advanced_reports_enabled === "boolean"
        ? overrides.advanced_reports_enabled
        : base.advanced_reports_enabled,
    priority_processing:
      typeof overrides.priority_processing === "boolean"
        ? overrides.priority_processing
        : base.priority_processing,
    team_collaboration:
      typeof overrides.team_collaboration === "boolean"
        ? overrides.team_collaboration
        : base.team_collaboration,
  };
}

function pickLimit(override: unknown, fallback: number): number {
  if (typeof override !== "number") return fallback;
  return override;
}

export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

/** True if an action is within limits. */
export function withinLimit(current: number, limit: number): boolean {
  if (isUnlimited(limit)) return true;
  return current < limit;
}

export interface UsageSnapshot {
  reports_generated: number;
  ai_queries: number;
  active_engagements: number;
}

export function buildUsageView(
  tier: Tier,
  overrides: Partial<TierLimits> | null | undefined,
  usage: UsageSnapshot,
) {
  const limits = resolveLimits(tier, overrides);
  return {
    tier,
    tier_label: TIERS[tier].label,
    limits,
    usage,
    remaining: {
      engagements: isUnlimited(limits.max_engagements)
        ? null
        : Math.max(0, limits.max_engagements - usage.active_engagements),
      reports: isUnlimited(limits.max_reports_per_month)
        ? null
        : Math.max(0, limits.max_reports_per_month - usage.reports_generated),
      ai_queries: isUnlimited(limits.max_ai_queries_per_month)
        ? null
        : Math.max(
            0,
            limits.max_ai_queries_per_month - usage.ai_queries,
          ),
    },
  };
}
