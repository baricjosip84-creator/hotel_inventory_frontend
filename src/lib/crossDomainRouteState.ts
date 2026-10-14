/** Cross-Domain Optimization review state is URL-owned so refresh and Back restore it. */
export type CrossDomainView = 'evidence' | 'plan' | 'readiness';
export type CrossDomainFilterState = {
  optimization_domain: string;
  optimization_status: string;
  objective_type: string;
  option_status: string;
  impact_direction: string;
  result_status: string;
  limit: string;
};

export const DEFAULT_CROSS_DOMAIN_FILTERS: Readonly<CrossDomainFilterState> = {
  optimization_domain: '', optimization_status: '', objective_type: '', option_status: '', impact_direction: '', result_status: '', limit: '25'
};

const FILTER_KEYS = Object.keys(DEFAULT_CROSS_DOMAIN_FILTERS) as Array<keyof CrossDomainFilterState>;
const VIEWS: CrossDomainView[] = ['evidence', 'plan', 'readiness'];
const LIMITS = ['25', '50', '100', '200'];

export function readCrossDomainRouteState(params: URLSearchParams): {
  view: CrossDomainView;
  selectedRunId: string;
  filters: CrossDomainFilterState;
} {
  const rawView = params.get('cdo_view') || 'evidence';
  const filters = { ...DEFAULT_CROSS_DOMAIN_FILTERS };
  for (const key of FILTER_KEYS) {
    const value = params.get(key)?.trim();
    if (!value) continue;
    if (key === 'limit' && !LIMITS.includes(value)) continue;
    filters[key] = value;
  }
  return {
    view: VIEWS.includes(rawView as CrossDomainView) ? rawView as CrossDomainView : 'evidence',
    selectedRunId: params.get('review_run_id')?.trim() || '',
    filters
  };
}

export type CrossDomainRouteUpdate =
  | { type: 'view'; value: CrossDomainView }
  | { type: 'run'; value: string; view?: CrossDomainView }
  | { type: 'filter'; key: keyof CrossDomainFilterState; value: string }
  | { type: 'clear-filters' };

export function updateCrossDomainRouteParams(params: URLSearchParams, update: CrossDomainRouteUpdate): URLSearchParams {
  const next = new URLSearchParams(params);
  if (update.type === 'view') {
    if (update.value === 'evidence') next.delete('cdo_view');
    else next.set('cdo_view', update.value);
  } else if (update.type === 'run') {
    if (update.value.trim()) next.set('review_run_id', update.value.trim());
    else next.delete('review_run_id');
    if (update.view) {
      if (update.view === 'evidence') next.delete('cdo_view');
      else next.set('cdo_view', update.view);
    }
  } else if (update.type === 'filter') {
    const value = update.value.trim();
    if (!value || (update.key === 'limit' && value === DEFAULT_CROSS_DOMAIN_FILTERS.limit)) next.delete(update.key);
    else next.set(update.key, value);
    // A changed evidence scope must not silently leave a previous run selected.
    next.delete('review_run_id');
    // Filtering acts on the comparisons list, not a previous plan/review tab.
    next.delete('cdo_view');
  } else {
    FILTER_KEYS.forEach((key) => next.delete(key));
    next.delete('review_run_id');
    next.delete('cdo_view');
  }
  return next;
}
