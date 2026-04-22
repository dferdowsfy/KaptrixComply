"use client";

import {
  upsertUploadedDoc,
  type UploadedDoc,
} from "@/lib/preview/uploaded-docs";
import { mergeExtractedInsights } from "@/lib/preview/extracted-insights";

/**
 * Upload a single file to /api/preview/parse with real progress
 * reporting via XHR, then resolve once the server's parse call has
 * returned (or failed). Status transitions through the shared
 * uploaded-docs store so every subscriber (coverage matrix row, chat
 * knowledge base, etc.) sees the update live.
 */
export function uploadAndParse(file: File, meta: UploadedDoc): Promise<void> {
  return new Promise((resolve) => {
    upsertUploadedDoc({ ...meta, parse_status: "uploading", upload_percent: 0 });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/preview/parse", true);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      upsertUploadedDoc({
        ...meta,
        parse_status: "uploading",
        upload_percent: pct,
      });
    };

    xhr.upload.onload = () => {
      upsertUploadedDoc({
        ...meta,
        parse_status: "parsing",
        upload_percent: 100,
      });
    };

    xhr.onerror = () => {
      upsertUploadedDoc({
        ...meta,
        parse_status: "failed",
        error: "Network error during upload",
      });
      resolve();
    };

    xhr.ontimeout = () => {
      upsertUploadedDoc({
        ...meta,
        parse_status: "failed",
        error: "Upload timed out",
      });
      resolve();
    };

    xhr.onload = () => {
      try {
        const status = xhr.status;
        const body = xhr.responseText;
        let parsed: { text?: string; tokenCount?: number; error?: string } = {};
        try {
          parsed = JSON.parse(body);
        } catch {
          if (status >= 200 && status < 300) {
            upsertUploadedDoc({
              ...meta,
              parse_status: "failed",
              error: "Server returned non-JSON response",
            });
            return resolve();
          }
        }
        if (status < 200 || status >= 300) {
          upsertUploadedDoc({
            ...meta,
            parse_status: "failed",
            error: parsed.error ?? `HTTP ${status}`,
          });
          return resolve();
        }
        // Parse succeeded. We now enter the "extracting" phase where the
        // LLM reads the parsed text and surfaces KnowledgeInsights. The
        // document is not considered fully ingested ("parsed") until this
        // completes, so the coverage matrix keeps showing progress rather
        // than flipping to ✓ instantly.
        const parsedText = (parsed.text ?? "").trim();
        const hasClient = Boolean(meta.client_id && parsedText);

        upsertUploadedDoc({
          ...meta,
          parse_status: hasClient ? "extracting" : "parsed",
          parsed_text: parsedText,
          token_count: parsed.tokenCount,
          upload_percent: 100,
        });

        if (hasClient) {
          const clientId = meta.client_id;
          void fetch("/api/preview/extract-insights", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: meta.filename,
              category: meta.category,
              text: parsedText,
            }),
          })
            .then(async (res) => {
              let insightsCount = 0;
              if (res.ok) {
                const data = (await res.json()) as {
                  insights?: import("@/components/documents/knowledge-insights-panel").KnowledgeInsight[];
                };
                if (Array.isArray(data.insights) && data.insights.length > 0) {
                  mergeExtractedInsights(clientId, data.insights);
                  insightsCount = data.insights.length;
                }
              }
              upsertUploadedDoc({
                ...meta,
                parse_status: "parsed",
                parsed_text: parsedText,
                token_count: parsed.tokenCount,
                upload_percent: 100,
                insights_count: insightsCount,
              });
            })
            .catch(() => {
              // Extraction failed — still mark as parsed so the file is
              // usable, but leave insights_count at 0.
              upsertUploadedDoc({
                ...meta,
                parse_status: "parsed",
                parsed_text: parsedText,
                token_count: parsed.tokenCount,
                upload_percent: 100,
                insights_count: 0,
              });
            });
        }
      } finally {
        resolve();
      }
    };

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

/**
 * Upload every file in `files` into `category` for `clientId`,
 * sequentially so only one progress bar is animating at a time.
 */
export async function uploadFilesForCategory(args: {
  clientId: string;
  category: string;
  files: FileList | File[];
}): Promise<void> {
  const { clientId, category, files } = args;
  const now = new Date().toISOString();
  const list = Array.from(files);
  if (list.length === 0) return;

  const pending: UploadedDoc[] = list.map((f, i) => ({
    id: `upload-${Date.now()}-${i}`,
    client_id: clientId,
    filename: f.name,
    category,
    file_size_bytes: f.size,
    mime_type: f.type || "application/octet-stream",
    uploaded_at: now,
    parse_status: "queued",
    upload_percent: 0,
  }));

  for (const d of pending) upsertUploadedDoc(d);

  for (let i = 0; i < list.length; i++) {
    await uploadAndParse(list[i], pending[i]);
  }
}

export const UPLOAD_ACCEPT_ATTR =
  ".pdf,.docx,.xlsx,.pptx,.txt,.csv,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,text/plain,image/png,image/jpeg";
