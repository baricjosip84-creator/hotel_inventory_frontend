import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(root,'src/pages/OperationalActionCenterPage.tsx'),'utf8');
const catalog = fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const css = fs.readFileSync(path.join(root,'src/pages/OperationalExperiencePages.css'),'utf8');
let tests = 0;
for (const source of [page,catalog]) {
  const tsOut=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext},reportDiagnostics:true});
  assert.equal((tsOut.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'TS syntax');
  tests++;
}
const labelHelpers=page.match(/\/\/ FT035: Localize only known[\s\S]*?(?=function actionTechnicalFactorLabel\()/)?.[0];
assert.ok(labelHelpers,'Both safe source-label helpers exist');tests++;
const js=ts.transpileModule(labelHelpers,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const ctx=vm.createContext({});
vm.runInContext(js+'\nthis.actionTitleLabel=actionTitleLabel; this.actionSummaryLabel=actionSummaryLabel;',ctx,{timeout:3000});
const keys=[
  'Close approved execution request:',
  'System Recommendation',
  'Review and close the approved execution request through the operational task queue. This task is a human closure record only; it does not execute adapters or mutate inventory.',
  'Action urgency sets queue order; alert severity describes the alert itself. An informational alert may still need review.'
];
const translations=Object.fromEntries(keys.map(key=>{
  const line=catalog.split('\n').find(l=>l.trim().startsWith('['+JSON.stringify(key)+','));
  assert.ok(line,`Missing translation ${key}`);tests++;
  const parsed=JSON.parse(line.trim().replace(/,$/,''));
  assert.equal(parsed.length,5);tests++;
  return [key,parsed];
}));
for (let lang=0;lang<5;lang++) {
  const ui=key => translations[key]?.[lang] || key;
  const title='Close approved execution request: System Recommendation';
  const task={source_type:'execution_task',title,summary:keys[2]};
  assert.equal(ctx.actionTitleLabel(task,ui),`${ui(keys[0])} ${ui(keys[1])}`,'generated title');tests++;
  assert.equal(ctx.actionSummaryLabel(task,ui),ui(keys[2]),'generated summary');tests++;
  const custom={source_type:'execution_task',title:'Customer typed important note',summary:'Call me after shift'};
  assert.equal(ctx.actionTitleLabel(custom,ui),custom.title,'custom titles unchanged');tests++;
  assert.equal(ctx.actionSummaryLabel(custom,ui),custom.summary,'custom summaries unchanged');tests++;
  const userCreated={source_type:'alert',title,summary:keys[2]};
  assert.equal(ctx.actionTitleLabel(userCreated,ui),title,'alert title not mistaken for system task');tests++;
  assert.equal(ctx.actionSummaryLabel(userCreated,ui),keys[2],'alert content not mistaken for system task');tests++;
  assert.notEqual(ui(keys[3]).length,0);tests++;
}
assert.ok(page.includes("action.source_type === 'alert' && action.alert_severity"),'only source Alerts show guidance');tests++;
assert.ok(page.includes('Action urgency sets queue order; alert severity describes the alert itself. An informational alert may still need review.'));tests++;
assert.ok(page.includes("{ui('Action urgency:')}"),'separate action urgency label');tests++;
assert.ok(page.includes("{ui('Alert severity:')}"),'separate source severity label');tests++;
assert.ok(css.includes('.action-center-alert-priority-explanation'));tests++;
assert.ok(page.includes('sourceActionLink(action)'),'source workflow navigation preserved');tests++;
assert.ok(page.includes('canViewTenantDiagnostics ?'),'diagnostics permission preserved');tests++;
console.log(`FT035 Action Center clarity and source-only translation: ${tests}/${tests} PASS`);
