import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const translations = read('src/i18n/tenantUiTranslations.ts');
const page = read('src/pages/MobileExecutionPage.tsx');
const pkg = JSON.parse(read('package.json'));
const checks = [];
function check(label, condition) {
  checks.push([label, Boolean(condition)]);
  if (!condition) console.error('FAIL', label);
}
const output = ts.transpileModule(translations, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
check('Translation catalog transpiles without TypeScript errors', !output.diagnostics?.length);
const sandbox = {exports: {}};
vm.runInNewContext(output.outputText, sandbox, {timeout: 10000});
const t = sandbox.exports.translateTenantUi;
const expectations = {
 'en-GB': ['Online','Offline'],
 'de-DE': ['Online','Offline'],
 'es-ES': ['En línea','Sin conexión'],
 'fr-FR': ['En ligne','Hors ligne'],
 'hr-HR': ['Na mreži','Izvan mreže'],
};
for(const [locale, labels] of Object.entries(expectations)) {
  check(`${locale}: online localized`,t(locale,'Online')===labels[0]);
  check(`${locale}: offline localized`,t(locale,'Offline')===labels[1]);
}
check('Croatian task queue heading uses natural wording',t('hr-HR','Touch-first task queue')==='Red mobilnih zadataka');
check('Croatian mobile refresh wording uses natural wording',t('hr-HR','Refresh mobile queue')==='Osvježi red zadataka');
check('English UI wording is unchanged',t('en-GB','Touch-first task queue')==='Touch-first task queue' && t('en-GB','Refresh mobile queue')==='Refresh mobile queue');
for(const key of ['Online','Offline']) {
 check(`${key}: exactly one translated key`,(translations.match(new RegExp(`\\["${key}",`,'g'))||[]).length===1);
}
check('Connection state shown in hero and stats using translation',page.split("ui(online ? 'Online' : 'Offline')").length===3);
check('Connectivity events preserved',page.includes("window.addEventListener('online', onOnline)") && page.includes("window.addEventListener('offline', onOffline)"));
check('Query retry still follows connection state',page.includes('retry: online ? 1 : false'));
check('Offline replay still guarded by online state',page.includes('if (!online || syncing || pending.length === 0 || !canRunAnyMobileAction) return;'));
check('Existing offline storage and snapshot warnings preserved',page.includes("ui('Offline storage is unavailable.") && page.includes("ui('Offline snapshot:')"));
check('Existing permission and claim restrictions unchanged',page.includes('canRunAnyMobileAction') && page.includes('canRunAction(action)'));
check('Dedicated regression is registered',pkg.scripts?.['check:mobile-connection-localization-v349341']==='node scripts/check-mobile-connection-status-localization-surgical-fix-v349341.mjs');
const count=checks.filter(([,ok])=>ok).length;
console.log(`Mobile Execution connection localization: ${count}/${checks.length} PASS`);
if(count!==checks.length) process.exitCode=1;
