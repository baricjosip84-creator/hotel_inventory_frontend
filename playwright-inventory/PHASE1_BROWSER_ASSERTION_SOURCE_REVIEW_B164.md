# Batch 164 — Permission Audit and Platform Sessions source-backed browser assertions

**Phase 1 only.** Original source archives hash-verified and never modified. These scenarios are authored, **not compiled, discovered, run or browser-tested**.

- Platform Permission Audit: **PPAUD-093..104** (12 new tests) covering independently permission-scoped supporting links, removal of protected panes and pagers, evidence formatting for invalid timestamps and missing identities, 200-character search, forged page sizes, and non-ASCII query encoding.
- Platform Sessions: **PSES-081..093** (13 new tests) covering query whitelist, malformed offset fallback, maxLength boundary, protected links, HTML-shaped metadata, missing person metadata, read-only posture, directory outage, HTTP 429, legacy array response, unlinked browser session, missing expiry, and generated-at disclosure.

## Source boundary

The frontend `PlatformPermissionAuditPage.tsx` validates oversized URL search and always constructs `user_limit=50` and `api_key_limit=50`; its independent source read grants control source rows and links. Backend `permissionAudit.js` validates the search and integer bounds and checks `platform.access_reviews.read`. Synthetic mocks cannot prove that enforcement works with real roles or a database.

The frontend `PlatformSessionsPage.tsx` builds the session request from a constrained set of UI parameters, renders missing metadata as explicit fallbacks, and supports legacy arrays. The backend `sessions.js` uses a different Joi filter boundary and enforces session read/revoke grants; these real behaviors remain outside Phase 1.

**Important pre-existing gaps are deliberately not resolved:** PSES-042 fractional offset, PSES-044 page-range inversion, PLCR-084 unresolved UX expectation, and all 417 blocked obligations. No `test.skip` was promoted or removed. No original frontend or backend source changed.

See `PHASE1_BROWSER_ASSERTION_SOURCE_REVIEW_B164.csv` for each new scenario's original frontend line anchor and backend rule.
