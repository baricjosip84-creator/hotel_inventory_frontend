# Batch 160 — source-grounded coverage and acceptance gaps

Static source review only. These findings distinguish current source/UI contracts from browser/API/persistence claims. No test execution or original app-code modifications were performed.

## B160-SOURCE-EVIDENCE-01 — Cross-Domain governed synthetic ID contracts

Tests TCDO-041 through TCDO-043 use pw-owner-1, pw-choice-new, and pw-tradeoff-16 synthetic identifiers while POST run action/tradeoff schema requires UUIDv4/v5. These mocked request-shape assertions do NOT prove API acceptance. The UI passes server IDs through; no live defect is claimed.

**Verified static source references:** `tests/tenant/cross-domain-optimization/cross-domain-optimization.spec.ts:304-328; frontend/src/pages/CrossDomainOptimizationPage.tsx:1257-1272; backend/src/validations/decisionIntelligence.validation.js:980-999`

**Open acceptance:** Phase 2 integration: supply real UUIDv4/v5 fixture IDs and verify backend transition, authorization and persisted run/tradeoff state.

## B160-SOURCE-EVIDENCE-02 — Collaboration source link has narrower permission gating than shortcut

The Intelligence Review shortcut is hidden without DECISION_INTELLIGENCE_READ (TCOL-047). However exactSourcePath and per-thread card links do not call hasPermission for the /intelligence-review source path. Router/API guards may still block access. This is a UI/permission-consistency question, NOT proof of unauthorized data access.

**Verified static source references:** `frontend/src/pages/EnterpriseCollaborationPage.tsx:316-346,419-422,633-635,648-652,735-738; tests/tenant/collaboration/collaboration.spec.ts:249-253`

**Open acceptance:** Confirm whether source-specific links must be hidden without permission. Add a targeted restricted-role UI scenario if required; maintain authoritative router/API enforcement.

## B160-SOURCE-EVIDENCE-03 — Digital Twin focus fixture IDs do not match real backend validator

TDT-015/016/037/038 use pw-node-1 synthetic keys returned by mocked snapshot GET. Backend focus_node_key requires /^dt_[a-f0-9]{24}$/; fixture test proves frontend focus query construction only. Code accepts any nonempty server-supplied key; malformed server payload would yield request validation failure.

**Verified static source references:** `tests/tenant/digital-twin/digital-twin.spec.ts:99-110,232-246; frontend/src/pages/DigitalTwinVisualizationPage.tsx:239-243,554-571,734-737,819-824; backend/src/validations/operationalActionCenter.validation.js:228-239`

**Open acceptance:** Phase 2: use actual dt_ keys returned by backend graph, validate focused GET and missing/stale nodes, and check unexpected key error UX.

## B160-SOURCE-EVIDENCE-04 — Browser-layer evidence cannot establish Cross-Domain governance persistence

CDO tests TCDO-038 through TCDO-046 intercept POST/PUT routes; their request payload and UI transitions cannot establish database transactionality, review isolation, or authorization under concurrent writes.

**Verified static source references:** `tests/tenant/cross-domain-optimization/cross-domain-optimization.spec.ts:282-353; backend/src/routes/decisionIntelligence.js:112-137`

**Open acceptance:** Phase 2: source-backed tenant-scoped integration/role verification plus exact readback following governed writes.

## Carried-forward obligations

- `PLCR-084`: one unresolved expectation (not silently rewritten).
- 417 `BLOCKED` ledger obligations remain open and unchanged.
- 357 labelled scenario skips remain intentionally skipped; all were individually source-reviewed in Batch 158; 24 additional conditional skip calls remain.
- Batch 159 forecast focus ID regex / UUID validator mismatch remains unresolved; no code changes allowed in Phase 1.
- None of the 9,259 authored tests have been compiled, executed, or browser-verified. Source-traced partial feature status is NOT complete coverage.
