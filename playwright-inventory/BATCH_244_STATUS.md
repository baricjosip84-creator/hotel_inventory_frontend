# Inventory Management App — Batch 244 R2

18 November 2026. Corrected release; supersedes initial Batch 244 source package.

- The frontend build validation stopped at `check:feed-anomaly-freshness`. The initial Batch 244 artifact replaced two pages with stale versions and lost previously implemented functionality. Exact pre-Batch-244 source was recovered from commit `f6bc5ee860b00f394e2278bb7915616be516d19d`, parent of `ba7b70a4d4a718f4ce563df4737a971f5a966869`.
- Insights: preserve meaningful outbound anomaly tier filtering and current page source; clear the stale supplier detail on user filter changes while retaining URL restoration guards.
- Storage Locations: preserve the existing deep-link helper, remove the pin on explicit directory filter changes using current URL parameters, and clear all directory restrictions while preserving unrelated parameters.
- Reliability Command: exact pre-B244 source plus atomic filter reset equals the already-committed Batch 244 file byte-for-byte. It does not need replacement.
- Existing original-suite workflow and five selected original tests remain unchanged. The source guard now checks the actual original commit, failed commit, and corrected commit hashes.
- Local validation: exact existing feed freshness/anomaly regression script 27/27 PASS; focused parser and filter behavior checks performed before packaging. Complete frontend CI/build and five live Playwright outcomes remain pending.
- Confirmed counts remain 2,686/2,938 tenant (91.42%) and 2,686/9,900 overall (27.13%). No new PASS credited. Five originals remain pending: TINS-024, TRC-009, TRC-048, TSL-040, TSL-045.

## GitHub UI only

1. Extract this changed-files ZIP into the frontend repository root, overwrite matching files, then commit/push using the normal process.
2. Wait for Frontend Validation and Vercel to turn green.
3. Actions → **Inventory - original 9900 Playwright suite** → **Run workflow** → group **BULK_SAFE_17** → confirmation **ORIGINALTESTS** → **Run workflow**.

Expected: `B244 ACTUAL PASS 5/5`. Do not use the recovery workflow. No manual commands or new workflow required.
