import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/ReplenishmentPlanningPage.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let failed = false;
let passed = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
  else passed += 1;
};

const createBlock = page.match(/const createMutation = useMutation\([\s\S]*?\n  \}\);/u)?.[0] || '';
const handleGenerateBlock = page.match(/const generateRun = \(\) => \{[\s\S]*?\n  \};/u)?.[0] || '';

check('Planning-run creation still owns a specific business success message', createBlock.includes("ui('Planning run created. No stock moved and no supplier order was placed.')"));
check('Planning-run creation still emits the standardized success toast', createBlock.includes('showTenantActionSuccess(successMessage);'));
check('Planning-run creation no longer duplicates the same success into the persistent page banner', !createBlock.includes('setMessage(successMessage);'));
check('Planning-run generation clears any previous page banner before starting', handleGenerateBlock.includes("setMessage('');"));
check('Planning-run generation still clears previous page errors before starting', handleGenerateBlock.includes("setError('');"));
check('Planning-run creation still selects the newly created run', createBlock.includes('setSelectedRunId(data.run.id);'));
check('Planning-run creation still refreshes the saved-run list', createBlock.includes("invalidateQueries({ queryKey: ['location-replenishment-runs'] })"));
check('Planning-run creation still seeds the exact new-run detail cache', createBlock.includes("setQueryData(['location-replenishment-run', data.run.id], data)"));
check('Shared API mutation feedback remains suppressed to avoid a third success surface', page.includes("skipMutationFeedback: true"));
check('The persistent page banner remains available for other page-owned workflow messages', page.includes('{message ? <div style={styles.success}>{message}</div> : null}'));
check('Batch 060 frontend guard is registered', pkg.scripts?.['check:inventory-replenishment-planning-success-feedback-v349298'] === 'node scripts/check-replenishment-planning-success-feedback-surgical-fix-v349298.mjs');

console.log(`Replenishment planning success-feedback surgical fix: ${passed}/11 PASS`);
if (failed) process.exit(1);
