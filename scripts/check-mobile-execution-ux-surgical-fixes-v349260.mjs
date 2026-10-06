import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/MobileExecutionPage.tsx');
const css = read('src/pages/MobileExecutionPage.css');
const requests = read('src/pages/ExecutionRequestsPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
let passed = 0;
const checks = [];
const check = (label, condition) => {
  checks.push(label);
  if (!condition) {
    console.error(`FAIL - ${label}`);
    process.exitCode = 1;
  } else {
    passed += 1;
    console.log(`PASS - ${label}`);
  }
};

check('manual task link opens exact execution-task detail', page.includes("if (task.source_type === 'manual') params.set('task_id', task.id)") && page.includes("task.source_type === 'manual' ? 'Open task details' : 'Open source workflow'"));
check('manual task no longer claims a separate source workflow', page.includes("ui(task.source_type === 'manual' ? 'Open task details' : 'Open source workflow')"));
check('photo action uses neutral cross-platform wording', page.includes("ui('Add photo')") && !page.includes("ui('Take photo')"));
check('general evidence action explicitly says upload', page.includes("ui('Upload evidence')") && !page.includes("ui('Add evidence')"));
check('accepted evidence types are explained before selection', page.includes("ui('Evidence can be an image, PDF, text, CSV, Word, or Excel file.')"));
check('zero pending synchronization is a status, not an action button', page.includes("pending.length > 0 ? <button") && page.includes("ui('No pending sync')"));
check('responsibility controls are visually grouped and labelled', page.includes('mobile-execution-control-group') && page.includes("ui('Responsibility')"));
check('urgency and source filters have visible field labels', page.includes('mobile-execution-filter-field') && page.includes("<span>{ui('Urgency')}</span>") && page.includes("<span>{ui('Source')}</span>"));
check('queue actions are visually separated from filters', css.includes('.mobile-execution-toolbar--actions') && css.includes('border-top: 1px solid #e2e8f0'));
check('selectors have a distinct field treatment', css.includes('.mobile-execution-filter-grid') && css.includes('background: #f8fafc') && css.includes('border: 1px solid #94a3b8'));
check('open execution tasks is visually primary', css.includes('.mobile-execution-control-button--open') && css.includes('background: #2563eb'));
check('active ownership scope is visually distinct', css.includes('.mobile-execution-scope-button--active') && css.includes('background: #eff6ff'));
check('linked execution request refresh scrolls to selected detail', requests.includes("document.getElementById('execution-request-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })"));

for (const key of ['Add photo', 'Upload evidence', 'Open task details', 'No pending sync', 'Evidence can be an image, PDF, text, CSV, Word, or Excel file.']) {
  check(`translation catalog includes ${key}`, translations.includes(`["${key}"`));
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Batch 015 Mobile Execution UX surgical fixes: ${passed}/${checks.length} PASS`);
