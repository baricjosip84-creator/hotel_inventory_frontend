#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, condition: Boolean(condition) });

const page = read('src/pages/PurchaseOrdersPage.tsx');
const tenantAudit = read('src/pages/TenantAuditPage.tsx');
const pkg = read('package.json');

// F-0072 — Purchase Order embedded audit no longer hard-stops at 50 rows.
check('embedded audit has paged response type', page.includes('type TenantAuditPageResponse = {'));
check('embedded audit page size is explicit', page.includes('const PURCHASE_ORDER_AUDIT_PAGE_SIZE = 100;'));
check('full-history export page size is explicit', page.includes('const PURCHASE_ORDER_AUDIT_EXPORT_PAGE_SIZE = 500;'));
check('audit request is scoped to purchase order', page.includes("entity_type: 'purchase_order'") && page.includes('entity_id: id'));
check('audit request uses server page mode', page.includes("response_mode: 'page'"));
check('audit request preserves full metadata evidence', page.includes("metadata_mode: 'full'") && !page.includes("metadata_mode: 'summary'"));
check('search is sent to backend', page.includes("if (search.trim()) params.set('search', search.trim());"));
check('visible audit query keys include search and page', page.includes("['purchase-order', 'audit', selectedId, auditSearch.trim(), auditPageIndex]"));
check('visible audit fetch uses page API', page.includes('fetchPurchaseOrderAuditPage(selectedId as string, auditSearch, auditPageIndex)'));
check('audit total uses server summary', page.includes('fetchPurchaseOrderAuditSummary') && page.includes('auditSummaryQuery.data?.total_events'));
check('old local 50-row fetch is gone', !page.includes("limit: '50'") && !page.includes('fetchPurchaseOrderAudit(id: string): Promise<TenantAuditRow[]>'));
check('old client-only audit filtering is gone', !page.includes("const term = auditSearch.trim().toLowerCase();"));
check('page navigation state exists', page.includes('const [auditPageIndex, setAuditPageIndex] = useState(0);'));
check('search or selection resets audit page', page.includes('setAuditPageIndex(0);') && page.includes('[selectedId, auditSearch]'));
check('UI exposes complete-result range', page.includes("ui('{start}–{end} of {total}')"));
check('UI exposes previous audit page', page.includes('setAuditPageIndex((page) => Math.max(0, page - 1))'));
check('UI exposes next audit page', page.includes('setAuditPageIndex((page) => page + 1)'));
check('next audit page respects server has_more', page.includes('const auditHasMore = Boolean(auditQuery.data?.has_more);'));
check('full audit loader walks every page', page.includes('async function fetchAllPurchaseOrderAudit') && page.includes('while (true)'));
check('full audit loader stops only at end/empty page', page.includes('if (!page.has_more || !page.rows.length) break;'));
check('CSV export loads complete matching audit', /exportSelectedPurchaseOrderAuditCsv[\s\S]{0,380}fetchAllPurchaseOrderAudit/.test(page));
check('print loads complete matching audit', /printSelectedPurchaseOrderAudit[\s\S]{0,420}fetchAllPurchaseOrderAudit/.test(page));
check('audit summary shows full matching count', page.includes('<summary>{ui("Audit history")} <span>{auditTotalEvents}'));
check('tenant audit page still has previous and next navigation', tenantAudit.includes('goToPreviousPage') && tenantAudit.includes('goToNextPage'));

check('audit and summary invalidation helper exists', page.includes('const invalidatePurchaseOrderAudit = useCallback') && page.includes("['purchase-order', 'audit-summary', purchaseOrderId]"));
check('draft updates refresh embedded audit and total', /updateMutation[\s\S]{0,900}invalidatePurchaseOrderAudit\(updated\.id\)/.test(page));
check('lifecycle actions refresh embedded audit and total', /actionMutation[\s\S]{0,900}invalidatePurchaseOrderAudit\(updated\.id\)/.test(page));
check('supplier send refreshes embedded audit and total', /sendPurchaseOrderToSupplierMutation[\s\S]{0,2400}invalidatePurchaseOrderAudit\(selectedId\)/.test(page));

check('v147 checker wired into frontend CI chain', pkg.includes('check:simulation-audit-trail-completeness-v349147'));

let passed = 0;
for (const item of checks) {
  if (item.condition) { passed += 1; console.log(`PASS ${item.name}`); }
  else console.error(`FAIL ${item.name}`);
}
console.log(`v3.49.147 audit trail completeness frontend: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
