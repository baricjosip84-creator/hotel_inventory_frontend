# Batch 176 — Outstanding source and acceptance gaps

1. **New frontend mismatch (not claimed runtime-tested):** `StockPage.tsx:696` uses `.trim()` while building category selector options, but `StockPage.tsx:718` compares `row.product_category !== categoryFilter` without trimming. A response category such as `" Dairy "` will be offered as `Dairy` yet cannot match this filter. No test incorrectly expects the affected filter to work; needs frontend fix and Phase 2 acceptance.
2. **Original synthetic ID limitation:** Existing Stock fixture IDs start `pw-`, not backend valid UUIDs. Intercepted UI GETs cannot establish backend contract fidelity.
3. **Still open:** 417 BLOCKED obligations, 272 partially source-traced acceptance features, 357 scenario-labelled skips, 21 unconditional + 3 permission-dependent supplemental skip guards, PLCR-084 expectation decision.
4. **Phase 1 restriction:** No compilation, test discovery or execution, browser, frontend/backend process, SQL, production, CI, install or deployment; no modifications to the original FE/BE source.
