import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiText=fs.readFileSync(process.env.FE207_BASELINE_API || path.join(root,'src/lib/api.ts'),'utf8');
const pageText=fs.readFileSync(process.env.FE207_BASELINE_PAGE || path.join(root,'src/pages/ProcurementRecommendationsPage.tsx'),'utf8');
const translationText=fs.readFileSync(process.env.FE207_BASELINE_TRANSLATIONS || path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const api=ts.createSourceFile('api.ts',apiText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const page=ts.createSourceFile('page.tsx',pageText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const catalog=ts.createSourceFile('translations.ts',translationText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
let checks=0;
const check=(value,label)=>{assert.ok(value,label); checks++};
check(!api.parseDiagnostics.length,'Shared API TS parses');
check(!page.parseDiagnostics.length,'Procurement page TSX parses');
check(!catalog.parseDiagnostics.length,'Translation TS parses');
function functionNode(sf,name){
  const node=sf.statements.find(x=>ts.isFunctionDeclaration(x)&&x.name?.text===name);
  assert.ok(node,`Missing function ${name}`);return node;
}
function loadFns(sf,names,context={}){
  const code=names.map(name=>functionNode(sf,name).getText(sf)).join('\n');
  const js=ts.transpileModule(code+'\n({'+names.join(',')+'});',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  return vm.runInNewContext(js,context);
}
const {tenantMutationSuccessMessage}=loadFns(api,['readMutationStringField','isProductPackageMutationPath','tenantMutationActionLabel','tenantMutationSuccessMessage'],{
  // Unrelated branches must remain unreachable for the recommendation route.
});
const target='/reorder-insights/recommendations/5910b2f0-9fdd-42f3-8888-567c45f60a22/decision?lookback_days=30';
for(const [status,expected] of Object.entries({
  approved:'Recommendation approved successfully.',
  rejected:'Recommendation rejected successfully.',
  deferred:'Recommendation deferred successfully.'
})){
  check(tenantMutationSuccessMessage(target,'POST',JSON.stringify({status}))===expected,`Decision ${status} reports its actual state`);
}
check(tenantMutationSuccessMessage(target,'POST','not-json')==='Recommendation decision saved successfully.','Existing unknown-decision fallback remains unchanged');
check(tenantMutationSuccessMessage(target,'POST',JSON.stringify({status:'approved'}))==='Recommendation approved successfully.','Single recommendation decision keeps its existing action-specific toast');
check(tenantMutationSuccessMessage('/reorder-insights/recommendations/bulk-decision?lookback_days=30','POST',JSON.stringify({status:'approved'}))!=='Recommendation approved successfully.','Bulk operation must not promise all records approved');
check(tenantMutationSuccessMessage('/reorder-insights/recommendations/abc/decision/extra','POST',JSON.stringify({status:'approved'}))!=='Recommendation approved successfully.','Only exact single-decision endpoint gets specific toast');
const captured=[];
const {decideRecommendationsBulk,convertRecommendationsToPoDrafts}=loadFns(page,['decideRecommendationsBulk','convertRecommendationsToPoDrafts'],{
  apiRequest:(url,options)=>{captured.push({url,options});return Promise.resolve({});},
  buildRecommendationActionQuery:()=>'lookback_days=30',
});
const filters={lookbackDays:30};
await decideRecommendationsBulk(['p1'],filters,'approved','note');
await convertRecommendationsToPoDrafts(['p1'],filters);
check(captured.length===2,'Both bulk mutations still send requests');
check(captured.every(x=>x.options.method==='POST'),'Both bulk operations preserve POST');
check(captured.every(x=>x.options.skipMutationFeedback===true),'Inline-confirmed bulk and conversion actions suppress misleading generic toasts');
check(captured[0].url.includes('/bulk-decision?') && JSON.parse(captured[0].options.body).status==='approved','Bulk mutation preserves approval body and route');
check(captured[1].url.includes('/convert-to-po-drafts?')&&JSON.parse(captured[1].options.body).product_ids[0]==='p1','Conversion preserves selected product and route');
check(pageText.includes('poDraftConversionMutation.data.purchase_orders.map('),'PO conversion still renders exact created order list inline');
check(pageText.includes('Bulk decision complete: {decided} decided, {blocked} blocked, {failed} failed.'),'Bulk mutation retains partial-result inline feedback');
check(pageText.includes('getErrorMessage(poDraftConversionMutation.error, ui)') && pageText.includes('getErrorMessage(bulkDecisionMutation.error, ui)'),'Both mutations retain inline error feedback');
check(pageText.includes('label={ui("Approval checks met")}') && !pageText.includes('label={ui("Ready to approve")}'),'Approval readiness counter no longer implies a new pending decision');
check(pageText.includes('isRecommendationRowApprovalReady(row) &&') && pageText.includes('row.decision_status === "approved"'),'PO draft eligibility still requires actual approval');
check(pageText.includes('Approval checks can include already-approved recommendations. PO draft eligibility is counted separately.'),'Selection counter explanation is visible');
for(const key of [
  'Recommendation approved successfully.', 'Recommendation rejected successfully.',
  'Recommendation deferred successfully.', 'Recommendation decision saved successfully.',
  'Approval checks met', 'Approval checks can include already-approved recommendations. PO draft eligibility is counted separately.'
]){
  const matching=[];
  for(const statement of catalog.statements){
    function walk(n){
      if(ts.isArrayLiteralExpression(n) && n.elements.length===5 && n.elements[0] && ts.isStringLiteral(n.elements[0]) && n.elements[0].text===key) matching.push(n);
      ts.forEachChild(n,walk);
    }
    walk(statement);
  }
  check(matching.length===1,`Exactly one translation catalog key: ${key}`);
  check(matching[0].elements.every(x=>ts.isStringLiteral(x)&&x.text.trim().length>0),`Five nonempty translations: ${key}`);
}
console.log(`FE207 procurement decision feedback and approval criteria: ${checks}/${checks} PASS`);
