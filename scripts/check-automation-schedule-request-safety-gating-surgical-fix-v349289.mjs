import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/AutomationSchedulesPage.tsx'), 'utf8');
const types = fs.readFileSync(path.join(root, 'src/types/inventory.ts'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let failed = false;
let passed = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
  else passed += 1;
};

const lockedMessage = 'Request creation is turned off in Automation safety. Enable Request preparation before creating requests from schedules.';
const unavailableMessage = 'Request creation safety status could not be loaded. Refresh the page before creating requests from schedules.';

check('core page load fetches runner safety status', page.includes("apiRequest<AutomationRunnerStatusResponse>('/automation-schedules/runner-status')"));
check('core load stores runner safety status', page.includes("if (statusResult.status === 'fulfilled') setRunnerStatus(statusResult.value);"));
check('failed safety status fails closed for request creation', page.includes('setRunnerStatus(null);') && page.includes("secondaryWarnings.push(ui('Automation safety status could not be loaded.'));"));
check('runner status type exposes production safety lock', types.includes('production_safety_lock?: {'));
check('production safety lock exposes global disable', types.includes('global_disable: boolean;'));
check('production safety lock exposes tenant request creation enablement', types.includes('tenant_request_creation_enabled: boolean;'));
check('manual request creation requires tenant enablement and no global disable', page.includes('!runnerStatus.production_safety_lock.global_disable') && page.includes('runnerStatus.production_safety_lock.tenant_request_creation_enabled'));
check('plain-language locked message is defined', page.includes(`ui('${lockedMessage}')`));
check('plain-language unavailable message is defined', page.includes(`ui('${unavailableMessage}')`));
check('row Create request is gated by production safety', page.includes("schedule.status === 'disabled' || !manualRequestCreationAllowed"));
check('detail Create request is gated by production safety', page.includes("selected.status === 'disabled' || !manualRequestCreationAllowed"));
check('locked Create request exposes explanation before interaction', page.includes('title={!manualRequestCreationAllowed ? manualRequestCreationBlockedMessage : undefined}'));
check('selected schedule shows visible safety explanation', page.includes('automation-schedules-alert automation-schedules-alert--warning') && page.includes('{manualRequestCreationBlockedMessage}'));
check('manual request confirmation has a safety preflight helper', page.includes('const requestManualRunConfirmation = (schedule: AutomationSchedule) => {'));
check('manual request confirmation refuses locked state', page.includes('if (!manualRequestCreationAllowed) {') && page.includes('setError(manualRequestCreationBlockedMessage);'));
check('confirmation step rechecks safety before backend mutation', page.includes("if (confirmation.kind === 'manual_run') {") && page.includes('return runScheduleManually(confirmation.schedule);'));
check('Request preparation metric reflects manual request safety lock', page.includes("<strong>{manualRequestCreationAllowed ? ui('Enabled') : ui('Off')}</strong><span>{ui('Request preparation')}</span>"));
check('Process due remains gated by automatic runner request creation', page.includes("disabled={saving || !runnerStatus.request_creation_enabled}"));
check('locked explanation is translated', translations.includes(`["${lockedMessage}"`));
check('unavailable explanation is translated', translations.includes(`["${unavailableMessage}"`));
check('locked translation key is unique', (translations.match(new RegExp(`\\[\\"${lockedMessage.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`, 'g')) || []).length === 1);
check('unavailable translation key is unique', (translations.match(new RegExp(`\\[\\"${unavailableMessage.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`, 'g')) || []).length === 1);
check('Batch 048 guard is registered', pkg.scripts?.['check:inventory-automation-schedule-request-safety-gating-v349289'] === 'node scripts/check-automation-schedule-request-safety-gating-surgical-fix-v349289.mjs');

console.log(`Automation schedule request safety gating surgical fix: ${passed}/23 PASS`);
if (failed) process.exit(1);
