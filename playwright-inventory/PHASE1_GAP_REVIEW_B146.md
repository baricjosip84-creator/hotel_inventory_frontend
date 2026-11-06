# Batch 146 — Phase 1 route, skip and blocker reconciliation

**Not a test-execution report.** Static source and ledger review only. Parent Batch 145 is unchanged except specifically listed tracking/spec files.

## Coverage boundary

- Original 137/137 router entries inventoried; this is **not** proof of full browser coverage.
- 9,131 authored scenario IDs remain tagged `GENERATED_UNRUN`; of these, **360 are actually ID-labelled `test.skip` declarations**, not runnable checks.
- Remaining **8,771 non-skipped authored declarations** are merely candidates for later compilation/execution; none has been compiled or run.
- 417 separate `BLOCKED` ledger obligations; 1 unresolved `NEEDS_EXPECTATION` (`PLCR-084`); zero `NOT_STARTED` in this discovery ledger after closure of the final 25 reserved cycle-reset rows.
- 350 feature-inventory records marked `NOT_BROWSER_TESTABLE` remain distinct from blocked scenarios.
- Total `test.skip` calls: 384; 360 carry ledger scenario IDs and 24 do not have a leading scenario ID. The latter are **not** counted as scenario coverage.
- No original frontend/backend files changed. No production, backend, browser, TypeScript compiler or Playwright runner invoked.

## Existing skipped tests — file-level register

Classification buckets below are **preliminary title/ledger triage**, not independent frontend or backend proof. The separate CSV preserves each exact title, file, line, and open blocker.

| Original spec | Skipped calls |
|---|---:|
| `tests/platform/commercial-launch-readiness/commercial-launch-readiness.spec.ts` | 35 |
| `tests/platform/support-sessions/support-sessions.spec.ts` | 29 |
| `tests/platform/security/security.spec.ts` | 27 |
| `tests/platform/customer-onboarding-checklist/customer-onboarding-checklist.spec.ts` | 25 |
| `tests/platform/commercial-readiness-verification-program/commercial-readiness-verification-program.spec.ts` | 24 |
| `tests/platform/enterprise-identity/enterprise-identity.spec.ts` | 21 |
| `tests/platform/audit-retention/audit-retention.spec.ts` | 17 |
| `tests/platform/audit/audit.spec.ts` | 14 |
| `tests/platform/license-plan-enforcement/license-plan-enforcement.spec.ts` | 14 |
| `tests/platform/subscription-readiness/subscription-readiness.spec.ts` | 14 |
| `tests/platform/notifications/notifications.spec.ts` | 13 |
| `tests/platform/permissions/permissions.spec.ts` | 13 |
| `tests/platform/sessions/sessions.spec.ts` | 13 |
| `tests/platform/system-health/system-health.spec.ts` | 13 |
| `tests/platform/announcements/announcements.spec.ts` | 11 |
| `tests/platform/customer-success-admin/customer-success-admin.spec.ts` | 11 |
| `tests/platform/incidents/incidents.spec.ts` | 11 |
| `tests/platform/maintenance/maintenance.spec.ts` | 11 |
| `tests/platform/tenant-offboarding/tenant-offboarding.spec.ts` | 11 |
| `tests/platform/users/users.spec.ts` | 11 |
| `tests/platform/compliance-export/compliance-export.spec.ts` | 9 |
| `tests/platform/privacy-requests/privacy-requests.spec.ts` | 9 |
| `tests/platform/data-retention/data-retention.spec.ts` | 7 |
| `tests/platform/compliance-documents/compliance-documents.spec.ts` | 6 |
| `tests/platform/billing/billing.spec.ts` | 5 |
| `tests/platform/permission-audit/permission-audit.spec.ts` | 4 |
| `tests/tenant/execution-requests/execution-requests.spec.ts` | 3 |
| `tests/tenant/scanner/scanner-batch32.spec.ts` | 2 |
| `tests/platform/tenant-provisioning-hardening/tenant-provisioning-hardening.spec.ts` | 1 |

## Preliminary review queues

- `SOURCE_REVIEW_REQUIRED`: 190 skipped declarations. No automatic rescheduling or passing claim.
- `BACKEND_OR_EXTERNAL_PROOF`: 160 skipped declarations. No automatic rescheduling or passing claim.
- `FRONTEND_OR_CONTRACT_REVIEW`: 34 skipped declarations. No automatic rescheduling or passing claim.

## Priority open discrepancies (do not silently close)

- `PLCR-084` — Evidence source `<select>` lacks the requested loading-state `disabled` behavior in original Legal Compliance Reporting frontend. `NEEDS_EXPECTATION` retained; no false fix.
- `PPER-062` — malformed role policy handling still requires frontend verification/hardening; existing declaration unchanged.
- `PPRIV-072` — due-date validation requires source and actual authorization review; existing skip state unchanged.
- `PNOT-061` — notification mutation failures do not render promised error feedback; test remains an unmet contract.
- `PLEN-059/060` — noncanonical or out-of-range pagination offsets require source hardening.
- Review backend isolation, SQL/permission guards, payments/provider settlement, retention, backups and deployment with authorized isolated Phase 2 evidence, not intercept-only browser snapshots.

## Recommended next Phase 1 batch

1. Focus on skipped high-impact UI controls in **Notifications, License & Plan Enforcement, Permissions, Privacy**. For each, inspect actual frontend source and if the behavior is missing, retain as a defect rather than unskipping.
2. Audit route entry, permission gating, malformed-response and pagination cross-cutting behaviors; no fabricated happy-path tests.
3. Keep all 417 external and blocked obligations visible, and separately track 360 skipped scenario declarations; do not call the suite complete solely because every router entry is inventoried.

## Footnote: no automatic route completeness extrapolation

This audit is based on the cumulative ledger and actual test source; the original app router inventory is unchanged. The ledger can have missing coverage even when all its discovered rows are classified.

