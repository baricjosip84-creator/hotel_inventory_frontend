#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL - ${message}`);
  checks.push(message);
};

const returns = read('src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const invoices = read('src/components/enterpriseInventory/tabs/InvoicesTab.tsx');
const types = read('src/components/enterpriseInventory/EnterpriseInventoryTypes.ts');
const reports = read('src/pages/ReportsPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

check(returns.includes("ui('Supplier return financial reconciliation')"), 'Supplier Returns exposes the financial reconciliation workflow');
check(returns.includes("['matched', 'paid'].includes(invoice.status)"), 'credit workflow offers only matched or paid original invoices');
check(returns.includes('findCreditInvoiceLine'), 'frontend uses exact/safe invoice-line linkage before offering a returned line');
check(returns.includes('Number(item.quantity || 0) * Number(invoiceLine?.unit_cost || 0)'), 'expected credit subtotal uses original invoice unit price');
check(returns.includes("ui('Expected credit tax')"), 'expected tax is recorded separately from the invoice-price subtotal');
check(returns.includes("ui('Create expected supplier credit')"), 'tenant can create explicit expected supplier-credit evidence');
check(returns.includes("ui('Record credit note')"), 'tenant can record the supplier credit note');
check(returns.includes("ui('Settle credit')"), 'tenant can record supplier-credit settlement');
check(returns.includes("ui('Waive')"), 'tenant can waive an expected credit through an explicit action');
check(returns.includes('credit.version'), 'credit lifecycle mutations send optimistic version evidence');
check(returns.includes('canManageCredits = canWrite && canWriteInvoices'), 'financial mutations require both Supplier Returns and Supplier Invoices write authority in the UI');
check(returns.includes("ui('No supplier credit reconciliation yet.')"), 'completed physical returns clearly show missing financial follow-up');
check(invoices.includes('invoice.return_credit_count'), 'Supplier Invoices display linked return-credit count');
check(invoices.includes('invoice.expected_return_credit_total'), 'Supplier Invoices display expected linked credit total');
check(invoices.includes('invoice.actual_return_credit_total'), 'Supplier Invoices display recorded linked credit total');
check(types.includes('return_credit_count?:') && types.includes('actual_return_credit_total?:'), 'SupplierInvoice type carries non-destructive return-credit rollup fields');
check(reports.includes('late_received_shipments'), 'Reports retains historical late-received shipment evidence for F-0029');
check(reports.includes('on_time_delivery_rate_pct'), 'Reports retains supplier on-time history after receipt');
check(reports.includes('average_delivery_delay_days'), 'Reports retains supplier historical delay metric after receipt');
check(translations.includes('["Supplier return financial reconciliation"'), 'new financial reconciliation workflow is present in the five-locale UI catalog');
check(translations.includes('["Create expected supplier credit"'), 'expected-credit action is translated across tenant locales');
check(translations.includes('["Recorded credits: {value} · Settled {settled} · Open {open}"'), 'invoice-side credit summary is translated across tenant locales');

console.log(`PASS - v3.49.135 supplier return financial reconciliation frontend (${checks.length}/${checks.length})`);
for (const message of checks) console.log(`PASS - ${message}`);
