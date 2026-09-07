import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
let passed = 0;
const check = (condition, message) => {
  if (condition) { console.log(`PASS: ${message}`); passed += 1; }
  else failures.push(message);
};

const pkg = JSON.parse(read('package.json'));
const ci = String(pkg.scripts?.['check:ci'] || '');
const mobile = read('src/pages/MobileExecutionPage.tsx');
const tasks = read('src/pages/ExecutionTasksPage.tsx');
const feed = read('src/pages/RealTimeOperationsFeedPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const mobileGuard = read('scripts/check-tenant-mobile-execution-multilingual.mjs');
const taskGuard = read('scripts/check-tenant-execution-tasks-multilingual.mjs');
const feedGuard = read('scripts/check-tenant-real-time-operations-feed-multilingual.mjs');

const rows = [];
for (const line of translations.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((value) => typeof value === 'string')) rows.push(row);
  } catch {}
}
const byEnglish = new Map(rows.map((row) => [row[0], row]));
const mobileStepLabels = [
  'Receive inbound goods',
  'Pick reserved stock',
  'Move stock between locations',
  'Replenish target location',
  'Count and verify stock',
  'Pick requested items',
  'Complete operational task'
];

check(ci.startsWith('npm run check:tenant-multilingual-closure-audit && '), 'tenant multilingual closure audit still leads frontend CI');
check(ci.includes('npm run check:command-pages-system-text-localization-v349182'), 'v3.49.182 system-text localization guard is wired into frontend CI');
check(ci.indexOf('check:command-pages-system-text-localization-v349182') < ci.indexOf('check:cross-domain-translation-completion-v349181'), 'v3.49.182 guard runs before older command-page closure guards');

check(mobile.includes('step_label_key?: string | null;'), 'Mobile Execution response model accepts backend step-label ownership keys');
check(mobile.includes("task.description || localizedSystemText(task.step_label_key, task.step_label, 'No task summary was provided.', ui)"), 'Mobile Execution localizes fallback step guidance only when the backend supplies a stable key');
check(mobile.includes('return text ? (key ? ui(text) : text) : ui(fallback);'), 'Mobile Execution keeps arbitrary business text raw when no system key exists');
check(tasks.includes('step_label_key?: string | null;') && tasks.includes('task.step_label_key ? ui(task.step_label) : task.step_label'), 'Execution Tasks mobile queue also localizes the same keyed system step guidance');
check(mobileStepLabels.every((label) => {
  const row = byEnglish.get(label);
  return row && row.length === 5 && row.slice(1).every((translation) => translation.trim() && translation !== row[0]);
}), 'all seven backend-owned Mobile Execution step labels have genuine German, Spanish, French, and Croatian translations');

check(feed.includes('title_key?: string | null;') && feed.includes('summary_key?: string | null;') && feed.includes('recommended_next_step_key?: string | null;'), 'Operations Feed timeline model preserves backend system-text keys');
check(feed.includes('coordination_guidance_key?: string | null;') && feed.includes('incident_timeline_guidance_key?: string | null;') && feed.includes('disruption_guidance_key?: string | null;'), 'Operations Feed guidance model preserves backend system-text keys');
check(feed.includes('if (title) return item.title_key ? ui(title) : title;'), 'Operations Feed localizes keyed titles while keeping business titles verbatim');
check(feed.includes("localizedSystemText(item.summary_key, item.summary, 'No summary was provided.', ui)"), 'Operations Feed localizes keyed summaries');
check(feed.includes("localizedSystemText(item.recommended_next_step_key, item.recommended_next_step, 'Open the source page and review the item there.', ui)"), 'Operations Feed localizes keyed recommended next steps');
check(feed.includes('localizedSystemText(guidance.coordination_guidance_key, guidance.coordination_guidance')
  && feed.includes('localizedSystemText(guidance.incident_timeline_guidance_key, guidance.incident_timeline_guidance')
  && feed.includes('localizedSystemText(guidance.disruption_guidance_key, guidance.disruption_guidance'), 'Operations Feed localizes all three keyed system guidance fields');
check(feed.includes('itemTitle(item, ui)') && feed.includes('itemSummary(item, ui)') && feed.includes('itemRecommendedNextStep(item, ui)'), 'Operations Feed search includes the localized forms users actually see');

for (const english of [
  'Integration event',
  'Event stream message observed for operational coordination.',
  'Review failed or blocked event delivery evidence before coordinating any manual remediation.',
  'Monitor correlated actions and use the source workflow for any human-operated follow-up.',
  'Use this read-only timeline to coordinate source-workflow follow-up; no event replay, publishing, or external workflow execution occurs here.',
  'The feed combines permitted open work, observed integration messages, and current integration delivery problems without storing payload material.',
  'Blocked tasks, failed messages, and current delivery failures are placed at the top for human review and remain advisory until handled through an existing governed workflow.'
]) {
  const row = byEnglish.get(english);
  check(Boolean(row && row.slice(1).every((translation) => translation.trim() && translation !== row[0])), `Operations Feed keyed system text is genuinely translated: ${english}`);
}

check(mobileGuard.includes('localizing keyed backend-owned step guidance'), 'standing Mobile Execution multilingual guard protects keyed system-step localization');
check(taskGuard.includes('keyed mobile step guidance is localized'), 'standing Execution Tasks multilingual guard protects keyed mobile step localization');
check(feedGuard.includes('localizes backend-owned keyed system text'), 'standing Operations Feed multilingual guard protects the keyed-versus-business text boundary');

if (failures.length) {
  console.error(`Command pages system-text localization v3.49.182: ${passed} passed / ${failures.length} failed.`);
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`Command pages system-text localization v3.49.182: ${passed}/${passed} PASS.`);
