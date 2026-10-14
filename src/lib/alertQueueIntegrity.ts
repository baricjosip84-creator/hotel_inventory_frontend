/**
 * Alert queue presentation rules. A separately fetched deep-linked alert can
 * appear alongside filtered results, but must never change their KPI counts.
 */
export type AlertQueueRecord = {
  id: string;
  resolved: boolean;
  severity: string;
  acknowledged: boolean;
};

export function mergeFocusedAlert<T extends { id: string }>(filtered: readonly T[], focused: T | null | undefined): T[] {
  if (!focused) return [...filtered];
  return [focused, ...filtered.filter((row) => row.id !== focused.id)];
}

export function isFocusedAlertOutsideFilters<T extends { id: string }>(
  filtered: readonly T[], focused: T | null | undefined
): boolean {
  return Boolean(focused && !filtered.some((row) => row.id === focused.id));
}

export function summarizeFilteredAlerts<T extends AlertQueueRecord>(filtered: readonly T[]) {
  return {
    total: filtered.length,
    unresolved: filtered.filter((row) => !row.resolved).length,
    critical: filtered.filter((row) => !row.resolved && row.severity === 'critical').length,
    unacknowledged: filtered.filter((row) => !row.resolved && !row.acknowledged).length
  };
}

/** Missing measurements are unknown, not zero; real numeric zero remains zero. */
export function formatNullableAlertQuantity(
  value: number | string | null | undefined,
  unit: string | null | undefined,
  formatNumber: (value: number) => string
): string {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  const text = formatNumber(numeric);
  return unit ? `${text} ${unit}` : text;
}
