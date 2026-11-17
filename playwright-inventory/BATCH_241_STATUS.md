# Inventory Management App — Batch 241

17 November 2026 · Original 9,900 Playwright scenarios

## Batch 240 outcome

User confirmed the Playwright workflow GREEN. Its strict verifier required three exact actual passing results: TIR-030, TIR-032 and TOUT-027. Those IDs are now closed in the cumulative tracker. Raw GitHub logs were not supplied; the ledger expressly records user confirmation. No previously passing original is selected again.

| Metric | Count |
| --- | ---: |
| Original authored tests | 9,900 |
| Tenant originals | 2,938 |
| Confirmed PASS | 2,683 |
| Tenant coverage | 91.32% |
| Overall coverage | 27.10% |
| Tenant outstanding | 255 |
| Overall outstanding | 7,217 |
| Batch 241 selected | 2 |
| Batch 241 live result | Pending |

## Batch 241 — deterministic scanner camera cases

- TSN-045: simulated browser camera permission denial. Require a camera request, a visible failure, stopped camera controls, usable manual input, and no synthetic scan transaction. Denial occurs before native camera access.
- TSN-046: Chromium fake video device. Verify Start/Stop control exclusivity, exactly one live video track, termination of all tracks on Stop, successful second start/stop cycle, no unexpected device, and zero intercepted scan writes or QR lookup.

These were original unconditional skip placeholders. The batch activates the original IDs and original titles through a source-fingerprinted CI-only runtime patch, preserving all other original calls byte-for-byte. Chromium uses fake video and fake UI flags, rejects audio capture, rejects any non-fake device label, and confines interception to camera APIs. The authentic tenant session and production network write guard remain unmodified. The actual scanner UI is tested, not mocked. No physical camera, microphone, stock posting, or new environment is needed.

## Verification

- Exact previous archived scanner runtime and original placeholder fingerprints matched. Original IDs and titles preserved; two selected, 2,683 confirmed PASS excluded, and all role-gated/access-unverified IDs excluded. Runtime preparation passed on reconstructed source, not installed GitHub main.
- TypeScript parsing, Node syntax and workflow YAML passed.
- Offline JS simulation passed the deny-before-native-access, fake track lifecycle, microphone denial and nonfake-device rejection checks.
- Strict result verifier accepted the exact two PASS-shaped test results and rejected failed, skipped, missing, access-unverified and unexpected scenarios. These are synthetic verifier checks only, not live test credit.
- Local Chromium process launch was blocked by the execution environment (socket permission). A mandatory, isolated actual Chromium media-fixture check runs in GitHub Actions before any authenticated live session. The workflow stops if the fake camera fixture cannot be verified.
- The exact original scanner browser tests then must execute on the current Vercel frontend/Render backend and pass. No new PASS claimed in advance.

## Remaining tenant work

255 original tenant cases remain: 214 canonical permission-gated originals; eight access-unverified cases; 16 remaining review cases; 14 held triage cases; one application confirmation triage case; and the two selected camera cases. Retain the genuine-role and authorization safety gates. Do not interpret mocks as backend authorization evidence. No unexecuted or skipped scenario receives credit.

The permanent APPLICATION_ISSUES_TRACKER retains all 661 earlier records, closes the three B240 passes, and adds the two previously skipped camera records for a total of 663. This is not a count of confirmed app defects. The 2,683-PASS and 255-remaining tenant ledgers are disjoint and cover exactly 2,938 unique original IDs.

## Install and run

Extract INVENTORY_PLAYWRIGHT_BATCH_241_CHANGED_FILES_ONLY.zip into the hotel_inventory_frontend repository root. Replace matching files, commit and push main. GitHub Actions: Inventory - original 9900 Playwright suite; branch main; group BULK_SAFE_17; confirmation ORIGINALTESTS. The workflow must pass both actual camera originals and the preceding fixture check. Send GREEN or the new log ZIP.
