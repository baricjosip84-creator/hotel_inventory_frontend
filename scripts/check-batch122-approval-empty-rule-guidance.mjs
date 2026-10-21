import { readFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const source = readFileSync(path.join(root,'src/components/enterpriseInventory/tabs/ApprovalsTab.tsx'),'utf8');
const catalog = readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const phrase = 'Create an approval rule above, then submit a matching record to add it to this queue.';
let count=0;
const test=(name,fn)=>{fn(); console.log('PASS',name);count++;};
test('approval workspace has separate inventory-requisition workflow',()=>assert.match(source,/Inventory requisitions use their own approval workflow/));
test('empty other-approvals message persists',()=>assert.match(source,/No other approval requests are waiting\./));
test('queue guidance belongs to empty branch',()=>{assert(source.includes('approvalQueue.length ? <div')); assert(source.includes("</div> : <div>\n            <p style={styles.helper}>{ui('No other approval requests are waiting.')}")); assert(source.indexOf('Create an approval rule above, then submit')>source.indexOf('</div> : <div>'));});
test('guidance is translatable',()=>assert(source.includes(`ui('${phrase}')`)));
const actual=source.match(/\{(!approvalRulesQuery\.isLoading\s*&&\s*approvalRulesQuery\.data\?\.length\s*===\s*0\s*&&\s*canWriteApprovalRules)\s*\?/);
test('guidance has strict loaded-empty and permission gating',()=>assert(actual));
const gate=Function('approvalRulesQuery','canWriteApprovalRules',`return ${actual?.[1]}`);
const cases=[
 ['no rules and permission -> guidance', {isLoading:false,data:[]},true,true],
 ['no rules and read only -> no guidance',{isLoading:false,data:[]},false,false],
 ['rules exist -> no guidance',{isLoading:false,data:[{id:'a'}]},true,false],
 ['loading -> no guidance',{isLoading:true,data:[]},true,false],
 ['not fetched -> no guidance',{isLoading:false,data:undefined},true,false],
 ['failed fetch -> no guidance',{isLoading:false,isError:true},true,false],
 ['no rules, read only -> no guidance',{isLoading:false,isError:false,data:[]},false,false]
];
for(const [name,query,permission,expected] of cases) test(name,()=>assert.equal(Boolean(gate(query,permission)),expected));
for(const [file,body,kind] of [
 ['ApprovalsTab.tsx',source,ts.ScriptKind.TSX],['tenantUiTranslations.ts',catalog,ts.ScriptKind.TS]
]){
 test(`${file} parse diagnostics empty`,()=>{
  const sf=ts.createSourceFile(file,body,ts.ScriptTarget.Latest,true,kind);assert.equal(sf.parseDiagnostics.length,0,JSON.stringify(sf.parseDiagnostics));
 });
 test(`${file} transpiles`,()=>{
  const r=ts.transpileModule(body,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}});
  assert.equal((r.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
 });
}
const row = catalog.split('\n').find(s=>s.includes(`['${phrase}'`)||s.includes(`["${phrase}"`));
test('single translation row exists',()=>assert.equal(catalog.split('\n').filter(s=>s.includes(`["${phrase}"`)).length,1));
test('five independent locale values filled',()=>{
 const arr=JSON.parse(row.trim().replace(/,$/,'')); assert.equal(arr.length,5); assert(arr.every(x=>x.length>30)); assert.equal(new Set(arr).size,5);
});
test('existing approval mutation untouched',()=>assert.match(source,/executeApprovalMutation\.mutate\(\{ entity_type: item\.entity_type, entity_id: item\.entity_id, action/));
test('rule-create button remains guarded',()=>assert.match(source,/disabled=\{!canSaveRule\}/));
test('inventory requisitions query retains permission and paging',()=>assert.match(source,/enabled: canReviewInventoryRequisitions,[\s\S]*?REQUISITION_APPROVAL_PAGE_SIZE \+ 1/));
console.log(`Batch122 approval empty-state guidance: ${count}/${count} PASS`);
