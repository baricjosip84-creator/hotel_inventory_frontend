import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
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

const guidance = 'Enter a disable reason of at least 3 characters.';

check('disable confirmation still requires a reason in submit guard', page.includes("if (confirmation.kind === 'disable') {") && page.includes('confirmationText.trim().length < 3'));
check('disable textarea keeps minimum length of 3', page.includes('minLength={3}'));
check('disable textarea is marked required', page.includes('required') && page.includes('aria-required="true"'));
check('disable textarea references inline guidance', page.includes('aria-describedby="automation-disable-reason-help"'));
check('inline disable guidance is rendered', page.includes('id="automation-disable-reason-help"') && page.includes(`ui('${guidance}')`));
check('Confirm is disabled while disable reason is too short', page.includes("disabled={saving || (confirmation.kind === 'disable' && confirmationText.trim().length < 3)}"));
check('disabled Confirm exposes the reason requirement', page.includes("title={confirmation.kind === 'disable' && confirmationText.trim().length < 3 ? ui('Enter a disable reason of at least 3 characters.') : undefined}"));
check('non-disable confirmations are not blocked by disable reason rule', page.includes("confirmation.kind === 'disable' && confirmationText.trim().length < 3"));
check('backend-protecting submit validation remains intact', page.includes("setError(ui('Enter a disable reason of at least 3 characters.'));"));
check('existing disable guidance translation remains available', translations.includes(`["${guidance}"`));
check('disable guidance translation key is unique', (translations.match(/\["Enter a disable reason of at least 3 characters\."/g) || []).length === 1);
check('Batch 049 guard is registered', pkg.scripts?.['check:inventory-automation-schedule-disable-validation-v349290'] === 'node scripts/check-automation-schedule-disable-validation-surgical-fix-v349290.mjs');

console.log(`Automation schedule disable validation surgical fix: ${passed}/12 PASS`);
if (failed) process.exit(1);
