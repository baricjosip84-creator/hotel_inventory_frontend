/** Conservative view-only guidance based on the actual linked source status. */
export function isTerminalSourceStatus(value: string | null | undefined): boolean {
  return ['completed', 'fulfilled', 'cancelled', 'canceled', 'resolved'].includes(String(value || '').trim().toLowerCase());
}
export function actionableWorkflowSteps(
  steps: readonly string[],
  alreadyAssigned: boolean,
  sourceStatus: string | null | undefined
): string[] {
  const status = String(sourceStatus || '').trim().toLowerCase();
  if (isTerminalSourceStatus(status)) return [];
  return steps.filter((step) => {
    if (step === 'assign_human_owner' && alreadyAssigned) return false;
    if (step === 'capture_required_approval' && status === 'approved') return false;
    // An approved source has already crossed its approval gate. It may still need
    // controlled execution and outcome capture; never remove those steps here.
    return true;
  });
}

/** FT188 / WFC-DEF-001: read-only, state-specific next action for execution plans.
 * The original backend sentence remains available for non-execution plans.
 * Do not claim a task has an owner unless the responsibility field proves it.
 */
export function executionNextStepForComposer(
  sourceActionDomain: string | null | undefined,
  sourceStatus: string | null | undefined,
  alreadyAssigned: boolean
): string | null {
  if (sourceActionDomain !== 'execution' || isTerminalSourceStatus(sourceStatus)) return null;
  const status = String(sourceStatus || '').trim().toLowerCase();
  if (status === 'blocked') {
    return alreadyAssigned
      ? 'This task already has an owner. Review its blocker in Execution Tasks before resuming.'
      : 'This task is blocked and unassigned. Review the blocker and ownership in Execution Tasks.';
  }
  if (status === 'in_progress') {
    return alreadyAssigned
      ? 'This task is assigned and in progress. Continue work through Execution Tasks.'
      : 'This task is in progress without an owner. An authorized worker can take responsibility in Execution Tasks.';
  }
  return alreadyAssigned
    ? 'This task already has an owner. Review or start it through Execution Tasks as appropriate.'
    : 'This task is unassigned. Arrange ownership through Execution Tasks before starting work.';
}
