/** The active outbound work area belongs in the browser history, not ephemeral component state. */
export const OUTBOUND_ROUTE_TABS = ['orders', 'customers', 'returns', 'trace'] as const;
export type OutboundRouteTab = typeof OUTBOUND_ROUTE_TABS[number];

export type OutboundTabAccess = { customers: boolean; returns: boolean };

export function readOutboundRouteTab(params: URLSearchParams, access: OutboundTabAccess): OutboundRouteTab {
  const raw = params.get('tab') || 'orders';
  const tab = OUTBOUND_ROUTE_TABS.includes(raw as OutboundRouteTab) ? raw as OutboundRouteTab : 'orders';
  if (tab === 'customers' && !access.customers) return 'orders';
  if (tab === 'returns' && !access.returns) return 'orders';
  return tab;
}

/** Update only the Outbound-owned tab key. Preserve unrelated route/attribution keys. */
export function updateOutboundRouteTab(params: URLSearchParams, tab: OutboundRouteTab): URLSearchParams {
  const next = new URLSearchParams(params);
  if (tab === 'orders') next.delete('tab');
  else next.set('tab', tab);
  return next;
}
