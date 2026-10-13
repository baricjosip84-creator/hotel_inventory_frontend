# Batch 186 — Unclassified legacy movement display (source fix)

## Actual bug
Backend097 now includes stored `movement_kind`. Frontend176 only respected `unclassified` for movement_type stock_count/manual_adjustment/other, so it incorrectly displayed other unclassified legacy movements (e.g. `shipment_receive`, `usage`) as fully proven receipts or consumption. Legacy `movement_type` may come from old classification; migration527 only reclassifies `usage` when change is negative and `shipment_receive` when change is positive. Rows failing proof retain `unclassified`.

## Change
Frontend177 StockMovementsPage's existing `movementTypeFromRow` treats **any** persisted `movement_kind === 'unclassified'` as `unproven_legacy`, before checking movement_type or old free-form reason. This powers the table badge and Export Filtered CSV; it does not mutate quantities, costs, classifications, history, filters, permissions, migrations or database data. Proven `receipt`, `consumption`, `transfer`, `adjustment` and count classifications retain their existing displayed movement_type. Null kind still has backward-compatible fallback, not a synthetic upgrade.

## Evidence
New script `scripts/check-batch186-unclassified-movement-display.cjs` reproducibly fails on pristine Frontend176 (unclassified shipment receipt incorrectly labelled) and passes Frontend177, 28/28 isolated assertions. Older Backend Batch185 test was amended to match actual persisted classification semantics, and passes 16/16. Historical Batch184 contract passes 34/34. No live PostgreSQL/browser results are implied.
