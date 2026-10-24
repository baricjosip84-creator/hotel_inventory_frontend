/**
 * Read-query retry policy. A HTTP 429 response means the server is enforcing
 * a limit; retrying it immediately adds traffic without helping the user.
 * Other transient query failures retain the pre-existing single retry.
 * This policy is intentionally read-only: no mutation, auth, or rate-limit
 * thresholds are changed here.
 */
export function shouldRetryReadQuery(failureCount: number, error: unknown): boolean {
  const status = error !== null && typeof error === 'object' && 'status' in error
    ? (error as { status?: unknown }).status
    : undefined;
  if (status === 429) return false;
  return failureCount < 1;
}
