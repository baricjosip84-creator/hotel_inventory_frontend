INVENTORY MANAGEMENT APP — BATCH 239 R2 — EXACT FIVE-TEST RECHECK
Date: 2026-11-17

Prior: 2,672 confirmed PASS. Actual Batch 239: +3 = 2,675 / 2,938 tenant PASS (91.05%).
Remaining tenant originals: 263; 8 Batch 239 access-unverified not executed, other 5 failed.
Only the 5 actually failed IDs are selected for this recheck; 3 already-PASS excluded.

INSTALL
Extract this changed-files-only ZIP into ROOT of hotel_inventory_frontend repo.
Replace matching files, commit and push to main.

RUN EXACTLY
GitHub > Actions > Inventory - original 9900 Playwright suite
Branch: main
Group: BULK_SAFE_17
Confirmation: ORIGINALTESTS

FIVE REVIEWED IDs
TMOB-044, TMOB-045, TMOB-046, TMOB-048, TPO-033.
Mobile: restore prerequisite operational_action_center.read in scoped synthetic permission responses.
TPO: set separate-approver creator to authenticated fixture user, not invented 'pw-user',
and bind the seen-request ledger. Missing user-ID fails closed.

GUARDS
Current approved Vercel/Render only; no alternate environment, no real writes,
no unauthorized roles. Original test expectations remain intact.
The existing original-suite workflow will refuse a skipped, failed, unexecuted or
access-blocked R2 test. Previous passes and eight access-unverified originals are excluded.
Do not claim verified browser success from offline checks.

LOG SOURCE
logs_119600359077.zip: 3 actual pass, 5 actual fail, 8 access-unverified.
Result analysis BATCH_239_RESULT_ANALYSIS.json, permanent APPLICATION_ISSUES_TRACKER.csv.
