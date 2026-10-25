/* FT180: actual Git-index reproduction of the user's CI omission.
 * Full extracted source has the FT176 test; earlier changed-files ZIP did not.
 * Verify the CI checker catches an untracked required file and passes when staged. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'inventory-ft180-'));
const rel = 'scripts/check-ft176-products-status-badge-ui-scope.cjs';
const checker = 'scripts/check-ft049-ci-entrypoints.cjs';
const file = path.join(root, rel);
assert.ok(fs.statSync(file).size > 100, 'FT176 test must be included in full release');
function git(args) { return cp.execFileSync('git', args, { cwd: fixture, encoding: 'utf8' }); }
function run() { return cp.spawnSync(process.execPath, [checker], { cwd: fixture, encoding: 'utf8' }); }
try {
  for (const item of ['package.json', '.github/workflows/frontend-validation.yml']) {
    fs.mkdirSync(path.dirname(path.join(fixture, item)), { recursive: true });
    fs.copyFileSync(path.join(root, item), path.join(fixture, item));
  }
  // Copy the complete CI dependency tree, not a mock script.
  fs.cpSync(path.join(root, 'scripts'), path.join(fixture, 'scripts'), { recursive: true });
  fs.cpSync(path.join(root, 'src'), path.join(fixture, 'src'), { recursive: true });
  fs.copyFileSync(path.join(root, '.gitignore'), path.join(fixture, '.gitignore'));
  git(['init', '-q']);
  git(['add', '-A']);
  const base = run();
  assert.equal(base.status, 0, `Baseline source must pass FT049: ${base.stderr}`);
  git(['rm', '--cached', '-q', '--', rel]); // source remains on disk, but CI will not receive it
  const absent = run();
  assert.notEqual(absent.status, 0, 'Missing Git-staged FT176 file must be rejected');
  assert.match(absent.stderr + absent.stdout, /not staged\/tracked by Git: scripts\/check-ft176-products-status-badge-ui-scope\.cjs/, 'Clear Git source omission diagnostic');
  git(['add', '--', rel]);
  const fixed = run();
  assert.equal(fixed.status, 0, `Re-staged FT176 file must close CI source failure: ${fixed.stderr}`);
  console.log('FT180: full source passes; FT176 file present but NOT Git-tracked fails; restored Git tracking passes — 3 checks PASS');
} finally { fs.rmSync(fixture, { recursive: true, force: true }); }
