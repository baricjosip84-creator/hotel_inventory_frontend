# Batch 159 — source-grounded gaps and open obligations

- **B159-ACTUAL-SOURCE-GAP-01**: Forecast focus ID React parser (`frontend/src/pages/ProbabilisticForecastingPage.tsx:182–184`) accepts 36-char hex/hyphen strings not necessarily UUIDv4/v5. Backend validator (`backend/src/validations/decisionIntelligence.validation.js:893–896`) requires UUIDv4/v5. TPF-022 tests only a clearly short invalid string (`tests/tenant/probabilistic-forecasting/probabilistic-forecasting.spec.ts:182–190`), so malformed 36-char IDs are untested. No application change is permitted in Phase 1; retain as source hardening / new observable acceptance gap.
- Adaptive policy mocked application POST tests use synthetic short, non-UUID policy/recommendation IDs in Playwright (`tests/tenant/adaptive-policy-engine/adaptive-policy-engine.spec.ts:8,157`), whereas backend route Joi requires UUIDv4/v5 (`decisionIntelligence.validation.js:849–855`); mocked UI checks cannot be called backend integration proof. Do not weaken mock assertions or claim the backend rejects a real application on this basis.
- Product cost summaries and exports remain UI contract checks and not finance reconciliations or persisted calculation proof.
- Existing PNOT-061, PLEN-059/060, PPER-062, PPRIV-072, PLCR-084, 417 BLOCKED obligations, 357 intentionally skipped cases and 24 conditional skips remain unresolved.
- 83 partial features direct source-traced in B159; all remain partial. 150 deeper reviews remain (Cross-Domain Optimization, Enterprise Collaboration, Digital Twin).

No tests compiled/executed, no application code/CI/SQL/production modified.
