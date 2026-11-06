# Batch 183 — Tenant System Context source-to-scenario review

35 added `TSC-051..085` static-source-traced declarations, no browser execution or compiler check. Source: immutable original SystemContextPage.tsx.

| Scenario | Immutable FE line | Browser-facing expectation |
|---|---:|---|
| TSC-051 | 518 | Absent risk count shows source-review fallback |
| TSC-052 | 518 | Multiple risk affected items use plural |
| TSC-053 | 518 | Explicit zero risk count is shown |
| TSC-054 | 511 | Warning severity shows warning tone |
| TSC-055 | 511 | Unknown risk severity is neutral |
| TSC-056 | 190 | Cost risk route selects reports |
| TSC-057 | 190 | Variance risk route selects reports |
| TSC-058 | 191 | Stock risk route selects stock page |
| TSC-059 | 192 | Unmatched risk links action center on grant |
| TSC-060 | 189 | Alert token precedence wins over cost in risk route |
| TSC-061 | 190 | Cost token precedence wins over stock in risk route |
| TSC-062 | 174 | Procurement recommendation source opens shipments |
| TSC-063 | 176 | Costing recommendation source opens reports |
| TSC-064 | 178 | Audit recommendation source opens audit |
| TSC-065 | 179 | Access source shares audit permission and route |
| TSC-066 | 181 | Unknown recommendation section falls back to action center |
| TSC-067 | 558 | Present ranking reason is rendered with Why label |
| TSC-068 | 558 | Absent ranking reason omits Why text |
| TSC-069 | 553 | False human-review flag omits pill |
| TSC-070 | 554 | Non-false executes flag omits Read-only pill |
| TSC-071 | 548 | Medium priority uses warn tone |
| TSC-072 | 548 | Other priorities use neutral tone |
| TSC-073 | 110 | Unknown human readable backend action preserved verbatim |
| TSC-074 | 62 | Minimum-stock machine request token replaced with readable UI guidance |
| TSC-075 | 68 | Product-pricing request token replaced with readable UI guidance |
| TSC-076 | 595 | Missing context score breakdown hides detail table |
| TSC-077 | 612 | All-current source posture renders explicit empty state |
| TSC-078 | 608 | Long freshness source list capped at five |
| TSC-079 | 120 | Stale source warning distinguishes age from validity |
| TSC-080 | 122 | Unknown timestamp displays distinct source message |
| TSC-081 | 623 | Explicit policy false displays Policy dependent |
| TSC-082 | 623 | Missing guardrail defaults to Required |
| TSC-083 | 144 | Invalid numerical source strings become zero not NaN |
| TSC-084 | 492 | Singular readiness blocker count |
| TSC-085 | 492 | Plural readiness blocker count |

## Source and validation limits

- Original immutable frontend `src/pages/SystemContextPage.tsx`, `src/routes/systemContext.js` backend source checked against retained ZIPs. Backend routes were not called.
- Synthetic GET `/system-context` responses change card labels, routing and presentation. Malformed or incomplete fields may fall outside valid server contracts and are negative-formatting exercises only.
- **Source-link acceptance dependency** for TSC-056..066: the isolated disposable tenant account must have the targeted **reports.read, stock.read, shipments.read, audit.read, alerts.read or operational_action_center.read** grant as appropriate. When absent, source code intentionally hides links. These tests may fail without provisioning but must not be weakened to accept any outcome. Earlier unprovisioned role requirements also remain.
- TSC-060/061 expressly test source `riskRoute` branch precedence, not backend correctness. TSC-070 tests only absence of a Read-only label for a synthetic executable flag, not mutation safety.
- **No Playwright/TypeScript compile, discovery, execution, browser, DB, API, CI, authorization validation, or deployment.** All statuses remain `GENERATED_UNRUN`.
