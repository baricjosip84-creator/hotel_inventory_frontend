/* FT178: exercise the actual Vite output plugin without needing Vite installed.
   The previous plugin silently overwrote the public FE277 identity with a
   payload missing `frontend`. This must never recur. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const publicVersion = JSON.parse(fs.readFileSync(path.join(root, 'public/deployment-version.json'), 'utf8'));
assert.equal(publicVersion.frontend, 'FE278');
assert.equal(publicVersion.audit_round, 'FT178');
assert.equal(publicVersion.backend, 'BE154');
const config = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
const ast = ts.createSourceFile('vite.config.ts', config, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'deploymentVersionPlugin');
assert.ok(fn, 'Vite deployment identity plugin exists');
const js = ts.transpileModule(fn.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const context = {
  module:{exports:{}}, exports:{}, buildIdentity:publicVersion,
  firstNonEmpty:(...a)=>a.find(x=>String(x||'').trim()) || null,
  sentrySourceMapUploadEnabled:false, appRelease:null, process:{env:{}}, Date, JSON, Object
};
vm.runInNewContext(js+'\nmodule.exports.deploymentVersionPlugin = deploymentVersionPlugin;', context, {filename:'vite-ft178-plugin',timeout:4000});
const plugin = context.module.exports.deploymentVersionPlugin();
assert.equal(plugin.name,'deployment-version-metadata');
const html = '<html><head></head><body><div id="root"></div></body></html>';
const stamped = plugin.transformIndexHtml(html);
assert.ok(stamped.includes('name="inventory-frontend-release" content="FE278"'),'HTML carries FE278 marker');
const emitted=[];
plugin.generateBundle.call({emitFile:x=>emitted.push(x)}, {}, {
  'assets/index-NEWFE278.js':{type:'chunk'}, 'assets/vendor-react-123.js':{type:'chunk'}
});
assert.equal(emitted.length,1,'Exactly one deployment version asset generated');
assert.equal(emitted[0].fileName,'deployment-version.json');
const result = JSON.parse(emitted[0].source);
assert.equal(result.frontend,publicVersion.frontend);
assert.equal(result.backend,publicVersion.backend);
assert.equal(result.audit_round,publicVersion.audit_round);
assert.deepEqual(Array.from(result.entrypoint_assets),['assets/index-NEWFE278.js']);
assert.ok(result.built_at && Date.parse(result.built_at),'Build timestamp is present');
const worker = fs.readFileSync(path.join(root,'public/service-worker.js'),'utf8');
assert.match(worker,/inventory-operations-shell-v3/);
assert.match(worker,/keys\.filter\(\(key\) => key\.startsWith\(CACHE_PREFIX\) && key !== CACHE_NAME\)/);
assert.match(worker,/url\.pathname === '\/deployment-version\.json'/);
const vercel = JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
for (const route of ['/','/index.html','/products','/deployment-version.json','/service-worker.js']) {
  assert.ok(vercel.headers.some(item=> item.source === route && item.headers.some(header => header.key === 'Cache-Control' && /no-store/.test(header.value))), `${route} must not be cached`);
}
const check = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
assert.match(check.scripts.prebuild,/check:ft178-deployment-identity/);
assert.match(check.scripts.postbuild,/check:ft178-built-artifacts/);
console.log('FT178: Vite emitted FE278/FT178/BE154 identity + entrypoint JS PASS; HTML marker PASS; SW v3 and no-store headers PASS; build gates PASS');
