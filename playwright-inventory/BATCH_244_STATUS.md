# Inventory Management App — Playwright Batch 244

18 November 2026

## Confirmed status

- Batch 243 R2: user confirmed deployment and strict GitHub Actions workflow GREEN. TSN-042 is closed; raw B243 log was not provided. No other IDs are promoted.
- Tenant: 2,686 / 2,938 PASS (91.42%); 252 unresolved, including 214 canonical role-gated IDs and 38 additional held IDs.
- Entire original suite: 2,686 / 9,900 PASS (27.13%); 7,214 unresolved. The tenant total is a subset of 9,900, not an additional suite.
- Batch 244 selects five held originals. If all five are confirmed green: tenant 2,691 / 2,938, 247 unresolved; overall 2,691 / 9,900. Do not update confirmed totals until actual workflow evidence arrives.

## Application fixes

| Page | Original test IDs | Repair |
|---|---|---|
| Insights | TINS-024 | Clear stale selected supplier when filter change resets pagination; retain deep-link restoration guard. |
| Reliability Command | TRC-009, TRC-048 | Clear three query-backed filters in one router update, preserving unrelated parameters. |
| Storage Locations | TSL-040, TSL-045 | Explicit directory filtering leaves pinned location mode, maintaining search/zone and unrelated URL parameters. Initial exact location links remain unchanged. |

The application source is based on the recovered surgical-fix-184 frontend archive. The workflow checks the prior committed file hash and repaired file hash for each replacement to prevent accepting unrelated source overwrite. If the source differs, stop; do not credit tests or blindly bypass the guard. The application replacements must be deployed before browser testing. The five original runtime specs have not been altered.

## Offline checks completed

- Three TSX sources parsed: PASS.
- Runtime manifest selection: exact five distinct original IDs, original B237 prepared source SHA-256 verified, no confirmed IDs repeated: PASS.
- Extracted atomic filter callbacks tested with URLSearchParams: PASS (defaults cleared; unrelated query preserved; stored search/zone retained; location pin removed; clear resets directory).
- Insights source reset guard inspection: PASS.
- Workflow YAML parsed and six JavaScript helper syntax checks: PASS.
- Strict result checker: positive fixture accepted; missing, blocked, skipped, duplicate, retry/flaky outcomes rejected. Synthetic reports are NOT browser evidence.
- Issues tracker preserves all 663 records and updates the six affected entries.

## Run (same GitHub UI workflow)

1. Extract ZIP into existing repository root, preserving paths. Commit/push changed and added files. Before deploying, inspect the three source file diffs: only the reviewed changes above should appear.
2. Wait for Vercel GREEN.
3. GitHub Actions → **Inventory - original 9900 Playwright suite** → Run workflow → group **BULK_SAFE_17**, confirmation **ORIGINALTESTS** → Run workflow.
4. Expected acceptance: **B244 ACTUAL PASS 5/5** and green workflow. No terminal commands or manual UI tests needed. Return workflow logs if it fails.

Confirmed IDs and cumulative issues must remain preserved. Role-gated originals must not be treated as passed using administrator substitution or mocked permissions.
