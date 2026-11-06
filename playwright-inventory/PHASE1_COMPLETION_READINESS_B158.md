# Batch 158 — Phase 1 readiness

**NOT READY.** 137/137 router routes inventoried is not browser-verified coverage.

| Metric | Value |
|---|---:|
| Unique authored scenario labels | 9,259 |
| Active but uncompiled/unrun declarations | 8,902 |
| Scenario-labelled `test.skip` declarations | 357 |
| Extra conditional `test.skip` calls | 24 |
| Manually source-traced labelled skips | **357/357** |
| Unreviewed heuristic labelled skips | **0** |
| Explicit skipped obligations still open | **357** |
| Partially classified features (not passed) | **272** |
| Deep FE/BE source-behavior reviews among partials | **39/272** |
| Partial feature reviews still requiring this depth | **233** |
| Blocked ledger obligations | 417 |
| Needs expectation | 1 (`PLCR-084`) |
| Ledger unique scenario IDs | 9,677 |
| Page/function inventory entries | 9,969 |
| Spec files | 152 |
| Tests compiled | 0 |
| Tests executed | 0 |

Every skip was classified by a source review; this is not completion of its validation. Real authorization, PostgreSQL, concurrency, provider evidence and UI hardening remain. `PLCR-084` needs an explicit human expectation decision.
