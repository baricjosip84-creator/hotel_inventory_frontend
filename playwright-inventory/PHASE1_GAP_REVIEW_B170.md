# Batch 170 — open source and execution gaps

- Existing 417 blocked obligations unchanged; no app fix attempted.
- `PLCR-084` remains unresolved; Batch 170 has no evidence resolving its expected UX behavior.
- Storage Locations synthetic write stubs do not exercise backend `requirePermission`, tenant scoping, `requireVersion`, transaction locks, or database effects.
- The intercept fixture returns a generic `main` record after POST/PATCH and does not simulate persistence; tests assert UI and outbound payloads only.
- No Playwright compilation, discovery, browser execution or app runtime verification was performed, so locator timing and runtime behavior remain unverified.
- Existing input/URL source discrepancies elsewhere in the application remain untouched.
