import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/RoleAwareWorkspacePage.tsx');
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
if (missingLiterals.length) fail(`Workspace has ui() literals missing from the five-language catalog: ${missingLiterals.join(' | ')}`);
else pass(`Workspace has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'All work areas', 'Alerts', 'Execution tasks', 'Cross-area risk signals', 'Decision reviews', 'AI governance reviews', 'Multi-area work',
  'All urgency levels', 'Critical', 'High', 'Medium', 'Low',
  'urgent work', 'items waiting for approval', 'issues affecting more than one area', 'controlled human reviews',
  'daily operational tasks', 'warnings that need attention', 'work allowed for this role',
  'Review important work across the tenant and send each item to the correct controlled process.',
  'Coordinate daily operational work, warnings, and approvals.', 'Follow assigned work and deal with urgent warnings safely.',
  'Review only the work that this role is allowed to see.',
  'Priority work list', 'All visible work, ordered so the most urgent items come first.',
  'Items waiting for approval', 'Work that needs a person to review or approve it.',
  'Decision reviews', 'Recommendations or decisions that still need human control.',
  'Alerts to review', 'Warnings that should be checked and handled in the Alerts page.',
  'My execution work', 'Operational tasks currently visible to this role.',
  'Urgent alerts', 'High-pressure warnings that should be reviewed first.',
  'Safest next step', 'The highest-priority work that can be reviewed next.',
  'Open alert', 'Open execution task', 'Open review', 'Open source page',
  'AI governance', 'Control tower', 'Decision intelligence', 'Multi-domain', 'Approval required', 'Review required', 'In review', 'In progress'
];
const missingDynamicLabels = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamicLabels.length) fail(`Workspace dynamic display labels are missing translations: ${missingDynamicLabels.join(' | ')}`);
else pass(`${dynamicLabels.length} dynamic Workspace labels are catalog-backed.`);

const representativeRows = [
  'Role-aware command workspace', 'Workspace', 'Workspace controls', 'Workspace summaries', 'Guided next actions',
  'Role filtering', 'Read-only summary', 'Where to start', 'View in Action Center', 'current access role'
];
const missingRepresentative = representativeRows.filter((key) => !uniqueKeys.has(key));
if (missingRepresentative.length) fail(`Missing representative Workspace translations: ${missingRepresentative.join(' | ')}`);
else pass(`${representativeRows.length} representative Workspace rows are present in all five locales.`);

if (!pageSource.includes('useAppTranslation()')) fail('Workspace must use the shared translation context.');
if (!pageSource.includes('formatLocalizedDateTime(date, locale)')) fail('Workspace generated timestamp must use locale-aware shared date/time formatting.');
if (!pageSource.includes('formatLocalizedNumber(numberValue(summary.total_actions ?? actions.length), locale)')) fail('Workspace summary counts must use locale-aware number formatting.');
if (!pageSource.includes('formatLocalizedNumber(count, locale)')) fail('Workspace widget counts must use locale-aware number formatting.');
if (!process.exitCode) pass('Workspace dates and displayed counts use the selected application locale.');

const forbiddenEnglishPresentation = [
  'eyebrow="Role-aware command workspace"', 'title="Workspace"', '>Workspace controls<', '>Workspace summaries<', '>Guided next actions<',
  'aria-label="Filter by work area"', "? 'Refreshing…' : 'Refresh'", '>View in Action Center<'
];
for (const pattern of forbiddenEnglishPresentation) if (pageSource.includes(pattern)) fail(`Workspace still contains English-only presentation: ${pattern}`);

const forbiddenTechnicalTranslation = [
  "ui('/workspace')", 'ui("/workspace")', "ui('/operational-action-center/workspace-summary')", 'ui("/operational-action-center/workspace-summary")',
  "ui('all')", 'ui("all")', "ui('critical')", 'ui("critical")', "ui('control_tower')", 'ui("control_tower")',
  "ui('operational_action_center.read')", 'ui("operational_action_center.read")'
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical Workspace technical value must remain language-independent: ${pattern}`);

const canonicalContracts = [
  "apiRequest<WorkspaceResponse>(`/operational-action-center/workspace-summary?${params.toString()}`)",
  "params.set('action_domain', domain)", "params.set('urgency', urgency)",
  "paramName: 'domain'", "paramName: 'urgency'", 'allowedValues: ACTION_DOMAIN_VALUES', 'allowedValues: URGENCY_FILTER_VALUES',
  'hasPermission(TENANT_PERMISSIONS.ALERTS_READ)', 'hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ)',
  'hasPermission(TENANT_PERMISSIONS.CONTROL_TOWER_READ)', 'hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ)'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Workspace API/filter/permission contract changed during localization: ${contract}`);

const routerContract = [
  "path: 'workspace'",
  'requiredPermissions={[TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ]}',
  '<RoleAwareWorkspacePage />'
];
for (const contract of routerContract) if (!routerSource.includes(contract)) fail(`Workspace router permission contract changed during localization: ${contract}`);
if (!process.exitCode) pass('Workspace route, query filters, permissions, and read-only backend endpoint remain language-independent.');

const serverContentContracts = [
  '{actionTitleLabel(action)}', "{action.summary || ui('No summary provided.')}", '<span>{action.recommended_next_step}</span>',
  "{response?.guidance?.operator_guidance || ui('Workspace guidance is not available yet.')}",
  "{response?.guidance?.escalation_guidance || ui('Only permitted work is included.')}", 'value={accessRoleLabel}', 'accessRole.localizationKey ? ui(accessRole.localizationKey) : accessRole.label'
];
for (const contract of serverContentContracts) if (!pageSource.includes(contract)) fail(`Workspace backend/user-provided content display contract changed: ${contract}`);
const forbiddenServerContentTranslation = [
  'ui(action.title)', 'ui(action.summary)', 'ui(action.recommended_next_step)', 'ui(response.guidance.operator_guidance)',
  'ui(response.guidance.escalation_guidance)', 'ui(accessRole.label)'
];
for (const pattern of forbiddenServerContentTranslation) if (pageSource.includes(pattern)) fail(`Backend/user-provided Workspace content must not be blindly translated as a UI key: ${pattern}`);
if (!pageSource.includes('snapshot?.custom_role_id || snapshot?.custom_role_name?.trim()')) fail('Workspace must preserve custom role names as user-defined data.');
if (!process.exitCode) pass('Backend-returned action/guidance content and custom access-role names remain data; built-in role labels are localized.');

if (!process.exitCode) console.log('Tenant Workspace multilingual hardening: PASS');
