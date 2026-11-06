# Batch 177 — Remaining shipment coverage and acceptance requirements

- **Legacy/raw source assumptions:** Direct page renders take fields from backend responses, and the new tests use deliberately synthetic and sometimes malformed legacy evidence. The backend response contract and actual database behavior have not been validated by these mocks.
- **Shipment finalization:** A nonblank, *persisted* shortage reason allows browser readiness for incomplete lines, while whitespace-only evidence is blocked. Server-side atomic posting, shortage ledgers, optimistic concurrency, and tenant isolation require later backend/DB acceptance and are not passed here.
- **Unknown status / invalid dates:** Browser fallback behavior is source-traced, not evidence the backend permits such data to persist.
- **Fixture IDs:** `pw-shipment-*` and `pw-product` are synthetic and fail production UUID contract; all writes in these scenarios are forbidden/intercepted.
- **Pre-existing obligations preserved:** 417 BLOCKED, 272 partially source-traced features requiring acceptance, 357 labelled skipped scenarios, 21 unconditional + 3 permission-dependent supplemental skip calls and PLCR-084 unresolved decision.
- **Phase 1 unchanged:** No test discovery, compilation, browser execution, frontend/backend process, live API/SQL, package install, CI change or deployment. No application source modifications.
