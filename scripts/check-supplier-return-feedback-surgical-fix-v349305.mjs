import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = read('src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const helpers = read('src/components/enterpriseInventory/EnterpriseInventoryRequests.ts');
const api = read('src/lib/api.ts');
const translations = read('src/i18n/tenantUiTranslations.ts');
const invoice = read('src/components/enterpriseInventory/EnterpriseInventoryWorkflowMutations.ts');
const pkg = JSON.parse(read('package.json'));
const lifecycle = src.match(/const lifecycleMutation = useMutation\(\{[\s\S]*?\n  \}\);/u)?.[0] ?? '';
const create = src.match(/const createReturnMutation = useMutation\(\{[\s\S]*?\n  \}\);/u)?.[0] ?? '';
const createCredit = src.match(/const createCreditMutation = useMutation\(\{[\s\S]*?\n  \}\);/u)?.[0] ?? '';
const creditLifecycle = src.match(/const creditLifecycleMutation = useMutation\(\{[\s\S]*?\n  \}\);/u)?.[0] ?? '';
const checks = [];
function check(msg, condition) {
  const ok = Boolean(condition);
  checks.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`);
}
// Exercise the actual TypeScript request helpers with a stubbed API transport: prove defaults,
// HTTP method, optimistic version and JSON body are unchanged for other callers.
const converted = ts.transpileModule(helpers, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const calls = [];
const exports = {};
const sandbox = { exports, require: (id) => {
  if (id === '../../lib/api') return {
    apiMutationRequest: async (p, options) => { calls.push({ p, options }); return { ok: true }; },
    apiDownloadFile: () => null,
  };
  throw new Error(`Unexpected require ${id}`);
}};
vm.runInNewContext(converted.outputText, sandbox, { timeout: 5000 });
const eq = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
await exports.postEnterpriseInventoryRequest('/other', { qty: 2 });
check('Ordinary POST still has POST method, JSON body and default toast behavior', eq({ ...calls.at(-1).options }, { method: 'POST', body: '{"qty":2}' }));
await exports.postEnterpriseInventoryRequest('/return', { qty: 1 }, { skipMutationFeedback: true });
check('Return POST can suppress only the generic API toast', calls.at(-1).options.skipMutationFeedback === true && calls.at(-1).options.method === 'POST' && calls.at(-1).options.body === '{"qty":1}');
await exports.patchEnterpriseInventoryRequest('/other', { tax: 0 }, 8);
check('Ordinary PATCH retains optimistic version, JSON payload and default toast behavior', eq({ ...calls.at(-1).options }, { method: 'PATCH', version: 8, body: '{"tax":0}' }));
await exports.patchEnterpriseInventoryRequest('/credit', { tax: 1 }, 9, { skipMutationFeedback: true });
check('Credit PATCH opt-out retains version, body and HTTP method', eq({ ...calls.at(-1).options }, { method: 'PATCH', version: 9, body: '{"tax":1}', skipMutationFeedback: true }));
await exports.postEnterpriseInventoryVersionedRequest('/other', 11, { reason: 'yes' });
check('Other versioned POST retains default toast and optimistic version', eq({ ...calls.at(-1).options }, { method: 'POST', version: 11, body: '{"reason":"yes"' + '}' }));
await exports.postEnterpriseInventoryVersionedRequest('/return/dispatch', 12, undefined, { skipMutationFeedback: true });
check('Return versioned POST can suppress generic toast without changing version', eq({ ...calls.at(-1).options }, { method: 'POST', version: 12, skipMutationFeedback: true }));
check('Shared API still emits success notifications for all calls without opt-out', api.includes('!(options as SafeMutationRequestInit).skipMutationFeedback'));
check('Creating a supplier return keeps received-lot identity, quantity and serial numbers', create.includes('inventory_lot_id: item.inventory_lot_id') && create.includes('quantity: item.quantity') && create.includes('serial_numbers: item.serial_numbers'));
check('Create return opts out and retains dedicated business message', create.includes('}, { skipMutationFeedback: true })') && create.includes("ui('Supplier return {returnNumber} created as a draft.')"));
check('Return lifecycle keeps approval / reject authorization endpoint', lifecycle.includes("'/enterprise-inventory/approvals/execute'") && lifecycle.includes("entity_type: 'supplier_return'") && lifecycle.includes("action === 'approve' ? 'approved' : 'rejected'"));
check('Return approval/rejection removes only generic toast', lifecycle.includes('comment: reason || null,') && lifecycle.includes('          { skipMutationFeedback: true },'));
check('Return cancel retains reason, version and targeted feedback opt-out', lifecycle.includes('/supplier-returns/${item.id}/cancel') && lifecycle.includes("reason: reason?.trim() || ''") && /reason: reason\?\.trim\(\) \|\| '' \},\s*\{ skipMutationFeedback: true \}/u.test(lifecycle));
check('Submit / dispatch / complete retain their original dynamic endpoint and version', lifecycle.includes('`/enterprise-inventory/supplier-returns/${item.id}/${action}`') && lifecycle.includes('item.version,\n        undefined,\n        { skipMutationFeedback: true }'));
check('Return action-specific success messages survive all six lifecycle actions', ['submitted', 'approved', 'rejected', 'dispatched', 'completed', 'cancelled'].every(w => lifecycle.includes(`{returnNumber} ${w} successfully.`)));
check('Return error handling and original query refresh remain', lifecycle.includes("normalizeError(mutationError, ui('Failed to update supplier return.')") && lifecycle.includes('await refreshReturnData()'));
check('Return page exposes exactly one page-level result banner', src.includes('{message ? <div style={styles.success}>{message}</div> : null}') && src.includes('{error ? <div style={styles.error}>{error}</div> : null}'));
check('Credit creation retains original invoice linkage and selected original return lines', createCredit.includes('supplier_invoice_id: selectedCreditInvoice?.id') && createCredit.includes('supplier_return_item_ids: creditReturnItemIds'));
check('Creating expected supplier credit removes generic toast and keeps accurate message', createCredit.includes('{ skipMutationFeedback: true }') && createCredit.includes('Supplier return credit expectation created successfully.'));
check('Credit expectation correction retains PATCH / version / payload', creditLifecycle.includes('patchEnterpriseInventoryRequest<SupplierReturnCredit>(`${base}/expected`, payload, credit.version, { skipMutationFeedback: true })'));
check('Credit note / settle / waive retain versioned endpoints, body and opt-out', creditLifecycle.includes('postEnterpriseInventoryVersionedRequest<SupplierReturnCredit>(`${base}/${action === \'credit_note\' ? \'credit-note\' : action}`, credit.version, payload, { skipMutationFeedback: true })'));
check('Credit actions preserve their four exact business results', ['Supplier return credit expectation updated.', 'Supplier credit note recorded.', 'Supplier return credit settled.', 'Supplier return credit expectation waived.'].every(label => creditLifecycle.includes(label)));
check('Credit lifecycle preserves errors and data refresh', creditLifecycle.includes('await refreshReturnData()') && creditLifecycle.includes("ui('Failed to update supplier return credit reconciliation.')"));
check('Return refresh still invalidates invoice, stock, movements, audit and notifications', ['enterprise-supplier-invoices', 'enterprise-stock-overview', 'enterprise-stock-movements', 'enterprise-notifications', 'enterprise-audit'].every(k => src.includes(`'${k}'`)));
check('Return credit matching still requires receipt or purchase-order provenance', src.includes('shipment_item_id') && src.includes('purchase_order_id') && src.includes('findCreditInvoiceLine'));
check('Supplier invoice Batch 066 lifecycle opt-out remains unchanged', invoice.includes('{ skipMutationFeedback: true }') && invoice.includes('const supplierInvoiceLifecycleMutation = useMutation('));
check('Translated six return status messages are preserved', ['submitted', 'approved', 'rejected', 'dispatched', 'completed', 'cancelled'].every(w => translations.includes(`Supplier return {returnNumber} ${w} successfully.`)));
check('Credit business result translations are present', ['Supplier return credit expectation created successfully.', 'Supplier credit note recorded.', 'Supplier return credit settled.'].every(s => translations.includes(s)));
check('Supplier Returns permissions and destructive confirmations remain visible', src.includes('TENANT_PERMISSIONS.SUPPLIER_RETURNS_WRITE') && src.includes('TENANT_PERMISSIONS.APPROVALS_EXECUTE') && src.includes('TENANT_PERMISSIONS.SUPPLIER_RETURNS_DISPATCH') && src.includes('window.confirm(prompts[action])'));
check('Batch 067 test is registered', pkg.scripts?.['check:inventory-supplier-return-feedback-v349305'] === 'node scripts/check-supplier-return-feedback-surgical-fix-v349305.mjs');
const passed = checks.filter(Boolean).length;
console.log(`Supplier returns feedback surgical fix: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exitCode = 1;
