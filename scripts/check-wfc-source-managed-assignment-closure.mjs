import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { actionableWorkflowSteps, dropSourceManagedAssignmentStep, executionNextStepForComposer } from '../src/pages/workflowStateGuidance.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(root, 'src/pages/WorkflowAutomationComposerPage.tsx'), 'utf8');
let checked = 0;
function check(name, fn) { fn(); checked++; console.log(`PASS ${checked}: ${name}`); }
const input = ['review_source_context', 'assign_human_owner', 'execute_existing_governed_source_workflow', 'record_outcome_in_source_system'];

check('backend source_workflow hides assignment suggestion only', () => {
  assert.deepEqual(dropSourceManagedAssignmentStep(actionableWorkflowSteps(input, false, 'in_progress'), 'source_workflow'),
    ['review_source_context', 'execute_existing_governed_source_workflow', 'record_outcome_in_source_system']);
});
check('explicit unassigned still offers assignment', () => {
  assert.deepEqual(dropSourceManagedAssignmentStep(actionableWorkflowSteps(input, false, 'open'), 'unassigned'), input);
});
check('unknown / null / pending / offered does not suppress assignment', () => {
  for (const state of [undefined, null, '', 'unknown', 'pending', 'offered']) {
    assert.deepEqual(dropSourceManagedAssignmentStep(actionableWorkflowSteps(input, false, 'open'), state), input);
  }
});
check('a real named owner remains covered by existing helper', () => {
  assert.deepEqual(dropSourceManagedAssignmentStep(actionableWorkflowSteps(input, true, 'in_progress'), 'assigned'),
    ['review_source_context', 'execute_existing_governed_source_workflow', 'record_outcome_in_source_system']);
});
check('terminal source never suggests further work', () => {
  assert.deepEqual(dropSourceManagedAssignmentStep(actionableWorkflowSteps(input, false, 'resolved'), 'source_workflow'), []);
});
check('approval steps and their order remain intact', () => {
  const approved = ['review_source_context', 'capture_required_approval', 'execute_existing_governed_source_workflow', 'record_outcome_in_source_system'];
  assert.deepEqual(dropSourceManagedAssignmentStep(actionableWorkflowSteps(approved, false, 'open'), 'source_workflow'), approved);
  assert.deepEqual(dropSourceManagedAssignmentStep(actionableWorkflowSteps(approved, false, 'approved'), 'source_workflow'),
    ['review_source_context', 'execute_existing_governed_source_workflow', 'record_outcome_in_source_system']);
});
check('read-only execution guidance unchanged', () => {
  assert.match(executionNextStepForComposer('execution', 'in_progress', true), /assigned and in progress/);
});
check('actual page invokes helper with backend responsibility state', () => {
  assert.match(page, /dropSourceManagedAssignmentStep\(\s*actionableWorkflowSteps\(blueprint\.recommended_steps_preview \|\| \[\], responsibilityAlreadyAssigned\(blueprint\), triggerStatus\),\s*blueprint\.responsibility\?\.assignment_state/);
});
check('source routing and read-only guarantees retained', () => {
  assert.ok(page.includes("params.set('alert_id', sourceId)"));
  assert.ok(!page.includes("method: 'POST'"));
});
console.log(`WFC source-managed ownership closure: ${checked}/${checked} PASS`);
