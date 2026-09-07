import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pages = {
  feed: read('src/pages/RealTimeOperationsFeedPage.tsx'),
  workflow: read('src/pages/WorkflowAutomationComposerPage.tsx'),
  review: read('src/pages/HumanInLoopAIReviewPage.tsx'),
  copilot: read('src/pages/AIOperationsCopilotPage.tsx'),
  learning: read('src/pages/DecisionLearningFeedbackPage.tsx'),
  cross: read('src/pages/CrossDomainOptimizationPage.tsx'),
  twin: read('src/pages/DigitalTwinVisualizationPage.tsx')
};
const catalog = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));
let pass = 0; let fail = 0;
const check = (ok, msg) => { if (ok) { pass += 1; console.log(`PASS: ${msg}`); } else { fail += 1; console.error(`FAIL: ${msg}`); } };

const rows = new Map();
for (const line of catalog.split(/\r?\n/)) {
  const t = line.trim();
  if (!t.startsWith('[') || !t.endsWith('],')) continue;
  try { const row = JSON.parse(t.slice(0, -1)); if (Array.isArray(row) && row.length === 5) rows.set(row[0], row); } catch {}
}
const required = [
  'Low stock','Negative stock blocked','Stock ledger mismatch','Expired stock','Stock expiring soon','Inventory usage anomaly',
  'Purchase Order draft recommendation','Minimum-stock proposal','Standard-cost proposal','A governed Copilot proposal is awaiting human review.',
  'Learning outcomes marked needs_review require human validation before they can influence future decision tuning.',
  'Forecast evidence shows calibration drift or outside-tolerance outcomes that should be reviewed before forecast rules are adjusted.',
  'Policy effectiveness evidence indicates rules or objective weights may need human-approved tuning.',
  'Optimization result evidence shows missed value or tradeoff drift that should be reviewed before objective weights are changed.',
  'No learning evidence currently requires recalibration, policy tuning, optimization review, or outcome review.',
  'Control Tower','Learning outcome','Forecast accuracy','Policy effectiveness','Optimization result',
  'Actual value score','Comparison available in the recorded evidence.',
  'This topology point has visible dependencies in the current permitted snapshot.',
  'This is the highest-priority visible topology point in the current permitted snapshot.'
];
const missing = required.filter((key) => !rows.has(key));
check(missing.length === 0, `all ${required.length} v3.49.188 business-facing strings are in the five-language catalog${missing.length ? `: ${missing.join(' | ')}` : ''}`);
const parity = required.filter((key) => { const row = rows.get(key); return row && row.slice(1).some((value) => value === row[0]); });
check(parity.length === 0, `v3.49.188 strings have real non-English translations${parity.length ? `: ${parity.join(' | ')}` : ''}`);

const feedWithoutBlockComments = pages.feed.replace(/\/\*[\s\S]*?\*\//g, '');
check(!feedWithoutBlockComments.includes('to="/workspace"'), 'Operations Feed does not expose the old Workspace shortcut');
check(pages.feed.includes('to="/action-center"'), 'Operations Feed keeps Action Center as the visible operational inbox');

check(pages.workflow.includes('return blueprint.source_title_key ? ui(blueprint.source_title) : blueprint.source_title;'), 'Workflow Composer translates keyed system titles and preserves unkeyed custom alert titles verbatim');
check(!pages.workflow.includes('displayTitleText('), 'Workflow Composer no longer humanizes arbitrary alert/business titles');

check(pages.copilot.includes('const COPILOT_PROPOSAL_TITLE_LABELS') && pages.copilot.includes('governedProposalTitle(proposal, ui)'), 'AI Copilot governed proposal titles use bounded localized templates');
check(pages.copilot.includes("product_min_stock_update: 'Minimum-stock proposal'") && pages.copilot.includes("cost_standard_update: 'Standard-cost proposal'"), 'AI Copilot covers all governed proposal request types');
check(pages.review.includes('const COPILOT_REVIEW_TITLE_LABELS') && pages.review.includes('intelligenceReviewTitle(review, ui)'), 'Intelligence Review localizes current and older Copilot proposal titles without translating arbitrary review titles');

check(pages.learning.includes('learningActionRationale(action, ui)') && pages.learning.includes('rationale_key?: string;'), 'Learning Feedback action rationale uses stable system ownership');
check(pages.learning.includes('learningDomainLabel(domain.domain, ui)') && pages.learning.includes('learningEvidenceTypeLabel(type, ui)'), 'Learning Feedback bounded domains and evidence types use explicit localized mappings');
check(!pages.learning.includes("<td>{action.rationale || '—'}</td>") && !pages.learning.includes("(row.missing_evidence_types || []).map(formatLabel)"), 'Learning Feedback no longer exposes fixed rationale/evidence identifiers through generic formatting');
for (const direct of ['report.closure_note}</p>','readiness.monitoring_note}</p>','surveillance.surveillance_note}</p>']) check(!pages.learning.includes(direct), `Learning Feedback fixed backend note is not rendered raw: ${direct}`);

check(pages.cross.includes('function comparisonSummaryText('), 'Cross-Domain has a dedicated business comparison renderer');
check(pages.cross.includes('comparisonSummaryText(result.comparison_summary, locale, ui)'), 'Cross-Domain comparison summary uses the business renderer');
check(!pages.cross.includes('referenceText(result.expected_tradeoff || result.comparison_summary)') && !pages.cross.includes('referenceText(result.comparison_summary)'), 'Cross-Domain no longer sends comparison_summary through generic object/JSON formatting');

check(pages.twin.includes('title_key?: string | null;') && pages.twin.includes('summary_key?: string | null;'), 'Digital Twin review-first contract carries translation identities');
check(pages.twin.includes('reviewFirst.title_key ? digitalTwinSystemText') && pages.twin.includes('reviewFirst.summary_key ? digitalTwinSystemText'), 'Digital Twin Review this first consumes translated system identities');

const ci = String(pkg.scripts?.['check:ci'] || '');
check(ci.startsWith('npm run check:tenant-multilingual-closure-audit && npm run check:command-pages-lint-closure-v349189 && npm run check:command-pages-final-producer-renderer-closure-v349188 && npm run check:backend-system-text-remaining-enum-localization-v349187 && '), 'tenant multilingual closure remains first and v3.49.189/v3.49.188 run before older command-page closure guards');
check(String(pkg.scripts?.['check:command-pages-final-producer-renderer-closure-v349188'] || '').includes('check-command-pages-final-producer-renderer-closure-v349188.mjs'), 'v3.49.188 frontend guard is registered');

console.log(`Command pages final producer-renderer closure v3.49.188 frontend guard: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
