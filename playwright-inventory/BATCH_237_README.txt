INVENTORY MANAGEMENT — Batch 237, 17 November 2026

Extract this changed-files-only ZIP into the frontend repository root, keeping
the .github/ and playwright-inventory/ paths. Replace existing files, commit
and push the changes.

GitHub Actions workflow: Inventory - original 9900 Playwright suite
Run workflow, group BULK_SAFE_17, confirmation ORIGINALTESTS.
This selection now runs Batch 237, not another Batch 236 recheck.

Confirmed from logs_119257169317.zip: Batch 236 R3 locator fix passed 5/6.
TICAP-036, TICAP-144, TICAP-148, TICAP-150 and TIR-037 are closed PASS.
TICAP-132 remains held for deployed UI/fixture investigation: second exact
Remove click left Component 2 count 1, despite offline browser harness passing.

Confirmed cumulative: 2,568/2,938 tenant originals, 2,568/9,900 overall.
370 tenant originals remain outstanding, including the new 95 selected.
All 643 cumulative tracker records preserved.

Batch 237: 95 previously unresolved original IDs in 24 original spec files,
21 protected pages. No already-confirmed IDs selected. Exact source fingerprints,
AST syntax review, assertion-count preservation, production-write interception,
genuine page access checks, shared guarded session, single worker, five-second
case pacing. Separate strict report rejects failed, skipped, missing and
access-unverified cases. Original committed spec files are not rewritten.

Local actual Playwright discovery: 95 tests in 24 files; preflight scenario
discovered. Reporting gate exercised with synthetic complete and failed reports
(synthetic reports are NOT actual PASS evidence and are not distributed).
No authenticated live test claims before receipt of the new GitHub logs.
Other role-specific, hardware, identity-specific, and unresolved cases remain
in the outstanding ledger. Do not count them as passed.
