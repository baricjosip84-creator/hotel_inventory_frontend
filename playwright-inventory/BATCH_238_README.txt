INVENTORY MANAGEMENT — Batch 238, 17 November 2026

Extract this changed-files-only ZIP into the frontend repository root.
Keep .github/ and playwright-inventory/ paths; replace, commit, push.
GitHub Actions: Inventory - original 9900 Playwright suite
Run workflow: group BULK_SAFE_17, confirmation ORIGINALTESTS.

Batch 237 R4: 18/18 strict workflow PASS reported by user (raw log not supplied).
Confirmed tenant: 2,652/2,938 (90.27%); overall: 2,652/9,900 (26.79%).
286 tenant originals remain. Batch 238 selects 20, so full green would bring
tenant coverage to 2,672/2,938 (90.95%) and leave 266 tenant originals.
No confirmed PASS IDs are selected again. All 20 need actual live execution.

Selected: execution tasks (8), inventory capabilities (6), login (3),
account sessions (3). Source-defined native confirmation labels, exact action
targets, fixture-only request evidence, pending state, and isolated synthetic
revocation/unauthenticated login state. Browser access is checked before any
fixture and all real non-auth writes remain blocked. No application changes.
The original assertions, IDs, and unselected original test bodies are retained.

214 B236_ROLE_GATE originals are deliberately excluded: 159 explicitly name
role fixtures (87 distinct credential prefixes) and 55 have indirect roles or
permission fixtures requiring further review. See the two role CSVs for exact
IDs and environment variable names, NOT secret values. Do not impersonate roles,
invent credentials, relax the current public-host restriction in roleSession,
or count these as PASS. A sanctioned isolated tenant and correct role identities
are prerequisites to testing these original role contracts. The project currently
requires the existing Vercel/Render deployment; that makes a separately approved
safe role-execution design and genuine role accounts necessary before changing
the gate. The other 52 outstanding cases still need source/fixture/app review
after a full Batch 238 green. Keep the 658-record cumulative issues tracker.

Offline validation: SHA-256 exact runtime source, TypeScript AST, exact anchors,
no skipped/only/role calls in selection, prior PASS exclusion and unchanged
unselected bodies. Playwright discovery: 20 tests in 5 specs. The four-page
live access preflight and strict exact-ID result check remain enabled. A green
run requires 20 actual PASS, not merely a completed job or skipped test.
