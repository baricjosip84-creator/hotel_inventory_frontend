import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const page = read('src/pages/MobileExecutionPage.tsx');
const helperSource = read('src/pages/mobileExecutionSystemText.ts');
const catalogSource = read('src/i18n/tenantUiTranslations.ts');
const backend = read('../hotel-inventory-backend/src/services/inventory/executionTaskService.js');
const pkg = JSON.parse(read('package.json'));
let count = 0;
const check = (label, test) => {
  assert.ok(test, label); count += 1;
};
const compile = (source, filename) => {
  const compiled = ts.transpileModule(source, { fileName: filename, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  check(`${filename} parses`, !compiled.diagnostics?.length);
  const sandbox = { exports: {} };
  vm.runInNewContext(compiled.outputText, sandbox, { timeout: 15000 });
  return sandbox.exports;
};
const { displayMobileExecutionSystemTask: display, EXECUTION_CLOSURE_TITLE_PREFIX: prefix, EXECUTION_CLOSURE_DESCRIPTION: description } = compile(helperSource, 'mobileExecutionSystemText.ts');
const { translateTenantUi: translate } = compile(catalogSource, 'tenantUiTranslations.ts');
check('Mobile Execution page TSX parses', !ts.transpileModule(page, { fileName: 'MobileExecutionPage.tsx', reportDiagnostics: true, compilerOptions: {jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}}).diagnostics?.length);
check('Backend uses approved closure template and known provenance', backend.includes('title: `Close approved execution request: ${adapterLabel}`.slice(0, 180)') && backend.includes('source_type: EXECUTION_TASK_SOURCE_TYPES.EXECUTION_REQUEST') && backend.includes("'This task is a human closure record only; it does not execute adapters or mutate inventory.'"));
check('Rendered task fields use display-only helper', page.includes('displayMobileExecutionSystemTask(task, ui)') && page.includes('<h3>{displayedSystemTask.title ||') && page.includes('{displayedSystemTask.description || localizedSystemText('));
check('Original task structure and queue action persistence unchanged', page.includes('task_label: task.title || null') && page.includes('persistPending('));
check('Backend description contract is exact', description === 'Review and close the approved execution request through the operational task queue. This task is a human closure record only; it does not execute adapters or mutate inventory.');
check('Backend title prefix contract is exact', prefix === 'Close approved execution request: ');
const valid = { source_type: 'execution_request', title: prefix + 'Standard Cost Update', description };
const snapshot = JSON.stringify(valid);
const translatedTitles = {
 'en-GB': 'Close approved execution request: Standard Cost Update',
 'de-DE': 'Genehmigte Ausführungsanforderung abschließen: Standard Cost Update',
 'es-ES': 'Cerrar solicitud de ejecución aprobada: Standard Cost Update',
 'fr-FR': 'Clore la demande d’exécution approuvée : Standard Cost Update',
 'hr-HR': 'Zatvori odobreni zahtjev za izvršenje: Standard Cost Update'
};
for (const [locale, expected] of Object.entries(translatedTitles)) {
 const ui = (key) => translate(locale, key);
 const result = display(valid, ui);
 check(`${locale}: system task title localized, adapter label unchanged`, result.title === expected);
 check(`${locale}: system task description localized`, result.description === ui(description));
 check(`${locale}: description resolves to an actual translation`, locale === 'en-GB' || result.description !== description);
}
check('The original task object is not changed', JSON.stringify(valid) === snapshot);
const ui = (key) => translate('hr-HR', key);
const unchangedCases = [
 {source_type: 'manual', title: valid.title, description},
 {source_type: 'execution_request', title: 'User-entered task: Standard Cost Update', description},
 {source_type: 'execution_request', title: valid.title, description: 'User edited this instruction.'},
 {source_type: 'execution_request', title: prefix, description},
 {source_type: 'execution_request', title: '', description},
 {source_type: 'execution_request', title: null, description},
 {source_type: 'reservation', title: 'Keep original title', description: 'Do not change customer text'},
 {source_type: 'execution_request', title: 'Close approved execution request (revised): Test', description},
 {source_type: null, title: valid.title, description},
 {source_type: 'execution_request', title: valid.title, description: null},
];
for (const [index, task] of unchangedCases.entries()) {
 const result = display(task, ui);
 check(`Unrecognized/user-authored case ${index + 1} preserved`, result.title === task.title && result.description === task.description);
}
for (const key of ['Close approved execution request:', description]) {
 check(`Translation key occurs exactly once: ${key.slice(0, 35)}`, (catalogSource.split(` ["${key}"`).length - 1) === 1);
}
check('Registered script matches this test file', pkg.scripts['check:mobile-closure-task-localization-v349355'] === 'node scripts/check-mobile-closure-task-localization-surgical-fix-v349355.mjs');
console.log(`Mobile Execution system closure task localization: ${count}/${count} PASS`);
