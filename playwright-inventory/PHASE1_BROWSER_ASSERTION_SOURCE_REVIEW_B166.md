# Batch 166 — Platform Users source-backed browser assertions

**STRICT PHASE 1 — no compilation, browser execution, application startup, API calls or deployment.**

Twenty-four new `PUSR-096` through `PUSR-119` declarations were added to the existing Platform Users page-specific specification. Their UI and request expectations were checked against immutable `src/pages/PlatformUsersPage.tsx` and `src/routes/platform/users.js` and the synthetic `support/platformUsersFixture.ts`. See the corresponding CSV for **every scenario's individual source anchor**.

- **PUSR-096–102:** Invalid or absent data and dates, disabled-vs-locked priority, readable roles, legacy response shape, missing statistics and API-provided role options.
- **PUSR-103–107:** Independently permission-gated supporting links and row links; user-scoped URL escaping. These are presentation-only checks, not backend access control assertions.
- **PUSR-108–109:** Local URL preservation and outgoing request allowlisting/trimming, with unknown keys excluded from the backend query.
- **PUSR-110–115:** Masked create/reset credentials, exact minimum length, failed-create retry state, dismissible success message, reset-target switching and independent reset permission.
- **PUSR-116–119:** Independent link grants, inert error text, global pending mutation button disabling and initial loading without fabricated rows.

The source supports the expected *rendering or intercepted request* only. No fixture tests have been run. Nothing proves real API rejection, credential storage, identity governance, audit durability, transactions, tenant authorization or revocation. Open gaps are documented in `PHASE1_GAP_REVIEW_B166.md` and must not be silently converted to passing results.
