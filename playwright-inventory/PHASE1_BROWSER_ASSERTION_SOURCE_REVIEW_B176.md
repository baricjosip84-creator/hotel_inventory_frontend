# Batch 176 — Tenant Stock source-to-assertion review

20 new, uncompiled, unexecuted `TST-051` through `TST-070` browser declarations in the existing Stock spec. Each scenario has one individual original frontend expression and independent ledger/feature inventory ID.

| Scenario | Source line | Group | Actual browser expectation |
|---|---|---|---|
| TST-051 | StockPage.tsx:741 | Search by unit | Product-unit text returns its matching position |
| TST-052 | StockPage.tsx:742 | Search by product ID | Product ID is searchable separately from display name |
| TST-053 | StockPage.tsx:743 | Search by location ID | Location ID is searchable separately from display name |
| TST-054 | StockPage.tsx:740 | Search by category | Category text searches positions |
| TST-055 | StockPage.tsx:747 | Search result precedence | Name prefix matches appear before substring matches |
| TST-056 | StockPage.tsx:413 | Search normalization | Whitespace-only input is not an active search filter |
| TST-057 | StockPage.tsx:709 | Filter conjunction | Location, category and integrity-risk filters intersect |
| TST-058 | StockPage.tsx:731 | Filter empty state | Incompatible category and status filters show zero then reset |
| TST-059 | StockPage.tsx:679 | Location options | Location selectors are sorted by displayed location label |
| TST-060 | StockPage.tsx:692 | Category options | Category selectors are deduplicated and alphabetized |
| TST-061 | StockPage.tsx:2037 | Legacy display fallbacks | Blank product and location labels render explicit fallbacks |
| TST-062 | StockPage.tsx:704 | Product deep link | Product deep link retains multiple location positions |
| TST-063 | StockPage.tsx:704 | Deep-link intersection | Mismatched product and stock IDs yield no selected position |
| TST-064 | StockPage.tsx:700 | Unresolved deep link | Unknown stock deep link gives no rows, clear restores |
| TST-065 | StockPage.tsx:1464 | Unrelated query preservation | Clearing stock deep link preserves unrelated URL parameters |
| TST-066 | StockPage.tsx:2015 | Over-reservation risk | Over-reservation is visibly distinct and eligible for reservation-risk filter |
| TST-067 | StockPage.tsx:2027 | Mismatch precedence | Mismatch badge wins over low-stock visual badge while both filters match |
| TST-068 | StockPage.tsx:385 | No usable lot evidence | Positive on-hand with zero usable lots is still no usable stock |
| TST-069 | StockPage.tsx:358 | Effective minimum override | Explicit effective minimum overrides product-level minimum |
| TST-070 | StockPage.tsx:401 | Usable-free authority | Server-provided usable_free_quantity overrides naive free calculation |

The original frontend and backend are immutable. API interception with synthetic rows establishes only local UI assertions; no compilation, execution, DB or production acceptance.
