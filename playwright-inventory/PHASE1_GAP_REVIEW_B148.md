# Batch 148 — Security / Support Sessions / Enterprise Identity source-gap review

**Phase 1 only: static source review and browser test source authoring. No tests were compiled, run or discovered by Playwright.**

## Work done

- Added 24 unique, unskipped source-backed UI declarations: PSEC-081..088, PSSUP-081..088 and PEID-081..088.
- Converted PSSUP-075 from `test.skip` to a mocked UI assertion because the existing React code already shows the last successful snapshot and refresh-failure warning; it does **not** prove live database freshness or a tenant support session.
- Replaced placeholder comments with precise acceptance conditions for deferred PSEC-064, PSSUP-076, PEID-055, PEID-058; all four are **still skipped**.
- Audited 383 `test.skip` calls across all specs: 359 ID-labelled scenario declarations and 24 conditional skips. No skip has been silently dropped.
- Preserved all prior scenario IDs, external evidence blockers, unresolved PLCR-084 and source baseline.

## Frontend-source-specific boundaries

### Platform My Security — `src/pages/PlatformSecurityPage.tsx`
- Client-visible mutation errors are returned via React Query's `isError` UI and do not add a success/revocation message; PSEC-081/082/083 are synthetic API-error UI checks, not proof of TOTP verification or revocation.
- `adminUsers` and `adminSessions` are guarded with `Array.isArray`, risk flags are normalized per row; PSEC-084/085/086 cover graceful response subset handling.
- `refreshAll` reloads self-security and only reloads staff security when the independent security-read grant exists; PSEC-087/088 cover request shapes and negative grant behavior.
- **PSEC-064 remains blocked**: the original frontend does not implement an end-to-end validated schema for malformed `risk_policy`/summary fields in an HTTP 200 staff-security response. Add explicit guard and safe error before unskipping. SQL/auth/audit proof needs Phase 2.

### Platform Support Sessions — `src/pages/PlatformSupportSessionsPage.tsx`
- Creation re-evaluates policy requirements after tenant changes; whitespace-only reasons are blocked before mutation (PSSUP-081/082).
- Approval grant denial, token issuance rejection, termination rejection, tenant-directory failure and conditional refresh behavior are checked with *synthetic* responses (PSSUP-083..088).
- **PSSUP-075 now authored and not skipped**: `sessions.isError && Boolean(data)` shows stale-snapshot warning, retaining previous rendered session cards. This does not mean live support state is fresh.
- **PSSUP-076 remains blocked**: `data.sessions.map`, `data.omitted_sources.map` and pagination calculations assume backend response shapes. Malformed successful 200 payloads need a defensive frontend response guard and explicit invalid-data UI before an executable regression can assert safety.
- Real approvals, support token issuance/use, tenant session isolation, audit persistence and independent consent remain Phase 2/external evidence.

### Enterprise Identity — `src/pages/PlatformEnterpriseIdentityGovernancePage.tsx`
- React renders configuration/attention values as literal text; P[E]ID-081..085 exercise HTML-shaped strings, issuer/protocol link safety and inert source metadata. These are *not* a security penetration test or proof about external SSO.
- Policy metadata and runtime distinction remain independent; P[E]ID-086..088 cover zero audit policy, unknown provider with no active SAML runtime, and read-only refresh transport.
- **PEID-055 remains blocked**: original source treats any non-`oidc` provider as SAML when selecting `runtimeAvailable`. An unrecognized provider must not inherit SAML `Implemented` when SAML runtime is true. This is a frontend defect, not fixed by our test package.
- **PEID-058 remains blocked**: nested governance response shape is not exhaustively validated; malformed HTTP 200 successful payload can crash or mislead. Require a schema guard and error UI.
- Real OIDC/SAML callback trust, JIT, DNS domain proof, cryptographic token validation, provider outage and genuine two-tenant principal acceptance remain Phase 2.

## Outstanding high priority

- PSEC-064, PSSUP-076, PEID-055/058 and pre-existing PNOT-061, PLEN-059/060, PPER-062, PPRIV-072, PLCR-084 remain open.
- 359 ID-labelled skipped declarations and 24 conditional skips remain. 417 BLOCKED ledger entries remain; 350 feature inventory records are NOT_BROWSER_TESTABLE.
- The 137/137 figure refers to original router *inventory*, not executable or passing page coverage.

**Next:** Batch 149 — prioritize other skipped frontend schema/permission/pagination gaps; resolve only source-supported regression cases, not external obligations. No original application source changes permitted during Phase 1.
