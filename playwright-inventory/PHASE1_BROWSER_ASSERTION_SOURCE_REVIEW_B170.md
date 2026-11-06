# Batch 170 — 23 source-anchored Tenant Storage Locations assertions

All 23 declarations are in the pre-existing Tenant Storage Locations spec (`TSL-041..063`) and have corresponding new ledger/feature rows. See companion CSV for their individual frontend source spans. Source archives were read-only.

Main evidence boundaries: API calls are fulfilled by synthetic routes; UUID-shaped fixture IDs are not proof of server access; no database writes or permission checks were exercised. Backend POST/PATCH/DELETE have write guards, transaction guards, and PATCH/DELETE revision matching that remain Phase 2.

Source review focused on form-derived POST/PATCH payloads, custom condition transitions, directory URL utilities, duplicate detection, sorting, update error/success handling, and native retire confirmation. The new assertions were **not** compiled or run.
