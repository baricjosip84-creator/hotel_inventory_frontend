import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(process.env.BOM_PAGE_SOURCE || path.join(process.cwd(), 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const sf = ts.createSourceFile('InventoryCapabilitiesPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let checks = 0;
function check(desc, fn) { fn(); checks++; console.log(`PASS ${checks}: ${desc}`); }
check('whole Advanced Inventory TSX parses', () => assert.equal(sf.parseDiagnostics.length, 0));
const bom = sf.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === 'BomPanel');
check('real BOM panel found', () => assert(bom));
const declarations = new Map();
function visit(node) { if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) declarations.set(node.name.text, node); ts.forEachChild(node, visit); }
visit(bom);
for (const name of ['stockReadiness', 'readinessByLocation', 'execute', 'requestExecution']) check(`BOM declaration ${name} found`, () => assert(declarations.has(name)));
const readinessSrc = declarations.get('readinessByLocation').initializer.getText(sf);
const executeSrc = declarations.get('execute').initializer.getText(sf);
const requestSrc = declarations.get('requestExecution').initializer.getText(sf);
check('readiness stays hidden while old stock is being refreshed', () => assert.match(readinessSrc, /stockReadiness\.isFetching/));
check('execute success targets the BOM stock-readiness query', () => assert.match(executeSrc, /queryKey: \['inventory-bom-stock-readiness'\]/));
check('execute still invalidates product references', () => assert.match(executeSrc, /queryKey: \['inventory-capabilities-products'\]/));
check('confirmed execution captures the immutable BOM and location', () => assert.match(requestSrc, /bomId: bom\.id/));
check('confirmed execution captures the original direction', () => assert.match(requestSrc, /direction: direction === 'disassemble'/));
check('confirmed execution captures quantity as a number', () => assert.match(requestSrc, /quantity: Number\(executeQty\)/));
check('in-flight refreshed stock prevents another confirm', () => assert.match(requestSrc, /stockReadiness\.isFetching/));
check('success feedback reads executed direction, not current form', () => assert.match(executeSrc, /request\.direction === 'assemble'/));
check('the success message is still localized', () => assert.match(executeSrc, /ui\('Assembly'\).*ui\('Disassembly'\)/));
const buttonStart = source.indexOf('disabled={!canExecute || !bomsReady || !executeBomId || !executeLocationId');
check('execution button exists', () => assert(buttonStart > 0));
check('execution button disabled during stock revalidation', () => assert.match(source.slice(buttonStart, buttonStart + 260), /stockReadiness\.isFetching/));
check('checking message remains available for background refreshes', () => assert.match(source, /requestedExecutionQty > 0 && stockReadiness\.isFetching/));
check('last server is authoritative for stock-changing operations', () => assert.match(source, /The server will still enforce lot, serial, reservation and other inventory safeguards/));

const js = ts.transpileModule(`const execute = ${executeSrc};\nconst requestExecution = ${requestSrc};\nglobalThis.__callbacks = {execute, requestExecution};`, {
  fileName: 'bom-regression.ts', compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
function scenario({ direction = 'assemble', confirmed = true, reject = false } = {}) {
  const invalidations = [], requests = [], messages = [], errors = [], outstanding = [];
  let onMutation;
  const ctx = {
    selectedExecutionBom: { id: 'bom-1', product_name: 'Demo kit' }, locations: [{ id: 'store-1', name: 'Test storage' }],
    executeLocationId: 'store-1', executeQty: '1', direction, locale: 'en',
    stockReadiness: { isSuccess: true, isFetching: false }, selectedLocationReadiness: { blocked: false },
    qc: { invalidateQueries: ({queryKey}) => { invalidations.push(queryKey[0]); if (queryKey[0] === 'inventory-bom-stock-readiness') ctx.stockReadiness.isFetching = true; return Promise.resolve(); } },
    useMutation: (opt) => { onMutation = opt; return { mutate: (req) => {
      ctx.pending = Promise.resolve().then(() => onMutation.mutationFn(req)).then(value => onMutation.onSuccess(value, req), err => onMutation.onError(err, req));
    } }; },
    apiRequest: (url, options) => new Promise((resolve, rejectRequest) => { requests.push({url,options}); outstanding.push({resolve,rejectRequest}); }),
    setMessage: (v) => messages.push(v), setError: (v) => errors.push(v),
    ui: (s) => s, formatLocalizedNumber: String,
    window: { confirm: () => confirmed }, messageFrom: () => 'Operation failed'
  };
  vm.runInNewContext(js, ctx);
  return { ctx, invalidations, requests, messages, errors, outstanding };
}
{
  const s = scenario();
  s.ctx.__callbacks.requestExecution();
  await Promise.resolve(); // wait for mutationFn request to be sent
  check('assembly sends exactly one request', () => assert.equal(s.requests.length, 1));
  check('assembly targets confirmed BOM', () => assert.equal(s.requests[0].url, '/inventory-capabilities/boms/bom-1/execute'));
  check('assembly captures original stock location', () => assert.equal(JSON.parse(s.requests[0].options.body).storage_location_id, 'store-1'));
  check('assembly captures original direction', () => assert.equal(JSON.parse(s.requests[0].options.body).direction, 'assemble'));
  s.ctx.direction = 'disassemble'; // user changes visible controls while server is processing
  s.ctx.executeLocationId = 'store-2'; s.ctx.executeQty = '99';
  s.outstanding[0].resolve({ success: true });
  await s.ctx.pending;
  check('late assembly still reports assembly success', () => assert.match(s.messages.at(-1), /^Assembly completed/));
  check('success clears old error', () => assert.equal(s.errors.at(-1), null));
  check('successful assembly refreshes stock-readiness snapshot', () => assert(s.invalidations.includes('inventory-bom-stock-readiness')));
  check('successful assembly retains product-reference refresh', () => assert(s.invalidations.includes('inventory-capabilities-products')));
  check('stock refetch is marked pending immediately after success', () => assert.equal(s.ctx.stockReadiness.isFetching, true));
  s.ctx.__callbacks.requestExecution();
  check('second action does not confirm while stock is revalidating', () => assert.equal(s.requests.length, 1));
}
{
  const s = scenario({ direction: 'disassemble' });
  s.ctx.__callbacks.requestExecution(); await Promise.resolve();
  check('disassembly uses expected direction', () => assert.equal(JSON.parse(s.requests[0].options.body).direction, 'disassemble'));
  s.ctx.direction = 'assemble';
  s.outstanding[0].resolve({success:true}); await s.ctx.pending;
  check('late disassembly still reports disassembly success', () => assert.match(s.messages.at(-1), /^Disassembly completed/));
  check('disassembly also refreshes stock snapshot', () => assert(s.invalidations.includes('inventory-bom-stock-readiness')));
}
{
  const s = scenario();
  s.ctx.stockReadiness.isSuccess = false; // Failed optional precheck: the API remains authoritative.
  s.ctx.__callbacks.requestExecution();
  await Promise.resolve();
  check('failed optional stock precheck still permits authoritative server validation', () => assert.equal(s.requests.length, 1));
  s.outstanding[0].resolve({success:true});
  await s.ctx.pending;
}
{
  const s = scenario({confirmed:false});
  s.ctx.__callbacks.requestExecution(); await Promise.resolve();
  check('cancelled confirmation does not create a mutation', () => assert.equal(s.requests.length, 0));
  check('cancelled confirmation does not invalidate stock', () => assert.equal(s.invalidations.length, 0));
}
{
  const s = scenario({ reject:true });
  s.ctx.__callbacks.requestExecution(); await Promise.resolve();
  s.outstanding[0].rejectRequest(new Error('server declined'));
  await s.ctx.pending;
  check('failed execution never invalidates stock as a successful mutation', () => assert.equal(s.invalidations.length, 0));
  check('failed execution uses error feedback', () => assert.equal(s.errors.at(-1), 'Operation failed'));
}
console.log(`BOM post-execution stock freshness: ${checks}/${checks} PASS`);
