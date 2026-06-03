import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

type TwinDomain = 'facility' | 'inventory_flow' | 'execution_flow' | 'risk_propagation' | 'control_tower' | 'multi_domain';
type TwinViewMode = 'topology' | 'risk_overlay' | 'congestion_heatmap' | 'dependency_map';
type Urgency = 'critical' | 'high' | 'medium' | 'low';

type TwinNode = {
  node_id: string;
  node_type?: string;
  twin_domain?: string;
  label?: string;
  status?: string;
  importance_score?: number;
  facility_id?: string | null;
  storage_location_id?: string | null;
  source_type?: string;
  observed_at?: string | null;
  updated_at?: string | null;
};

type TwinEdge = {
  edge_id: string;
  source_node_id?: string;
  target_node_id?: string;
  relationship?: string;
  twin_domain?: string;
  status?: string;
  confidence_score?: number;
  overlay_hint?: string;
  updated_at?: string | null;
};

type TwinOverlay = {
  overlay_id: string;
  overlay_type?: string;
  twin_domain?: string;
  source_action_id?: string;
  source_thread_id?: string;
  thread_type?: string;
  urgency?: string;
  priority_score?: number;
  title?: string;
  summary?: string | null;
  visual_guidance?: string;
  mutation_allowed_from_overlay?: boolean;
  endpoint_creates_visual_room?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type DigitalTwinResponse = {
  definition?: {
    foundation_type?: string;
    execution_mode?: string;
    source_foundations?: string[];
    supported_twin_domains?: string[];
    supported_view_modes?: string[];
    visualization_capabilities?: string[];
    safety_contract?: Record<string, boolean>;
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
    by_domain?: Record<string, number>;
    by_overlay_type?: Record<string, number>;
  };
  guidance?: {
    recommended_view_mode?: string | null;
    next_overlay_id?: string | null;
    next_overlay_urgency?: string | null;
    visualization_guidance?: string;
    congestion_heatmap_guidance?: string;
    risk_propagation_guidance?: string;
    safety_contract?: Record<string, boolean>;
  };
  nodes?: TwinNode[];
  edges?: TwinEdge[];
  overlays?: TwinOverlay[];
  source_knowledge_graph_posture?: Record<string, unknown>;
  source_workspace_summary?: Record<string, unknown>;
  source_collaboration_summary?: Record<string, unknown>;
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const DOMAIN_FILTERS: Array<{ value: 'all' | TwinDomain; label: string }> = [
  { value: 'all', label: 'All twin domains' },
  { value: 'facility', label: 'Facility' },
  { value: 'inventory_flow', label: 'Inventory flow' },
  { value: 'execution_flow', label: 'Execution flow' },
  { value: 'risk_propagation', label: 'Risk propagation' },
  { value: 'control_tower', label: 'Control tower' },
  { value: 'multi_domain', label: 'Multi-domain' }
];

const VIEW_MODE_FILTERS: Array<{ value: 'all' | TwinViewMode; label: string }> = [
  { value: 'all', label: 'Backend recommended view' },
  { value: 'topology', label: 'Topology' },
  { value: 'risk_overlay', label: 'Risk overlay' },
  { value: 'congestion_heatmap', label: 'Congestion heatmap' },
  { value: 'dependency_map', label: 'Dependency map' }
];

const URGENCY_FILTERS: Array<{ value: 'all' | Urgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const gridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))'
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 16
};

const selectStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '10px 12px',
  background: 'white',
  minWidth: 190
};

const twinCanvasStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(260px, 1.2fr) minmax(260px, 1fr)',
  gap: 16
};

const nodeGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: 12
};

const overlayListStyle: CSSProperties = {
  display: 'grid',
  gap: 12
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  borderRadius: 999,
  padding: '4px 9px',
  background: '#f3f4f6',
  color: '#374151',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'capitalize'
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function formatPercent(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Not scored';
  }

  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Not reported';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function overlaySourcePath(overlay: TwinOverlay): string | null {
  if (overlay.source_action_id) {
    return '/action-center';
  }

  if (overlay.source_thread_id) {
    return '/collaboration';
  }

  return null;
}

async function fetchDigitalTwinSummary(
  twinDomain: 'all' | TwinDomain,
  viewMode: 'all' | TwinViewMode,
  urgency: 'all' | Urgency
): Promise<DigitalTwinResponse> {
  const params = new URLSearchParams({ limit: '75' });

  if (twinDomain !== 'all') {
    params.set('twin_domain', twinDomain);
  }

  if (viewMode !== 'all') {
    params.set('view_mode', viewMode);
  }

  if (urgency !== 'all') {
    params.set('urgency', urgency);
  }

  return apiRequest<DigitalTwinResponse>(`/operational-action-center/digital-twin-operational-visualization-summary?${params.toString()}`);
}

export default function DigitalTwinVisualizationPage() {
  const [twinDomain, setTwinDomain] = useState<'all' | TwinDomain>('all');
  const [viewMode, setViewMode] = useState<'all' | TwinViewMode>('all');
  const [urgency, setUrgency] = useState<'all' | Urgency>('all');

  const digitalTwinQuery = useQuery({
    queryKey: ['digital-twin-visualization', twinDomain, viewMode, urgency],
    queryFn: () => fetchDigitalTwinSummary(twinDomain, viewMode, urgency)
  });

  const response = digitalTwinQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const nodes = response?.nodes || [];
  const edges = response?.edges || [];
  const overlays = response?.overlays || [];
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  const highlightedOverlays = overlays.slice(0, 8);
  const visibleNodes = nodes.slice(0, 9);
  const visibleEdges = edges.slice(0, 8);

  return (
    <div>
      <div className="card-grid" style={gridStyle}>
        <div className="card">
          <div className="card__label">Twin nodes</div>
          <div className="card__value">{numberValue(summary.total_nodes ?? nodes.length)}</div>
          <div className="card__subtext">Knowledge-graph entities surfaced as read-only operational topology points.</div>
        </div>
        <div className="card">
          <div className="card__label">Twin edges</div>
          <div className="card__value">{numberValue(summary.total_edges ?? edges.length)}</div>
          <div className="card__subtext">Dependency and relationship context for facility, inventory, execution, and risk flow.</div>
        </div>
        <div className="card">
          <div className="card__label">Active overlays</div>
          <div className="card__value">{numberValue(summary.total_overlays ?? overlays.length)}</div>
          <div className="card__subtext">Workspace actions and collaboration threads rendered as advisory visual overlays.</div>
        </div>
        <div className="card">
          <div className="card__label">Critical overlays</div>
          <div className="card__value">{numberValue(summary.critical_overlays)}</div>
          <div className="card__subtext">High-urgency visual context only; this page does not mutate routing, stock, labor, or rooms.</div>
        </div>
      </div>

      <section className="section">
        <div className="section__title">Digital twin controls</div>
        <div className="card">
          <div style={toolbarStyle}>
            <select style={selectStyle} value={twinDomain} onChange={(event) => setTwinDomain(event.target.value as 'all' | TwinDomain)}>
              {DOMAIN_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={viewMode} onChange={(event) => setViewMode(event.target.value as 'all' | TwinViewMode)}>
              {VIEW_MODE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | Urgency)}>
              {URGENCY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button className="button button--secondary" type="button" onClick={() => digitalTwinQuery.refetch()} disabled={digitalTwinQuery.isFetching}>
              {digitalTwinQuery.isFetching ? 'Refreshing…' : 'Refresh twin'}
            </button>
            <Link className="button button--secondary" to="/workspace">Open workspace</Link>
            <Link className="button button--secondary" to="/collaboration">Open collaboration</Link>
          </div>

          {digitalTwinQuery.isLoading ? (
            <p className="card__subtext">Loading digital twin operational visualization…</p>
          ) : digitalTwinQuery.error ? (
            <p className="form-error">
              {digitalTwinQuery.error instanceof ApiError
                ? digitalTwinQuery.error.message
                : 'Unable to load digital twin operational visualization.'}
            </p>
          ) : (
            <p className="card__subtext">
              {guidance.visualization_guidance || 'Use the twin as read-only operational context and route human actions through governed source workflows.'}
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Operational topology and overlays</div>
        {nodes.length === 0 && overlays.length === 0 && !digitalTwinQuery.isLoading ? (
          <div className="empty-state">No digital twin topology or overlays match the selected filters.</div>
        ) : (
          <div style={twinCanvasStyle}>
            <div className="card">
              <div className="card__label">Topology nodes</div>
              <div style={nodeGridStyle}>
                {visibleNodes.map((node) => (
                  <article className="card" key={node.node_id}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      <span style={badgeStyle}>{formatLabel(node.twin_domain)}</span>
                      <span style={badgeStyle}>{formatLabel(node.status)}</span>
                    </div>
                    <h3 style={{ marginTop: 0 }}>{node.label || node.node_id}</h3>
                    <p className="card__subtext">{formatLabel(node.node_type)} · {formatLabel(node.source_type)}</p>
                    <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', marginTop: 10 }}>
                      <div>
                        <div className="card__label">Importance</div>
                        <strong>{numberValue(node.importance_score)}</strong>
                      </div>
                      <div>
                        <div className="card__label">Updated</div>
                        <strong>{formatDateTime(node.updated_at || node.observed_at)}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card__label">Priority overlays</div>
              <div style={overlayListStyle}>
                {highlightedOverlays.map((overlay) => {
                  const sourcePath = overlaySourcePath(overlay);
                  return (
                    <article className="card" key={overlay.overlay_id}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                        <span style={badgeStyle}>{formatLabel(overlay.urgency)}</span>
                        <span style={badgeStyle}>{formatLabel(overlay.overlay_type)}</span>
                        <span style={badgeStyle}>{formatLabel(overlay.twin_domain)}</span>
                      </div>
                      <h3 style={{ marginTop: 0 }}>{overlay.title || overlay.overlay_id}</h3>
                      <p className="card__subtext">{overlay.summary || overlay.visual_guidance || 'Advisory visual context from a source operational surface.'}</p>
                      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginTop: 10 }}>
                        <div>
                          <div className="card__label">Priority</div>
                          <strong>{numberValue(overlay.priority_score)}</strong>
                        </div>
                        <div>
                          <div className="card__label">Updated</div>
                          <strong>{formatDateTime(overlay.updated_at || overlay.created_at)}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                        {sourcePath ? <Link className="button button--secondary" to={sourcePath}>Open source surface</Link> : null}
                        <Link className="button button--secondary" to="/action-center">Open action center</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__title">Dependency map and safety guardrails</div>
        <div className="card-grid" style={gridStyle}>
          <div className="card">
            <div className="card__label">Recommended view</div>
            <p className="card__subtext">{formatLabel(guidance.recommended_view_mode || response?.filters?.view_mode || 'topology')}</p>
          </div>
          <div className="card">
            <div className="card__label">Risk propagation guidance</div>
            <p className="card__subtext">{guidance.risk_propagation_guidance || 'Risk overlays remain explainable visual context only.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Heatmap guidance</div>
            <p className="card__subtext">{guidance.congestion_heatmap_guidance || 'Heatmap data does not reassign labor, reserve stock, or mutate routing.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Safety contract</div>
            <p className="card__subtext">
              {safetyEntries.length
                ? safetyEntries.map(([key]) => formatLabel(key)).join(' · ')
                : 'Read-only: no routing, stock, labor, room, notification, or collaboration mutation is performed here.'}
            </p>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card__label">Visible dependency edges</div>
          {visibleEdges.length ? (
            <div style={overlayListStyle}>
              {visibleEdges.map((edge) => (
                <div key={edge.edge_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <span>{formatLabel(edge.relationship)} · {formatLabel(edge.twin_domain)} · {formatLabel(edge.status)}</span>
                  <strong>{formatPercent(edge.confidence_score)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="card__subtext">No visible dependency edges were returned for the selected filters.</p>
          )}
        </div>
      </section>
    </div>
  );
}
