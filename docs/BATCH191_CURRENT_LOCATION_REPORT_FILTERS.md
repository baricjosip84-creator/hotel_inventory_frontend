# Batch 191 — Reports location picker distinction

Inventory Valuation, Stock by Location, Low Stock and Expiry Risk now show only
active storage-location names. Historical Reports (Movement Ledger, Count Variance,
Stock Transfers, Usage Summary) continue to show current plus historical names.
The new `current_locations` API field is optional for backwards-compatible rollout.
This is a source-code fix, not a claim of deployed acceptance.
