import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readCrossDomainRouteState, updateCrossDomainRouteParams } from '../src/lib/crossDomainRouteState.ts';

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, '../src/pages/CrossDomainOptimizationPage.tsx'), 'utf8');
const base = process.env.BASELINE_CROSS_DOMAIN_PAGE;
let checks = 0;
function test(name, fn) {
  fn(); checks++;
  console.log(`PASS ${checks}: ${name}`);
}
function state(params) { return readCrossDomainRouteState(new URLSearchParams(params)); }
function change(params, patch) { return updateCrossDomainRouteParams(new URLSearchParams(params), patch); }

test('default view is comparisons', () => assert.equal(state('').view, 'evidence'));
test('default run ID is empty', () => assert.equal(state('').selectedRunId, ''));
test('default limit is 25', () => assert.equal(state('').filters.limit, '25'));
test('default filters empty', () => assert.equal(state('').filters.optimization_status, ''));
test('legacy deep-link review_run_id restored', () => assert.equal(state('review_run_id=run%2F1').selectedRunId, 'run/1'));
test('readiness view restored', () => assert.equal(state('cdo_view=readiness').view, 'readiness'));
test('plan view restored', () => assert.equal(state('cdo_view=plan').view, 'plan'));
test('invalid view falls back safely', () => assert.equal(state('cdo_view=garbage').view, 'evidence'));
test('invalid limit falls back', () => assert.equal(state('limit=90000').filters.limit, '25'));
test('valid limit 100 restored', () => assert.equal(state('limit=100').filters.limit, '100'));
test('selected run persists alongside review tab', () => {
  assert.deepEqual([state('review_run_id=id123&cdo_view=readiness').selectedRunId, state('review_run_id=id123&cdo_view=readiness').view], ['id123', 'readiness']);
});
const filterKeys = ['optimization_domain','optimization_status','objective_type','option_status','impact_direction','result_status'];
for (const key of filterKeys) {
  test(`${key} URL-filter read/write survives refresh`, () => {
    const changed = change('unrelated=kept&review_run_id=previous', { type: 'filter', key, value: 'sample' });
    assert.equal(state(changed).filters[key], 'sample');
    assert.equal(state(changed).selectedRunId, '');
    assert.equal(changed.get('unrelated'), 'kept');
  });
}
test('changing filter returns to evidence tab for immediate results', () => assert.equal(change('cdo_view=plan',{type:'filter',key:'optimization_domain',value:'inventory'}).has('cdo_view'),false));
test('changing limit updates URL and unselects stale run', () => {
  const next = change('review_run_id=old', { type:'filter',key:'limit',value:'200' });
  assert.equal(state(next).filters.limit, '200'); assert.equal(state(next).selectedRunId, '');
});
test('default limit represented by no unnecessary query parameter', () => {
  assert.equal(change('limit=200', {type:'filter',key:'limit',value:'25'}).has('limit'), false);
});
test('clearing one filter removes only that filter and prior selected run', () => {
  const next=change('optimization_domain=procurement&urgency=high&review_run_id=prior', {type:'filter',key:'optimization_domain',value:''});
  assert.equal(next.has('optimization_domain'), false);assert.equal(next.get('urgency'),'high');assert.equal(next.has('review_run_id'),false);
});
test('selecting a run preserves filters', () => {
  const next=change('optimization_domain=inventory&limit=50', {type:'run',value:'r1'});
  assert.equal(next.get('optimization_domain'),'inventory');assert.equal(next.get('review_run_id'),'r1');
});
test('selecting a run preserves unrelated params', () => {
  assert.equal(change('other=1',{type:'run',value:'r1'}).get('other'),'1');
});
test('deselecting run removes URL key', () => assert.equal(change('review_run_id=a',{type:'run',value:''}).has('review_run_id'),false));
test('setting same run can change view atomically', () => {
  const next=change('foo=bar',{type:'run',value:'run123',view:'plan'});
  assert.equal(next.get('foo'),'bar');assert.equal(state(next).view,'plan');assert.equal(state(next).selectedRunId,'run123');
});
test('setting run and view does not drop earlier filter parameters', () => {
  const next=change('optimization_domain=inventory',{type:'run',value:'run123',view:'plan'});
  assert.equal(next.get('optimization_domain'),'inventory');
});
test('tab change preserves run', () => assert.equal(change('review_run_id=r1',{type:'view',value:'readiness'}).get('review_run_id'),'r1'));
test('tab change preserves filters', () => assert.equal(change('optimization_domain=inventory',{type:'view',value:'readiness'}).get('optimization_domain'),'inventory'));
test('switching to comparisons removes extra tab key', () => assert.equal(change('cdo_view=readiness',{type:'view',value:'evidence'}).has('cdo_view'),false));
test('clear filters removes all seven filter query keys', () => {
  const input=new URLSearchParams('review_run_id=r1&cdo_view=plan&foo=bar');
  for(const key of filterKeys)input.set(key,'foo');input.set('limit','100');
  const next=updateCrossDomainRouteParams(input,{type:'clear-filters'});
  for(const key of [...filterKeys,'limit'])assert.equal(next.has(key),false);
});
test('clear filters removes stale selected run', () => assert.equal(change('review_run_id=old',{type:'clear-filters'}).has('review_run_id'),false));
test('clear filters keeps unrelated navigation params', () => assert.equal(change('foo=123',{type:'clear-filters'}).get('foo'),'123'));
test('clear filters returns to evidence list', () => assert.equal(change('cdo_view=plan',{type:'clear-filters'}).has('cdo_view'),false));
test('history Back restores preceding filter snapshot', () => {
  const before=change('',{type:'filter',key:'optimization_domain',value:'inventory'});
  const after=change(before,{type:'filter',key:'optimization_domain',value:'procurement'});
  assert.equal(state(after).filters.optimization_domain,'procurement');
  assert.equal(state(before).filters.optimization_domain,'inventory');
});
test('history Back restores selected run and selected view', () => {
  const before=change('',{type:'run',value:'run01',view:'plan'});
  const after=change(before,{type:'view',value:'readiness'});
  assert.equal(state(after).view,'readiness');
  assert.equal(state(before).view,'plan');assert.equal(state(before).selectedRunId,'run01');
});
test('blank query value resolves to default filter', () => assert.equal(state('limit=&optimization_domain=').filters.limit,'25'));
test('URL-encoded run identifiers round-trip correctly', () => {
  const next=change('',{type:'run',value:'account:a&b'});
  assert.equal(state(next).selectedRunId,'account:a&b');
});
test('trim surrounding space on selected run id', () => assert.equal(state('review_run_id=%20run1%20').selectedRunId,'run1'));
test('update does not mutate original URLSearchParams', () => {
  const before=new URLSearchParams('foo=bar');change(before,{type:'run',value:'foo'});assert.equal(before.has('review_run_id'),false);
});
test('view state owned by URL, not local React useState', () => assert.doesNotMatch(page,/\[view,\s*setView\]\s*=\s*useState/));
test('filters owned by URL, not local React useState', () => assert.doesNotMatch(page,/\[filters,\s*setFilters\]\s*=\s*useState/));
test('run selection owned by URL, not a duplicate local state', () => assert.doesNotMatch(page,/\[selectedRunId,\s*setSelectedRunId\]\s*=\s*useState/));
test('all route updates use canonical route encoder', () => assert.match(page,/updateCrossDomainRouteParams\(current,/));
test('run create success sets run and plan in one update', () => assert.equal((page.match(/openRunInPlan\(result\.optimization_run_id\)/g)||[]).length,2));
test('filtered empty state still provides clear filters', () => assert.match(page,/hasActiveEvidenceFilters \? <button[^>]+onClick=\{clearFilters\}/));
test('filter controls remain visible for zero matching evidence', () => assert.match(page,/hasEvidence \|\| hasActiveEvidenceFilters \? <section className="card cross-domain-filters"/));
test('query to backend stays run-scoped', () => assert.match(page,/params.set\('review_run_id', selectedRunId\)/));
test('URL route writes do not replace browser history', () => assert.doesNotMatch(page,/setSearchParams\([^;]*\{ replace: true \}\)/));

if (base) {
  const previous=readFileSync(base,'utf8');
  test('FE202 reproduces view state loss on refresh',()=>assert.match(previous,/\[view, setView\] = useState<OptimizationView>\('evidence'\)/));
  test('FE202 reproduces filter state loss on refresh',()=>assert.match(previous,/\[filters, setFilters\] = useState<OptimizationFilterState>\(DEFAULT_FILTERS\)/));
}
console.log(`CROSS-DOMAIN DURABLE ROUTE: ${checks}/${checks} PASS`);
