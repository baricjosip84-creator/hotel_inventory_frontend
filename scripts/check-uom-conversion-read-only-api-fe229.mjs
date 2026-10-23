import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const api = readFileSync(join(root, 'src/lib/api.ts'), 'utf8');
const page = readFileSync(join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const workflow = readFileSync(join(root, '.github/workflows/frontend-validation.yml'), 'utf8');
let checks = 0;
function check(label, fn) { fn(); checks++; console.log(`PASS ${label}`); }
const ast = ts.createSourceFile('api.ts', api, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
check('API source parses', () => assert.equal(ast.parseDiagnostics.length, 0));
const pageAst = ts.createSourceFile('page.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check('UoM page parses', () => assert.equal(pageAst.parseDiagnostics.length, 0));
const helper = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'isReadOnlyUnitConversionRequest');
check('explicit read-only calculator route classifier exists', () => assert(helper));
const apiFn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'apiRequest');
check('shared tenant API function exists', () => assert(apiFn));
let gate;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'shouldShowMutationFeedback') gate = node.initializer?.getText(ast);
  ts.forEachChild(node, visit);
}
visit(apiFn);
check('actual shared feedback gate found', () => assert(gate));
check('shared gate explicitly calls calculator classifier', () => assert.match(gate, /!isReadOnlyUnitConversionRequest\(path, method\)/));
check('per-request skip option remains supported', () => assert.match(gate, /skipMutationFeedback/));
const source = `${helper.getText(ast)}\nconst gate = ${gate}; this.feedbackGate = gate; this.classifier = isReadOnlyUnitConversionRequest;`;
const compiled = ts.transpileModule(source, { fileName: 'unit-feedback.ts', compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}});
check('classifier and feedback gate transpile', () => assert(!compiled.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error)));
function execute(path, method = 'POST', skip = false) {
  const context = {
    path, method, options: { method, skipMutationFeedback: skip },
    requestOptions: { method }, isLoginRequest: false, isRefreshRequest: false,
    isCsrfRequest: false, isWriteRequest: x => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(x.method)
  };
  vm.runInNewContext(compiled.outputText, context);
  return {show: context.feedbackGate, match: context.classifier(path, method)};
}
for (const [label, path, method, match] of [
  ['normal calculator route','/inventory-capabilities/products/abc/uom/convert','POST',true],
  ['UUID product','/inventory-capabilities/products/a-b-c-123/uom/convert','POST',true],
  ['query string','/inventory-capabilities/products/abc/uom/convert?trace=1','POST',true],
  ['trailing slash','/inventory-capabilities/products/abc/uom/convert/','POST',true],
  ['case-insensitive','/Inventory-Capabilities/Products/abc/UOM/Convert','POST',true],
  ['GET never calculator mutation','/inventory-capabilities/products/abc/uom/convert','GET',false],
  ['unit save','/inventory-capabilities/products/abc/uom','POST',false],
  ['UoM update','/inventory-capabilities/uom/2','PATCH',false],
  ['genuine product creation','/products','POST',false],
  ['unrelated product action','/inventory-capabilities/products/abc/other','POST',false],
  ['similarly named attack route','/inventory-capabilities/products/abc/uom/convert/next','POST',false],
  ['similar prefix','/inventory-capabilities/products/abc/uom/convert-extra','POST',false]
]) check(`${label} route classification`, () => assert.equal(execute(path, method).match, match));
for (const id of ['abc','200','a-b-c']) {
  check(`calculator ${id} never displays generic toast`, () => assert.equal(execute(`/inventory-capabilities/products/${id}/uom/convert`).show,false));
  check(`real product ${id} retains generic toast`, () => assert.equal(execute(`/products/${id}/activate`).show,true));
}
check('normal product create keeps toast', () => assert.equal(execute('/products').show,true));
check('standard UoM creation keeps shared feedback if caller requests it', () => assert.equal(execute('/inventory-capabilities/products/abc/uom').show,true));
check('request skip still suppresses other routes', () => assert.equal(execute('/products', 'POST', true).show,false));
check('GET never shows mutation success', () => assert.equal(execute('/products', 'GET').show,false));
check('original per-request flag remains on calculator mutation', () => assert.match(page,/uom\/convert`,\s*\{ method: 'POST', skipMutationFeedback: true/));
check('correct result still shown in UI', () => assert.match(page,/setConverted\(String\(data\.converted_quantity\)\)/));
check('no developer version marker is shown to users', () => assert.doesNotMatch(page, /data-uom-calculator-release|<small[^>]*>FE229<\/small>/));
check('focused test registered', () => assert.equal(pkg.scripts['check:uom-conversion-read-only-api-fe229'], 'node scripts/check-uom-conversion-read-only-api-fe229.mjs'));
check('focused test included in CI', () => assert.match(workflow, /npm run check:uom-conversion-read-only-api-fe229/));
console.log(`FE229 calculator shared feedback regression: ${checks}/${checks} PASS`);
