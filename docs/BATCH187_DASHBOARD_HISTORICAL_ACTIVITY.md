# Batch 187 — Dashboard Recent Activity historical evidence

- Recent Activity now displays an unclassified stored movement as **Unproven legacy movement**, even when its `movement_type` or reason implies receipt/usage. This matches Stock Movements behavior from Batch 186.
- An unclassified row's raw reason remains visible as evidence; it is not translated into a confirmed operational event.
- The UI uses existing localized historical-unavailable labels when the backend has no movement-time product name, unit, location, or actor snapshot. Those NULLs are intentional and must not be replaced with mutable current data.
- `npm run check:batch187-dashboard-historical-classification` executes actual Dashboard helper functions for proven/unproven movements and verifies fallback presentation.
- No stock quantities, database records, migrations, routes or permission controls changed.
- This is an offline source/test correction, not deployed-browser or PostgreSQL acceptance.
