# Batch 223 — live original-suite selection and offline preflight

**Authoritative parent:** `INVENTORY_PLAYWRIGHT_BATCH_222_FULL.zip` (do not revert to older baselines). User explicitly confirmed Batch 222 `BULK_SAFE_06_RECHECK_4` **GREEN**.

**Live-run group:** `BULK_SAFE_07`, **160 new original tenant tests**:

- Forecasting `TPF`: 72 — advisory model evidence, server filters and value formatting
- Adaptive Policy `TAPE`: 23 — non-mutating policy evidence, filters and human-review safeguards
- Tenant Audit `TAUD`: 40 — read-only audit filters, paging and business evidence
- Alerts `TALERT`: 25 — read-only queue/fallback evidence and form validation without submission

**Previously GREEN:** 921 distinct IDs. **Held:** 22. **No overlap** with either category or earlier approved groups.

### What was checked

- Latest frontend source pages reviewed: `src/pages/ProbabilisticForecastingPage.tsx`, `AdaptivePolicyEnginePage.tsx`, `TenantAuditPage.tsx`, and `AlertsPage.tsx` in the user's existing public frontend repository. Compared source-visible headings, filter labels, default limits and table column positions. No frontend/backend source changes.
- Updated the two newly approved suites to use `support/liveOriginalSafeTest.ts`, the existing one-worker login and fail-closed live-write boundary; no destructive network writes are allowed.
- Fixed first-request URL polling in the selected Forecasting/Adaptive Policy tests to return `null` until a URL has been received (rather than throw `Invalid URL`). No assertion outcome was weakened.
- Existing mature Audit and Alerts spec files were left **byte-for-byte unchanged**, protecting all previously confirmed passes.
- Exact original test count (9,900 unique IDs, 152 specs) and all historical approval SHA256 fingerprints remain enforced. New AST parser audits each selected test body for role impersonation, unmocked mutations, route continuation, skips and isolated browser contexts.
- GitHub selects exactly 160 original IDs from 4 files through manifest and `--list` discovery guard; one worker, no artifacts/traces/screenshots, credentials remain GitHub Secrets.

### Important limits

These are **offline** source/contract/security validations. Browser execution against Vercel/Render **has not been performed for B223**. A frontend source inspection cannot certify permissions, test fixture behavior, timing, rendering or real production persistence. A test passing with locally mocked API evidence is not verification of backend data integrity or tenant isolation.

### One GitHub run

Extract `INVENTORY_PLAYWRIGHT_BATCH_223_BULK_160_GITHUB_FIX.zip` at **frontend repository root**, preserve the paths, commit to `main`. In GitHub → **Actions → Inventory - original 9900 Playwright suite → Run workflow**, choose **BULK_SAFE_07**, enter **ORIGINALTESTS**, and run. Upload the resulting ZIP logs on failure; do **not** rerun earlier already-green groups.
