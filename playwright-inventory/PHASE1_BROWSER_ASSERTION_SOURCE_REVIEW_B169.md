# Batch 169 — Tenant Settings source-backed browser assertions

**STRICT PHASE 1 ONLY.** 26 new non-skipped, uncompiled and unrun scenario declarations (`TSET-046..071`) in the original tenant settings spec. No previous assertions or tenant application code altered.

The original frontend `TenantSettingsPage.tsx` and backend `routes/tenants.js` plus `validations/tenants.validation.js` were read directly from the immutable application ZIPs. Every new scenario has individual source-line anchors in the accompanying CSV.

- **046–050**: reverting a draft, whitespace normalization to null, trimmed organization/supplier identity, and distinct contact payload keys.
- **051–056**: organization/legal/email source maxlength boundaries and currency uppercasing/invalid-code rejection before mock PUT.
- **057–059**: clearing season dates to null, dynamic season end minimum, and unsaved draft status separate from the persisted overview.
- **060–064**: organizational display normalization, default facility and approval separation, and legacy currency confirmation/reset.
- **065–071**: saved response in overview, payment terms retention, refresh re-enablement, clearing old feedback on next edit, undoing a governance draft, and a write-locked form's distinct controls.

**Important gap:** the existing test fixture uses tenant ID `pw-tenant-settings-01`. That is intentionally intercepted and **does not meet the backend's UUID validation** (`tenants.validation.js`). These 26 scenarios establish *test intent* for browser-local behavior only. A later authorized Phase 2 with valid disposable tenant IDs is necessary to verify real API validation, authorization, tenant isolation, concurrent writes, currency financial evidence and persistence. No tests were compiled or run and no original source was changed.
