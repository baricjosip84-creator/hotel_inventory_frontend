/* FT179: ensure build-required release identity survives Git, cleanup and source packaging.
 * A missing source manifest must not reach Vercel: npm prebuild verifies it.
 * This test does not change application data or contact deployment services. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const publicPath = 'public/deployment-version.json';
const manifest = JSON.parse(fs.readFileSync(path.join(root, publicPath), 'utf8'));
// Earlier release asserted FE280 literally; permit later cumulative releases.
assert.match(manifest.frontend, /^FE\d+$/);
// Earlier release asserted FT180 literally; preserve versioned metadata validation.
assert.match(manifest.audit_round, /^FT\d+$/);
assert.equal(manifest.backend, 'BE155');
const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
assert.ok(!/^\s*public\/deployment-version\.json\s*$/m.test(ignore), 'Git must NOT ignore the version manifest');
assert.match(ignore, /^dist\/$/m, 'Build output remains ignored');
const cleanup = fs.readFileSync(path.join(root, 'scripts/clean-generated-artifacts.mjs'), 'utf8');
assert.ok(!cleanup.includes("'dist', 'public/deployment-version.json'"), 'cleanup must preserve source identity');
const list = cleanup.match(/const generatedPaths = \[([^\]]+)\]/s);
assert.ok(list, 'cleanup paths exist');
assert.ok(!list[1].includes('deployment-version'), 'cleanup must not remove source identity');
const stager = fs.readFileSync(path.join(root, 'scripts/prepare-source-distribution.mjs'), 'utf8');
assert.ok(!/if \(sourcePath === path\.join\(root, 'public', 'deployment-version\.json'\)\) continue;/.test(stager), 'source stage must preserve identity');
const build = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.match(build.scripts.prebuild, /check:ft179-release-identity-preservation/, 'prebuild must enforce manifest preservation');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'inventory-ft179-'));
try {
  const repo = path.join(scratch,'repo');
  const dist = path.join(scratch,'dist');
  fs.mkdirSync(path.join(repo,'public'), {recursive:true});
  fs.mkdirSync(path.join(repo,'scripts'), {recursive:true});
  fs.copyFileSync(path.join(root,publicPath),path.join(repo,publicPath));
  fs.copyFileSync(path.join(root,'.gitignore'),path.join(repo,'.gitignore'));
  fs.copyFileSync(path.join(root,'scripts/prepare-source-distribution.mjs'),path.join(repo,'scripts/prepare-source-distribution.mjs'));
  fs.writeFileSync(path.join(repo,'package.json'),'{}\n');
  cp.execFileSync('node',[path.join(repo,'scripts/prepare-source-distribution.mjs'),'--output',dist],{encoding:'utf8'});
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dist,publicPath),'utf8')),manifest,'clean source staging preserves identity');
  const gitVersion = cp.spawnSync('git',['--version'],{encoding:'utf8'});
  if (gitVersion.status === 0) {
    cp.execFileSync('git',['init','-q'],{cwd:repo});
    const ignoreStatus = cp.spawnSync('git',['check-ignore','-q',publicPath],{cwd:repo});
    assert.equal(ignoreStatus.status, 1, 'Git must allow version manifest to be staged');
    cp.execFileSync('git',['add','-N','--',publicPath],{cwd:repo});
  }
} finally {
  fs.rmSync(scratch,{recursive:true,force:true});
}
console.log(`FT179: Git tracking PASS; cleanup retention PASS; real source staging PASS; build manifest ${manifest.frontend}/${manifest.audit_round}/${manifest.backend} PASS`);
