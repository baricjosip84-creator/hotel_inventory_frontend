# Batch 162 — Browser assertion source review (NOT RUN)

Source archive checks: FE `864b8dc06350473be433d19dd72a35175eef0b4ffdf9f87443e8887e68f5f112`; BE `e6bf02aa1b1eb9cb834a5010c4a38ef08f4f17d0afd57b75d40d24395d8c2ac4`. Parent Batch 161 `9985eaf54f201dc10b8cef2a5d68d0fc7dba85059651760e6b0564383ee8681f`.

## New assertions: 22

- **Platform Notifications (PNOT-087–102, 16):** independent scan-button permission guards, manual form validation/payload/reset, identity-redaction and prefilled routing context, note-only target inhibition, bulk mutation 409 error retention, cleanup acknowledgement, source/status filter intersection, operational source navigation, filter clearing and whitespace-only query omission.
- **Platform License & Plan Enforcement (PLEN-087–092, 6):** audit-link permission gating, explicit supporting route targets, whitespace-only GET query omission, archive/plan/filter offset preservation, source-labelled state badges, search length and filter-clear state.
- **Corrections (PNOT-081/082/083):** earlier tests incorrectly asserted no scan button. Original `PlatformNotificationsPage.tsx` lines 393–396 keep these buttons in the JSX with `disabled={!canRunOperationalScan}` and `disabled={!canRunIntegrationScan}`. Existing tests now assert `toBeDisabled()`. Existing ledger and feature records updated without renaming IDs or claiming successful execution.

The matching backend route source is `backend/src/routes/platform/notifications.js` (manual Joi validation lines 78–96, source-specific permissions lines 100–123, bulk action lines 126–145) and `backend/src/routes/platform/licensePlanEnforcement.js` (filtered read query contract lines 36–71). The new tests do **not** call these routes in reality; they use intercepted mock responses. See companion evidence CSV for each exact scenario and test assertion.

## Unresolved obligations deliberately preserved

- `PNOT-061`: individual status failure is not rendered as an inline error; no fake success claim or unskip.
- `PNOT-070`: malformed pagination payload hardening; frontend still dereferences server fields.
- `PLEN-059/060`: fractional / out-of-range URL offset normalization and inverted pagination await product source changes.
- `PLCR-084`: evidence-source change during active fetch remains a product UX expectation decision.
- 417 ledger `BLOCKED` obligations, 357 scenario-labelled skips, 21 unconditional in-test skips, 3 role-dependent guard skips, 272 source-traced partial feature statuses remain open.

## Additional source observation (not a declared passing test)

`PlatformNotificationsPage.tsx` stores bulk `selectedIds` across filter changes; `bulkMutation` submits `selectedIds` while `selectedIntegrationNotifications` is derived only from currently visible rows. This warrants source/product review of hidden selection and target scope before later real-backend acceptance. It is not certified as an actual exploit and no application code was modified.

**Static validity limit:** imports/selectors and source contracts were inspected textually. No TypeScript compilation, Playwright discovery, actual browser, live source, SQL or network execution occurred. All authored scenarios are `GENERATED_UNRUN`.
