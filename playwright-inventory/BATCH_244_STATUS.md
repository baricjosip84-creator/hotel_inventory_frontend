# Inventory Management App — Batch 244 R3

18 November 2026. Corrected release; supersedes initial Batch 244 source package.

- The frontend build validation stopped at `check:feed-anomaly-freshness`. The initial Batch 244 artifact replaced two pages with stale versions and lost previously implemented functionality. Exact pre-Batch-244 source was recovered from commit `f6bc5ee860b00f394e2278bb7915616be516d19d`, parent of `ba7b70a4d4a718f4ce563df4737a971f5a966869`.
- Insights: preserve meaningful outbound anomaly tier filtering and current page source; clear the stale supplier detail on user filter changes while retaining URL restoration guards.
- Storage Locations: restore the exact last working page from the pre-B244 commit, byte-for-byte. Its existing directory URL helper already removes the location pin, preserves unrelated URL parameters, and clears directory restrictions. R2's equivalent functional setter syntax was incompatible with the existing source-string regression guard; this is now corrected without altering the test.
- Reliability Command: use the existing single-filter setter when the limit is the only query filter; otherwise clear all three query filters atomically in one URL update. This also retains compatibility with the earlier command-wide validation that checks the limit resets to 9.
- Existing original-suite workflow and five selected original tests remain unchanged. The source guard now checks the actual original commit, failed commit, and corrected commit hashes.
- Local validation: exact existing feed freshness/anomaly regression script 27/27 PASS; exact existing Storage Locations regression script 31/31 PASS; four real Reliability callback scenarios PASS. Differential audit of 19 archived source checks: 11 PASS and 8 unchanged baseline failures (other source/dependency differences), no new failures. Original scripts and original Playwright specs are unchanged. Full frontend CI/build and five live Playwright outcomes remain pending.
- Confirmed counts remain 2,686/2,938 tenant (91.42%) and 2,686/9,900 overall (27.13%). No new PASS credited. Five originals remain pending: TINS-024, TRC-009, TRC-048, TSL-040, TSL-045.

## GitHub UI only

1. Extract this changed-files ZIP into the frontend repository root, overwrite matching files, then commit/push using the normal process.
2. Wait for Frontend Validation and Vercel to turn green.
3. Actions → **Inventory - original 9900 Playwright suite** → **Run workflow** → group **BULK_SAFE_17** → confirmation **ORIGINALTESTS** → **Run workflow**.

Expected: `B244 ACTUAL PASS 5/5`. Do not use the recovery workflow. No manual commands or new workflow required.
