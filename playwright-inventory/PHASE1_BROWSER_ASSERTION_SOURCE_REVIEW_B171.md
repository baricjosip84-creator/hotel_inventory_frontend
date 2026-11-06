# Batch 171 — Tenant Audit browser-source review (not executed)

- Verified Batch 170 FULL SHA-256 and immutable FE/BE ZIPs; original source inspected read-only.
- Added **22** distinct non-skipped `TAUD-051` through `TAUD-072` in the *existing* `tests/tenant/tenant-audit/tenant-audit.spec.ts`. No existing scenarios deleted or weakened.
- Source: original `frontend/src/pages/TenantAuditPage.tsx` and `backend/src/routes/audit.js`; synthetic `openAudit` fixture intercepts tenant audit GET, summary, options, detail and CSV. **No backend acceptance or persistent audit verification.**
- Distinct focus: summary/list query divergence, 100-row offset, selected detail reset, combined and reset filters, accessible invalid-range errors, exact-code fallback normalization, support attribution fallback, known/unknown path verbs, source/status badges, technical request redaction, structured business evidence and CSV-triggered refresh.
- Each test has a line-level frontend reference and a backend endpoint reference in `PHASE1_BROWSER_ASSERTION_SOURCE_REVIEW_B171.csv`.
- CSV `GET /audit/export.csv` performs a backend audit log write, even though the browser's request uses GET; this side effect is NOT proven by mocked browser tests.
- One important limitation: synthetic tenant and record identifiers cannot establish backend UUID-validation, cross-tenant data boundaries, database or regulatory audit guarantees.
- Tests have NOT been compiled, discovered or run.

## Scenario references

- **TAUD-051** — Summary filter transport omits list-only limit and offset (`TenantAuditPage.tsx:294-319`).
- **TAUD-052** — Selecting a 100-event page makes the next request offset 100 (`TenantAuditPage.tsx:296-304,417-425,743-760`).
- **TAUD-053** — Applying an action filter closes previously selected detail evidence (`TenantAuditPage.tsx:322-329,359-373,691-697`).
- **TAUD-054** — Selecting a second event collapses the first selected detail (`TenantAuditPage.tsx:681-695`).
- **TAUD-055** — Reset clears support-only and closes an expanded detail without writes (`TenantAuditPage.tsx:375-383,681-697`).
- **TAUD-056** — Action and entity filters are consistently applied to list and summary (`TenantAuditPage.tsx:294-319`).
- **TAUD-057** — Unchecking support-only removes the parameter rather than sending false (`TenantAuditPage.tsx:238-257,359-373`).
- **TAUD-058** — Invalid date range marks both dates invalid with linked error text (`TenantAuditPage.tsx:357,491-513`).
- **TAUD-059** — Clearing applied search removes filter and pending indicator (`TenantAuditPage.tsx:338-373,580-585`).
- **TAUD-060** — Exact action fallback trims pasted code before sending list query (`TenantAuditPage.tsx:338-373,529-545`).
- **TAUD-061** — Exact entity fallback trims code independently of action (`TenantAuditPage.tsx:338-373,549-566`).
- **TAUD-062** — Known request path operations use distinct business verbs (`TenantAuditPage.tsx:74-145`).
- **TAUD-063** — Unlisted request path operation becomes a readable label (`TenantAuditPage.tsx:112-145`).
- **TAUD-064** — Support actor without name uses platform email as primary attribution (`TenantAuditPage.tsx:153-174,657-661`).
- **TAUD-065** — Support session ID remains secondary attribution when email is missing (`TenantAuditPage.tsx:153-174,657-661`).
- **TAUD-066** — Missing source and method distinguish tenant system from support events (`TenantAuditPage.tsx:668-675`).
- **TAUD-067** — Explicit source code is displayed as a human-readable source label (`TenantAuditPage.tsx:668-675`).
- **TAUD-068** — Technical request path and request ID are hidden again when toggle is off (`TenantAuditPage.tsx:280,660-678`).
- **TAUD-069** — Non-numeric status is neutral while redirect codes use good status tone (`TenantAuditPage.tsx:203-215,668-675`).
- **TAUD-070** — Business evidence renders booleans, arrays and objects with stable text (`TenantAuditPage.tsx:215-250,706-715`).
- **TAUD-071** — Empty string and null metadata values do not create phantom evidence (`TenantAuditPage.tsx:215-250,706-715`).
- **TAUD-072** — Successful CSV export requests both refreshed list and summary evidence (`TenantAuditPage.tsx:399-415`).
