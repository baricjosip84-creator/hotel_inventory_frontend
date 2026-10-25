/* FT176 / Products Cost Controls — regression against the production
   ReferenceError: ui is not defined, observed on /products.
   Uses the real StatusBadge function extracted from the TSX source. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const file = path.join(root, 'src/pages/products/productSummaryComponents.tsx');
const source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let functionText;
for (const statement of ast.statements) {
  if (ts.isFunctionDeclaration(statement) && statement.name?.text === 'StatusBadge') {
    functionText = statement.getText(ast);
  }
}
assert.ok(functionText, 'StatusBadge must remain available to Cost Controls');
const compiled = ts.transpileModule(functionText, { compilerOptions: {
  module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.ReactJSX,
  target: ts.ScriptTarget.ES2022
}});
function callBadge(status, detail) {
  const output = { exports: {} };
  let hookCalls = 0;
  const ctx = {
    module: output,
    exports: output.exports,
    require: (id) => {
      assert.equal(id, 'react/jsx-runtime');
      return { jsx: (component, props) => ({ component, props }), jsxs: (component, props) => ({ component, props }) };
    },
    useAppTranslation: () => { hookCalls++; return { ui: (key) => `LOCALIZED:${key}` }; },
    getProductStatusTone: (s) => s === 'ready' ? 'good' : 'warn',
    styles: {
      badge: { display: 'inline-flex' },
      statusBadgeGood: { color: 'green' },
      statusBadgeWarn: { color: 'orange' },
      statusBadgeBad: {},
      statusBadgeNeutral: {}
    },
    formatStatusLabel: (s) => s || 'Unknown'
  };
  vm.runInNewContext(compiled.outputText, ctx, { filename: file, timeout: 5000 });
  const badge = output.exports.StatusBadge({ status, detail });
  assert.equal(hookCalls, 1, 'Translation hook must be initialized within StatusBadge');
  return badge;
}
const normal = callBadge('ready');
assert.equal(normal.component, 'span');
assert.equal(normal.props.children[0], 'LOCALIZED:ready');
assert.equal(normal.props.children[1], '');
const withDetail = callBadge('review', 5);
assert.equal(withDetail.props.children[0], 'LOCALIZED:review');
assert.equal(withDetail.props.children[1], ' · 5');
// Verify the same status component is actually rendered by Cost Controls views.
for (const name of ['ProductCostGovernanceSummaryPanel.tsx','ProductCostOperationsSummaryPanel.tsx']) {
  const body = fs.readFileSync(path.join(root, 'src/pages/products',name), 'utf8');
  assert.match(body, /<StatusBadge\b/, `${name} must still render StatusBadge`);
}
console.log('FT176: StatusBadge renders localized status and detail without ReferenceError — PASS (4 checks)');
