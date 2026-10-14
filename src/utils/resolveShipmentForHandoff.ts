/**
 * Find a scanner-linked shipment by exact ID. The registry is not authoritative
 * for a deep link; a missing list row requires a direct, permission-checked GET.
 * This helper only reads. Receiving remains in the normal guarded flow.
 */
export async function resolveShipmentForHandoff<T extends { id: string }>(
  id: string,
  loaded: readonly T[],
  fetchById: (id: string) => Promise<T>
): Promise<{ shipment: T; source: 'list' | 'direct' }> {
  if (!id.trim()) throw new Error('Shipment ID is required.');
  const existing = loaded.find((item) => item.id === id);
  if (existing) return { shipment: existing, source: 'list' };

  const shipment = await fetchById(id);
  if (!shipment || shipment.id !== id) {
    throw new Error('Shipment lookup returned a different record.');
  }
  return { shipment, source: 'direct' };
}
