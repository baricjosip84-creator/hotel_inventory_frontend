INVENTORY MANAGEMENT — Batch 237 R4, 17 November 2026

Extract this changed-files-only ZIP into the frontend repository root.
Keep .github/ and playwright-inventory/ paths, replace, commit, push.
GitHub Actions: Inventory - original 9900 Playwright suite
Run workflow: group BULK_SAFE_17, confirmation ORIGINALTESTS.

R3 strict actual result: 24/25 PASS (logs_119334635605.zip).
Confirmed total: 2,634/9,900 (26.61%); tenant 2,634/2,938 (89.65%).
Outstanding: 7,266 overall; 304 tenant originals.
R4 selects 18 previously failed originals across 8 spec files / 7 pages.
11 of the 29 Batch 237 failures remain held; they are NOT counted as PASS.

Source-backed corrections: native confirmation for exact alert filter, draft
line removal, PO attention and stock-movement reason removal; concurrent
handling of the blocked-print alert; localized currency display; pagination
section scope and meaningful 26-row sessions fixture; exposed download
metadata headers; exact package count/warning; blocking sessions loading
panel and restored enabled controls after a new status request.

TSES-039 explicit revoke-all warning, storage location query pinning and
other suspected application discrepancies remain open pending source review.
All 652 cumulative issue tracker records preserved with R3 PASS evidence.
No production files or committed original spec files changed. Runner-only
exact AST-checked overlays preserve individual original IDs; no previously
confirmed pass can be selected. Authenticated access preflight, guarded
synthetic fixtures and strict execution gate remain active. Real Playwright
discovery confirmed 18/18 selected originals in 8 spec files. Live browser
execution remains required for PASS.
