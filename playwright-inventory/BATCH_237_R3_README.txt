INVENTORY MANAGEMENT — Batch 237 R3, 17 November 2026

Extract this changed-files-only ZIP into the frontend repository root.
Keep .github/ and playwright-inventory/ paths, replace, commit, push.
GitHub Actions: Inventory - original 9900 Playwright suite
Run workflow: group BULK_SAFE_17, confirmation ORIGINALTESTS.

R2 actual result: 20/22 PASS, 2 unresolved (logs_119323656101.zip).
Confirmed total: 2,610/9,900 (26.36%), tenant 2,610/2,938 (88.84%).
Outstanding: 7,290 overall; 328 tenant originals.
R3 selects 25 previously failed originals in 7 specs / 7 protected pages.
2 R2 locator corrections and 23 earlier unresolved source-reviewed tests.
The remaining 28 Batch 237 failures are held for investigation.

Corrects exact status/error locator scope, local-rules Copilot structured
snapshot fixtures and history status selection, global native confirmation
for Mobile Execution, stale synthetic offline cache, cost-blocked PO controls,
draft status display, session initial/refetch synchronization, and the scanner
destination selector. Retains all underlying operation and safety contracts.

All 652 cumulative tracker records preserved. No previously confirmed ID
selected. No production frontend/backend file changes. Original committed
spec files unmodified: runner-only AST-checked exact replacements.
Live target access preflight and strict execution gate unchanged.
Actual Playwright discovery passed 25/25 selected originals in 7 files.
Authenticated browser execution remains required for confirmation.
