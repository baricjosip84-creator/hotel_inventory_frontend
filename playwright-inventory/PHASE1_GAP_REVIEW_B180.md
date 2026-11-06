# Batch 180 — Alerts gaps and static source findings (NOT runtime acceptance)

- Added source-workflow precedence coverage for shipment/over-receipt, stock transfer, reservation, requisition, usage/damage/waste, purchase order, supplier, execution task and system-health alert types.
- Added stock/product fallback URI encoding, Action Center fallback and linked product/location unavailable-state labels.
- Added low-stock source-unavailable and resolved conditions, info/warning/critical blocker-label distinctions, ownership and escalation metadata, absent resolution timestamp/note, and current-state automatic closure cue.
- These are **synthetic GET /alerts records** with a disposable tenant login. The source behavior is frontend-only. Original backend might not emit the invented alert type variants; those samples are branch probes, not assertions of actual persisted domain records.
- **Routing depends on destination-specific permissions.** Existing test-account grants are prerequisites and were not dynamically verified in Phase 1. A future runtime may expose missing permissions; do not silently skip or weaken checks.
- **Source inconsistency to review in Phase 2:** `nextActionLink` uses uppercase type matching and `hasPermission`, but a synthetic type containing an overlapping family term can route to a higher-priority branch. Backend alert taxonomy and expected source ownership still require product acceptance; do not claim authoritative destination correctness from href alone.
- **Outstanding carried forward:** 417 BLOCKED obligations, 272 SOURCE_TRACED_PARTIAL items, PLCR-084 unresolved, 357 explicitly labelled skips and 21 unconditional + 3 permission-dependent supplemental in-test skips; no previous statuses advanced to verified.
- **Unperformed:** TypeScript/Playwright compilation, test discovery, browser runs, real endpoint calls, backend and SQL acceptance, permission/tenant-isolation validation, CI, deployment, dependency install, product acceptance.
