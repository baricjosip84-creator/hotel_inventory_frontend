# Batch 180 — Tenant Alerts immutable source-to-scenario review

35 new declarations `TALERT-054..088` appended to the existing Alerts spec. **No compilation, discovery, execution, browser or API acceptance.** All source anchors refer to the unchanged original FE archive.

| Scenario | Source line | Exact observed source branch |
|---|---|---|
| TALERT-054 | AlertsPage.tsx:241 | Transfer family takes precedence over stock fallback |
| TALERT-055 | AlertsPage.tsx:245 | Reservation routes to its specific source workspace |
| TALERT-056 | AlertsPage.tsx:249 | Requisition routes to its specific source workspace |
| TALERT-057 | AlertsPage.tsx:253 | Damage family links to exact usage review anchor |
| TALERT-058 | AlertsPage.tsx:253 | Waste family links to damage/waste usage anchor |
| TALERT-059 | AlertsPage.tsx:257 | Usage family routes to inventory usage |
| TALERT-060 | AlertsPage.tsx:257 | Consumption family routes to inventory usage |
| TALERT-061 | AlertsPage.tsx:237 | PO prefix is interpreted as purchase-order domain |
| TALERT-062 | AlertsPage.tsx:261 | Purchase-order name family linked to PO workspace |
| TALERT-063 | AlertsPage.tsx:261 | Procurement category linked to PO workspace |
| TALERT-064 | AlertsPage.tsx:265 | Supplier workflow precedes stock fallthrough |
| TALERT-065 | AlertsPage.tsx:269 | Execution tasks have a dedicated source workflow |
| TALERT-066 | AlertsPage.tsx:273 | System health blocking family routes to admin system |
| TALERT-067 | AlertsPage.tsx:237 | Non-PO over-receipt branches into shipments |
| TALERT-068 | AlertsPage.tsx:237 | Explicit PO exclusion from shipment over-receipt branch |
| TALERT-069 | AlertsPage.tsx:233 | Shipment branch precedes available stock fallback |
| TALERT-070 | AlertsPage.tsx:278 | Stock key safely URL-encoded for source navigation |
| TALERT-071 | AlertsPage.tsx:282 | Product key safely URL-encoded for source navigation |
| TALERT-072 | AlertsPage.tsx:286 | Unlinked alert gets generic Action Center fallback |
| TALERT-073 | AlertsPage.tsx:707 | No product linkage has an explicit safe label |
| TALERT-074 | AlertsPage.tsx:707 | Linked ID with absent product name is not misrepresented as unlinked |
| TALERT-075 | AlertsPage.tsx:708 | Known storage location is included in card metadata |
| TALERT-076 | AlertsPage.tsx:738 | Missing stock source suppresses unreliable numeric grid |
| TALERT-077 | AlertsPage.tsx:728 | Resolved alert suppresses now-stale current stock condition |
| TALERT-078 | AlertsPage.tsx:718 | Info severity does not render a blocking status |
| TALERT-079 | AlertsPage.tsx:224 | Suffix alone does not imply critical operational blocker |
| TALERT-080 | AlertsPage.tsx:720 | Critical non-reserved alert uses operational blocker label |
| TALERT-081 | AlertsPage.tsx:224 | Resolved records cannot remain active operational blockers |
| TALERT-082 | AlertsPage.tsx:801 | Acknowledged row cannot be acknowledged again |
| TALERT-083 | AlertsPage.tsx:760 | Acknowledged owner name fallback is explicit |
| TALERT-084 | AlertsPage.tsx:766 | Missing escalation timestamp reports un-escalated evidence |
| TALERT-085 | AlertsPage.tsx:766 | Recorded escalation timestamp replaces not-escalated fallback |
| TALERT-086 | AlertsPage.tsx:771 | Absent resolution timestamp shown as unknown |
| TALERT-087 | AlertsPage.tsx:775 | No fabricated resolution-note panel when note is empty |
| TALERT-088 | AlertsPage.tsx:751 | Current-state system alerts are auto-closed and cannot be manually resolved |

Cross-source evidence: `frontend/src/lib/alertPresentation.ts` governs current-state auto-resolution. The existing `tests/tenant/alerts/alerts.spec.ts` fixture supplies a disposable signed-in tenant and **intercepts GET /alerts**. Synthetic alert families do NOT prove real backend emission, permissions, route destination access, data persistence, SLA propagation, cross-tenant isolation or product acceptance.
