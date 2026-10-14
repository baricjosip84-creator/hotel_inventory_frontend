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
