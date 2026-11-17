Batch 236 R3 locator fix — 17 November 2026

logs_119251022498.zip: the offline Chromium DOM check stopped at TICAP-132
before the original live run. No new PASS results. 2,563 / 9,900 remain
confirmed; 2,563 / 2,938 tenant originals. All six R3 IDs still pending.

Fix: in the real test and DOM harness, select the second of precisely two
exactly named Remove buttons. Preserve both the original Component 2 absence
assertion and zero-write assertion, and verify Component 1 remains visible.
The source order is Component 1 followed by Component 2. The DOM harness
still executes in GitHub before live testing. Local syntax, runtime overlay,
12 fixture contracts, four target recovery paths and exact discovery of six
IDs in three files passed; local Chromium execution remains unavailable.

Apply at repository root over the installed R3 ZIP, commit and push.
Actions > Inventory - original 9900 Playwright suite > Run workflow
group BULK_SAFE_17; confirmation ORIGINALTESTS. Send complete logs.
