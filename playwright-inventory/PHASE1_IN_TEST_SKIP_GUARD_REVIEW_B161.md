# Batch 161 — 24 in-test skip calls: corrected static audit

Previously described as "24 conditional skips". Source shows **21 unconditional in-test `test.skip(true, ...)` calls** and **3 role/selector-dependent conditional calls**. The 21 are reached on test execution and are not conditional on a runtime UI state. They remain distinct from 357 `test.skip` scenario-labelled declarations.

| Scenario ID | Kind | Spec line |
|---|---|---|
| PCDOC-045 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-documents/compliance-documents.spec.ts:226` |
| PCDOC-076 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-documents/compliance-documents.spec.ts:375` |
| PCDOC-077 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-documents/compliance-documents.spec.ts:378` |
| PCDOC-078 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-documents/compliance-documents.spec.ts:381` |
| PCDOC-079 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-documents/compliance-documents.spec.ts:384` |
| PCDOC-080 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-documents/compliance-documents.spec.ts:387` |
| PCEXP-072 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-export/compliance-export.spec.ts:335` |
| PCEXP-073 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-export/compliance-export.spec.ts:338` |
| PCEXP-074 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-export/compliance-export.spec.ts:341` |
| PCEXP-075 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-export/compliance-export.spec.ts:344` |
| PCEXP-076 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-export/compliance-export.spec.ts:347` |
| PCEXP-077 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-export/compliance-export.spec.ts:350` |
| PCEXP-078 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-export/compliance-export.spec.ts:353` |
| PCEXP-079 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-export/compliance-export.spec.ts:356` |
| PCEXP-080 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/compliance-export/compliance-export.spec.ts:359` |
| PPAUD-049 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/permission-audit/permission-audit.spec.ts:250` |
| PPAUD-077 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/permission-audit/permission-audit.spec.ts:367` |
| PPAUD-079 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/permission-audit/permission-audit.spec.ts:376` |
| PPAUD-080 | UNCONDITIONAL_IN_TEST_SKIP | `tests/platform/permission-audit/permission-audit.spec.ts:380` |
| TEXR-027 | ROLE_DEPENDENT_CONDITIONAL_SKIP | `tests/tenant/execution-requests/execution-requests.spec.ts:269` |
| TEXR-028 | ROLE_DEPENDENT_CONDITIONAL_SKIP | `tests/tenant/execution-requests/execution-requests.spec.ts:278` |
| TEXR-029 | ROLE_DEPENDENT_CONDITIONAL_SKIP | `tests/tenant/execution-requests/execution-requests.spec.ts:290` |
| TSN-045 | UNCONDITIONAL_IN_TEST_SKIP | `tests/tenant/scanner/scanner-batch32.spec.ts:198` |
| TSN-046 | UNCONDITIONAL_IN_TEST_SKIP | `tests/tenant/scanner/scanner-batch32.spec.ts:201` |

Do not claim those 24 are a 24-test deduplicated count without executing discovery (forbidden in Phase 1). Source position and owning scenario IDs are independently retained. No skip was removed.

Source: `PHASE1_IN_TEST_SKIP_GUARD_RECONCILIATION_B161.csv`; revised cumulative audit `PHASE1_DEFERRED_SCENARIO_AUDIT_B161.csv`.
