import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function fail(message) {
  throw new Error(`Unified AI cross-repo contract failed: ${message}`);
}

const frontendRoot = process.cwd();
const backendRoot = process.env.BACKEND_ROOT || process.argv[2] || path.resolve(frontendRoot, '../backend');
const pagePath = path.join(frontendRoot, 'src/pages/HumanInLoopAIReviewPage.tsx');
const servicePath = path.join(backendRoot, 'src/services/decisionIntelligence/intelligenceProductionReadinessService.js');

if (!fs.existsSync(pagePath)) fail(`frontend page not found: ${pagePath}`);
if (!fs.existsSync(servicePath)) fail(`backend service not found; pass BACKEND_ROOT or argv[2]: ${servicePath}`);

const pageSource = fs.readFileSync(pagePath, 'utf8');
const serviceSource = fs.readFileSync(servicePath, 'utf8');

const frozenKeyBlock = serviceSource.match(/const\s+UNIFIED_AI_RESPONSE_CONTRACT_KEYS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
if (!frozenKeyBlock) fail('backend UNIFIED_AI_RESPONSE_CONTRACT_KEYS is missing');
const backendKeys = [...frozenKeyBlock[1].matchAll(/['"](unified_ai_[^'"]+)['"]/g)].map((match) => match[1]);

const duplicateBackendKeys = backendKeys.filter((key, index) => backendKeys.indexOf(key) !== index);
if (duplicateBackendKeys.length) {
  fail(`backend UNIFIED_AI_RESPONSE_CONTRACT_KEYS contains duplicate response key(s): ${[...new Set(duplicateBackendKeys)].join(', ')}`);
}

const anchorManifestBlock = pageSource.match(/const\s+UNIFIED_AI_FRONTEND_PANEL_DOM_ANCHORS\s*=\s*\[([\s\S]*?)\]\s+as\s+const;/);
if (!anchorManifestBlock) fail('frontend UNIFIED_AI_FRONTEND_PANEL_DOM_ANCHORS is missing');
const frontendKeysFromAnchors = [...anchorManifestBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => `unified_ai_${match[1]}`);

const responseTypeBlock = pageSource.match(/type\s+IntelligenceProductionReadinessResponse\s*=\s*\{([\s\S]*?)\n\};/);
if (!responseTypeBlock) fail('frontend IntelligenceProductionReadinessResponse type is missing');
const frontendTypedKeys = [...responseTypeBlock[1].matchAll(/\n\s*(unified_ai_[a-z0-9_]+)\??\s*:/g)].map((match) => match[1]);

const failures = [];
const addMissing = (label, expected, actual) => {
  const missing = expected.filter((key) => !actual.includes(key));
  const unexpected = actual.filter((key) => !expected.includes(key));
  if (missing.length) failures.push(`${label} missing keys: ${missing.join(', ')}`);
  if (unexpected.length) failures.push(`${label} unexpected keys: ${unexpected.join(', ')}`);
  const orderDrift = expected
    .map((key, index) => ({ index, expected: key, actual: actual[index] }))
    .filter((row) => row.expected !== row.actual);
  if (orderDrift.length) failures.push(`${label} order drift: ${orderDrift.map((row) => `${row.index + 1}:${row.expected}->${row.actual || 'missing'}`).join(', ')}`);
};

addMissing('frontend panel anchor manifest vs backend frozen keys', backendKeys, frontendKeysFromAnchors);
addMissing('frontend response type vs backend frozen keys', backendKeys, frontendTypedKeys);

const EXPECTED_UNIFIED_AI_CONTRACT_FREEZE_VERSION = 'step206_unified_ai_frontend_deployment_contract_suite_guard';
const versionMatch = serviceSource.match(/const\s+UNIFIED_AI_CONTRACT_FREEZE_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!versionMatch) failures.push('backend contract version is missing');
else if (versionMatch[1] !== EXPECTED_UNIFIED_AI_CONTRACT_FREEZE_VERSION) {
  failures.push(`backend contract version must exactly equal ${EXPECTED_UNIFIED_AI_CONTRACT_FREEZE_VERSION}; received ${versionMatch[1]}`);
}

const versionLiteralPattern = /step\d+_unified_ai_[a-z0-9_]+/g;
const versionFiles = [
  { label: 'backend readiness service', filePath: servicePath },
  { label: 'frontend cross-repo contract script', filePath: import.meta.url.startsWith('file:') ? new URL(import.meta.url) : path.join(frontendRoot, 'scripts/check-unified-ai-cross-repo-contract.mjs') },
  { label: 'frontend response type contract script', filePath: path.join(frontendRoot, 'scripts/check-unified-ai-response-type-contract.mjs') },
  { label: 'frontend route fetch contract script', filePath: path.join(frontendRoot, 'scripts/check-unified-ai-route-fetch-contract.mjs') }
];
for (const { label, filePath } of versionFiles) {
  const resolvedPath = filePath instanceof URL ? filePath : path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    failures.push(`${label} file missing for contract version literal consistency check`);
    continue;
  }
  const fileSource = fs.readFileSync(resolvedPath, 'utf8');
  const versionLiterals = [...new Set(fileSource.match(versionLiteralPattern) || [])];
  const staleVersionLiterals = versionLiterals.filter((literal) => literal !== EXPECTED_UNIFIED_AI_CONTRACT_FREEZE_VERSION);
  if (staleVersionLiterals.length) {
    failures.push(`${label} contains stale unified AI contract version literal(s): ${staleVersionLiterals.join(', ')}`);
  }
}

const frontendPackagePath = path.join(frontendRoot, 'package.json');
const backendPackagePath = path.join(backendRoot, 'package.json');
const frontendSuitePath = path.join(frontendRoot, 'scripts/check-unified-ai-contract-suite.mjs');
if (!fs.existsSync(frontendSuitePath)) {
  failures.push('frontend unified AI contract suite runner is missing');
} else {
  const frontendSuiteSource = fs.readFileSync(frontendSuitePath, 'utf8');
  if (!frontendSuiteSource.includes("argv.indexOf('--backend-root')")) {
    failures.push('frontend contract suite runner does not support --backend-root CLI flag');
  }
  if (!frontendSuiteSource.includes('isManagedFrontendBuildWithoutBackendRoot')) {
    failures.push('frontend contract suite runner must support managed frontend-only deployment builds without requiring a backend checkout');
  }
  if (!frontendSuiteSource.includes('backend-dependent route and cross-repo checks were skipped')) {
    failures.push('frontend contract suite runner must explicitly report skipped backend-dependent checks in managed frontend-only deployment mode');
  }
}
if (!fs.existsSync(frontendPackagePath)) failures.push('frontend package.json is missing');
if (!fs.existsSync(backendPackagePath)) failures.push('backend package.json is missing');
if (fs.existsSync(frontendPackagePath)) {
  const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
  const scripts = frontendPackage.scripts || {};
  const requiredFrontendScripts = {
    'check:unified-ai-panel-anchor-contract': 'node scripts/check-unified-ai-panel-anchor-contract.mjs',
    'check:unified-ai-response-type-contract': 'node scripts/check-unified-ai-response-type-contract.mjs',
    'check:unified-ai-route-fetch-contract': 'node scripts/check-unified-ai-route-fetch-contract.mjs',
    'check:unified-ai-cross-repo-contract': 'node scripts/check-unified-ai-cross-repo-contract.mjs',
    'check:unified-ai-contract-suite': 'node scripts/check-unified-ai-contract-suite.mjs'
  };
  for (const [scriptName, expectedCommand] of Object.entries(requiredFrontendScripts)) {
    if (scripts[scriptName] !== expectedCommand) {
      failures.push(`frontend package script ${scriptName} is missing or misaligned`);
    }
  }
  if (scripts.prebuild !== 'npm run check:unified-ai-contract-suite && npm run typecheck:ci') {
    failures.push('frontend prebuild script must run the unified AI contract suite and pilot-critical TypeScript gate before Vite build');
  }
  if (scripts.build !== 'vite build') {
    failures.push('frontend build script must remain the plain Vite production build guarded by npm prebuild');
  }
  if (scripts['pretest:e2e'] !== 'npm run check:unified-ai-contract-suite') {
    failures.push('frontend pretest:e2e script must run check:unified-ai-contract-suite before Playwright e2e tests');
  }
  if (scripts['pretest:e2e:ui'] !== 'npm run check:unified-ai-contract-suite') {
    failures.push('frontend pretest:e2e:ui script must run check:unified-ai-contract-suite before Playwright e2e UI tests');
  }
  if (scripts.prelint !== 'npm run check:unified-ai-contract-suite') {
    failures.push('frontend prelint script must run check:unified-ai-contract-suite before ESLint');
  }
  if (scripts.predev !== 'npm run check:unified-ai-contract-suite') {
    failures.push('frontend predev script must run check:unified-ai-contract-suite before Vite dev server');
  }
  if (scripts.prepreview !== 'npm run check:unified-ai-contract-suite') {
    failures.push('frontend prepreview script must run check:unified-ai-contract-suite before Vite preview server');
  }
}
if (fs.existsSync(backendPackagePath)) {
  const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
  const scripts = backendPackage.scripts || {};
  if (scripts['platform:check-unified-ai-readiness-contract'] !== 'node scripts/checkUnifiedAIReadinessContract.js') {
    failures.push('backend package script platform:check-unified-ai-readiness-contract is missing or misaligned');
  }
  if (!scripts.check || !scripts.check.includes('npm run platform:check-unified-ai-readiness-contract')) {
    failures.push('backend npm check script does not run platform:check-unified-ai-readiness-contract');
  }
  if (scripts.pretest !== 'npm run platform:check-unified-ai-contract-suite') {
    failures.push('backend pretest script does not run platform:check-unified-ai-contract-suite');
  }
  if (scripts.prestart !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend prestart script does not run platform:check-unified-ai-readiness-contract');
  }
  if (scripts.predev !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend predev script does not run platform:check-unified-ai-readiness-contract');
  }
  if (scripts['predb:migrate'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend predb:migrate script does not run platform:check-unified-ai-readiness-contract before migrations');
  }
  if (scripts['preplatform:worker'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:worker script does not run platform:check-unified-ai-readiness-contract before platform worker');
  }
  if (scripts['preplatform:worker:once'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:worker:once script does not run platform:check-unified-ai-readiness-contract before one-off platform worker');
  }
  if (scripts['preplatform:seed-operational-jobs'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:seed-operational-jobs script does not run platform:check-unified-ai-readiness-contract before operational job seeding');
  }
  if (scripts['preplatform:seed-superadmin'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:seed-superadmin script does not run platform:check-unified-ai-readiness-contract before platform superadmin seeding');
  }

  if (scripts['preplatform:check-production-release-gate'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-production-release-gate script does not run platform:check-unified-ai-readiness-contract before production release gate checks');
  }
  if (scripts['preplatform:check-production-deployment-foundation'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-production-deployment-foundation script does not run platform:check-unified-ai-readiness-contract before production deployment foundation checks');
  }

  if (scripts['preplatform:check-ci-pipeline-foundation'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-ci-pipeline-foundation script does not run platform:check-unified-ai-readiness-contract before CI pipeline foundation checks');
  }

  if (scripts['preplatform:check-migration-pipeline-safety'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-migration-pipeline-safety script does not run platform:check-unified-ai-readiness-contract before migration pipeline safety checks');
  }

  if (scripts['preplatform:check-observability-structured-logging'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-observability-structured-logging script does not run platform:check-unified-ai-readiness-contract before observability structured logging checks');
  }
  if (scripts['preplatform:check-health-readiness-liveness'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-health-readiness-liveness script does not run platform:check-unified-ai-readiness-contract before health/readiness/liveness checks');
  }

  if (scripts['preplatform:check-database-backup-restore'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-database-backup-restore script does not run platform:check-unified-ai-readiness-contract before database backup/restore checks');
  }
  if (scripts['preplatform:check-rollback-recovery-foundation'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-rollback-recovery-foundation script does not run platform:check-unified-ai-readiness-contract before rollback/recovery foundation checks');
  }

  if (scripts['preplatform:check-secrets-config-governance'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-secrets-config-governance script does not run platform:check-unified-ai-readiness-contract before secrets/config governance checks');
  }
  if (scripts['preplatform:check-alerting-escalation-foundation'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-alerting-escalation-foundation script does not run platform:check-unified-ai-readiness-contract before alerting/escalation foundation checks');
  }
  if (scripts['preplatform:check-feature-flag-rollout-foundation'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-feature-flag-rollout-foundation script does not run platform:check-unified-ai-readiness-contract before feature flag rollout foundation checks');
  }
  if (scripts['preplatform:check-production-operations-runbook'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend preplatform:check-production-operations-runbook script does not run platform:check-unified-ai-readiness-contract before production operations runbook checks');
  }

  if (scripts['predb:export-schema'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend predb:export-schema script does not run platform:check-unified-ai-readiness-contract before schema export');
  }
  if (scripts['predb:baseline'] !== 'npm run platform:check-unified-ai-readiness-contract') {
    failures.push('backend predb:baseline script does not run platform:check-unified-ai-readiness-contract before baseline generation');
  }

  if (scripts['platform:check-unified-ai-contract-suite'] !== 'node scripts/checkUnifiedAIContractSuite.js') {
    failures.push('backend package script platform:check-unified-ai-contract-suite is missing or misaligned');
  }
  const backendSuitePath = path.join(backendRoot, 'scripts/checkUnifiedAIContractSuite.js');
  if (!fs.existsSync(backendSuitePath)) {
    failures.push('backend unified AI contract suite runner is missing');
  } else {
    const backendSuiteSource = fs.readFileSync(backendSuitePath, 'utf8');
    if (!backendSuiteSource.includes('UNIFIED_AI_ALLOW_BACKEND_ONLY_CONTRACT_SUITE')) {
      failures.push('backend contract suite runner missing explicit backend-only waiver control');
    }
    if (!backendSuiteSource.includes('fail(`frontend cross-repo contract script not found')) {
      failures.push('backend contract suite runner does not fail when frontend cross-repo script is missing');
    }
  }
}


const routeContractsBlock = serviceSource.match(/const\s+UNIFIED_AI_ROUTE_EXPOSURE_CONTRACTS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
if (!routeContractsBlock) failures.push('backend UNIFIED_AI_ROUTE_EXPOSURE_CONTRACTS is missing');
else {
  const routeContracts = [...routeContractsBlock[1].matchAll(/\{([\s\S]*?)\n\s*\}/g)].map((match) => {
    const block = match[1];
    const readString = (propertyName) => {
      const quoted = block.match(new RegExp(`${propertyName}\\s*:\\s*['"]([^'"]+)['"]`));
      if (quoted) return quoted[1];
      const template = block.match(new RegExp(`${propertyName}\\s*:\\s*` + '`\\$\\{UNIFIED_AI_ROUTE_FRONTEND_API_BASE_PATH\\}([^`]+)`'));
      if (template) return `/intelligence-readiness${template[1]}`;
      return null;
    };
    return {
      frontend_api_path: readString('frontend_api_path'),
      frontend_query_key: readString('frontend_query_key')
    };
  });
  const apiRequestPaths = [...pageSource.matchAll(/apiRequest<[^>]+>\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/g)]
    .map((match) => match[1] || match[2] || match[3])
    .map((apiPath) => apiPath.replace(/\$\{encodeURIComponent\(featureKey\)\}/g, ':featureKey'));
  const queryKeys = [...pageSource.matchAll(/queryKey\s*:\s*\[\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  const expectedApiPaths = routeContracts.map((contract) => contract.frontend_api_path).filter(Boolean);
  const expectedQueryKeys = routeContracts.map((contract) => contract.frontend_query_key).filter(Boolean);
  const missingApiPaths = expectedApiPaths.filter((apiPath) => !apiRequestPaths.includes(apiPath));
  const missingQueryKeys = expectedQueryKeys.filter((queryKey) => !queryKeys.includes(queryKey));
  if (missingApiPaths.length) failures.push(`frontend missing apiRequest paths from backend route manifest: ${missingApiPaths.join(', ')}`);
  if (missingQueryKeys.length) failures.push(`frontend missing query keys from backend route manifest: ${missingQueryKeys.join(', ')}`);
}

if (failures.length) fail(failures.join('; '));

console.log(`Unified AI cross-repo contract passed (${backendKeys.length} backend keys aligned to frontend anchors/types and package scripts, version ${versionMatch[1]}).`);
