# Batch 168 — Tenant Roles & Permissions source-backed scenarios

Phase 1 only: **28 newly authored `TPER-051..078` declarations** appended to the existing tenant permissions lifecycle spec. See the accompanying CSV for individual source anchors, backend contracts, and evidence limitations. No duplicate lifecycle IDs or spec files.

- `051–056`: whitespace-only new-role protection, 80-character name, 500-character description, blank-template/null payload, trimmed and empty optional description.
- `057–062`: unchanged metadata lock, 80-character edit name counter, description-only PATCH, cleared description, blank role name, rejected metadata PATCH with editable form retained.
- `063–066`: one-character/reserved/whitespace duplicate-name boundaries, rejected duplication preserving the selected role.
- `067–072`: inactive-role presentation, zero/singular/plural active assignment guidance, historical-assignment restrictions, and reactivation note.
- `073–076`: rejected custom role policy save, reset, deactivation and deletion remain visible and local UI state remains available.
- `077–078`: dependency cascade when withdrawing `products.read`, and filtered group action avoiding unrelated rights.

**Source:** Original frontend `TenantPermissionsPage.tsx`, `RolePermissionEditor.tsx`; original backend `routes/permissions.js`, `PermissionPolicyService` and `TenantCustomRoleService`. Browser mocks confirm only frontend presentation/state and outbound payload construction. Server-side authorization, tenant isolation, transaction locking, revision races, storage effects, and production UI remain unverified.
