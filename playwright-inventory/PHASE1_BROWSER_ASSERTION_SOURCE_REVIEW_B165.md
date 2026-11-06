# Batch 165 — Platform Access Reviews and My Security: source-backed browser coverage

**Strict Phase 1 only.** 25 source-grounded Playwright declarations authored, none compiled, discovered, browser-executed or API-executed. Original frontend/backend ZIPs remain immutable.

## Access Reviews — 13 scenarios (PARV-081–093)

- Fallbacks for absent creator identity with otherwise allowed users-read, missing or corrupt timestamps, missing summary counters and absent due dates.
- Query construction: trimmed outgoing searches, unknown URL keys excluded from GET, other URL filters preserved across a status change, whitespace-only search not forwarded.
- Per-item evidence: missing tenant is platform-wide, only nonempty metadata entries rendered (including 0 and false), absent decision identity expressed as restricted and user-provided decision HTML treated as inert text.

**Source:** `src/pages/PlatformAccessReviewsPage.tsx` lines 43–50, 64–90, 137–140, 175–198; `src/routes/platform/accessReviews.js` lines 49–55, 79–105. The synthetic fixture does not validate actual source-specific permission enforcement, durable decisions, audit delivery, source object revocation or SQL isolation.

## My Security — 12 scenarios (PSEC-095–106)

- Independently granted unlock vs administrative MFA clear; application risk-age disclaimer; server-provided bounded staff list limits; failed self GET still leaves separately authorized staff evidence.
- Explicit empty-list fallbacks, missing session metadata, invalid staff timestamps and URL encoding of audit target IDs.
- Password success banner promises preservation of the current browser session; unlocked/no-risk row is not actioned as locked; enabled MFA prevents starting replacement setup in the frontend.

**Source:** `src/pages/PlatformSecurityPage.tsx` lines 94–109, 120–138, 144–154, 213–240, 261–265, 329–397; `src/routes/platform/security.js` lines 10–56, 88–143. Synthetic UI checks are not credential verification, TOTP replay protection, session revocation, backend RBAC or audit proof.

## Open work preserved

All previous 9,333 declarations, 357 scenario-labelled skipped tests, 21 unconditional + 3 permission-dependent in-test skips, 417 independent BLOCKED obligations, 272 partial features needing real acceptance and `PLCR-084` unresolved expectation stay open. Mock-backed new tests are only GENERATED_UNRUN, not passed.

See `PHASE1_BROWSER_ASSERTION_SOURCE_REVIEW_B165.csv` for per-ID UI assertion, FE line anchor, backend route and fixture.
