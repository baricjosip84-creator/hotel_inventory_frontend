# Batch 179 — Dashboard coverage gaps and caveats (source-only)

- **New genuine render-side coverage:** Null summary KPI omission; setup progress; outbound partial KPI boundary; health score visual clamping without changing source value; health service isolation; depletion/reorder numeric ordering, top-six list limits and fallback metrics; anomaly tier filtering and service order; alert metadata; supplier counts; legacy stock/activity labels; safe customer-return evidence display.
- **The health bar intentionally clamps widths while showing the raw service number.** A health score >100 or <0 is used as a *synthetic boundary* and does not demonstrate such an invalid score can originate from the actual service. No production defect was claimed.
- **The dashboard sorts depletion and reorder rows in the browser, but leaves anomalies in service order.** Synthetic GET arrays only prove frontend rendering against the source. They do not establish backend rank correctness, filtering, row limits or provenance.
- **Unknown raw customer-return audit references are preserved in the HTML title tooltip**, despite being hidden from the main business-facing label. The tests explicitly check both surfaces; user-facing privacy/product acceptance is still needed.
- **Synthetic legacy rows** with null product/unit/actor/coverage and unusual numeric values do not prove such records can exist with enforced production DB constraints.
- **Permissions and tenant isolation** are not proved by intercepted responses; existing cases and deferred live acceptance remain open.
- **Outstanding carried forward:** 417 BLOCKED, 272 SOURCE_TRACED_PARTIAL, unresolved PLCR-084, 357 labelled skips, 21 unconditional and 3 permission-dependent supplemental in-test skips. No earlier scenario was promoted to verified or accepted.
- **Not executed:** No Playwright compilation, discovery, browser/test run, backend/database service, CI, dependency install, deployment or modification of original FE/BE archives.
