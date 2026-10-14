/** Tenant-facing Purchase Order provenance. Original technical evidence remains in the
 * audit trail and recommendation decision links; do not mutate the API payload. */
export function purchaseOrderBusinessNotes(notes: string | null | undefined, productNames: string[] = []): string {
  const original = String(notes || '');
  const lines = original.split(/\r?\n/);
  const legacy = lines.some((line) => /^Recommendation keys:\s*product:[0-9a-f-]+/i.test(line));
  if (!legacy) return original;
  const filtered = lines.filter((line) => !/^Recommendation keys:\s*product:[0-9a-f-]+/i.test(line));
  const names = [...new Set(productNames.map((name) => name.trim()).filter(Boolean))];
  if (names.length && !filtered.some((line) => /^Recommended products:/i.test(line))) {
    filtered.push(`Recommended products: ${names.join(', ')}`);
  }
  return filtered.join('\n');
}

/** Legacy generated lines contained an internal product id and raw calculation fields. */
export function purchaseOrderBusinessItemNotes(notes: string | null | undefined, productName?: string | null): string {
  const original = String(notes || '');
  if (/^Generated from product:[0-9a-f-]+;\s*urgency=/i.test(original)) {
    return productName?.trim()
      ? `Generated from replenishment recommendation for ${productName.trim()}.`
      : 'Generated from replenishment recommendation.';
  }
  return original;
}
