# Batch 167 — Tenant Users source-backed browser scenario review

**Phase 1 static authoring only.** 26 previously absent `TUSR-051`–`TUSR-076` declarations added to the existing page-organized Tenant Users lifecycle spec. Scenario-level frontend line anchors, corresponding backend route/validation references, categories and evidence limitations are in the accompanying CSV.

- **TUSR-051–056:** combined filters, role-label precedence, stable summary counts, safe legacy active/date fallbacks.
- **TUSR-057–062:** unsaved form tab navigation, read-only role-query gating, current-account assignment immutability, password/session warning copy and multi-admin role UI.
- **TUSR-063–068:** four distinct server field-error mappings, correcting a rejected role, and clearing stale API errors after cancellation.
- **TUSR-069–076:** completed synthetic create/edit UI transitions, destructive confirmation copy, exactly-10-character password boundary and custom-to-built-in assignment payload.

**Fixture refinement:** existing `setup()` now optionally accepts synthetic rows and error code/message overrides while preserving old default rows and default error responses. This enables checking real rendering and `ApiError` field mapping without reaching a tenant mutation endpoint.

**Not proven:** real authorization, collision handling, account ownership, session revocation, tenant retention, optimistic concurrency, database commit, email uniqueness, or tests compiling/running. All formerly authored declarations, skips, blocked obligations and pending decisions remain intact.
