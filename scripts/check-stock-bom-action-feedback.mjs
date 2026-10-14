import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const stockFile = process.env.INVENTORY_STOCK_FEEDBACK_SOURCE || path.join(root,'src/pages/StockPage.tsx');
const bomFile = process.env.INVENTORY_BOM_FEEDBACK_SOURCE || path.join(root,'src/pages/InventoryCapabilitiesPage.tsx');
const apiFile = path.join(root,'src/lib/api.ts');
const stockSource=readFileSync(stockFile,'utf8');
const bomSource=readFileSync(bomFile,'utf8');
const apiSource=readFileSync(apiFile,'utf8');
let checks=0;
function check(name, fn) {fn(); checks++; console.log(`PASS ${checks}: ${name}`);}
function declarations(file, source, functionName) {
  const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  check(`${file} valid TSX syntax`,()=>assert.equal(sf.parseDiagnostics.length,0));
  let start=sf;
  if (functionName) {start=sf.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text===functionName); check(`found ${functionName}`,()=>assert(start));}
  const nodes=new Map();
  function visit(node) {if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name))nodes.set(node.name.text,node.initializer);ts.forEachChild(node,visit)}
  visit(start);
  return {nodes,sf};
}
const stock=declarations('StockPage.tsx',stockSource);
const bom=declarations('InventoryCapabilitiesPage.tsx',bomSource,'BomPanel');
check('shared API exposes page-owned feedback opt out',()=>assert.match(apiSource,/skipMutationFeedback\?: boolean/));
check('shared API dispatch honours suppression flag',()=>assert.match(apiSource,/!\(options as SafeMutationRequestInit\)\.skipMutationFeedback/));
function startMutation(node,sf,ctx) {
 const expression=node.getText(sf);
 const javascript=ts.transpileModule(`const chosen = ${expression}; globalThis.__mutation = chosen;`,{fileName:'execution.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 vm.runInNewContext(javascript,ctx);
 return ctx.__mutation;
}
function stockScenario() {
 const requests=[],feedback=[],errors=[],results=[];
 const ctx={selectedRow:{product_id:'p1',storage_location_id:'loc1'},countBaseVersion:7,currentQuantity:4,
  draft:{quantity:'2',change:'-1',reason:'audit',consumption_reason:'internal',department:'',event_name:'',notes:'',consumed_at:'',lot_number:'',batch_number:'',expiry_date:'',manufactured_at:'',serial_numbers:'',reservation_shortfall_acknowledged:false},
  apiRequest:async (url,options)=>{requests.push({url,options});return {stock:{previous_quantity:4,new_quantity:3,difference:-1,version:8}}},
  useMutation:opts=>opts,ui:s=>s,ApiError: class ApiError extends Error {},parseSerialNumbers:()=>[],queryClient:{invalidateQueries:async()=>{}},
  invalidateStockOperationalQueries:async()=>{},setOperationError:s=>errors.push(s),setOperationFeedback:s=>feedback.push(s),
  setLastResult:s=>results.push(s),setDraft:()=>{},setCountBaseVersion:()=>{},getDefaultDraft:()=>({})};
 return {ctx,requests,feedback,errors,results};
}
for (const [name,url,successMessage] of [
 ['consumeMutation','/stock/consume','Stock consumed successfully.'],
 ['countMutation','/stock/count','Stock count applied successfully.'],
 ['adjustMutation','/stock/adjust','Stock adjustment applied successfully.']
]) {
 check(`${name} handler still exists`,()=>assert(stock.nodes.has(name)));
 const test=stockScenario();const mutation=startMutation(stock.nodes.get(name),stock.sf,test.ctx);
 await mutation.mutationFn();
 check(`${name} still sends the original stock endpoint and POST`,()=>{
  assert.equal(test.requests.length,1);assert.equal(test.requests[0].url,url);assert.equal(test.requests[0].options.method,'POST');
 });
 check(`${name} disables misleading generic toast`,()=>assert.equal(test.requests[0].options.skipMutationFeedback,true));
 check(`${name} preserves stock and location identity`,()=>{
  const req=JSON.parse(test.requests[0].options.body);
  assert.equal(req.product_id,'p1');assert.equal(req.storage_location_id,'loc1');
 });
 await mutation.onSuccess({stock:{previous_quantity:4,new_quantity:3,difference:-1,version:8}});
 check(`${name} retains inline action-specific success`,()=>assert.equal(test.feedback.at(-1),successMessage));
 check(`${name} retains last-operation receipt`,()=>assert.equal(test.results.length,1));
 await mutation.onError(vm.runInNewContext('new Error("operation refused")',test.ctx));
 check(`${name} retains inline error handling`,()=>assert.equal(test.errors.at(-1),'operation refused'));
}
function bomScenario(){
 const requests=[],messages=[],errors=[],invalidations=[];
 const ctx={outputProductId:'kit',name:'Audit BOM',outputQty:'1',selectedComponents:[{product_id:'component',quantity:'1',waste_percent:'0'}],
  ui:s=>s,qc:{invalidateQueries:({queryKey})=>{invalidations.push(queryKey.join('/'));return Promise.resolve()}},
  setMessage:s=>messages.push(s),setError:s=>errors.push(s),messageFrom:()=> 'Operation refused',
  apiRequest:async(url,options)=>{requests.push({url,options});return {ok:true}},useMutation:opts=>opts};
 return {ctx,requests,messages,errors,invalidations};
}
check('BOM create handler exists',()=>assert(bom.nodes.has('create')));
const created=bomScenario();const create=startMutation(bom.nodes.get('create'),bom.sf,created.ctx);
await create.mutationFn();
check('BOM create still submits the definition',()=>{
 const req=created.requests.at(-1);assert.equal(req.url,'/inventory-capabilities/boms');
 assert.equal(req.options.method,'POST');const body=JSON.parse(req.options.body);assert.equal(body.product_id,'kit');assert.equal(body.components[0].product_id,'component');
});
check('BOM create disables generic Item created toast',()=>assert.equal(created.requests[0].options.skipMutationFeedback,true));
await create.onSuccess();
check('BOM create keeps inline localized result',()=>assert.equal(created.messages.at(-1),'BOM created successfully.'));
check('BOM create keeps list refresh',()=>assert(created.invalidations.includes('inventory-boms')));
create.onError(new Error('error'));
check('BOM create retains page error feedback',()=>assert.equal(created.errors.at(-1),'Operation refused'));
check('BOM execute handler exists',()=>assert(bom.nodes.has('execute')));
const executed=bomScenario();const execute=startMutation(bom.nodes.get('execute'),bom.sf,executed.ctx);
await execute.mutationFn({bomId:'bom-id',direction:'disassemble',locationId:'loc1',quantity:2});
check('BOM execute preserves stock-changing request',()=>{
 const req=executed.requests.at(-1);assert.equal(req.url,'/inventory-capabilities/boms/bom-id/execute');
 const body=JSON.parse(req.options.body);assert.equal(body.direction,'disassemble');assert.equal(body.storage_location_id,'loc1');assert.equal(body.output_quantity,2);
 assert.equal(body.reservation_shortfall_acknowledged,false);
});
check('BOM execute disables generic Item created toast',()=>assert.equal(executed.requests[0].options.skipMutationFeedback,true));
execute.onSuccess({}, {direction:'disassemble'});
check('BOM execute retains its action-specific result',()=>assert.equal(executed.messages.at(-1),'Disassembly completed and stock movements recorded.'));
check('BOM execute retains stock readiness refresh',()=>assert(executed.invalidations.includes('inventory-bom-stock-readiness')));
execute.onError(new Error('error'));
check('BOM execute retains page error feedback',()=>assert.equal(executed.errors.at(-1),'Operation refused'));
console.log(`Stock/BOM action-specific feedback: ${checks}/${checks} PASS`);
