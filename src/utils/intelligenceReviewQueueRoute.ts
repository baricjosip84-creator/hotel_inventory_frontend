/** Durable, untrusted URL state for the tenant Intelligence Review queue.
 * The selected local review never replaces the authoritative source_action_id deep link.
 * URLSearchParams is the only browser-dependent type; helpers have no side effects.
 */
const FIELD_DEFAULTS: Record<string, string> = {
  review_domain: 'all', review_state: 'all', review_urgency: 'all', review_q: '',
  review_sort: 'priority', review_offset: '0', selected_review_id: ''
};

export function readIntelligenceReviewQueueRoute(params: URLSearchParams) {
  const offsetText = params.get('review_offset') || '0';
  const offsetNumber = Number(offsetText);
  // Limit corrupted/malicious offsets and do not run arbitrary large scans.
  const offset = /^\d{1,7}$/.test(offsetText) && Number.isSafeInteger(offsetNumber)
    && offsetNumber >= 0 && offsetNumber <= 1000000 ? offsetNumber : 0;
  return {
    domain: params.get('review_domain') || 'all',
    state: params.get('review_state') || 'all',
    urgency: params.get('review_urgency') || 'all',
    search: (params.get('review_q') || '').slice(0, 200),
    sort: params.get('review_sort') || 'priority',
    offset,
    selectedReviewId: params.get('selected_review_id') || null
  };
}

export function withIntelligenceReviewQueueChange(
  params: URLSearchParams,
  key: keyof typeof FIELD_DEFAULTS,
  value: string,
  options: { resetPage?: boolean } = {}
): URLSearchParams {
  const next = new URLSearchParams(params);
  const safeValue = key === 'review_q' ? value.slice(0, 200) : value;
  if (safeValue === FIELD_DEFAULTS[key]) next.delete(key);
  else next.set(key, safeValue);
  // A filter or page change invalidates an old selected review. Do not show a different
  // record as if it were the same selection. Deep-link source_action_id is preserved.
  if (options.resetPage) next.delete('review_offset');
  if (options.resetPage || key === 'review_offset') next.delete('selected_review_id');
  return next;
}
