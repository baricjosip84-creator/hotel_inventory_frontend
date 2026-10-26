/* FT194: Supplier Returns runtime regression and safety/behavior assertions.
 * Runs against the actual TSX, using local React/query substitutes and no API or writes.
 * The original FE286 crash must be reproduced; FE288 must render safely for
 * pending mutation, valid and invalid quantity, and read-only permissions. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const filename = path.join(root, 'src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const source = fs.readFileSync(filename, 'utf8');
const expression = "!canWrite || lineQuantityState !== 'ready' || createReturnMutation.isPending";
const broken = '  const addReturnLineDisabled = !canWrite || createReturnMutation.isPending || lineQuantityState !== \'ready\';\n';
const hook = '  const createReturnMutation = useMutation({';

function render(tsSource, { qty = '1', pending = false, canWrite = true, selectedLot = 'lot1' } = {}) {
  const transpiled = ts.transpileModule(tsSource, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `TSX transpilation reported ${errors.length} errors`);
  let stateIndex = 0;
  let mutationIndex = 0;
  let queryIndex = 0;
  const lot = {
    inventory_lot_id: 'lot1', supplier_id: 'supplier1', supplier_name: 'Supplier D',
    product_name: 'Crasssh Peanuts 60g', storage_location_name: 'Main Warehouse',
    returnable_quantity: 3, unit_cost: 1, unit_cost_currency: 'EUR', condition: 'available',
    lot_number: 'batch1', serial_tracking_enabled: false, serial_numbers: [],
  };
  const react = {
    useMemo: cb => cb(),
    useState: initial => {
      const idx = stateIndex++;
      return [idx === 0 ? selectedLot : idx === 1 ? qty : initial, () => {}];
    },
  };
  const createElement = (type, props) => ({ type, props });
  const mocks = id => {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { Fragment: Symbol('fragment'), jsx: createElement, jsxs: createElement };
    if (id === '@tanstack/react-query') return {
      useQueryClient: () => ({ invalidateQueries: async () => {} }),
      useQuery: () => ({ data: queryIndex++ === 2 ? [lot] : [], isLoading: false, isError: false }),
      useMutation: options => ({ isPending: mutationIndex++ === 0 && pending, mutate: () => {}, options }),
    };
    if (id.includes('permissions')) return {
      TENANT_PERMISSIONS: new Proxy({}, { get: (_, prop) => String(prop) }),
      hasPermission: key => key === 'SUPPLIER_RETURNS_WRITE' ? canWrite : true,
    };
    if (id.endsWith('I18nContext')) return { useAppTranslation: () => ({ locale: 'en', ui: x => x }) };
    if (id.endsWith('sidebarAttentionItems')) return { useOperationalAttentionItems: () => ({ data: {} }) };
    if (id.endsWith('tenantCurrency')) return { getActiveTenantCurrency: () => 'EUR' };
    if (id.endsWith('formatters')) return {
      formatLocalizedCurrency: v => String(v), formatLocalizedDate: v => String(v),
      formatLocalizedDateTime: v => String(v), formatLocalizedNumber: v => String(v),
    };
    if (id.endsWith('EnterpriseInventoryStyles')) return { styles: new Proxy({}, { get: () => ({}) }) };
    if (id.endsWith('serialNumbers')) return { parseSerialNumbersInput: () => [] };
    return new Proxy({}, { get: (_, prop) => prop === '__esModule' ? true : () => {} });
  };
  const exports = {};
  vm.runInNewContext(transpiled.outputText, {
    require: mocks, exports, window: {}, console, Date, Set, Number, String, Boolean,
  }, { filename: 'SupplierReturnsTab.test-transpile.cjs', timeout: 4000 });
  const tree = exports.SupplierReturnsTab();
  assert.ok(tree && tree.props, 'Supplier Returns should mount and return JSX');
  assert.equal(mutationIndex, 4, 'all four original mutation hooks initialized in place');
  const find = (node) => {
    if (node == null || typeof node !== 'object') return undefined;
    if (Array.isArray(node)) return node.map(find).find(Boolean);
    if (node.props?.['aria-describedby'] === 'supplier-return-line-readiness') return node;
    return find(node.props?.children);
  };
  const button = find(tree);
  assert.ok(button, 'Add return line button must render');
  return button.props.disabled;
}

assert.ok(source.includes(hook), 'original mutation hook retained');
assert.equal(source.includes('const addReturnLineDisabled'), false, 'never define a render-time binding depending on a pending hook');
assert.equal(source.split(expression).length - 1, 2, 'button disabled and styling use exact same post-hook predicate');
const previousBug = source.replace(hook, broken + hook);
assert.throws(() => render(previousBug), /before initialization/, 'regression MUST reproduce the FE286 TDZ crash');
assert.equal(render(source), false, 'valid quantity + writable + idle enables Add return line');
assert.equal(render(source, { pending: true }), true, 'pending mutation disables Add return line');
assert.equal(render(source, { qty: '5' }), true, 'quantity beyond lot limit disables Add return line');
assert.equal(render(source, { qty: '0' }), true, 'zero quantity disables Add return line');
assert.equal(render(source, { selectedLot: '' }), true, 'no lot disables Add return line');
assert.equal(render(source, { canWrite: false }), true, 'read-only user cannot add return lines');
console.log('FT194 PASS: previous TDZ crash reproduced; FE288 mount succeeds; valid/pending/over-limit/zero/unselected/read-only controls correct; four mutations retained.');
