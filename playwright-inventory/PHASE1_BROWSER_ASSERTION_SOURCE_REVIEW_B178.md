# Batch 178 — Tenant Purchase Orders source-to-browser review

30 additional read-only browser scenarios, `TPO-051..TPO-080`, appended to the existing Purchase Orders spec without changing prior declarations. **No compilation or execution.**

| Scenario | Immutable frontend line | Specific code behavior |
|---|---|---|
| TPO-051 | PurchaseOrdersPage.tsx:408 | Invalid sort key falls back to created_desc |
| TPO-052 | PurchaseOrdersPage.tsx:418 | Only 10,25,50,100 page sizes are accepted |
| TPO-053 | PurchaseOrdersPage.tsx:413 | Nonintegral page becomes page one |
| TPO-054 | PurchaseOrdersPage.tsx:413 | Negative page becomes page one |
| TPO-055 | PurchaseOrdersPage.tsx:734 | Created ascending sorting uses parsed creation date |
| TPO-056 | PurchaseOrdersPage.tsx:735 | Expected ascending sorting puts absent delivery date last |
| TPO-057 | PurchaseOrdersPage.tsx:736 | Expected descending sorting uses absent date as timestamp zero |
| TPO-058 | PurchaseOrdersPage.tsx:737 | Cost descending uses Number() numeric comparison |
| TPO-059 | PurchaseOrdersPage.tsx:738 | Cost ascending normalizes absent estimated cost to zero |
| TPO-060 | PurchaseOrdersPage.tsx:739 | Most received sort uses numeric receiving percent |
| TPO-061 | PurchaseOrdersPage.tsx:740 | Least received sort treats absent percent as zero |
| TPO-062 | PurchaseOrdersPage.tsx:2777 | Page-size 100 option displays all available client records |
| TPO-063 | PurchaseOrdersPage.tsx:1378 | Page size changes reset current page to one |
| TPO-064 | PurchaseOrdersPage.tsx:1258 | Attention prioritization filters actions, sorts and limits to five |
| TPO-065 | PurchaseOrdersPage.tsx:1262 | Equal-priority attention orders sort by expected date |
| TPO-066 | PurchaseOrdersPage.tsx:2464 | Attention item selects its order and navigates detail workspace |
| TPO-067 | PurchaseOrdersPage.tsx:1258 | Nonactionable none states omitted from attention list |
| TPO-068 | PurchaseOrdersPage.tsx:2450 | Overdue quick action filters on delivery_status=overdue |
| TPO-069 | PurchaseOrdersPage.tsx:2451 | Due-today quick action filters on delivery_status=due_today |
| TPO-070 | PurchaseOrdersPage.tsx:2452 | Receive shortcut filters on receive_open_shipment |
| TPO-071 | PurchaseOrdersPage.tsx:2453 | Approve shortcut filters on approve_or_cancel |
| TPO-072 | PurchaseOrdersPage.tsx:2450 | Quick delivery filter preserves other criteria and clears conflicting next action |
| TPO-073 | PurchaseOrdersPage.tsx:2484 | Individual active-filter chip clears only its own key |
| TPO-074 | PurchaseOrdersPage.tsx:2490 | Clear-all resets all filter fields |
| TPO-075 | PurchaseOrdersPage.tsx:1279 | Unknown deep-linked supplier ID has an explicit chip fallback |
| TPO-076 | PurchaseOrdersPage.tsx:1332 | Clear-only-date-filters leaves nondate filters unchanged |
| TPO-077 | PurchaseOrdersPage.tsx:1304 | Expected-today preset creates same from/to date |
| TPO-078 | PurchaseOrdersPage.tsx:1316 | Date preset clears prior date filters before selecting a new range |
| TPO-079 | PurchaseOrdersPage.tsx:762 | List-analysis totals aggregate numeric quantities across returned rows |
| TPO-080 | PurchaseOrdersPage.tsx:2736 | Breakdown status chip sets canonical status filter |

Frontend source was inspected from the immutable original archive; the test fixture uses a read-only GET interception. Backend sorting/filtering, purchase order persistence/approval, vendor delivery, authorization, tenant isolation and database transactionality are NOT verified. No earlier blocked or partial acceptance item is closed.
