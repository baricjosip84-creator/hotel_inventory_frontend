# Batch 159 — Direct source-behavior review: Products, Adaptive Policy Engine, Probabilistic Forecasting

Phase 1 static-only review. **83 previously partial feature records checked** against original frontend, backend route/validation and matching authored Playwright test declarations. No test was compiled, discovered by Playwright or executed. Only source/ledger/documentation records changed.

| Area | Individually traced feature records | Authored declarations mapped |
|---|---:|---:|
| Products — cost workspaces | 3 | 19 |
| Adaptive Policy Engine | 30 | 30 |
| Probabilistic Forecasting | 50 | 50 |
| **Total** | **83** | **99** |

## Evidence and important constraints

- Product cost panels split valuation, actions/risk, and governance/audit; backend `products.js` routes require relevant read grants. Export/print and stock-value correctness are not proven by mocked browser tests.
- Adaptive Policy `recordApplication` parses JSON and requires object values; backend Joi additionally requires **UUIDv4/v5** recommendation and policy identifiers and nonempty JSON objects. Browser tests use synthetic non-UUID IDs and intercepted API responses; they do **not** exercise backend validation or prove end-to-end posting.
- Adaptive Policy lifecycle transitions are state-gated in the UI and require ten-character reasons; backend governs action enum and role. Race/DB state correctness requires later acceptance.
- Probabilistic Forecasting uses separate tenant-wide and focused-source GETs, independent pagination offsets and disabled tenant diagnostics; backend validates filters, pagination and UUIDv4/v5 model IDs.
- **B159-ACTUAL-SOURCE-GAP-01:** `ProbabilisticForecastingPage.tsx:182-184` treats any 36-character sequence of `[0-9a-f-]` as a focused-model ID (for example, 36 dashes). Backend `decisionIntelligence.validation.js:893-896` requires valid UUIDv4/v5. Existing `TPF-022` only covers `not-a-uuid` at `probabilistic-forecasting.spec.ts:182-190`. This is a frontend/backend validation mismatch and a test coverage gap, **not a passed assertion**. Need original-source hardening or an explicitly accepted error UX before converting this into a runnable success expectation.

## Individual source-traced records

Every row below points to the exact immutable frontend and backend source, and an authored (but unrun) scenario line. The CSV companion contains full references and retained gates.

| Feature | Playwright scenario(s) | Original frontend line | Source-level observation |
|---|---|---|---|
| `TEN-APE-B14-021` | `TAPE-021` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:789` | Both JSON drafts parse to non-array objects before a governed POST |
| `TEN-APE-B14-022` | `TAPE-022` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:789` | Malformed prior-value JSON throws before the request; form error remains visible |
| `TEN-APE-B14-023` | `TAPE-023` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:792` | Array, primitive and null applied values fail object check before write |
| `TEN-APE-B14-024` | `TAPE-024` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1165` | Failed POST shows form error without clearing the application draft |
| `TEN-APE-B14-025` | `TAPE-025` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:804` | Successful application POST clears draft and refetches summary |
| `TEN-APE-B14-026` | `TAPE-026` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:777` | Governor refresh POST creates analysis snapshot, not a policy mutation |
| `TEN-APE-B14-027` | `TAPE-027` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:906` | Refresh failure explains no operating rule was changed |
| `TEN-APE-B14-028` | `TAPE-028` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:837` | Signals are grouped by policy key and sorted newest observed timestamp |
| `TEN-APE-B14-029` | `TAPE-029` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1094` | Approved recommendations expose recorder only with governing permission |
| `TEN-APE-B14-030` | `TAPE-030` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1087` | Recommendation status, risk and confidence display without automatic approval |
| `TEN-APE-B14-031` | `TAPE-031` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1074` | Source-action recommendation ID drives focused row class and element ID |
| `TEN-APE-B14-032` | `TAPE-032` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:761` | Exact source_action_id propagates unchanged into filtered summary query |
| `TEN-APE-B14-033` | `TAPE-033` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1119` | State-gated lifecycle actions open a human reason form |
| `TEN-APE-B14-034` | `TAPE-034` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1175` | Trimmed lifecycle reason shorter than ten characters disables submit |
| `TEN-APE-B14-035` | `TAPE-035` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:815` | Lifecycle mutation posts action with trimmed human reason |
| `TEN-APE-B14-036` | `TAPE-036` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1119` | Rollback review only opens governance review rather than executing rollback |
| `TEN-APE-B14-037` | `TAPE-037` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1119` | Retire appears only among state-allowed human actions |
| `TEN-APE-B14-038` | `TAPE-038` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1120` | Resume monitoring appears only in permitted review states |
| `TEN-APE-B14-039` | `TAPE-039` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1121` | Record rollback button is shown exclusively for rollback-review state |
| `TEN-APE-B14-040` | `TAPE-040` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1174` | Lifecycle conflict displays explicit error and retains reason |
| `TEN-APE-B14-041` | `TAPE-041` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:821` | Successful lifecycle action clears draft and refetches |
| `TEN-APE-B14-042` | `TAPE-042` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1138` | Measured effectiveness requires linked valid before-and-after scores |
| `TEN-APE-B14-043` | `TAPE-043` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1138` | Unlinked observations present as observations and delta Not assessed |
| `TEN-APE-B14-044` | `TAPE-044` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1088` | High or critical risk is displayed as risk evidence, not an approval |
| `TEN-APE-B14-045` | `TAPE-045` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:861` | Recorder preserves current policy value separately from recommended adjustment |
| `TEN-APE-B14-046` | `TAPE-046` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:1081` | Recommendation evidence shows latest policy signal and history count |
| `TEN-APE-B14-047` | `TAPE-047` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:716` | Per-evidence section renders empty-state text under filters |
| `TEN-APE-B14-048` | `TAPE-048` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:943` | Filter updates preserve deep-link parameter and current route |
| `TEN-APE-B14-049` | `TAPE-049` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:883` | Initial GET failure renders error page, not stale governing controls |
| `TEN-APE-B14-050` | `TAPE-050` | `frontend/src/pages/AdaptivePolicyEnginePage.tsx:929` | Readiness and diagnostic tabs are explicitly disabled in tenant UI |
| `TEN-PF-B15-001` | `TPF-001` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:898` | Hero states forecasts cannot automatically mutate inventory |
| `TEN-PF-B15-002` | `TPF-002` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1050` | Empty evidence explicitly disclaims safety and approval |
| `TEN-PF-B15-003` | `TPF-003` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1060` | Models, intervals, risk probabilities, and observations render as separate tables |
| `TEN-PF-B15-004` | `TPF-004` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:842` | KPI totals prefer server governance counts over returned row lengths |
| `TEN-PF-B15-005` | `TPF-005` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:811` | Reader refresh refetches GET without invoking analysis POST |
| `TEN-PF-B15-006` | `TPF-006` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:819` | Governor-only analysis refresh POST sends empty body and refetches |
| `TEN-PF-B15-007` | `TPF-007` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:904` | Analysis POST error remains distinct from existing snapshot evidence |
| `TEN-PF-B15-008` | `TPF-008` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:876` | Initial summary GET error exposes Retry action |
| `TEN-PF-B15-009` | `TPF-009` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:991` | Business-area select writes forecast_domain and resets offsets |
| `TEN-PF-B15-010` | `TPF-010` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:998` | Forecast-type select writes forecast_type |
| `TEN-PF-B15-011` | `TPF-011` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1005` | Model-status select writes model_status |
| `TEN-PF-B15-012` | `TPF-012` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1012` | Uncertainty method select writes uncertainty_method |
| `TEN-PF-B15-013` | `TPF-013` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1019` | Risk-type select writes risk_type |
| `TEN-PF-B15-014` | `TPF-014` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1026` | Calibration source/type select writes calibration_type |
| `TEN-PF-B15-015` | `TPF-015` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1033` | Limit select propagates integer up to 200 |
| `TEN-PF-B15-016` | `TPF-016` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:984` | Clear filters restores default filters and zero offsets |
| `TEN-PF-B15-017` | `TPF-017` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1069` | Model pagination modifies model_offset independently |
| `TEN-PF-B15-018` | `TPF-018` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1112` | Interval pagination modifies interval_offset independently |
| `TEN-PF-B15-019` | `TPF-019` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:831` | Newer pagination subtracts page size, clipped to zero |
| `TEN-PF-B15-020` | `TPF-020` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1096` | General/backtest model evidence has explicit limited-method wording |
| `TEN-PF-B15-021` | `TPF-021` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:182` | Recognized source_action_id selects focused model source GET |
| `TEN-PF-B15-022` | `TPF-022` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:182` | Invalid short source ID falls back to tenant summary; 36-character malformed ID gap remains |
| `TEN-PF-B15-023` | `TPF-023` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:942` | Missing exact-version source shows unavailable state without alternate rows |
| `TEN-PF-B15-024` | `TPF-024` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:942` | Retry exact version refetches the focused endpoint |
| `TEN-PF-B15-025` | `TPF-025` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:948` | Clear focused review evidence returns to standard route |
| `TEN-PF-B15-026` | `TPF-026` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:920` | Historical version badge distinguishes superseded from current |
| `TEN-PF-B15-027` | `TPF-027` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:846` | Focused KPI counts derive only from exact source payload |
| `TEN-PF-B15-028` | `TPF-028` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:955` | Focused UI hides tenant-wide filters and uses focused paging |
| `TEN-PF-B15-029` | `TPF-029` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:793` | Focused limit change updates focused endpoint query key and URL |
| `TEN-PF-B15-030` | `TPF-030` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:798` | Focused offsets serialized independently into source GET |
| `TEN-PF-B15-031` | `TPF-031` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:806` | Changing category filter resets all paging offsets |
| `TEN-PF-B15-032` | `TPF-032` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:898` | Forecast page remains advisory, not automatic stock mutation |
| `TEN-PF-B15-033` | `TPF-033` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1081` | Classification coverage and incomplete evidence are displayed |
| `TEN-PF-B15-034` | `TPF-034` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1086` | Insufficient backtest history is called out explicitly |
| `TEN-PF-B15-035` | `TPF-035` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1119` | Range table separates lower, expected, and upper values |
| `TEN-PF-B15-036` | `TPF-036` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1109` | Uncertainty bands labeled empirical, not statistical confidence intervals |
| `TEN-PF-B15-037` | `TPF-037` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:569` | High-risk probability without explanation uses cautionary fallback |
| `TEN-PF-B15-038` | `TPF-038` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:569` | Very low-risk probability without explanation includes evidence caution |
| `TEN-PF-B15-039` | `TPF-039` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1177` | Learning Feedback origin is distinguished from backtest source |
| `TEN-PF-B15-040` | `TPF-040` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1177` | Rolling backtest observations have a distinct origin label |
| `TEN-PF-B15-041` | `TPF-041` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:558` | True, false, and null interval-captured outcomes have distinct labels |
| `TEN-PF-B15-042` | `TPF-042` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:617` | Each evidence category has a separate no-results branch |
| `TEN-PF-B15-043` | `TPF-043` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1207` | Review checks are advisory and link to human review conditionally |
| `TEN-PF-B15-044` | `TPF-044` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1229` | Absent current evidence leaves review checks not assessed |
| `TEN-PF-B15-045` | `TPF-045` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:707` | Lifecycle cards have independent collapsible evidence sections |
| `TEN-PF-B15-046` | `TPF-046` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:766` | Review deep link is permission-gated by action-center and decision read |
| `TEN-PF-B15-047` | `TPF-047` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:24` | Tenant forecast diagnostics flag is false, hiding internal tab |
| `TEN-PF-B15-048` | `TPF-048` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1178` | Raw calibration keys gated by tenant diagnostics permission |
| `TEN-PF-B15-049` | `TPF-049` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:765` | Read and governor UI roles align with separate route guards |
| `TEN-PF-B15-050` | `TPF-050` | `frontend/src/pages/ProbabilisticForecastingPage.tsx:860` | Focused request failure does not show tenant summary fallback |
| `TEN-PROD-14` | `TPROD-039`, `TPROD-064`, `TPROD-065`, `TPROD-066`, `TPROD-067` | `frontend/src/pages/products/ProductCostAnalyticsSectionsPanel.tsx:52` | Cost & value combines valuation summaries/details and filtered CSV evidence; references product history; does not write stock |
| `TEN-PROD-15` | `TPROD-040`, `TPROD-068`, `TPROD-069`, `TPROD-070`, `TPROD-071`, `TPROD-072`, `TPROD-073` | `frontend/src/pages/products/ProductCostAnalyticsSectionsPanel.tsx:73` | Cost review composes recommendations, action plans/details, risk, source and supplier summaries, with scoped CSV drilldowns |
| `TEN-PROD-16` | `TPROD-041`, `TPROD-050`, `TPROD-074`, `TPROD-075`, `TPROD-076`, `TPROD-077`, `TPROD-078` | `frontend/src/pages/products/ProductCostAnalyticsSectionsPanel.tsx:163` | Cost controls mounts hardening, review queue, signoff, audit packs, closure, handoff and report; export/print depend on loaded evidence |

## Remaining gates

- 39/272 partial features were previously source-reviewed in B158; this batch adds 83 (cumulative **122/272**); 150 still require this level of source review: Cross-Domain Optimization 50, Enterprise Collaboration 50, Digital Twin 50.
- 357 scenario-labelled skips still exist; all individually source-reviewed, none automatically promoted. Also 24 separate conditional skip calls remain.
- 417 `BLOCKED` scenario obligations and `PLCR-084` `NEEDS_EXPECTATION` are unchanged; the 36-character focused UUID mismatch is documented, **not silently closed** or counted as a new ledger ID.
- 8,902 active test declarations and 357 labelled skips are entirely **uncompiled/unrun**. Original immutable FE/BE code unchanged.
