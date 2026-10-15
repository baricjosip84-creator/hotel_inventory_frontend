import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page=fs.readFileSync(path.join(root,'src/pages/DashboardPage.tsx'),'utf8');
const catalog=fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const helper=page.match(/function dashboardReasonLabel\(row: RecentActivityRow, ui: \(englishText: string\) => string\): string \{[\s\S]*?\n\}/)?.[0];
assert.ok(helper,'Dashboard source helper must exist');
const runnable=helper.replace('(row: RecentActivityRow, ui: (englishText: string) => string): string','(row, ui)').replaceAll(': Record<string, string>','');
const ctx=vm.createContext({});
vm.runInContext(`${runnable}\nthis.dashboardReasonLabel=dashboardReasonLabel;`,ctx,{timeout:1000});
const localize=ctx.dashboardReasonLabel;
const langs=['en','de','es','fr','hr'];
const keys=['Customer return','Available','Cleanup: reverse temporary +1 stock added for BOM assembly audit test.'];
const translations=Object.fromEntries(keys.map(key=>{
  const line=catalog.split('\n').find(line=>line.trim().startsWith('['+JSON.stringify(key)+','));
  assert.ok(line,`Missing translation row: ${key}`);
  return [key,JSON.parse(line.trim().replace(/,$/,''))];
}));
let checks=3;
for(let j=0;j<langs.length;j++) {
  const ui=k=>translations[k]?.[j+1]||k;
  const ref='RET-20260929-5CB1FF67';
  const cReturn={movement_kind:'customer_return',reason:`customer_return:${ref}:available`};
  assert.equal(localize(cReturn,ui),`${ui('Customer return')} ${ref} · ${ui('Available')}`,`${langs[j]} parsed return reason`);checks++;
  assert.equal(localize({movement_kind:'customer_return',reason:`customer_return:${ref}:new_condition`},ui),`${ui('Customer return')} ${ref}`,`${langs[j]} unknown condition is not guessed`);checks++;
  assert.equal(localize({movement_kind:'adjustment',reason:keys[2]},ui),ui(keys[2]),`${langs[j]} cleanup note`);checks++;
}
assert.equal(localize({movement_kind:'unclassified',reason:'customer_return:RET-123:available'},x=>x),'customer_return:RET-123:available','legacy evidence remains raw for source helper');checks++;
assert.equal(localize({movement_kind:'adjustment',reason:'Warehouse staff entered a free text note'},x=>x),'Warehouse staff entered a free text note','arbitrary free text preserved');checks++;
assert.ok(page.includes('title={row.reason || undefined}'),'original audit text remains available on hover');checks++;
assert.ok(page.includes('dashboardBusinessReasonLabel(row, ui)'),'dashboard invokes business-safe helper');checks++;
console.log(`FT033 Dashboard reason summary: ${checks}/${checks} PASS`);
