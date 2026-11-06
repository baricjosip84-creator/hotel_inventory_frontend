# Batch 174 — Remaining gaps (NOT CLOSED)

1. **Fractional page URL not normalized** — `frontend/src/pages/StockMovementsPage.tsx:140-144` converts page query via `Number` and clamps its minimum but does not require an integer. The requested `offset = (page-1)*pageSize` can become fractional; original backend `backend/src/validations/inventory.validation.js:861-882` validates `offset` as an integer. This is a **static source discrepancy**, not a browser-proven failure. No passing test invented; product correction and real acceptance still needed.
2. **Mock IDs vs live UUID constraints** — existing `auditRow` and filter options use `pw-*` synthetic IDs. Browser route interceptions accept these placeholders; the original stock-movement API requires UUIDs. Browser GET expectations are not live API acceptance.
3. **Authorization** — fixture grants for shipment/transfer link visibility establish only conditional rendering; real server-side `STOCK_MOVEMENTS_READ`, `SHIPMENTS_READ`, `STOCK_TRANSFERS_READ` and tenant isolation need later disposable acceptance.
4. **Historical provenance / safety** — new UI evidence tests do not establish whether real saved audit records preserve snapshots, source cost values, redaction, or database accuracy.
5. **Global Phase 1 gates** — 417 blocked obligations, 272 partial acceptance features, 357 labelled skips, 21 unconditional in-test skips, three role-dependent in-test skips and `PLCR-084` remain open. No compilation, Playwright discovery, real browser tests or deployments have occurred.

New test declarations `TSMV-051..078` are source-grounded, not executed. Refer to `PHASE1_BROWSER_ASSERTION_SOURCE_REVIEW_B174.csv` for per-test source references.
