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

const outbound = read('src/pages/OutboundPage.tsx');
const reports = read('src/pages/ReportsPage.tsx');
const types = read('src/types/inventory.ts');
const data = read('src/pages/products/useProductPageData.ts');
const sections = read('src/pages/products/ProductDetailSectionsPanel.tsx');
const costPanel = read('src/pages/products/ProductCostHistoryPanel.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = read('package.json');

// F-0039 frontend — archived Product remains selectable only from historical return trace.
const traceRowBlock = outbound.match(/type TraceRow = \{[\s\S]*?\n\};/)?.[0] || '';
const orderItemBlock = outbound.match(/type OrderItem = \{[\s\S]*?\n\};/)?.[0] || '';
check('return trace type carries product archived flag', traceRowBlock.includes('product_archived?: boolean;'));
check('ordinary forward order item type does not gain archive-return-only flag', !orderItemBlock.includes('product_archived?: boolean;'));
check('selecting archived dispatch auto-routes available to quarantine', outbound.includes("selected?.product_archived && line.condition === 'available' ? 'quarantine' : line.condition"));
check('usable-stock option is disabled for archived return subject', outbound.includes('disabled={Boolean(selected?.product_archived)}'));
check('archived return line visibly labels Product archived', outbound.includes("selected.product_archived ? ` · ${ui('Archived')}` : ''"));
check('archived return warning is visible', outbound.includes("ui('This product is archived. The historical return is still allowed, but usable-stock returns are routed to quarantine and the product stays archived.')"));

// F-0076 frontend — cost-history response can carry the archived subject independently of active registry list.
check('ProductItem exposes deleted_at for read-only historical identity', types.includes('deleted_at?: string | null;'));
check('product page data exposes Product returned by history API', data.includes('costHistoryProduct: queries.costHistoryQuery.data?.product ?? queries.standardCostHistoryQuery.data?.product'));
check('detail sections forward history Product', sections.includes('costHistoryProduct={props.costHistoryProduct}'));
check('cost history panel accepts historical Product subject', costPanel.includes('costHistoryProduct?: ProductItem;'));
check('cost history panel prefers history response subject', costPanel.includes('const historySubject = costHistoryProduct ?? selectedCostProduct;'));
check('archived cost subject is labeled read-only', costPanel.includes("ui('Archived product — historical evidence remains read-only.')"));

// F-0060 frontend — historical reports clearly identify archived master records.
check('usage report row carries Product archive marker', reports.includes('product_archived?: boolean;'));
check('supplier report row carries Supplier archive marker', reports.includes('supplier_archived?: boolean;'));
check('usage report labels archived Product', reports.includes("row.product_archived ? `${ui('Archived')} · ` : ''"));
check('supplier performance labels archived Supplier', reports.includes("row.supplier_archived ? <span className=\"reports-subtext\">{ui('Archived')}</span> : null"));
check('supplier empty state no longer claims active-only scope', reports.includes('No suppliers matched these filters.') && !reports.includes('No active suppliers matched these filters.'));

// All new tenant-visible copy must exist across the five-language catalog.
for (const source of [
  'Archived product — historical evidence remains read-only.',
  'No suppliers matched these filters.',
  'This product is archived. The historical return is still allowed, but usable-stock returns are routed to quarantine and the product stays archived.'
]) {
  const rowPattern = new RegExp(`\\[\\"${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\"[^\\]]+\\]`);
  check(`translation catalog contains ${source.slice(0, 34)}`, translations.includes(`["${source}"`));
}
check('archive read-only translation has Croatian text', translations.includes('Arhivirani proizvod — povijesni dokazi ostaju samo za čitanje.'));
check('archived return warning has Croatian text', translations.includes('Povijesni povrat i dalje je dopušten'));
check('v150 checker is wired into frontend CI chain', pkg.includes('check:simulation-archive-historical-continuity-v349150'));

let passed = 0;
for (const item of checks) {
  if (item.condition) { passed += 1; console.log(`PASS ${item.name}`); }
  else console.error(`FAIL ${item.name}`);
}
console.log(`v3.49.150 archive historical continuity frontend: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
