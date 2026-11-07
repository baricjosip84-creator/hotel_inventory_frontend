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
for (const [group, entry] of Object.entries(manifest.approved_groups)) {
  const file = path.join(testRoot,entry.file);
  const body = fs.readFileSync(file);
  const sha = crypto.createHash('sha256').update(body).digest('hex');
  if (sha !== entry.sha256) throw new Error(`Reviewed source changed; re-review required for group: ${group}`);
  for (const id of entry.ids) {
    if (!found.includes(id)) throw new Error(`Approved ID no longer exists: ${group}/${id}`);
  }
}
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
const declared = [...optionsSection[1].matchAll(/^\s{10}-\s+([A-Z_]+)\s*$/gm)].map(match => match[1]);
assert.deepEqual(declared, ['DISCOVER_ALL', ...Object.keys(manifest.approved_groups)], 'Workflow group menu and reviewed manifest disagree');
assert.equal(new Set(declared).size, declared.length, 'Duplicate live group choice');
for (const [name, entry] of Object.entries(manifest.approved_groups)) {
  const body = fs.readFileSync(path.join(testRoot, entry.file), 'utf8');
  for (const id of entry.ids) {
    const matches = body.match(new RegExp(`\\btest\\s*\\(\\s*['"]${id}\\b`, 'g')) ?? [];
    assert.equal(matches.length, 1, `Approved ID must map to exactly one original test: ${name}/${id}`);
  }
}
console.log(`PASS: Workflow dispatch options, manifest, and original test IDs match (${declared.length - 1} runnable groups).`);
console.log(`PASS: credential-gate runtime preflight for ${preflightCount} reviewed groups; unknown groups/wrong origin/missing flags/missing credentials denied.`);
console.log(`PASS: ${found.length} original scenarios from ${specs.length} spec files; ${Object.values(manifest.approved_groups).reduce((n,g)=>n+g.ids.length,0)} reviewed runtime IDs in ${Object.keys(manifest.approved_groups).length} groups.`);
console.log('No original scenario declarations added or removed. No live credentials read by this check.');
