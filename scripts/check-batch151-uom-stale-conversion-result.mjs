import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.BATCH151_PAGE_SOURCE || path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const backend = readFileSync(path.join(root, '../hotel-inventory-backend/src/routes/inventoryCapabilities.js'), 'utf8');
let count = 0;
function check(description, assertion) { assertion(); count++; console.log('PASS', description); }
const ast = ts.createSourceFile('InventoryCapabilitiesPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check('whole UoM TSX page parses', () => assert.equal(ast.parseDiagnostics.length, 0));
check('whole page transpiles', () => assert.equal(ts.transpileModule(source, { fileName: 'InventoryCapabilitiesPage.tsx', reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0));
const declarations = {};
const editCallbacks = {};
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['convert', 'save', 'remove', 'changeProduct'].includes(node.name.getText(ast))) declarations[node.name.getText(ast)] = node.initializer;
  if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'onChange' && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
    const body = node.initializer.expression.getText(ast);
    for (const [key, prefix] of [['quantity', 'setConvertQty(e.target.value)'], ['from unit', 'setFromUom(e.target.value)'], ['to unit', 'setToUom(e.target.value)']]) {
      if (body.includes(prefix)) editCallbacks[key] = body;
    }
  }
  ts.forEachChild(node, visit);
}
const uomNode = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'UomPanel');
visit(uomNode);
for (const key of ['convert', 'save', 'remove', 'changeProduct']) check(`${key} source callback extracted`, () => assert(declarations[key]));
for (const key of ['quantity', 'from unit', 'to unit']) check(`${key} input callback extracted`, () => assert(editCallbacks[key]));
const uom = source.slice(source.indexOf('function UomPanel('), source.indexOf('function CustomFieldsPanel('));
check('synchronous conversion generation ref is mounted within UoM component', () => assert.match(uom, /const conversionRequestSeqRef = useRef\(0\)/));
check('each Convert attempt gets its own generation', () => assert.match(uom, /onMutate: \(\) => \(\{ requestSeq: \+\+conversionRequestSeqRef\.current \}\)/));
check('success must match latest attempt before displaying a result', () => assert.match(uom, /onSuccess: \(data, _variables, context\) => \{\s*if \(context\?\.requestSeq !== conversionRequestSeqRef\.current\) return;/));
check('errors from superseded attempts cannot appear', () => assert.match(uom, /onError: \(e, _variables, context\) => \{\s*if \(context\?\.requestSeq !== conversionRequestSeqRef\.current\) return;/));
check('changing product invalidates in-flight response', () => assert.match(declarations.changeProduct.getText(ast), /conversionRequestSeqRef\.current \+= 1/));
check('save invalidates in-flight conversion', () => assert.match(declarations.save.getText(ast), /setConverted\(null\); conversionRequestSeqRef\.current \+= 1/));
check('delete invalidates in-flight conversion', () => assert.match(declarations.remove.getText(ast), /setConverted\(null\); conversionRequestSeqRef\.current \+= 1/));
for (const key of Object.keys(editCallbacks)) check(`editing ${key} invalidates in-flight response`, () => assert.match(editCallbacks[key], /setConverted\(null\); conversionRequestSeqRef\.current \+= 1/));
const js = ts.transpileModule(`const convertOptions = ${declarations.convert.arguments[0].getText(ast)};\nconst saveOptions = ${declarations.save.arguments[0].getText(ast)};\nconst removeOptions = ${declarations.remove.arguments[0].getText(ast)};\nconst changeProduct = ${declarations.changeProduct.getText(ast)};\nconst editQuantity = ${editCallbacks.quantity};\nconst editFrom = ${editCallbacks['from unit']};\nconst editTo = ${editCallbacks['to unit']};`, { fileName: 'batch151-runtime.ts', compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function scenario() {
  const ref = { current: 0 }, requests = [], converted = [], errors = [], productChanges = [], unitsChanged = [], cleared = [];
  const setConverted = value => converted.push(value);
  const setError = value => errors.push(value);
  const pendingRequests = [];
  const apiRequest = (url, options) => { if (!options) return Promise.resolve({base_uom:'pcs',conversions:[{uom_code:'CASE',factor_to_base:24,purchase_uom:false,issue_uom:false}]}); requests.push({ url, body: JSON.parse(options.body), method: options.method }); return new Promise((resolve, reject) => pendingRequests.push({ resolve, reject })); };
  const qc = { invalidateQueries: ({ queryKey }) => cleared.push(queryKey), setQueryData: (key) => cleared.push(key) };
  const f = new Function('apiRequest', 'productId', 'fromUom', 'toUom', 'convertQty', 'setConverted', 'setError', 'messageFrom', 'ui', 'conversionRequestSeqRef', 'activeUomProductRef', 'uomSelectionEpochRef', 'qc', 'clearUomForm', 'editingUom', 'setProductId', 'setFromUom', 'setToUom', 'setConvertQty', 'showTenantActionSuccess', 'showTenantActionError', js + '\nreturn { convertOptions, saveOptions, removeOptions, changeProduct, editQuantity, editFrom, editTo };');
  const cb = f(apiRequest, 'p-A', 'CASE', 'pcs', '2', setConverted, setError, e => String(e?.message ?? e), x => x, ref, { current: 'p-A' }, { current: 0 }, qc, () => cleared.push('form'), null, value => productChanges.push(value), value => unitsChanged.push(['from', value]), value => unitsChanged.push(['to', value]), value => unitsChanged.push(['qty', value]), ()=>{}, ()=>{});
  return { ...cb, ref, requests, pendingRequests, converted, errors, productChanges, unitsChanged, cleared };
}
{
  const s = scenario();
  const requestContext = s.convertOptions.onMutate();
  check('start request creates generation 1', () => assert.equal(requestContext.requestSeq, 1));
  const p = s.convertOptions.mutationFn();
  check('original conversion endpoint and parameters preserved', () => assert.deepEqual(s.requests[0], { url: '/inventory-capabilities/products/p-A/uom/convert', body: { from_uom: 'CASE', to_uom: 'pcs', quantity: 2 }, method: 'POST' }));
  s.changeProduct('p-B');
  check('product change increases generation synchronously', () => assert.equal(s.ref.current, 2));
  check('product switch resets visible conversion', () => assert.equal(s.converted.at(-1), null));
  s.pendingRequests[0].resolve({ converted_quantity: 48 });
  s.convertOptions.onSuccess(await p, undefined, requestContext);
  check('late response for previous product cannot display result', () => assert.deepEqual(s.converted, [null]));
  check('product choice updated correctly', () => assert.deepEqual(s.productChanges, ['p-B']));
  check('product change clears both unit selectors', () => assert.deepEqual(s.unitsChanged, [['from', ''], ['to', '']]));
}
for (const [key, value] of [['editQuantity', '3'], ['editFrom', 'pcs'], ['editTo', 'CASE']]) {
  const s = scenario();
  const context = s.convertOptions.onMutate();
  s[key]({ target: { value } });
  check(`${key} synchronously invalidates pending request`, () => assert.equal(s.ref.current, context.requestSeq + 1));
  check(`${key} clears current result`, () => assert.deepEqual(s.converted, [null]));
  s.convertOptions.onSuccess({ converted_quantity: 48 }, undefined, context);
  check(`${key} discards outdated success`, () => assert.deepEqual(s.converted, [null]));
  s.convertOptions.onError(new Error('stale network error'), undefined, context);
  check(`${key} discards outdated error`, () => assert.deepEqual(s.errors, []));
}
{
  const s = scenario();
  const early = s.convertOptions.onMutate(); const latest = s.convertOptions.onMutate();
  check('two rapid converts have distinct request contexts', () => assert.deepEqual([early.requestSeq, latest.requestSeq], [1, 2]));
  s.convertOptions.onSuccess({ converted_quantity: 48 }, undefined, early);
  check('earlier completion cannot overwrite latest', () => assert.equal(s.converted.length, 0));
  s.convertOptions.onSuccess({ converted_quantity: 24 }, undefined, latest);
  check('current completion displays correct result', () => assert.deepEqual(s.converted, ['24']));
  check('current completion clears stale error', () => assert.deepEqual(s.errors, [null]));
}
{
  const s = scenario();
  const context = s.convertOptions.onMutate();
  s.convertOptions.onError(new Error('service offline'), undefined, context);
  check('current conversion errors remain visible', () => assert.deepEqual(s.errors, ['service offline']));
  await s.saveOptions.onSuccess({}, { targetProductId: 'p-A', payload: {uom_code:'CASE',factor_to_base:24,purchase_uom:false,issue_uom:false} });
  check('successful UoM save invalidates in-flight conversion', () => assert.equal(s.ref.current, 2));
  check('successful save still refreshes verified UoM query cache', () => assert(s.cleared.some(value => Array.isArray(value) && value[0] === 'uom' && value[1] === 'p-A')));
  s.removeOptions.onSuccess({}, { targetProductId: 'p-A' });
  check('successful deletion also invalidates in-flight conversion', () => assert.equal(s.ref.current, 3));
  check('successful deletion still invalidates UoM query', () => assert(s.cleared.some(value => Array.isArray(value) && value[0] === 'uom' && value[1] === 'p-A')));
}
check('legacy Convert button invocation unchanged', () => assert.match(uom, /onClick=\{\(\) => convert\.mutate\(\)\}/));
check('conversion remains read-only with no stock movement', () => assert.doesNotMatch(uom, /\/stock\/adjust|\/stock\/count|\/stock-transfers/));
check('backend GET UoM permission preserved', () => assert.match(backend, /router\.get\('\/products\/:productId\/uom', requirePermission\(TENANT_PERMISSIONS\.PRODUCTS_READ\)/));
check('backend Convert UoM read permission preserved', () => assert.match(backend, /router\.post\('\/products\/:productId\/uom\/convert', requirePermission\(TENANT_PERMISSIONS\.PRODUCTS_READ\)/));
check('test registered in package.json', () => assert.equal(pkg.scripts['check:batch151-uom-stale-conversion-result'], 'node scripts/check-batch151-uom-stale-conversion-result.mjs'));
console.log(`BATCH151 FOCUSED: ${count}/${count} PASS`);
