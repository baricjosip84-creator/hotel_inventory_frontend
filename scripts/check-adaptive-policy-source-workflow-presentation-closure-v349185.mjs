import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const page = read('src/pages/AdaptivePolicyEnginePage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const multilingual = read('scripts/check-tenant-adaptive-policy-engine-multilingual.mjs');
const packageJson = JSON.parse(read('package.json'));

const checks = [
  ['built-in source workflow has a stable application-owned label mapping', page.includes("const SOURCE_WORKFLOW_LABELS: Record<string, string> = {") && page.includes("manual_business_rule_change: 'Manual business rule change'")],
  ['source workflow display helper localizes only known system values', page.includes('function sourceWorkflowDisplayLabel(value: unknown, ui: (key: string) => string): string') && page.includes('const label = SOURCE_WORKFLOW_LABELS[text];') && page.includes('return label ? ui(label) : text;')],
  ['unknown tenant-entered source workflow text remains verbatim', page.includes('return label ? ui(label) : text;') && !page.includes('formatLabel(application.source_workflow)')],
  ['Applied Policy Changes table uses the safe source-workflow label boundary', page.includes("{ui('Source workflow')}: {sourceWorkflowDisplayLabel(application.source_workflow, ui)}")],
  ['record-applied-change form shows the localized friendly default', page.includes('value={sourceWorkflowDisplayLabel(applicationDraft.sourceWorkflow, ui)}')],
  ['canonical system source workflow remains the untouched default stored value', page.includes("sourceWorkflow: 'manual_business_rule_change'")],
  ['custom source workflow text is still submitted exactly as entered apart from surrounding whitespace', page.includes('source_workflow: draft.sourceWorkflow.trim()')],
  ['source workflow is still editable instead of being converted into a closed enum', page.includes('sourceWorkflow: event.target.value')],
  ['friendly source workflow label exists in all five tenant languages', translations.includes('["Manual business rule change", "Manuelle Änderung einer Geschäftsregel", "Cambio manual de regla de negocio", "Modification manuelle d’une règle métier", "Ručna promjena poslovnog pravila"]')],
  ['Adaptive Policy multilingual guard catalogs the source-workflow system vocabulary', multilingual.includes("'const SOURCE_WORKFLOW_LABELS'") && multilingual.includes("'sourceWorkflowDisplayLabel(application.source_workflow, ui)'") && multilingual.includes("'sourceWorkflowDisplayLabel(applicationDraft.sourceWorkflow, ui)'" )],
  ['raw diagnostics remain available only on the diagnostics surface', page.includes('canViewDiagnostics ? (') && page.includes('<pre>{JSON.stringify(data, null, 2)}</pre>')],
  ['new guard is registered in package scripts', packageJson.scripts?.['check:adaptive-policy-source-workflow-presentation-closure-v349185'] === 'node scripts/check-adaptive-policy-source-workflow-presentation-closure-v349185.mjs'],
  ['mandatory multilingual closure remains first and v3.49.185 runs immediately after it', packageJson.scripts?.['check:ci']?.startsWith('npm run check:tenant-multilingual-closure-audit && npm run check:adaptive-policy-source-workflow-presentation-closure-v349185 && npm run check:learning-feedback-business-presentation-closure-v349184 && npm run check:adaptive-policy-business-presentation-closure-v349183 && ')]
];

for (const [label, ok] of checks) ok ? pass(label) : fail(label);
if (!process.exitCode) console.log(`v3.49.185 Adaptive Policy source-workflow presentation closure guard: ${checks.length}/${checks.length} PASS`);
