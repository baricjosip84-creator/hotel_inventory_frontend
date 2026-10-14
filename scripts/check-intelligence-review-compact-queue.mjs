import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const page = fs.readFileSync(path.join(root,'src/pages/HumanInLoopAIReviewPage.tsx'),'utf8');
const css = fs.readFileSync(path.join(root,'src/pages/HumanInLoopAIReviewPage.css'),'utf8');
const helper = fs.readFileSync(path.join(root,'src/utils/intelligenceReviewQueueSelection.ts'),'utf8');
const source = ts.createSourceFile('HumanInLoopAIReviewPage.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(source.parseDiagnostics.length,0,'page TSX must parse cleanly');
const js = ts.transpileModule(helper,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports = {}; new Function('exports',js)(exports);
const select = exports.selectVisibleIntelligenceReview;
const rows=[
  {source_action_id:'a',review_id:'1'},
  {source_action_id:'b',review_id:'2'},
  {source_action_id:'c',review_id:'3'},
];
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS',name)}
check('defaults to first visible review',()=>assert.equal(select(rows,null,null),rows[0]));
check('local second selection selects exactly second',()=>assert.equal(select(rows,'b',null),rows[1]));
check('local third selection selects exactly third',()=>assert.equal(select(rows,'c',null),rows[2]));
check('unknown local selection defaults to visible first',()=>assert.equal(select(rows,'old',null),rows[0]));
check('pagination retains selection when still present',()=>assert.equal(select(rows.slice(1),'b',null),rows[1]));
check('pagination resets missing selection',()=>assert.equal(select(rows.slice(1),'a',null),rows[1]));
check('filtered out local selection resets',()=>assert.equal(select([rows[2]],'b',null),rows[2]));
check('requested exact deep link takes priority',()=>assert.equal(select(rows,'a','c'),rows[2]));
check('requested id must not silently select another review',()=>assert.equal(select(rows,'a','absent'),undefined));
check('empty list has no selected review',()=>assert.equal(select([],null,null),undefined));
check('empty list cannot satisfy requested id',()=>assert.equal(select([],null,'a'),undefined));
check('supports id fallback for record without source action',()=>assert.deepEqual(select([{review_id:'r'}],'r',null),{review_id:'r'}));
check('missing source selection is not a mutation',()=>assert.equal(rows.length,3));
const required = [
  [page,"const [selectedQueueReviewId, setSelectedQueueReviewId] = useState<string | null>(null)"],
  [page,'selectVisibleIntelligenceReview(reviews, selectedQueueReviewId, requestedSourceActionId)'],
  [page,'<nav className="ai-review-page__queue-picker"'],
  [page,'aria-label={ui(\'Review queue\')}'],
  [page,'className={`ai-review-page__queue-choice ${selected ?'],
  [page,'aria-current={selected ? \'true\' : undefined}'],
  [page,'setSelectedQueueReviewId(rowId)'],
  [page,'setSelectedHistorySourceActionId(null)'],
  [page,'disabled={Boolean(requestedSourceActionId) && !selected}'],
  [page,'reviews.filter((review) => review === selectedQueueReview).map'],
  [page,'requestedSourceActionId && !selectedQueueReview'],
  [page,'reviewDecisionValidationMessage(selectedDecision, decisionDraft, ui)'],
  [page,'recordAIReviewDecision(sourceActionId, body)'],
  [page,'aria-live="off"'],
  [css,'grid-template-columns: minmax(240px, 290px) minmax(0, 1fr)'],
  [css,'.ai-review-page__selected-review > .ai-review-page__review-card'],
  [css,'.ai-review-page__queue-choice:focus-visible'],
  [css,'.ai-review-page__queue-choice--selected'],
  [css,'@media (max-width: 840px)'],
];
for(const [content,needle] of required) check(needle,()=>assert.ok(content.includes(needle),`missing ${needle}`));
check('no longer renders all detailed reviews simultaneously',()=>assert.ok(!page.includes('{reviews.map((review) => {\n              const sourcePath')));
console.log(`PASS ${checks}/${checks} focused review-queue checks`);
