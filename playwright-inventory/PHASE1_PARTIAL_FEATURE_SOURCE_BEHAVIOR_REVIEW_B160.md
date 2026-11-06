# Batch 160 — source-behavior reconciliation (150 existing partial features)

## Strict scope and interpretation

This is an **individual static review** of one existing, unexecuted Playwright declaration per feature, alongside immutable frontend behavior and backend route/Joi validation. No tests were compiled/executed. Findings do not assert successful runtime or database behavior. The full CSV has one row for every feature with the exact FE line, backend guard and validation lines, and authored declaration location.

| Area | Reviewed | Prior status | New status |
|---|---:|---|---|
| Cross-Domain Optimization | 50 | SOURCE_PARTIAL | SOURCE_TRACED_PARTIAL |
| Enterprise Collaboration | 50 | SOURCE_TRACED_PARTIAL (earlier superficial) | SOURCE_TRACED_PARTIAL (per-assertion review) |
| Digital Twin | 50 | SOURCE_TRACED_PARTIAL (earlier superficial) | SOURCE_TRACED_PARTIAL (per-assertion review) |
| **Total** | **150** | **50 newly traced; 100 re-reviewed** | **All remain PARTIAL** |

## Material findings

1. **CDO mocked IDs versus Joi UUID:** governed request-shape tests TCDO-041–043 cannot establish backend ID validation or persistence; see `B160-SOURCE-EVIDENCE-01`.

2. **Collaboration permission-linked UX:** per-thread exact links lack the specific shortcut permission check; role-gated backend/router security not disproven; see `B160-SOURCE-EVIDENCE-02`.

3. **Digital Twin mocked graph keys:** focus tests use `pw-node-*` while API requires `dt_` plus 24 hex characters; see `B160-SOURCE-EVIDENCE-03`.

4. **CDO governed actions:** intercepted POST/PUT assertions establish outgoing request intent only, not persistence or conflict behavior; see `B160-SOURCE-EVIDENCE-04`.

## Feature-by-feature source anchors

| Feature | Scenario (unrun) | Exact FE anchor | BE route / Joi | Direct evidence label |
|---|---|---|---|---|
| `TEN-CDO-B16-001` | `TCDO-001` (line 29) | `CrossDomainOptimizationPage.tsx:1340` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | page header and advisory/no-execution copy |
| `TEN-CDO-B16-002` | `TCDO-002` (line 34) | `CrossDomainOptimizationPage.tsx:1700` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | No decision comparisons yet |
| `TEN-CDO-B16-003` | `TCDO-003` (line 39) | `CrossDomainOptimizationPage.tsx:1387` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Describe the decision for the people who will review it |
| `TEN-CDO-B16-004` | `TCDO-004` (line 46) | `CrossDomainOptimizationPage.tsx:1344` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Cross-domain optimization evidence summary |
| `TEN-CDO-B16-005` | `TCDO-005` (line 51) | `CrossDomainOptimizationPage.tsx:1707` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Actual optimization outcomes |
| `TEN-CDO-B16-006` | `TCDO-006` (line 55) | `CrossDomainOptimizationPage.tsx:1321` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Cross-area optimization evidence could not be loaded |
| `TEN-CDO-B16-007` | `TCDO-007` (line 64) | `CrossDomainOptimizationPage.tsx:1341` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Refresh evidence |
| `TEN-CDO-B16-008` | `TCDO-008` (line 71) | `CrossDomainOptimizationPage.tsx:1355` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | selected tab gating with evidence state |
| `TEN-CDO-B16-009` | `TCDO-009` (line 76) | `CrossDomainOptimizationPage.tsx:1779` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Business area |
| `TEN-CDO-B16-010` | `TCDO-010` (line 84) | `CrossDomainOptimizationPage.tsx:1697` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Run status |
| `TEN-CDO-B16-011` | `TCDO-011` (line 89) | `CrossDomainOptimizationPage.tsx:1779` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Objective type |
| `TEN-CDO-B16-012` | `TCDO-012` (line 94) | `CrossDomainOptimizationPage.tsx:1697` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Option status |
| `TEN-CDO-B16-013` | `TCDO-013` (line 99) | `CrossDomainOptimizationPage.tsx:1697` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Tradeoff direction |
| `TEN-CDO-B16-014` | `TCDO-014` (line 104) | `CrossDomainOptimizationPage.tsx:1697` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Recorded outcome status |
| `TEN-CDO-B16-015` | `TCDO-015` (line 109) | `CrossDomainOptimizationPage.tsx:1697` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Maximum records per evidence list |
| `TEN-CDO-B16-016` | `TCDO-016` (line 115) | `CrossDomainOptimizationPage.tsx:1697` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Maximum records per evidence list |
| `TEN-CDO-B16-017` | `TCDO-017` (line 122) | `CrossDomainOptimizationPage.tsx:1691` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Choose the planning run to review |
| `TEN-CDO-B16-018` | `TCDO-018` (line 128) | `CrossDomainOptimizationPage.tsx:1703` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Optimization runs |
| `TEN-CDO-B16-019` | `TCDO-019` (line 135) | `CrossDomainOptimizationPage.tsx:1760` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | refuses to calculate a combined readiness result |
| `TEN-CDO-B16-020` | `TCDO-020` (line 140) | `CrossDomainOptimizationPage.tsx:1760` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Passing checks are still advisory and never execute a plan. |
| `TEN-CDO-B16-021` | `TCDO-021` (line 183) | `CrossDomainOptimizationPage.tsx:1406` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Only current issues with a real next action are shown here. |
| `TEN-CDO-B16-022` | `TCDO-022` (line 190) | `CrossDomainOptimizationPage.tsx:1624` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Decision title |
| `TEN-CDO-B16-023` | `TCDO-023` (line 195) | `CrossDomainOptimizationPage.tsx:1387` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Describe the decision for the people who will review it |
| `TEN-CDO-B16-024` | `TCDO-024` (line 201) | `CrossDomainOptimizationPage.tsx:1409` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Source data is not available with your current access |
| `TEN-CDO-B16-025` | `TCDO-025` (line 206) | `CrossDomainOptimizationPage.tsx:1417` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Source-backed actions could not be loaded |
| `TEN-CDO-B16-026` | `TCDO-026` (line 211) | `CrossDomainOptimizationPage.tsx:1451` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Nothing currently needs a Cross-Domain decision |
| `TEN-CDO-B16-027` | `TCDO-027` (line 215) | `CrossDomainOptimizationPage.tsx:1413` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Check again |
| `TEN-CDO-B16-028` | `TCDO-028` (line 219) | `CrossDomainOptimizationPage.tsx:1093` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | seven distinct optimization-plan source builder POSTs |
| `TEN-CDO-B16-029` | `TCDO-029` (line 230) | `CrossDomainOptimizationPage.tsx:1418` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Some planning checks could not be completed |
| `TEN-CDO-B16-030` | `TCDO-030` (line 236) | `CrossDomainOptimizationPage.tsx:1740` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | rejected |
| `TEN-CDO-B16-031` | `TCDO-031` (line 240) | `CrossDomainOptimizationPage.tsx:467` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | source recommendation identity-based deduplication |
| `TEN-CDO-B16-032` | `TCDO-032` (line 244) | `CrossDomainOptimizationPage.tsx:493` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | shared business scope matching for selectable source pairs |
| `TEN-CDO-B16-033` | `TCDO-033` (line 250) | `CrossDomainOptimizationPage.tsx:1450` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Compare selected |
| `TEN-CDO-B16-034` | `TCDO-034` (line 256) | `CrossDomainOptimizationPage.tsx:1461` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Review the source data |
| `TEN-CDO-B16-035` | `TCDO-035` (line 262) | `CrossDomainOptimizationPage.tsx:1753` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Open Replenishment Planning |
| `TEN-CDO-B16-036` | `TCDO-036` (line 267) | `CrossDomainOptimizationPage.tsx:1477` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Directly comparable source fields |
| `TEN-CDO-B16-037` | `TCDO-037` (line 274) | `CrossDomainOptimizationPage.tsx:1488` | `decisionIntelligence.js:112` / `decisionIntelligence.validation.js:931` | 1 source-backed action |
| `TEN-CDO-B16-038` | `TCDO-038` (line 282) | `CrossDomainOptimizationPage.tsx:1153` | `decisionIntelligence.js:112` / `decisionIntelligence.validation.js:931` | source-backed review POST body with nullable aggregate score |
| `TEN-CDO-B16-039` | `TCDO-039` (line 291) | `CrossDomainOptimizationPage.tsx:1489` | `decisionIntelligence.js:112` / `decisionIntelligence.validation.js:931` | The data-backed decision review could not be created. The source recor |
| `TEN-CDO-B16-040` | `TCDO-040` (line 298) | `CrossDomainOptimizationPage.tsx:1490` | `decisionIntelligence.js:112` / `decisionIntelligence.validation.js:931` | Save decision review |
| `TEN-CDO-B16-041` | `TCDO-041` (line 304) | `CrossDomainOptimizationPage.tsx:1257` | `decisionIntelligence.js:119` / `decisionIntelligence.validation.js:980` | governed run-action POST and owner id payload |
| `TEN-CDO-B16-042` | `TCDO-042` (line 312) | `CrossDomainOptimizationPage.tsx:1257` | `decisionIntelligence.js:119` / `decisionIntelligence.validation.js:980` | governed run-action POST and option_id payload |
| `TEN-CDO-B16-043` | `TCDO-043` (line 319) | `CrossDomainOptimizationPage.tsx:1269` | `decisionIntelligence.js:126` / `decisionIntelligence.validation.js:991` | governed tradeoff POST with reason and conditions |
| `TEN-CDO-B16-044` | `TCDO-044` (line 329) | `CrossDomainOptimizationPage.tsx:1752` | `decisionIntelligence.js:119` / `decisionIntelligence.validation.js:980` | Select an option before requesting review |
| `TEN-CDO-B16-045` | `TCDO-045` (line 333) | `CrossDomainOptimizationPage.tsx:1713` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Save ownership and next action |
| `TEN-CDO-B16-046` | `TCDO-046` (line 340) | `CrossDomainOptimizationPage.tsx:1274` | `decisionIntelligence.js:133` / `decisionIntelligence.validation.js:1000` | governed settings PUT conversion and backend range validation |
| `TEN-CDO-B16-047` | `TCDO-047` (line 349) | `CrossDomainOptimizationPage.tsx:924` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | This review is not assessed because the selected run does not yet have |
| `TEN-CDO-B16-048` | `TCDO-048` (line 354) | `CrossDomainOptimizationPage.tsx:1753` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Open Learning Feedback |
| `TEN-CDO-B16-049` | `TCDO-049` (line 358) | `CrossDomainOptimizationPage.tsx:1502` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Compare different actions before management decides |
| `TEN-CDO-B16-050` | `TCDO-050` (line 363) | `CrossDomainOptimizationPage.tsx:1752` | `decisionIntelligence.js:104` / `decisionIntelligence.validation.js:917` | Send selected option to Intelligence Review |
| `TEN-COL-B17-001` | `TCOL-001` (line 24) | `EnterpriseCollaborationPage.tsx:513` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | It does not create a chat thread, send a message, notify anyone, or re |
| `TEN-COL-B17-002` | `TCOL-002` (line 29) | `EnterpriseCollaborationPage.tsx:512` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Coordinate work in the source workflow |
| `TEN-COL-B17-003` | `TCOL-003` (line 35) | `EnterpriseCollaborationPage.tsx:494` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Coordination recommendations could not be loaded |
| `TEN-COL-B17-004` | `TCOL-004` (line 42) | `EnterpriseCollaborationPage.tsx:642` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | No coordination recommendations match the current filters |
| `TEN-COL-B17-005` | `TCOL-005` (line 47) | `EnterpriseCollaborationPage.tsx:534` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Refresh recommendations |
| `TEN-COL-B17-006` | `TCOL-006` (line 52) | `EnterpriseCollaborationPage.tsx:552` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Coordination area |
| `TEN-COL-B17-007` | `TCOL-007` (line 57) | `EnterpriseCollaborationPage.tsx:558` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Recommendation type |
| `TEN-COL-B17-008` | `TCOL-008` (line 62) | `EnterpriseCollaborationPage.tsx:564` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Urgency |
| `TEN-COL-B17-009` | `TCOL-009` (line 67) | `EnterpriseCollaborationPage.tsx:570` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Needs attention because |
| `TEN-COL-B17-010` | `TCOL-010` (line 72) | `EnterpriseCollaborationPage.tsx:576` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Maximum recommendations |
| `TEN-COL-B17-011` | `TCOL-011` (line 77) | `EnterpriseCollaborationPage.tsx:548` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Clear filters |
| `TEN-COL-B17-012` | `TCOL-012` (line 83) | `EnterpriseCollaborationPage.tsx:584` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Collaboration summary |
| `TEN-COL-B17-013` | `TCOL-013` (line 87) | `EnterpriseCollaborationPage.tsx:752` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | The total may be higher because source scanning is deliberately bounde |
| `TEN-COL-B17-014` | `TCOL-014` (line 92) | `EnterpriseCollaborationPage.tsx:656` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | thread card rendering with title and urgency |
| `TEN-COL-B17-015` | `TCOL-015` (line 97) | `EnterpriseCollaborationPage.tsx:672` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Overdue |
| `TEN-COL-B17-016` | `TCOL-016` (line 101) | `EnterpriseCollaborationPage.tsx:324` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | exact alert_id deep-link construction |
| `TEN-COL-B17-017` | `TCOL-017` (line 106) | `EnterpriseCollaborationPage.tsx:327` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | exact task_id deep-link construction |
| `TEN-COL-B17-018` | `TCOL-018` (line 110) | `EnterpriseCollaborationPage.tsx:303` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | source-surface allowlist instead of fabricated href |
| `TEN-COL-B17-019` | `TCOL-019` (line 115) | `EnterpriseCollaborationPage.tsx:333` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | source-action-ID scoped Action Center link |
| `TEN-COL-B17-020` | `TCOL-020` (line 119) | `EnterpriseCollaborationPage.tsx:788` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | No messages or comments are recorded |
| `TEN-COL-B17-021` | `TCOL-021` (line 131) | `EnterpriseCollaborationPage.tsx:747` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Recommendation pages |
| `TEN-COL-B17-022` | `TCOL-022` (line 139) | `EnterpriseCollaborationPage.tsx:747` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Recommendation pages |
| `TEN-COL-B17-023` | `TCOL-023` (line 145) | `EnterpriseCollaborationPage.tsx:747` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Recommendation pages |
| `TEN-COL-B17-024` | `TCOL-024` (line 151) | `EnterpriseCollaborationPage.tsx:747` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Recommendation pages |
| `TEN-COL-B17-025` | `TCOL-025` (line 155) | `EnterpriseCollaborationPage.tsx:584` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Collaboration summary |
| `TEN-COL-B17-026` | `TCOL-026` (line 159) | `EnterpriseCollaborationPage.tsx:584` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Collaboration summary |
| `TEN-COL-B17-027` | `TCOL-027` (line 163) | `EnterpriseCollaborationPage.tsx:687` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | timestamp presentation with fallback source timestamp |
| `TEN-COL-B17-028` | `TCOL-028` (line 167) | `EnterpriseCollaborationPage.tsx:297` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | invalid source timestamp passed through unchanged |
| `TEN-COL-B17-029` | `TCOL-029` (line 171) | `EnterpriseCollaborationPage.tsx:633` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | /real-time-operations-feed |
| `TEN-COL-B17-030` | `TCOL-030` (line 176) | `EnterpriseCollaborationPage.tsx:634` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | /intelligence-review |
| `TEN-COL-B17-031` | `TCOL-031` (line 181) | `EnterpriseCollaborationPage.tsx:335` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | /probabilistic-forecasting |
| `TEN-COL-B17-032` | `TCOL-032` (line 185) | `EnterpriseCollaborationPage.tsx:335` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | /adaptive-policy-engine |
| `TEN-COL-B17-033` | `TCOL-033` (line 189) | `EnterpriseCollaborationPage.tsx:305` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | /control-tower |
| `TEN-COL-B17-034` | `TCOL-034` (line 193) | `EnterpriseCollaborationPage.tsx:738` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | /action-center |
| `TEN-COL-B17-035` | `TCOL-035` (line 198) | `EnterpriseCollaborationPage.tsx:279` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | /shipments |
| `TEN-COL-B17-036` | `TCOL-036` (line 202) | `EnterpriseCollaborationPage.tsx:679` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | No additional summary was provided. |
| `TEN-COL-B17-037` | `TCOL-037` (line 206) | `EnterpriseCollaborationPage.tsx:288` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | unknown identifier formatting fallback |
| `TEN-COL-B17-038` | `TCOL-038` (line 210) | `EnterpriseCollaborationPage.tsx:731` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Topics to cover in the source workflow |
| `TEN-COL-B17-039` | `TCOL-039` (line 214) | `EnterpriseCollaborationPage.tsx:704` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Location |
| `TEN-COL-B17-040` | `TCOL-040` (line 218) | `EnterpriseCollaborationPage.tsx:710` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Due or follow-up time |
| `TEN-COL-B17-041` | `TCOL-041` (line 222) | `EnterpriseCollaborationPage.tsx:691` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | unassigned |
| `TEN-COL-B17-042` | `TCOL-042` (line 226) | `EnterpriseCollaborationPage.tsx:691` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Assigned in the source workflow |
| `TEN-COL-B17-043` | `TCOL-043` (line 230) | `EnterpriseCollaborationPage.tsx:673` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Active coordination suggested |
| `TEN-COL-B17-044` | `TCOL-044` (line 234) | `EnterpriseCollaborationPage.tsx:303` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | external/javascript source surface excluded from local link allowlist |
| `TEN-COL-B17-045` | `TCOL-045` (line 238) | `EnterpriseCollaborationPage.tsx:534` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Refresh recommendations |
| `TEN-COL-B17-046` | `TCOL-046` (line 244) | `EnterpriseCollaborationPage.tsx:564` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Urgency |
| `TEN-COL-B17-047` | `TCOL-047` (line 249) | `EnterpriseCollaborationPage.tsx:634` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | shortcuts permission check only; record deep-link has a separate path |
| `TEN-COL-B17-048` | `TCOL-048` (line 254) | `EnterpriseCollaborationPage.tsx:780` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | safety panel guidance presentation |
| `TEN-COL-B17-049` | `TCOL-049` (line 259) | `EnterpriseCollaborationPage.tsx:626` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | Coordination recommendations |
| `TEN-COL-B17-050` | `TCOL-050` (line 267) | `EnterpriseCollaborationPage.tsx:419` | `operationalActionCenter.js:117` / `operationalActionCenter.validation.js:217` | page component; router permission guard is authoritative |
| `TEN-DT-B18-001` | `TDT-001` (line 26) | `DigitalTwinVisualizationPage.tsx:673` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | It is not a live simulation and does not change source records. |
| `TEN-DT-B18-002` | `TDT-002` (line 30) | `DigitalTwinVisualizationPage.tsx:672` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Review relationships, dependencies, risks, and operational pressure |
| `TEN-DT-B18-003` | `TDT-003` (line 36) | `DigitalTwinVisualizationPage.tsx:672` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Review relationships, dependencies, risks, and operational pressure |
| `TEN-DT-B18-004` | `TDT-004` (line 42) | `DigitalTwinVisualizationPage.tsx:838` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | No operational context matches the current filters |
| `TEN-DT-B18-005` | `TDT-005` (line 47) | `DigitalTwinVisualizationPage.tsx:681` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Refresh context |
| `TEN-DT-B18-006` | `TDT-006` (line 51) | `DigitalTwinVisualizationPage.tsx:708` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Operational area |
| `TEN-DT-B18-007` | `TDT-007` (line 56) | `DigitalTwinVisualizationPage.tsx:692` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | does not generate a live diagram, simulation, or measured heatmap |
| `TEN-DT-B18-008` | `TDT-008` (line 62) | `DigitalTwinVisualizationPage.tsx:710` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Overlay urgency |
| `TEN-DT-B18-009` | `TDT-009` (line 66) | `DigitalTwinVisualizationPage.tsx:711` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Maximum records per list |
| `TEN-DT-B18-010` | `TDT-010` (line 70) | `DigitalTwinVisualizationPage.tsx:700` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Search connected records |
| `TEN-DT-B18-011` | `TDT-011` (line 75) | `DigitalTwinVisualizationPage.tsx:700` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Search connected records |
| `TEN-DT-B18-012` | `TDT-012` (line 82) | `DigitalTwinVisualizationPage.tsx:711` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Maximum records per list |
| `TEN-DT-B18-013` | `TDT-013` (line 89) | `DigitalTwinVisualizationPage.tsx:764` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Digital Twin summary |
| `TEN-DT-B18-014` | `TDT-014` (line 94) | `DigitalTwinVisualizationPage.tsx:723` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | additional older matching records outside this snapshot |
| `TEN-DT-B18-015` | `TDT-015` (line 99) | `DigitalTwinVisualizationPage.tsx:736` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | review-first focus handler sends server focus key |
| `TEN-DT-B18-016` | `TDT-016` (line 106) | `DigitalTwinVisualizationPage.tsx:868` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | node Show connections triggers focus selection |
| `TEN-DT-B18-017` | `TDT-017` (line 112) | `DigitalTwinVisualizationPage.tsx:893` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Review source |
| `TEN-DT-B18-018` | `TDT-018` (line 117) | `DigitalTwinVisualizationPage.tsx:913` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | overlay source link routes through permission allowlist |
| `TEN-DT-B18-019` | `TDT-019` (line 121) | `DigitalTwinVisualizationPage.tsx:942` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | No automatic operational change |
| `TEN-DT-B18-020` | `TDT-020` (line 126) | `DigitalTwinVisualizationPage.tsx:701` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | product |
| `TEN-DT-B18-021` | `TDT-021` (line 142) | `DigitalTwinVisualizationPage.tsx:547` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Previous |
| `TEN-DT-B18-022` | `TDT-022` (line 151) | `DigitalTwinVisualizationPage.tsx:902` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | edge pagination uses next_offset |
| `TEN-DT-B18-023` | `TDT-023` (line 157) | `DigitalTwinVisualizationPage.tsx:931` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | overlay pagination uses next_offset |
| `TEN-DT-B18-024` | `TDT-024` (line 163) | `DigitalTwinVisualizationPage.tsx:620` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | changePage rejects negative or missing offsets |
| `TEN-DT-B18-025` | `TDT-025` (line 169) | `DigitalTwinVisualizationPage.tsx:868` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Show connections |
| `TEN-DT-B18-026` | `TDT-026` (line 178) | `DigitalTwinVisualizationPage.tsx:868` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Show connections |
| `TEN-DT-B18-027` | `TDT-027` (line 183) | `DigitalTwinVisualizationPage.tsx:490` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | source URL guard and route allowlist |
| `TEN-DT-B18-028` | `TDT-028` (line 187) | `DigitalTwinVisualizationPage.tsx:482` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | legacy control-tower canonical path mapping |
| `TEN-DT-B18-029` | `TDT-029` (line 191) | `DigitalTwinVisualizationPage.tsx:381` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | path-level required tenant permission mapping |
| `TEN-DT-B18-030` | `TDT-030` (line 197) | `DigitalTwinVisualizationPage.tsx:482` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | legacy control-tower canonical path mapping |
| `TEN-DT-B18-031` | `TDT-031` (line 201) | `DigitalTwinVisualizationPage.tsx:924` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | overlay shortcut includes Action Center for non-Action Center source |
| `TEN-DT-B18-032` | `TDT-032` (line 205) | `DigitalTwinVisualizationPage.tsx:924` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Action Center overlay omits duplicate shortcut |
| `TEN-DT-B18-033` | `TDT-033` (line 210) | `DigitalTwinVisualizationPage.tsx:490` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | permitted exact source URL handling |
| `TEN-DT-B18-034` | `TDT-034` (line 215) | `DigitalTwinVisualizationPage.tsx:800` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Selected topology point is no longer available |
| `TEN-DT-B18-035` | `TDT-035` (line 221) | `DigitalTwinVisualizationPage.tsx:868` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Show connections |
| `TEN-DT-B18-036` | `TDT-036` (line 227) | `DigitalTwinVisualizationPage.tsx:868` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Show connections |
| `TEN-DT-B18-037` | `TDT-037` (line 232) | `DigitalTwinVisualizationPage.tsx:820` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | impact-chain source node focus |
| `TEN-DT-B18-038` | `TDT-038` (line 237) | `DigitalTwinVisualizationPage.tsx:822` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | impact-chain destination node focus |
| `TEN-DT-B18-039` | `TDT-039` (line 242) | `DigitalTwinVisualizationPage.tsx:826` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | No further dependency chain is visible for this record |
| `TEN-DT-B18-040` | `TDT-040` (line 248) | `DigitalTwinVisualizationPage.tsx:445` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Not scored |
| `TEN-DT-B18-041` | `TDT-041` (line 253) | `DigitalTwinVisualizationPage.tsx:432` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | invalid date string fallback without fabricated localized date |
| `TEN-DT-B18-042` | `TDT-042` (line 257) | `DigitalTwinVisualizationPage.tsx:941` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | current |
| `TEN-DT-B18-043` | `TDT-043` (line 262) | `DigitalTwinVisualizationPage.tsx:125` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | stale_review |
| `TEN-DT-B18-044` | `TDT-044` (line 267) | `DigitalTwinVisualizationPage.tsx:502` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | source freshness labels derive from timestamps |
| `TEN-DT-B18-045` | `TDT-045` (line 273) | `DigitalTwinVisualizationPage.tsx:709` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Review perspective |
| `TEN-DT-B18-046` | `TDT-046` (line 278) | `DigitalTwinVisualizationPage.tsx:868` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Show connections |
| `TEN-DT-B18-047` | `TDT-047` (line 286) | `DigitalTwinVisualizationPage.tsx:945` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | /action-center |
| `TEN-DT-B18-048` | `TDT-048` (line 291) | `DigitalTwinVisualizationPage.tsx:573` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | page component; router permission guard is authoritative |
| `TEN-DT-B18-049` | `TDT-049` (line 302) | `DigitalTwinVisualizationPage.tsx:614` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | read-only filters; no mutation methods in component |
| `TEN-DT-B18-050` | `TDT-050` (line 311) | `DigitalTwinVisualizationPage.tsx:363` | `operationalActionCenter.js:125` / `operationalActionCenter.validation.js:228` | Use the source workflow for every human action |

## Preserved evidence status

All 150 authored tests remain `GENERATED_UNRUN` in the ledger. No scenarios, assertions, permissions or original fixtures were silently deleted, weakened, or declared passing. Only 50 feature-inventory statuses changed from `SOURCE_PARTIAL` to `SOURCE_TRACED_PARTIAL`. All 272 initially partial records now have source-tracing markers, but still require actual test compilation, execution, and outstanding acceptance gates in later approved phases.
