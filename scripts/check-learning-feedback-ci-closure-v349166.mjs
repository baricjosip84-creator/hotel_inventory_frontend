import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const layout = read('scripts/check-decision-intelligence-layout.mjs');
const css = read('src/pages/DecisionLearningFeedbackPage.css');
const page = read('src/pages/DecisionLearningFeedbackPage.tsx');
const checkCi = pkg.scripts?.['check:ci'] || '';

const learningClasses = [
  'learning-feedback-section',
  'learning-feedback-review-board',
  'learning-feedback-heading-icon',
  'learning-feedback-detail',
  'learning-feedback-detail__grid',
  'learning-feedback-detail__evidence',
  'learning-feedback-source-facts',
  'learning-feedback-calculated-error',
  'learning-feedback-review-authority-note',
  'learning-feedback-history-filters',
  'learning-feedback-filter-grid'
];

const expectations = [
  [learningClasses.every((name) => layout.includes(`'${name}'`)), 'Decision Intelligence layout allowlist includes every Learning Feedback operational class'],
  [learningClasses.every((name) => css.includes(`.${name}`)), 'Learning Feedback stylesheet defines every newly allowed operational class'],
  [page.includes("import './DecisionLearningFeedbackPage.css';"), 'Learning Feedback page still imports its page-specific stylesheet'],
  [Boolean(pkg.scripts?.['check:ai-copilot-procurement-decision-completion-v349164']), 'frontend retains the v3.49.164 dedicated guard script'],
  [Boolean(pkg.scripts?.['check:learning-feedback-operational-completion-v349165']), 'frontend retains the v3.49.165 dedicated guard script'],
  [Boolean(pkg.scripts?.['check:learning-feedback-ci-closure-v349166']), 'frontend exposes the v3.49.166 CI-closure guard script'],
  [checkCi.includes('check:intelligence-review-operational-completion-v349163 && npm run check:ai-copilot-procurement-decision-completion-v349164 && npm run check:learning-feedback-operational-completion-v349165 && npm run check:learning-feedback-ci-closure-v349166'), 'normal frontend check:ci chain enforces v3.49.164 through v3.49.166 in sequence'],
  [checkCi.includes('npm run check:decision-intelligence-layout'), 'normal frontend check:ci still enforces the Decision Intelligence layout guard']
];

let passed = 0;
for (const [condition, message] of expectations) {
  if (condition) {
    console.log(`PASS - ${message}`);
    passed += 1;
  } else {
    console.error(`FAIL - ${message}`);
  }
}
if (passed !== expectations.length) {
  console.error(`v3.49.166 Learning Feedback CI closure frontend guard: FAIL (${passed}/${expectations.length})`);
  process.exit(1);
}
console.log(`v3.49.166 Learning Feedback CI closure frontend guard: PASS (${passed}/${expectations.length})`);
