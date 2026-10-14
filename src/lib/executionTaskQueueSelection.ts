/** Keep a directly opened task separate from the filtered/paginated queue.
 * The queue and its pagination must reflect only the list API response.
 */
export function resolveExecutionTaskQueue<T extends { id: string }>(
  rows: readonly T[],
  pageSize: number,
  requestedId: string,
  directTask: T | null = null
): {
  queue: T[];
  selectedLinkedTask: T | null;
  linkedOutsideQueue: boolean;
  hasNextPage: boolean;
} {
  const size = Math.max(1, Math.floor(pageSize));
  const queue = rows.slice(0, size);
  const requested = requestedId.trim();
  const withinQueue = requested ? queue.find((item) => item.id === requested) || null : null;
  const selectedLinkedTask = withinQueue || (directTask?.id === requested ? directTask : null);
  return {
    queue,
    selectedLinkedTask,
    linkedOutsideQueue: Boolean(requested && selectedLinkedTask && !withinQueue),
    hasNextPage: rows.length > size
  };
}
