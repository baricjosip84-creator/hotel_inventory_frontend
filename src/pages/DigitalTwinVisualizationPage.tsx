import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import './DigitalTwinVisualizationPage.css';

type DigitalTwinView = 'context' | 'limits' | 'diagnostics';
type TwinDomain = 'facility' | 'inventory_flow' | 'execution_flow' | 'supplier_flow' | 'risk_propagation' | 'control_tower' | 'multi_domain';
type TwinViewMode = 'topology' | 'flow_map' | 'risk_overlay' | 'congestion_heatmap' | 'dependency_map';
type Urgency = 'critical' | 'high' | 'medium' | 'low';
type ResultLimit = '25' | '50' | '75' | '100';

type TwinNode = {
  node_key?: string;
  node_id?: string;
  node_type?: string;
  twin_domain?: string;
  label?: string;
  status?: string;
  importance_score?: number | null;
  observed_at?: string | null;
  updated_at?: string | null;
  source_surface?: string | null;
};

type TwinEdge = {
  edge_key?: string;
  edge_id?: string;
  relationship?: string;
  source_label?: string | null;
  target_label?: string | null;
  twin_domain?: string;
  status?: string;
  confidence_score?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type TwinOverlay = {
  overlay_key?: string;
  overlay_id?: string;
  overlay_type?: string;
  twin_domain?: string;
  urgency?: string;
  priority_score?: number | null;
  confidence_score?: number | null;
  title?: string;
  summary?: string | null;
  source_surface?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DigitalTwinResponse = {
  definition?: {
    execution_mode?: string;
    [key: string]: unknown;
  };
  access?: {
    can_view_diagnostics?: boolean;
  };
  filters?: {
    twin_domain?: string | null;
    view_mode?: string | null;
    urgency?: string | null;
    limit?: number;
  };
  summary?: {
    total_nodes?: number;
    total_edges?: number;
    total_overlays?: number;
    critical_overlays?: number;
    risk_overlays?: number;
    by_domain?: Record<string, number>;
    by_overlay_type?: Record<string, number>;
  };
  guidance?: {
    recommended_view_mode?: string | null;
    visualization_guidance?: string;
    perspective_guidance?: string;
    congestion_heatmap_guidance?: string;
    risk_propagation_guidance?: string;
    [key: string]: unknown;
  };
  nodes?: TwinNode[];
  edges?: TwinEdge[];
  overlays?: TwinOverlay[];
  non_mutation_guarantee?: boolean;
  generated_at?: string;
  [key: string]: unknown;
};

const DOMAIN_FILTERS: Array<{ value: 'all' | TwinDomain; label: string }> = [
  { value: 'all', label: 'All operational areas' },
  { value: 'facility', label: 'Facilities' },
  { value: 'inventory_flow', label: 'Inventory flow' },
  { value: 'execution_flow', label: 'Execution flow' },
  { value: 'supplier_flow', label: 'Supplier flow' },
  { value: 'risk_propagation', label: 'Risk propagation' },
  { value: 'control_tower', label: 'Control tower' },
  { value: 'multi_domain', label: 'Multiple areas' }
];

const PERSPECTIVE_FILTERS: Array<{ value: 'all' | TwinViewMode; label: string }> = [
  { value: 'all', label: 'Recommended perspective' },
  { value: 'topology', label: 'Topology review' },
  { value: 'flow_map', label: 'Flow review' },
  { value: 'risk_overlay', label: 'Risk review' },
  { value: 'congestion_heatmap', label: 'Congestion review' },
  { value: 'dependency_map', label: 'Dependency review' }
];

const URGENCY_FILTERS: Array<{ value: 'all' | Urgency; label: string }> = [
  { value: 'all', label: 'All urgency levels' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const LIMIT_FILTERS: Array<{ value: ResultLimit; label: string }> = [
  { value: '25', label: '25 records per list' },
  { value: '50', label: '50 records per list' },
  { value: '75', label: '75 records per list' },
  { value: '100', label: '100 records per list' }
];

const DEFAULT_FILTERS = {
  twinDomain: 'all' as 'all' | TwinDomain,
  perspective: 'all' as 'all' | TwinViewMode,
  urgency: 'all' as 'all' | Urgency,
  limit: '50' as ResultLimit
};

const SOURCE_LABELS: Record<string, string> = {
  '/action-center': 'Open Action Center',
  '/alerts': 'Open Alerts',
  '/execution-tasks': 'Open Execution Tasks',
  '/real-time-operations-feed': 'Open Operations Feed',
  '/intelligence-review': 'Open Intelligence Review',
  '/ai-copilot': 'Open AI Copilot',
  '/inventory-reservations': 'Open Reservations',
  '/inventory-requisitions': 'Open Requisitions',
  '/procurement-recommendations': 'Open Procurement Recommendations',
  '/shipments': 'Open Shipments',
  '/reports': 'Open Reports',
  '/collaboration': 'Open Collaboration',
  '/products': 'Open Products',
  '/suppliers': 'Open Suppliers',
  '/storage-locations': 'Open Locations',
  '/stock': 'Open Stock',
  '/stock-transfers': 'Open Stock Transfers',
  '/purchase-orders': 'Open Purchase Orders'
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatIdentifier(value?: string | null, fallback = 'Not specified'): string {
  const normalized = String(value || '').trim();
  if (!normalized) return fallback;
  return normalized
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function readableTitle(value?: string | null, fallback = 'Operational context'): string {
  const normalized = String(value || '').trim();
  if (!normalized) return fallback;
  return /^[A-Z0-9_.-]+$/.test(normalized) ? formatIdentifier(normalized) : normalized;
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatPercent(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Not scored';
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

function formatScore(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Not scored';
  return String(Math.round(value));
}

function sourceSurfaceToAppPath(sourceSurface?: string | null): string | null {
  if (!sourceSurface) return null;
  if (sourceSurface === '/operational-action-center/summary' || sourceSurface === '/control-tower') return '/action-center';
  return Object.prototype.hasOwnProperty.call(SOURCE_LABELS, sourceSurface) ? sourceSurface : null;
}

async function fetchDigitalTwinSummary(filters: typeof DEFAULT_FILTERS): Promise<DigitalTwinResponse> {
  const params = new URLSearchParams({ limit: filters.limit });
  if (filters.twinDomain !== 'all') params.set('twin_domain', filters.twinDomain);
  if (filters.perspective !== 'all') params.set('view_mode', filters.perspective);
  if (filters.urgency !== 'all') params.set('urgency', filters.urgency);
  return apiRequest<DigitalTwinResponse>(`/operational-action-center/digital-twin-operational-visualization-summary?${params.toString()}`);
}

export default function DigitalTwinVisualizationPage() {
  const canViewDiagnostics = hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);
  const [view, setView] = useState<DigitalTwinView>('context');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const queryKey = useMemo(() => [
    'digital-twin-visualization',
    filters.twinDomain,
    filters.perspective,
    filters.urgency,
    filters.limit
  ], [filters]);

  const digitalTwinQuery = useQuery({
    queryKey,
    queryFn: () => fetchDigitalTwinSummary(filters)
  });

  if (digitalTwinQuery.isLoading) {
    return <div className="digital-twin-state digital-twin-state--loading">Loading operational context map…</div>;
  }

  if (digitalTwinQuery.error) {
    return (
      <div className="digital-twin-state digital-twin-state--error">
        <h2>Operational context could not be loaded</h2>
        <p>
          {digitalTwinQuery.error instanceof ApiError
            ? digitalTwinQuery.error.message
            : 'The Digital Twin summary is temporarily unavailable.'}
        </p>
        <button className="button button--secondary" type="button" onClick={() => digitalTwinQuery.refetch()}>Retry</button>
      </div>
    );
  }

  const response = digitalTwinQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const nodes = response?.nodes || [];
  const edges = response?.edges || [];
  const overlays = response?.overlays || [];
  const appliedLimit = response?.filters?.limit || Number(filters.limit);
  const hasActiveFilters = filters.twinDomain !== 'all'
    || filters.perspective !== 'all'
    || filters.urgency !== 'all'
    || filters.limit !== DEFAULT_FILTERS.limit;
  const hasContext = nodes.length > 0 || edges.length > 0 || overlays.length > 0;

  return (
    <div className="digital-twin-page">
      <section className="card digital-twin-intro">
        <div>
          <div className="digital-twin-eyebrow">Read-only operational context</div>
          <h2>Review relationships, dependencies, risks, and operational pressure</h2>
          <p className="card__subtext">
            This page automatically connects permitted products, suppliers, locations, stock, purchase orders, shipments, reservations, requisitions, transfers, execution tasks, alerts, stored graph evidence, and current operational context. It is not a live simulation and does not change stock, routes, labor, tasks, rooms, or source records.
          </p>
        </div>
        <div className="digital-twin-refresh">
          <span>Last refreshed</span>
          <strong>{formatDateTime(response?.generated_at)}</strong>
          <button className="button button--secondary" type="button" onClick={() => digitalTwinQuery.refetch()} disabled={digitalTwinQuery.isFetching}>
            {digitalTwinQuery.isFetching ? 'Refreshing…' : 'Refresh context'}
          </button>
        </div>
      </section>

      <section className="card digital-twin-filters" aria-labelledby="digital-twin-filter-title">
        <div className="digital-twin-section-heading">
          <div>
            <h2 id="digital-twin-filter-title">Filter the operational context</h2>
            <p className="card__subtext">Filters change only this read-only snapshot. The selected review perspective changes guidance; it does not generate a live diagram, simulation, or heatmap.</p>
          </div>
          {hasActiveFilters ? <button className="button button--secondary" type="button" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</button> : null}
        </div>
        <div className="digital-twin-filter-grid">
          <label>
            <span>Operational area</span>
            <select value={filters.twinDomain} onChange={(event) => setFilters((current) => ({ ...current, twinDomain: event.target.value as typeof filters.twinDomain }))}>
              {DOMAIN_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Review perspective</span>
            <select value={filters.perspective} onChange={(event) => setFilters((current) => ({ ...current, perspective: event.target.value as typeof filters.perspective }))}>
              {PERSPECTIVE_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Overlay urgency</span>
            <select value={filters.urgency} onChange={(event) => setFilters((current) => ({ ...current, urgency: event.target.value as typeof filters.urgency }))}>
              {URGENCY_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Maximum records per list</span>
            <select value={filters.limit} onChange={(event) => setFilters((current) => ({ ...current, limit: event.target.value as ResultLimit }))}>
              {LIMIT_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="digital-twin-filter-summary">
          <span>Area: <strong>{formatIdentifier(response?.filters?.twin_domain || 'all')}</strong></span>
          <span>Perspective: <strong>{formatIdentifier(response?.filters?.view_mode || guidance.recommended_view_mode || 'recommended')}</strong></span>
          <span>Urgency: <strong>{formatIdentifier(response?.filters?.urgency || 'all')}</strong></span>
          <span>Showing up to <strong>{appliedLimit}</strong> records in each list</span>
        </div>
      </section>

      <section className="digital-twin-summary-grid" aria-label="Digital Twin summary">
        <article className="card">
          <div className="card__label">Topology points</div>
          <div className="card__value">{numberValue(summary.total_nodes ?? nodes.length)}</div>
          <div className="card__subtext">Current permitted business records shown as read-only operational points.</div>
        </article>
        <article className="card">
          <div className="card__label">Dependencies</div>
          <div className="card__value">{numberValue(summary.total_edges ?? edges.length)}</div>
          <div className="card__subtext">Visible relationships and dependency paths between operational points.</div>
        </article>
        <article className="card">
          <div className="card__label">Operational overlays</div>
          <div className="card__value">{numberValue(summary.total_overlays ?? overlays.length)}</div>
          <div className="card__subtext">Distinct Action Center, event, coordination, and knowledge-graph risk context.</div>
        </article>
        <article className="card">
          <div className="card__label">Critical overlays</div>
          <div className="card__value">{numberValue(summary.critical_overlays)}</div>
          <div className="card__subtext">Critical context that may need prompt source-workflow review.</div>
        </article>
      </section>

      <div className="digital-twin-view-switch" role="tablist" aria-label="Digital Twin views">
        <button type="button" role="tab" aria-selected={view === 'context'} className={view === 'context' ? 'is-active' : ''} onClick={() => setView('context')}>Operational context</button>
        <button type="button" role="tab" aria-selected={view === 'limits'} className={view === 'limits' ? 'is-active' : ''} onClick={() => setView('limits')}>Safety and limits</button>
        {canViewDiagnostics ? (
          <button type="button" role="tab" aria-selected={view === 'diagnostics'} className={view === 'diagnostics' ? 'is-active' : ''} onClick={() => setView('diagnostics')}>Diagnostics</button>
        ) : null}
      </div>

      {view === 'context' ? (
        <section aria-labelledby="digital-twin-context-title">
          <div className="digital-twin-section-heading digital-twin-section-heading--outside">
            <div>
              <h2 id="digital-twin-context-title">Operational context</h2>
              <p className="card__subtext">{guidance.visualization_guidance || 'Use this read-only context to understand the situation, then continue in the governed source workflow.'}</p>
            </div>
            <div className="digital-twin-shortcuts">
              <Link className="button button--secondary" to="/workspace">Open Workspace</Link>
              <Link className="button button--secondary" to="/collaboration">Open Collaboration</Link>
            </div>
          </div>

          {!hasContext ? (
            <div className="digital-twin-state">
              <h3>No operational context matches the current filters</h3>
              <p>Clear the filters or confirm that products, suppliers, locations, stock, procurement records, reservations, requisitions, transfers, execution tasks, alerts, or stored graph evidence exist for this tenant.</p>
            </div>
          ) : (
            <>
              <section className="card digital-twin-context-section" aria-labelledby="digital-twin-node-title">
                <div className="digital-twin-section-heading">
                  <div>
                    <h3 id="digital-twin-node-title">Topology points</h3>
                    <p className="card__subtext">Current permitted business records and stored graph entities connected by the backend.</p>
                  </div>
                  <span>{nodes.length} returned</span>
                </div>
                {nodes.length ? (
                  <div className="digital-twin-node-grid">
                    {nodes.map((node, index) => {
                      const sourcePath = sourceSurfaceToAppPath(node.source_surface);
                      const sourceLabel = sourcePath ? SOURCE_LABELS[sourcePath] : null;
                      return (
                        <article className="card digital-twin-node-card" key={node.node_key || node.node_id || `${node.label || 'point'}-${index}`}>
                          <div className="digital-twin-badges">
                            <span className="digital-twin-badge">{formatIdentifier(node.twin_domain, 'Multiple areas')}</span>
                            <span className="digital-twin-badge">{formatIdentifier(node.status, 'Observed')}</span>
                          </div>
                          <h4>{readableTitle(node.label, 'Topology point')}</h4>
                          <p className="card__subtext">{formatIdentifier(node.node_type, 'General operational entity')}</p>
                          <dl className="digital-twin-facts">
                            <div><dt>Importance</dt><dd>{formatScore(node.importance_score)}</dd></div>
                            <div><dt>Last updated</dt><dd>{formatDateTime(node.updated_at || node.observed_at)}</dd></div>
                          </dl>
                          {sourcePath && sourceLabel ? (
                            <div className="digital-twin-card-actions">
                              <Link className="button button--secondary" to={sourcePath}>{sourceLabel}</Link>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="digital-twin-inline-empty">No topology points were returned. Clear filters or confirm that the tenant has permitted source records in the selected area.</div>
                )}
              </section>

              <section className="card digital-twin-context-section" aria-labelledby="digital-twin-edge-title">
                <div className="digital-twin-section-heading">
                  <div>
                    <h3 id="digital-twin-edge-title">Dependencies</h3>
                    <p className="card__subtext">Visible relationships and dependency paths. These are context, not instructions to change routing.</p>
                  </div>
                  <span>{edges.length} returned</span>
                </div>
                {edges.length ? (
                  <div className="digital-twin-dependency-list">
                    {edges.map((edge, index) => (
                      <article key={edge.edge_key || edge.edge_id || `${edge.relationship || 'dependency'}-${index}`}>
                        <div>
                          <strong>{edge.source_label && edge.target_label
                            ? `${readableTitle(edge.source_label)} → ${readableTitle(edge.target_label)}`
                            : formatIdentifier(edge.relationship, 'Operational dependency')}</strong>
                          <span>{formatIdentifier(edge.relationship, 'Operational dependency')} · {formatIdentifier(edge.twin_domain, 'Multiple areas')} · {formatIdentifier(edge.status, 'Observed')}</span>
                        </div>
                        <div>
                          <span>Confidence</span>
                          <strong>{formatPercent(edge.confidence_score)}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="digital-twin-inline-empty">No dependency relationships were returned for the current filters.</div>
                )}
              </section>

              <section className="digital-twin-overlay-section" aria-labelledby="digital-twin-overlay-title">
                <div className="digital-twin-section-heading digital-twin-section-heading--outside">
                  <div>
                    <h3 id="digital-twin-overlay-title">Operational overlays</h3>
                    <p className="card__subtext">Distinct operational pressure, coordination, event, and risk context. Similar source records remain separate; Action Center and Collaboration copies of the same action are not duplicated.</p>
                  </div>
                  <span>{overlays.length} returned</span>
                </div>
                {overlays.length ? (
                  <div className="digital-twin-overlay-grid">
                    {overlays.map((overlay, index) => {
                      const sourcePath = sourceSurfaceToAppPath(overlay.source_surface);
                      const sourceLabel = sourcePath ? SOURCE_LABELS[sourcePath] : null;
                      return (
                        <article className="card digital-twin-overlay-card" key={overlay.overlay_key || overlay.overlay_id || `${overlay.title || 'overlay'}-${index}`}>
                          <div className="digital-twin-badges">
                            <span className={`digital-twin-badge digital-twin-badge--${String(overlay.urgency || 'unknown').toLowerCase()}`}>{formatIdentifier(overlay.urgency, 'Unspecified urgency')}</span>
                            <span className="digital-twin-badge">{formatIdentifier(overlay.overlay_type, 'Operational context')}</span>
                            <span className="digital-twin-badge">{formatIdentifier(overlay.twin_domain, 'Multiple areas')}</span>
                          </div>
                          <h4>{readableTitle(overlay.title)}</h4>
                          <p className="card__subtext">{overlay.summary || 'No additional source summary was provided.'}</p>
                          <dl className="digital-twin-facts">
                            <div><dt>Priority</dt><dd>{formatScore(overlay.priority_score)}</dd></div>
                            <div><dt>Confidence</dt><dd>{formatPercent(overlay.confidence_score)}</dd></div>
                            <div><dt>Last updated</dt><dd>{formatDateTime(overlay.updated_at || overlay.created_at)}</dd></div>
                          </dl>
                          <div className="digital-twin-card-actions">
                            {sourcePath && sourceLabel ? <Link className="button button--secondary" to={sourcePath}>{sourceLabel}</Link> : null}
                            {sourcePath !== '/action-center' ? <Link className="button button--secondary" to="/action-center">Open Action Center</Link> : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="digital-twin-inline-empty">No operational overlays were returned for the current filters.</div>
                )}
              </section>
            </>
          )}
        </section>
      ) : null}

      {view === 'limits' ? (
        <section className="digital-twin-limit-grid" aria-labelledby="digital-twin-limits-title">
          <div className="digital-twin-section-heading digital-twin-section-heading--outside">
            <div>
              <h2 id="digital-twin-limits-title">Safety and interpretation limits</h2>
              <p className="card__subtext">These rules apply to every topology point, dependency, and overlay shown on this page.</p>
            </div>
          </div>
          <article className="card"><h3>Not a live simulation</h3><p className="card__subtext">The page shows a current read-only snapshot. It does not simulate future stock, labor, routes, facilities, or supplier behavior.</p></article>
          <article className="card"><h3>No automatic operational change</h3><p className="card__subtext">Nothing here can reassign labor, reserve stock, change routing, mutate tasks, or modify source records.</p></article>
          <article className="card"><h3>Perspective is guidance only</h3><p className="card__subtext">Topology, flow, risk, congestion, and dependency choices change review guidance. They do not generate a graphical map or measured heatmap.</p></article>
          <article className="card"><h3>Risk context remains explainable</h3><p className="card__subtext">{guidance.risk_propagation_guidance || 'Risk context comes from permitted source records and knowledge-graph evidence.'}</p></article>
          <article className="card"><h3>Congestion remains advisory</h3><p className="card__subtext">{guidance.congestion_heatmap_guidance || 'Congestion context does not change work allocation or inventory.'}</p></article>
          <article className="card"><h3>Source permissions still apply</h3><p className="card__subtext">Only permitted context is returned. Every source page keeps its own route, role, permission, tenant, and workflow controls.</p></article>
        </section>
      ) : null}

      {view === 'diagnostics' && canViewDiagnostics ? (
        <section className="card digital-twin-diagnostics">
          <h2>Technical response diagnostics</h2>
          <p className="card__subtext">Restricted implementation details for users with tenant diagnostics permission.</p>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </section>
      ) : null}
    </div>
  );
}
