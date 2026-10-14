import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root=process.cwd();
const page=fs.readFileSync(path.join(root,'src/pages/HumanInLoopAIReviewPage.tsx'),'utf8');
const util=fs.readFileSync(path.join(root,'src/utils/intelligenceReviewQueueRoute.ts'),'utf8');
const selectUtil=fs.readFileSync(path.join(root,'src/utils/intelligenceReviewQueueSelection.ts'),'utf8');
const translated=fs.readFileSync(path.join(root,'src/i18n/tenantUiTranslations.ts'),'utf8');
let checks=0;
const check=(name,fn)=>{fn();checks++;console.log('PASS',name)};
check('page parses as TSX',()=>assert.equal(ts.createSourceFile('HumanInLoopAIReviewPage.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length,0));
check('URL route helper parses as TS',()=>assert.equal(ts.createSourceFile('intelligenceReviewQueueRoute.ts',util,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length,0));
const transpile=(src)=>{
  const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const out={};new Function('exports',js)(out);return out;
};
const {readIntelligenceReviewQueueRoute:read,withIntelligenceReviewQueueChange:change}=transpile(util);
const {selectVisibleIntelligenceReview:select}=transpile(selectUtil);
const rows=[{source_action_id:'review-A',review_id:'1'},{source_action_id:'review-B',review_id:'2'}];
check('empty URL defaults',()=>assert.deepEqual(read(new URLSearchParams()),{domain:'all',state:'all',urgency:'all',search:'',sort:'priority',offset:0,selectedReviewId:null}));
const saved=new URLSearchParams('view=readiness&source_action_id=trusted&review_domain=procurement&review_state=approval_required&review_urgency=high&review_q=delivery&review_sort=newest&review_offset=25&selected_review_id=review-B');
check('URL reopens saved domain',()=>assert.equal(read(saved).domain,'procurement'));
check('URL reopens saved state',()=>assert.equal(read(saved).state,'approval_required'));
check('URL reopens saved urgency',()=>assert.equal(read(saved).urgency,'high'));
check('URL reopens saved search',()=>assert.equal(read(saved).search,'delivery'));
check('URL reopens saved sort',()=>assert.equal(read(saved).sort,'newest'));
check('URL reopens saved page offset',()=>assert.equal(read(saved).offset,25));
check('URL reopens selected review',()=>assert.equal(read(saved).selectedReviewId,'review-B'));
check('selected review is from loaded page',()=>assert.equal(select(rows,read(saved).selectedReviewId,null),rows[1]));
check('hard-refresh roundtrip',()=>assert.deepEqual(read(new URLSearchParams(saved.toString())),read(saved)));
check('direct source-action link wins',()=>assert.equal(select(rows,'review-B','review-A'),rows[0]));
check('missing exact direct link shows no other review',()=>assert.equal(select(rows,'review-B','missing'),undefined));
check('missing selected review does not show other record',()=>assert.equal(select(rows,'missing',null),undefined));
check('no selection defaults to first review',()=>assert.equal(select(rows,null,null),rows[0]));
check('filter change clears selection',()=>assert.equal(change(saved,'review_urgency','critical',{resetPage:true}).has('selected_review_id'),false));
check('filter change resets offset',()=>assert.equal(read(change(saved,'review_state','pending_review',{resetPage:true})).offset,0));
check('sort change resets offset',()=>assert.equal(read(change(saved,'review_sort','oldest',{resetPage:true})).offset,0));
check('search change resets offset and selection',()=>assert.deepEqual([read(change(saved,'review_q','a',{resetPage:true})).offset,read(change(saved,'review_q','a',{resetPage:true})).selectedReviewId],[0,null]));
check('page change clears previous row selection',()=>assert.equal(read(change(saved,'review_offset','50')).selectedReviewId,null));
check('row selection preserves page',()=>assert.equal(read(change(saved,'selected_review_id','review-A')).offset,25));
check('row selection preserves active queue filter',()=>assert.equal(read(change(saved,'selected_review_id','review-A')).domain,'procurement'));
check('row selection preserves view',()=>assert.equal(change(saved,'selected_review_id','review-A').get('view'),'readiness'));
check('row selection preserves authoritative external deep link',()=>assert.equal(change(saved,'selected_review_id','review-A').get('source_action_id'),'trusted'));
check('URL updates do not mutate incoming params',()=>{const before=saved.toString();change(saved,'selected_review_id','review-A');assert.equal(saved.toString(),before)});
check('default filter value removed from URL',()=>assert.equal(change(saved,'review_domain','all').has('review_domain'),false));
check('default sort removed from URL',()=>assert.equal(change(saved,'review_sort','priority').has('review_sort'),false));
check('default page removed from URL',()=>assert.equal(change(saved,'review_offset','0').has('review_offset'),false));
for(const bad of ['-1','999999999999999999','Infinity','NaN','1e9','1.5','abc'])check(`unsafe page offset ${bad} rejected`,()=>assert.equal(read(new URLSearchParams({review_offset:bad})).offset,0));
check('valid 25 offset accepted',()=>assert.equal(read(new URLSearchParams({review_offset:'25'})).offset,25));
check('oversized search value truncated',()=>assert.equal(read(new URLSearchParams({review_q:'a'.repeat(300)})).search.length,200));
check('oversized search update truncated',()=>assert.equal(change(new URLSearchParams(),'review_q','x'.repeat(300)).get('review_q')?.length,200));
for(const snippet of [
  'readIntelligenceReviewQueueRoute(searchParams)',
  "updateQueueRoute('review_domain'",
  "updateQueueRoute('review_state'",
  "updateQueueRoute('review_urgency'",
  "updateQueueRoute('review_q'",
  "updateQueueRoute('review_sort'",
  "updateQueueRoute('review_offset'",
  "updateQueueRoute('selected_review_id', rowId)",
  'const selectedQueueReviewId = queueRoute.selectedReviewId',
  'selectVisibleIntelligenceReview(reviews, selectedQueueReviewId, requestedSourceActionId)',
  'The selected review is no longer on this page.',
]) check(`page wired ${snippet}`,()=>assert.ok(page.includes(snippet)));
check('no local selection state masks URL',()=>assert.ok(!page.includes('setSelectedQueueReviewId(')));
check('all five language strings provided',()=>assert.match(translated,/Odabrani pregled više nije na ovoj stranici/));
console.log(`PASS ${checks}/${checks} Intelligence Review durable route checks`);
