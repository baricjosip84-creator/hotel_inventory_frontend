import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function fail(message) {
  throw new Error(`Unified AI route fetch contract failed: ${message}`);
}

const frontendRoot = process.cwd();
const backendRoot = process.env.BACKEND_ROOT || process.argv[2] || path.resolve(frontendRoot, '../backend');
const pagePath = path.join(frontendRoot, 'src/pages/HumanInLoopAIReviewPage.tsx');
const servicePath = path.join(backendRoot, 'src/services/decisionIntelligence/intelligenceProductionReadinessService.js');

if (!fs.existsSync(pagePath)) fail(`frontend page not found: ${pagePath}`);
if (!fs.existsSync(servicePath)) fail(`backend service not found; pass BACKEND_ROOT or argv[2]: ${servicePath}`);

const pageSource = fs.readFileSync(pagePath, 'utf8');
const serviceSource = fs.readFileSync(servicePath, 'utf8');

function readStringProperty(block, propertyName) {
  const quoted = block.match(new RegExp(`${propertyName}\\s*:\\s*['"]([^'"]+)['"]`));
  if (quoted) return quoted[1];
  const template = block.match(new RegExp(`${propertyName}\\s*:\\s*` + '`\\$\\{UNIFIED_AI_ROUTE_FRONTEND_API_BASE_PATH\\}([^`]+)`'));
  if (template) return `/intelligence-readiness${template[1]}`;
  return null;
}

const routeContractsBlockMatch = serviceSource.match(/const\s+UNIFIED_AI_ROUTE_EXPOSURE_CONTRACTS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
if (!routeContractsBlockMatch) fail('backend UNIFIED_AI_ROUTE_EXPOSURE_CONTRACTS is missing');

const routeContracts = [...routeContractsBlockMatch[1].matchAll(/\{([\s\S]*?)\n\s*\}/g)].map((match, index) => ({
  index: index + 1,
  route_path: readStringProperty(match[1], 'route_path'),
  frontend_api_path: readStringProperty(match[1], 'frontend_api_path'),
  frontend_query_key: readStringProperty(match[1], 'frontend_query_key')
}));

if (!routeContracts.length) fail('backend route contract manifest is empty');

const apiRequestPaths = [...pageSource.matchAll(/apiRequest<[^>]+>\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/g)]
  .map((match) => match[1] || match[2] || match[3])
  .map((apiPath) => apiPath.replace(/\$\{encodeURIComponent\(featureKey\)\}/g, ':featureKey'));
const queryKeys = [...pageSource.matchAll(/queryKey\s*:\s*\[\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);

const failures = [];
const duplicateApiPaths = apiRequestPaths.filter((apiPath, index) => apiRequestPaths.indexOf(apiPath) !== index);
const duplicateQueryKeys = queryKeys.filter((queryKey, index) => queryKeys.indexOf(queryKey) !== index);
if (duplicateApiPaths.length) failures.push(`duplicate frontend apiRequest paths: ${[...new Set(duplicateApiPaths)].join(', ')}`);
if (duplicateQueryKeys.length) failures.push(`duplicate frontend query keys: ${[...new Set(duplicateQueryKeys)].join(', ')}`);

for (const contract of routeContracts) {
  if (!contract.frontend_api_path) failures.push(`route contract ${contract.index} missing frontend_api_path`);
  if (!contract.frontend_query_key) failures.push(`route contract ${contract.index} missing frontend_query_key`);
  if (contract.frontend_api_path && !apiRequestPaths.includes(contract.frontend_api_path)) {
    failures.push(`frontend missing apiRequest path ${contract.frontend_api_path}`);
  }
  if (contract.frontend_query_key && !queryKeys.includes(contract.frontend_query_key)) {
    failures.push(`frontend missing query key ${contract.frontend_query_key}`);
  }
}

const expectedApiPaths = routeContracts.map((contract) => contract.frontend_api_path).filter(Boolean);
const unexpectedApiPaths = apiRequestPaths
  .filter((apiPath) => apiPath.startsWith('/intelligence-readiness/'))
  .filter((apiPath) => !expectedApiPaths.includes(apiPath));
if (unexpectedApiPaths.length) failures.push(`frontend has unregistered intelligence-readiness apiRequest paths: ${[...new Set(unexpectedApiPaths)].join(', ')}`);

const expectedQueryKeys = routeContracts.map((contract) => contract.frontend_query_key).filter(Boolean);
const unexpectedQueryKeys = queryKeys
  .filter((queryKey) => queryKey.startsWith('intelligence-production-'))
  .filter((queryKey) => !expectedQueryKeys.includes(queryKey));
if (unexpectedQueryKeys.length) failures.push(`frontend has unregistered intelligence-production query keys: ${[...new Set(unexpectedQueryKeys)].join(', ')}`);

if (failures.length) fail(failures.join('; '));

console.log(`Unified AI route fetch contract passed (${expectedApiPaths.length} api paths and ${expectedQueryKeys.length} query keys).`);
