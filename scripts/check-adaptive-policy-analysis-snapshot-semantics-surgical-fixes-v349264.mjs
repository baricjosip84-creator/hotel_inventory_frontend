import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendCandidates = [
  process.env.BACKEND_ROOT,
  path.resolve(frontendRoot, '../hotel-inventory-backend'),
  path.resolve(frontendRoot, '../backend')
].filter(Boolean);
const backendRoot = backendCandidates.find((candidate) => fs.existsSync(candidate));
if (!backendRoot) throw new Error('Batch 019 guard requires BACKEND_ROOT or an adjacent backend checkout.');

const readFrontend = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');
const readBackend = (relativePath) => fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');

const page = readFrontend('src/pages/AdaptivePolicyEnginePage.tsx');
const api = readFrontend('src/lib/api.ts');
const translations = readFrontend('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(readFrontend('package.json'));
const service = readBackend('src/services/decisionIntelligence/adaptivePolicyEngineService.js');
const routes = readBackend('src/routes/decisionIntelligence.js');

const checks = [];
const check = (condition, label) => checks.push({ condition: Boolean(condition), label });

check(page.includes("'Run new policy analysis'"), 'governed action is named as a new analysis run, not a passive refresh');
check(page.includes("'Running analysis…'"), 'pending action copy reflects execution rather than passive page refresh');
check(!page.includes("'Refresh policy analysis'"), 'legacy passive action label is removed from the Adaptive Policy page');
check(page.includes('Running a new policy analysis records a new evidence snapshot from current operating data. It does not apply policy changes automatically.'), 'pre-action helper discloses evidence snapshot persistence and no automatic policy mutation');
check(page.includes('New policy analysis snapshot recorded from current operating data. No policy changes were applied; recommendations still require human review.'), 'inline success confirmation states snapshot persistence, no policy mutation, and continued human review');
check(page.includes('use Run new policy analysis to create a fresh evidence snapshot from current operating data.'), 'empty-state recovery describes creating a fresh evidence snapshot');
check(api.includes("return 'New policy analysis snapshot recorded. No policy changes were applied.';"), 'global success toast explains what was recorded and what was not changed');

check(routes.includes("'/adaptive-policy-engine-refresh'") && routes.includes('TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN'), 'existing governed POST route remains permission-protected');
check(service.includes('INSERT INTO tenant_decision_adaptive_policy_refresh_runs'), 'backend records an explicit adaptive policy analysis run');
check(service.includes('INSERT INTO tenant_decision_adaptive_policy_signals'), 'backend appends a signal snapshot during each analysis run');
check(service.includes('INSERT INTO tenant_decision_adaptive_policy_effectiveness'), 'backend appends an effectiveness/observation snapshot during each analysis run');
check(service.includes('measurementKey = `${policyKey}:analysis:${analysisRunId}`'), 'effectiveness snapshot is bound to the distinct analysis run');
check(service.includes("source: 'adaptive_policy_live_refresh', policy_key: policyKey, analysis_run_id: analysisRunId"), 'recommendation traceability retains the source analysis run');
check(service.includes('autonomous_application: false') && service.includes('operating_policy_mutated: false'), 'backend response preserves the human-control/no-auto-mutation boundary');

for (const message of [
  'New policy analysis snapshot recorded. No policy changes were applied.',
  'Run new policy analysis',
  'Running analysis…',
  'Running a new policy analysis records a new evidence snapshot from current operating data. It does not apply policy changes automatically.',
  'New policy analysis snapshot recorded from current operating data. No policy changes were applied; recommendations still require human review.',
  'If you can govern Decision Intelligence, use Run new policy analysis to create a fresh evidence snapshot from current operating data.',
  'Run a new policy analysis after each recorded manual application so its real before/after outcome can be measured.',
  'Run a new policy analysis after each applied change before expanding its use.',
  'Run a new policy analysis after each applied change so the real post-change outcome can be measured.'
]) {
  check(translations.includes(`["${message}"`), `${message} has a five-language tenant catalog row`);
}

check(!translations.includes('["Policy analysis refreshed successfully."'), 'obsolete passive success wording is removed from the tenant translation catalog');
check(!service.includes('Refresh policy analysis after each applied change'), 'backend governance guidance no longer describes persisted analysis creation as a passive refresh');
check(pkg.scripts?.['check:inventory-adaptive-policy-analysis-snapshot-semantics-surgical-fixes-v349264'] === 'node scripts/check-adaptive-policy-analysis-snapshot-semantics-surgical-fixes-v349264.mjs', 'Batch 019 regression guard is registered');

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'}: ${item.label}`);
if (failed.length) {
  console.error(`\nBatch 019 adaptive-policy analysis snapshot semantics guard: ${checks.length - failed.length}/${checks.length} PASS`);
  process.exit(1);
}
console.log(`\nBatch 019 adaptive-policy analysis snapshot semantics guard: ${checks.length}/${checks.length} PASS`);
