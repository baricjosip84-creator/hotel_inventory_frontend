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
if (!backendRoot) throw new Error('Batch 021 guard requires BACKEND_ROOT or an adjacent backend checkout.');

const readFrontend = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');
const readBackend = (relativePath) => fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');

const page = readFrontend('src/pages/CrossDomainOptimizationPage.tsx');
const translations = readFrontend('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(readFrontend('package.json'));
const validation = readBackend('src/validations/decisionIntelligence.validation.js');
const service = readBackend('src/services/decisionIntelligence/crossDomainOptimizationEngineService.js');

const checks = [];
const check = (condition, label) => checks.push({ condition: Boolean(condition), label });

check(page.includes("ui('Advanced governance settings')"), 'advanced governance section remains available');
check(page.includes("Score thresholds use a normalized 0–1 scale: 0.50 = 50%, 0.75 = 75%, and 0.80 = 80%."), 'page explains the normalized score scale with concrete examples');
check(page.includes('They affect review/readiness checks only; saving them does not execute operational changes.'), 'page states that threshold saves do not execute operational changes');

check(page.includes("ui('High-impact tradeoff threshold (0–1)')"), 'high-impact tradeoff field exposes its score scale');
check(page.includes("ui('Reusable-pattern value threshold (0–1)')"), 'reusable-pattern field exposes its score scale');
check(page.includes("ui('Scaling value threshold (0–1)')"), 'scaling field exposes its score scale');
check(page.includes("ui('Weak-value threshold (0–1)')"), 'weak-value field exposes its score scale');

check(page.includes("Marks negative or mixed tradeoffs at or above this impact score as high impact."), 'high-impact tradeoff helper explains what crossing the threshold changes');
check(page.includes("Average confirmed realized value must meet or exceed this score for reusable-pattern review."), 'reusable-pattern helper explains its readiness consequence');
check(page.includes("Confirmed realized value must meet or exceed this score to count as a strong scaling outcome."), 'scaling helper explains its readiness consequence');
check(page.includes("Confirmed realized value below this score counts as weak-value evidence in lifecycle review."), 'weak-value helper explains its lifecycle consequence');

for (const key of [
  'high_impact_tradeoff_threshold',
  'reusable_pattern_value_threshold',
  'scaling_value_threshold',
  'weak_value_threshold'
]) {
  check(page.includes(`value={settingsDraft.${key}}`), `${key} remains bound to the existing setting`);
}
check((page.match(/type="number" min="0" max="1" step="0\.05"/g) || []).length >= 4, 'all four normalized threshold inputs retain the 0–1 range and 0.05 step');
check(page.includes("ui('Save governance settings')"), 'existing explicit save action remains intact');

check(validation.includes('high_impact_tradeoff_threshold: Joi.number().min(0).max(1).optional()'), 'backend still validates high-impact threshold to 0–1');
check(validation.includes('reusable_pattern_value_threshold: Joi.number().min(0).max(1).optional()'), 'backend still validates reusable-pattern threshold to 0–1');
check(validation.includes('scaling_value_threshold: Joi.number().min(0).max(1).optional()'), 'backend still validates scaling threshold to 0–1');
check(validation.includes('weak_value_threshold: Joi.number().min(0).max(1).optional()'), 'backend still validates weak-value threshold to 0–1');

check(service.includes("Math.abs(toNumber(item.impact_score) || 0) >= thresholds.high_impact_tradeoff_threshold"), 'high-impact helper matches the backend tradeoff test');
check(service.includes("averageRealizedValueScore >= normalizeGovernanceSettings(settings).reusable_pattern_value_threshold"), 'reusable-pattern helper matches the backend average realized-value review check');
check(service.includes("toNumber(item.realized_value_score) >= normalizeGovernanceSettings(settings).scaling_value_threshold"), 'scaling helper matches the backend strong-outcome check');
check(service.includes("toNumber(item.realized_value_score) < normalizeGovernanceSettings(settings).weak_value_threshold"), 'weak-value helper matches the backend lifecycle weak-outcome check');

for (const message of [
  'High-impact tradeoff threshold (0–1)',
  'Reusable-pattern value threshold (0–1)',
  'Scaling value threshold (0–1)',
  'Weak-value threshold (0–1)',
  'Score thresholds use a normalized 0–1 scale: 0.50 = 50%, 0.75 = 75%, and 0.80 = 80%. They affect review/readiness checks only; saving them does not execute operational changes.',
  'Marks negative or mixed tradeoffs at or above this impact score as high impact.',
  'Average confirmed realized value must meet or exceed this score for reusable-pattern review.',
  'Confirmed realized value must meet or exceed this score to count as a strong scaling outcome.',
  'Confirmed realized value below this score counts as weak-value evidence in lifecycle review.'
]) {
  check(translations.includes(`["${message}"`), `${message} has a five-language tenant catalog row`);
}

check(pkg.scripts?.['check:inventory-cross-domain-governance-threshold-clarity-surgical-fixes-v349266'] === 'node scripts/check-cross-domain-governance-threshold-clarity-surgical-fixes-v349266.mjs', 'Batch 021 regression guard is registered');

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'}: ${item.label}`);
if (failed.length) {
  console.error(`\nBatch 021 Cross-Domain governance threshold clarity guard: ${checks.length - failed.length}/${checks.length} PASS`);
  process.exit(1);
}
console.log(`\nBatch 021 Cross-Domain governance threshold clarity guard: ${checks.length}/${checks.length} PASS`);
