# Batch 147 — Source-backed frontend gap reconciliation (STRICT PHASE 1)

This is a source/code-writing and static audit, **not** a test-execution report. No app/backend/browser, Playwright runner, TypeScript compiler or external service was invoked.

## Concrete authored work

- Added **24 independently named non-skipped** test declarations (six each: Notifications, License Enforcement, Permissions, Privacy). All use previously established page fixtures and are uncompiled/unrun.
- Expanded the five previously empty `test.skip` requirements into implementation-ready **deferred** assertions; these remain skipped and non-executable.
- Preserved all 9,131 older scenario IDs, 417 BLOCKED records, PLCR-084 NEEDS_EXPECTATION and all 384 skip calls.
- 137/137 original router entries inventoried; this still does not mean all pages are functionally covered.

## Unresolved source discrepancies — do not report as passed

### PNOT-061 — Status-mutation error not rendered; row snapshot still retains prior status on rejection.
- Original frontend: `src/pages/PlatformNotificationsPage.tsx`; `markMutation` lines 216, 440; `markMutation.isError` lines not found; `bulkMutation.isError` lines 409.
- Status: **UNRESOLVED**. No original app code was changed and no successful browser behavior is claimed.

### PLEN-059 — Unbounded decimal offset and noncanonical URL remains possible; only negative/non-numeric API bound checked.
- Original frontend: `src/pages/PlatformLicensePlanEnforcementPage.tsx`; `Number(searchParams.get('offset')` lines 116; `invalidFilters` lines 117, 137, 197, 203, 204.
- Status: **UNRESOLVED**. No original app code was changed and no successful browser behavior is claimed.

### PLEN-060 — No automatic recovery from requested offset beyond total; possible inverted pagination count.
- Original frontend: `src/pages/PlatformLicensePlanEnforcementPage.tsx`; `pagination` lines 73, 165, 271; `offset` lines 73, 116, 125, 132, 169, 176.
- Status: **UNRESOLVED**. No original app code was changed and no successful browser behavior is claimed.

### PPER-062 — Malformed successful HTTP policy payload converted to empty arrays instead of blocking invalid data.
- Original frontend: `src/pages/PlatformPermissionsPage.tsx`; `Array.isArray(query.data?.roles)` lines 32; `permission_catalog` lines 39.
- Status: **UNRESOLVED**. No original app code was changed and no successful browser behavior is claimed.

### PPRIV-072 — Native datetime-local and generic validation string lack independently addressable specific date error.
- Original frontend: `src/pages/PlatformPrivacyRequestsPage.tsx`; `toIsoDateTimeOrNull` lines 60, 113, 122; `platform-privacy-requests__validation` lines 167.
- Status: **UNRESOLVED**. No original app code was changed and no successful browser behavior is claimed.

### PLCR-084 — Unresolved baseline expectation; no edits in Batch 147.
- Original frontend: `src/pages/PlatformLegalComplianceReportingPage.tsx`; `loading` lines not found; `disabled` lines 240, 273, 275, 294.
- Status: **UNRESOLVED**. No original app code was changed and no successful browser behavior is claimed.

## Safety/coverage accounting

The new mock-backed cases test browser and request shape only; they do not prove server-side authorization, cross-tenant SQL isolation, actual notification delivery, payments, legal compliance, archive retention, or independent customer acceptance.
All 360 historically skipped ID-labelled declarations remain inside the 9,131 historical GENERATED_UNRUN count. The 24 new tests expand the non-skipped authored candidate count only.
Next batch must tackle high-impact skipped cases in Security, Support Sessions, Enterprise Identity and permissions, and review 24 conditional skip calls; do not introduce fictitious routes or drop external blockers.
