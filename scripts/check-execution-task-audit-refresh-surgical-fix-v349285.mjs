import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = fs.readFileSync(path.join(root, 'src/pages/ExecutionTasksPage.tsx'), 'utf8');
let failed = false;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
};

check('task audit endpoint remains task-specific', src.includes('`/execution-tasks/${selected.id}/audit?limit=100`'));
check('audit rows still populate task audit state', src.includes('setTaskAudit(rows)'));
check('audit clears when no selected task is readable', src.includes('setTaskAudit([])'));
check('audit refresh watches selected task identity', src.includes('[canRead, selected?.id, selected?.updated_at]'));
check('audit refresh watches selected task update timestamp', src.includes('selected?.updated_at'));
check('task actions keep selected task updated from action response', src.includes('setSelected(updated);'));
check('task actions still reload operational data after success', src.includes('await loadOperationalData(true);'));
check('assignment remains an audited lifecycle action', src.includes("action === 'assign'"));
check('assignment still posts assigned user id', src.includes("? { assigned_to: assigneeId }"));
check('audit trail renderer remains visible in task detail', src.includes("ui('Audit trail ({count})')"));
check('audit rows continue to render action and timestamp', src.includes('label(row.action, ui)') && src.includes('dateTime(row.created_at, locale, ui)'));
check('assignment confirmation still promises audit recording', src.includes('Confirm the information that will be written to the task audit trail.'));

if (failed) process.exit(1);
