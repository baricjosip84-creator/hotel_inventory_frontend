# Batch 179 — Tenant Dashboard source-to-browser review

35 additional read-only browser scenarios `TDASH-044..TDASH-078` appended to the existing Dashboard spec; previous declarations are preserved byte-for-byte. **No compilation, test discovery or execution.**

| Scenario | Immutable frontend source line | Specific source behavior |
|---|---|---|
| TDASH-044 | DashboardPage.tsx:648 | Nullable master-data count remains unavailable rather than zero |
| TDASH-045 | DashboardPage.tsx:829 | Absent shipments summary suppresses shipment KPI cards |
| TDASH-046 | DashboardPage.tsx:878 | Absent alerts summary suppresses critical/unresolved KPI cards |
| TDASH-047 | DashboardPage.tsx:869 | Absent stock summary suppresses low-stock KPI card |
| TDASH-048 | DashboardPage.tsx:860 | Partial outbound KPI appears only for positive partial count |
| TDASH-049 | DashboardPage.tsx:903 | Incomplete checklist renders completion fraction and done markers |
| TDASH-050 | DashboardPage.tsx:969 | Health progress width clamps large service values to 100% |
| TDASH-051 | DashboardPage.tsx:969 | Health progress width clamps negative service values to 0% |
| TDASH-052 | DashboardPage.tsx:951 | Health-service error is scoped inside dashboard rather than hiding shell |
| TDASH-053 | DashboardPage.tsx:762 | Depletion data sorts by numeric risk score and limits six |
| TDASH-054 | DashboardPage.tsx:1090 | Null depletion coverage renders unknown dash |
| TDASH-055 | DashboardPage.tsx:1084 | Depletion consumption prefers classified recent consumption |
| TDASH-056 | DashboardPage.tsx:1084 | Depletion consumption falls back to outbound quantity |
| TDASH-057 | DashboardPage.tsx:1065 | Incomplete demand history uses coverage fallback zero and no location warning without missing-location quantity |
| TDASH-058 | DashboardPage.tsx:769 | Reorder rows sort by positive numeric reorder quantity and limit six |
| TDASH-059 | DashboardPage.tsx:773 | Nonpositive reorder quantities filtered out before rendering action queue |
| TDASH-060 | DashboardPage.tsx:1180 | Null reorder coverage shown as unknown dash |
| TDASH-061 | DashboardPage.tsx:1174 | Classified reorder daily consumption overrides legacy usage |
| TDASH-062 | DashboardPage.tsx:1174 | Absent classified daily consumption falls back to legacy usage |
| TDASH-063 | DashboardPage.tsx:1192 | Procurement recommendation link encodes product ID |
| TDASH-064 | DashboardPage.tsx:779 | Normal anomaly tier exclusion is case-insensitive |
| TDASH-065 | DashboardPage.tsx:780 | Anomalies preserve server ordering and limit to six |
| TDASH-066 | DashboardPage.tsx:1406 | Classified recent/baseline daily consumption takes precedence |
| TDASH-067 | DashboardPage.tsx:1397 | Incomplete anomaly history displays classified coverage |
| TDASH-068 | DashboardPage.tsx:1327 | Unlinked alert fallback, acknowledgement and escalation metadata |
| TDASH-069 | DashboardPage.tsx:1518 | Supplier performance shows five separately sourced counts |
| TDASH-070 | DashboardPage.tsx:1230 | Missing product name in low-stock record shows historical placeholder |
| TDASH-071 | DashboardPage.tsx:497 | Activity change formatting preserves positive/negative/zero signs |
| TDASH-072 | DashboardPage.tsx:1467 | Absent historical product/unit/location/actor placeholders remain explicit |
| TDASH-073 | DashboardPage.tsx:364 | Recognized customer return reference and condition are safe to display |
| TDASH-074 | DashboardPage.tsx:373 | Customer return reference is only shown when format validated |
| TDASH-075 | DashboardPage.tsx:429 | Proven receipt normalizes shipment source reference to business label |
| TDASH-076 | DashboardPage.tsx:419 | Unclassified legacy movement cannot infer receipt from reason |
| TDASH-077 | DashboardPage.tsx:391 | Stock transfer evidence collapses to business-facing event |
| TDASH-078 | DashboardPage.tsx:395 | Outbound dispatch audit key is rendered as order label |

Only render-level assumptions are asserted with synthetic intercepted GET responses. Server health/reorder/depletion computations, pagination, authorization, tenant isolation and database behavior remain unproven. Source-review anchors point to the original immutable frontend ZIP, not a modified application. Runtime behavior is entirely untested.
