# PLCR-084 — still NEEDS_EXPECTATION; final source contract review in Batch 161

Original immutable frontend: `frontend/src/pages/PlatformLegalComplianceReportingPage.tsx`.
- Line 185: query key includes `selectedSource`, search and offset.
- Line 186: queryFn constructs the backend report request from selected source.
- Line 273: Evidence source `<select>` updates `selectedSource` immediately; **no disabled prop** exists on that control.
- Line 275: Apply button alone has `disabled={query.isFetching}`.

Original B150 expectation "Source select disabled while service request is in flight" **conflicts with current JSX**. This is a product decision, not a missing source/test path. No source-backed expectation lets us assert either "always enabled" or "must be disabled" as desired UX.

**Decision gate**: Product owner chooses (A) disable selector while in-flight, or (B) permit changes with defined latest-response/cancellation and transitional behavior. Until code and acceptance criteria align, keep PLCR-084 as `NEEDS_EXPECTATION` and do not author an invented passing test. The existing PLCR-101–106 remain separate, unchanged.

No app/backend/Playwright execution or source modifications in Batch 161.
