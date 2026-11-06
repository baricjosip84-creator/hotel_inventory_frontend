# Batch 171 — Unresolved audit acceptance gaps

1. Backend authorization, tenant isolation, true audit durability, data chronology and row-level redaction require isolated Phase 2 API/DB acceptance. Intercepted GET requests cannot establish server enforcement.
2. `GET /audit/export.csv` writes an `audit.export_csv` log event on the backend (`backend/src/routes/audit.js`); new `TAUD-072` checks only browser-triggered refetch after a synthetic CSV and must not be counted as proof the audit event was logged.
3. Source-only fixtures use synthetic UUID-shaped audit event IDs and mock tenant/user identifiers; this is not a valid production tenant fixture or evidence of permission enforcement.
4. All **417** blocked ledger obligations, **272** partial feature acceptance records, **357** scenario-labelled skips, 21 additional unconditional + 3 role-dependent skip calls and `PLCR-084` remain open. No blocker was closed and no skip promoted.
5. Static JavaScript/TS syntax source review and archive integrity are not TypeScript compilation or runnable/browser test proof. Phase 1 is incomplete.
