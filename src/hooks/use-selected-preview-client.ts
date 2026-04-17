"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PREVIEW_CLIENT_ID,
  getPreviewClient,
  PREVIEW_CLIENTS,
  SELECTED_CLIENT_STORAGE_KEY,
  type PreviewClientSummary,
} from "@/lib/preview-clients";

export function useSelectedPreviewClient(): {
  selectedId: string;
  client: PreviewClientSummary;
  setSelectedId: (id: string) => void;
  allClients: PreviewClientSummary[];
  ready: boolean;
} {
  const [selectedId, setSelectedIdState] = useState<string>(
    DEFAULT_PREVIEW_CLIENT_ID,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY);
      if (stored && PREVIEW_CLIENTS.some((c) => c.id === stored)) {
        setSelectedIdState(stored);
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    try {
      window.localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, id);
    } catch {
      // ignore
    }
  };

  return {
    selectedId,
    client: getPreviewClient(selectedId),
    setSelectedId,
    allClients: PREVIEW_CLIENTS,
    ready,
  };
}
