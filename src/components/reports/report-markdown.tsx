"use client";

import React from "react";

// ---------------------------------------------------------------
// Rich markdown renderer tuned for diligence reports.
//
// Supports:
//   - # / ## / ### headings (## auto-numbered as "01 · TITLE")
//   - Paragraphs, **bold**, *italic*, `code`, [links](url)
//   - Bulleted (-, *) and ordered (1.) lists with nested indent
//   - GitHub-style tables (| col | col |) with header row +
//     severity-aware row coloring (Critical / High / Medium / Low / OK)
//   - Horizontal rules (--- / ***)
//   - Blockquotes (>) rendered as accent callout boxes
//   - Score lines like `Product credibility: 3.6 / 5` rendered as
//     progress bars matching the app's scorecard aesthetic.
//   - Severity/confidence tokens ([CRITICAL], [HIGH], [MEDIUM],
//     [LOW], [OK], [GAP]) rendered as colored pills.
// ---------------------------------------------------------------

export function ReportMarkdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return <div className="report-markdown space-y-4">{blocks.map(renderBlock)}</div>;
}

// ---- Block model ------------------------------------------------

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string; number: number }
  | { kind: "h3"; text: string }
  | { kind: "h4"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "hr" }
  | { kind: "quote"; lines: string[] }
  | { kind: "table"; header: string[]; rows: string[][]; align: Array<"left" | "right" | "center"> }
  | { kind: "score-group"; scores: Array<{ label: string; value: number; max: number }> };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  let h2Counter = 0;

  const pushPara = (buf: string[]) => {
    if (buf.length === 0) return;
    const text = buf.join(" ").trim();
    if (text) blocks.push({ kind: "p", text });
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (!line.trim()) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      if (level === 1) blocks.push({ kind: "h1", text });
      else if (level === 2) {
        h2Counter += 1;
        blocks.push({ kind: "h2", text, number: h2Counter });
      } else if (level === 3) blocks.push({ kind: "h3", text });
      else blocks.push({ kind: "h4", text });
      i++;
      continue;
    }

    // Blockquote (merge consecutive > lines)
    if (/^\s*>\s?/.test(line)) {
      const qLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        qLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", lines: qLines });
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s:-|]+$/.test(lines[i + 1])) {
      const header = splitTableRow(line);
      const alignLine = splitTableRow(lines[i + 1]);
      const align = alignLine.map<"left" | "right" | "center">((c) => {
        const t = c.trim();
        if (t.startsWith(":") && t.endsWith(":")) return "center";
        if (t.endsWith(":")) return "right";
        return "left";
      });
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ kind: "table", header, rows, align });
      continue;
    }

    // Lists
    const ulMatch = /^\s*[-*]\s+(.*)$/.exec(line);
    const olMatch = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ulMatch || olMatch) {
      const ordered = Boolean(olMatch);
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trimEnd();
        if (!l.trim()) break;
        const um = /^\s*[-*]\s+(.*)$/.exec(l);
        const om = /^\s*\d+\.\s+(.*)$/.exec(l);
        if (ordered && om) {
          items.push(om[1]);
          i++;
        } else if (!ordered && um) {
          items.push(um[1]);
          i++;
        } else {
          break;
        }
      }

      // If every item looks like a score line (e.g. "Label: 3.6/5"),
      // promote the whole list to a visual score group.
      const scoreItems = items
        .map(parseScoreItem)
        .filter((s): s is { label: string; value: number; max: number } => s !== null);
      if (!ordered && scoreItems.length >= 2 && scoreItems.length === items.length) {
        blocks.push({ kind: "score-group", scores: scoreItems });
        continue;
      }

      blocks.push(ordered ? { kind: "ol", items } : { kind: "ul", items });
      continue;
    }

    // Paragraph (accumulate until blank line / structural element)
    const paraBuf: string[] = [];
    while (i < lines.length) {
      const l = lines[i].trimEnd();
      if (!l.trim()) break;
      if (/^(#{1,6})\s+/.test(l)) break;
      if (/^\s*[-*]\s+/.test(l)) break;
      if (/^\s*\d+\.\s+/.test(l)) break;
      if (/^\s*>\s?/.test(l)) break;
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) break;
      if (l.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s:-|]+$/.test(lines[i + 1])) break;
      paraBuf.push(l.trim());
      i++;
    }
    pushPara(paraBuf);
  }

  return blocks;
}

function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function parseScoreItem(
  text: string,
): { label: string; value: number; max: number } | null {
  // Strip markdown bold/italic
  const plain = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .trim();
  // Patterns: "Label: 3.6 / 5", "Label — 3.6/5", "Label: 3.6"
  const m = /^(.+?)\s*(?::|—|–|-)\s*([0-5](?:\.\d+)?)\s*(?:\/\s*(\d+(?:\.\d+)?))?\s*$/.exec(
    plain,
  );
  if (!m) return null;
  const value = parseFloat(m[2]);
  if (!Number.isFinite(value)) return null;
  const max = m[3] ? parseFloat(m[3]) : 5;
  if (max !== 5 && max !== 10 && max !== 100) return null;
  return { label: m[1].trim(), value, max };
}

// ---- Rendering --------------------------------------------------

function renderBlock(block: Block, index: number): React.ReactNode {
  switch (block.kind) {
    case "h1":
      return (
        <h1
          key={index}
          className="mb-3 border-b border-slate-200 pb-3 text-2xl font-extrabold tracking-tight text-slate-900"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
        />
      );
    case "h2": {
      const num = String(block.number).padStart(2, "0");
      return (
        <div key={index} className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-indigo-600">
            {num} · {stripMarkdown(block.text).toUpperCase()}
          </p>
          <h2
            className="mt-1.5 text-xl font-bold tracking-tight text-slate-900"
            dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
          />
        </div>
      );
    }
    case "h3":
      return (
        <h3
          key={index}
          className="mt-4 flex items-center gap-2 text-base font-semibold text-slate-900"
        >
          <span
            aria-hidden
            className="h-4 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500"
          />
          <span dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />
        </h3>
      );
    case "h4":
      return (
        <h4
          key={index}
          className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
        />
      );
    case "p":
      return (
        <p
          key={index}
          className="text-sm leading-6 text-slate-700"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
        />
      );
    case "hr":
      return <hr key={index} className="my-5 border-slate-200" />;
    case "quote":
      return (
        <blockquote
          key={index}
          className="rounded-lg border-l-4 border-indigo-400 bg-indigo-50/60 px-4 py-3 text-sm leading-6 text-slate-700"
        >
          {block.lines.map((l, j) => (
            <p
              key={j}
              className="mb-1 last:mb-0"
              dangerouslySetInnerHTML={{ __html: renderInline(l) }}
            />
          ))}
        </blockquote>
      );
    case "ul":
      return (
        <ul key={index} className="space-y-1.5 pl-0">
          {block.items.map((it, j) => (
            <li
              key={j}
              className="relative flex gap-2 pl-5 text-sm leading-6 text-slate-700"
            >
              <span
                aria-hidden
                className="absolute left-1 top-2.5 h-1.5 w-1.5 rounded-full bg-indigo-500"
              />
              <span
                className="min-w-0 flex-1"
                dangerouslySetInnerHTML={{ __html: renderInline(it) }}
              />
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={index} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-indigo-600">
          {block.items.map((it, j) => (
            <li
              key={j}
              className="pl-1 text-sm leading-6 text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(it) }}
            />
          ))}
        </ol>
      );
    case "table":
      return <ReportTable key={index} block={block} />;
    case "score-group":
      return <ScoreGroup key={index} scores={block.scores} />;
  }
}

function ReportTable({
  block,
}: {
  block: Extract<Block, { kind: "table" }>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-900 text-white">
            {block.header.map((h, i) => (
              <th
                key={i}
                className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ${
                  block.align[i] === "right"
                    ? "text-right"
                    : block.align[i] === "center"
                      ? "text-center"
                      : "text-left"
                }`}
                dangerouslySetInnerHTML={{ __html: renderInline(h) }}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r, ri) => (
            <tr
              key={ri}
              className={`${
                ri % 2 === 1 ? "bg-slate-50/70" : "bg-white"
              } border-t border-slate-100`}
            >
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className={`px-3 py-2 align-top leading-5 text-slate-700 ${
                    block.align[ci] === "right"
                      ? "text-right"
                      : block.align[ci] === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderInline(c) }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreGroup({
  scores,
}: {
  scores: Array<{ label: string; value: number; max: number }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {scores.map((s, i) => {
        const pct = Math.max(0, Math.min(1, s.value / s.max));
        const color = scoreTone(s.value / s.max);
        return (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">
                {s.label}
              </span>
              <span className="text-lg font-bold text-slate-900">
                {s.value.toFixed(1)}
                <span className="ml-0.5 text-[10px] font-medium text-slate-400">
                  /{s.max}
                </span>
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function scoreTone(pct: number): string {
  if (pct >= 0.7) return "bg-gradient-to-r from-indigo-500 to-violet-500";
  if (pct >= 0.55) return "bg-gradient-to-r from-sky-500 to-indigo-500";
  if (pct >= 0.4) return "bg-gradient-to-r from-amber-400 to-orange-500";
  return "bg-gradient-to-r from-rose-500 to-red-500";
}

// ---- Inline formatting ------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

export function renderInline(text: string): string {
  let s = escapeHtml(text);

  // Severity / status pills: [CRITICAL], [HIGH], [MEDIUM], [LOW], [OK], [GAP]
  s = s.replace(
    /\[(CRITICAL|HIGH|MEDIUM|LOW|OK|GAP|STRENGTH|RISK)\]/gi,
    (_m, raw: string) => pill(raw.toUpperCase()),
  );

  // Inline code
  s = s.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800">$1</code>',
  );
  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
  // Italic
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  // Links
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" class="text-indigo-600 underline hover:text-indigo-800">$1</a>',
  );

  return s;
}

function pill(label: string): string {
  const tone = (() => {
    switch (label) {
      case "CRITICAL":
      case "HIGH":
      case "RISK":
        return "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200";
      case "MEDIUM":
        return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200";
      case "LOW":
        return "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200";
      case "OK":
      case "STRENGTH":
        return "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200";
      case "GAP":
        return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
      default:
        return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
    }
  })();
  return `<span class="mx-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}">${label}</span>`;
}

// ---- Export HTML (for PDF/DOCX) ---------------------------------
//
// Uses the same block parser but emits print-friendly HTML styled
// to roughly mirror the on-screen presentation. Tables keep header
// banding; score bars render via CSS width; severity pills are
// plain colored spans.

export function markdownToExportHtml(md: string): string {
  const blocks = parseBlocks(md);
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case "h1":
        parts.push(`<h1>${renderInlineExport(b.text)}</h1>`);
        break;
      case "h2": {
        const num = String(b.number).padStart(2, "0");
        parts.push(
          `<div class="section"><p class="eyebrow">${num} · ${escapeHtml(
            stripMarkdown(b.text).toUpperCase(),
          )}</p><h2>${renderInlineExport(b.text)}</h2></div>`,
        );
        break;
      }
      case "h3":
        parts.push(`<h3>${renderInlineExport(b.text)}</h3>`);
        break;
      case "h4":
        parts.push(`<h4>${renderInlineExport(b.text)}</h4>`);
        break;
      case "p":
        parts.push(`<p>${renderInlineExport(b.text)}</p>`);
        break;
      case "hr":
        parts.push(`<hr />`);
        break;
      case "quote":
        parts.push(
          `<blockquote>${b.lines
            .map((l) => `<p>${renderInlineExport(l)}</p>`)
            .join("")}</blockquote>`,
        );
        break;
      case "ul":
        parts.push(
          `<ul>${b.items.map((it) => `<li>${renderInlineExport(it)}</li>`).join("")}</ul>`,
        );
        break;
      case "ol":
        parts.push(
          `<ol>${b.items.map((it) => `<li>${renderInlineExport(it)}</li>`).join("")}</ol>`,
        );
        break;
      case "table":
        parts.push(tableToHtml(b));
        break;
      case "score-group":
        parts.push(scoreGroupToHtml(b));
        break;
    }
  }
  return parts.join("\n");
}

function tableToHtml(b: Extract<Block, { kind: "table" }>): string {
  const head = b.header
    .map(
      (h, i) =>
        `<th style="text-align:${b.align[i]}">${renderInlineExport(h)}</th>`,
    )
    .join("");
  const body = b.rows
    .map(
      (r) =>
        `<tr>${r
          .map(
            (c, i) =>
              `<td style="text-align:${b.align[i]}">${renderInlineExport(c)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  return `<table class="report-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function scoreGroupToHtml(
  b: Extract<Block, { kind: "score-group" }>,
): string {
  const rows = b.scores
    .map((s) => {
      const pct = Math.max(0, Math.min(100, (s.value / s.max) * 100));
      const fill = pct >= 70 ? "#6366f1" : pct >= 55 ? "#0ea5e9" : pct >= 40 ? "#f59e0b" : "#ef4444";
      return `<div class="score-card"><div class="score-top"><span class="score-label">${escapeHtml(
        s.label,
      )}</span><span class="score-value">${s.value.toFixed(1)}<span class="score-max">/${s.max}</span></span></div><div class="score-track"><div class="score-fill" style="width:${pct}%;background:${fill}"></div></div></div>`;
    })
    .join("");
  return `<div class="score-grid">${rows}</div>`;
}

function renderInlineExport(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(
    /\[(CRITICAL|HIGH|MEDIUM|LOW|OK|GAP|STRENGTH|RISK)\]/gi,
    (_m, raw: string) => pillExport(raw.toUpperCase()),
  );
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

function pillExport(label: string): string {
  const toneMap: Record<string, [string, string]> = {
    CRITICAL: ["#fecdd3", "#9f1239"],
    HIGH: ["#fecdd3", "#9f1239"],
    RISK: ["#fecdd3", "#9f1239"],
    MEDIUM: ["#fde68a", "#92400e"],
    LOW: ["#bae6fd", "#075985"],
    OK: ["#a7f3d0", "#065f46"],
    STRENGTH: ["#a7f3d0", "#065f46"],
    GAP: ["#e2e8f0", "#334155"],
  };
  const [bg, fg] = toneMap[label] ?? ["#e2e8f0", "#334155"];
  return `<span class="pill" style="background:${bg};color:${fg}">${label}</span>`;
}

export function buildExportDocumentStyles(): string {
  return `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Calibri, Arial, sans-serif; color: #0f172a; margin: 0.6in; line-height: 1.55; }
    .cover { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
    .cover h1 { font-size: 22pt; margin: 0 0 4px 0; letter-spacing: -0.01em; }
    .cover p { margin: 0; color: #475569; font-size: 10pt; }
    h1 { font-size: 18pt; margin: 18px 0 6px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .section { margin-top: 18px; }
    .section .eyebrow { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #4f46e5; margin: 0 0 2px 0; }
    h2 { font-size: 15pt; margin: 2px 0 6px 0; letter-spacing: -0.005em; }
    h3 { font-size: 12pt; margin: 12px 0 4px 0; border-left: 3px solid #6366f1; padding-left: 8px; }
    h4 { font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; margin: 10px 0 3px 0; }
    p { font-size: 10.5pt; margin: 0 0 8px 0; }
    ul, ol { font-size: 10.5pt; margin: 0 0 10px 22px; padding: 0; }
    li { margin-bottom: 3px; }
    strong { font-weight: 700; color: #0f172a; }
    em { font-style: italic; }
    code { font-family: "SF Mono", Consolas, monospace; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 9.5pt; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
    blockquote { border-left: 4px solid #6366f1; background: #eef2ff; margin: 10px 0; padding: 8px 12px; border-radius: 4px; }
    blockquote p { font-size: 10.5pt; margin: 0 0 4px 0; }
    .pill { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 2px; }
    .report-table { width: 100%; border-collapse: collapse; margin: 8px 0 14px 0; font-size: 10pt; }
    .report-table th { background: #0f172a; color: #fff; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 8px; font-weight: 600; }
    .report-table td { padding: 6px 8px; border-top: 1px solid #f1f5f9; vertical-align: top; }
    .report-table tbody tr:nth-child(even) td { background: #f8fafc; }
    .score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 8px 0 12px 0; }
    .score-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; background: #fff; }
    .score-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .score-label { font-size: 10pt; color: #334155; font-weight: 500; }
    .score-value { font-size: 13pt; font-weight: 700; color: #0f172a; }
    .score-max { font-size: 8pt; color: #94a3b8; font-weight: 500; margin-left: 2px; }
    .score-track { height: 6px; background: #f1f5f9; border-radius: 999px; margin-top: 6px; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 999px; }
    @media print { body { margin: 0.55in; } .score-card { break-inside: avoid; } .report-table { break-inside: auto; } tr { break-inside: avoid; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  `;
}
