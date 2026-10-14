/** Only finite, recorded quantities may be used in user-facing stock messages. */
export function safeInventoryUsageStockQuantity(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
