/**
 * Only the known server-generated execution-request closure template is
 * localized. User-edited task text and adapter labels remain unchanged.
 * The original title and description are never mutated or saved back.
 */
type DisplayTask = {
  source_type?: string | null;
  title?: string | null;
  description?: string | null;
};

export const EXECUTION_CLOSURE_TITLE_PREFIX = 'Close approved execution request: ';
export const EXECUTION_CLOSURE_DESCRIPTION =
  'Review and close the approved execution request through the operational task queue. ' +
  'This task is a human closure record only; it does not execute adapters or mutate inventory.';

export function displayMobileExecutionSystemTask(
  task: DisplayTask,
  ui: (englishText: string) => string
): { title: string | null | undefined; description: string | null | undefined } {
  const title = task.title;
  const description = task.description;
  // The source type, unchanged server template, and nonempty adapter label
  // must all match. Otherwise display the stored business text verbatim.
  if (
    task.source_type !== 'execution_request' ||
    description !== EXECUTION_CLOSURE_DESCRIPTION ||
    !title?.startsWith(EXECUTION_CLOSURE_TITLE_PREFIX)
  ) return { title, description };

  const adapterLabel = title.slice(EXECUTION_CLOSURE_TITLE_PREFIX.length);
  if (!adapterLabel.trim()) return { title, description };

  return {
    title: `${ui('Close approved execution request:')} ${adapterLabel}`,
    description: ui(EXECUTION_CLOSURE_DESCRIPTION),
  };
}
