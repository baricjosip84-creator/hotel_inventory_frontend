/* FT196: Execute as npm prebuild on every Vercel build.
 * Known FE286 crash: an eager declaration read createReturnMutation before
 * its useMutation hook had initialized. Run actual TSX mount coverage plus
 * assert the mutation hook precedes derived render-time state. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root,'src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx'), 'utf8');
const hook = 'const createReturnMutation = useMutation({';
const state = 'const lineQuantityState = getSupplierReturnLineQuantityState(';
assert.ok(src.includes(hook) && src.includes(state), 'Missing original Supplier Returns mutation or quantity check');
assert.equal(src.split(hook).length-1,1,'Mutation hook must be declared once');
assert.ok(src.indexOf(hook) < src.indexOf(state), 'FT196: initialize mutation before quantity/control bindings');
assert.ok(!src.includes('const addReturnLineDisabled'), 'Reintroduces FE286 early-use bug');
const info = JSON.parse(fs.readFileSync(path.join(root, 'public/deployment-version.json')));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
assert.match(info.frontend, /^FE\d+$/);
assert.ok(Number(info.frontend.slice(2)) >= 290, 'Supplier Returns guard requires FE290 or newer');
assert.match(info.audit_round, /^FT\d+$/);
assert.ok(Number(info.audit_round.slice(2)) >= 196, 'Supplier Returns guard requires FT196 or newer');
assert.equal(pkg.inventorySourceIdentity.frontend, info.frontend);
assert.equal(pkg.inventorySourceIdentity.audit_round, info.audit_round);
console.log(`FT196 version gate: ${info.frontend}/${info.audit_round} (forward-compatible, source identities matched)`);
require('./check-ft194-supplier-returns-mount.cjs');
console.log('FT196 PASS: Vercel prebuild verified early mutation initialization + source runtime mount + cumulative release identity');
