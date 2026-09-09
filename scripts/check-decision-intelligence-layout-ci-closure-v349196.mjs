import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const page = read('src/pages/DecisionLearningFeedbackPage.tsx');
const css = read('src/pages/DecisionLearningFeedbackPage.css');
const layoutGuard = read('scripts/check-decision-intelligence-layout.mjs');
const packageJson = read('package.json');

const checks = [
  ['Learning Feedback business evidence wrapper remains present', page.includes('className="learning-feedback-business-evidence"')],
  ['Learning Feedback business evidence wrapper has a scoped stylesheet rule', css.includes('.learning-feedback-page .learning-feedback-business-evidence {')],
  ['Business evidence rows have stable spacing', css.includes('.learning-feedback-page .learning-feedback-business-evidence > div {')],
  ['Business evidence text can wrap instead of overflowing', css.includes('overflow-wrap: anywhere;') && css.includes('white-space: pre-wrap;')],
  ['Decision Intelligence layout guard reads Learning Feedback page-specific styles', layoutGuard.includes("'src/pages/DecisionLearningFeedbackPage.css'" )],
  ['Decision Intelligence layout guard reads Forecasting page-specific styles', layoutGuard.includes("'src/pages/ProbabilisticForecastingPage.css'" )],
  ['Decision Intelligence layout guard still reads Cross-Domain page-specific styles', layoutGuard.includes("'src/pages/CrossDomainOptimizationPage.css'" )],
  ['Decision Intelligence layout guard discovers class tokens from every page-specific stylesheet', layoutGuard.includes('for (const pageStylePath of pageStylePaths)') && layoutGuard.includes('pageStyles.matchAll')],
  ['v3.49.196 closure guard is registered', packageJson.includes('check:decision-intelligence-layout-ci-closure-v349196')],
  ['v3.49.196 follows v3.49.195 in prelint', /"prelint"[^\n]*check:alert-current-state-lifecycle-v349195 && npm run check:decision-intelligence-layout-ci-closure-v349196/.test(packageJson)],
  ['v3.49.196 follows v3.49.195 in prebuild', /"prebuild"[^\n]*check:alert-current-state-lifecycle-v349195 && npm run check:decision-intelligence-layout-ci-closure-v349196/.test(packageJson)],
  ['v3.49.196 follows v3.49.195 in check:ci', /"check:ci"[^\n]*check:alert-current-state-lifecycle-v349195 && npm run check:decision-intelligence-layout-ci-closure-v349196/.test(packageJson)]
];

let passed = 0;
for (const [label, ok] of checks) {
  if (ok) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    console.error(`FAIL: ${label}`);
  }
}

if (passed !== checks.length) {
  console.error(`v3.49.196 Decision Intelligence layout CI closure frontend guard: ${passed}/${checks.length} PASS`);
  process.exit(1);
}
console.log(`v3.49.196 Decision Intelligence layout CI closure frontend guard: PASS (${passed}/${checks.length})`);
