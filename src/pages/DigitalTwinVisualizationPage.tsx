import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import type { TenantPermission } from '../lib/permissions';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import { OperationalWorkspaceHero, /* OperationalWorkspaceMetaPill, */ OperationalWorkspaceStatCard, OperationalWorkspaceStatus, OperationalWorkspaceTab, OperationalWorkspaceTabs } from '../components/ui/OperationalWorkspace';
import './DigitalTwinVisualizationPage.css';

type DigitalTwinView = 'context' | 'limits';
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
  title_key?: string | null;
  summary_key?: string | null;
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
    visualization_guidance_key?: string | null;
    perspective_guidance?: string;
    perspective_guidance_key?: string | null;
    congestion_heatmap_guidance?: string;
    congestion_heatmap_guidance_key?: string | null;
    risk_propagation_guidance?: string;
    risk_propagation_guidance_key?: string | null;
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

const DOMAIN_LABELS: Record<string, string> = Object.fromEntries(DOMAIN_FILTERS.map((option) => [option.value, option.label]));
const PERSPECTIVE_LABELS: Record<string, string> = Object.fromEntries(PERSPECTIVE_FILTERS.map((option) => [option.value, option.label]));
const URGENCY_LABELS: Record<string, string> = Object.fromEntries(URGENCY_FILTERS.map((option) => [option.value, option.label]));

const STATUS_LABELS: Record<string, string> = {
  observed: 'Observed',
  active: 'Active',
  review_required: 'Review required',
  archived: 'Archived'
};

const OVERLAY_TYPE_LABELS: Record<string, string> = {
  risk_propagation_overlay: 'Risk propagation',
  execution_pressure_overlay: 'Execution pressure',
  risk_signal_overlay: 'Risk signal',
  operational_action_overlay: 'Operational action',
  incident_coordination_overlay: 'Incident coordination',
  collaboration_context_overlay: 'Collaboration context'
};


const NODE_TYPE_LABELS: Record<string, string> = {
  item: 'Item',
  sku: 'SKU',
  location: 'Location',
  supplier: 'Supplier',
  purchase_order: 'Purchase order',
  shipment: 'Shipment',
  reservation: 'Reservation',
  requisition: 'Requisition',
  execution_task: 'Execution task',
  facility: 'Facility',
  operator: 'Operator',
  cost_center: 'Cost center',
  budget: 'Budget',
  integration_connector: 'Integration connector',
  decision: 'Decision',
  policy: 'Policy',
  forecast: 'Forecast',
  simulation: 'Simulation',
  remediation_workflow: 'Remediation workflow',
  risk_signal: 'Risk signal',
  general: 'General operational entity'
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  depends_on: 'Depends on',
  supplies: 'Supplies',
  consumes: 'Consumes',
  fulfills: 'Fulfills',
  reserves: 'Reserves',
  allocated_to: 'Allocated to',
  located_at: 'Located at',
  owned_by: 'Owned by',
  costs_against: 'Costs against',
  drives_risk_for: 'Drives risk for',
  mitigates_risk_for: 'Mitigates risk for',
  influences_policy: 'Influences policy',
  supports_decision: 'Supports decision',
  feeds_forecast: 'Feeds forecast',
  triggers_review_for: 'Triggers review for',
  operational_dependency: 'Operational dependency',
  supplier_dependency: 'Supplier dependency',
  execution_dependency: 'Execution dependency',
  financial_dependency: 'Financial dependency',
  integration_dependency: 'Integration dependency',
  risk_dependency: 'Risk dependency',
  decision_dependency: 'Decision dependency',
  policy_dependency: 'Policy dependency',
  general: 'Operational dependency'
};

const DIGITAL_TWIN_SYSTEM_TEXT: Record<string, string> = {
  digital_twin_review_highest_priority_context: 'Review the highest-priority operational context, then continue in the governed source workflow.',
  digital_twin_review_connected_topology: 'Current operational records and stored graph evidence have been connected into a read-only topology. Review the named dependencies, then continue in the source workflow.',
  digital_twin_no_matching_context: 'No digital-twin context currently matches these filters.',
  digital_twin_perspective_guidance_only: 'The selected perspective changes review guidance only. It does not create a live simulation, diagram, or automated heatmap.',
  digital_twin_congestion_advisory_only: 'Congestion review uses returned priorities and dependencies as advisory context and must not directly reassign labor, reserve stock, or mutate task routing.',
  digital_twin_risk_context_explainable: 'Risk context comes from permitted action records and knowledge-graph risk paths. It remains read-only and explainable.',
  digital_twin_observed_risk_path_review: 'Observed knowledge-graph risk path. Review the affected source records and mitigation evidence before taking action.',
  digital_twin_action_source_workflow_only: 'Read-only operational context. Use the source workflow for every human action.',
  digital_twin_collaboration_read_only_context: 'Read-only coordination context. This endpoint does not create rooms, notify people, or record comments.'
};

const DIGITAL_TWIN_RISK_TYPE_TEXT: Record<string, string> = {
  stockout_risk: 'Stockout risk',
  supplier_disruption_risk: 'Supplier disruption risk',
  labor_capacity_risk: 'Labor capacity risk',
  logistics_delay_risk: 'Logistics delay risk',
  budget_overrun_risk: 'Budget overrun risk',
  service_level_risk: 'Service level risk',
  facility_overload_risk: 'Facility overload risk',
  integration_failure_risk: 'Integration failure risk',
  policy_drift_risk: 'Policy drift risk',
  multi_domain_cascade_risk: 'Multi-domain cascade risk',
  general: 'Risk propagation'
};

const SOURCE_PERMISSION_BY_PATH: Partial<Record<string, TenantPermission>> = {
  '/action-center': TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ,
  '/alerts': TENANT_PERMISSIONS.ALERTS_READ,
  '/execution-tasks': TENANT_PERMISSIONS.EXECUTION_TASKS_READ,
  '/real-time-operations-feed': TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ,
  '/intelligence-review': TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ,
  '/ai-copilot': TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ,
  '/inventory-reservations': TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ,
  '/inventory-requisitions': TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_READ,
  '/procurement-recommendations': TENANT_PERMISSIONS.INSIGHTS_READ,
  '/shipments': TENANT_PERMISSIONS.SHIPMENTS_READ,
  '/reports': TENANT_PERMISSIONS.REPORTS_READ,
  '/collaboration': TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ,
  '/products': TENANT_PERMISSIONS.PRODUCTS_READ,
  '/suppliers': TENANT_PERMISSIONS.SUPPLIERS_READ,
  '/storage-locations': TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ,
  '/stock': TENANT_PERMISSIONS.STOCK_READ,
  '/stock-transfers': TENANT_PERMISSIONS.STOCK_TRANSFERS_READ,
  '/purchase-orders': TENANT_PERMISSIONS.PURCHASE_ORDERS_READ
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

function sourceText(value?: string | null, fallback = ''): string {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function digitalTwinSystemText(key: string | null | undefined, fallback: string | null | undefined, ui: (englishText: string) => string): string {
  const english = key ? DIGITAL_TWIN_SYSTEM_TEXT[key] : null;
  return english ? ui(english) : sourceText(fallback, '');
}

function digitalTwinRiskTitle(key: string | null | undefined, fallback: string | null | undefined, ui: (englishText: string) => string): string {
  if (key?.startsWith('digital_twin_risk_type:')) {
    const riskType = key.slice('digital_twin_risk_type:'.length);
    const english = DIGITAL_TWIN_RISK_TYPE_TEXT[riskType];
    if (english) return ui(english);
  }
  return sourceText(fallback, ui('Operational context'));
}

function formatDateTime(value: string | null | undefined, locale: Parameters<typeof formatLocalizedDateTime>[1], ui: (englishText: string) => string): string {
  if (!value) return ui('Not reported');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatLocalizedDateTime(date, locale);
}

function formatPercent(value: number | null | undefined, locale: Parameters<typeof formatLocalizedNumber>[1], ui: (englishText: string) => string): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return ui('Not scored');
  const normalized = Math.abs(value) <= 1 ? value : value / 100;
  return formatLocalizedNumber(normalized, locale, { style: 'percent', maximumFractionDigits: 0 });
}

function formatScore(value: number | null | undefined, locale: Parameters<typeof formatLocalizedNumber>[1], ui: (englishText: string) => string): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return ui('Not scored');
  return formatLocalizedNumber(Math.round(value), locale);
}

function displayLabel(value: string | null | undefined, labels: Record<string, string>, fallback: string, ui: (englishText: string) => string): string {
  if (!value) return ui(fallback);
  return labels[value] ? ui(labels[value]) : formatIdentifier(value);
}

function domainLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  return displayLabel(value, DOMAIN_LABELS, 'Multiple areas', ui);
}

function perspectiveLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  return displayLabel(value, PERSPECTIVE_LABELS, 'Recommended perspective', ui);
}

function urgencyLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  return displayLabel(value, URGENCY_LABELS, 'All urgency levels', ui);
}

function statusLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  return displayLabel(value, STATUS_LABELS, 'Observed', ui);
}

function overlayTypeLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  return displayLabel(value, OVERLAY_TYPE_LABELS, 'Operational context', ui);
}


function nodeTypeLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  return displayLabel(value, NODE_TYPE_LABELS, 'General operational entity', ui);
}

function relationshipLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  return displayLabel(value, RELATIONSHIP_LABELS, 'Operational dependency', ui);
}

function sourceSurfaceToAppPath(sourceSurface?: string | null): string | null {
  if (!sourceSurface) return null;
  const normalized = sourceSurface === '/operational-action-center/summary' || sourceSurface === '/control-tower' ? '/action-center' : sourceSurface;
  if (!Object.prototype.hasOwnProperty.call(SOURCE_LABELS, normalized)) return null;
  const requiredPermission = SOURCE_PERMISSION_BY_PATH[normalized];
  return requiredPermission && !hasPermission(requiredPermission) ? null : normalized;
}

function DigitalTwinSummaryCard({
  iconPath,
  label,
  value,
  copy,
  tone = 'blue'
}: {
  iconPath: string;
  label: string;
  value: string | number;
  copy: string;
  tone?: 'blue' | 'slate' | 'amber' | 'red';
}) {
  const { locale, ui } = useAppTranslation();
  return (
    <OperationalWorkspaceStatCard label={ui(label)} value={typeof value === 'number' ? formatLocalizedNumber(value, locale) : ui(value)} helper={ui(copy)} tone={tone} iconPath={iconPath} />
  );
}

async function fetchDigitalTwinSummary(filters: typeof DEFAULT_FILTERS): Promise<DigitalTwinResponse> {
  const params = new URLSearchParams({ limit: filters.limit });
  if (filters.twinDomain !== 'all') params.set('twin_domain', filters.twinDomain);
  if (filters.perspective !== 'all') params.set('view_mode', filters.perspective);
  if (filters.urgency !== 'all') params.set('urgency', filters.urgency);
  return apiRequest<DigitalTwinResponse>(`/operational-action-center/digital-twin-operational-visualization-summary?${params.toString()}`);
}

export default function DigitalTwinVisualizationPage() {
  const { locale, ui } = useAppTranslation();
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
    return (
      <div className="io-operational-page io-workspace-page digital-twin-page" data-digital-twin-refined="true">
        <section className="card digital-twin-state digital-twin-state--loading" aria-live="polite">
          <span className="digital-twin-state-icon"><TenantNavIcon path="/digital-twin" size={22} /></span>
          <div>
            <h2>{ui('Loading operational context')}</h2>
            <p>{ui('Connecting the permitted topology, dependencies, and operational overlays.')}</p>
          </div>
        </section>
      </div>
    );
  }

  if (digitalTwinQuery.error) {
    return (
      <div className="io-operational-page io-workspace-page digital-twin-page" data-digital-twin-refined="true">
        <section className="card digital-twin-state digital-twin-state--error" role="alert">
          <span className="digital-twin-state-icon digital-twin-state-icon--danger"><TenantNavIcon path="/alerts" size={22} /></span>
          <div className="digital-twin-state-copy">
            <h2>{ui('Operational context could not be loaded')}</h2>
            <p>
              {digitalTwinQuery.error instanceof ApiError
                ? digitalTwinQuery.error.message
                : ui('The Digital Twin summary is temporarily unavailable.')}
            </p>
            <button className="button button--secondary digital-twin-link-button" type="button" onClick={() => digitalTwinQuery.refetch()}>
              <TenantNavIcon path="/digital-twin" size={16} /> {ui('Retry')}
            </button>
          </div>
        </section>
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
    <div className="io-operational-page io-workspace-page digital-twin-page" data-digital-twin-refined="true">
      <OperationalWorkspaceHero
        iconPath="/digital-twin"
        eyebrow={ui('Read-only operational context')}
        title={ui('Review relationships, dependencies, risks, and operational pressure')}
        description={ui('This page connects permitted products, suppliers, locations, stock, purchase orders, shipments, reservations, requisitions, transfers, execution tasks, alerts, stored graph evidence, and current operational context. It is not a live simulation and does not change source records.')}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
            <>
                      <OperationalWorkspaceMetaPill>{ui('Source permissions apply')}</OperationalWorkspaceMetaPill>
                      <OperationalWorkspaceMetaPill>{ui('Source workflows remain authoritative')}</OperationalWorkspaceMetaPill>
                    </>
          */
        }
        aside={<div style={{ display: 'grid', gap: 8 }}>
          <OperationalWorkspaceStatus value={formatLocalizedNumber(nodes.length, locale)} label={(nodes.length === 1 ? ui('{count} context node · refreshed {time}') : ui('{count} context nodes · refreshed {time}')).replace('{count}', formatLocalizedNumber(nodes.length, locale)).replace('{time}', formatDateTime(response?.generated_at, locale, ui))} />
          <button className="app-button app-button--secondary" type="button" onClick={() => digitalTwinQuery.refetch()} disabled={digitalTwinQuery.isFetching}>
            {digitalTwinQuery.isFetching ? ui('Refreshing…') : ui('Refresh context')}
          </button>
        </div>}
      />

      <section className="card digital-twin-filters" aria-labelledby="digital-twin-filter-title">
        <div className="digital-twin-section-heading">
          <div className="digital-twin-section-title">
            <span className="digital-twin-heading-icon"><TenantNavIcon path="/digital-twin" size={17} /></span>
            <div>
              <h2 id="digital-twin-filter-title">{ui('Filter the operational context')}</h2>
              <p className="card__subtext">{ui('Filters change only this read-only snapshot. The selected review perspective changes guidance; it does not generate a live diagram, simulation, or heatmap.')}</p>
            </div>
          </div>
          {hasActiveFilters ? <button className="button button--secondary" type="button" onClick={() => setFilters(DEFAULT_FILTERS)}>{ui('Clear filters')}</button> : null}
        </div>
        <div className="digital-twin-filter-grid">
          <label>
            <span>{ui('Operational area')}</span>
            <select value={filters.twinDomain} onChange={(event) => setFilters((current) => ({ ...current, twinDomain: event.target.value as typeof filters.twinDomain }))}>
              {DOMAIN_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
            </select>
          </label>
          <label>
            <span>{ui('Review perspective')}</span>
            <select value={filters.perspective} onChange={(event) => setFilters((current) => ({ ...current, perspective: event.target.value as typeof filters.perspective }))}>
              {PERSPECTIVE_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
            </select>
          </label>
          <label>
            <span>{ui('Overlay urgency')}</span>
            <select value={filters.urgency} onChange={(event) => setFilters((current) => ({ ...current, urgency: event.target.value as typeof filters.urgency }))}>
              {URGENCY_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
            </select>
          </label>
          <label>
            <span>{ui('Maximum records per list')}</span>
            <select value={filters.limit} onChange={(event) => setFilters((current) => ({ ...current, limit: event.target.value as ResultLimit }))}>
              {LIMIT_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
            </select>
          </label>
        </div>
        <div className="digital-twin-filter-summary">
          <span>{ui('Area:')} <strong>{domainLabel(response?.filters?.twin_domain || 'all', ui)}</strong></span>
          <span>{ui('Perspective:')} <strong>{perspectiveLabel(response?.filters?.view_mode || guidance.recommended_view_mode || 'all', ui)}</strong></span>
          <span>{ui('Urgency:')} <strong>{urgencyLabel(response?.filters?.urgency || 'all', ui)}</strong></span>
          <span>{ui('Showing up to {limit} records in each list').replace('{limit}', formatLocalizedNumber(appliedLimit, locale))}</span>
        </div>
      </section>

      <section className="digital-twin-summary-grid io-workspace-stats" aria-label={ui('Digital Twin summary')}>
        <DigitalTwinSummaryCard
          iconPath="/digital-twin"
          label="Topology points"
          value={numberValue(summary.total_nodes ?? nodes.length)}
          copy="Current permitted business records shown as read-only operational points."
        />
        <DigitalTwinSummaryCard
          iconPath="/workspace"
          label="Dependencies"
          value={numberValue(summary.total_edges ?? edges.length)}
          copy="Visible relationships and dependency paths between operational points."
          tone="slate"
        />
        <DigitalTwinSummaryCard
          iconPath="/action-center"
          label="Operational overlays"
          value={numberValue(summary.total_overlays ?? overlays.length)}
          copy="Distinct Action Center, event, coordination, and knowledge-graph risk context."
          tone="amber"
        />
        <DigitalTwinSummaryCard
          iconPath="/alerts"
          label="Critical overlays"
          value={numberValue(summary.critical_overlays)}
          copy="Critical context that may need prompt source-workflow review."
          tone="red"
        />
      </section>

      <OperationalWorkspaceTabs ariaLabel={ui('Digital Twin views')}>
        <OperationalWorkspaceTab active={view === 'context'} iconPath="/digital-twin" label={ui('Operational context')} onClick={() => setView('context')} />
        <OperationalWorkspaceTab active={view === 'limits'} iconPath="/permissions" label={ui('Safety and limits')} onClick={() => setView('limits')} />
      </OperationalWorkspaceTabs>

      {view === 'context' ? (
        <section aria-labelledby="digital-twin-context-title">
          <div className="digital-twin-section-heading digital-twin-section-heading--outside">
            <div className="digital-twin-section-title">
              <span className="digital-twin-heading-icon"><TenantNavIcon path="/digital-twin" size={17} /></span>
              <div>
                <h2 id="digital-twin-context-title">{ui('Operational context')}</h2>
                <p className="card__subtext">{guidance.visualization_guidance_key ? digitalTwinSystemText(guidance.visualization_guidance_key, guidance.visualization_guidance, ui) : (guidance.visualization_guidance || ui('Use this read-only context to understand the situation, then continue in the governed source workflow.'))}</p>
              </div>
            </div>
            <div className="digital-twin-shortcuts">
              {/* Workspace shortcut intentionally hidden; keep the old route available in code for future redesign.
              <Link className="button button--secondary digital-twin-link-button" to="/workspace"><TenantNavIcon path="/workspace" size={16} /> {ui('Open Workspace')}</Link>
              */}
              <Link className="button button--secondary digital-twin-link-button" to="/action-center"><TenantNavIcon path="/action-center" size={16} /> {ui('Open Action Center')}</Link>
              <Link className="button button--secondary digital-twin-link-button" to="/collaboration"><TenantNavIcon path="/collaboration" size={16} /> {ui('Open Collaboration')}</Link>
            </div>
          </div>

          {!hasContext ? (
            <div className="card digital-twin-state digital-twin-empty-state">
              <span className="digital-twin-state-icon"><TenantNavIcon path="/digital-twin" size={22} /></span>
              <div>
                <h3>{ui('No operational context matches the current filters')}</h3>
                <p>{ui('Clear the filters or confirm that products, suppliers, locations, stock, procurement records, reservations, requisitions, transfers, execution tasks, alerts, or stored graph evidence exist for this tenant.')}</p>
              </div>
            </div>
          ) : (
            <>
              <section className="card digital-twin-context-section" aria-labelledby="digital-twin-node-title">
                <div className="digital-twin-section-heading">
                  <div className="digital-twin-section-title">
                    <span className="digital-twin-heading-icon"><TenantNavIcon path="/digital-twin" size={17} /></span>
                    <div>
                      <h3 id="digital-twin-node-title">{ui('Topology points')}</h3>
                      <p className="card__subtext">{ui('Current permitted business records and stored graph entities connected by the backend.')}</p>
                    </div>
                  </div>
                  <span className="digital-twin-count-pill">{ui('{count} returned').replace('{count}', formatLocalizedNumber(nodes.length, locale))}</span>
                </div>
                {nodes.length ? (
                  <div className="digital-twin-node-grid">
                    {nodes.map((node, index) => {
                      const sourcePath = sourceSurfaceToAppPath(node.source_surface);
                      const sourceLabel = sourcePath ? SOURCE_LABELS[sourcePath] : null;
                      return (
                        <article className="card digital-twin-node-card" key={node.node_key || node.node_id || `${node.label || 'point'}-${index}`}>
                          <div className="digital-twin-card-heading">
                            <span className="digital-twin-card-icon"><TenantNavIcon path={sourcePath || '/digital-twin'} size={18} /></span>
                            <div className="digital-twin-badges">
                              <span className="digital-twin-badge">{domainLabel(node.twin_domain, ui)}</span>
                              <span className="digital-twin-badge digital-twin-badge--active">{statusLabel(node.status, ui)}</span>
                            </div>
                          </div>
                          <h4>{sourceText(node.label, ui('Topology point'))}</h4>
                          <p className="card__subtext">{nodeTypeLabel(node.node_type, ui)}</p>
                          <dl className="digital-twin-facts">
                            <div><dt>{ui('Importance')}</dt><dd>{formatScore(node.importance_score, locale, ui)}</dd></div>
                            <div><dt>{ui('Last updated')}</dt><dd>{formatDateTime(node.updated_at || node.observed_at, locale, ui)}</dd></div>
                          </dl>
                          {sourcePath && sourceLabel ? (
                            <div className="digital-twin-card-actions">
                              <Link className="button button--secondary digital-twin-link-button" to={sourcePath}><TenantNavIcon path={sourcePath} size={16} /> {ui(sourceLabel)}</Link>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="digital-twin-inline-empty">{ui('No topology points were returned. Clear filters or confirm that the tenant has permitted source records in the selected area.')}</div>
                )}
              </section>

              <section className="card digital-twin-context-section" aria-labelledby="digital-twin-edge-title">
                <div className="digital-twin-section-heading">
                  <div className="digital-twin-section-title">
                    <span className="digital-twin-heading-icon"><TenantNavIcon path="/workspace" size={17} /></span>
                    <div>
                      <h3 id="digital-twin-edge-title">{ui('Dependencies')}</h3>
                      <p className="card__subtext">{ui('Visible relationships and dependency paths. These are context, not instructions to change routing.')}</p>
                    </div>
                  </div>
                  <span className="digital-twin-count-pill">{ui('{count} returned').replace('{count}', formatLocalizedNumber(edges.length, locale))}</span>
                </div>
                {edges.length ? (
                  <div className="digital-twin-dependency-list">
                    {edges.map((edge, index) => (
                      <article key={edge.edge_key || edge.edge_id || `${edge.relationship || 'dependency'}-${index}`}>
                        <span className="digital-twin-dependency-icon"><TenantNavIcon path="/digital-twin" size={16} /></span>
                        <div className="digital-twin-dependency-copy">
                          <strong>{edge.source_label && edge.target_label
                            ? `${sourceText(edge.source_label)} → ${sourceText(edge.target_label)}`
                            : relationshipLabel(edge.relationship, ui)}</strong>
                          <span>{relationshipLabel(edge.relationship, ui)} · {domainLabel(edge.twin_domain, ui)} · {statusLabel(edge.status, ui)}</span>
                        </div>
                        <div className="digital-twin-dependency-confidence">
                          <span>{ui('Confidence')}</span>
                          <strong>{formatPercent(edge.confidence_score, locale, ui)}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="digital-twin-inline-empty">{ui('No dependency relationships were returned for the current filters.')}</div>
                )}
              </section>

              <section className="digital-twin-overlay-section" aria-labelledby="digital-twin-overlay-title">
                <div className="digital-twin-section-heading digital-twin-section-heading--outside">
                  <div className="digital-twin-section-title">
                    <span className="digital-twin-heading-icon"><TenantNavIcon path="/action-center" size={17} /></span>
                    <div>
                      <h3 id="digital-twin-overlay-title">{ui('Operational overlays')}</h3>
                      <p className="card__subtext">{ui('Distinct operational pressure, coordination, event, and risk context. Similar source records remain separate; Action Center and Collaboration copies of the same action are not duplicated.')}</p>
                    </div>
                  </div>
                  <span className="digital-twin-count-pill">{ui('{count} returned').replace('{count}', formatLocalizedNumber(overlays.length, locale))}</span>
                </div>
                {overlays.length ? (
                  <div className="digital-twin-overlay-grid">
                    {overlays.map((overlay, index) => {
                      const sourcePath = sourceSurfaceToAppPath(overlay.source_surface);
                      const sourceLabel = sourcePath ? SOURCE_LABELS[sourcePath] : null;
                      return (
                        <article className="card digital-twin-overlay-card" key={overlay.overlay_key || overlay.overlay_id || `${overlay.title || 'overlay'}-${index}`}>
                          <div className="digital-twin-card-heading">
                            <span className="digital-twin-card-icon"><TenantNavIcon path={sourcePath || '/action-center'} size={18} /></span>
                            <div className="digital-twin-badges">
                              <span className={`digital-twin-badge digital-twin-badge--${String(overlay.urgency || 'unknown').toLowerCase()}`}>{urgencyLabel(overlay.urgency, ui)}</span>
                              <span className="digital-twin-badge">{overlayTypeLabel(overlay.overlay_type, ui)}</span>
                              <span className="digital-twin-badge">{domainLabel(overlay.twin_domain, ui)}</span>
                            </div>
                          </div>
                          <h4>{overlay.title_key ? digitalTwinRiskTitle(overlay.title_key, overlay.title, ui) : sourceText(overlay.title, ui('Operational context'))}</h4>
                          <p className="card__subtext">{overlay.summary_key ? digitalTwinSystemText(overlay.summary_key, overlay.summary, ui) : (overlay.summary || ui('No additional source summary was provided.'))}</p>
                          <dl className="digital-twin-facts digital-twin-facts--overlay">
                            <div><dt>{ui('Priority')}</dt><dd>{formatScore(overlay.priority_score, locale, ui)}</dd></div>
                            <div><dt>{ui('Confidence')}</dt><dd>{formatPercent(overlay.confidence_score, locale, ui)}</dd></div>
                            <div><dt>{ui('Last updated')}</dt><dd>{formatDateTime(overlay.updated_at || overlay.created_at, locale, ui)}</dd></div>
                          </dl>
                          <div className="digital-twin-card-actions">
                            {sourcePath && sourceLabel ? <Link className="button button--secondary digital-twin-link-button" to={sourcePath}><TenantNavIcon path={sourcePath} size={16} /> {ui(sourceLabel)}</Link> : null}
                            {sourcePath !== '/action-center' ? <Link className="button button--secondary digital-twin-link-button" to="/action-center"><TenantNavIcon path="/action-center" size={16} /> {ui('Open Action Center')}</Link> : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="digital-twin-inline-empty">{ui('No operational overlays were returned for the current filters.')}</div>
                )}
              </section>
            </>
          )}
        </section>
      ) : null}

      {view === 'limits' ? (
        <section className="digital-twin-limit-grid" aria-labelledby="digital-twin-limits-title">
          <div className="digital-twin-section-heading digital-twin-section-heading--outside">
            <div className="digital-twin-section-title">
              <span className="digital-twin-heading-icon"><TenantNavIcon path="/permissions" size={17} /></span>
              <div>
                <h2 id="digital-twin-limits-title">{ui('Safety and interpretation limits')}</h2>
                <p className="card__subtext">{ui('These rules apply to every topology point, dependency, and overlay shown on this page.')}</p>
              </div>
            </div>
          </div>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/digital-twin" size={18} /></span><div><h3>{ui('Not a live simulation')}</h3><p className="card__subtext">{ui('The page shows a current read-only snapshot. It does not simulate future stock, labor, routes, facilities, or supplier behavior.')}</p></div></article>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/stock" size={18} /></span><div><h3>{ui('No automatic operational change')}</h3><p className="card__subtext">{ui('Nothing here can reassign labor, reserve stock, change routing, mutate tasks, or modify source records.')}</p></div></article>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/workspace" size={18} /></span><div><h3>{ui('Perspective is guidance only')}</h3><p className="card__subtext">{ui('Topology, flow, risk, congestion, and dependency choices change review guidance. They do not generate a graphical map or measured heatmap.')}</p></div></article>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/intelligence-review" size={18} /></span><div><h3>{ui('Risk context remains explainable')}</h3><p className="card__subtext">{guidance.risk_propagation_guidance_key ? digitalTwinSystemText(guidance.risk_propagation_guidance_key, guidance.risk_propagation_guidance, ui) : (guidance.risk_propagation_guidance || ui('Risk context comes from permitted source records and knowledge-graph evidence.'))}</p></div></article>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/action-center" size={18} /></span><div><h3>{ui('Congestion remains advisory')}</h3><p className="card__subtext">{guidance.congestion_heatmap_guidance_key ? digitalTwinSystemText(guidance.congestion_heatmap_guidance_key, guidance.congestion_heatmap_guidance, ui) : (guidance.congestion_heatmap_guidance || ui('Congestion context does not change work allocation or inventory.'))}</p></div></article>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/permissions" size={18} /></span><div><h3>{ui('Source permissions still apply')}</h3><p className="card__subtext">{ui('Only permitted context is returned. Every source page keeps its own route, role, permission, tenant, and workflow controls.')}</p></div></article>
        </section>
      ) : null}
    </div>
  );
}
