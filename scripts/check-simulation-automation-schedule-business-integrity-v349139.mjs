import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, condition: Boolean(condition) });

const perms = read('src/lib/permissions.ts');
const schedulePage = read('src/pages/AutomationSchedulesPage.tsx');
const requestPage = read('src/pages/ExecutionRequestsPage.tsx');
const types = read('src/types/inventory.ts');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = read('package.json');

check('manager receives schedule resume', /AUTOMATION_SCHEDULES_PAUSE,[\s\S]{0,160}AUTOMATION_SCHEDULES_RESUME/.test(perms));
check('manager receives schedule disable', /AUTOMATION_SCHEDULES_RESUME,[\s\S]{0,160}AUTOMATION_SCHEDULES_DISABLE/.test(perms));
check('fallback exposes inventory replenishment review', schedulePage.includes("automation_type: 'inventory_replenishment_review'"));
check('inventory review explains real business purpose', schedulePage.includes('Recurring review of stock position, replenishment signals, and supplier-ready follow-up.'));
check('schedule type includes inventory review', types.includes("'inventory_replenishment_review'"));
check('schedule model carries version', types.includes('version: number;'));
check('schedule edits send expected version', schedulePage.includes('expected_version: schedule.version'));
check('execution request reads automation evidence', requestPage.includes('getAutomationEvidenceSnapshot'));
check('execution request renders scheduled review evidence', requestPage.includes("ui('Scheduled review evidence')"));
check('redacted evidence has readable explanation', requestPage.includes("ui('Evidence hidden because your role does not have the required source permissions.')"));
check('cost risk evidence shows high variance count', requestPage.includes("ui('High variance products')"));
check('cost risk evidence shows missing cost count', requestPage.includes("ui('Stocked products missing cost')"));
check('cost risk evidence shows estimated inventory value', requestPage.includes("ui('Estimated inventory value')"));
check('inventory evidence shows products evaluated', requestPage.includes("ui('Products evaluated')"));
check('inventory evidence shows replenishment items', requestPage.includes("ui('Replenishment items')"));
check('inventory evidence shows estimated procurement cost', requestPage.includes("ui('Estimated procurement cost')"));
check('inventory evidence lists recommended reorder', requestPage.includes("ui('Recommended reorder')"));
check('new inventory review type translated', translations.includes('["Inventory & Replenishment Review"'));
check('scheduled evidence label translated', translations.includes('["Scheduled review evidence"'));
check('permission-redaction explanation translated', translations.includes('["Evidence hidden because your role does not have the required source permissions."'));
check('missing cost label translated', translations.includes('["Stocked products missing cost"'));
check('replenishment label translated', translations.includes('["Replenishment items"'));
check('estimated procurement label translated', translations.includes('["Estimated procurement cost"'));
check('v139 checker wired into check:ci', pkg.includes('check:simulation-automation-schedule-business-integrity-v349139'));

let passed = 0;
for (const item of checks) {
  if (item.condition) { passed += 1; console.log(`PASS ${item.name}`); }
  else console.error(`FAIL ${item.name}`);
}
console.log(`v3.49.139 automation schedule business integrity frontend: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
