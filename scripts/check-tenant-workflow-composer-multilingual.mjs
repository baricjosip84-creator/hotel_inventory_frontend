import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/WorkflowAutomationComposerPage.tsx');
const routerSource = read('src/app/router.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {
    // Ignore TypeScript that is not a translation row.
  }
}

const catalogKeys = rows.map((row) => row[0]);
const uniqueKeys = new Set(catalogKeys);
if (catalogKeys.length !== uniqueKeys.size) {
  const seen = new Set();
  const duplicates = [...new Set(catalogKeys.filter((key) => seen.has(key) || !seen.add(key)))];
  fail(`Tenant UI translation catalog has duplicate English keys: ${duplicates.join(' | ')}`);
} else {
  pass(`Tenant UI catalog has ${catalogKeys.length} unique five-language rows.`);
}

const literalUiPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}

const literalKeys = [];
for (const match of pageSource.matchAll(literalUiPattern)) {
  try { literalKeys.push(decodeLiteral(match[1])); } catch { /* TypeScript/lint catches malformed literals. */ }
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) fail(`Workflow Composer has ui() literals missing from the five-language catalog: ${missingLiterals.join(' | ')}`);
else pass(`Workflow Composer has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'All work areas', 'General execution tasks', 'Reservations', 'Procurement', 'Shipment fulfilment', 'Replenishment and counts',
  'Stock transfers', 'Supplier integrations', 'Carrier integrations', 'External partner integrations', 'Cross-area reviews',
  'All urgency levels', 'Critical', 'High', 'Medium', 'Low',
  'Nothing is created or run here', 'The page shows suggested plans but does not publish automation, start tasks, or change records.',
  'A person remains responsible', 'The real work must be reviewed, assigned, approved, and completed on its normal source page.',
  'Approvals still apply', 'A suggested approval path cannot bypass the approval rules already used by the business.',
  'External systems are not contacted', 'Integration plans are previews only and do not call suppliers, carriers, partners, ERP, or accounting systems.',
  'Review the original task, alert, or contract', 'Choose the person responsible for the work', 'Record the required human approval',
  'Complete the work through its normal controlled page', 'Record the result in the original workflow', 'Review the integration rules and ownership',
  'Confirm who is allowed to use the integration', 'Arrange the follow-up through the existing business process',
  'The owner of the source work reviews it', 'A governance reviewer gives approval', 'An authorised person allows the work to continue',
  'The integration owner reviews the plan', 'The workflow governance owner reviews the plan',
  'Unknown', 'Open', 'Pending', 'Ready', 'Assigned', 'In progress', 'Blocked', 'Completed', 'Cancelled', 'Active', 'Inactive',
  'Approved', 'Rejected', 'Resolved', 'Action Center item', 'Execution task', 'Alert', 'Integration contract',
  'Operational Action Center', 'Enterprise integration', 'Decision intelligence', 'AI governance', 'Control tower',
  'Tenant isolated', 'Permission gated', 'Audit-traceable source', 'Human action only', 'Approval gated when required',
  'No direct inventory mutation', 'No direct procurement mutation', 'No direct execution mutation', 'No direct financial mutation',
  'No ERP writeback', 'No accounting writeback', 'No supplier execution', 'No carrier execution', 'No external workflow execution', 'No external AI callout',
  'Open alert', 'Open execution task', 'Open review', 'Open source page', 'Refreshing…', 'Refresh plans', 'Yes', 'No', 'Not reported'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Workflow Composer dynamic display labels are missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} dynamic Workflow Composer labels are catalog-backed.`);

const representativeRows = [
  'Human workflow planning', 'Workflow Composer', 'Suggested workflow plans', 'Review and approval path', 'Where the work happens:',
  'Technical plan details', 'How to understand the plans', 'Safety and control', 'Technical safety contract', 'No autonomous execution'
];
const missingRepresentative = representativeRows.filter((key) => !uniqueKeys.has(key));
if (missingRepresentative.length) fail(`Missing representative Workflow Composer translations: ${missingRepresentative.join(' | ')}`);
else pass(`${representativeRows.length} representative Workflow Composer rows are present in all five locales.`);

if (!pageSource.includes('useAppTranslation()')) fail('Workflow Composer must use the shared translation context.');
if (!pageSource.includes('formatLocalizedDateTime(date, locale)')) fail('Workflow Composer timestamps must use locale-aware shared date/time formatting.');
if (!pageSource.includes('formatLocalizedNumber(numberValue(value), locale)')) fail('Workflow Composer summary counts must use locale-aware number formatting.');
if (pageSource.includes('.toLocaleString()')) fail('Workflow Composer must not use browser-default date formatting.');
if (!process.exitCode) pass('Workflow Composer dates and displayed counts use the selected application locale.');

const forbiddenEnglishPresentation = [
  'eyebrow="Human workflow planning"', 'title="Workflow Composer"', '>Suggested workflow plans<', '>How to use this page<',
  '>Loading workflow plans<', '>Technical plan details<', '>How to understand the plans<', '>Safety and control<',
  "? 'Refreshing…' : 'Refresh plans'", '>Review and approval path<', '>Where the work happens:<'
];
for (const pattern of forbiddenEnglishPresentation) if (pageSource.includes(pattern)) fail(`Workflow Composer still contains English-only presentation: ${pattern}`);

const forbiddenTechnicalTranslation = [
  "ui('/workflow-composer')", 'ui("/workflow-composer")',
  "ui('/operational-action-center/workflow-automation-composer-summary')", 'ui("/operational-action-center/workflow-automation-composer-summary")',
  "ui('workflow_domain')", 'ui("workflow_domain")', "ui('urgency')", 'ui("urgency")',
  "ui('execution')", 'ui("execution")', "ui('multi_domain')", 'ui("multi_domain")',
  "ui('approval_gated_review_flow')", 'ui("approval_gated_review_flow")',
  "ui('external_workflow_visibility_contract')", 'ui("external_workflow_visibility_contract")'
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical Workflow Composer technical value must remain language-independent: ${pattern}`);

const canonicalContracts = [
  "new URLSearchParams({ limit: '75' })", "params.set('workflow_domain', workflowDomain)", "params.set('urgency', urgency)",
  'apiRequest<WorkflowComposerResponse>(`/operational-action-center/workflow-automation-composer-summary?${params.toString()}`)',
  "new URLSearchParams({ resolved: 'false' })", "params.set('search', search)",
  "new URLSearchParams({ task_id: sourceId })", "new URLSearchParams({ source_action_id: blueprint.source_action_id })",
  'hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ)', 'hasPermission(TENANT_PERMISSIONS.ALERTS_READ)',
  'hasPermission(TENANT_PERMISSIONS.CONTROL_TOWER_READ)', 'hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ)',
  'hasPermission(TENANT_PERMISSIONS.ENTERPRISE_INTEGRATIONS_READ)', 'hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ)',
  "blueprint.blueprint_type === 'external_workflow_visibility_contract'", "value === 'approval_gated_review_flow'",
  "value === 'human_operated_triage_flow'", "value === 'read_only_workflow_blueprint_composition'"
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Workflow Composer API/filter/permission/blueprint contract changed during localization: ${contract}`);

const routerContracts = [
  "path: 'workflow-composer'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', '<WorkflowAutomationComposerPage />'
];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Workflow Composer router permission contract changed during localization: ${contract}`);
if (!process.exitCode) pass('Workflow Composer route, query filters, source links, permissions, and blueprint identifiers remain language-independent.');

const serverContentContracts = [
  'if (blueprint.source_title) return displayTitleText(blueprint.source_title);',
  'if (blueprint.source_summary) return blueprint.source_summary;',
  "guidance.next_blueprint_title ? displayTitleText(guidance.next_blueprint_title) : ui('No plan is waiting')",
  "guidance.composer_guidance || ui('Choose a plan and open its source page.')",
  "guidance.approval_chain_guidance || ui('Approval steps are suggestions and do not approve work.')",
  "guidance.event_trigger_guidance || ui('Trigger information is for review only.')",
  "guidance.integration_routing_guidance || ui('External integrations are not run from this page.')",
  'composerQuery.error instanceof ApiError ? composerQuery.error.message'
];
for (const contract of serverContentContracts) if (!pageSource.includes(contract)) fail(`Workflow Composer backend/business content display contract changed: ${contract}`);
const forbiddenServerContentTranslation = [
  'ui(blueprint.source_title)', 'ui(blueprint.source_summary)', 'ui(guidance.next_blueprint_title)', 'ui(guidance.composer_guidance)',
  'ui(guidance.approval_chain_guidance)', 'ui(guidance.event_trigger_guidance)', 'ui(guidance.integration_routing_guidance)',
  'ui(composerQuery.error.message)'
];
for (const pattern of forbiddenServerContentTranslation) if (pageSource.includes(pattern)) fail(`Backend-returned Workflow Composer content must not be blindly translated as a UI key: ${pattern}`);
if (!process.exitCode) pass('Backend titles, summaries, guidance, identifiers, and errors remain data while frontend-owned labels and fallbacks are localized.');

if (pageSource.includes('useMutation(') || pageSource.includes("method: 'POST'") || pageSource.includes("method: 'PUT'") || pageSource.includes("method: 'PATCH'") || pageSource.includes("method: 'DELETE'")) {
  fail('Workflow Composer must remain read-only and must not introduce mutation calls.');
} else {
  pass('Workflow Composer remains a read-only planning surface with source-workflow follow-up.');
}

if (!process.exitCode) console.log('Tenant Workflow Composer multilingual hardening: PASS');
