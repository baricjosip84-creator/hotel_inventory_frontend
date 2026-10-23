import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(process.env.BATCH120_PAGE_PATH || path.join(root, 'src/pages/ProcurementRecommendationsPage.tsx'), 'utf8');
const locale = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const sf = ts.createSourceFile('ProcurementRecommendationsPage.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let count = 0;
const check = (yes, explanation) => { assert.ok(yes, explanation); count++; };
const has = (fragment, explanation) => check(page.includes(fragment), explanation);
check(sf.parseDiagnostics.length === 0, 'Procurement page must parse as TypeScript TSX');
has('const [poDraftRefreshFeedback, setPoDraftRefreshFeedback] = useState<', 'Local explicit feedback state exists');
has('tone: "success" | "error"; message: string', 'Feedback tone distinguishes error and success');
has('if (!canViewGeneratedPurchaseOrderDrafts || poDraftReviewQuery.isFetching) return;', 'Read permission and duplicate request gate retained');
has('setPoDraftRefreshFeedback(null);', 'Previous manual feedback cleared on new request');
has('const result = await poDraftReviewQuery.refetch();', 'Manual refresh awaits the existing query refetch');
has('if (result.isError)', 'React Query resolved error result is handled');
has('tone: "error"', 'Error feedback is explicit');
has('tone: "success"', 'Successful manual result is explicit');
has('ui("Refresh failed: {error}")', 'Failure uses the existing translated error template');
has('getErrorMessage(result.error, ui)', 'Failed fetch reports actual request error');
has('getErrorMessage(error, ui)', 'Rejected promise reports actual request error');
has('ui("Purchase order drafts refreshed.")', 'Successful outcome is action specific');
has('disabled={!canViewGeneratedPurchaseOrderDrafts || poDraftReviewQuery.isFetching}', 'Refresh is disabled during load and without permission');
has('onClick={() => void refreshPoDraftReview()}', 'Refresh UI points to the new handler');
has('poDraftReviewQuery.isFetching ? ui("Refreshing…") : ui("Refresh drafts")', 'Loading label reuses multilingual vocabulary');
has('role={poDraftRefreshFeedback.tone === "error" ? "alert" : "status"}', 'Manual outcome has accessible live status');
has('poDraftRefreshFeedback.message', 'Manual feedback is rendered beside draft controls');
has('poDraftReviewQuery.isError && poDraftRefreshFeedback?.tone !== "error"', 'Failure is not displayed twice in the manual-refresh path');
has('enabled: canViewGeneratedPurchaseOrderDrafts', 'Existing read permission query gate retained');
has('queryKey: ["procurement-recommendation-po-draft-review", poDraftOffset, poDraftLimit]', 'Original query key includes offset/limit');
has('queryFn: () => fetchRecommendationPoDraftReview(poDraftOffset, poDraftLimit)', 'Original API contract and pagination unchanged');
has('mutationFn: fetchAllRecommendationPoDraftReview', 'Draft CSV export still uses original API');
has('onSuccess: exportPoDraftReviewCsv', 'Draft CSV export callback preserved');
has('ui("Export draft CSV")', 'Draft export UI preserved');
check(!page.includes('onClick={() => void poDraftReviewQuery.refetch()}'), 'Silent refresh is no longer wired directly to button');
for (const phrase of ['Purchase order drafts refreshed.', 'Refresh failed: {error}', 'Refreshing…', 'Refresh drafts']) {
  check(locale.includes('["' + phrase + '",'), 'Five-language catalog includes ' + phrase);
}
check((locale.match(/\["Purchase order drafts refreshed\."/g) || []).length === 1, 'New action message translation row is unique');
check(pkg.scripts['check:batch120-procurement-draft-refresh-feedback'] === 'node scripts/check-batch120-procurement-draft-refresh-feedback.mjs', 'Batch120 executable test registered');

let handler = null;
function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'refreshPoDraftReview') handler = node; ts.forEachChild(node, visit); }
visit(sf);
check(Boolean(handler), 'Manual refresh handler exists as a standalone inspectable function');
const js = ts.transpileModule(`${handler.getText(sf)}\n globalThis.testRefresh = refreshPoDraftReview;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true });
check(js.diagnostics?.length === 0, 'Refresh handler transpiles without TypeScript diagnostics');
async function simulate({canView=true,isFetching=false,result=null,throws=null}={}) {
  const updates=[];
  let calls=0;
  const context={
    canViewGeneratedPurchaseOrderDrafts:canView,
    poDraftReviewQuery:{isFetching,refetch:async()=>{calls++; if(throws)throw throws; return result ?? {isError:false};}},
    setPoDraftRefreshFeedback:(value)=>updates.push(value),
    ui:(text)=>text,
    getErrorMessage:(error)=>error instanceof Error ? error.message : String(error),
  };
  vm.runInNewContext(js.outputText, context);
  await context.testRefresh();
  return {updates,calls};
}
const ok=await simulate();
check(ok.calls===1,'Success issues precisely one refetch');
check(ok.updates.length===2 && ok.updates[0]===null,'Success resets stale feedback');
check(ok.updates[1].tone==='success' && ok.updates[1].message==='Purchase order drafts refreshed.','Successful query returns correct status');
const failed=await simulate({result:{isError:true,error:new Error('network timeout')}});
check(failed.calls===1,'Resolved query failure still calls refetch only once');
check(failed.updates.length===2 && failed.updates[1].tone==='error','Resolved query failure never shows success');
check(failed.updates[1].message.includes('network timeout'),'Resolved query failure retains useful reason');
const rejected=await simulate({throws:new Error('network offline')});
check(rejected.calls===1 && rejected.updates.length===2 && rejected.updates[1].tone==='error','Promise rejection is caught and reported');
check(rejected.updates[1].message.includes('network offline'),'Rejected promise error contains real reason');
const denied=await simulate({canView:false});
check(denied.calls===0 && denied.updates.length===0,'No access cannot start refresh or alter feedback');
const concurrent=await simulate({isFetching:true});
check(concurrent.calls===0 && concurrent.updates.length===0,'Concurrent refresh is blocked');
console.log(`PASS Batch120 procurement draft refresh feedback: ${count}/${count} assertions`);
