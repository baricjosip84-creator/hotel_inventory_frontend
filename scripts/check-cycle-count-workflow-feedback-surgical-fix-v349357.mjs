import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const api = read('src/lib/api.ts');
const cycleMutations = read('src/components/enterpriseInventory/EnterpriseInventoryStockMutations.ts');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));
const names = ['isProductPackageMutationPath', 'readMutationStringField', 'readMutationBooleanField', 'readMutationNumberField', 'readMutationAction', 'barcodeLabelCreatedMessage', 'tenantMutationActionLabel', 'tenantMutationSuccessMessage'];
const source = ts.createSourceFile('api.ts', api, ts.ScriptTarget.Latest, true);
const declarations = new Map(source.statements.filter(ts.isFunctionDeclaration).filter(node => node.name).map(node => [node.name.text, node.getText(source)]));
if (names.some(name => !declarations.has(name))) throw new Error(`Missing API helper: ${names.filter(name => !declarations.has(name)).join(', ')}`);
const compiled = ts.transpileModule(names.map(name => declarations.get(name)).join('\n') + '\nmodule.exports = { tenantMutationSuccessMessage };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true
});
if (compiled.diagnostics?.length) throw new Error('API source did not transpile without diagnostics');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(compiled.outputText, sandbox, { timeout: 5000 });
const success = sandbox.module.exports.tenantMutationSuccessMessage;
let passed = 0;
let failed = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${ok ? '' : ` (actual ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)})`}`);
  ok ? passed++ : failed++;
}
check('Create cycle count exact route', success('/enterprise-inventory/cycle-counts', 'POST'), 'Cycle count created.');
check('Create cycle count with benign query string', success('/enterprise-inventory/cycle-counts?context=inventory', 'POST'), 'Cycle count created.');
check('Case insensitive HTTP verb', success('/enterprise-inventory/cycle-counts', 'post'), 'Cycle count created.');
check('Submit cycle count exact action', success('/enterprise-inventory/cycle-counts/cc-123/submit', 'POST'), 'Cycle count submitted successfully.');
check('Submit with query string', success('/enterprise-inventory/cycle-counts/cc-123/submit?audit=1', 'POST'), 'Cycle count submitted successfully.');
check('Reconcile cycle count exact action', success('/enterprise-inventory/cycle-counts/cc-123/reconcile', 'POST'), 'Cycle count reconciled and stock movements posted.');
check('Reconcile with query string', success('/enterprise-inventory/cycle-counts/cc-123/reconcile?audit=1', 'POST'), 'Cycle count reconciled and stock movements posted.');
check('Other workflow actions are NOT falsely classified as reconciliation', success('/enterprise-inventory/cycle-counts/cc-123/approve', 'POST'), 'Item created successfully.');
check('Parent nested path is NOT a create', success('/enterprise-inventory/cycle-counts/cc-123', 'POST'), 'Item created successfully.');
check('GET never fabricates a successful create', success('/enterprise-inventory/cycle-counts', 'GET'), 'Request saved successfully.');
check('PATCH never fabricates a successful create', success('/enterprise-inventory/cycle-counts/cc-123', 'PATCH'), 'Changes saved successfully.');
check('Department requisition feedback remains unchanged', success('/enterprise-inventory/department-requisitions', 'POST'), 'Requisition created successfully.');
check('Supplier invoice feedback remains unchanged', success('/enterprise-inventory/supplier-invoices', 'POST'), 'Supplier invoice created successfully.');
check('Stock adjustment feedback remains unchanged', success('/stock/adjust', 'POST'), 'Stock adjustment applied successfully.');
check('Cycle Count page still submits to existing create endpoint', cycleMutations.includes('"/enterprise-inventory/cycle-counts",'), true);
check('Cycle Count page still submits to existing submit endpoint', cycleMutations.includes('`/enterprise-inventory/cycle-counts/${id}/submit`'), true);
check('Cycle Count page still submits to existing reconcile endpoint', cycleMutations.includes('`/enterprise-inventory/cycle-counts/${id}/reconcile`'), true);
check('Central toast dispatch remains enabled and translated', api.includes("dispatchTenantMutationFeedback({ type: 'success', message: tenantMutationSuccessMessage(path, method, requestOptions.body), translateMessage: true })"), true);
check('Server stock mutation and query invalidation still use normal workflow', cycleMutations.includes('"enterprise-stock-movements"') && cycleMutations.includes('"enterprise-low-stock"'), true);
for (const label of ['Cycle count created.', 'Cycle count submitted successfully.', 'Cycle count reconciled and stock movements posted.']) {
  const rows = translations.split('\n').filter(line => line.trimStart().startsWith(`["${label}"`));
  check(`Unique five-language row for ${label}`, rows.length, 1);
  check(`EN/DE/ES/FR/HR filled for ${label}`, rows.length === 1 && (rows[0].match(/"[^"\n]+"/g) || []).length >= 5, true);
}
check('Dedicated regression script registered', pkg.scripts?.['check:cycle-count-workflow-feedback-v349357'], 'node scripts/check-cycle-count-workflow-feedback-surgical-fix-v349357.mjs');
console.log(`Batch115 cycle count workflow feedback: ${passed}/${passed+failed} PASS`);
if (failed) process.exitCode = 1;
