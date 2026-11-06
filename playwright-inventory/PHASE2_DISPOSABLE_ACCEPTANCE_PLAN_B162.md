# Phase 2 proposed acceptance preparation — PLAN ONLY; DO NOT EXECUTE

1. Prepare *separate*, disposable isolated application database and platform operator identities before authorizing any test execution. Confirm intended nonproduction baseURL and credentials; never commit tokens or tenant secrets.
2. Run Playwright discovery/TypeScript validation only after explicit Phase 2 permission. Start with Platform Notifications and License & Plan Enforcement suites; address any compile/runtime failures and update the unchanged scenario IDs.
3. For Notifications, use a grant matrix of independent operator principals (full read/write; read-only; no audit; no support; no dependencies; no webhook; no API keys; no platform users; no vendors). Verify UI controls as well as actual `403` backend behavior with separate authenticated requests and isolated SQL fixtures.
4. For licensing, test valid and malformed tenant UUID, paging integer boundaries, unknown plans, billing-state differences and archived results against real backend+DB, not the mock list; retain `PLEN-059/060` blocked until frontend remediation.
5. Independently validate transactional bulk operations, audit durability, tenant isolation, production delivery evidence and commercial/financial contracts. Mocked tests in Phase 1 cannot satisfy them.
6. Resolve PLCR-084 UI contract explicitly with product owner before editing or unskipping its assertion. Track all remaining blockers and skipped obligations in ledger until separate proof is obtained.

No action in this plan was executed in Batch 162.
