/** Operator-facing gates for operational insights and feed freshness. */
export function isUnusualOutboundTier(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return ['watch', 'high', 'critical'].includes(value.trim().toLowerCase());
}

/** A failed background refetch must not claim that the feed is up-to-date. */
export function feedRefreshStatus(hasError: boolean, isFetching: boolean): 'Refresh failed' | 'Refreshing…' | 'Auto-refresh on' {
  if (isFetching) return 'Refreshing…';
  if (hasError) return 'Refresh failed';
  return 'Auto-refresh on';
}
