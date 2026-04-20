"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { PREVIEW_TABS } from "@/lib/preview-tabs";

// ------------------------------------------------------------------
// Persistent per-browser preference for which top-nav tabs are shown.
// Stored in localStorage so it survives reloads but is device-local.
//
// Admins can ALSO hide tabs per-user on the server. Those server-side
// hides override any local "show" preference — the user can't un-hide
// a tab their admin has disabled.
// ------------------------------------------------------------------

export const NAV_VISIBILITY_STORAGE_KEY = "kaptrix.preview.nav.hidden";
const STORAGE_EVENT = "kaptrix:nav-visibility-change";

export type NavTabId = (typeof PREVIEW_TABS)[number]["id"];

// Home and Overview are always visible — they are the workspace
// landing surfaces and cannot be hidden by the operator.
const ALWAYS_VISIBLE: NavTabId[] = ["home", "overview"];

let cachedRaw: string | null | undefined;
let cachedHidden: NavTabId[] = [];

function readHidden(): NavTabId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NAV_VISIBILITY_STORAGE_KEY);
    if (raw === cachedRaw) return cachedHidden;
    cachedRaw = raw;
    cachedHidden = raw ? (JSON.parse(raw) as NavTabId[]) : [];
    return cachedHidden;
  } catch {
    cachedRaw = null;
    cachedHidden = [];
    return cachedHidden;
  }
}

function writeHidden(hidden: NavTabId[]): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(hidden);
  window.localStorage.setItem(NAV_VISIBILITY_STORAGE_KEY, serialized);
  cachedRaw = serialized;
  cachedHidden = hidden;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== NAV_VISIBILITY_STORAGE_KEY) return;
    callback();
  };
  const onLocal = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(STORAGE_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STORAGE_EVENT, onLocal);
  };
}

const EMPTY: NavTabId[] = [];

export function useNavVisibility() {
  const hidden = useSyncExternalStore(subscribe, readHidden, () => EMPTY);
  const [serverHidden, setServerHidden] = useState<NavTabId[]>([]);

  // Fetch server-side hidden tabs (admin-enforced) once per mount. If the
  // user isn't signed in or the endpoint fails, we just fall back to the
  // local preference — same as before.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const keys = Array.isArray(data.hidden_menu_keys)
          ? (data.hidden_menu_keys as string[])
          : [];
        setServerHidden(keys.filter((k): k is NavTabId => typeof k === "string") as NavTabId[]);
      })
      .catch(() => {
        // not signed in or endpoint unavailable — ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTab = useCallback((id: NavTabId) => {
    if (ALWAYS_VISIBLE.includes(id)) return;
    const current = readHidden();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    writeHidden(next);
  }, []);

  const resetAll = useCallback(() => writeHidden([]), []);

  const effectiveHidden = Array.from(new Set([...hidden, ...serverHidden]));
  const visibleTabs = PREVIEW_TABS.filter(
    (t) => !effectiveHidden.includes(t.id as NavTabId),
  );
  return {
    hidden: effectiveHidden,
    toggleTab,
    resetAll,
    visibleTabs,
    alwaysVisible: ALWAYS_VISIBLE,
    serverHidden,
  };
}
