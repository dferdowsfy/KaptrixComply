"use client";

import { SectionHeader } from "@/components/preview/preview-shell";
import { ExecutiveReport } from "@/components/reports/executive-report";
import { demoExecutiveReport } from "@/lib/demo-data";

export default function PreviewReportPage() {
  const handleExport = () => {
    // Use the browser's native print-to-PDF. Our @media print styles in
    // globals.css hide the shell chrome (tabs, header, chatbot) so the
    // exported PDF only contains the report.
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-5">
      <div className="print-hide flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader
          eyebrow="Module 5"
          title="Executive report"
          description="Structured, consulting-style output with clear headings, argument flow, and evidence-grounded recommendations."
        />
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 self-start rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 9V2h12v7" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path d="M6 14h12v8H6z" />
          </svg>
          Export to PDF
        </button>
      </div>

      <div className="print-area">
        <ExecutiveReport data={demoExecutiveReport} />
      </div>
    </div>
  );
}
