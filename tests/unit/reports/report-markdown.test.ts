import { markdownToExportHtml } from "@/components/reports/report-markdown";

describe("report markdown table rendering", () => {
  it("renders standard multiline markdown tables", () => {
    const md = [
      "| Component | Stated | Observed |",
      "| --- | --- | --- |",
      "| Multi-model failover | sub-second switchover | single provider path |",
    ].join("\n");

    const html = markdownToExportHtml(md);

    expect(html).toContain('<table class="report-table">');
    expect(html).toContain("<th");
    expect(html).toContain("Component");
    expect(html).toContain("Multi-model failover");
  });

  it("normalizes collapsed single-line tables into real tables", () => {
    const md =
      "The following table highlights the mismatches between the stated and observed architecture: | Component | Stated | Observed | Evidence | Gap | | --- | --- | --- | --- | --- | | Multi-model failover | Sub-second switchover between Claude, GPT-4, and Llama | Single Anthropic path with manual fallback | LexiFlow_Investor_Deck.pdf p.12 vs. Architecture_Overview.docx §3.2 | No abstraction layer | | Tenant isolation | Not specified | Logical-only isolation with shared embeddings | Architecture_Overview.docx §4.1 | No technical separation |";

    const html = markdownToExportHtml(md);

    expect(html).toContain("<p>The following table highlights the mismatches between the stated and observed architecture:</p>");
    expect(html).toContain('<table class="report-table">');
    expect(html).toContain("<th style=\"text-align:left\">Component</th>");
    expect(html).toContain("No abstraction layer");
    expect(html).toContain("No technical separation");
  });
});
