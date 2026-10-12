import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceText = fs.readFileSync(process.env.BATCH118_PROCUREMENT_PAGE_PATH || path.join(root,'src/pages/ProcurementRecommendationsPage.tsx'),'utf8');
const safety = fs.readFileSync(path.join(root,'src/app/AppProviders.tsx'),'utf8');
const translations = fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const scripts = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).scripts;
const sf = ts.createSourceFile('ProcurementRecommendationsPage.tsx',sourceText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let assertions=0;
const check=(ok,label)=>{assert.ok(ok,label);assertions++};
const attr=(node,name)=>node.attributes.properties.find(p=>ts.isJsxAttribute(p) && p.name.getText(sf)===name);
const attrValue=(node,name)=>attr(node,name)?.initializer?.getText(sf) || '';
const buttons=[];
function walk(node){if(ts.isJsxOpeningElement(node)&&node.tagName.getText(sf)==='button')buttons.push(node);ts.forEachChild(node,walk)}
walk(sf);
const triggers=buttons.filter(b=>attrValue(b,'onClick').includes('requestConfirmation('));
const modalFinal=buttons.filter(b=>attrValue(b,'onClick').includes('confirmation.action'));
check(sf.parseDiagnostics.length===0,'Procurement TSX must parse');
check(triggers.length===9,'All nine custom dialog triggers must be covered');
check(modalFinal.length===1,'Exactly one shared modal final confirmation action');
check(sourceText.match(/requestConfirmation\(\{/g)?.length===9,'No confirmation call path removed');
check(buttons.filter(b=>attrValue(b,'data-skip-global-confirm')==='"true"').length===10,'Opt-out belongs to nine custom triggers plus modal final action only');
for(let i=0;i<triggers.length;i++){
  const button=triggers[i];const all=button.parent.getText(sf);
  check(attrValue(button,'data-skip-global-confirm')==='"true"',`Custom dialog trigger ${i+1} must skip global browser confirmation`);
  check(attrValue(button,'type')==='"button"',`Custom dialog trigger ${i+1} must not submit a form`);
  check(all.includes('requestConfirmation({') && all.includes('action: () =>'),`Trigger ${i+1} must still use the local approval modal and explicit action`);
}
check(attrValue(modalFinal[0],'data-skip-global-confirm')==='"true"','Final modal confirm must not trigger a second native confirmation');
check(attrValue(modalFinal[0],'type')==='"button"','Final confirm must be a non-submit button');
check(attrValue(modalFinal[0],'onClick').includes('setConfirmation(null);'),'Confirmed modal closes before action');
check(attrValue(modalFinal[0],'onClick').includes('action();'),'Confirmed modal still performs its original mutation');
check(sourceText.includes('onClick={() => setConfirmation(null)}'),'Custom modal cancel still closes without mutation');
check(sourceText.includes('role="dialog"') && sourceText.includes('aria-modal="true"'),'Accessible confirmation dialog retained');
check(sourceText.includes('aria-labelledby="procurement-confirmation-title"'),'Modal title remains accessible');
check(sourceText.includes('onMouseDown={(event) => event.stopPropagation()}'),'Clicking modal contents does not dismiss dialog');
check(sourceText.includes('onMouseDown={() => setConfirmation(null)}'),'Backdrop cancel behavior retained');
check(sourceText.includes('disabled={!canApproveRecommendations || Boolean(selectedDetail.detail?.current_conversion_open) || decisionMutation.isPending}'),'Reject eligibility and pending rules retained');
check(sourceText.includes('bulkDecisionMutation.mutate({'),'Bulk decision pathway remains');
check(sourceText.includes('poDraftConversionMutation.mutate({'),'PO draft conversion pathway remains');
check(sourceText.includes('scheduledRunMutation.mutate({ dryRun: false })'),'Scheduled execution pathway remains');
check(sourceText.includes('exceptionResolutionMutation') && sourceText.includes('resolveException(exception, "reject")'),'Exception resolution pathway remains');
check(safety.includes("element.dataset.skipGlobalConfirm === 'true'"),'Global safety recognises local-confirm opt-out');
check(safety.includes('isActionExplicitlySkipped(button)'),'Global handler screens out locally confirmed actions');
check(safety.includes('const confirmed = originalConfirm(confirmationMessage)'),'Other dangerous actions retain default native guard');
check(!sourceText.includes('window.confirm('),'Procurement page has no independent native confirmation');
for(const key of ['Approve recommendation?','Reject recommendation?','Execute scheduled procurement run?','Assign supplier to product?']){
  check(translations.includes(`["${key}",`),`Five-language dialog title retained: ${key}`);
}
check(scripts['check:batch118-procurement-single-confirmation']==='node scripts/check-batch118-procurement-single-confirmation.mjs','Batch118 executable guard registered');
console.log(`PASS Batch118 Procurement single local confirmation: ${assertions}/${assertions} assertions`);
