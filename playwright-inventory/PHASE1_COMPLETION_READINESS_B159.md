# Batch 159 — Phase 1 readiness

**NOT READY — static source review only.**

| Metric | Value |
|---|---:|
| Source-traced partial features B158 | 39 |
| Newly source-traced partial features B159 | 83 |
| Cumulative deep source-traced partial features | **122/272** |
| Remaining for direct source-behavior review | **150** |
| Original routes inventoried (not runtime validated) | 137/137 |
| Authored labelled test declarations | 9,259 |
| Active, uncompiled/unrun tests | 8,902 |
| Labelled skips | 357 |
| Individually source-reviewed skips | 357/357 |
| Additional conditional skips | 24 |
| BLOCKED ledger rows | 417 |
| NEEDS_EXPECTATION | 1 — PLCR-084 |
| Ledger unique IDs | 9,677 |
| Feature inventory records | 9,969 |
| Spec files | 152 |
| Compiled / executed / browser validated | 0 / 0 / 0 |

B159 specific source gap: 36-character malformed focused forecast IDs pass FE focus regex but fail backend UUIDv4/v5 validation; existing TPF-022 does not test this boundary. See `PHASE1_GAP_REVIEW_B159.md`. No runtime assertion/repair claimed.
