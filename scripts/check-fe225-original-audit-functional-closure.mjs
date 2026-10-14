import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
const read = (p) => fs.readFileSync(new URL('../'+p, import.meta.url), 'utf8');
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const eq = (got, expected, label) => { assert.deepEqual(got, expected, label); checks++; };
const composer = read('src/pages/WorkflowAutomationComposerPage.tsx');
const extract = composer.match(/function responsibilityAlreadyAssigned\(blueprint: WorkflowBlueprint\): boolean \{[\s\S]*?\n\}/);
ok(extract, 'workflow assignment resolver exists');
const js = ts.transpileModule(extract[0]+'\nthis.resolve = responsibilityAlreadyAssigned;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const env = vm.createContext({}); vm.runInContext(js, env);
for (const [r, expected] of [
  [{ assignment_state:'pending' },false],
  [{ assignment_state:'offered' },false],
  [{ assignment_state:'unknown' },false],
  [{ assignment_state:'unassigned', responsible_role:'warehouse' },false],
  [{ assignment_state:'assigned' },true],
  [{ assignment_state:'claimed' },true],
  [{ assignment_state:'accepted' },true],
  [{ assignee_name:'Alex' },true],
  [{ responsible_role:'manager' },true],
  [{ assignment_state:'unassigned' },false]
]) eq(env.resolve({responsibility:r}), expected, 'only proven ownership suppresses assign-owner step: '+JSON.stringify(r));
const run = read('src/pages/ReplenishmentPlanningPage.tsx');
const from = run.indexOf('onSuccess: async (data) => {',run.indexOf('const createMutation'));
const until = run.indexOf('onError:',from);
const onSuccess = run.slice(from,until);
for(const phrase of ["cancelQueries({ queryKey: ['location-replenishment-runs', 'all'], exact: true })", "setQueryData<PlanningRunListItem[]>(['location-replenishment-runs', 'all']", "(previous ?? []).filter((run) => run.id !== data.run.id)", "setSearchParams(withReplenishmentRunSelection(next, data.run.id))", "queryClient.setQueryData(['location-replenishment-run', data.run.id], data)"]) ok(onSuccess.includes(phrase),'new planning run inserted before route navigation: '+phrase);
ok(onSuccess.indexOf("setQueryData<PlanningRunListItem[]>") < onSuccess.indexOf("setSearchParams(withReplenishmentRunSelection"), 'seed before navigating to new run');
const stockSource = read('src/pages/inventoryUsage/inventoryUsageSafeQuantity.ts');
const stock = ts.transpileModule(stockSource, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exports = {};vm.runInNewContext(stock,{exports});
const safe = exports.safeInventoryUsageStockQuantity;
for (const [value,expected] of [[0,0],['0',0],[42.5,42.5],['-2',-2],['',null],['   ',null],[null,null],[undefined,null],['NaN',null],['Infinity',null],[Infinity,null],[Number.NaN,null],['not a quantity',null]]) eq(safe(value),expected,'quantity fallback '+String(value));
const usage = read('src/pages/InventoryUsagePage.tsx');
for(const prop of ['restored_quantity','previous_quantity','new_quantity']) ok(usage.includes(`safeInventoryUsageStockQuantity(data.stock?.${prop})`),'usage stock summary rejects invalid '+prop);
const workflow = read('.github/workflows/deployment-readiness.yml');
ok(workflow.includes("EXPECTED_FRONTEND_COMMIT: ${{ github.event_name == 'workflow_run' && github.event.workflow_run.head_sha || github.sha }}"),'manual and workflow-triggered deployment SHA accounted for');
console.log(`FE225 original audit functional closure: ${checks}/${checks} PASS`);
