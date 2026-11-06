# Batch 163 — Source-supported UI assertions, NOT RUN

Authoritative parent: `INVENTORY_PLAYWRIGHT_BATCH_162_FULL.zip` SHA-256 `4af8c64153ebb7b2b1ec68e2b8ad1652666cf803add58e2150dd1b8c9d042d8d`. Original FE/BE SHA-256: `864b8dc06350473be433d19dd72a35175eef0b4ffdf9f87443e8887e68f5f112` / `e6bf02aa1b1eb9cb834a5010c4a38ef08f4f17d0afd57b75d40d24395d8c2ac4`.

## Authored declarations

- Platform Incidents: **19** (`PINC-081`–`PINC-099`), covering read-only detail, independent audit/tenant/support grants, form max-length constraints, whitespace filtering, protected tenant selector, intentional severity/impact mutations, failure preservation, actor redaction and explicit timeline visibility.
- Platform Permissions: **8** (`PPER-087`–`PPER-094`), covering independent navigation grants, dirty refresh dismissal/acceptance, cancel-save, failed policy writes, and fail-closed initial loading.

No backend calls, SQL, Playwright CLI, TypeScript build, browser, or actual application execution was performed. Individual source line anchors are in the companion CSV. These are **authored test declarations**, not passed tests.

## Separate acceptance still required

- All 417 blocked obligations remain OPEN; they were not rewritten or marked complete.
- 357 scenario-labelled skips remain OPEN, as do 21 unconditional and 3 permission-dependent in-test skips.
- All 272 source-traced partial features remain pending runtime acceptance.
- `PLCR-084` is still a product UX decision, not a source-proven assertion.
- Synthetic fixtures may validate UI branching/request construction only; real server role checks, transactions and tenant isolation are separate gates.

## Static coverage integrity

Twenty-seven unique new permanent IDs added (19 PINC, 8 PPER). Existing declarations, blocked obligations, skips and fixture files were not edited. New specs were appended to the existing page-specific files, preserving the test folder structure.
