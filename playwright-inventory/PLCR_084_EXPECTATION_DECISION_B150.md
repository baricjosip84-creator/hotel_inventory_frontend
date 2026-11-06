# PLCR-084 — unresolved UX contract decision (Batch 150, source-inspected)

**Ledger remains `NEEDS_EXPECTATION` — not a generated/tested scenario.**

- Original React source: `frontend/src/pages/PlatformLegalComplianceReportingPage.tsx`, around lines 184–206 and 270–276.
- `useQuery` sets `query.isFetching` during an in-flight request.
- **Apply** is explicitly `disabled={query.isFetching}`.
- The **Evidence source** `<select>` is controlled by `selectedSource` but has **no `disabled` guard** and its `onChange` immediately writes a new source and resets the offset.
- Earlier `PLCR-084` desired disabled source selection while fetching, which is **not implemented**. A browser assertion claiming it disabled would be a false expectation; a test that locks it as always enabled could enshrine an unwanted UX defect.

**Decision needed during application development / user acceptance:** (A) disable source selection while fetching, or (B) keep it enabled and explicitly support cancellation/latest-source-wins with clear transitional state. This test-generation batch cannot choose product UX or modify application code.

**Disposition:** preserve `PLCR-084` and its original source-linked blocker unchanged. No `PLCR-084` test was fabricated. Do not count it as `GENERATED_UNRUN` or executable until product behavior is agreed and application source matches. Related new PLCR-101–106 cases test independent, source-supported browser behavior only.
