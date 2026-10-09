import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const translations=fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
const navigation=fs.readFileSync(path.join(root,'src/i18n/navigationTranslations.ts'),'utf8');
const page=fs.readFileSync(path.join(root,'src/pages/OperationalActionCenterPage.tsx'),'utf8');
const registry=fs.readFileSync(path.join(root,'src/app/navigationRegistry.ts'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let count=0;
const check=(name,fn)=>{fn();count++;console.log('PASS '+String(count).padStart(2,'0')+' '+name);};
const rows = new Map();
for (const line of translations.split('\n')) {
  if(!/^  \["/.test(line))continue;
  const entry=line.match(/^  \["((?:\\.|[^"\\])*)"/);
  const end=line.match(/, "((?:\\.|[^"\\])*)"\],?$/);
  if(entry&&end)rows.set(entry[1],end[1]);
}
const correct='Centar aktivnosti';
check('Navigation has canonical Croatian page name',()=>assert.match(navigation,/"Action Center": "Centar aktivnosti"/));
check('Action Center hero uses catalog title',()=>assert.match(page,/title=\{ui\("Action Center"\)\}/));
check('Page navigation retains Action Center route',()=>assert.match(registry,/to: '\/action-center',\s*label: 'Action Center'/));
check('Page hero translates to canonical Croatian name',()=>assert.equal(rows.get('Action Center'),correct));
check('Action Center loading copy matches chosen name',()=>assert.equal(rows.get('Loading Action Center'),'Učitavanje centra aktivnosti'));
check('Action Center load error matches chosen name',()=>assert.equal(rows.get('Action Center could not be loaded'),'Centar aktivnosti nije moguće učitati'));
check('Action Center overview matches chosen name',()=>assert.equal(rows.get('Action Center overview'),'Pregled centra aktivnosti'));
check('Open Action Center matches chosen name',()=>assert.equal(rows.get('Open Action Center'),'Otvori centar aktivnosti'));
check('Open in Action Center matches chosen name',()=>assert.equal(rows.get('Open in Action Center'),'Otvori u Centru aktivnosti'));
check('Exact Action Center deep link matches chosen name',()=>assert.equal(rows.get('Open exact Action Center item'),'Otvori točnu stavku Centra aktivnosti'));
check('No old Action Center labels in Croatian rows',()=>{
 for(const [key,value] of rows) if(/action[ -]?center/i.test(key)) {
 assert.doesNotMatch(value,/Centar radnji|centar radnji|Centra radnji|centra radnji|Centru radnji|centru radnji|Centra za radnje|Action Centera|Akcijskog centra|Akcijskom centru/,key);
 }
});
check('Other languages and placeholder-bearing strings retain complete rows',()=>{
 for(const k of ['Action Center','Action Center overview','Open in Action Center']) {
 assert.match(translations,new RegExp('\\["'+k+'", "[^"\\n]+", "[^"\\n]+", "[^"\\n]+", "[^"\\n]+"\\]'));
 }
});
check('No route mutations introduced into translation files',()=>assert.doesNotMatch(translations,/fetch\(|apiRequest\(/));
check('Regression command is registered',()=>assert.equal(pkg.scripts['check:action-center-croatian-name-v349337'],'node scripts/check-action-center-croatian-name-surgical-fix-v349337.mjs'));
const options={jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext};
for(const [name,source] of [['tenantUiTranslations.ts',translations],['navigationTranslations.ts',navigation],['OperationalActionCenterPage.tsx',page]]){
 check(`${name} TS syntax`,()=>{
  const ds=(ts.transpileModule(source,{fileName:name,compilerOptions:options,reportDiagnostics:true}).diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
  assert.deepEqual(ds.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
 });
}
console.log(`Action Center Croatian naming Batch099: ${count}/${count} PASS`);
