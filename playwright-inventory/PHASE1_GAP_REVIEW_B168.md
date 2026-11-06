# Batch 168 — Source-evidence limitations / possible contract gaps

This review does not claim any executed test failure or resolved defect.

1. `TenantPermissionsPage.tsx:443-445` tells the operator that inactive custom roles cannot be edited before reactivation. However `TenantPermissionsPage.tsx:447-455` controls metadata Save using `managing`, name validity and dirty state, not `is_active`. Confirm whether backend enforcement of inactive-role edits matches the displayed guidance in future integration acceptance; do not infer a production security bypass from this UI alone.
2. `TenantPermissionsPage.tsx:67,184-191` locally validates the role name using `trim().length >= 2` and reserved-name checks; the backend Joi `permissions.js` independently validates trimmed 2–80 characters. Phase 1 tests cover these UI/payload boundaries only; cross-tenant name uniqueness, collisions and persistence are not proven.
3. `RolePermissionEditor.tsx:180-232` performs dependency normalization in the client. The backend service must independently enforce locked/forbidden permissions and derived `read` rights. Intercepted tests cannot validate that enforcement or role membership propagation.
4. Frontend role actions use optimistic revision/version and display errors. Real concurrency handling, policy audit writes and transactional guarantees remain in existing blocked acceptance obligations; do not mark them closed.

Open pre-existing expectation `PLCR-084`, all **417** BLOCKED obligations and **272** partial acceptance features are preserved.
