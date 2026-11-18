# Inventory Management App — Batch 246

18 November 2026 | B245 evidence: logs_119890287209.zip.

## Actual confirmed result

B245 ran 19 original browser tests. 1 passed (TIR-020); 18 failed. All 8 protected routes were accessible. The run is RED; no failed test counted as passed.

Tenant: **2,692/2,938 PASS (91.63%)**, 246 outstanding. Original suite: 2,692/9,900 (27.19%), 7,208 outstanding.

## B246 changes

- Ten failures were caused by the B237 route recovery allowlist not containing /products or /intelligence-review. Both routes were authenticated and visible. Add those exact routes with existing preflight markers. Nine rechecked now; TPROD-034 additionally requires its named contextual confirmation fix.
- Three Inventory Capabilities cases: handle the exact Disable/Enable native confirmation for the original synthetic fixture actions; retain all version/payload/acknowledgement assertions. TICAP-143 waits for its synthetic PATCH to arrive before inspecting it. No real backend write permitted.
- Three application cases await deployment of current-source fixes: TSES-039 (logout warning), TPROD-034 (named package warning), and TSH-069 (atomic page-size/page reset). Separate CI job creates the three changed files from the current committed sources, verifies exact anchors and hashes, runs targeted checks, typecheck and production build. On success it produces B246-APPLICATION-CHANGED-FILES. Nothing deploys automatically. No old page replacement.
- Three permission-dependent cases TIU-032, TST-038, TST-039 are held for genuine record/consume capability evidence. Live preflight logs only control availability, without changing role or permissions. These are suspected permission blockers, not confirmed application defects. 228 previously blocked cases remain unchanged.

## Exact partition

2,692 prior PASS + 12 selected rechecks + 3 waiting on application deployment + 3 capability investigations + 228 earlier blockers = 2,938. If all 12 pass, 2,704/2,938 (92.04%), 234 outstanding. No PASS credit for generated source or build checks.

## User action

Extract this changed-files ZIP into the frontend repository root, overwrite matching paths, commit and push. GitHub Actions → Inventory - original 9900 Playwright suite → Run workflow → group BULK_SAFE_17 → confirmation ORIGINALTESTS → green Run workflow button.

Send the resulting log ZIP. The same workflow also generates a separate artifact named **B246-APPLICATION-CHANGED-FILES** if the current-source job passes. Download and send that artifact as well; it contains the exact current-source candidate app fixes, not yet deployed. Do not deploy if the build job fails.

## Local verification

- Exact 246 outstanding IDs reconciled, no prior PASS rerun.
- Runtime preparation verified 12 originals on recovered B245 runtime sources; every unselected body exactly preserved.
- Application generator tested against a local Git baseline of recovered sources: exactly three files changed (3 insertions, 1 deletion), git diff --check passed. This is not a current-source build or live pass.
- CI workflow YAML and JavaScript syntax verified locally.

Result gate requires actual 12/12; missing, skipped or failed cases remain unresolved. Full live results and current-source build are pending.
