# Batch 175 — Outstanding source and acceptance gaps

- `PLCR-084` remains NEEDS_EXPECTATION (1); no product-behavior decision invented.
- 417 blocked obligations remain BLOCKED across platform and tenant acceptance.
- 272 partial feature records remain SOURCE_TRACED_PARTIAL and require runtime acceptance.
- 357 labelled skips remain deferred; 21 unconditional and 3 permission-dependent extra skip calls preserved.
- Stock transfer synthetic identifiers (`pw-*`) are not backend-valid UUIDs; intercepted GET/POST/PATCH checks only establish frontend request construction and UI state. They cannot verify posting transactions, protection of reserved stock, security, concurrency, tenant isolation, or DB consistency.
- A failed CSV interception establishes error rendering, not that an actual backend download fails.
- No frontend/backend code modified, no actual tests compiled or executed, no servers or real browser started.
