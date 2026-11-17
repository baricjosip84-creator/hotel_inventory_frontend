INVENTORY PLAYWRIGHT — BATCH 236 R2 — 17 November 2026

Extract this changed-files ZIP directly into the frontend repository root.
Overwrite matching files and keep the .github and playwright-inventory paths.
Commit and push. GitHub Actions > Inventory - original 9900 Playwright suite
> Run workflow > group BULK_SAFE_17 > confirmation ORIGINALTESTS > Run workflow.
Run once; return the complete logs ZIP even if red.

Latest actual B236 evidence: logs_118998625653.zip (72/150 confirmed passed,
78 unresolved). There are now 2,507/2,938 tenant originals confirmed and
431 outstanding; 2,507/9,900 entire original suite confirmed. Do not repeat the
72 actual passes. 64 selected (43 access-circuit/rate-limit cases plus 21
source-reviewed correction cases); 14 held, with exact ID and evidence in
batch-236-r2-review.json and the 78-unresolved CSV. No held test counts as PASS.

Reviewed corrections: nested API error envelopes; exact serial-input and
main-content locators; expandable safeguards; true empty product options;
disabled fieldset; awaited request capture; exact component-row removal.
Five seconds of pacing before genuine protected-route access. No 429 retry
or bypass: existing stop circuit, session broker, read-only live guard,
single worker, permission checks and synthetic-write boundaries retained.

Offline verification: existing B235/B236 guarded runtime chain passed;
actual Playwright list selected precisely 64 original IDs in 5 specs;
12 transpiled representative fixture contracts and 4 target recovery
scenarios passed; strict report checker accepts complete PASS only, rejects
missing/skipped/access-blocked/historical-pass substitutions. The full
historical GitHub contract chain requires the real repository history.
No new live passes have been claimed for R2. A live green run will be
independently reconciled with exact report IDs. Cumulative issues tracker
contains 643 unique records; all 640 previous evidence records retained.
