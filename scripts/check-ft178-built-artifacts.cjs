/* Runs only after Vite finishes building. A release with contradictory compiled
   metadata fails the build, rather than reaching Vercel with a false version. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const identity = JSON.parse(fs.readFileSync(path.join(root,'public/deployment-version.json'),'utf8'));
const dist = path.join(root,'dist');
const output = JSON.parse(fs.readFileSync(path.join(dist,'deployment-version.json'),'utf8'));
for (const k of ['application','frontend','backend','audit_round']) {
  assert.equal(output[k],identity[k],`Compiled deployment identity must match source ${k}`);
}
assert.ok(Array.isArray(output.entrypoint_assets) && output.entrypoint_assets.length > 0,'Compiled entrypoint JS required');
const html = fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert.ok(html.includes(`name="inventory-frontend-release" content="${identity.frontend}"`),'Compiled HTML release marker missing');
for (const asset of output.entrypoint_assets) {
  assert.ok(html.includes(`/${asset}`), `Compiled HTML must reference ${asset}`);
  assert.ok(fs.statSync(path.join(dist,asset)).isFile(),`Compiled JS asset missing: ${asset}`);
}
console.log(`FT178 built artifact integrity PASS: ${identity.frontend} / ${identity.audit_round}; entrypoint(s) ${output.entrypoint_assets.join(', ')}`);
