# Batch 150 — browser-source gap review and unresolved proof boundaries

Strict Phase 1: **code-writing + static ZIP/CSV/source inspection only**. Browser/Playwright execution, npm, TypeScript compilation, backend/API/SQL access, production and deployments prohibited.

## Authored source-backed regressions (21 new, no prior IDs removed)

| Spec | IDs | New | Intent |
|---|---|---:|---|
| Legal Compliance Reporting | PLCR-101–106 | 6 | Simultaneous invalid filters fail closed, resetting one filter cannot bypass other invalid filters, HTML-shaped evidence remains inert, source-filtered detail does not rewrite registry-wide summary |
| Compliance Export | PCEXP-081–086 | 6 | Invalid and non-finite offset guard, harmless URL context preservation without backend forwarding, inert document/owner text, HTTP 429 error is not a healthy summary |
| Permission Audit | PPAUD-088–092 | 5 | Forged pager URL keys ignored by local state, independent user/key pagination with opposite empty source, oversized filter guard, rate-limit refresh stale warning |
| Platform Audit | PAUD-088–091 | 4 | Whitelisted query excludes opaque navigation keys, Clear filters strips legacy aliases, nested metadata and user-agent HTML-shaped strings render as inert text |

All assertions are **authored but unrun**, and only exercise synthetic GET responses, JSX, URL state and visibility. They do not prove real authorization enforcement, PostgreSQL isolation, or audit immutability.

## Decision and known defects — NOT closed

**PLCR-084** stays `NEEDS_EXPECTATION`: original `<select>` remains enabled during in-flight reads; only the Apply action is disabled. See `PLCR_084_EXPECTATION_DECISION_B150.md` for two possible intended UX contracts. No unskip and no application changes.

**Malformed successful-response handling** remains open in PPAUD-049, PAUD-068, PCEXP-072, PSEC-064, PSSUP-076 and related cases; synthetic happy-path checks do not supply schema validation. Notifications PNOT-061; license PLEN-059/060; permissions PPER-062; privacy PPRIV-072; enterprise identity PEID-055/058 remain deferred or source-defective. Audit/source permissions and multi-tenant/database/export-signoff checks need Phase 2 acceptance.

## Inventory and skipped-case integrity

- Original route inventory 137/137; 152 page-organized `.spec.ts` files preserved.
- Ledger: 9,221 `GENERATED_UNRUN` (of which 359 `test.skip`), 417 `BLOCKED`, 1 `NEEDS_EXPECTATION` (PLCR-084), 0 `NOT_STARTED`. 9,639 total.
- Additional 24 conditional `test.skip` calls; 383 total skip calls across the source. 350 `NOT_BROWSER_TESTABLE` feature obligations.
- Source-bound test declarations are not evidence of build success, browser success, real environment behavior, or regulatory compliance.

**Next:** audit remaining skipped browser cases for genuine source support, then establish a Phase 1 sign-off / Phase 2 readiness matrix. Avoid adding repetitive scenario counts as a substitute for executable coverage.
