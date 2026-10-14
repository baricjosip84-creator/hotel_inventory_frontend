/** Leave an exact location deep link when a person starts browsing the directory. */
export function storageLocationDirectoryFilterParams(
  current: URLSearchParams,
  search: string,
  zone: string
): URLSearchParams {
  const next = new URLSearchParams(current);
  next.delete('location_id');
  if (search.trim()) next.set('search', search.trim());
  else next.delete('search');
  if (zone.trim()) next.set('zone', zone.trim());
  else next.delete('zone');
  return next;
}

/** Reset ALL directory restrictions, including the otherwise invisible deep link. */
export function storageLocationDirectoryShowAllParams(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current);
  next.delete('location_id');
  next.delete('search');
  next.delete('zone');
  return next;
}
