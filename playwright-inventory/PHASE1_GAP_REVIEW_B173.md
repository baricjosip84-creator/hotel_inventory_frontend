# Batch 173 — Outstanding source/evidence gaps (not closed)

- **417 blocked obligations**: all kept blocked, with their existing acceptance matrix; no backend/production evidence acquired.
- **272 partial feature records**: source-traced only; none completed by adding these tests.
- **357 labelled skipped tests**, plus **21 unconditional** and **3 permission-dependent in-test skip guards** still require later accepted behavior/evidence; no skip declarations removed.
- **PLCR-084** remains NEEDS_EXPECTATION: source currently permits changing evidence source during loading; no UX decision fabricated.
- **Session ownership and revocation**: existing mocked IDs are synthetic rather than session DB primary keys. Intercepted DELETE responses cannot prove revoke semantics or cross-user guards. Backend `auth.js` explicitly guards support-session access; this is separate from source-defined UI scenarios.
- **Malformed/legacy sessions**: some new cases intentionally send undefined `is_active` or invalid date values in synthetic responses to verify the frontend fallback branches, not backend schema acceptance.
- No real browser tests, TypeScript compilation or runtime validations performed.

- **UA dotted/underscore version distinction**: original `describeDevice` browser version regex captures digits/dots only. An underscore version such as `Version/17_5` is truncated at the underscore; TSES-057 therefore tests the supported dotted form `Version/17.5` and does **not** claim underscore-version normalization. Future FE hardening/acceptance is separate.
