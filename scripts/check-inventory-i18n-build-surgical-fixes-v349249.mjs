import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const appLayout = read('src/layouts/AppLayout.tsx');
const navigationRegistry = read('src/app/navigationRegistry.ts');
const translations = read('src/i18n/tenantUiTranslations.ts');
const replenishment = read('src/pages/ReplenishmentPlanningPage.tsx');
const crossDomain = read('src/pages/CrossDomainOptimizationPage.tsx');
const learningFeedback = read('src/pages/DecisionLearningFeedbackPage.tsx');

const descriptions = [...navigationRegistry.matchAll(/description: '([^']+)'/g)].map((match) => match[1]);
const untranslatedDescriptions = descriptions.filter((description) => !translations.includes(JSON.stringify(description)));

const checks = [
  ['Navigation hover descriptions use tenant UI localization', appLayout.includes('title={ui(item.description)}')],
  ['Page subtitles use tenant UI localization', appLayout.includes('{ui(pageMeta.subtitle)}')],
  ['Navigation registry exposes expected tenant descriptions', descriptions.length >= 44],
  ['Every current tenant navigation/page description has a translation row', untranslatedDescriptions.length === 0],
  ['Audit exact action/type hints are translated after surgical fix 001', translations.includes('["Exact code, e.g. shipment.received"') && translations.includes('["Exact type, e.g. shipments"')],
  ['Replenishment currency fallback narrows unknown input before formatter call', replenishment.includes('const fallbackValue: number | string | null | undefined =')],
  ['Cross-Domain readiness review scores use the backend 0-100 score directly', crossDomain.includes('formatReviewScorePercentage(score, locale)') && crossDomain.includes('formatLocalizedNumber(parsed, locale, { maximumFractionDigits: 1 })')],
  ['Cross-Domain selected planning run is URL-backed', crossDomain.includes("searchParams.get('review_run_id')") && crossDomain.includes("nextParams.set('review_run_id', nextRunId)")],
  ['Cross-Domain exact Intelligence Review handoff carries source_action_id', crossDomain.includes("source_action_id: selectedRunReviewSourceActionId") && crossDomain.includes('navigate(selectedRunIntelligenceReviewPath)')],
  ['Cross-Domain Learning Feedback handoff carries run and selected option', crossDomain.includes("mode: 'optimization-results'") && crossDomain.includes('source_id: selectedRun.id') && crossDomain.includes('option_id: selectedRun.selected_option_id')],
  ['Learning Feedback consumes durable Cross-Domain source and option context', learningFeedback.includes("searchParams.get('source_id')") && learningFeedback.includes("searchParams.get('option_id')") && learningFeedback.includes('handleSourceChange(requestedSourceId)')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}

if (untranslatedDescriptions.length) {
  console.error('Missing description translations:');
  for (const description of untranslatedDescriptions) console.error(`- ${description}`);
}

if (failed) {
  console.error(`\n${failed}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nPASS ${checks.length}/${checks.length} surgical regression checks.`);
