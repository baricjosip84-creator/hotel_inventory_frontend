# Batch 156 — feature inventory reconciliation (static only)

**Root cause:** 156 feature records retained `NOT_STARTED` / `SOURCE_REVIEWED_NOT_STARTED` from their reservation phase although the current B155 `COVERAGE_LEDGER.csv` already linked them to 156 unique `GENERATED_UNRUN` scenario IDs: **114 non-skipped** `test` declarations and **42 intentionally skipped** `test.skip` declarations.

- 39 `NOT_STARTED`: 28 → `TEST_GENERATED_UNRUN`, 11 → `DEFERRED_SKIP_UNRUN` (Platform Incidents).
- 117 `SOURCE_REVIEWED_NOT_STARTED`: 86 → `SOURCE_REVIEWED_GENERATED_UNRUN`, 31 → `DEFERRED_SKIP_UNRUN` (Data Retention, Announcements, System Health).
- 133 `SOURCE_PARTIAL` and 139 `SOURCE_TRACED_PARTIAL` left unchanged: they concern incomplete feature/source investigation even though linked scenario declarations exist.
- 156 status corrections (114 non-skipped + 42 deferred skips) are **metadata reconciliations**, NOT new tests, source-behavior acceptance, run results, or blanket completion of those features.
- Existing ledger, scenario IDs, spec sources and all blocked/needs-expectation obligations are unchanged.

See `PHASE1_FEATURE_INVENTORY_RECONCILIATION_B156.csv` for every record (428) with original status, new status, linked scenario IDs and evidence-preservation decision. No TypeScript, Playwright, browser, app, backend, SQL or external system was run.
