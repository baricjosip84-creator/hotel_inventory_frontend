import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.env.SOURCE_ROOT || process.cwd();
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
let assertions = 0;
const assert = (condition, explanation) => {
  assertions++;
  if (!condition) throw new Error(`FAIL #${assertions}: ${explanation}`);
};

function evaluateTs(relative) {
  const contents = source(relative);
  const output = ts.transpileModule(contents, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: relative,
    reportDiagnostics: true
  });
  assert(!(output.diagnostics || []).some(d => d.category === ts.DiagnosticCategory.Error), `${relative} TypeScript parses`);
  const exports = {};
  new Function('exports', 'module', output.outputText)(exports, { exports });
  return exports;
}

const queueSelection = evaluateTs('src/lib/executionTaskQueueSelection.ts');
const recordSelection = evaluateTs('src/lib/recordSelectionParams.ts');
const { resolveExecutionTaskQueue } = queueSelection;
const { selectedRecordId, withSelectedRecordId } = recordSelection;
assert(typeof resolveExecutionTaskQueue === 'function', 'queue integrity helper is executable');
assert(typeof selectedRecordId === 'function', 'existing shared record picker is executable');
assert(typeof withSelectedRecordId === 'function', 'existing shared URL update helper is executable');

const sample = Array.from({ length: 4 }, (_, i) => ({ id: `task-${i+1}`, title: `task ${i+1}` }));
const outside = { id: 'outside-filter', title: 'direct only' };
let resolved = resolveExecutionTaskQueue(sample, 3, outside.id, outside);
assert(resolved.queue.length === 3, 'outside direct task is not inserted into filtered queue');
assert(resolved.queue[0] === sample[0] && resolved.queue[2] === sample[2], 'original filtered result order preserved');
assert(!resolved.queue.includes(outside), 'outside direct task not counted or displayed as matching');
assert(resolved.selectedLinkedTask === outside, 'outside direct task still available in details');
assert(resolved.linkedOutsideQueue === true, 'separate context notice available');
assert(resolved.hasNextPage === true, 'pagination derived from API queue without padding');
resolved = resolveExecutionTaskQueue(sample, 2, sample[1].id, outside);
assert(resolved.queue.length === 2, 'queue respects page size');
assert(resolved.selectedLinkedTask === sample[1], 'matching filtered result has priority over direct read');
assert(!resolved.linkedOutsideQueue, 'no outside-filter warning for visible match');
assert(resolved.hasNextPage, 'has-next remains true for paginated filtered results');
resolved = resolveExecutionTaskQueue(sample.slice(0, 2), 2, 'unknown', outside);
assert(resolved.selectedLinkedTask === null, 'a wrong direct task is not shown for a different requested id');
assert(resolved.queue.length === 2, 'wrong direct task does not alter queue');
assert(!resolved.linkedOutsideQueue, 'invalid direct lookup not reported as selectable');
assert(!resolved.hasNextPage, 'accurate last page');
resolved = resolveExecutionTaskQueue(sample.slice(0, 2), 2, '', outside);
assert(resolved.selectedLinkedTask === null, 'no direct selection when URL has no task ID');
assert(resolved.queue.length === 2, 'no-selection filtered list intact');
resolved = resolveExecutionTaskQueue(sample.slice(0, 2), 2, 'absent');
assert(!resolved.selectedLinkedTask && !resolved.linkedOutsideQueue, 'missing direct GET is not silently substituted');

const existing = new URLSearchParams('status=open&taskId=legacy-1&filter=urgent');
assert(selectedRecordId(existing, 'task_id', 'taskId') === 'legacy-1', 'legacy taskId URL remains readable');
const updated = withSelectedRecordId(existing, 'task_id', 'taskId', 'task-3');
assert(updated.get('task_id') === 'task-3', 'selection is encoded in URL');
assert(!updated.has('taskId'), 'legacy duplicate selection key removed');
assert(updated.get('status') === 'open' && updated.get('filter') === 'urgent', 'unrelated query parameters retained');
assert(!existing.has('task_id'), 'history source parameters are not mutated');
const restored = selectedRecordId(new URLSearchParams(updated.toString()), 'task_id', 'taskId');
assert(restored === 'task-3', 'reload/back restoration reads the same selected ID');

const page = source('src/pages/ExecutionTasksPage.tsx');
const catalog = source('src/i18n/tenantUiTranslations.ts');
const workflow = source('.github/workflows/frontend-validation.yml');
const packageJson = JSON.parse(source('package.json'));
assert(page.includes("selectedRecordId(searchParams, 'task_id', 'taskId')"), 'task ID state read from URL');
assert(/setSearchParams\(\(previous\) => withSelectedRecordId\(previous, 'task_id', 'taskId', task.id\)\)/.test(page), 'queue/analytics selection writes URL');
assert(page.includes('const resolved = resolveExecutionTaskQueue(taskRows, pageSize, requestedTaskId, directTask)'), 'filtered queue and direct task remain separate');
assert(!page.includes('nextTasks = [linkedTask, ...nextTasks'), 'previous direct-link queue injection removed');
assert(page.includes('requestSequence !== queueRequestSequence.current'), 'superseded queue reads do not commit');
assert(page.includes('queueRequestSequence.current += 1;'), 'effect cleanup cancels prior async loads');
assert(/if \(advancedIdError\) \{\s+setLoading\(false\);/.test(page), 'invalid advanced filters release previous loading state');
assert(page.includes('if (openSequence === taskOpenSequence.current) selectTask(task);'), 'stale direct task reads cannot select a different task');
assert(page.includes('selectTask(created);'), 'newly created task gets durable selection');
assert(page.includes('linkedOutsideQueue ?'), 'filtered-out selection is explained');
assert(catalog.includes('Selected task is outside the current queue filters. It remains available in Task detail.'), 'notice has translation row');
assert(packageJson.scripts?.['check:execution-task-queue-selection'] === 'node scripts/check-execution-task-queue-selection.mjs', 'npm regression command available');
assert(workflow.includes('npm run check:execution-task-queue-selection'), 'frontend CI runs regression');
for (const rel of ['src/pages/ExecutionTasksPage.tsx', 'src/lib/executionTaskQueueSelection.ts', 'src/lib/recordSelectionParams.ts', 'src/i18n/tenantUiTranslations.ts']) {
  const text = source(rel);
  const file = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert(!file.parseDiagnostics.length, `source parser passes: ${rel}`);
}
console.log(`PASS ${assertions}/${assertions} Execution Task queue/detail selection, URL navigation, filter integrity, stale results and TypeScript parse assertions`);
