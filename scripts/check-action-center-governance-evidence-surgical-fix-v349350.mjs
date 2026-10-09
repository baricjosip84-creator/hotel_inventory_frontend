import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const action = fs.readFileSync(path.join(root, 'src/pages/OperationalActionCenterPage.tsx'), 'utf8');
const catalog = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const backend = fs.readFileSync(path.join(root, '../hotel-inventory-backend/src/services/operations/operationalActionCenterService.js'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX };
let assertions = 0;
const check = (label, test) => { test(); assertions += 1; console.log(`PASS ${String(assertions).padStart(2, '0')} ${label}`); };
const compile = (text, filename) => {
  const result = ts.transpileModule(text, { fileName: filename, compilerOptions: options, reportDiagnostics: true });
  assert.deepEqual((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), []);
  return result.outputText;
};
const i18nExports = {};
vm.runInNewContext(compile(catalog, 'tenantUiTranslations.ts'), { exports: i18nExports });
const start = action.indexOf('function formatLabel(');
const end = action.indexOf('function actionDomainIconPath(', start);
assert(start >= 0 && end > start, 'Action Center formatting helper range must be present');
const actionExports = {};
vm.runInNewContext(compile(action.slice(start, end) + '\nexports.canonicalLabel = canonicalLabel;', 'actionCenterHelpers.ts'), { exports: actionExports });
const formatted = actionExports.canonicalLabel;
const diagnosticCodes = [
  'no_control_tower_signals_available_for_traceability',
  'no_execution_actions_available_for_coordination_trace',
  'no_governance_actions_available_for_decision_trace',
  'critical_actions_have_no_approval_gate_context',
  'no_control_tower_signals_available_for_remediation_feedback',
  'no_remediation_workflows_available_for_outcome_review',
  'some_actions_are_missing_source_workflow_evidence_links',
  'blocked_actions_require_manual_resolution_before_feedback_closure',
  'high_risk_actions_need_explicit_governance_review_before_closure',
  'source_control_tower_signal_reviewed',
  'remediation_action_owner_confirmed',
  'before_after_operational_evidence_recorded',
  'effectiveness_review_completed_by_human',
  'follow_up_action_or_closure_decision_recorded',
  'no_remediation_actions_available_for_effectiveness_review',
  'no_control_tower_signals_available_to_compare_before_after_risk',
  'remediation_actions_missing_source_evidence_links',
  'high_risk_remediation_actions_missing_governance_gate',
  'blocked_remediation_actions_prevent_effectiveness_closure',
  'capture_before_risk_state_from_control_tower_signal',
  'capture_remediation_action_taken_and_owner',
  'capture_after_risk_state_or_exception_status',
  'classify_outcome_as_effective_partial_or_ineffective',
  'route_ineffective_outcomes_to_follow_up_or_escalation'
];
const locales = ['en-GB', 'de-DE', 'es-ES', 'fr-FR', 'hr-HR'];
const formatEnglish = c => c.replace(/_/g, ' ').replace(/^./, chr => chr.toUpperCase());
const catalogue = i18nExports.TENANT_UI_TRANSLATIONS;
check('Backend emits all 24 tested stable diagnostic codes', () => {
  for (const code of diagnosticCodes) assert.ok(backend.includes(`'${code}'`), code);
});
for (const locale of locales) {
  check(`${locale}: all 24 emitted codes have direct business translations`, () => {
    for (const code of diagnosticCodes) {
      const english = formatEnglish(code);
      assert.ok(Object.hasOwn(catalogue[locale], english), `${locale}: ${english}`);
      if (locale === 'en-GB') assert.equal(formatted(code, text => i18nExports.translateTenantUi(locale, text)), english, `${locale}: ${code}`);
      else assert.notEqual(formatted(code, text => i18nExports.translateTenantUi(locale, text)), english, `${locale}: ${code}`);
    }
  });
}
check('Exact Croatian traceability and remediation evidence render as readable descriptions', () => {
  const ui = t => i18nExports.translateTenantUi('hr-HR', t);
  assert.equal(formatted('no_control_tower_signals_available_for_traceability', ui), 'Nema signala Control Towera za praćenje');
  assert.equal(formatted('remediation_action_owner_confirmed', ui), 'Potvrđen odgovorni nositelj korektivne mjere');
  assert.equal(formatted('no_remediation_actions_available_for_effectiveness_review', ui), 'Nema korektivnih mjera za pregled učinkovitosti');
});
check('Action Center applies canonicalLabel to all three affected business-facing evidence lists', () => {
  for (const item of [
    'traceability.blockers.map((blocker) => <li key={blocker}>{canonicalLabel(blocker, ui)}</li>)',
    'remediationFeedback.blockers.map((blocker) => <li key={blocker}>{canonicalLabel(blocker, ui)}</li>)',
    'remediationFeedback.required_manual_evidence.map((item) => <li key={item}>{canonicalLabel(item, ui)}</li>)',
    'effectivenessReview.blockers.map((blocker) => <li key={blocker}>{canonicalLabel(blocker, ui)}</li>)',
    'effectivenessReview.effectiveness_review_contract.map((item) => <li key={item}>{canonicalLabel(item, ui)}</li>)'
  ]) assert.ok(action.includes(item), item);
});
check('Unknown codes and free-form evidence are not rewritten', () => {
  const ui = t => i18nExports.translateTenantUi('hr-HR', t);
  assert.equal(formatted('custom_operator_evidence', ui), 'Custom operator evidence');
  assert.equal(formatted('custom_operator_evidence_123', ui), 'Custom operator evidence 123');
});
check('Existing governance permissions and backend action contract remain unchanged', () => {
  assert.match(action, /TENANT_PERMISSIONS/);
  assert.match(action, /required_permission/);
  assert.match(backend, /function buildControlTowerRemediationFeedbackLoop\(actions\)/);
});
check('Translation catalogue does not contain duplicated English keys for affected codes', () => {
  for (const code of diagnosticCodes) {
    const key = JSON.stringify(formatEnglish(code));
    assert.equal(catalog.split(`[${key},`).length - 1, 1, key);
  }
});
check('Batch107 regression is registered in package scripts', () => {
  assert.equal(packageJson.scripts['check:action-center-governance-evidence-surgical-fix-v349350'], 'node scripts/check-action-center-governance-evidence-surgical-fix-v349350.mjs');
});
check('Full Action Center component transpiles without TypeScript parse errors', () => compile(action, 'OperationalActionCenterPage.tsx'));
console.log(`Batch107 Action Center backend governance evidence localization: ${assertions}/${assertions} PASS`);
