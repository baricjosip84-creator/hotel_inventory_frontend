/** Local suggestion only: the backend remains authoritative for uniqueness/version conflicts. */
export function isValidCustomFieldKey(key: string): boolean {
  return /^[a-z0-9_]{1,80}$/.test(key);
}

export function suggestCustomFieldKey(label: string, usedKeys: readonly string[]): string {
  const base = label.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80).replace(/_+$/g, '');
  if (!base) return '';
  const existing = new Set(usedKeys.map((key) => key.toLowerCase()));
  if (!existing.has(base)) return base;
  for (let suffix = 2; suffix < 100000; suffix += 1) {
    const ending = `_${suffix}`;
    const candidate = base.slice(0, 80 - ending.length).replace(/_+$/g, '') + ending;
    if (!existing.has(candidate)) return candidate;
  }
  return '';
}
