/** Keep the supplier directory URL honest when leaving an exact supplier deep link. */
export function supplierDirectorySearchParams(current: URLSearchParams, value: string): URLSearchParams {
  const next = new URLSearchParams(current);
  next.delete('supplier_id');
  const search = value.trim();
  if (search) next.set('search', search);
  else next.delete('search');
  return next;
}

/** "Show all suppliers" must remove both the exact-supplier selection and stale search text. */
export function supplierDirectoryShowAllParams(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current);
  next.delete('supplier_id');
  next.delete('search');
  return next;
}
