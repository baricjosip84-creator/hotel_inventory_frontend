import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const api = fs.readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/pages/AutomationSchedulesPage.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let failed = false;
let passed = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
  else passed += 1;
};

check('Automation Schedules keeps a specific mutation label', api.includes("if (normalizedPath.includes('/automation-schedules')) return 'Automation schedule';"));
check('schedule creation has explicit feedback', api.includes("normalizedPathOnly === '/automation-schedules'") && api.includes("return 'Automation schedule created successfully.';"));
check('schedule lifecycle/action routes are matched explicitly', api.includes("/(pause|resume|disable|dry-run|run)$/"));
check('pause feedback is action-specific', api.includes("if (action === 'pause') return 'Automation schedule paused successfully.';"));
check('activation feedback is action-specific', api.includes("if (action === 'resume') return 'Automation schedule activated successfully.';"));
check('disable feedback is action-specific', api.includes("if (action === 'disable') return 'Automation schedule disabled successfully.';"));
check('preview feedback is action-specific', api.includes("if (action === 'dry-run') return 'Automation schedule preview completed successfully.';"));
check('manual run feedback is action-specific', api.includes("return 'Automation schedule run completed successfully.';"));
check('runner run-once feedback is action-specific', api.includes("normalizedPathOnly === '/automation-schedules/runner/run-once'") && api.includes("return 'Due schedule processing completed successfully.';"));
check('safety review acknowledgement feedback is action-specific', api.includes("normalizedPathOnly === '/automation-schedules/runner/unsafe-output-review/acknowledge'") && api.includes("return 'Automation safety review acknowledged successfully.';"));
check('page still uses pause endpoint', page.includes('`/automation-schedules/${schedule.id}/pause`'));
check('page still uses activate/resume endpoint', page.includes('`/automation-schedules/${schedule.id}/resume`'));
check('page still uses disable endpoint', page.includes('`/automation-schedules/${schedule.id}/disable`'));
check('page keeps rich inline pause confirmation', page.includes("ui('Paused “{name}”. It is no longer eligible for automatic due processing.')"));
check('page keeps rich inline activate confirmation', page.includes("ui('Activated “{name}”. Its next run was scheduled from now"));
check('page keeps rich inline disable confirmation', page.includes("ui('Disabled “{name}”. The reason is preserved in its audit trail.')"));

for (const message of [
  'Automation schedule created successfully.',
  'Automation schedule paused successfully.',
  'Automation schedule activated successfully.',
  'Automation schedule disabled successfully.',
  'Automation schedule preview completed successfully.',
  'Automation schedule run completed successfully.',
  'Due schedule processing completed successfully.',
  'Automation safety review acknowledged successfully.'
]) {
  check(`${message} is translated`, translations.includes(`["${message}"`));
  check(`${message} translation key is unique`, (translations.match(new RegExp(`\\[\\"${message.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`, 'g')) || []).length === 1);
}

check('Batch 047 guard is registered', pkg.scripts?.['check:inventory-automation-schedule-action-feedback-v349288'] === 'node scripts/check-automation-schedule-action-feedback-surgical-fix-v349288.mjs');

console.log(`Automation schedule action feedback surgical fix: ${passed}/33 PASS`);
if (failed) process.exit(1);
