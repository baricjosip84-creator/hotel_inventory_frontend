import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '..');
const page = readFileSync(process.env.FT165_PAGE_SOURCE || path.join(root, 'src/pages/ShipmentsPage.tsx'), 'utf8');
const api = readFileSync(path.join(root, 'src/lib/actionFeedback.ts'), 'utf8');
const providers = readFileSync(path.join(root, 'src/app/AppProviders.tsx'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const ast = ts.createSourceFile('ShipmentsPage.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let count = 0;
const check = (label, f) => { f(); console.log(`PASS ${String(++count).padStart(2, '0')} ${label}`); };

let config;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'receiveShipmentMutation') {
    const arg = node.initializer?.arguments?.[0];
    if (arg && ts.isObjectLiteralExpression(arg)) {
      const value = (name) => arg.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(ast) === name)?.initializer.getText(ast);
      config = { onSuccess: value('onSuccess'), onError: value('onError') };
    }
  }
  ts.forEachChild(node, visit);
}
visit(ast);

check('FE page parses as real TypeScript/TSX', () => assert.equal(ast.parseDiagnostics.length, 0));
check('Actual receiving mutation has success and failure callbacks', () => assert.ok(config?.onSuccess && config?.onError));
check('Actual receive API skips generic mutation toast', () => assert.match(page, /async function receiveShipmentLine\([\s\S]*?skipMutationFeedback: true[\s\S]*?\n\}/));
check('Explicit toast appears only inside server success handler', () => {
  assert.match(config.onSuccess, /showTenantActionSuccess\(receiptMessage\)/);
  assert.equal((page.match(/showTenantActionSuccess\(/g) || []).length, 1);
});
check('Failure handler offers visible error toast', () => assert.match(config.onError, /showTenantActionError\(receiveErrorMessage\)/));
check('Existing inline receipt message remains', () => assert.match(config.onSuccess, /setPageMessage\(receiptMessage\)/));
check('Standard feedback event is used, not a new ad hoc toast', () => {
  assert.match(api, /function showTenantActionSuccess\(message: string\)/);
  assert.match(api, /function showTenantActionError\(message: string/);
  assert.match(api, /TENANT_MUTATION_FEEDBACK_EVENT/);
});
check('Global toast container is fixed to viewport, not inline', () => {
  assert.match(providers, /toastRegion: \{\s*position: 'fixed'/);
  assert.match(providers, /bottom: '24px'/);
  assert.match(providers, /window\.addEventListener\(TENANT_MUTATION_FEEDBACK_EVENT, handleTenantFeedback\)/);
});
check('FT165 regression registered in npm', () => assert.equal(pkg.scripts['check:ft165-shipment-receiving-visible-toast'], 'node scripts/check-ft165-shipment-receiving-visible-toast.mjs'));
check('Other shipment mutations remain independently governed', () => assert.match(page, /const finalizeShipmentMutation = useMutation\(/));

function makeHarness() {
  const events = [], queries = [], banners = [], errors = [];
  class ApiError extends Error {}
  const env = {
    shipmentItems: [{ product_id: 'product-1', product_name: 'Mineral Water 0.50L' }],
    selectedShipmentId: 'shipment-1', selectedShipment: { purchase_order_id: 'po-1' },
    formatShipmentQuantity: (x) => String(x),
    ui: (text) => text,
    ApiError,
    showTenantActionSuccess: (message) => events.push({ type: 'success', message }),
    showTenantActionError: (message) => events.push({ type: 'error', message }),
    setPageMessage: (message) => banners.push(message),
    setPageError: (message) => errors.push(message),
    queryClient: {
      refetchQueries: async (value) => queries.push(['refetch', ...value.queryKey]),
      invalidateQueries: async (value) => queries.push(['invalidate', ...value.queryKey])
    }
  };
  const success = vm.runInNewContext(`(${config.onSuccess})`, env);
  const failure = vm.runInNewContext(`(${config.onError})`, env);
  return { success, failure, events, queries, banners, errors, ApiError };
}

const response = { purchase_order_id: 'po-1', linked_purchase_order_receiving_summary: { received_quantity: 1, ordered_quantity: 36 } };
const variables = { item: { product_id: 'product-1', quantity_received: 1 } };
const h = makeHarness();
await h.success(response, variables);
check('Actual successful receiving shows exactly one global toast', () => assert.equal(h.events.filter((x) => x.type === 'success').length, 1));
check('Toast contains real product and received quantity', () => assert.match(h.events[0].message, /Mineral Water 0\.50L \+1 received into stock/));
check('Toast contains 1 / 36 PO progress', () => assert.match(h.events[0].message, /PO progress: 1 \/ 36 received/));
check('Inline message matches toast exactly', () => assert.equal(h.events[0].message, h.banners.find((x) => x?.includes('received into stock'))));
check('Success clears prior page error', () => assert.equal(h.errors[0], null));
check('Receipt refreshes both shipment and PO reads', () => {
  assert(h.queries.some((x) => x.includes('shipments')));
  assert(h.queries.some((x) => x.includes('purchase-orders')));
  assert(h.queries.some((x) => x.includes('stock')));
});
const h2 = makeHarness();
await h2.success({ purchase_order_id: null, linked_purchase_order_receiving_summary: null }, { item: { product_id: 'product-1', quantity_received: 2 } });
check('Unlinked shipment also toasts correctly, without invented PO progress', () => {
  assert.equal(h2.events.length, 1);
  assert.match(h2.events[0].message, /\+2 received into stock/);
  assert.doesNotMatch(h2.events[0].message, /PO progress:/);
});
const h3 = makeHarness();
await h3.failure(new h3.ApiError('A saved quantity conflicts with this receipt'));
check('Backend receive failure shows one error toast, not success', () => {
  assert.equal(h3.events.length, 1);
  assert.deepEqual(h3.events[0], { type: 'error', message: 'A saved quantity conflicts with this receipt' });
  assert.equal(h3.errors.at(-1), 'A saved quantity conflicts with this receipt');
  assert.equal(h3.banners.at(-1), null);
});
const h4 = makeHarness();
await h4.failure(new Error('connection lost'));
check('Unexpected receive failure emits truthful generic error, not success', () => {
  assert.equal(h4.events.length, 1);
  assert.equal(h4.events[0].type, 'error');
  assert.equal(h4.events[0].message, 'Failed to receive shipment item.');
});
console.log(`FT165 receiving success/error visible toast regression: ${count}/${count} PASS`);
