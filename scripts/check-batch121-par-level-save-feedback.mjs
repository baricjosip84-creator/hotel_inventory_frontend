import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relative = 'src/components/enterpriseInventory/EnterpriseInventoryStockMutations.ts';
const stock = fs.readFileSync(process.env.BATCH121_SOURCE_PATH || path.join(root, relative), 'utf8');
const requests = fs.readFileSync(path.join(root, 'src/components/enterpriseInventory/EnterpriseInventoryRequests.ts'), 'utf8');
const feedback = fs.readFileSync(path.join(root, 'src/components/enterpriseInventory/EnterpriseInventoryMutationFeedback.ts'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const parsed = ts.createSourceFile(relative, stock, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
let assertions = 0;
function check(condition, label) { assert.ok(condition, label); assertions++; }
check(parsed.parseDiagnostics.length === 0, 'Stock mutation TypeScript is syntactically valid');
let node;
function visit(ast) {
  if (ts.isVariableDeclaration(ast) && ast.name.getText(parsed) === 'createParLevelMutation') node = ast;
  ts.forEachChild(ast, visit);
}
visit(parsed);
check(Boolean(node), 'Par-level save mutation is available');
const declaration = node.getText(parsed);
check(declaration.includes('"/enterprise-inventory/par-levels"'), 'Existing exact par-level save route preserved');
check(declaration.includes('buildParLevelPayload(input)'), 'Existing business payload builder preserved');
check(declaration.includes('{ skipMutationFeedback: true }'), 'Shared generic success toast is suppressed for this exact save');
check(declaration.includes('ui("Par level saved.")'), 'Precise localized inline save notice preserved');
check(declaration.includes('setParLevelForm(emptyParLevelForm)'), 'Successful save still resets form');
check(declaration.includes('["enterprise-par-levels"]'), 'Saved par level still invalidates the correct list query');
check(declaration.includes('ui("Failed to save par level.")'), 'Existing error branch preserved');
check(!declaration.includes('method: "PATCH"') && !declaration.includes('method: "PUT"'), 'Save HTTP method still comes from the existing post wrapper');
check(stock.includes('"/enterprise-inventory/par-levels/evaluate"'), 'Evaluate par-levels remains a separate endpoint');
check(stock.includes('from-par-level/${parLevelId}'), 'Execution task route unchanged');
check(stock.includes('mutationFeedback.result('), 'Specific evaluation and task result feedback retained');
check(requests.includes('options?.skipMutationFeedback === true ? { skipMutationFeedback: true } : {}'), 'Post helper forwards opt-out to underlying API');
check(requests.includes('method: \'POST\''), 'Post helper still uses POST for save');
check(feedback.includes('setStatusMessage(successMessage)'), 'Local success result is still displayed');
check(feedback.includes('setErrorMessage(errorNormalizer(error, fallbackMessage))'), 'Local error message still displayed');
check(ui.includes('["Par level saved.",'), 'Precise saved text exists in five-language catalog');
check(api.includes('dispatchTenantMutationFeedback'), 'Shared API success-feedback mechanism exists (the source of duplicate toast)');
check(pkg.scripts['check:batch121-par-level-save-feedback'] === 'node scripts/check-batch121-par-level-save-feedback.mjs', 'New script registered');

const compiled = ts.transpileModule(`const ${declaration}; globalThis.__mutation = createParLevelMutation;`, {
  fileName: 'parLevelSave.ts',
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true,
});
check((compiled.diagnostics ?? []).length === 0, 'Extracted actual mutation transpiles');
const calls = [];
const originals = {product_id:'product-1', storage_location_id:'loc-2', min_quantity:'25', expected_version:3};
const payload = { product_id: 'product-1', storage_location_id: 'loc-2', min_quantity: 25, expected_version: 3 };
const saved = { id: 'par-3', version:4 };
const status = [];
const reset = [];
const errors = [];
const ctx = {
  useMutation: (config) => config,
  postEnterpriseInventoryRequest: async (...args) => { calls.push(args); return saved; },
  buildParLevelPayload: (form) => { check(form === originals,'Existing original input reaches payload builder'); return payload; },
  mutationFeedback: {
    resetting: (message, keys, resetForm) => {
      status.push({message,keys}); return async () => { resetForm(); };
    },
    error: (message) => { errors.push(message); return () => {}; },
  },
  ui: (phrase) => phrase,
  setParLevelForm: (form) => reset.push(form),
  emptyParLevelForm: { product_id:'', storage_location_id:'' },
  globalThis: {},
};
vm.runInNewContext(compiled.outputText, ctx);
const config = ctx.globalThis.__mutation;
check(Boolean(config?.mutationFn), 'Actual transpiled save mutation can execute');
const result = await config.mutationFn(originals);
check(result === saved, 'Save returns original API result');
check(calls.length === 1, 'Save emits one API mutation');
check(calls[0][0] === '/enterprise-inventory/par-levels', 'Save sends unchanged endpoint');
check(calls[0][1] === payload, 'Save sends unchanged payload');
check(calls[0][2]?.skipMutationFeedback === true, 'Only duplicate shared toast is opted out of');
check(status.length === 1 && status[0].message === 'Par level saved.', 'Exact local translated status remains');
check(Array.from(status[0].keys).join(',') === 'enterprise-par-levels', 'Original query invalidation remains wired');
check(errors.length === 1 && errors[0] === 'Failed to save par level.', 'Original localized failure message remains');
await config.onSuccess(saved, originals);
check(reset.length === 1 && reset[0] === ctx.emptyParLevelForm, 'Success handler still resets original form');
console.log(`PASS Batch121 par-level save feedback: ${assertions}/${assertions} assertions`);
