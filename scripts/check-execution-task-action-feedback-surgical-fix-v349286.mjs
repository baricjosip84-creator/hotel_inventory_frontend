import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const api = fs.readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/pages/ExecutionTasksPage.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let failed = false;
let passed = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
  else passed += 1;
};

check('Execution Tasks has a specific mutation label', api.includes("if (normalizedPath.includes('/execution-tasks')) return 'Execution task';"));
check('task creation has explicit feedback', api.includes("normalizedPathOnly === '/execution-tasks'") && api.includes("return 'Execution task created successfully.';"));
check('task lifecycle action routes are matched explicitly', api.includes("/(ready|start|unblock|complete|cancel|block|assign)$/"));
check('assignment feedback is task-specific', api.includes("if (action === 'assign') return 'Task assigned successfully.';"));
check('start feedback is task-specific', api.includes("if (action === 'start') return 'Task started successfully.';"));
check('ready feedback is task-specific', api.includes("if (action === 'ready') return 'Task marked ready successfully.';"));
check('block feedback is task-specific', api.includes("if (action === 'block') return 'Task blocked successfully.';"));
check('unblock feedback is task-specific', api.includes("if (action === 'unblock') return 'Task unblocked successfully.';"));
check('complete feedback is task-specific', api.includes("if (action === 'complete') return 'Task completed successfully.';"));
check('cancel feedback is task-specific', api.includes("return 'Task cancelled successfully.';"));
check('task page still uses the same lifecycle endpoints', page.includes('`/execution-tasks/${task.id}/${action}`'));
check('task page keeps its useful inline status confirmation', page.includes("ui('{taskCode} is now {status}.')"));
for (const message of [
  'Execution task created successfully.',
  'Task assigned successfully.',
  'Task started successfully.',
  'Task marked ready successfully.',
  'Task blocked successfully.',
  'Task unblocked successfully.',
  'Task completed successfully.',
  'Task cancelled successfully.'
]) {
  check(`${message} is translated`, translations.includes(`["${message}"`));
  check(`${message} translation key is unique`, (translations.match(new RegExp(`\\[\\"${message.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`, 'g')) || []).length === 1);
}
check('Batch 045 guard is registered', pkg.scripts?.['check:inventory-execution-task-action-feedback-v349286'] === 'node scripts/check-execution-task-action-feedback-surgical-fix-v349286.mjs');

console.log(`Execution task action feedback surgical fix: ${passed}/29 PASS`);
if (failed) process.exit(1);
