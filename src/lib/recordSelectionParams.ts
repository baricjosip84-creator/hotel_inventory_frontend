/** Keep record selection in the URL so refresh, Back and Forward reopen the right record. */
export function selectedRecordId(
  searchParams: URLSearchParams,
  primaryKey: string,
  legacyKey: string
): string {
  return searchParams.get(primaryKey)?.trim() || searchParams.get(legacyKey)?.trim() || '';
}

/** Preserve unrelated page parameters and remove the legacy duplicate selection key. */
export function withSelectedRecordId(
  searchParams: URLSearchParams,
  primaryKey: string,
  legacyKey: string,
  recordId: string
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  const id = recordId.trim();
  if (id) next.set(primaryKey, id);
  else next.delete(primaryKey);
  next.delete(legacyKey);
  return next;
}
