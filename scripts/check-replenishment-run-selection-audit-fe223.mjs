import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(root,'src/pages/ReplenishmentPlanningPage.tsx'),'utf8');
const helper = fs.readFileSync(path.join(root,'src/pages/replenishmentRunSelection.ts'),'utf8');
const translation = fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
let checks=0;
function ok(predicate,message) { assert.ok(predicate,message); checks++; }
function equal(actual, expected, message){ assert.deepEqual(actual,expected,message); checks++; }
const transpiled = ts.transpileModule(helper, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const module = {exports:{}};
new Function('module','exports', 'URLSearchParams', transpiled.outputText)(module,module.exports,URLSearchParams);
const {resolveReplenishmentRunSelection:resolve,withReplenishmentRunSelection:apply}=module.exports;
equal(resolve('',undefined),{runId:'',unavailable:false},'Loading state cannot manufacture a run');
equal(resolve('missing',undefined),{runId:'',unavailable:false},'Loading a deep link remains pending');
equal(resolve('',[]),{runId:'',unavailable:false},'Empty result');
equal(resolve('', ['runA','runB']),{runId:'runA',unavailable:false},'Default selects first available only if no deep link');
equal(resolve('runB',['runA','runB']),{runId:'runB',unavailable:false},'Selected exact run');
equal(resolve(' runB ',['runA','runB']),{runId:'runB',unavailable:false},'Whitespace trimmed');
equal(resolve('missing',['runA','runB']),{runId:'',unavailable:true},'Missing direct link never opens another run');
equal(resolve('missing',[]),{runId:'',unavailable:true},'Empty filtered list never opens another run');
const fromCDO = new URLSearchParams('source_par_level_id=source&source_optimization_plan_id=plan&source_optimization_item_id=item&other=retain');
const chosen = apply(fromCDO,'runB');
equal(chosen.get('run_id'),'runB','Selected run encoded');
equal(chosen.get('source_par_level_id'),'source','Origin location preserved');
equal(chosen.get('source_optimization_plan_id'),'plan','Origin plan preserved');
equal(chosen.get('source_optimization_item_id'),'item','Origin item preserved');
equal(chosen.get('other'),'retain','Other parameters preserved');
ok(!fromCDO.has('run_id'),'Query input not mutated');
equal(apply(chosen,'').has('run_id'),false,'Clearing a run removes exact selection');
equal(resolve(apply(chosen,'').get('run_id') || '', ['runA','runB']).runId,'runA','Clear explicitly reverts to default');
ok(page.includes('resolveReplenishmentRunSelection(requestedRunId, runsQuery.data?.map((run) => run.id))'),'UI binds exact run resolver');
ok(page.includes('queryKey: [\'location-replenishment-run\', effectiveRunId]'),'Detail fetch uses resolved run');
ok(page.includes('enabled: Boolean(effectiveRunId)'),'No detail fetch for unavailable run');
ok(page.includes('unavailableRequestedRun ?'),'Missing run shown as warning');
ok(page.includes('setSearchParams(withReplenishmentRunSelection(searchParams, nextRunId))'),'Run switching modifies URL history');
ok(page.includes('setConfirmation(null);\n  }, [effectiveRunId]);'),'History run switch clears stale form state');
ok(page.includes('setSearchParams(withReplenishmentRunSelection(next, data.run.id))'),'Created run becomes URL selection');
ok(page.includes("next.delete('source_par_level_id')"),'New run clears stale source scope');
ok(!page.includes('setSelectedRunId('),'No hidden local-only run selection');
ok(page.includes("onClick={() => changeRun('')}"),'Missing run has recovery');
for(const message of ['The selected planning run is not available in this view.','It may have been removed or does not match the originating product and location. No other run has been opened in its place.','Choose an available run']){
 ok(translation.includes('['+JSON.stringify(message)), 'Translation for '+message);
}
for(const f of ['ReplenishmentPlanningPage.tsx','replenishmentRunSelection.ts','../i18n/tenantUiTranslations.ts']) {
 const abs=path.resolve(root,'src/pages',f),src=fs.readFileSync(abs,'utf8');
 const result=ts.transpileModule(src,{fileName:abs,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
 equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,`TS parse ${f}`);
}
console.log(`PASS ${checks}/${checks}: FE223 exact replenishment run selection and CDO handoff`);
