"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PREVIEW_TABS } from "@/lib/preview-tabs";
import {
  ALL_TIERS,
  TIERS,
  type Tier,
  resolveLimits,
  ALL_REPORT_KINDS,
  REPORT_KIND_LABEL,
  reportKindCap,
  type ReportKind,
} from "@/lib/plans";

interface TierOverrides {
  max_engagements?: number;
  max_reports_per_month?: number;
  max_ai_queries_per_month?: number;
  reports_enabled?: ReportKind[];
  per_report_caps?: Partial<Record<ReportKind, number>>;
  benchmarking_enabled?: boolean;
  advanced_reports_enabled?: boolean;
  priority_processing?: boolean;
  team_collaboration?: boolean;
}

interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  approved: boolean;
  tier: Tier;
  tier_overrides: TierOverrides | null;
  hidden_menu_keys: string[];
  full_name?: string | null;
  firm_name?: string | null;
  created_at: string;
  last_login_at: string | null;
}

const ROLE_OPTIONS = ["admin", "operator", "analyst", "reviewer", "client_viewer"];
// Home + overview are "always visible" to every user by design.
const TOGGLEABLE_TABS = PREVIEW_TABS.filter(
  (t) => t.id !== "home" && t.id !== "overview",
);

export function AdminPanel() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchUser = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<
          AdminUserRow,
          "role" | "approved" | "tier" | "tier_overrides" | "hidden_menu_keys"
        >
      >,
    ) => {
      setBusyUserId(id);
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        // Use the server's post-write row as the source of truth so the UI
        // reflects what actually landed in the DB (not an optimistic guess).
        const persisted = (data?.user ?? {}) as Partial<AdminUserRow>;
        setUsers((rows) =>
          rows.map((r) =>
            r.id === id
              ? ({
                  ...r,
                  ...patch,
                  ...persisted,
                } as AdminUserRow)
              : r,
          ),
        );
        setToast("Saved");
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Update failed");
      } finally {
        setBusyUserId(null);
        setTimeout(() => setToast(null), 2500);
      }
    },
    [],
  );

  const deleteUser = useCallback(async (id: string, email: string) => {
    if (
      !confirm(
        `Delete ${email}? This permanently removes the account, its saved reports, and its access. This cannot be undone.`,
      )
    )
      return;
    setBusyUserId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setUsers((rows) => rows.filter((r) => r.id !== id));
      setToast(`Deleted ${email}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyUserId(null);
      setTimeout(() => setToast(null), 3500);
    }
  }, []);

  const sendReset = useCallback(async (id: string, email: string) => {
    if (!confirm(`Send password reset email to ${email}?`)) return;
    setBusyUserId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/send-reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setToast(`Reset link sent to ${email}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusyUserId(null);
      setTimeout(() => setToast(null), 3500);
    }
  }, []);

  const toggleMenuKey = useCallback(
    (user: AdminUserRow, key: string) => {
      const next = user.hidden_menu_keys.includes(key)
        ? user.hidden_menu_keys.filter((k) => k !== key)
        : [...user.hidden_menu_keys, key];
      patchUser(user.id, { hidden_menu_keys: next });
    },
    [patchUser],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-600">
            Admin panel
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Users & access
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View every Kaptrix user, change their role, toggle menu
            visibility, or trigger a password reset email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back to platform
          </Link>
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {toast && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          {toast}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <NewUserForm
        onCreated={(created) => {
          setUsers((rows) => [created, ...rows]);
          setToast(`Invite sent to ${created.email}`);
          setTimeout(() => setToast(null), 3500);
        }}
        onError={(msg) => {
          setToast(msg);
          setTimeout(() => setToast(null), 3500);
        }}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Limits</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3">Hidden menu tabs</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No users yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={busyUserId === u.id}
                        onChange={(e) =>
                          patchUser(u.id, { role: e.target.value })
                        }
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.tier ?? "starter"}
                        disabled={busyUserId === u.id}
                        onChange={(e) =>
                          patchUser(u.id, { tier: e.target.value as Tier })
                        }
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                      >
                        {ALL_TIERS.map((t) => (
                          <option key={t} value={t}>
                            {TIERS[t].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <LimitsEditor
                        user={u}
                        busy={busyUserId === u.id}
                        onSave={(overrides) =>
                          patchUser(u.id, { tier_overrides: overrides })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={u.approved}
                          disabled={busyUserId === u.id}
                          onChange={(e) =>
                            patchUser(u.id, { approved: e.target.checked })
                          }
                        />
                        <span className="text-sm text-slate-700">
                          {u.approved ? "Yes" : "No"}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {TOGGLEABLE_TABS.map((tab) => {
                          const hidden = u.hidden_menu_keys.includes(tab.id);
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              disabled={busyUserId === u.id}
                              onClick={() => toggleMenuKey(u, tab.id)}
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                                hidden
                                  ? "border-rose-200 bg-rose-50 text-rose-700 line-through"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
                              }`}
                              title={
                                hidden
                                  ? "Hidden — click to show"
                                  : "Visible — click to hide"
                              }
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={busyUserId === u.id}
                          onClick={() => sendReset(u.id, u.email)}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Send reset email
                        </button>
                        <button
                          type="button"
                          disabled={busyUserId === u.id}
                          onClick={() => deleteUser(u.id, u.email)}
                          className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Hidden-tab changes apply the next time the user loads any preview page.
        &quot;Home&quot; and &quot;Overview&quot; are always visible by design.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewUserForm — admin invites a new user by email with role + tier.
// ---------------------------------------------------------------------------
function NewUserForm({
  onCreated,
  onError,
}: {
  onCreated: (user: AdminUserRow) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [role, setRole] = useState("operator");
  const [tier, setTier] = useState<Tier>("starter");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role,
          tier,
          full_name: fullName.trim() || undefined,
          firm_name: firmName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      onCreated({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        approved: true,
        tier: data.user.tier,
        tier_overrides: null,
        hidden_menu_keys: [],
        full_name: fullName || null,
        firm_name: firmName || null,
        created_at: new Date().toISOString(),
        last_login_at: null,
      });
      setEmail("");
      setFullName("");
      setFirmName("");
      setOpen(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          + Invite new user
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Invite a new user</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-slate-700 lg:col-span-2">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="name@firm.com"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Full name
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Firm
          <input
            type="text"
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-700 sm:col-span-2 lg:col-span-1">
          Tier
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as Tier)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {ALL_TIERS.map((t) => (
              <option key={t} value={t}>
                {TIERS[t].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? "Sending invite…" : "Send invite"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        The user receives an email invite with a link to set their password.
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// LimitsEditor — inline per-user tier override editor.
// ---------------------------------------------------------------------------
function LimitsEditor({
  user,
  busy,
  onSave,
}: {
  user: AdminUserRow;
  busy: boolean;
  onSave: (overrides: TierOverrides | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const effective = resolveLimits(user.tier, user.tier_overrides);
  const [eng, setEng] = useState<string>(
    String(user.tier_overrides?.max_engagements ?? ""),
  );
  const [reps, setReps] = useState<string>(
    String(user.tier_overrides?.max_reports_per_month ?? ""),
  );
  const [ai, setAi] = useState<string>(
    String(user.tier_overrides?.max_ai_queries_per_month ?? ""),
  );
  const [reportsEnabled, setReportsEnabled] = useState<ReportKind[]>(
    user.tier_overrides?.reports_enabled ?? effective.reports_enabled,
  );
  const [perReportCaps, setPerReportCaps] = useState<Record<ReportKind, string>>(
    () => {
      const out = {} as Record<ReportKind, string>;
      for (const k of ALL_REPORT_KINDS) {
        const ov = user.tier_overrides?.per_report_caps?.[k];
        out[k] = typeof ov === "number" ? String(ov) : "";
      }
      return out;
    },
  );

  function summary(limit: number): string {
    return limit < 0 ? "Unlimited" : String(limit);
  }

  function save() {
    const next: TierOverrides = {};
    if (eng.trim() !== "") next.max_engagements = Number(eng);
    if (reps.trim() !== "") next.max_reports_per_month = Number(reps);
    if (ai.trim() !== "") next.max_ai_queries_per_month = Number(ai);
    // Only persist reports_enabled if it differs from the tier default.
    const baseEnabled = TIERS[user.tier].limits.reports_enabled;
    const sameAsBase =
      reportsEnabled.length === baseEnabled.length &&
      reportsEnabled.every((k) => baseEnabled.includes(k));
    if (!sameAsBase) next.reports_enabled = reportsEnabled;
    const caps: Partial<Record<ReportKind, number>> = {};
    for (const k of ALL_REPORT_KINDS) {
      const v = perReportCaps[k];
      if (v.trim() !== "" && Number.isFinite(Number(v))) caps[k] = Number(v);
    }
    if (Object.keys(caps).length > 0) next.per_report_caps = caps;
    onSave(Object.keys(next).length ? next : null);
    setOpen(false);
  }

  function reset() {
    setEng("");
    setReps("");
    setAi("");
    setReportsEnabled(TIERS[user.tier].limits.reports_enabled);
    const cleared = {} as Record<ReportKind, string>;
    for (const k of ALL_REPORT_KINDS) cleared[k] = "";
    setPerReportCaps(cleared);
    onSave(null);
    setOpen(false);
  }

  function toggleReport(kind: ReportKind) {
    setReportsEnabled((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
    );
  }

  return (
    <div className="space-y-1">
      <div className="space-y-0.5 text-[11px] text-slate-600">
        <div>Engagements: {summary(effective.max_engagements)}</div>
        <div>Reports/mo: {summary(effective.max_reports_per_month)}</div>
        <div>AI queries/mo: {summary(effective.max_ai_queries_per_month)}</div>
        <div className="pt-0.5 text-[10px] text-slate-500">
          {effective.reports_enabled.length}/{ALL_REPORT_KINDS.length} report
          types enabled
        </div>
      </div>
      {!open ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(true)}
          className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {user.tier_overrides ? "Edit override" : "Override"}
        </button>
      ) : (
        <div className="mt-1 space-y-2 rounded-md border border-indigo-200 bg-indigo-50/60 p-2">
          <label className="block text-[10px] font-medium text-slate-700">
            Engagements (−1 = unlimited)
            <input
              value={eng}
              onChange={(e) => setEng(e.target.value)}
              inputMode="numeric"
              className="mt-0.5 block w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs"
            />
          </label>
          <label className="block text-[10px] font-medium text-slate-700">
            Reports / month (aggregate)
            <input
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              inputMode="numeric"
              className="mt-0.5 block w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs"
            />
          </label>
          <label className="block text-[10px] font-medium text-slate-700">
            AI queries / month
            <input
              value={ai}
              onChange={(e) => setAi(e.target.value)}
              inputMode="numeric"
              className="mt-0.5 block w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs"
            />
          </label>

          <div className="border-t border-indigo-100 pt-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
              Reports enabled & monthly cap
            </p>
            <div className="mt-1 space-y-1">
              {ALL_REPORT_KINDS.map((kind) => {
                const enabled = reportsEnabled.includes(kind);
                const effectiveCap = reportKindCap(effective, kind);
                return (
                  <div
                    key={kind}
                    className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-1.5 py-1"
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleReport(kind)}
                      className="h-3 w-3"
                    />
                    <span className="flex-1 text-[10px] text-slate-700">
                      {REPORT_KIND_LABEL[kind]}
                    </span>
                    <input
                      value={perReportCaps[kind]}
                      onChange={(e) =>
                        setPerReportCaps((p) => ({ ...p, [kind]: e.target.value }))
                      }
                      disabled={!enabled}
                      placeholder={String(effectiveCap)}
                      inputMode="numeric"
                      className="w-14 rounded border border-slate-300 px-1 py-0.5 text-[10px] disabled:bg-slate-50"
                      title="Per-report monthly cap (−1 = unlimited). Blank inherits the aggregate cap."
                    />
                  </div>
                );
              })}
            </div>
            <p className="mt-1 text-[9px] text-slate-500">
              Blank = inherit aggregate. −1 = unlimited.
            </p>
          </div>

          <div className="flex gap-1 pt-1">
            <button
              type="button"
              onClick={save}
              className="rounded bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-indigo-500"
            >
              Save
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
