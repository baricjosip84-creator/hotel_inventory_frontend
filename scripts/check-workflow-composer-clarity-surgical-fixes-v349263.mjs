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

check('Workflow Composer still suppresses the obsolete assign-owner step when responsibility already exists.',
  page.includes("step === 'assign_human_owner' && responsibilityAlreadyAssigned(blueprint)")
  && page.includes('responsibility?.assignee_name')
  && page.includes('responsibility?.responsible_role'));

check('Review guidance now names the current responsibility explicitly.',
  page.includes('ui("Current responsibility")')
  && page.includes('responsibilityText(blueprint, ui)'));

check('Review guidance distinguishes whether additional review or approval is suggested.',
  page.includes('function additionalReviewOrApprovalSuggested(approvalSteps: string[]): boolean')
  && page.includes('return approvalSteps.length > 1;')
  && page.includes('ui("Additional review or approval suggested")'));

check('Generic source-owner approval wording was replaced with a follow-up review statement.',
  page.includes("source_owner_review: 'Source work owner reviews this follow-up'")
  && !page.includes("source_owner_review: 'The owner of the source work reviews it'"));

check('Governance approval and manual authorization steps say what kind of decision they represent.',
  page.includes("governance_reviewer_approval: 'Governance reviewer approval is suggested'")
  && page.includes("manual_execution_authorization: 'An authorised person confirms the work may continue'"));

check('Repeated per-plan guidance is collapsed behind one Plan guidance disclosure.',
  page.includes('<details className="workflow-composer-page__guidance-details">')
  && page.includes('ui("Plan guidance")')
  && page.includes('ui("Steps, review path, and where the work happens")'));

check('Suggested steps, review path, and routing guidance remain available inside the disclosure.',
  page.includes('className="workflow-composer-page__guidance-details-body"')
  && page.includes('ui("Suggested steps")')
  && page.includes('ui("Review and approval path")')
  && page.includes('ui("Where the work happens:")'));

check('Source action remains directly visible outside the collapsed guidance disclosure.',
  page.indexOf('</details>\n\n                    <div className="workflow-composer-page__actions">') > 0
  && page.includes('blueprintSourceLink(blueprint)'));

check('Duplicate titles are detected using the user-visible title.',
  page.includes('const visibleTitle = sourceTitle(blueprint, ui);')
  && page.includes('sourceTitle(candidate, ui) === visibleTitle'));

check('A compact source reference is shown only when a title is duplicated.',
  page.includes('function shortSourceReference(blueprint: WorkflowBlueprint): string | null')
  && page.includes('duplicateTitle && sourceReference')
  && page.includes('ui("Reference")'));

check('UUID references are shortened rather than exposing a full UUID in the normal card.',
  page.includes("const uuidPrefix = tail.match(/^([0-9a-f]{8})-/i);")
  && page.includes('if (uuidPrefix) return uuidPrefix[1];'));

check('Full technical identifiers remain diagnostics-gated.',
  page.includes('{canViewDiagnostics ? (')
  && page.includes('ui("Technical plan details")')
  && page.includes("{ label: 'Plan ID', value: blueprint.blueprint_id }")
  && page.includes("{ label: 'Source record ID', value: blueprint.trigger_preview?.trigger_reference || blueprint.source_contract_id || null }")
  && page.includes("{ label: 'Source action ID', value: blueprint.source_action_id || null }"));

check('Diagnostics identifiers have a Copy ID affordance using the shared clipboard feedback path.',
  page.includes('navigator.clipboard?.writeText(identifier.value || \'\')')
  && page.includes('ui("Copy ID")')
  && page.includes('data-skip-global-action-feedback="true"'));

check('Durable exact alert/task/review source links remain intact.',
  page.includes("params.set('alert_id', sourceId)")
  && page.includes("new URLSearchParams({ task_id: sourceId })")
  && page.includes("new URLSearchParams({ source_action_id: blueprint.source_action_id })"));

check('Workflow Composer remains read-only after the presentation correction.',
  !page.includes('useMutation(')
  && !page.includes("method: 'POST'")
  && !page.includes("method: 'PUT'")
  && !page.includes("method: 'PATCH'")
  && !page.includes("method: 'DELETE'"));

check('New compact-guidance, review-context, reference, and copy controls have dedicated styling.',
  css.includes('.workflow-composer-page__guidance-details')
  && css.includes('.workflow-composer-page__review-context')
  && css.includes('.workflow-composer-page__short-reference')
  && css.includes('.workflow-composer-page__copy-id'));

const requiredTranslations = [
  'Plan guidance',
  'Steps, review path, and where the work happens',
  'Current responsibility',
  'Additional review or approval suggested',
  'Source work owner reviews this follow-up',
  'Governance reviewer approval is suggested',
  'An authorised person confirms the work may continue'
];
check('All new Workflow Composer business phrases are present in the five-language tenant catalog.',
  requiredTranslations.every((row) => translations.includes(`[${JSON.stringify(row)},`)));

check('All new Workflow Composer translation rows contain five language values.',
  requiredTranslations.every((row) => {
    const line = translations.split(/\r?\n/).find((candidate) => candidate.includes(`[${JSON.stringify(row)},`));
    if (!line) return false;
    try {
      const parsed = JSON.parse(line.trim().replace(/,$/, ''));
      return Array.isArray(parsed) && parsed.length === 5 && parsed.every((value) => typeof value === 'string' && value.length > 0);
    } catch {
      return false;
    }
  }));

check('Dedicated Batch 018 guard is wired into package scripts.',
  packageJson.includes('check:inventory-workflow-composer-clarity-surgical-fixes-v349263'));

console.log(`Workflow Composer clarity surgical guard: ${checks.length}/${checks.length} PASS`);
