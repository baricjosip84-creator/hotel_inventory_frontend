import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(resolve(root, 'src/pages/CrossDomainOptimizationPage.tsx'), 'utf8');
const destination = readFileSync(resolve(root, 'src/pages/ReplenishmentPlanningPage.tsx'), 'utf8');
let checks = 0;
const test = (name, fn) => { fn(); checks += 1; console.log(`PASS ${checks}: ${name}`); };

// Run the actual expression from the approved-run JSX rather than a handwritten imitation.
const labelMatch = page.match(/\{(sourcePath\.split\('\?'\)\[0\] === '\/replenishment-planning') \? ui\('Open Replenishment Planning'\) : ui\('Open Execution Tasks'\)\}/);
assert.ok(labelMatch, 'Approved-run action must label based on pathname, ignoring scoped query string');
const labelForPath = new Function('sourcePath', 'ui', `return ${labelMatch[1]} ? ui('Open Replenishment Planning') : ui('Open Execution Tasks')`);
const ui = (key) => key;

test('bare replenishment route labeled correctly', () => assert.equal(labelForPath('/replenishment-planning', ui), 'Open Replenishment Planning'));
test('product-specific replenishment route labeled correctly', () => assert.equal(labelForPath('/replenishment-planning?source_par_level_id=parABC', ui), 'Open Replenishment Planning'));
test('fully scoped origin plan/item query labeled correctly', () => assert.equal(labelForPath('/replenishment-planning?source_par_level_id=parABC&source_optimization_plan_id=planXY&source_optimization_item_id=itemXY', ui), 'Open Replenishment Planning'));
test('execution tasks route retains execution task wording', () => assert.equal(labelForPath('/execution-tasks', ui), 'Open Execution Tasks'));
test('execution task with query retains execution task wording', () => assert.equal(labelForPath('/execution-tasks?task_id=abc', ui), 'Open Execution Tasks'));
test('route lookalike is not labeled replenishment', () => assert.equal(labelForPath('/replenishment-planning-not-real', ui), 'Open Execution Tasks'));
test('approved action navigates original fully scoped URL unchanged', () => assert.ok(page.includes('onClick={() => navigate(sourcePath)}')));
test('origin helper generates an exact source par-level filter', () => assert.ok(page.includes('const params = new URLSearchParams({ source_par_level_id: sourceParLevelId });')));
test('origin helper retains original optimization plan identifier', () => assert.ok(page.includes("params.set('source_optimization_plan_id', sourceOptimizationPlanId)")));
test('origin helper retains original optimization item identifier', () => assert.ok(page.includes("params.set('source_optimization_item_id', sourceOptimizationItemId)")));
test('destination reads source par-level deep link', () => assert.ok(destination.includes("searchParams.get('source_par_level_id')?.trim()")));
test('destination filters saved runs by source par-level ID', () => assert.ok(destination.includes("queryFn: () => listRuns(sourceParLevelId)")));
test('approved action is still human-controlled', () => assert.ok(page.includes('{approved && sourcePath ? <div className="cross-domain-handoffs">')));
test('user does not execute inventory mutations by clicking handoff', () => assert.ok(page.includes('<button className="button" type="button" onClick={() => navigate(sourcePath)}')));
console.log(`PASS ${checks}/${checks}: FT116 selected-run replenishment handoff label`);
