import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/HumanInLoopAIReviewPage.tsx');
const css = read('src/pages/HumanInLoopAIReviewPage.css');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });

expect('25-row pagination request', page.includes("limit: sourceActionId ? '1' : '25'") && page.includes("offset: sourceActionId ? '0' : String(offset)"));
expect('true total pagination UI', page.includes("reviewQuery.data?.pagination?.total") && page.includes("reviewQuery.data?.pagination?.next_offset") && page.includes("reviewQuery.data?.pagination?.previous_offset"));
expect('review search', page.includes("Search reviews") && page.includes("params.set('search', search.trim())"));
expect('review sorting', page.includes('REVIEW_SORT_OPTIONS') && page.includes("'due_soonest'"));
expect('overdue review filter', page.includes("{ value: 'overdue', label: 'Overdue escalations' }") && page.includes("params.set('due_state', 'overdue')"));
expect('overdue and due-soon visibility', page.includes("ui('OVERDUE')") && page.includes("ui('Due soon')") && css.includes('.ai-review-page__badge--overdue'));
expect('specific reviewer assignment', page.includes("Specific reviewer (optional)") && page.includes('escalation_target_user_id'));
expect('named ownership controls attention', page.includes("lifecycle?.escalation_target_user_id") && page.includes("tenantAccess.userId"));
expect('business impact explanation', page.includes("ui('Business impact')") && page.includes('reviewBusinessImpactRows'));
expect('business impact does not promise mutation', page.includes('No business record changes automatically.') && page.includes('This page leaves the current business records unchanged.'));
expect('simple readiness overview', page.includes('ai-review-page__readiness-overview') && page.includes("ui('Overall status')") && page.includes("ui('What needs your attention')"));
expect('detailed governance retained', page.includes('ai-review-page__readiness-details') && page.includes("ui('Governance readiness details')"));
expect('new presentation styled', css.includes('.ai-review-page__business-impact') && css.includes('.ai-review-page__pagination') && css.includes('.ai-review-page__readiness-overview'));
for (const key of ['Search reviews','Overdue escalations','Business impact','Specific reviewer (optional)','Overall status','What needs your attention']) {
  expect(`five-language catalog row: ${key}`, catalog.includes(`[\"${key}\"`));
}

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'}: ${check.name}`);
const failed = checks.filter((check) => !check.pass);
if (failed.length) process.exit(1);
console.log(`Intelligence Review operational completion frontend guard: ${checks.length}/${checks.length} PASS.`);
