import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('src/pages/CrossDomainOptimizationPage.tsx');
const css = read('src/pages/CrossDomainOptimizationPage.css');
const providers = read('src/app/AppProviders.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

let passed = 0;
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
  console.log(`PASS: ${message}`);
};

check(page.includes('const SHOW_V349218_MANUAL_CREATE_UI = false') && page.includes('SHOW_V349218_MANUAL_CREATE_UI && showCreate && canGovern'), 'v3.49.218 prose-driven wizard is preserved in source but disabled');
check(page.includes("TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_READ") && page.includes("/optimization-plans/execution-dashboard?limit=50&minimum_score=0"), 'new workflow reads existing optimization evidence through the established permission and endpoint');
check(page.includes("['candidate', 'recommended'].includes(item.status)"), 'only pre-decision source recommendations are offered as candidate actions');
check(page.includes('selectedRecommendationIds') && page.includes('sourceScopeTokens') && page.includes('sharedSourceScope'), 'selected actions are tied together by structured system identifiers');
check(page.includes("sharedSourceScope([...selectedRecommendations, candidate]).length > 0"), 'unrelated source records are prevented from entering the same comparison');
check(page.includes("human_text_not_analyzed: true") && page.includes("comparison_basis: 'structured_application_evidence'"), 'human text is explicitly separated from calculation evidence');
check(page.includes('aggregate_score: null') && page.includes('source_score_note:'), 'Cross-Domain does not invent or normalize a winner score');
check(page.includes('impact_snapshot: simpleRecord(item.impact_snapshot)') && page.includes('commonImpactMetrics'), 'actual source impact evidence is retained and only like-named structured fields are lined up');
check(page.includes("objective_type: 'general'") && page.includes('objective_domain: domain') && page.includes('recommendation_ids:'), 'required backend objectives are derived from structured source domains rather than user prose');
check(page.includes('selectedRecommendations.length < 2 || !selectedSharedScope.length'), 'saving requires at least two actions for the same structured subject');
check(page.includes("ui('This text is saved for people. It is not used to calculate the comparison.')"), 'UI tells users that their prose is human context only');
check(page.includes("ui('No winner is generated here."), 'comparison UI explicitly rejects an automatic winner');
check(page.includes("ui('Cross-Domain score')") && page.includes("ui('Not calculated')"), 'saved source-backed options show that Cross-Domain scoring was not calculated');
check(page.includes('isSourceBacked') && page.includes('flattenImpactFacts(projected.impact_snapshot)'), 'saved source-backed option detail renders originating structured evidence');
check(providers.includes("if (feedbackEvent.detail.type === 'info') return;"), 'generic informational action toasts are suppressed globally while success/error paths remain');
check(css.includes('.cross-domain-source-card') && css.includes('.cross-domain-source-comparison-card') && css.includes('.cross-domain-human-note'), 'source-backed workflow has bounded responsive styling');
for (const text of ['Human note — not calculation input','Source-backed actions','Compare source data','No candidate actions are available','Cross-Domain score','Not calculated']) {
  check(translations.includes(`["${text}"`), `v3.49.221 UI text is catalog-backed: ${text}`);
}
check(!page.includes('Use internal transfers first, then buy the remainder') && !page.includes('Buy the shortage from suppliers without the recommended transfers'), 'no replenishment-only hard-coded A/B scenario is present');
for (const key of ['prelint','prebuild','check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349218 && npm run check:inventory-testing-hardening-v349221'), `v3.49.221 follows v3.49.218 in ${key}`);
}

console.log(`v3.49.221 Cross-Domain source-backed comparison guard: ${passed}/${passed} PASS`);
