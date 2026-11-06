# Batch 158 — Platform Capacity Planning partial feature source-behavior review

39 existing `SOURCE_PARTIAL` feature records inspected at actual FE control/handler and BE Joi/route anchors. This is stricter than Batch 157 file-presence reconciliation. **All 39 stay SOURCE_PARTIAL** because Playwright has not been compiled/run, and service authorization/DB-state behavior has not been executed.

| Feature | FE / backend source anchors | What is visible in immutable code |
|---|---|---|
| `PLT-CAP-042` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:79`; `backend/src/routes/platform/capacityPlanning.js:117` | Form defaults exist; backend requires name and frontend guards empty name/unit |
| `PLT-CAP-043` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:193`; `backend/src/routes/platform/capacityPlanning.js:117` | Client whitespace name disables POST; server also requires name |
| `PLT-CAP-044` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:197`; `backend/src/routes/platform/capacityPlanning.js:62` | Name and unit trimmed in frontend payload and Joi normalization |
| `PLT-CAP-045` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:299`; `backend/src/routes/platform/capacityPlanning.js:62` | Name max 200 and unit max 80 are rendered attributes and route schema bounds |
| `PLT-CAP-046` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:191`; `backend/src/routes/platform/capacityPlanning.js:68` | Client finite nonnegative checks and nonnegative route schema present |
| `PLT-CAP-047` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:188`; `backend/src/routes/platform/capacityPlanning.js:72` | Frontend integer warning bounds and route integer 1..100 bound |
| `PLT-CAP-048` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:190`; `backend/src/routes/platform/capacityPlanning.js:74` | Client also enforces warning less than critical; per-field Joi bounds |
| `PLT-CAP-049` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:198`; `backend/src/routes/platform/capacityPlanning.js:72` | Payload converts threshold strings to numbers and schema validates integers |
| `PLT-CAP-050` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:236`; `backend/src/routes/platform/capacityPlanning.js:66` | UI excludes archived status; server only permits mutable statuses |
| `PLT-CAP-051` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:197`; `backend/src/routes/platform/capacityPlanning.js:63` | Typed resource/environment strings from controlled select and enums |
| `PLT-CAP-052` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:201`; `backend/src/routes/platform/capacityPlanning.js:68` | Initial usage only on create; current_usage optional in POST schema |
| `PLT-CAP-053` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:199`; `backend/src/routes/platform/capacityPlanning.js:76` | Datetime converted via Date(...).toISOString and Joi ISO date checked |
| `PLT-CAP-054` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:202`; `backend/src/routes/platform/capacityPlanning.js:60` | Conditional dependency and owner references populated only with read grants |
| `PLT-CAP-055` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:202`; `backend/src/routes/platform/capacityPlanning.js:60` | Missing dependency read grant omits dependency field rather than nulling link |
| `PLT-CAP-056` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:203`; `backend/src/routes/platform/capacityPlanning.js:78` | Missing user read grant omits owner field rather than nulling link |
| `PLT-CAP-057` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:237`; `backend/src/routes/platform/capacityPlanning.js:60` | Archived deps/inactive users filtered in create selector; backend reference auth needs live testing |
| `PLT-CAP-058` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:210`; `backend/src/routes/platform/capacityPlanning.js:117` | Success clears creation form and emits feedback after mutation success |
| `PLT-CAP-059` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:213`; `backend/src/routes/platform/capacityPlanning.js:117` | Create error leaves form in state and shows backend error message |
| `PLT-CAP-060` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:246`; `backend/src/routes/platform/capacityPlanning.js:120` | Edit loads toForm and excludes current usage from ordinary details update |
| `PLT-CAP-061` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:304`; `backend/src/routes/platform/capacityPlanning.js:120` | Edit hides initial usage; backend PATCH explicitly forbids usage field |
| `PLT-CAP-062` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:201`; `backend/src/routes/platform/capacityPlanning.js:120` | PATCH carries config/thresholds/notes but omits current_usage |
| `PLT-CAP-063` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:213`; `backend/src/routes/platform/capacityPlanning.js:120` | PATCH error visible and editor not cleared in onError branch |
| `PLT-CAP-064` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:210`; `backend/src/routes/platform/capacityPlanning.js:120` | PATCH success resets edit state and clears form |
| `PLT-CAP-065` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:250`; `backend/src/routes/platform/capacityPlanning.js:123` | Record usage initializes separate editor from resource snapshot |
| `PLT-CAP-066` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:217`; `backend/src/routes/platform/capacityPlanning.js:68` | Usage POST sends usage and limit without status unless overridden |
| `PLT-CAP-067` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:218`; `backend/src/routes/platform/capacityPlanning.js:66` | Only nonempty status override sent, from mutable options |
| `PLT-CAP-068` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:254`; `backend/src/routes/platform/capacityPlanning.js:76` | Usage editor validates finite nonnegative values and date |
| `PLT-CAP-069` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:221`; `backend/src/routes/platform/capacityPlanning.js:123` | Successful usage update resets separate usage editor |
| `PLT-CAP-070` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:213`; `backend/src/routes/platform/capacityPlanning.js:123` | Usage failure leaves editor mounted and reports error |
| `PLT-CAP-071` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:350`; `backend/src/routes/platform/capacityPlanning.js:123` | Cancel usage only hides editor and has no write operation |
| `PLT-CAP-072` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:354`; `backend/src/routes/platform/capacityPlanning.js:134` | Native confirmation rejection does not call mutation |
| `PLT-CAP-073` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:225`; `backend/src/routes/platform/capacityPlanning.js:134` | Archive uses empty JSON body matched to empty Joi body |
| `PLT-CAP-074` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:226`; `backend/src/routes/platform/capacityPlanning.js:134` | Archive invalidates registry; default query omits archived rows (later runtime proof) |
| `PLT-CAP-075` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:213`; `backend/src/routes/platform/capacityPlanning.js:134` | Archive error keeps row in state and prints error |
| `PLT-CAP-076` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:155`; `backend/src/routes/platform/capacityPlanning.js:96` | Filter-change dependency resets page offset via effect |
| `PLT-CAP-077` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:261`; `backend/src/routes/platform/capacityPlanning.js:99` | Refresh requests same active GET and no mutation |
| `PLT-CAP-078` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:239`; `backend/src/routes/platform/capacityPlanning.js:99` | Initial GET failure displays blocking message with Retry |
| `PLT-CAP-079` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:240`; `backend/src/routes/platform/capacityPlanning.js:99` | Refresh stale snapshot renders error warning if cached data exists |
| `PLT-CAP-080` | `frontend/src/pages/PlatformCapacityPlanningPage.tsx:122`; `backend/src/routes/platform/capacityPlanning.js:117` | Runtime role enforcement and committed SQL audit require separate acceptance |

## Outstanding partial features

- 39 Platform Capacity Planning partials now have direct FE/BE behavior anchors, still not passed.
- 233 remaining partials (Products 3; Adaptive Policy Engine 30; Probabilistic Forecasting 50; Cross-Domain Optimization 50; Enterprise Collaboration 50; Digital Twin 50) require same direct handler/assertion review.
- Next work: inspect each remaining partial feature against actual UI interaction, test assertion and backend route/service; avoid defaulting all partials to complete on file existence.
- Explicit route guards and Joi schemas still do **not** prove DB, row locks, returned HTTP status, real browser UI behavior, or external evidence.
