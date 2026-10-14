import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const cases = [
  {name: 'Probabilistic Forecasting', file: process.env.INVENTORY_FORECAST_FEEDBACK_SOURCE || path.join(root, 'src/pages/ProbabilisticForecastingPage.tsx'), endpoint: '/decision-intelligence/probabilistic-forecasting-refresh', successText: 'Forecast analysis refreshed successfully.'},
  {name: 'Adaptive Policy Engine', file: process.env.INVENTORY_POLICY_FEEDBACK_SOURCE || path.join(root, 'src/pages/AdaptivePolicyEnginePage.tsx'), endpoint: '/decision-intelligence/adaptive-policy-engine-refresh', successText: 'New policy analysis snapshot recorded from current operating data. No policy changes were applied; recommendations still require human review.'}
];
let checks = 0;
function check(label, fn) {fn();checks++;console.log(`PASS ${checks}: ${label}`)}
const translations = readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const api = readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
check('shared API supports the page-owned mutation-feedback opt-out', () => assert.match(api, /skipMutationFeedback\?: boolean/));
check('shared mutation response suppresses generic feedback only when opted out', () => assert.match(api, /!\(options as SafeMutationRequestInit\)\.skipMutationFeedback/));
for (const c of cases) {
 const source = readFileSync(c.file, 'utf8');
 const sf = ts.createSourceFile(c.file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 check(`${c.name}: TSX parses without error`, () => assert.equal(sf.parseDiagnostics.length, 0));
 const matches=[];
 function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'refreshAnalysis') matches.push(node);
  ts.forEachChild(node, visit);
 }
 visit(sf);
 check(`${c.name}: one refresh-analysis mutation`, () => assert.equal(matches.length, 1));
 const mutationText = matches[0].initializer?.getText(sf);
 check(`${c.name}: refresh handler still uses TanStack mutation`, () => assert.match(mutationText, /^useMutation\(\{/));
 const requests=[];const calls=[];
 const ctx={
  useMutation: (options) => options,
  apiRequest: async (url, options) => {requests.push({url, options});return {refreshed:true}},
  refetch: async () => {calls.push('refetch');return {isSuccess:true}},
  setOffsets: (value) => {calls.push(value)},
  focusedMode:false,
  focusedEvidenceQuery:{refetch:async()=>{calls.push('focusedRefetch')}},
  JSON
 };
 const js = ts.transpileModule(`globalThis.__mutation = ${mutationText};`, {fileName:'refresh.ts',compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js, ctx);
 const mutation = ctx.__mutation;
 check(`${c.name}: mutation handler can execute`, () => assert.equal(typeof mutation.mutationFn, 'function'));
 await mutation.mutationFn();
 check(`${c.name}: exact pre-existing endpoint`, () => assert.equal(requests.at(-1).url,c.endpoint));
 check(`${c.name}: preserves POST`, () => assert.equal(requests.at(-1).options.method,'POST'));
 check(`${c.name}: suppresses generic Item created success toast`, () => assert.equal(requests.at(-1).options.skipMutationFeedback,true));
 if (c.name === 'Probabilistic Forecasting') {
  check('Forecast: original empty JSON body is unchanged', () => assert.equal(requests.at(-1).options.body,'{}'));
  await mutation.onSuccess();
  check('Forecast: standard refresh still resets paging',()=>assert.equal(typeof calls[0],'object'));
  check('Forecast: standard refresh re-fetches evidence',()=>assert(calls.includes('refetch')));
  calls.length=0;ctx.focusedMode=true;
  await mutation.onSuccess();
  check('Forecast: focused review does not reset paging',()=>assert(!calls.some(v=>typeof v==='object')));
  check('Forecast: focused review fetches the exact model evidence',()=>assert(calls.includes('focusedRefetch')));
 } else {
  await mutation.onSuccess();
  check('Policy: success continues fetching the updated evidence',()=>assert(calls.includes('refetch')));
 }
 check(`${c.name}: exact action-specific confirmation is rendered after successful mutation`,()=>{
  assert(source.includes(`refreshAnalysis.isSuccess`));
  assert(source.includes(`ui('${c.successText}')`));
 });
 check(`${c.name}: confirmation is accessible beside its action`,()=>{
  assert.match(source, /refreshAnalysis\.isSuccess\s*\?\s*\(?\s*<p[^>]*role="status"[^>]*aria-live="polite"/);
 });
 check(`${c.name}: failures remain visibly handled`,()=>assert(source.includes('refreshAnalysis.isError')));
 check(`${c.name}: action-specific text is translated into the five-language dictionary`,()=>{
   const escaped = c.successText.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   assert.match(translations,new RegExp('\\["'+escaped+'",\\s*"[^"\\n]+",\\s*"[^"\\n]+",\\s*"[^"\\n]+",\\s*"[^"\\n]+"\\]'));
 });
}
console.log(`PASS ${checks}/${checks} forecast/policy focused checks`);
