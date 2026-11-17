INVENTORY MANAGEMENT — Batch 238 R2, 17 November 2026

SOURCE EVIDENCE: logs_119366187086.zip; Batch 238 actual browser: 18 PASS and 2 FAIL.
Confirmed tenant originals now 2,670 / 2,938 (90.88%); 268 tenant originals outstanding.
Exactly 2 selected for R2: TICAP-095 and TICAP-155. Do not rerun the other 18.

CORRECTIONS (only selected test bodies; applied in protected CI runtime):
- TICAP-095: scope duplicate rejection message to its visible main .form-error.
  Preserve that rejection stays visible, preview remains, freight persists and one synthetic finalize request was attempted.
- TICAP-155: when shipment is partial and preview is visible, accept an absent or disabled Finalize cost button, but never an enabled one.
  Preserve the exact user-facing finalization-lock warning and zero finalize POSTs.
  An absent control is not alone proof of an app defect; actual R2 behavior still requires browser verification.

INSTALL: extract changed-files-only ZIP into root of existing GitHub repository
baricjosip84-creator/hotel_inventory_frontend (branch main), preserving .github/ and playwright-inventory/ paths.
Commit and push the changed and added files.

RUN: GitHub -> Actions -> Inventory - original 9900 Playwright suite -> Run workflow
Branch main | group BULK_SAFE_17 | confirmation ORIGINALTESTS

No extra deployment, accounts, secrets, or new workflow.
Protected live Vercel/Render test fixture maintained: PW_LIVE_ORIGINAL_READONLY=YES, 1 worker, no uncontrolled writes, no fabricated role sessions.
The existing batch-238 runtime runs first, then the exact two-case R2 patch overlays its selection.
Old batch-238 review/ledgers remain installed for reproducibility; the new cumulative ledger and issue-tracker are authoritative for pass counts.
R2 result must be confirmed from actual GitHub logs; until then 2,670 PASS is the maximum confirmed count.
Offline checks never count as live PASS.
