# Inventory Application Issues Tracker — baseline Batch 230 (2026-11-10)

This cumulative register is separate from the 9,900 Playwright execution scoreboard.

- `APPLICATION_ISSUES_TRACKER.csv`: 135 records, including exactly **121** unique held/deferred Playwright scenario IDs, seven historic acceptance gates, four specific historical engineering/UX observations, and three explicitly closed items.
- `APPLICATION_AUDIT_44_PAGE_LEDGER.csv`: all 44 historic tenant audit pages. Stale FT172 dispositions are **not** proof that all 44 pages remain broken; later live passes take precedence.
- `APPLICATION_HISTORICAL_FIX_001_092.csv`: index of 92 historical FIX ids from the cumulative FIX_LOG; **a source fix does not prove live acceptance**.

Categories are intentionally conservative: suspect bugs are not asserted as confirmed app defects unless the evidence justifies that. 61 execution/requisition page access failures in Batch 228 are not app defects until legitimate permissions are established. Earlier `FT147` Users Delete, `FT143` Dashboard and `FT200` Mobile Execution are CLOSED; do not repeat them.

On every subsequent batch, keep issue IDs stable, append new evidence/associated IDs, preserve closed records, and update status only when a named source or an actual browser result warrants it.

Baseline: **1,381 confirmed Playwright passes**, **121 held/deferred** (23 + 62 + 35 + 1), **8,041 unapproved non-skipped**, **357 originally skipped**. The batch 230 selection is not counted as passing until actual GitHub result is inspected.

Sources (verbatim historical records preserved separately in the handoff/Library):
- INVENTORY_PLAYWRIGHT_COMPLETE_HANDOFF_BATCH_214_2026-11-08.txt
- INVENTORY_PLAYWRIGHT_COMPLETE_HANDOFF_BATCH_227_2026-11-09.txt
- INVENTORY_2026-10-28_FINITE_AUDIT_RECONCILIATION.txt
- Inventory_Management_App_FIX_LOG_2026-10-06(20261015-112237).txt
- FinalTestingResults(9).txt
- Batch 227 held list, Batch 228 deferred list, Batch 229 deferred list, six failed TPROD-076 rechecks

Known limitation: this reconciles all records in the identified primary historical audits and current held ledgers, but cannot certify completeness for files or conversations that were not available in the source archive. Each row links back to its specific evidence document; the raw FIX_LOG should remain retained.
