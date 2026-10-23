import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hasMeasuredPolicyEffect } from '../src/utils/adaptivePolicyEffectiveness.ts';
const root=path.resolve(import.meta.dirname,'..');
const page=fs.readFileSync(path.join(root,'src/pages/AdaptivePolicyEnginePage.tsx'),'utf8');
const i18n=fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
let passed=0;
const check=(name,test)=>{try{test();passed++;console.log('PASS',name);}catch(e){console.error('FAIL',name,e.message);process.exitCode=1;}};
const withEvidence={application_id:'applied-id',baseline_score:20,observed_score:25,delta_score:5};
const withoutEvidence={application_id:null,baseline_score:null,observed_score:25,delta_score:null};
check('without application and baseline is observation only',()=>assert.equal(hasMeasuredPolicyEffect(withoutEvidence),false));
check('applied before/after evidence retains effectiveness claim',()=>assert.equal(hasMeasuredPolicyEffect(withEvidence),true));
check('single row evidence decision drives labels',()=>assert.ok(page.includes('const provenEffect = hasMeasuredPolicyEffect(measurement);')));
check('measurement text distinguishes proven and observed',()=>assert.ok(page.includes("provenEffect ? 'Effectiveness measurement' : 'Current observation'")));
check('row passes evidence decision to measurement display',()=>assert.ok(page.includes('measurementDisplayLabel(measurement.measurement_key, ui, provenEffect)')));
check('unproven type is policy observation',()=>assert.ok(page.includes("!provenEffect && measurement.measurement_type === 'policy_effectiveness' ? ui('Policy observation')")));
check('proven type still uses stored human-readable type',()=>assert.ok(page.includes('formatKnownSystemLabel(measurement.measurement_type, MEASUREMENT_TYPE_LABELS, ui)')));
check('unproven delta remains not assessed',()=>assert.ok(page.includes("provenEffect ? formatDelta(measurement.delta_score, locale) : ui('Not assessed')")));
for (const name of ['Current observation','Policy observation']) {
 const re=new RegExp('\\["'+name+'",\\s*"[^"]+",\\s*"[^"]+",\\s*"[^"]+",\\s*"[^"]+"\\]');
 check(`${name} has all five locale strings`,()=>assert.match(i18n,re));
}
if(!process.exitCode)console.log(`PASS ${passed}/${passed} FT068 observations`);
