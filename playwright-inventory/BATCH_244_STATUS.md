# Inventory Management App — Batch 244 R4

18 November 2026. Evidence: `logs_119867590953.zip` (R3 live run).

## Actual progress

- R3: 2/5 original browser tests passed: TRC-009 and TRC-048. Reliability Command is unchanged in R4 and those passes are excluded from this run.
- Three originals failed: TINS-024 (six supplier cards remained after filtering); TSL-040 and TSL-045 (exact location ID remained in the URL after directory filtering).
- All three R3 pages had authenticated access. No further live passes are claimed yet.
- Tenant: 2,688/2,938 passed (91.49%), 250 unresolved. Original total: 2,688/9,900 passed (27.15%), 7,212 remaining.

## Changes

- Insights: the URL now owns supplier search, filters, page, page size and selected detail. A filter action performs one navigation that also resets page and removes the selected supplier. Clear-all and breakdown actions update related filters together. Page clamping waits for successful, settled data. Shared links and unrelated parameters remain supported. Existing anomaly and other panels are preserved.
- Storage Locations: the URL owns directory filters; the search input retains an uncommitted whitespace draft without writing back from an effect. Search and zone changes remove the exact location restriction and preserve unrelated URL parameters. Clear Filters removes the linked location, search and zone together.
- No visual redesign, API change, backend change, Reliability page change or original test change.
- Existing GitHub Actions workflow **Inventory - original 9900 Playwright suite**, existing **BULK_SAFE_17** selection. It now checks exactly the remaining 3 cases; a missing, blocked, skipped or failed case is not a pass.

## Verified locally

- Unmodified current frontend regression checks: feed freshness/anomaly 27/27, storage deep-link 31/31.
- 41/41 assertions invoking actual changed frontend URL handlers (not live browser results).
- Archived differential audit: 11 checks passed; eight unchanged pre-existing baseline failures (older guard/dependency mismatch), no new differences.
- Original suite hashes/IDs checked; simulated workflow gate accepts 3/3 and rejects missing result (2/3). These are local gate tests, not evidence of actual live passes.
- Full GitHub frontend validation, deployment and the three original live cases remain pending.

## Next action — GitHub UI only

1. Extract the changed-files ZIP into the frontend repository root, overwrite matching paths, commit and push.
2. Wait for Frontend Validation and Vercel to turn green.
3. GitHub → Actions → **Inventory - original 9900 Playwright suite** → **Run workflow** → group **BULK_SAFE_17** → confirmation **ORIGINALTESTS** → green **Run workflow** button.

Expected: `B244 ACTUAL PASS 3/3`. Send the resulting log ZIP. No terminal commands and no new workflow.
