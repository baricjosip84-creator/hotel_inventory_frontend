# Batch 184 — Probabilistic Forecasting evidence formatting source review

40 added `TPF-051..090` source-traced declarations in existing `tests/tenant/probabilistic-forecasting/probabilistic-forecasting.spec.ts` (no new spec). All 40 use read-only synthetic intercepted GET responses; *none* are compiled, discovered, or run. The backend response contract is not verified. Original frontend and backend source ZIPs were rehashed and checked.

| Scenario | Frontend source anchor | Scope |
|---|---|---|
| TPF-051 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1076` | Untitled model uses a readable key |
| TPF-052 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1077` | Source-reference version fallback |
| TPF-053 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1077` | Direct model version priority |
| TPF-054 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1077` | Zero-valued model version omitted |
| TPF-055 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1077` | Absent version omitted |
| TPF-056 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1081` | Omit absent coverage ratio |
| TPF-057 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1081` | Display zero coverage explicitly |
| TPF-058 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1078` | Coverage warning only for explicit false |
| TPF-059 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1086` | Backtest warning only for explicit false |
| TPF-060 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1087` | Stored model summary shown |
| TPF-061 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1087` | Absent model summary not rendered |
| TPF-062 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1100` | Fractional confidence percentage |
| TPF-063 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1100` | Already-scaled confidence percentage |
| TPF-064 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:584` | Blocked badge danger tone |
| TPF-065 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:583` | Approved advisory badge good tone |
| TPF-066 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:585` | Medium badge warning tone |
| TPF-067 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1089` | Absent model domain fallback |
| TPF-068 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1090` | Empty forecast type fallback |
| TPF-069 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1093` | Case-insensitive general-method warning |
| TPF-070 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1098` | Unrecognized method human-readable token |
| TPF-071 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1101` | Model update timestamp takes precedence |
| TPF-072 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1101` | Model creation timestamp fallback |
| TPF-073 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1101` | Absent model timestamp placeholder |
| TPF-074 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:553` | Legacy lower quantile fallback |
| TPF-075 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:555` | Legacy expected quantile fallback |
| TPF-076 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:554` | Legacy upper quantile fallback |
| TPF-077 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:553` | Lower bound zero precedence |
| TPF-078 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:553` | Absent lower bound placeholder |
| TPF-079 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1125` | Missing unit not invented |
| TPF-080 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1128` | Missing interval confidence placeholder |
| TPF-081 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:570` | Stored risk explanation precedence |
| TPF-082 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:578` | Generic no-explanation risk guidance |
| TPF-083 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1152` | Probability zero and severity one extremes |
| TPF-084 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1177` | Unknown observation source generic label |
| TPF-085 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1190` | Missing calibration assessment explicit |
| TPF-086 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1188` | Fractional calibration error rendering |
| TPF-087 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1190` | Fractional calibration percent |
| TPF-088 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1190` | Already-scaled calibration percent |
| TPF-089 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1191` | Missing measured-at placeholder |
| TPF-090 | `frontend/src/pages/ProbabilisticForecastingPage.tsx:1174` | Observation model version rendering |

**Important source-contract limitations.** Numeric formatting accepts both 0..1 ratios and already-scaled scores, without knowing which unit the backend intends; a value such as 1.5 is displayed as 1.5%, not necessarily 150%. The model version uses a truthiness test: `version=0` suppresses the label even if a fallback version exists. Missing range values use legacy p10/p50/p90 fields, but the UI explicitly states these error bands are not statistical quantiles. A recognized stored risk explanation overrides computed risk fallback guidance.

**Deferred acceptance:** confirm cross-locale number/date outputs, actual API input validity, access permissions, tenant isolation, browser selectors, real model responses, and backend/database behavior during Phase 2. No real inventory mutations.
