import { PREVIEW_TABS } from "@/lib/preview-tabs";

export type PreviewTabId = (typeof PREVIEW_TABS)[number]["id"];

export const ALWAYS_VISIBLE_PREVIEW_TABS: PreviewTabId[] = ["home", "overview"];

/**
 * Resolve a preview/app pathname to its corresponding top-nav tab id.
 * Returns null for non-preview paths.
 */
export function resolvePreviewTabFromPath(pathname: string): PreviewTabId | null {
  if (!pathname) return null;

  const normalized = pathname.startsWith("/preview")
    ? pathname.replace(/^\/preview/, "/app")
    : pathname;

  const match = PREVIEW_TABS.find((tab) => {
    if (tab.href === "/app") {
      return normalized === "/app";
    }
    return normalized === tab.href || normalized.startsWith(`${tab.href}/`);
  });

  return (match?.id as PreviewTabId | undefined) ?? null;
}

export function isPreviewTabHidden(
  tabId: PreviewTabId | null | undefined,
  hiddenKeys: readonly string[],
): boolean {
  if (!tabId) return false;
  if (ALWAYS_VISIBLE_PREVIEW_TABS.includes(tabId)) return false;
  return hiddenKeys.includes(tabId);
}
