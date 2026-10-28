/* FT195: source-to-release and cache-refresh regression guard.
 * Protects against crash fixes not being included in the built frontend.
 * This is an offline source test; it cannot establish live Vercel alias state. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(base, file), 'utf8');
const info = JSON.parse(read('public/deployment-version.json'));
const packageInfo = JSON.parse(read('package.json'));
assert.match(info.frontend, /^FE(289|290|291)$/);
assert.match(info.audit_round, /^FT(195|196|197)$/);
assert.equal(packageInfo.inventorySourceIdentity.frontend, info.frontend);
assert.equal(packageInfo.inventorySourceIdentity.audit_round, info.audit_round);
const source = read('src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
assert.ok(source.includes('const createReturnMutation = useMutation({'), 'retained original supplier-return mutation');
assert.ok(!source.includes('const addReturnLineDisabled'), 'remove premature access to useMutation variable');
const afterHook = source.slice(source.indexOf('const createReturnMutation = useMutation({'));
assert.ok(afterHook.includes("disabled={!canWrite || lineQuantityState !== 'ready' || createReturnMutation.isPending}"), 'read pending state only after hook initialized');
const worker = read('public/service-worker.js');
assert.ok(worker.includes("const CACHE_NAME = 'inventory-operations-shell-v4'"), 'new worker cache name invalidates prior cache');
assert.ok(worker.includes("if (url.pathname.startsWith('/assets/')) {"), 'asset handling must remain explicit');
const assets = worker.slice(worker.indexOf("if (url.pathname.startsWith('/assets/')) {"));
assert.ok(assets.indexOf('fetch(request)') < assets.indexOf('caches.match(request)'), 'online asset fetch MUST precede offline cache fallback');
assert.ok(worker.includes("url.pathname === '/deployment-version.json'"), 'version manifest must bypass SW');
const main = read('src/main.tsx');
assert.ok(main.includes("navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })"));
assert.ok(main.includes('registration.update()'), 'proactively update browser worker');
const vercel = JSON.parse(read('vercel.json'));
for (const route of ['/', '/index.html', '/enterprise-inventory']) {
 const header = vercel.headers.find(h => h.source === route)?.headers.find(h => h.key === 'Cache-Control');
 assert.match(header?.value || '', /no-store/, `${route} must be served as fresh HTML`);
}
assert.equal(vercel.buildCommand, 'npm run build');
console.log('FT195 PASS: TDZ fix kept, FE289/FT195 identity matches, asset fetch network-first and offline fallback retained, worker update enabled, HTML revalidation asserted.');
