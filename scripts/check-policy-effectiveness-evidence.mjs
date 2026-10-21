import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hasMeasuredPolicyEffect } from '../src/utils/adaptivePolicyEffectiveness.ts';

// This check runs in a frontend-only GitHub checkout; do not require backend source here.
const root = path.resolve(import.meta.dirname, '..');
const page = fs.readFileSync(path.join(root,'src/pages/AdaptivePolicyEnginePage.tsx'),'utf8');
const translations = fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
let passed = 0;
function check(label, fn) { try {fn(); passed++; console.log('PASS '+label);} catch (err) {console.error('FAIL '+label,err.message); process.exitCode=1;}}
const valid={application_id:'application-123',baseline_score:0,observed_score:40,delta_score:40};
for (const [label,input,expected] of [
 ['valid after-application measurement',valid,true],
 ['valid zero change',{...valid,delta_score:0},true],
 ['valid numeric string values',{...valid,baseline_score:'0',observed_score:'40.5',delta_score:'40.5'},true],
 ['missing source', {...valid,application_id:undefined},false],
 ['null source',{...valid,application_id:null},false],
 ['blank source',{...valid,application_id:'  '},false],
 ['missing baseline',{...valid,baseline_score:undefined},false],
 ['null baseline',{...valid,baseline_score:null},false],
 ['empty baseline',{...valid,baseline_score:''},false],
 ['missing observation',{...valid,observed_score:undefined},false],
 ['null observation',{...valid,observed_score:null},false],
 ['non-numeric observation',{...valid,observed_score:'not-a-score'},false],
 ['missing change',{...valid,delta_score:undefined},false],
 ['null change',{...valid,delta_score:null},false],
 ['empty change',{...valid,delta_score:' '},false],
 ['non-finite change',{...valid,delta_score:Infinity},false],
 ['undefined record',undefined,false],
 ['null record',null,false],
]) check(label,()=>assert.equal(hasMeasuredPolicyEffect(input),expected));
for (const [label,needle] of [
 ['helper import',"import { hasMeasuredPolicyEffect } from '../utils/adaptivePolicyEffectiveness'"],
 ['model includes provenance','application_id?: string | null;'],
 ['summary derives from actual evidence','(data?.effectiveness || []).some(hasMeasuredPolicyEffect)'],
 ['row explains verified measurements',"hasMeasuredPolicyEffect(measurement) ? 'Measured after recorded policy application'"],
 ['row refuses to present unverified change',"hasMeasuredPolicyEffect(measurement) ? formatDelta(measurement.delta_score, locale) : ui('Not assessed')"],
 ['keeps original conditional evidence title',"hasMeasuredEffectiveness ? 'Effectiveness measurements' : 'Current policy observations'"],
 ['explicit mixed-data warning','Other rows are current observations, not proof of impact.'],
 ['explicit no-verification warning','Effectiveness cannot be determined yet; these rows are observations only.'],
]) check(label,()=>assert.ok(page.includes(needle)));
for (const key of ['Only rows linked to a recorded policy application with valid before-and-after scores show measured change.', 'No verified before-and-after policy application evidence is available in the returned records.', 'Measured after recorded policy application','Current observation — impact not established'])
 check('localized '+key.slice(0,35),()=>assert.ok(translations.includes(JSON.stringify(key).slice(0,-1))));
if (!process.exitCode) console.log(`PASS ${passed}/${passed}`);
