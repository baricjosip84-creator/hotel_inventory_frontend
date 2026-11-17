# Inventory Management App — Batch 240

17 November 2026 · Original 9,900 Playwright scenarios

## Batch 239 R2 outcome

User confirmed GREEN for the strict five-result workflow. The exact five new PASS IDs are TMOB-044, TMOB-045, TMOB-046, TMOB-048 and TPO-033. The raw R2 log was not provided; the ledger records user confirmation, not independent raw-log analysis. No previous passing ID is reselected.

| Metric | Count |
| --- | ---: |
| Original authored tests | 9,900 |
| Tenant originals | 2,938 |
| Confirmed PASS | 2,680 |
| Tenant coverage | 91.22% |
| Overall coverage | 27.07% |
| Tenant outstanding | 258 |
| Overall outstanding | 7,220 |
| Batch 240 selected | 3 |
| Batch 240 live execution | Pending |

## Next three reviewed rechecks

| ID | Original contract |
| --- | --- |
| TIR-030 | Governed rejection posts the adequate trimmed reason. |
| TIR-032 | Reopening rejected/cancelled request posts the reason. |
| TOUT-027 | Removing one of two draft order lines preserves at least one line. |

The earlier evidence showed missing expected reason POSTs for the requisition cases and two line editors remaining after a Remove click for outbound. Later batches encountered native global `Confirm action: ...?` dialogs and passed after explicit exact confirmation handling. Batch 240 applies that same pattern to the three original actions; this is an evidence-backed recheck hypothesis, not a claim of a confirmed product defect or successful live fix. Only a matching native confirmation is accepted; other dialog types/messages are dismissed. Original assertions and request capture are unchanged.

Preflight: TypeScript original-call fingerprints matched archived Batch 235 runtime and originals; original test ID lists preserved; local runtime overlay passed with the reconstructed B235 selected specs and B239 R2 manifest; no confirmed-PASS overlap, access-unverified overlap or canonical role-gated overlap. TypeScript parser, Node syntax and workflow YAML parse passed. Synthetic verifier checks accepted the exact three PASS-shaped results and rejected failed, skipped, missing, access-unverified and unexpected results. These are offline checks, not new Playwright browser passes. GitHub installed main remains authoritative.

## Remaining work

258 tenant originals remain, including 214 canonical permission-gated tests, eight prior protected-page access-unverified originals, 18 further review cases (including device-fixture placeholders), 14 unresolved triage cases, the three selected cases and one application confirmation triage case. No omitted, skipped or permission-gated test is credited as PASS. Genuine isolated permission roles cannot be replaced with a tenant admin, nor should the role-session safety gate be relaxed. Future work must address verified fixture defects, deployed application behavior, and the authorized isolated role design. No real live writes or new environment are part of this delivery.

The cumulative `APPLICATION_ISSUES_TRACKER.csv` retains all 661 records, including the five newly closed PASS records. This is an issue inventory, not 661 confirmed application defects. Remaining and confirmed ledgers are disjoint and together contain all 2,938 original tenant IDs.

## Install and run

Extract `INVENTORY_PLAYWRIGHT_BATCH_240_CHANGED_FILES_ONLY.zip` into the `hotel_inventory_frontend` repository root, replacing matching files. Commit and push main. GitHub Actions: **Inventory - original 9900 Playwright suite**; branch **main**; group **BULK_SAFE_17**; confirmation **ORIGINALTESTS**. The workflow rejects failed, skipped, unexecuted or access-unverified cases and requires all three selected original tests to actually pass. Submit GREEN or the new GitHub log ZIP.
