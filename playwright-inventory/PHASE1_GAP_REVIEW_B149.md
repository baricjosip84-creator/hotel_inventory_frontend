# Batch 149 — Platform Permission Audit / Platform Audit / Platform Users gap review

**Phase boundary:** source inspection, Playwright test authoring and static reconciliation only. No test discovery, compilation, execution, browser, app/backend/API/SQL/CI, provider or production access. Original frontend and backend archives remain unchanged.

## Exact source-backed work

| Suite | IDs | Newly authored | Browser-visible contract |
| --- | --- | ---: | --- |
| Platform Permission Audit | `PPAUD-081..087` | 7 | Independent user/API-key offsets; search-clear URL preservation; inert user/key/risk-flag HTML-shaped strings; refresh while paged; filtered evidence counts |
| Platform Audit | `PAUD-081..087` | 7 | Inert metadata/actor identity; legacy category clear preserving exact filters; unrelated URL context; negative/nonnumeric offset canonicalization; empty pagination gates |
| Platform Users | `PUSR-081..087` | 7 | Deep-link ID clear retaining role/status; inert identity text; non-forwarded unrelated URL context; invalid-role fail-closed; scope/query coexistence; independent supporting-link grants |

Total new declarations **21** (`test`, not `test.skip`). Fixtures are synthetic, route/API responses intercepted. Assertions are **UNRUN**, not results; actual framework compilation/browser behavior remains unverified.

## Grounding and exact reviewed original React handlers

- `frontend/src/pages/PlatformPermissionAuditPage.tsx`: `searchParams` and `search` 200-character guard; two local offsets, query params `user_offset` / `api_key_offset`, React `useEffect` reset on search, independent pager controls, React text rendering of user names, API-key names and recorded flag strings; permission-scoped source tables. The source still accesses `data.evidence_access.*`, `data.pagination.platform_users.*`, and `data.pagination.api_keys.*` without comprehensive validation on a malformed successful HTTP response.
- `frontend/src/pages/PlatformAuditPage.tsx`: `updateParams` preserves unrelated URL keys, strips legacy `entity_type` / `entity_id`, and clamps negative/non-numeric `offset` to zero in outbound query; `Clear category` removes only category; React metadata rendering `JSON.stringify` is inert text; empty evidence list disables pagination controls. Malformed successful `summary` or `pagination` objects remain unvalidated.
- `frontend/src/pages/PlatformUsersPage.tsx`: scoped `platform_user_id` and role/status are independent URL keys; `updateFilters` preserves unrelated navigation context while the API request builder sends only approved bounded fields; `invalidFilters` prevents GET; identity fields render as text; platform sessions, Security and Audit links independently require their read grants. Real backend permission enforcement, user deactivation, MFA and session revocation are not proved by this mock.
- Backend service/routes were inspected as **read-only contracts**, not invoked or certified; no real principal, tenant, database, export or external acceptance outcomes were checked.

## Important unresolved cases, unchanged

- `PPAUD-049` — malformed HTTP-200 permission audit evidence can crash/misstate coverage; needs frontend response schema/error state.
- `PAUD-068` — malformed HTTP-200 audit summary can crash/mislead; needs frontend defensive contract.
- `PUSR-070..080` — real authorization, concurrency, credential hashing, database/session revocation and independent HR evidence are Phase 2; keep skipped.
- `PLCR-084` **NEEDS_EXPECTATION**; `PSEC-064`, `PSSUP-076`, `PEID-055/058`, `PNOT-061`, `PLEN-059/060`, `PPER-062`, `PPRIV-072` remain unclosed defects/acceptance constraints.
- Source reveals a separate potential audit view concern: Page Audit clamps negative or nonnumeric URL offsets in outbound requests but leaves the original URL parameter untouched until a filter change. Do not claim URL canonicalization; new cases assert the **request**, not an altered address bar.
- PPAUD data's success posture and `Evidence coverage` cannot prove a tenant permission audit, an external security system, or durable changes. Do not unskip backend-only cases on the basis of a fake JWT.

## Deferred-scenario accounting

- `359` scenario-labelled `test.skip` declarations are still present and **not executable**.
- `24` additional conditional `test.skip` calls remain.
- `417` ledger obligations are explicitly BLOCKED; `1` (`PLCR-084`) remains NEEDS_EXPECTATION; `0` NOT_STARTED in the current ledger.
- The **137/137 original router inventory** is complete, but the suite is **not** complete, compiled, run, or accepted. 350 feature-inventory obligations remain `NOT_BROWSER_TESTABLE`.
- Full line-accurate 383-call list: `PHASE1_DEFERRED_SCENARIO_AUDIT_B149.csv`.

**Next Batch 150:** advance the skipped/blocked source review across permission/audit/export and original tenant edge cases, and prioritize an explicit source/expectation decision for PLCR-084. Never declare Phase 1 finished merely because all route IDs have been inventoried.
