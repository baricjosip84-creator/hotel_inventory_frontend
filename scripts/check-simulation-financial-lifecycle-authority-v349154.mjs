#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const expect = (condition, message) => { if (!condition) throw new Error(message); checks.push(message); };

const permissions = read('src/lib/permissions.ts');
const invoices = read('src/components/enterpriseInventory/tabs/InvoicesTab.tsx');
const mutations = read('src/components/enterpriseInventory/EnterpriseInventoryWorkflowMutations.ts');
const returns = read('src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const tabs = read('src/components/enterpriseInventory/EnterpriseInventoryTabConfig.ts');
const layout = read('src/layouts/AppLayout.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = read('package.json');

expect(permissions.includes("INVOICES_MATCH: 'invoices.match'"), 'frontend permission catalog includes invoice match');
expect(permissions.includes("INVOICES_MARK_PAID: 'invoices.mark_paid'"), 'frontend permission catalog includes mark paid');
expect(invoices.includes('const canMatchInvoices = hasPermission(TENANT_PERMISSIONS.INVOICES_MATCH);'), 'invoice page separately evaluates match authority');
expect(invoices.includes('const canMarkInvoicesPaid = hasPermission(TENANT_PERMISSIONS.INVOICES_MARK_PAID);'), 'invoice page separately evaluates payment authority');
expect(invoices.includes("action === 'match' ? canMatchInvoices : action === 'pay' ? canMarkInvoicesPaid : canWriteInvoices"), 'lifecycle action authorization is split by business responsibility');
expect(invoices.includes("window.prompt(ui('Payment reference'), '')"), 'mark-paid action asks for payment evidence without calling it optional');
expect(invoices.includes('if (!paymentReference?.trim()) return;'), 'empty payment reference cannot be submitted from the UI');
expect(invoices.includes('TENANT_PERMISSIONS.INVOICES_MATCH'), 'match button exposes its dedicated permission requirement');
expect(invoices.includes('TENANT_PERMISSIONS.INVOICES_MARK_PAID'), 'pay button exposes its dedicated permission requirement');
expect(mutations.includes("? { payment_reference: paymentReference?.trim() || '' }"), 'payment mutation sends the explicit payment-reference field');
expect(tabs.includes("[TENANT_PERMISSIONS.INVOICES_MATCH]"), 'invoice tab action capability includes match permission');
expect(tabs.includes("[TENANT_PERMISSIONS.INVOICES_MARK_PAID]"), 'invoice tab action capability includes payment permission');
expect(layout.includes('canMatchSupplierInvoicesForAttention'), 'sidebar attention checks invoice matching capability');
expect(layout.includes('canMarkSupplierInvoicesPaidForAttention'), 'sidebar attention checks payment capability');

expect(returns.includes("if (!reason?.trim()) return;"), 'supplier-return cancel prompt rejects empty reason');
expect(returns.includes("{ reason: reason?.trim() || '' }"), 'supplier-return cancel request no longer sends nullable reason');
expect(returns.includes("item.cancellation_reason ? <div style={styles.helper}>{ui('Cancelled: {reason}')"), 'cancelled supplier return displays its cancellation reason');
expect(translations.includes('["Payment reference",'), 'payment-reference label is covered by all tenant locales');
expect(pkg.includes('check:simulation-financial-lifecycle-authority-v349154'), 'v154 checker is wired into frontend package scripts');

console.log(`v3.49.154 financial lifecycle authority: ${checks.length}/${checks.length} PASS`);
