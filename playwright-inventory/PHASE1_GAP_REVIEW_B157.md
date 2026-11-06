# Batch 157 — remaining obligations and source discrepancies

**50 separate `test.skip` scenarios individually source-traced**, not promoted. Sources and individual finding/gate per case: `PHASE1_MANUAL_SKIP_REVIEW_B157.md` and `PHASE1_DEFERRED_SCENARIO_AUDIT_B157.csv`.

- PNOT-061: missing individual status mutation failure message in frontend.
- PLEN-059: frontend decimal URL offset / backend integer-only query mismatch.
- PLEN-060: beyond-total pagination display can be misleading.
- PPER-062: malformed permissions response is silently normalized to empty roles/catalog.
- Source trace cannot replace direct authenticated API calls, database races, tenant separation, provider delivery or legal acceptance.

All 417 BLOCKED ledger rows and PLCR-084 remain unchanged. **43** original heuristic skipped cases remain. All **272** partial classifications are retained; details and source-reference verification in `PHASE1_PARTIAL_FEATURE_EVIDENCE_RECONCILIATION_B157.csv`. No original application sources changed.
