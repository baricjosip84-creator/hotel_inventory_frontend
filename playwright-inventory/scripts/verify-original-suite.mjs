import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire, Module } from 'node:module';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'original-suite-approved.json'), 'utf8'));
const testRoot = path.join(root, 'tests');
function getSpecs(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const f = path.join(dir, e.name);
  return e.isDirectory() ? getSpecs(f) : e.name.endsWith('.spec.ts') ? [f] : [];
}); }
const specs = getSpecs(testRoot);
const found = [];
for (const spec of specs) {
  const s = fs.readFileSync(spec,'utf8');
  for (const m of s.matchAll(/\b(?:test|it)(?:\.skip)?\s*\(\s*['"]([A-Z][A-Z0-9]+-\d{3})\b/g)) found.push(m[1]);
}
if (specs.length !== manifest.expected_spec_files || found.length !== manifest.expected_suite_ids || new Set(found).size !== found.length) {
  throw new Error(`Original suite unexpectedly changed: ${specs.length} specs, ${found.length} declarations, ${new Set(found).size} unique IDs`);
}
const allApproved = [];
const seenApprovedByGroup = new Map();
function entriesOf(group, entry) {
  const entries = Array.isArray(entry.entries) ? entry.entries : [{ file: entry.file, ids: entry.ids, sha256: entry.sha256 }];
  assert(entries.length > 0, `No approved source entries in ${group}`);
  for (const part of entries) {
    assert(/^tenant\/[a-z0-9-]+\/[a-z0-9-]+\.spec\.ts$/.test(part.file), `Invalid approved source path: ${group}`);
    assert(Array.isArray(part.ids) && part.ids.length > 0, `Empty approved IDs: ${group}`);
    allApproved.push({group, ...part});
  }
  return entries;
}
for (const [group, entry] of Object.entries(manifest.approved_groups)) {
  const idsInGroup = new Set();
  for (const part of entriesOf(group, entry)) {
    const file = path.join(testRoot, part.file);
    const body = fs.readFileSync(file);
    const sha = crypto.createHash('sha256').update(body).digest('hex');
    if (sha !== part.sha256) throw new Error(`Reviewed source changed; re-review required for ${group}/${part.file}`);
    for (const id of part.ids) {
      if (!found.includes(id)) throw new Error(`Approved ID no longer exists: ${group}/${id}`);
      assert(!idsInGroup.has(id), `Duplicate approved ID in group ${group}: ${id}`);
      idsInGroup.add(id);
    }
    if (group.startsWith('BULK_SAFE_')) {
      assert(body.toString().includes("'../../../support/liveOriginalSafeTest'"), `Bulk source lacks read-only network guard: ${part.file}`);
      assert(!part.ids.some(id => !/^[A-Z0-9]+-\d{3}$/.test(id)), `Invalid original ID in ${part.file}`);
    }
  }
  seenApprovedByGroup.set(group, idsInGroup);
}
// Original bulk groups are disjoint. The only permitted overlap is the
// explicit, source-fingerprinted retry of previously failed BULK_SAFE_02 IDs.
const retryGroup = 'BULK_SAFE_02_RECHECK';
const originalGroup = 'BULK_SAFE_02';
const bulkGroups = [...seenApprovedByGroup.entries()].filter(([name])=>name.startsWith('BULK_SAFE_'));
for (const [bulkName, bulkIds] of bulkGroups) {
  const otherIds = new Set([...seenApprovedByGroup.entries()]
    .filter(([name]) => name !== bulkName && !(
      (name===retryGroup && bulkName===originalGroup) ||
      (name===originalGroup && bulkName===retryGroup)
    )).flatMap(([,ids])=>[...ids]));
  for (const id of bulkIds) assert(!otherIds.has(id), `Bulk cannot reuse another group's ID: ${bulkName}/${id}`);
}
if (seenApprovedByGroup.has(retryGroup)) {
  const firstRun = manifest.batch_205_last_execution;
  const retryIds = seenApprovedByGroup.get(retryGroup);
  assert.equal(firstRun.total,250);assert.equal(firstRun.passed,144);assert.equal(firstRun.failed,106);
  assert.equal(new Set([...firstRun.passed_ids,...firstRun.failed_ids]).size,250);
  assert.equal(firstRun.passed_ids.length,144);assert.equal(firstRun.failed_ids.length,106);
  assert.deepEqual(new Set([...firstRun.passed_ids,...firstRun.failed_ids]), seenApprovedByGroup.get(originalGroup));
  const quarantined = Object.keys(manifest.batch_206_quarantined_unverified);
  assert.equal(quarantined.length,10);
  assert.equal(retryIds.size,96);
  assert.deepEqual(new Set([...retryIds,...quarantined]),new Set(firstRun.failed_ids));
  assert([...retryIds].every(id => !firstRun.passed_ids.includes(id)), 'Recheck must not repeat 144 already green scenarios');
  console.log('PASS: prior 144 successful IDs preserved; 96 failed IDs rechecked; 10 known mismatches remain unverified.');
}
const bulkIds = seenApprovedByGroup.get('BULK_SAFE_01');
const nextBulkIds = seenApprovedByGroup.get('BULK_SAFE_02');
// Preflight the real tenant-credential gate (no browser, network, or real credentials).
// The same verified manifest controls which groups may authenticate on the approved live origin.
// This catches manifest / credential-helper drift before the browser starts.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const gatePath = path.join(root, 'support/environment.ts');
const transpiled = ts.transpileModule(fs.readFileSync(gatePath, 'utf8'), {
  fileName: gatePath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true
});
if (transpiled.diagnostics?.length) {
  const fatal = transpiled.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
  if (fatal.length) throw new Error(`Environment helper did not transpile: ${fatal.map(d => d.messageText).join('; ')}`);
}
const compiled = new Module(gatePath);
compiled.filename = gatePath;
compiled.paths = Module._nodeModulePaths(path.dirname(gatePath));
compiled._compile(transpiled.outputText, gatePath);
const credentialGuard = compiled.exports.requireDisposableTenantCredentials;
assert.equal(typeof credentialGuard, 'function');
const envKeys = ['PW_ORIGINAL_SUITE_GROUP', 'PW_LIVE_ORIGINAL_READONLY', 'PW_BASE_URL', 'PW_TEST_ENVIRONMENT', 'PW_TENANT_EMAIL', 'PW_TENANT_PASSWORD'];
const saved = Object.fromEntries(envKeys.map(k => [k, process.env[k]]));
let preflightCount = 0;
try {
  process.env.PW_LIVE_ORIGINAL_READONLY = 'YES';
  process.env.PW_BASE_URL = manifest.live_origin;
  delete process.env.PW_TEST_ENVIRONMENT;
  process.env.PW_TENANT_EMAIL = 'preflight@example.invalid';
  process.env.PW_TENANT_PASSWORD = 'preflight-not-a-secret';
  for (const [group, entry] of Object.entries(manifest.approved_groups)) {
    process.env.PW_ORIGINAL_SUITE_GROUP = group;
    if (entry.secret) {
      assert.deepEqual(credentialGuard(), { email: 'preflight@example.invalid', password: 'preflight-not-a-secret' }, `Credential gate rejected an approved authenticated group: ${group}`);
    } else {
      assert.throws(credentialGuard, /Disposable tenant required/, `Credential gate unexpectedly approved no-secret group: ${group}`);
    }
    preflightCount++;
  }
  process.env.PW_ORIGINAL_SUITE_GROUP = 'NOT_REVIEWED';
  assert.throws(credentialGuard, /Disposable tenant required/, 'Credential gate unexpectedly approved an unreviewed group');
  process.env.PW_ORIGINAL_SUITE_GROUP = Object.keys(manifest.approved_groups).find(g => manifest.approved_groups[g].secret);
  process.env.PW_BASE_URL = 'https://not-the-approved-origin.vercel.app';
  assert.throws(credentialGuard, /Disposable tenant required/, 'Credential gate unexpectedly approved the wrong origin');
  process.env.PW_BASE_URL = manifest.live_origin;
  process.env.PW_LIVE_ORIGINAL_READONLY = 'NO';
  assert.throws(credentialGuard, /Disposable tenant required/, 'Credential gate unexpectedly approved missing read-only flag');
  process.env.PW_LIVE_ORIGINAL_READONLY = 'YES';
  delete process.env.PW_TENANT_EMAIL;
  assert.throws(credentialGuard, /PW_TENANT_EMAIL\/PW_TENANT_PASSWORD/, 'Credential gate did not reject missing credentials');
} finally {
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}
const workflowBody = fs.readFileSync(path.join(root, '../.github/workflows/inventory-original-suite.yml'), 'utf8');
for (const key of ['PW_TENANT_EMAIL: ${{ secrets.E2E_EMAIL }}', 'PW_TENANT_PASSWORD: ${{ secrets.E2E_PASSWORD }}']) {
  assert(workflowBody.includes(key), `Workflow is missing required credential mapping: ${key.split(':')[0]}`);
}
// Prevent dispatch-menu drift: every selectable live group must exist in the reviewed manifest.
const optionsSection = workflowBody.match(/^\s{8}options:\s*$([\s\S]*?)(?=^\s{6}confirmation:)/m);
assert(optionsSection, 'Live workflow group choice options are missing');
const declared = [...optionsSection[1].matchAll(/^\s{10}-\s+([A-Z0-9_]+)\s*$/gm)].map(match => match[1]);
assert.deepEqual(declared, ['DISCOVER_ALL', ...Object.keys(manifest.approved_groups)], 'Workflow group menu and reviewed manifest disagree');
assert.equal(new Set(declared).size, declared.length, 'Duplicate live group choice');
for (const { group, file, ids } of allApproved) {
  const body = fs.readFileSync(path.join(testRoot, file), 'utf8');
  for (const id of ids) {
    const matches = body.match(new RegExp(`\\btest\\s*\\(\\s*['"]${id}\\b`, 'g')) ?? [];
    assert.equal(matches.length, 1, `Approved ID must map to exactly one original test: ${group}/${id}`);
  }
}
// Ensure the workflow sends the full reviewed group to the browser runner, not to an unguarded script.
assert(workflowBody.includes('playwright.live-original.config.ts --list'));
assert(workflowBody.includes('playwright.live-original.config.ts'));
assert(workflowBody.includes("if: ${{ inputs.group != 'DISCOVER_ALL' }}"));
// Bulk source safety and the browser-auth bootstrap must remain fail closed.
if (bulkIds || nextBulkIds) {
  const adapter = fs.readFileSync(path.join(root, 'support/liveOriginalSafeTest.ts'), 'utf8');
  const session = fs.readFileSync(path.join(root, 'support/tenantSession.ts'), 'utf8');
  const products = fs.readFileSync(path.join(testRoot, 'tenant/products/products.spec.ts'), 'utf8');
  const suppliers = fs.readFileSync(path.join(testRoot, 'tenant/suppliers/suppliers.spec.ts'), 'utf8');
  const setup = fs.readFileSync(path.join(root, 'support/bulkSharedAuthSetup.ts'),'utf8');
  const config = fs.readFileSync(path.join(root, 'playwright.live-original.config.ts'),'utf8');
  assert(adapter.includes("{ scope: 'worker' }") && adapter.includes('storageState: async ({ bulkSession }'),
    'Bulk authentication must restore isolated per-test contexts');
  assert(adapter.includes('PW_BULK_SHARED_AUTH_STATE') && setup.includes('process.env.PW_BULK_SHARED_AUTH_STATE') &&
    config.includes('globalSetup:'), 'Workers must use one job-wide in-memory auth state, not repeated logins');
  assert(adapter.includes('page.context().route') && adapter.includes("property === 'continue'") &&
    adapter.includes('approvedLogin(method,'), 'Read-only guard must block all unmocked writes, including page.route continuations');
  assert(session.includes("await page.goto('/dashboard')"), 'Bulk login helper must preserve protected dashboard navigation');
  assert(adapter.includes("route.request().url()") && adapter.includes('approvedLogin(method,'),
    'Bulk login bootstrap must retain its network write protection');
  assert(session.includes(".startsWith('BULK_SAFE_')") &&
    session.includes('requireDisposableTenantCredentials();'),
    'Bulk must not repeat login and must keep credential safety check');
  assert(products.includes("await page.route('**/products', (route) => isApiGet(route)"),
    'Product error mock must not intercept HTML navigation');
  assert((suppliers.match(/\['fetch', 'xhr'\]\.includes\(request\.resourceType\(\)\)/g) || []).length >= 2,
    'Supplier empty/error mocks must not intercept HTML navigation');
}
// The bulk selected spec files must all use the same non-write fixture adapter.
if (bulkIds) assert.equal(bulkIds.size, 155, 'Batch 203/204 bulk must retain 155 original IDs');
if (nextBulkIds) assert.equal(nextBulkIds.size, 250, 'Batch 205 original bulk must retain 250 original IDs');
if (seenApprovedByGroup.has(retryGroup)) assert.equal(seenApprovedByGroup.get(retryGroup).size,96,
 'Batch 206 must recheck 96 previously failed original IDs, without retesting 144 already green.');
console.log(`PASS: Workflow dispatch options, manifest, and original test IDs match (${declared.length - 1} runnable groups).`);
console.log(`PASS: credential-gate runtime preflight for ${preflightCount} reviewed groups; unknown groups/wrong origin/missing flags/missing credentials denied.`);
console.log(`PASS: ${found.length} original scenarios from ${specs.length} spec files; ${allApproved.reduce((n,g)=>n+g.ids.length,0)} approved runtime ID memberships in ${Object.keys(manifest.approved_groups).length} groups.`);
console.log('No original scenario declarations added or removed. No live credentials read by this check.');
