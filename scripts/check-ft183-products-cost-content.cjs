/* FT183: non-destructive Products/Cost Controls content verification.
 * Confirms operator-focused panels and existing exports are reachable, while
 * derivative closeout layers remain in source but are not rendered by default. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const productDir = path.join(root,'src/pages/products');
const elements = (tag, props) => ({tag, props:props||{}});
const component = name => Object.assign(function renderStub(){}, {displayName:name});
const stubs = {
  ProductCostGovernanceReviewPanel: component('ProductCostGovernanceReviewPanel'),
  ProductCostGovernanceDetailsPanel: component('ProductCostGovernanceDetailsPanel'),
  ProductCostOperationsSummaryPanel: component('ProductCostOperationsSummaryPanel'),
  ProductCostGovernanceHandoffPanel: component('ProductCostGovernanceHandoffPanel'),
  ProductCostGovernanceFinalizationPanel: component('ProductCostGovernanceFinalizationPanel'),
  ProductCostGovernanceAuditSignoffPanel: component('ProductCostGovernanceAuditSignoffPanel'),
  StatCard: component('StatCard'),
  StatusBadge: component('StatusBadge')
};
function prepare(componentName, filename) {
  const src = fs.readFileSync(path.join(productDir,filename),'utf8');
  const ast = ts.createSourceFile(filename,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length,0,`${filename} parses as TSX`);
  const out = ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
  const exports = {};
  const req = id => {
    if (id === 'react/jsx-runtime') return {jsx:elements,jsxs:elements,Fragment:'Fragment'};
    if (id.includes('productFormatting')) return {formatPercent:()=> '55%',formatMoney:()=> '€50',formatStatusLabel:x => String(x).replaceAll('_',' '),toNumber:x => Number(x||0)};
    if (id.includes('productStyles')) return {styles:new Proxy({}, {get:()=>({})})};
    if (id.includes('productSummaryComponents')) return {StatCard:stubs.StatCard,StatusBadge:stubs.StatusBadge};
    if (id.includes('I18nContext')) return {useAppTranslation:()=>({ui:x=>x,locale:'en'})};
    for (const [name,fn] of Object.entries(stubs)) if (id.endsWith('/'+name)||id === './'+name) return {[name]:fn};
    throw new Error(`Unexpected dependency: ${id}`);
  };
  vm.runInNewContext(out,{exports,require:req,console},{filename,timeout:4000});
  assert.equal(typeof exports[componentName],'function');
  return exports[componentName];
}
function visit(tree,callback) {
  if (Array.isArray(tree)) {tree.forEach(x=>visit(x,callback));return;}
  if (tree === null||tree===undefined||typeof tree !== 'object') {callback(tree);return;}
  if (!('tag' in tree)) return;
  callback(tree);
  visit(tree.props?.children,callback);
}
function texts(tree) {const values=[];visit(tree,x=>{if(typeof x==='string')values.push(x);});return values.join(' | ');}
function names(tree){const values=[];visit(tree,x=>{if(x&&typeof x==='object'&&x.tag?.displayName) values.push(x.tag.displayName);});return values;}
const q={isLoading:false,isError:false,refetch:()=>{}};
const summaryProps=new Proxy({costGovernanceQuery:q,costGovernanceSummary:{readiness_score:55,totals:{},checklist:[],next_actions:[]},
  costGovernanceReviewPack:{review_export_rows:[{}]},costGovernanceClosureSummary:{archive_rows:[{}]},costGovernanceHandoffSummary:{handoff_rows:[{}]},
  handleExportCostGovernanceReviewPackCsv:()=>{},handleExportCostGovernanceClosureCsv:()=>{},handleExportCostGovernanceHandoffCsv:()=>{}},
  {get:(obj,key)=>key in obj ? obj[key] : q});
const summary=prepare('ProductCostGovernanceSummaryPanel','ProductCostGovernanceSummaryPanel.tsx')(summaryProps);
const rendered=names(summary);
for (const expected of ['ProductCostGovernanceReviewPanel','ProductCostGovernanceDetailsPanel'])
  assert.ok(rendered.includes(expected),`${expected} must remain visible`);
for (const suppressed of ['ProductCostOperationsSummaryPanel','ProductCostGovernanceHandoffPanel','ProductCostGovernanceFinalizationPanel'])
  assert.ok(!rendered.includes(suppressed),`${suppressed} must be suppressed in operator view`);
for (const button of ['Export Review Pack CSV','Export Closure CSV','Export Handoff CSV'])
  assert.ok(texts(summary).includes(button),`Missing retained export ${button}`);
const reviewItems=Array.from({length:12},(_,i)=>({key:String(i),queue_type:'remediation',label: i%2===0?'governance_checklist':'governance_next_action', detail:'Action '+i,priority:'medium',owner_hint:'operations',evidence:'governance_checklist'}));
const review=prepare('ProductCostGovernanceReviewPanel','ProductCostGovernanceReviewPanel.tsx')({
  costGovernanceAuditQuery:q,costGovernanceSignoffQuery:q,costGovernanceReviewQueueQuery:q,costGovernanceReviewPackQuery:q,costGovernanceClosureQuery:q,
  costGovernanceReviewQueue:{review_status:'review',totals:{queue_items:12,blockers:1,warnings:3,priority_products:5},queue_items:reviewItems,reviewer_guidance:[]}
});
const visibleText=texts(review);
for (let i=0;i<12;i++)assert.ok(visibleText.includes(`Action ${i}`),`Queue item ${i} hidden`);
assert.ok(visibleText.includes('Governance checklist'),'Technical key must be localized');
assert.ok(!visibleText.includes('governance_checklist'),'Raw technical key must not be shown');
assert.ok(!visibleText.includes('Governance closure summary'),'Duplicated closeout not shown');
assert.ok(!visibleText.includes('Governance review pack'),'Duplicated pack not shown');
assert.ok(names(review).includes('ProductCostGovernanceAuditSignoffPanel'),'Audit/signoff remains');
for(const [file, flag] of [
  ['ProductCostGovernanceSummaryPanel.tsx','SHOW_LEGACY_DERIVED_STATUS_LAYERS'],
  ['ProductCostGovernanceReviewPanel.tsx','SHOW_LEGACY_CLOSEOUT_CARDS']
]) {
  const src=fs.readFileSync(path.join(productDir,file),'utf8');
  assert.match(src,new RegExp(`const ${flag} = false`),`Disabled legacy toggle missing in ${file}`);
  assert.match(src,/FT183:/,'Reversible code comments must explain hidden blocks');
}
console.log('FT183 Cost Controls: 2 real TSX renders PASS; 12/12 queue entries visible; labels humanized; 3 exports available; 5 redundant panels suppressed with source retained.');
