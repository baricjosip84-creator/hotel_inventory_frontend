import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
const pass = (message) => console.log(`PASS: ${message}`);
const assert = (condition, message) => { if (condition) pass(message); else failures.push(message); };

const packageJson = JSON.parse(read('package.json'));
const ci = String(packageJson.scripts?.['check:ci'] || '');
const router = read('src/app/router.tsx');
const nav = read('src/app/navigationRegistry.ts');

assert(ci.startsWith('npm run check:tenant-multilingual-closure-audit && '), 'tenant multilingual closure audit leads frontend CI');
assert(ci.includes('npm run check:digital-twin-operational-completion-v349175'), 'Digital Twin completion guard remains in frontend CI');
assert(ci.includes('npm run check:command-pages-verification-v349176'), 'v3.49.176 command-page verification guard is wired into frontend CI');

const forecastRouteStart = router.indexOf("path: 'probabilistic-forecasting'");
const forecastRoute = forecastRouteStart >= 0 ? router.slice(forecastRouteStart, router.indexOf("path: 'cross-domain-optimization'", forecastRouteStart)) : '';
assert(forecastRoute.includes('TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ'), 'Probabilistic Forecasting direct route requires Decision Intelligence Read');
assert(forecastRoute.includes('TENANT_PERMISSIONS.INSIGHTS_READ'), 'Probabilistic Forecasting direct route requires Insights Read');

assert(!nav.includes("description: 'Read-only review of policy signals, recommendations, measured outcomes, and manual safety checks. It does not change policies.'"), 'Adaptive Policy sidebar no longer falsely describes the page as read-only');
assert(nav.includes('approved manual-application evidence') && nav.includes('does not change business rules automatically'), 'Adaptive Policy sidebar describes governed recording without claiming automatic policy changes');
assert(!nav.includes("description: 'Read-only comparison of cross-area planning options, tradeoffs, and actual outcomes recorded through Learning Feedback.'"), 'Cross-Domain sidebar no longer falsely describes the page as read-only');
assert(nav.includes('records human governance decisions') && nav.includes('without executing the plan'), 'Cross-Domain sidebar describes governed planning records without claiming plan execution');

for (const guard of [
  'check:mobile-execution-operational-completion-v349160',
  'check:operations-feed-operational-completion-v349161',
  'check:workflow-composer-operational-completion-v349162',
  'check:intelligence-review-operational-completion-v349163',
  'check:ai-copilot-procurement-decision-completion-v349164',
  'check:learning-feedback-operational-completion-v349165',
  'check:adaptive-policy-closed-loop-v349169',
  'check:cross-domain-optimization-operational-completion-v349170',
  'check:enterprise-collaboration-completion-v349172',
  'check:digital-twin-operational-completion-v349175'
]) assert(ci.includes(`npm run ${guard}`), `${guard} remains enforced by frontend CI`);

if (failures.length) {
  console.error('Command pages verification v3.49.176: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Command pages verification v3.49.176: PASS');
