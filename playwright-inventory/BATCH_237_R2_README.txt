INVENTORY MANAGEMENT — Batch 237 R2, 17 November 2026

Extract this changed-files-only ZIP into the FRONTEND repository root.
Keep .github/ and playwright-inventory/ paths, replace, commit, push.
GitHub Actions: Inventory - original 9900 Playwright suite
Run workflow: group BULK_SAFE_17, confirmation ORIGINALTESTS.

Batch 237: actual 22/95 PASS, 73 unresolved from logs_119283808954.zip.
All 21 guarded page probes passed. No access-gated scenario was credited.
Confirmed total 2,590/9,900 (26.16%), tenant 2,590/2,938 (88.16%).
Tenant originals outstanding: 348. Overall originals outstanding: 7,310.

R2 selects 22 previously failed originals across 10 specs / 9 protected pages.
51 other B237 failures remain under investigation; none receives PASS credit.
Corrects the observed ambiguous supplier and duplicate feedback locators,
exact API transport prefixes, nested error-envelope fixtures, changed global
dangerous-action confirmation flow, reason prompt handling and filtered CSV action.
Neither original business expectations nor production application files are removed.
Previously confirmed test bodies are preserved; helper changes are opt-in only.
All 643 existing issue records preserved; nine new records, 652 in total.
Strict runner continues to fail if any selected result is skipped, absent, failed
or access-unverified. Production write guard and session recovery unchanged.

Local verification: real Playwright --list 22 exact originals in 10 files;
AST/anchor/fingerprint gates passed with zero previously confirmed ID overlap.
Protected page preflight scenario discovered. Offline Chromium reproduction
could not launch in this execution environment (socket permission denied);
the supplementary offline browser harness is provided for later verification,
but is not a new blocking stage. Live execution is required for PASS evidence.
