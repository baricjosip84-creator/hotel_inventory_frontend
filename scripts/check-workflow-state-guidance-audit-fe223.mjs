import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url), ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const helper=fs.readFileSync(path.join(root,'src/pages/workflowStateGuidance.ts'),'utf8');
const page=fs.readFileSync(path.join(root,'src/pages/WorkflowAutomationComposerPage.tsx'),'utf8');
const translations=fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const trans=ts.transpileModule(helper,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const m={exports:{}};new Function('module','exports',trans.outputText)(m,m.exports);
const {isTerminalSourceStatus:terminal,actionableWorkflowSteps:steps}=m.exports;
let checks=0;function eq(a,b,name){assert.deepEqual(a,b,name);checks++}function ok(b,name){assert.ok(b,name);checks++}
const draft=['review_source_context','assign_human_owner','capture_required_approval','execute_existing_governed_source_workflow','record_outcome_in_source_system'];
eq(steps(draft,false,'open'),draft,'open unassigned retains assignment, approval, execution');
eq(steps(draft,true,'open'),[draft[0],...draft.slice(2)],'assigned source omits redundant assignment');
eq(steps(draft,false,'approved'),[draft[0],draft[1],draft[3],draft[4]],'approved source omits already-satisfied approval only');
eq(steps(draft,true,'approved'),[draft[0],draft[3],draft[4]],'approved assigned skips two already-completed gates');
for(const s of ['completed','fulfilled','cancelled','canceled','resolved']){eq(terminal(s),true,s+' terminal');eq(steps(draft,false,s),[],s+' should not recommend repeating work')}
for(const s of ['open','in_progress','assigned','blocked','approved','pending',null,undefined]){eq(terminal(s),false,String(s)+' not terminal');}
eq(steps(draft,true,undefined),[draft[0],...draft.slice(2)],'missing source status does not falsely infer completion');
ok(page.includes('actionableWorkflowSteps(blueprint.recommended_steps_preview || [], responsibilityAlreadyAssigned(blueprint), triggerStatus)'), 'Source state is applied in real workflow card');
ok(page.includes('const terminalSource = isTerminalSourceStatus(triggerStatus);'),'Source close classification bound');
ok(page.includes("terminalSource\n                            ? ui('This source work is already closed."),'Closed source has honest next-step summary');
ok(page.includes("terminalSource ? ui('The source workflow is closed; no further action steps are suggested.')"),'Closed source has honest empty guidance');
for(const msg of ['This source work is already closed. Review its recorded result; no new execution is suggested.','The source workflow is closed; no further action steps are suggested.'])ok(translations.includes('['+JSON.stringify(msg)),'five-language message '+msg);
for(const rel of ['src/pages/workflowStateGuidance.ts','src/pages/WorkflowAutomationComposerPage.tsx','src/i18n/tenantUiTranslations.ts']){
 const file=path.join(root,rel);let parsed=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 eq(parsed.parseDiagnostics.length,0,'syntax '+rel);
}
console.log(`PASS ${checks}/${checks}: FE223 workflow state-aware source guidance`);
