import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(process.env.FE228_SOURCE || path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const api = readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS', label); }
const ast = ts.createSourceFile('InventoryCapabilitiesPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check('source TSX parses', () => assert.equal(ast.parseDiagnostics.length, 0));
let convertNode = null;
let saveNode = null;
function visit(n) {
  if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'convert' && n.initializer?.getText(ast).startsWith('useMutation(')) convertNode = n;
  if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'save' && n.initializer?.getText(ast).startsWith('useMutation(')) {
    if (n.pos > source.indexOf('function UomPanel(') && n.pos < source.indexOf('function CustomFieldsPanel(')) saveNode = n;
  }
  ts.forEachChild(n, visit);
}
const uom = source.slice(source.indexOf('function UomPanel('), source.indexOf('function CustomFieldsPanel('));
const uomAst = ts.createSourceFile('uom.tsx', uom, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
// The AST from the full page ensures this remains coupled to the actual deployed handler.
visit(ast);
check('conversion mutation found', () => assert(convertNode));
check('UoM save mutation found', () => assert(saveNode));
const declaration = convertNode.initializer.getText(ast);
const compiled = ts.transpileModule(`const mutation = ${declaration};`, {
  fileName: 'uomConvert.ts',
  compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None},
  reportDiagnostics: true
});
check('real conversion mutation transpiles', () => assert.equal((compiled.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0));
check('shared API has a feedback suppression gate', () => assert.match(api, /!\(options as SafeMutationRequestInit\)\.skipMutationFeedback/));
check('conversion POST is scoped to the right endpoint', () => assert.match(declaration, /\/inventory-capabilities\/products\/\$\{productId\}\/uom\/convert/));
check('conversion has no product or stock write endpoint', () => assert.doesNotMatch(declaration, /\/stock\/adjust|\/stock\/count|\/products\/create/));
check('conversion explicitly disables generic mutation toasts', () => assert.match(declaration, /skipMutationFeedback:\s*true/));

const calls = [];
const toasts = [];
const converted = [];
const errors = [];
const confirmations = [];
let nextValue = { converted_quantity: 24 };
let nextError = null;
const ref = {current: 0};
const context = {
  useMutation: x => x,
  productId: 'product-123',
  fromUom: 'CASE',
  toUom: 'piece',
  convertQty: '1',
  conversionRequestSeqRef: ref,
  setConverted: x => converted.push(x),
  showTenantActionSuccess: x => confirmations.push(x),
  setError: x => errors.push(x),
  messageFrom: x => x?.message || 'Unable to convert quantity.',
  ui: text => text,
  apiRequest: async (url, options) => {
    calls.push({url, options});
    if (nextError) throw nextError;
    // Simulate the tenant mutation feedback rule from the real shared API client.
    if (options.method === 'POST' && !options.skipMutationFeedback) toasts.push('Product created successfully.');
    return nextValue;
  }
};
vm.runInNewContext(compiled.outputText + '\nthis.mutation = mutation;', context);
const mutation = context.mutation;
check('conversion mutation retains generation handling', () => assert.equal(typeof mutation.onMutate, 'function'));
check('conversion mutation retains success callback', () => assert.equal(typeof mutation.onSuccess, 'function'));
check('conversion mutation retains error callback', () => assert.equal(typeof mutation.onError, 'function'));
const attempt = mutation.onMutate();
const result = await mutation.mutationFn();
mutation.onSuccess(result, undefined, attempt);
check('real request is POST to unit-conversion calculator', () => assert.equal(calls[0].url, '/inventory-capabilities/products/product-123/uom/convert'));
check('request method remains POST', () => assert.equal(calls[0].options.method, 'POST'));
check('request body still carries correct values', () => assert.deepEqual(JSON.parse(calls[0].options.body), {from_uom: 'CASE', to_uom: 'piece', quantity: 1}));
check('generic product-created feedback is suppressed', () => assert.equal(toasts.length, 0));
check('conversion has meaningful confirmation', () => assert.deepEqual(confirmations, ['Conversion calculated: 1 CASE = 24 piece']));
check('result remains visible inline as 24 pieces', () => assert.deepEqual(converted, ['24']));
check('successful calculation clears previous error', () => assert.deepEqual(errors, [null]));
const oldRequest = mutation.onMutate();
const freshRequest = mutation.onMutate();
mutation.onSuccess({converted_quantity: 36}, undefined, oldRequest);
check('stale success cannot override the latest result', () => { assert.deepEqual(converted, ['24']); assert.equal(confirmations.length, 1); });
mutation.onSuccess({converted_quantity: 48}, undefined, freshRequest);
check('latest success still updates inline result', () => { assert.deepEqual(converted, ['24', '48']); assert.equal(confirmations.length, 2); });
mutation.onError(new Error('Network unavailable'), undefined, oldRequest);
check('stale errors remain suppressed', () => assert.deepEqual(errors, [null, null]));
mutation.onError(new Error('Network unavailable'), undefined, freshRequest);
check('current error remains visible', () => assert.equal(errors.at(-1), 'Network unavailable'));
check('saving a conversion is still a separate mutation', () => assert.match(saveNode.initializer.getText(ast), /\/uom`, \{ method: 'POST', body: JSON\.stringify\(payload\), skipMutationFeedback: true \}/));
check('verified save still presents action-specific feedback', () => assert.match(saveNode.initializer.getText(ast), /showTenantActionSuccess\(ui\(payload\.expected_version > 0 \? "Unit conversion updated successfully\." : "Unit conversion saved successfully\."\)\)/));
check('package registers new focused check', () => assert.equal(pkg.scripts['check:uom-conversion-no-product-toast-fe228'], 'node scripts/check-uom-conversion-no-product-toast-fe228.mjs'));
console.log(`FE228 UoM conversion toast regression: ${checks}/${checks} PASS`);
