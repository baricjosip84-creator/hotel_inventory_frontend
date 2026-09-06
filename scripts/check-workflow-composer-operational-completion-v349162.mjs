import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const page = read('src/pages/WorkflowAutomationComposerPage.tsx');
const css = read('src/pages/WorkflowAutomationComposerPage.css');
const translations = read('src/i18n/tenantUiTranslations.ts');
const packageJson = read('package.json');

const checks = [];
function check(label, condition) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  checks.push(label);
  console.log(`PASS: ${label}`);
}

check('Workflow Composer offers all, assigned-to-me, unassigned, and actionable filters.',
  page.includes("{ value: 'all', label: 'All plans' }")
  && page.includes("{ value: 'mine', label: 'Assigned to me' }")
  && page.includes("{ value: 'unassigned', label: 'Unassigned work' }")
  && page.includes("{ value: 'actionable', label: 'I can act' }"));
check('Responsibility participates in API filters and React Query cache identity.',
  page.includes("params.set('responsibility', responsibility)")
  && page.includes("queryKey: ['workflow-automation-composer', workflowDomain, urgency, responsibility]"));
check('Assigned/unassigned responsibility filters only offer workflow domains backed by real task assignment.',
  page.includes("const assignmentOnly = responsibility === 'mine' || responsibility === 'unassigned';")
  && page.includes("new Set<WorkflowDomain>(['execution', 'reservation', 'procurement', 'fulfillment', 'replenishment', 'transfer'])")
  && page.includes('return !assignmentOnly || assignmentDomains.has(option.value);'));
check('Workflow cards explicitly explain what happened and what should happen next.',
  page.includes('ui("What happened")')
  && page.includes('ui("What should happen next")')
  && page.includes('blueprint.recommended_next_step'));
check('Workflow cards display responsibility from source data.',
  page.includes('responsibilityText(blueprint, ui)')
  && page.includes('responsibility?.assignee_name')
  && page.includes("responsibility?.assignment_state === 'unassigned'"));
check('Workflow cards display physical location only when source context exists.',
  page.includes('locationText(blueprint, ui)')
  && page.includes('from_location_name')
  && page.includes('to_location_name')
  && page.includes('storage_location_name'));
check('Workflow cards display deadline state and effective due date.',
  page.includes('deadlineText(blueprint, locale, ui)')
  && page.includes("const state = String(context?.due_state || 'none')")
  && page.includes('context?.effective_due_at'));
check('Workflow cards distinguish role actionability from read-only access.',
  page.includes("blueprint.viewer_can_act ? 'Source actions available to your role' : 'View-only source access'"));
check('Workflow Composer remains read-only in the frontend.',
  page.includes('apiRequest<WorkflowComposerResponse>')
  && !page.includes('useMutation(')
  && !page.includes("method: 'POST'")
  && !page.includes("method: 'PATCH'")
  && !page.includes("method: 'DELETE'"));
check('Existing source-page routing remains present.',
  page.includes('blueprintSourceLink(blueprint)')
  && page.includes('Open execution task')
  && page.includes('Open review')
  && page.includes('Open source page'));
check('New responsibility/context presentation has dedicated responsive styling.',
  css.includes('.workflow-composer-page__situation-grid')
  && css.includes('.workflow-composer-page__context-grid')
  && css.includes('.workflow-composer-page__context-item--danger'));

const requiredRows = [
  'All plans',
  'Assigned to me',
  'Unassigned work',
  'I can act',
  'Responsibility',
  'What happened',
  'What should happen next',
  'Follow the suggested steps and continue in the source workflow.',
  'Your access',
  'Source actions available to your role',
  'View-only source access',
  'Managed in source workflow',
  'Role:',
  'Assigned role',
  'Decision Intelligence Reviewer',
  'No suggested workflow plan matched the selected work area, urgency, and responsibility filter.',
  'Read-only workflow guidance that explains what happened, who is responsible, where the work belongs, when it is due, and what should happen next. Nothing is published, automated, or executed from this page.',
  'Review the integration governance plan and continue only in the permitted source workflow.'
];
check('Every new Workflow Composer phrase is present in the five-language tenant catalog.',
  requiredRows.every((row) => translations.includes(`[${JSON.stringify(row)},`)));
check('Every new Workflow Composer phrase has all five language values.',
  requiredRows.every((row) => {
    const index = translations.indexOf(`[${JSON.stringify(row)},`);
    if (index < 0) return false;
    const end = translations.indexOf('],', index);
    if (end < 0) return false;
    const source = translations.slice(index, end + 1);
    let quotes = 0;
    let escaped = false;
    for (const char of source) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') quotes += 1;
    }
    return quotes >= 10;
  }));
check('Dedicated v3.49.162 frontend guard is wired into package scripts.',
  packageJson.includes('check:workflow-composer-operational-completion-v349162'));

console.log(`Workflow Composer operational completion frontend guard: ${checks.length}/${checks.length} PASS`);
