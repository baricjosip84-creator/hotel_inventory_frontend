/** Compare submitted field values with the separately fetched stored representation.
 * No tenant identity or permissions are inferred from the response: the caller must
 * request the exact original tenant-scoped entity through its authorized endpoint.
 */
export type CustomFieldReadbackRow = { field_key: string; data_type: string; value: unknown };

export function verifyCustomFieldReadback(
  submitted: Record<string, string | boolean>,
  fetched: CustomFieldReadbackRow[]
): boolean {
  if (!Array.isArray(fetched)) return false;
  const rows = new Map(fetched.map((row) => [row.field_key, row]));
  return Object.entries(submitted).every(([fieldKey, expected]) => {
    const row = rows.get(fieldKey);
    if (!row) return false;
    if (expected === '' || expected === null || expected === undefined) return row.value === null;
    if (row.value === null || row.value === undefined) return false;
    if (row.data_type === 'boolean') return typeof expected === 'boolean' && row.value === expected;
    if (row.data_type === 'number') return Number.isFinite(Number(expected)) && typeof row.value === 'number' && row.value === Number(expected);
    // Text, select, and date values should survive verbatim, without implicit coercion.
    return typeof expected === 'string' && typeof row.value === 'string' && row.value === expected;
  });
}
