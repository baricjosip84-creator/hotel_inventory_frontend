#!/usr/bin/env node
// Batch 113: exact audit ACTION-I18N-003 copy correction, no workflow changes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = process.cwd();
const ts = require('typescript');
const catalogFile = path.join(root, 'src/i18n/tenantUiTranslations.ts');
const pageFile = path.join(root, 'src/pages/OperationalActionCenterPage.tsx');
const catalog = fs.readFileSync(catalogFile, 'utf8');
const page = fs.readFileSync(pageFile, 'utf8');
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const js = ts.transpileModule(catalog, {fileName:'tenantUiTranslations.ts', compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}, reportDiagnostics:true});
check(!(js.diagnostics || []).some(x=>x.category===ts.DiagnosticCategory.Error), 'translation file syntax');
const runtime = {exports:{}};
new Function('module', 'exports', js.outputText)(runtime,runtime.exports);
const {translateTenantUi,canonicalTenantUiText,TENANT_UI_TRANSLATIONS} = runtime.exports;
const expected = [
  ['Action inbox','Popis radnji','Ulazni spremnik radnji'],
  ['Read-only, human-operated','Samo za čitanje; radnje obavljaju korisnici','Samo za čitanje, upravljaju ljudi']
];
const langs = ['en-GB','de-DE','es-ES','fr-FR','hr-HR'];
for(const [key, croatian, old] of expected) {
  check(page.includes(`ui("${key}")`) || page.includes(`ui('${key}')`), `Action Center still renders ${key} using localization`);
  check(translateTenantUi('hr-HR', key) === croatian, `new Croatian ${key}`);
  check(canonicalTenantUiText('hr-HR', croatian) === key, `canonical Croatian reverse lookup for ${key}`);
  check(!catalog.includes(`"${old}"`), `outdated ${key} absent`);
  check(catalog.split(`"${key}"`).length === 2, `exactly one catalog entry for ${key}`);
  for(const language of langs) {
    check(typeof TENANT_UI_TRANSLATIONS[language][key] === 'string', `${key} has ${language} translation`);
    check(TENANT_UI_TRANSLATIONS[language][key].trim().length>0, `${key} non-empty in ${language}`);
  }
  for(const language of langs.slice(0,4)) {
    check(translateTenantUi(language,key) === TENANT_UI_TRANSLATIONS[language][key], `${language} unchanged catalog key for ${key}`);
  }
}
check(page.includes('sourceActionId') && page.includes('routeExposureAudit'), 'Action Center behavior source still present');
check(translateTenantUi('hr-HR', 'operational_action_center.read') === 'operational_action_center.read', 'technical permission identifier unchanged');
console.log(`PASS ${checks}/${checks}: Batch113 Action Center Croatian copy edits and five-language preservation`);
