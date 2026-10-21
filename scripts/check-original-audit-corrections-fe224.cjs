// Source-level regression for audited defects; runs without network or live tenant data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const read = (file) => fs.readFileSync(path.join(__dirname, '../src/pages', file), 'utf8');
const learning = read('DecisionLearningFeedbackPage.tsx');
const dashboard = read('DashboardPage.tsx');
const composer = read('WorkflowAutomationComposerPage.tsx');
const copilot = read('AIOperationsCopilotPage.tsx');
let count = 0;
function check(condition, message) { assert.ok(condition, message); count++; }
function fnBetween(src, start, end, name, stubs = {}) {
  const a = src.indexOf(start); const b = src.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `extract ${name}`);
  const js = ts.transpileModule(`${src.slice(a,b)}\nmodule.exports = ${name};`,
    {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
  const ctx = {module:{exports:{}}, ...stubs};
  vm.runInNewContext(js, ctx, {timeout:1000});
  return ctx.module.exports;
}
const formatLocalizedNumber=(n)=>Number(n).toFixed(2);
const formatNormalizedLearningScore=fnBetween(learning,'function formatNormalizedLearningScore(', 'function formatLearningPercentage(', 'formatNormalizedLearningScore', {formatLocalizedNumber});
const formatLearningPercentage=fnBetween(learning,'function formatLearningPercentage(', 'function learningMetricLabel(', 'formatLearningPercentage', {formatLocalizedNumber});
for (const f of [formatNormalizedLearningScore,formatLearningPercentage]) {
  for (const value of [null,undefined,'',false,true,NaN,'NaN','invalid',Infinity])
    check(f(value,'en') === '—',`missing/nonfinite evidence must not be reported as zero: ${value}`);
  for (const value of [0,1,-1]) check(f(value,'en') !== '—',`valid measurement ${value}`);
}
const dashboardReasonLabel=fnBetween(dashboard,'function dashboardReasonLabel(', 'function healthBadgeStyle(', 'dashboardReasonLabel');
const ui=(s)=>s;
const rawLegacy = dashboardReasonLabel({movement_kind:'unclassified',reason:'outbound_dispatch:123e4567-e89b'},ui);
check(rawLegacy === 'outbound_dispatch:123e4567-e89b','raw legacy evidence preserved in source helper');
const dashboardBusinessReasonLabel=fnBetween(dashboard,'function dashboardBusinessReasonLabel(', 'function healthBadgeStyle(', 'dashboardBusinessReasonLabel', {dashboardReasonLabel});
const legacy=dashboardBusinessReasonLabel({movement_kind:'unclassified',reason:'outbound_dispatch:123e4567-e89b'},ui);
check(legacy.includes('Unclassified legacy movement') && !legacy.includes('123e4567'), 'unclassified business label omits machine key');
check(dashboardReasonLabel({movement_kind:'classified',reason:'stock_transfer_out:e123'},ui)==='Stock transfer','transfer classified');
check(dashboardReasonLabel({movement_kind:'classified',reason:'usage:123'},ui)==='Stock consumed','consumption classified');
check(dashboardReasonLabel({movement_kind:'classified',reason:'manual_adjustment'},ui)==='Manual adjustment','manual adjustment classified');
check(dashboardReasonLabel({movement_kind:'classified',reason:'warehouse_note:123e'},ui).startsWith('Other recorded movement'),'raw unknown machine key softened');
check(dashboardReasonLabel({movement_kind:'classified',reason:'Broken jar recorded by manager'},ui)==='Broken jar recorded by manager','human text preserved');
check(dashboard.includes('title={row.reason || undefined}'),'raw source evidence available as tooltip');
check(composer.includes('blueprints.map((blueprint, blueprintIndex)'),'stable position for plan fallback');
check(composer.includes("sourceReference || String(blueprintIndex + 1)"),'duplicate title does not go without disambiguator');
check(composer.includes('duplicateTitle ? ('),'reference for all duplicates');
check(copilot.includes("'Saved result snapshot')} — {formatDateTime(selectedRun.created_at, locale, ui)}"),'capture time in result panel');
check(copilot.includes('Values reflect the evidence captured for this run and are not live operational values.'),'no claim values are live');
const catalog=fs.readFileSync(path.join(__dirname,'../src/i18n/tenantUiTranslations.ts'),'utf8');
for(const key of ['Unclassified legacy movement — review source record','Unclassified legacy movement','Other recorded movement','Plan number']) check(catalog.includes('['+JSON.stringify(key)+','),'translations in catalog: '+key);
// Data-processing contract must not change: this release is presentation only.
const purchaseOrders=read('PurchaseOrdersPage.tsx');
check(/purchase-orders-items-heading[\s\S]{0,420}onClick=\{addItem\}/.test(purchaseOrders),'PO item action reachable at heading');
check(/purchase-orders-items-actions[\s\S]{0,260}onClick=\{addItem\}[\s\S]{0,120}Add another item/.test(purchaseOrders),'PO item action reachable after lines');
check(catalog.includes('["Add another item",'),'item action localized');
check(purchaseOrders.includes('fieldset'),'existing PO form locking preserved');
check(composer.includes('actionableWorkflowSteps('),'workflow business logic preserved');
check(dashboard.includes('row.movement_kind'),'movement classification not guessed by user interface');
console.log(`FE224 original-audit correction checks: ${count}/${count} PASS`);
