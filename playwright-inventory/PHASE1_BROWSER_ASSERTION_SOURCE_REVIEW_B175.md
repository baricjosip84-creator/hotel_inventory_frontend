# Batch 175 — Tenant Stock Transfers source-backed browser assertions

**30 new, unexecuted Playwright declarations (TSTR-051–080)**, appended to the existing spec, not a replacement. Original frontend and backend archives remain immutable.

- **TSTR-051** — Changing the source location requests its scoped product availability options — `frontend/src/pages/StockTransfersPage.tsx:386`; backend: GET /options with source_storage_location_id. No runtime acceptance claimed.
- **TSTR-052** — Selecting destination disables that same location as a source choice — `frontend/src/pages/StockTransfersPage.tsx:1202`; backend: Location validation occurs server-side separately. No runtime acceptance claimed.
- **TSTR-053** — Source locations explicitly marked ineligible cannot be selected — `frontend/src/pages/StockTransfersPage.tsx:1202`; backend: Location eligibility is validated again server-side. No runtime acceptance claimed.
- **TSTR-054** — A selected source location cannot also be chosen as the destination — `frontend/src/pages/StockTransfersPage.tsx:1221`; backend: Location validation occurs server-side separately. No runtime acceptance claimed.
- **TSTR-055** — Item-row add and remove preserves the required last row — `frontend/src/pages/StockTransfersPage.tsx:1338`; backend: POST/PATCH transfer items validation. No runtime acceptance claimed.
- **TSTR-056** — Product selector blocks selecting the same product twice in one draft — `frontend/src/pages/StockTransfersPage.tsx:1299`; backend: Duplicate product is validated server-side. No runtime acceptance claimed.
- **TSTR-057** — Transfer notes expose the source-defined 4,000 character limit — `frontend/src/pages/StockTransfersPage.tsx:1237`; backend: POST/PATCH notes schema validation. No runtime acceptance claimed.
- **TSTR-058** — Cancellation reason exposes the source-defined 1,000 character limit — `frontend/src/pages/StockTransfersPage.tsx:1699`; backend: POST /:id/cancel reason schema. No runtime acceptance claimed.
- **TSTR-059** — Blank optional notes are sent as null, not whitespace — `frontend/src/pages/StockTransfersPage.tsx:413`; backend: POST / stock transfer create. No runtime acceptance claimed.
- **TSTR-060** — Serial input trims and deduplicates comma/newline-separated entries — `frontend/src/pages/StockTransfersPage.tsx:228`; backend: POST / stock transfer create. No runtime acceptance claimed.
- **TSTR-061** — Decimal quantity on a serial-tracked base unit is rejected before POST — `frontend/src/pages/StockTransfersPage.tsx:861`; backend: POST / create serial constraints. No runtime acceptance claimed.
- **TSTR-062** — Duplicate serial numbers do not satisfy the requested unit count — `frontend/src/pages/StockTransfersPage.tsx:862`; backend: POST / create serial constraints. No runtime acceptance claimed.
- **TSTR-063** — Source stock/lot disagreement blocks creating a draft before any mutation — `frontend/src/pages/StockTransfersPage.tsx:855`; backend: POST / create reconciled-stock rule. No runtime acceptance claimed.
- **TSTR-064** — Source products marked non-transferable are disabled in the selector — `frontend/src/pages/StockTransfersPage.tsx:1294`; backend: GET /options source stock response. No runtime acceptance claimed.
- **TSTR-065** — Source-specific option failure warns and blocks the form submit — `frontend/src/pages/StockTransfersPage.tsx:842`; backend: GET /options failure. No runtime acceptance claimed.
- **TSTR-066** — Whitespace-only cancellation reason is submitted as null after confirmation — `frontend/src/pages/StockTransfersPage.tsx:452`; backend: POST /:id/cancel. No runtime acceptance claimed.
- **TSTR-067** — Cancel API rejection preserves draft controls and displays its error — `frontend/src/pages/StockTransfersPage.tsx:761`; backend: POST /:id/cancel rejection. No runtime acceptance claimed.
- **TSTR-068** — Draft detail CSV exports without requiring a movement-audit request — `frontend/src/pages/StockTransfersPage.tsx:668`; backend: GET /:id detail. No runtime acceptance claimed.
- **TSTR-069** — Executed transfer with unknown category renders historical-category fallback — `frontend/src/pages/StockTransfersPage.tsx:244`; backend: GET /:id detail. No runtime acceptance claimed.
- **TSTR-070** — Detail with missing historical product name does not invent current product identity — `frontend/src/pages/StockTransfersPage.tsx:235`; backend: GET /:id detail. No runtime acceptance claimed.
- **TSTR-071** — Executed transfer without recorded operator uses historical actor fallback — `frontend/src/pages/StockTransfersPage.tsx:237`; backend: GET /:id detail. No runtime acceptance claimed.
- **TSTR-072** — System-owned enterprise cancellation marker is human-readable — `frontend/src/pages/StockTransfersPage.tsx:219`; backend: GET /:id detail. No runtime acceptance claimed.
- **TSTR-073** — Appended cancellation reason is not duplicated in visible transfer notes — `frontend/src/pages/StockTransfersPage.tsx:305`; backend: GET /:id detail. No runtime acceptance claimed.
- **TSTR-074** — Unreconciled stock/lot execution preview exposes a specific readiness label — `frontend/src/pages/StockTransfersPage.tsx:270`; backend: GET /:id/availability. No runtime acceptance claimed.
- **TSTR-075** — Changed base unit requires a draft review before execution — `frontend/src/pages/StockTransfersPage.tsx:268`; backend: GET /:id/availability. No runtime acceptance claimed.
- **TSTR-076** — Changed serial-tracking rules block execution and show the review guidance — `frontend/src/pages/StockTransfersPage.tsx:269`; backend: GET /:id/availability. No runtime acceptance claimed.
- **TSTR-077** — Missing available/remaining quantity prints unavailable instead of zero — `frontend/src/pages/StockTransfersPage.tsx:192`; backend: GET /:id/availability. No runtime acceptance claimed.
- **TSTR-078** — Executed transfer without audit movements signals support review but permits evidence export — `frontend/src/pages/StockTransfersPage.tsx:1022`; backend: GET /:id/movements. No runtime acceptance claimed.
- **TSTR-079** — Zero-result CSV export retains column headers and reports zero rows — `frontend/src/pages/StockTransfersPage.tsx:947`; backend: GET / list export. No runtime acceptance claimed.
- **TSTR-080** — A failed CSV retrieval reports an error without creating an export — `frontend/src/pages/StockTransfersPage.tsx:961`; backend: GET / list export failure. No runtime acceptance claimed.
