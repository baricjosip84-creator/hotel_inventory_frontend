# Batch 174 — Stock Movements source-supported assertion review

Verified against immutable `frontend/src/pages/StockMovementsPage.tsx`, `backend/src/routes/stockMovements.js`, and `backend/src/controllers/stockController.js`.

Added 28 distinct declarations `TSMV-051`–`TSMV-078` to the existing tenant Stock Movements spec, preserving `TSMV-001`–`TSMV-050`.

Focus: URL normalization, filter validity, paging reset, advanced-filter preservation, missing historical provenance, actor fallback, permission-gated historical references, unclassified reason UUID redaction, cost and package evidence, and source-guarded receiving-note behavior.

Every new browser assertion uses GET interception only. No compile, execution, real API/DB, test discovery, tenant isolation, backend permission enforcement, source modification, installation, CI, or deployment occurred.

The companion CSV contains per-scenario source location, specific expectation, and deferred acceptance requirements.
