import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const actionSource = fs.readFileSync(path.join(root, 'src/pages/OperationalActionCenterPage.tsx'), 'utf8');
const translationSource = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const backendSource = fs.readFileSync(path.join(root, '../hotel-inventory-backend/src/services/operations/operationalActionCenterService.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX };
let count = 0;
function check(label, callback) { callback(); count += 1; console.log(`PASS ${String(count).padStart(2, '0')} ${label}`); }
function transpile(source, name) {
  const result = ts.transpileModule(source, { fileName: name, compilerOptions: options, reportDiagnostics: true });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), []);
  return result.outputText;
}
const i18nExports = {};
vm.runInNewContext(transpile(translationSource, 'tenantUiTranslations.ts'), { exports: i18nExports });
const start = actionSource.indexOf('function formatLabel(');
const end = actionSource.indexOf('function actionDomainIconPath(', start);
assert(start >= 0 && end > start, 'Action Center presentation helper functions must remain available');
const actionExports = {};
vm.runInNewContext(transpile(actionSource.slice(start, end) + '\nexports.formatFactor = actionTechnicalFactorLabel;', 'actionEvidenceHelpers.ts'), { exports: actionExports });
const formatFactor = actionExports.formatFactor;
const locales = {
  'en-GB': ['Alert status: Unresolved', 'Alert severity: Info', 'Escalation level: 0'],
  'de-DE': ['Warnungsstatus: Ungelöst', 'Warnungs-Schweregrad: Info', 'Eskalationsstufe: 0'],
  'es-ES': ['Estado de la alerta: Sin resolver', 'Severidad de la alerta: Información', 'Nivel de escalado: 0'],
  'fr-FR': ['Statut de l’alerte : Non résolus', 'Gravité de l’alerte : Information', 'Niveau d’escalade: 0'],
  'hr-HR': ['Status upozorenja: Neriješeno', 'Ozbiljnost upozorenja: Informacija', 'Razina eskalacije: 0']
};
for (const [locale, expected] of Object.entries(locales)) {
  const ui = s => i18nExports.translateTenantUi(locale, s);
  check(`${locale} alert status is explicitly localized`, () => assert.equal(formatFactor('unresolved_alert', ui), expected[0]));
  check(`${locale} severity label and info value remain formatted`, () => assert.equal(formatFactor('severity:info', ui), expected[1]));
  check(`${locale} escalation value preserved with legible label`, () => assert.equal(formatFactor('escalation_level:0', ui), expected[2]));
}
check('Only known generated status is replaced', () => {
  const ui = s => i18nExports.translateTenantUi('hr-HR', s);
  assert.notEqual(formatFactor('unresolved_alert', ui), formatFactor('unresolved_alert_custom', ui));
});
check('Unknown evidence is not translated by substring matching', () => {
  const ui = s => i18nExports.translateTenantUi('hr-HR', s);
  assert.equal(formatFactor('custom_user_note:abc', ui), 'Custom user note:abc');
});
check('Other structured task factors remain supported', () => {
  assert.match(actionSource, /if \(key === 'priority' && value\)/);
  assert.match(actionSource, /if \(key === 'task_source' && value\)/);
  assert.match(actionSource, /if \(raw === 'sla_due_at_absent'\)/);
});
check('Application still displays each evidence factor separately', () => assert.match(actionSource, /action\.explainability\.primary_factors\.map\(\(factor, index\) => \([\s\S]*?actionTechnicalFactorLabel\(factor, ui\)/));
check('Alert titles and free-text summaries retain their localization contract', () => {
  assert.match(actionSource, /return action\.title_key \? ui\(title\) : title;/);
  assert.match(actionSource, /return action\.summary_key \? ui\(summary\) : summary;/);
});
check('Backend still emits stable machine evidence codes', () => {
  assert.match(backendSource, /primary_factors: \['unresolved_alert', `severity:\$\{row\.severity\}`, `escalation_level:\$\{row\.escalation_level \|\| 0\}`\]/);
});
check('Backend API and action workflow remain server-owned', () => {
  assert.match(actionSource, /apiRequest/);
  assert.match(actionSource, /required_permission/);
});
check('Translation source has one new status label', () => {
  assert.equal((translationSource.match(/\["Alert status:"/g) || []).length, 1);
  assert.equal((translationSource.match(/\["Unresolved"/g) || []).length, 1);
});
check('No user-authored text or UUID rewriting introduced', () => {
  assert.doesNotMatch(actionSource.slice(start,end), /replace\(\s*\/unresolved|replaceAll\('Unresolved/);
});
check('Regression test is registered', () => assert.equal(pkg.scripts['check:action-center-alert-evidence-v349342'], 'node scripts/check-action-center-alert-evidence-localization-surgical-fix-v349342.mjs'));
check('Full Action Center page is TSX syntax-valid', () => transpile(actionSource, 'OperationalActionCenterPage.tsx'));
console.log(`Batch104 Action Center evidence localization: ${count}/${count} PASS`);
