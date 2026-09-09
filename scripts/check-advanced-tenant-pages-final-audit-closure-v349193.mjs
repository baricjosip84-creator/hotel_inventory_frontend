import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const intelligence = read('src/pages/HumanInLoopAIReviewPage.tsx');
const learning = read('src/pages/DecisionLearningFeedbackPage.tsx');
const crossDomain = read('src/pages/CrossDomainOptimizationPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (condition, message) => {
  checks.push({ condition: Boolean(condition), message });
};

// Intelligence Review: business users receive a sanitized readiness view; engineering internals are diagnostics-only.
check(intelligence.includes('/intelligence-readiness/business-readiness-summary'), 'Intelligence Review loads the dedicated business-readiness endpoint');
check(/const businessReadinessQuery = useQuery\([\s\S]*?enabled: activeView === 'readiness'\s*\}/.test(intelligence), 'business readiness loads for ordinary Decision Intelligence readers without diagnostics permission');
check((intelligence.match(/enabled: activeView === 'readiness' && canViewDiagnostics/g) || []).length >= 10, 'technical readiness queries require Tenant Diagnostics permission');
check(intelligence.includes("activeView === 'readiness' && !canViewDiagnostics"), 'ordinary users receive the business-only readiness surface');
check((intelligence.match(/activeView === 'readiness' && canViewDiagnostics/g) || []).length >= 12, 'engineering readiness surfaces remain diagnostics-gated');
check(intelligence.includes("ui(item.feature_label || 'Intelligence feature')"), 'business readiness feature names go through the tenant translation catalog');

// Learning Feedback: business evidence is readable/editable without JSON; raw structures are diagnostics-only.
check(learning.includes('function businessEvidenceEntries(') && learning.includes('function businessEvidenceObject('), 'Learning Feedback has business-safe structured-evidence adapters');
check(learning.includes("expected: formBusinessEvidence(expected, locale, ui)") && learning.includes("observed: formBusinessEvidence(observed, locale, ui)"), 'editing stored expected/observed evidence uses business text rather than serialized JSON');
check(learning.includes("<summary>{ui('Technical structured evidence')}</summary>") && /\{canViewDiagnostics \? \([\s\S]*?<pre>\{JSON\.stringify\(\{ expected, observed \}, null, 2\)\}<\/pre>[\s\S]*?\) : null\}/.test(learning), 'raw expected/observed JSON is available only inside the diagnostics-only disclosure');
for (const forbidden of [
  'Outcome review reason JSON', 'Business impact evidence JSON', 'Target evidence JSON', 'Counterfactual reference JSON',
  'Attribution evidence JSON', 'Measurement quality evidence JSON', 'Evaluation SLA evidence JSON',
  'Outcome acceptance evidence JSON', 'Corrective action evidence JSON', 'Learning signal evidence JSON',
  'Learning action evidence JSON', 'Lifecycle evidence JSON'
]) {
  check(!learning.includes(forbidden), `normal Learning Feedback UI no longer asks for ${forbidden}`);
}
check((learning.match(/type="datetime-local"/g) || []).length >= 10, 'business lifecycle/evaluation dates use datetime-local controls');
check(/\{canViewDiagnostics \? \([\s\S]*?Technical execution reference[\s\S]*?executionReference[\s\S]*?\) : null\}/.test(learning), 'technical execution-reference editor is diagnostics-only');
check(!/value\.map\(\(item\) => businessEvidenceScalar\(item/.test(learning), 'arrays of structured business evidence are recursively rendered instead of becoming [object Object]');
check(learning.includes('function businessEvidenceFieldLabel(') && learning.includes('return systemLabel ? ui(systemLabel) : key;'), 'Learning Feedback translates only known system evidence fields and preserves unknown/custom field names verbatim');
check(learning.includes("if (depth > 3) return [{ label: prefix, value: ui('Additional structured evidence is available.') }];"), 'deep Learning Feedback evidence has a safe business-facing fallback instead of disappearing');
check(!learning.includes('const keyLabel = ui(formatLabel(key));'), 'Learning Feedback business evidence no longer generic-formats arbitrary structured field names');

// Cross-Domain Optimization: nested evidence must never fall back to raw JSON in normal presentation.
check(crossDomain.includes('function referenceValueText(') && crossDomain.includes('depth + 1'), 'Cross-Domain uses a recursive business evidence renderer');
check(!crossDomain.includes('JSON.stringify(item)'), 'Cross-Domain normal evidence presentation has no nested JSON.stringify fallback');
check(/referenceText\([^\n]+locale, ui\)/.test(crossDomain), 'Cross-Domain reference rendering receives locale and UI translation context');
check(crossDomain.includes("ui('Additional structured evidence is available.')"), 'deep nested evidence has a safe business-facing fallback');
check(crossDomain.includes('if (items.length > visibleItems.length)') && crossDomain.includes('hiddenStructuredEvidence'), 'Cross-Domain indicates truncated structured evidence instead of silently dropping it');
check(crossDomain.includes('function referenceFieldLabel(') && crossDomain.includes('return systemLabel ? ui(systemLabel) : key;'), 'Cross-Domain translates only known system reference fields and preserves unknown/custom field names verbatim');
check(!crossDomain.includes("const keyLabel = ui(CANONICAL_LABELS[key] || key.replaceAll('_', ' '));"), 'Cross-Domain nested evidence no longer generic-formats arbitrary structured field names');

// Translation and CI protection.
for (const key of ['Business readiness', 'Technical diagnostics', 'Technical structured evidence', 'Additional structured evidence is available.']) {
  const row = catalog.split('\n').find((line) => line.includes(JSON.stringify(key)));
  check(Boolean(row) && (row.match(/"/g) || []).length >= 10, `${key} has a complete five-language catalog row`);
}
check(pkg.scripts['check:advanced-tenant-pages-final-audit-closure-v349193'] === 'node scripts/check-advanced-tenant-pages-final-audit-closure-v349193.mjs', 'v3.49.193 frontend guard is registered');
check(pkg.scripts.prelint?.includes('npm run check:advanced-tenant-pages-final-audit-closure-v349193 && npm run check:command-wide-operational-closure-v349194'), 'v3.49.193 guard remains immediately before the newer v3.49.194 closure before lint');
check(pkg.scripts.prebuild?.includes('check:advanced-tenant-pages-final-audit-closure-v349193'), 'v3.49.193 guard runs before build');
check(pkg.scripts['check:ci']?.endsWith('npm run check:advanced-tenant-pages-final-audit-closure-v349193 && npm run check:command-wide-operational-closure-v349194'), 'v3.49.193 guard is followed only by the newer v3.49.194 closure at the frontend CI tail');

const failures = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'} - ${item.message}`);
if (failures.length) {
  console.error(`v3.49.193 advanced tenant pages final audit closure guard: FAIL (${checks.length - failures.length}/${checks.length})`);
  process.exit(1);
}
console.log(`v3.49.193 advanced tenant pages final audit closure guard: PASS (${checks.length}/${checks.length})`);
