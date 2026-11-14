# INVENTORY PLAYWRIGHT — BATCH 230 CONTINUATION

**2026-11-10 source baseline:** `INVENTORY_PLAYWRIGHT_BATCH_229_RECHECK6_FULL.zip` (last source that was presented to user), PLUS B229 TPROD-076 HELD (six failed rechecks).

**Known status before dispatch:** 1381 unique GREEN; 121 held/deferred (23 old + 62 B228 + 35 B229 + 1 TPROD-076); 8041 unapproved unskipped; 357 original `.skip` scenarios. No browser test in Batch 230 has passed yet.

**Next workflow group:** `BULK_SAFE_11`, confirmation `ORIGINALTESTS`. 130 NEW original IDs in 18 previously accessed TENANT specs; no original test bodies edited. GitHub will first check the 33 preflight scripts and Playwright `--list` selected count/IDs; then run the original cases against the protected Vercel origin.

**New permanent issue tracking:**

- `APPLICATION_ISSUES_TRACKER.csv` — canonical issue register (135 records; 121 held/deferred scenario records, 7 historic audit gates, 4 extra observations, 3 closed records).
- `INVENTORY_APPLICATION_ISSUES_TRACKER_BATCH_230.xlsx` — readable workbook with Summary, Issues, Audit 44 pages, Historic 92 fixes.
- `APPLICATION_AUDIT_44_PAGE_LEDGER.csv` — all 44 historical tenant-audit page dispositions; the older FT172 statuses were stale in places.
- `APPLICATION_HISTORICAL_FIX_001_092.csv` — 92 indexed FIX_LOG corrections. Do NOT count these as unresolved app bugs.
- `docs/issue-evidence` — preserved original audit/reconciliation documents and TPROD-076 hold report.
- `INVENTORY_PLAYWRIGHT_BATCH_230_CONFIRMED_1381_PASS_IDS.csv` — source-of-truth green ID baseline; separate from unrun B230.
- `INVENTORY_PLAYWRIGHT_BATCH_230_HELD_DEFERRED_121_IDS.csv` — source-of-truth excluded unresolved IDs.

**Safety:** Production non-GET writes remain blocked outside narrowly scoped authentication and pre-approved mocked routes. No browser/production test run has occurred in this preparation. Never claim a passing test based on offline contract checks alone. If a new case fails, classify app bug vs test defect vs permission/environment before any rerun; append to permanent tracker, including exact evidence source. Don't reopen FT147/FT143 or any confirmed pass without new regression evidence.

**Install:** Extract ONLY the B230 `GITHUB_FIX.zip` into the root of the frontend repository, preserving paths. Commit and push. FULL ZIP is handoff backup, not the repo update. Run GitHub Actions `Inventory - original 9900 Playwright suite`, group `BULK_SAFE_11`, confirmation `ORIGINALTESTS`, once.
