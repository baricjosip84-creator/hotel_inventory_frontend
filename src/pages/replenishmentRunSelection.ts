/**
 * Selecting an exact saved planning run must never silently open the first
 * unrelated run when a bookmarked selection is missing or out of scope.
 */
export function resolveReplenishmentRunSelection(
  requestedRunId: string,
  availableRunIds: readonly string[] | undefined
): { runId: string; unavailable: boolean } {
  if (!availableRunIds) return { runId: '', unavailable: false };
  const requested = requestedRunId.trim();
  if (requested) {
    const found = availableRunIds.includes(requested);
    return { runId: found ? requested : '', unavailable: !found };
  }
  return { runId: availableRunIds[0] || '', unavailable: false };
}

/** Preserve Cross-Domain provenance and other query parameters as selections change. */
export function withReplenishmentRunSelection(params: URLSearchParams, runId: string): URLSearchParams {
  const next = new URLSearchParams(params);
  if (runId.trim()) next.set('run_id', runId.trim());
  else next.delete('run_id');
  return next;
}
