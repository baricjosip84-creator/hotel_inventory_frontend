# Historical Reports: Usage and Count Variance



================================================================================
INTEGRATED SOURCE CORRECTION — 2026-10-14 — FE185 / BE111
================================================================================
Scope: Reports > Usage Summary historical-unit safety and former-name filters;
Reports > Count Variance former product/location alias filter correction.

FINDING 1 — Usage Summary used the MUTABLE current product unit when presenting
old consumption totals. When a product unit changed, it could present historical
numbers with the wrong unit. The corrected query uses the linked stock movement's
saved product_unit_snapshot (migration 533) and explicitly marks units as
'proven', 'mixed', or 'unproven'. It withholds combined quantity totals for mixed
or missing historical unit evidence, rather than falsely attaching current units.
The UI and CSV/PDF exports display evidence status. Counts and identities remain
visible, including on old rows with missing evidence.

FINDING 2 — Usage Summary former-product/former-location searches matched only
CURRENT catalog labels. Corrected by tenant-, product-, movement- and
location-scoped lookups against saved usage movement name snapshots.

FINDING 3 — Count Variance historical filters offered former product and location
names in the dropdown, but the cycle-count query accepted only CURRENT names.
Corrected with tenant-scoped EXISTS lookups of actual movement snapshots for the
product/location. The manual-adjustment branch already used snapshots.

SOURCES ALTERED:
  Backend: src/services/analytics/reportService.js
  Backend: src/controllers/reportsController.js
  Backend: src/utils/reportCsvPresentation.js
  Backend: scripts/check-batch198-historical-report-evidence.cjs (NEW)
  Backend: package.json, .github/workflows/phase16-production-validation.yml
  Frontend: src/pages/ReportsPage.tsx
  Frontend: scripts/check-batch198-usage-history-ui.mjs (NEW)
  Frontend: package.json, .github/workflows/frontend-validation.yml

LOCAL EVIDENCE:
  New SQL-service test: 34/34 PASS (mocked database)
  New frontend check: 8/8 PASS (source contract)
  New SQL-service test correctly FAILS against previous BE110 source.
  Inherited offline test scripts: 138/138 PASS (local test modes).
  Relevant recent Reports tests: 19/19 PASS (one requires explicit source paths).
  ReportsPage TypeScript transpile parser: no syntax errors.
  No live PostgreSQL, deployed browser, clean Node 24 build, or external writes.

Original historical failures CASE=24 and test_country='Croatia' REMAIN OPEN
pending actual approved staging PostgreSQL and deployed acceptance evidence.
The full original 328-case audit and the additional unnumbered observations
are NOT represented as all accepted/closed by this limited code correction.
================================================================================

