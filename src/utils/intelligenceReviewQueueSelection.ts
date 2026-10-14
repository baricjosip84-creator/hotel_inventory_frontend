/** Select exactly one review from the currently loaded page of the review queue.
 * Never show another review in place of a requested source-action deep link.
 * When filters or pagination remove a local selection, fall back to the first visible item.
 */
export function selectVisibleIntelligenceReview<T extends { source_action_id?: string | null; review_id?: string | null }>(
  reviews: readonly T[],
  selectedLocalId: string | null,
  requestedSourceActionId: string | null
): T | undefined {
  if (requestedSourceActionId) {
    return reviews.find((review) => review.source_action_id === requestedSourceActionId);
  }
  return reviews.find((review) => (review.source_action_id || review.review_id) === selectedLocalId) || reviews[0];
}
