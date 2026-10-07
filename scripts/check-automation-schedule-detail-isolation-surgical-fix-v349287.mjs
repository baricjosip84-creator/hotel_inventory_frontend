import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/AutomationSchedulesPage.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let failed = false;
let passed = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
  else passed += 1;
};

const createStart = page.indexOf('const createSchedule = async () =>');
const createEnd = page.indexOf('const loadScheduleDetail = async', createStart);
const createBlock = page.slice(createStart, createEnd);
const detailStart = page.indexOf('const loadScheduleDetail = async');
const detailEnd = page.indexOf('const updateSchedule = async', detailStart);
const detailBlock = page.slice(detailStart, detailEnd);

check('create handler exists', createStart >= 0 && createEnd > createStart);
check('new schedule becomes selected', createBlock.includes('setSelected(created);'));
check('new schedule clears prior preview result', createBlock.includes('setDryRunResult(null);'));
check('new schedule clears prior manual-run result', createBlock.includes('setManualRunResult(null);'));
check('new schedule clears prior audit pack', createBlock.includes('setAuditPack(null);'));
check('audit pack is cleared after selecting the new schedule', createBlock.indexOf('setAuditPack(null);') > createBlock.indexOf('setSelected(created);'));
check('detail selection still clears prior preview result', detailBlock.includes('setDryRunResult(null);'));
check('detail selection still clears prior manual-run result', detailBlock.includes('setManualRunResult(null);'));
check('detail selection still clears prior audit pack', detailBlock.includes('setAuditPack(null);'));
check('audit rendering remains conditional on current audit pack', page.includes('{auditPack ? ('));
check('audit history still loads from the selected schedule id', page.includes('`/automation-schedules/${schedule.id}/audit-pack`'));
check('Batch 046 guard is registered', pkg.scripts?.['check:inventory-automation-schedule-detail-isolation-v349287'] === 'node scripts/check-automation-schedule-detail-isolation-surgical-fix-v349287.mjs');

console.log(`Automation schedule detail isolation surgical fix: ${passed}/12 PASS`);
if (failed) process.exit(1);
