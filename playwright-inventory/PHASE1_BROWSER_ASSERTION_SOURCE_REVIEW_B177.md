# Batch 177 — Tenant Shipments, source-to-assertion review

26 new page-specific browser declarations `TSH-051` through `TSH-076` added to the existing shipment spec; 50 prior shipment declarations preserved. All UI expectations linked to immutable frontend source.

| Scenario | Source anchor | Behavior |
|---|---|---|
| TSH-051 | ShipmentsPage.tsx:1254 | supplier_id is part of the registry search haystack |
| TSH-052 | ShipmentsPage.tsx:1256 | purchase_order_id is searched separately from linked order number |
| TSH-053 | ShipmentsPage.tsx:1262 | delivery_date participates in the search haystack |
| TSH-054 | ShipmentsPage.tsx:1261 | status participates in the search haystack |
| TSH-055 | ShipmentsPage.tsx:1245 | search input is trimmed before filtering |
| TSH-056 | ShipmentsPage.tsx:2635 | shipment reference falls back to No shipment reference |
| TSH-057 | ShipmentsPage.tsx:2649 | supplier display falls back to supplier ID |
| TSH-058 | ShipmentsPage.tsx:2650 | retired supplier warning in registry; detail at 2947 |
| TSH-059 | ShipmentsPage.tsx:2653 | missing linked PO displays dash and no selected PO notice |
| TSH-060 | ShipmentsPage.tsx:2911 | linked purchase order notice falls back to purchase_order_id |
| TSH-061 | ShipmentsPage.tsx:565 | unknown status replaces underscores and capitalizes words |
| TSH-062 | ShipmentsPage.tsx:651 | status label for missing value returns dash; filter is exact match |
| TSH-063 | ShipmentsPage.tsx:1273 | unrecognized statuses sort after pending/partial/received |
| TSH-064 | ShipmentsPage.tsx:638 | invalid date falls back to unchanged original value |
| TSH-065 | ShipmentsPage.tsx:638 | missing date renders dash |
| TSH-066 | ShipmentsPage.tsx:2659 | line count falls back to zero |
| TSH-067 | ShipmentsPage.tsx:1266 | unknown status excluded by status filter while All accepts it |
| TSH-068 | ShipmentsPage.tsx:1281 | page-count and slice boundaries handle 100-per-page |
| TSH-069 | ShipmentsPage.tsx:1288 | page size change resets page 1 |
| TSH-070 | ShipmentsPage.tsx:2580 | search input maxLength 255 |
| TSH-071 | ShipmentsPage.tsx:2984 | advanced shipment details expose full ID version and QR |
| TSH-072 | ShipmentsPage.tsx:1170 | no line items prevents finalization despite summary header |
| TSH-073 | ShipmentsPage.tsx:1159 | persisted nonblank discrepancy reason allows incomplete line finalization |
| TSH-074 | ShipmentsPage.tsx:1160 | trimmed blank discrepancy reason blocks finalization |
| TSH-075 | ShipmentsPage.tsx:3543 | retired product indicator renders in line card |
| TSH-076 | ShipmentsPage.tsx:3543 | missing product_name falls back to product_id |

This is static code and fixture review only. Synthetic intercepted API responses do NOT prove shipment posting, stock quantity, email, permissions, actual tenant isolation or database transactions.
