/* FT193: runtime regression for Supplier Returns rendering. The previous build
 * read createReturnMutation.isPending above its useMutation initialization,
 * crashing the whole Inventory Controls page with a ReferenceError.
 * Exercise the real TSX component body with deterministic React hook stubs;
 * do not contact a backend or mutate any customer records. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const filename = path.join(root, 'src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const source = fs.readFileSync(filename, 'utf8');
const hook = '  const createReturnMutation = useMutation({';
const derived = '  const addReturnLineDisabled = !canWrite || createReturnMutation.isPending || lineQuantityState !== \'ready\';';
const renderComponent = (tsSource) => {
  const transpiled = ts.transpileModule(tsSource, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    reportDiagnostics: true,
  });
  const fatalDiagnostics = (transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(fatalDiagnostics.length, 0, ts.formatDiagnostics(fatalDiagnostics, {
    getCanonicalFileName: x => x, getCurrentDirectory: () => root, getNewLine: () => '\n',
  }));
  const react = {
    useMemo: callback => callback(),
    useState: initial => [initial, () => {}],
  };
  const mutations = [];
  const mock = (id) => {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return {
      Fragment: Symbol('fragment'), jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    };
    if (id === '@tanstack/react-query') return {
      useQueryClient: () => ({ invalidateQueries: async () => {} }),
      useQuery: () => ({ data: [], isLoading: false, isPending: false, isError: false }),
      useMutation: options => {
        const state = { isPending: false, mutate: () => {}, options };
        mutations.push(state);
        return state;
      },
    };
    if (id.includes('permissions')) return {
      TENANT_PERMISSIONS: new Proxy({}, {get: (_target, prop) => String(prop)}),
      hasPermission: () => true,
    };
    if (id.endsWith('I18nContext')) return { useAppTranslation: () => ({ locale: 'en', ui: x => x }) };
    if (id.endsWith('sidebarAttentionItems')) return { useOperationalAttentionItems: () => ({data: {}}) };
    if (id.endsWith('tenantCurrency')) return { getActiveTenantCurrency: () => 'EUR' };
    if (id.endsWith('formatters')) return {
      formatLocalizedCurrency: v => String(v), formatLocalizedDate: v => String(v),
      formatLocalizedDateTime: v => String(v), formatLocalizedNumber: v => String(v),
    };
    if (id.endsWith('EnterpriseInventoryStyles')) return { styles: new Proxy({}, {get: () => ({})}) };
    if (id.endsWith('serialNumbers')) return { parseSerialNumbersInput: () => [] };
    return new Proxy({}, {get: (_target, prop) => prop === '__esModule' ? true : () => {}});
  };
  const exports = {};
  vm.runInNewContext(transpiled.outputText, {
    require: mock, exports, window: {}, console, Set, Number, String, Boolean,
  }, { filename: 'SupplierReturnsTab.transpiled.cjs', timeout: 4000 });
  const result = exports.SupplierReturnsTab();
  assert.ok(result && result.props, 'Supplier Returns must complete initial render and return JSX');
  assert.equal(mutations.length, 4, 'all four return mutations initialized in unchanged hook order');
  return mutations;
};

assert.equal(source.split(hook).length, 2, 'unique creation mutation hook');
assert.equal(source.split(derived).length, 2, 'unique Add Return Line disabled guard');
assert.ok(source.indexOf(hook) < source.indexOf(derived),
  'pending-state expression must follow useMutation initialization');

// Confirm the regression reproducer itself catches the original FE286 bug.
const originalBrokenOrder = source.replace(derived, '').replace(hook, derived + '\n' + hook);
assert.throws(() => renderComponent(originalBrokenOrder), /before initialization/,
  'FE286 render ordering must reproduce a temporal-dead-zone ReferenceError');
renderComponent(source);
console.log('FT193: FE286 crash reproduced PASS; FE287 initial Supplier Returns mount PASS; four mutation hooks retained PASS; disabled-state ordering PASS');
