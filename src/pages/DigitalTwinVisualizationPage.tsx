import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import type { TenantPermission } from '../lib/permissions';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import './DigitalTwinVisualizationPage.css';

type DigitalTwinView = 'context' | 'limits';
type TwinDomain = 'facility' | 'inventory_flow' | 'execution_flow' | 'supplier_flow' | 'risk_propagation' | 'control_tower' | 'multi_domain';
type TwinViewMode = 'topology' | 'flow_map' | 'risk_overlay' | 'congestion_heatmap' | 'dependency_map';
type Urgency = 'critical' | 'high' | 'medium' | 'low';
type ResultLimit = '25' | '50' | '75' | '100';
type PaginationKind = 'nodes' | 'edges' | 'overlays';

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
  source_record_path?: string | null;
};

type TwinEdge = {
  edge_key?: string;
  edge_id?: string;
  relationship?: string;
  source_label?: string | null;
  target_label?: string | null;
  source_node_key?: string | null;
  target_node_key?: string | null;
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
  source_record_path?: string | null;
  source_node_key?: string | null;
  target_node_key?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TwinPagination = {
  offset?: number;
  limit?: number;
  returned?: number;
  total_matching?: number;
  from?: number;
  to?: number;
  has_previous?: boolean;
  has_more?: boolean;
  previous_offset?: number | null;
  next_offset?: number | null;
  total_is_capped?: boolean;
  total_scope?: string;
};

type TwinFocus = {
  found?: boolean;
  node_key?: string | null;
  label?: string | null;
  node_type?: string | null;
  twin_domain?: string | null;
  status?: string | null;
  importance_score?: number | null;
  source_surface?: string | null;
  source_record_path?: string | null;
  connected_count?: number;
  connected_nodes?: TwinNode[];
  dependencies?: TwinEdge[];
  overlays?: TwinOverlay[];
  impact_chain?: Array<{
    from_node_key?: string | null;
    from_label?: string | null;
    relationship?: string | null;
    direction?: string | null;
    to_node_key?: string | null;
    to_label?: string | null;
    status?: string | null;
    confidence_score?: number | null;
  }>;
};

type FreshnessSource = {
  source_surface?: string | null;
  updated_at?: string | null;
  age_minutes?: number;
  freshness_state?: 'current' | 'aging' | 'stale_review' | string;
};

type DigitalTwinResponse = {
  definition?: { execution_mode?: string; [key: string]: unknown };
  access?: { can_view_diagnostics?: boolean };
  filters?: {
    twin_domain?: string | null;
    view_mode?: string | null;
    urgency?: string | null;
    search?: string;
    focus_node_key?: string | null;
    node_offset?: number;
    edge_offset?: number;
    overlay_offset?: number;
    limit?: number;
  };
  summary?: {
    total_nodes?: number;
    total_edges?: number;
    total_overlays?: number;
    total_matching_nodes?: number;
    total_matching_edges?: number;
    total_matching_overlays?: number;
    critical_overlays?: number;
    risk_overlays?: number;
    by_domain?: Record<string, number>;
    by_overlay_type?: Record<string, number>;
  };
  pagination?: {
    nodes?: TwinPagination;
    edges?: TwinPagination;
    overlays?: TwinPagination;
  };
  coverage?: {
    totals_scope?: string;
    graph_source_limit?: number;
    action_context_limit?: number;
    may_have_more_source_records?: boolean;
    bounded_source_areas?: string[];
  } | null;
  review_first?: {
    kind?: 'node' | 'overlay' | string;
    title?: string | null;
    summary?: string | null;
    urgency?: string | null;
    source_surface?: string | null;
    source_record_path?: string | null;
    node_key?: string | null;
  } | null;
  freshness?: {
    generated_at?: string;
    stale_source_count?: number;
    aging_source_count?: number;
    sources?: FreshnessSource[];
  } | null;
  focus?: TwinFocus | null;
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
  limit: '50' as ResultLimit,
  search: ''
};

const SOURCE_LABELS: Record<string, string> = {
  '/action-center': 'Action Center',
  '/alerts': 'Alerts',
  '/execution-tasks': 'Execution Tasks',
  '/real-time-operations-feed': 'Operations Feed',
  '/intelligence-review': 'Intelligence Review',
  '/ai-copilot': 'AI Copilot',
  '/inventory-reservations': 'Reservations',
  '/inventory-requisitions': 'Requisitions',
  '/procurement-recommendations': 'Procurement Recommendations',
  '/shipments': 'Shipments',
  '/reports': 'Reports',
  '/collaboration': 'Collaboration',
  '/products': 'Products',
  '/suppliers': 'Suppliers',
  '/storage-locations': 'Locations',
  '/stock': 'Stock',
  '/stock-transfers': 'Stock Transfers',
  '/purchase-orders': 'Purchase Orders'
};

const DOMAIN_LABELS: Record<string, string> = Object.fromEntries(DOMAIN_FILTERS.map((option) => [option.value, option.label]));
const PERSPECTIVE_LABELS: Record<string, string> = Object.fromEntries(PERSPECTIVE_FILTERS.map((option) => [option.value, option.label]));
const URGENCY_LABELS: Record<string, string> = Object.fromEntries(URGENCY_FILTERS.map((option) => [option.value, option.label]));

const STATUS_LABELS: Record<string, string> = {
  observed: 'Observed',
  active: 'Active',
  review_required: 'Review required',
  mitigation_review_required: 'Mitigation review required',
  stale: 'Stale',
  validated: 'Validated',
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
  product: 'Product',
  sku: 'SKU',
  stock_position: 'Stock position',
  location: 'Location',
  storage_location: 'Storage location',
  supplier: 'Supplier',
  purchase_order: 'Purchase order',
  shipment: 'Shipment',
  reservation: 'Reservation',
  inventory_reservation: 'Reservation',
  requisition: 'Requisition',
  inventory_requisition: 'Requisition',
  stock_transfer: 'Stock transfer',
  execution_task: 'Execution task',
  alert: 'Alert',
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
  digital_twin_perspective_changes_emphasis: 'The selected perspective changes which permitted records and relationships are emphasized first. It remains a read-only review view and does not create a live simulation, diagram, or measured heatmap.',
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
  return normalized.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
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
  const normalized = sourceSurface === '/operational-action-center/summary' || sourceSurface === '/control-tower' ? '/action-center' : sourceSurface.split('?')[0];
  if (!Object.prototype.hasOwnProperty.call(SOURCE_LABELS, normalized)) return null;
  const requiredPermission = SOURCE_PERMISSION_BY_PATH[normalized];
  return requiredPermission && !hasPermission(requiredPermission) ? null : normalized;
}

function permittedSourcePath(sourceRecordPath?: string | null, sourceSurface?: string | null): string | null {
  const requestedBase = sourceRecordPath?.split('?')[0] || null;
  const permittedBase = sourceSurfaceToAppPath(requestedBase || sourceSurface);
  if (!permittedBase) return null;
  return sourceRecordPath && requestedBase === permittedBase ? sourceRecordPath : permittedBase;
}

function sourceAreaLabel(sourceSurface: string | null | undefined, ui: (englishText: string) => string): string {
  const base = sourceSurfaceToAppPath(sourceSurface);
  return base ? ui(SOURCE_LABELS[base]) : ui('Operational source');
}

function freshnessLabel(source: FreshnessSource, ui: (englishText: string) => string, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  const minutes = Math.max(0, Number(source.age_minutes || 0));
  if (minutes < 2) return ui('Just updated');
  if (minutes < 60) return ui('{count} min ago').replace('{count}', formatLocalizedNumber(minutes, locale));
  if (minutes < 1440) return ui('{count} h ago').replace('{count}', formatLocalizedNumber(Math.round(minutes / 60), locale));
  return ui('{count} d ago').replace('{count}', formatLocalizedNumber(Math.round(minutes / 1440), locale));
}

function matchingCountLabel(value: unknown, bounded: boolean, locale: Parameters<typeof formatLocalizedNumber>[1], ui: (englishText: string) => string): string {
  const formatted = formatLocalizedNumber(numberValue(value), locale);
  return bounded ? `${ui('At least')} ${formatted}` : formatted;
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
  return <OperationalWorkspaceStatCard label={ui(label)} value={typeof value === 'number' ? formatLocalizedNumber(value, locale) : ui(value)} helper={ui(copy)} tone={tone} iconPath={iconPath} />;
}

function PaginationBar({ page, onPrevious, onNext }: { page?: TwinPagination; onPrevious: () => void; onNext: () => void }) {
  const { locale, ui } = useAppTranslation();
  const from = numberValue(page?.from);
  const to = numberValue(page?.to);
  const total = numberValue(page?.total_matching);
  return (
    <div className="digital-twin-pagination" aria-label={ui('List pagination')}>
      <span>
        {total
          ? (page?.total_is_capped
            ? ui('Showing {from}–{to} of at least {total} matches in the current scan').replace('{from}', formatLocalizedNumber(from, locale)).replace('{to}', formatLocalizedNumber(to, locale)).replace('{total}', formatLocalizedNumber(total, locale))
            : ui('Showing {from}–{to} of {total}').replace('{from}', formatLocalizedNumber(from, locale)).replace('{to}', formatLocalizedNumber(to, locale)).replace('{total}', formatLocalizedNumber(total, locale)))
          : ui('No matching records')}
      </span>
      <div className="digital-twin-pagination-actions">
        <button className="button button--secondary" type="button" onClick={onPrevious} disabled={!page?.has_previous}>{ui('Previous')}</button>
        <button className="button button--secondary" type="button" onClick={onNext} disabled={!page?.has_more}>{ui('Next')}</button>
      </div>
    </div>
  );
}

async function fetchDigitalTwinSummary(
  filters: typeof DEFAULT_FILTERS,
  offsets: Record<PaginationKind, number>,
  focusNodeKey: string | null
): Promise<DigitalTwinResponse> {
  const params = new URLSearchParams({
    limit: filters.limit,
    search: filters.search,
    node_offset: String(offsets.nodes),
    edge_offset: String(offsets.edges),
    overlay_offset: String(offsets.overlays)
  });
  if (filters.twinDomain !== 'all') params.set('twin_domain', filters.twinDomain);
  if (filters.perspective !== 'all') params.set('view_mode', filters.perspective);
  if (filters.urgency !== 'all') params.set('urgency', filters.urgency);
  if (focusNodeKey) params.set('focus_node_key', focusNodeKey);
  return apiRequest<DigitalTwinResponse>(`/operational-action-center/digital-twin-operational-visualization-summary?${params.toString()}`);
}

export default function DigitalTwinVisualizationPage() {
  const { locale, ui } = useAppTranslation();
  const [view, setView] = useState<DigitalTwinView>('context');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  const [offsets, setOffsets] = useState<Record<PaginationKind, number>>({ nodes: 0, edges: 0, overlays: 0 });
  const [focusNodeKey, setFocusNodeKey] = useState<string | null>(null);

  const queryKey = useMemo(() => [
    'digital-twin-visualization',
    filters.twinDomain,
    filters.perspective,
    filters.urgency,
    filters.limit,
    filters.search,
    offsets.nodes,
    offsets.edges,
    offsets.overlays,
    focusNodeKey
  ], [filters, offsets, focusNodeKey]);

  const digitalTwinQuery = useQuery({
    queryKey,
    queryFn: () => fetchDigitalTwinSummary(filters, offsets, focusNodeKey)
  });

  const updateFilters = (patch: Partial<typeof DEFAULT_FILTERS>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setOffsets({ nodes: 0, edges: 0, overlays: 0 });
    setFocusNodeKey(null);
  };

  const changePage = (kind: PaginationKind, offset: number | null | undefined) => {
    if (offset === null || offset === undefined || offset < 0) return;
    setOffsets((current) => ({ ...current, [kind]: offset }));
  };

  if (digitalTwinQuery.isLoading) {
    return (
      <div className="io-operational-page io-workspace-page digital-twin-page" data-digital-twin-refined="true">
        <section className="card digital-twin-state digital-twin-state--loading" aria-live="polite">
          <span className="digital-twin-state-icon"><TenantNavIcon path="/digital-twin" size={22} /></span>
          <div><h2>{ui('Loading operational context')}</h2><p>{ui('Connecting the permitted topology, dependencies, and operational overlays.')}</p></div>
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
            <p>{digitalTwinQuery.error instanceof ApiError ? digitalTwinQuery.error.message : ui('The Digital Twin summary is temporarily unavailable.')}</p>
            <button className="button button--secondary digital-twin-link-button" type="button" onClick={() => digitalTwinQuery.refetch()}><TenantNavIcon path="/digital-twin" size={16} /> {ui('Retry')}</button>
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
  const pagination = response?.pagination || {};
  const coverage = response?.coverage;
  const focus = response?.focus;
  const reviewFirst = response?.review_first;
  const freshness = response?.freshness;
  const appliedLimit = response?.filters?.limit || Number(filters.limit);
  const hasActiveFilters = filters.twinDomain !== 'all' || filters.perspective !== 'all' || filters.urgency !== 'all' || filters.limit !== DEFAULT_FILTERS.limit || Boolean(filters.search);
  const hasContext = nodes.length > 0 || edges.length > 0 || overlays.length > 0;
  const reviewFirstPath = permittedSourcePath(reviewFirst?.source_record_path, reviewFirst?.source_surface);
  const returnedNodeCountLabel = formatLocalizedNumber(nodes.length, locale);
  const boundedCount = Boolean(coverage?.may_have_more_source_records);

  return (
    <div className="io-operational-page io-workspace-page digital-twin-page" data-digital-twin-refined="true">
      <OperationalWorkspaceHero
        iconPath="/digital-twin"
        eyebrow={ui('Read-only operational context')}
        title={ui('Review relationships, dependencies, risks, and operational pressure')}
        description={ui('This page connects permitted products, suppliers, locations, stock, purchase orders, shipments, reservations, requisitions, transfers, execution tasks, alerts, stored graph evidence, and current operational context. It is not a live simulation and does not change source records.')}
        meta={undefined}
        aside={<div className="digital-twin-hero-actions">
          <OperationalWorkspaceStatus
            value={matchingCountLabel(summary.total_matching_nodes ?? nodes.length, boundedCount, locale, ui)}
            label={ui('matching topology points · refreshed {time}').replace('{time}', formatDateTime(response?.generated_at, locale, ui)) + ` · ${ui('{count} returned').replace('{count}', returnedNodeCountLabel)}`}
          />
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
              <p className="card__subtext">{ui('Filters change only this read-only snapshot. The selected review perspective changes which matching records are emphasized first; it does not generate a live diagram, simulation, or measured heatmap.')}</p>
            </div>
          </div>
          {hasActiveFilters ? <button className="button button--secondary" type="button" onClick={() => { setFilters(DEFAULT_FILTERS); setSearchDraft(''); setOffsets({ nodes: 0, edges: 0, overlays: 0 }); setFocusNodeKey(null); }}>{ui('Clear filters')}</button> : null}
        </div>

        <form className="digital-twin-search-row" onSubmit={(event) => { event.preventDefault(); updateFilters({ search: searchDraft.trim() }); }}>
          <label>
            <span>{ui('Search connected records')}</span>
            <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder={ui('Search product, supplier, PO, shipment, task, alert…')} maxLength={200} />
          </label>
          <button className="button button--primary" type="submit">{ui('Search')}</button>
          {filters.search ? <button className="button button--secondary" type="button" onClick={() => { setSearchDraft(''); updateFilters({ search: '' }); }}>{ui('Clear search')}</button> : null}
        </form>

        <div className="digital-twin-filter-grid">
          <label><span>{ui('Operational area')}</span><select value={filters.twinDomain} onChange={(event) => updateFilters({ twinDomain: event.target.value as typeof filters.twinDomain })}>{DOMAIN_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}</select></label>
          <label><span>{ui('Review perspective')}</span><select value={filters.perspective} onChange={(event) => updateFilters({ perspective: event.target.value as typeof filters.perspective })}>{PERSPECTIVE_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}</select></label>
          <label><span>{ui('Overlay urgency')}</span><select value={filters.urgency} onChange={(event) => updateFilters({ urgency: event.target.value as typeof filters.urgency })}>{URGENCY_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}</select></label>
          <label><span>{ui('Maximum records per list')}</span><select value={filters.limit} onChange={(event) => updateFilters({ limit: event.target.value as ResultLimit })}>{LIMIT_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}</select></label>
        </div>
        <div className="digital-twin-filter-summary">
          <span>{ui('Area:')} <strong>{domainLabel(response?.filters?.twin_domain || 'all', ui)}</strong></span>
          <span>{ui('Perspective:')} <strong>{perspectiveLabel(response?.filters?.view_mode || guidance.recommended_view_mode || 'all', ui)}</strong></span>
          <span>{ui('Urgency:')} <strong>{urgencyLabel(response?.filters?.urgency || 'all', ui)}</strong></span>
          <span>{ui('Page size: {limit} per list').replace('{limit}', formatLocalizedNumber(appliedLimit, locale))}</span>
          {filters.search ? <span>{ui('Search:')} <strong>{filters.search}</strong></span> : null}
        </div>
        {coverage?.may_have_more_source_records ? (
          <div className="digital-twin-coverage-warning" role="status">
            <TenantNavIcon path="/alerts" size={16} />
            <span>{ui('One or more source areas reached the Digital Twin scan limit. The totals below are exact for the current scan, but the tenant may have additional older matching records outside this snapshot.')}</span>
          </div>
        ) : null}
      </section>

      {reviewFirst ? (
        <section className="card digital-twin-review-first" aria-labelledby="digital-twin-review-first-title">
          <div className="digital-twin-review-first-icon"><TenantNavIcon path="/alerts" size={20} /></div>
          <div className="digital-twin-review-first-copy">
            <span className="digital-twin-kicker">{ui('Review this first')}</span>
            <h2 id="digital-twin-review-first-title">{sourceText(reviewFirst.title, ui('Highest-priority connected context'))}</h2>
            {reviewFirst.summary ? <p>{reviewFirst.summary}</p> : <p>{ui('This is the highest-priority visible item in the current permitted snapshot.')}</p>}
            <div className="digital-twin-card-actions">
              {reviewFirst.node_key ? <button className="button button--primary" type="button" onClick={() => setFocusNodeKey(reviewFirst.node_key || null)}>{ui('Review connected context')}</button> : null}
              {reviewFirstPath ? <Link className="button button--secondary digital-twin-link-button" to={reviewFirstPath}><TenantNavIcon path={reviewFirstPath.split('?')[0]} size={16} /> {ui('Open exact source record')}</Link> : null}
            </div>
          </div>
          {reviewFirst.urgency ? <span className={`digital-twin-badge digital-twin-badge--${reviewFirst.urgency}`}>{urgencyLabel(reviewFirst.urgency, ui)}</span> : null}
        </section>
      ) : null}

      {freshness?.sources?.length ? (
        <section className="card digital-twin-freshness" aria-labelledby="digital-twin-freshness-title">
          <div className="digital-twin-section-heading">
            <div className="digital-twin-section-title">
              <span className="digital-twin-heading-icon"><TenantNavIcon path="/real-time-operations-feed" size={17} /></span>
              <div><h2 id="digital-twin-freshness-title">{ui('Data freshness')}</h2><p className="card__subtext">{ui('Newest visible update in each permitted source area. Older data is flagged for review instead of being presented as equally fresh.')}</p></div>
            </div>
            {(freshness.stale_source_count || freshness.aging_source_count) ? <span className="digital-twin-count-pill digital-twin-count-pill--warning">{ui('{count} source areas need freshness review').replace('{count}', formatLocalizedNumber(numberValue(freshness.stale_source_count) + numberValue(freshness.aging_source_count), locale))}</span> : <span className="digital-twin-count-pill">{ui('Source data is current')}</span>}
          </div>
          <div className="digital-twin-freshness-grid">
            {freshness.sources.slice(0, 8).map((source, index) => (
              <div className={`digital-twin-freshness-item digital-twin-freshness-item--${source.freshness_state || 'current'}`} key={`${source.source_surface || 'source'}-${index}`}>
                <strong>{sourceAreaLabel(source.source_surface, ui)}</strong>
                <span>{freshnessLabel(source, ui, locale)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="digital-twin-summary-grid io-workspace-stats" aria-label={ui('Digital Twin summary')}>
        <DigitalTwinSummaryCard iconPath="/digital-twin" label="Topology points" value={matchingCountLabel(summary.total_matching_nodes ?? summary.total_nodes ?? nodes.length, boundedCount, locale, ui)} copy="Matching permitted business records in the current read-only snapshot." />
        <DigitalTwinSummaryCard iconPath="/workspace" label="Dependencies" value={matchingCountLabel(summary.total_matching_edges ?? summary.total_edges ?? edges.length, boundedCount, locale, ui)} copy="Matching visible relationships and dependency paths between operational points." tone="slate" />
        <DigitalTwinSummaryCard iconPath="/action-center" label="Operational overlays" value={matchingCountLabel(summary.total_matching_overlays ?? summary.total_overlays ?? overlays.length, boundedCount, locale, ui)} copy="Matching Action Center, event, coordination, and knowledge-graph risk context." tone="amber" />
        <DigitalTwinSummaryCard iconPath="/alerts" label="Critical overlays" value={numberValue(summary.critical_overlays)} copy="Critical context on this page that may need prompt source-workflow review." tone="red" />
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
                {guidance.perspective_guidance ? <p className="card__subtext digital-twin-perspective-note">{guidance.perspective_guidance_key ? digitalTwinSystemText(guidance.perspective_guidance_key, guidance.perspective_guidance, ui) : guidance.perspective_guidance}</p> : null}
              </div>
            </div>
            <div className="digital-twin-shortcuts">
              <Link className="button button--secondary digital-twin-link-button" to="/action-center"><TenantNavIcon path="/action-center" size={16} /> {ui('Open Action Center')}</Link>
              <Link className="button button--secondary digital-twin-link-button" to="/collaboration"><TenantNavIcon path="/collaboration" size={16} /> {ui('Open Collaboration')}</Link>
            </div>
          </div>

          {focusNodeKey ? (
            <section className="card digital-twin-focus-panel" aria-labelledby="digital-twin-focus-title">
              <div className="digital-twin-section-heading">
                <div className="digital-twin-section-title">
                  <span className="digital-twin-heading-icon"><TenantNavIcon path="/digital-twin" size={17} /></span>
                  <div>
                    <span className="digital-twin-kicker">{ui('Connected context')}</span>
                    <h3 id="digital-twin-focus-title">{focus?.found ? sourceText(focus.label, ui('Selected topology point')) : ui('Selected topology point is no longer available')}</h3>
                    <p className="card__subtext">{focus?.found ? ui('{count} directly connected records found. The impact chain follows visible dependencies up to three steps from the selected point.').replace('{count}', formatLocalizedNumber(numberValue(focus.connected_count), locale)) : ui('Clear the selection or refresh the snapshot.')}</p>
                  </div>
                </div>
                <button className="button button--secondary" type="button" onClick={() => setFocusNodeKey(null)}>{ui('Clear selection')}</button>
              </div>

              {focus?.found ? (
                <>
                  <div className="digital-twin-focus-summary">
                    <span>{nodeTypeLabel(focus.node_type, ui)}</span>
                    <span>{domainLabel(focus.twin_domain, ui)}</span>
                    <span>{statusLabel(focus.status, ui)}</span>
                    <span>{ui('Importance: {score}').replace('{score}', formatScore(focus.importance_score, locale, ui))}</span>
                  </div>
                  {(focus.impact_chain || []).length ? (
                    <div className="digital-twin-impact-chain">
                      <h4>{ui('Impact chain')}</h4>
                      {(focus.impact_chain || []).map((step, index) => (
                        <div className="digital-twin-impact-step" key={`${step.from_node_key || 'from'}-${step.to_node_key || 'to'}-${index}`}>
                          <button type="button" onClick={() => step.from_node_key && setFocusNodeKey(step.from_node_key)}>{sourceText(step.from_label, ui('Connected record'))}</button>
                          <span>→ {relationshipLabel(step.relationship, ui)} →</span>
                          <button type="button" onClick={() => step.to_node_key && setFocusNodeKey(step.to_node_key)}>{sourceText(step.to_label, ui('Connected record'))}</button>
                        </div>
                      ))}
                    </div>
                  ) : <div className="digital-twin-inline-empty">{ui('No further dependency chain is visible for this record in the current permitted snapshot.')}</div>}
                  <div className="digital-twin-card-actions">
                    {permittedSourcePath(focus.source_record_path, focus.source_surface) ? <Link className="button button--primary digital-twin-link-button" to={permittedSourcePath(focus.source_record_path, focus.source_surface) || '/digital-twin'}><TenantNavIcon path={permittedSourcePath(focus.source_record_path, focus.source_surface)?.split('?')[0] || '/digital-twin'} size={16} /> {ui('Open exact source record')}</Link> : null}
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          {!hasContext ? (
            <div className="card digital-twin-state digital-twin-empty-state">
              <span className="digital-twin-state-icon"><TenantNavIcon path="/digital-twin" size={22} /></span>
              <div><h3>{ui('No operational context matches the current filters')}</h3><p>{ui('Clear the filters or search, or confirm that permitted source records exist for this tenant.')}</p></div>
            </div>
          ) : (
            <>
              <section className="card digital-twin-context-section" aria-labelledby="digital-twin-node-title">
                <div className="digital-twin-section-heading">
                  <div className="digital-twin-section-title">
                    <span className="digital-twin-heading-icon"><TenantNavIcon path="/digital-twin" size={17} /></span>
                    <div><h3 id="digital-twin-node-title">{ui('Topology points')}</h3><p className="card__subtext">{ui('Click any point to see what it depends on, what depends on it, and the visible impact chain.')}</p></div>
                  </div>
                  <span className="digital-twin-count-pill">{ui('{count} matching').replace('{count}', matchingCountLabel(pagination.nodes?.total_matching ?? nodes.length, boundedCount, locale, ui))}</span>
                </div>
                {nodes.length ? (
                  <div className="digital-twin-node-grid">
                    {nodes.map((node, index) => {
                      const sourcePath = permittedSourcePath(node.source_record_path, node.source_surface);
                      const basePath = sourceSurfaceToAppPath(node.source_surface);
                      return (
                        <article className={`card digital-twin-node-card${focusNodeKey === node.node_key ? ' digital-twin-node-card--selected' : ''}`} key={node.node_key || node.node_id || `${node.label || 'point'}-${index}`}>
                          <button className="digital-twin-select-record" type="button" onClick={() => node.node_key && setFocusNodeKey(node.node_key)} aria-label={ui('Review connected context for {record}').replace('{record}', sourceText(node.label, ui('Topology point')))}>
                            <div className="digital-twin-card-heading">
                              <span className="digital-twin-card-icon"><TenantNavIcon path={basePath || '/digital-twin'} size={18} /></span>
                              <div className="digital-twin-badges"><span className="digital-twin-badge">{domainLabel(node.twin_domain, ui)}</span><span className="digital-twin-badge digital-twin-badge--active">{statusLabel(node.status, ui)}</span></div>
                            </div>
                            <h4>{sourceText(node.label, ui('Topology point'))}</h4>
                            <p className="card__subtext">{nodeTypeLabel(node.node_type, ui)}</p>
                            <dl className="digital-twin-facts"><div><dt>{ui('Importance')}</dt><dd>{formatScore(node.importance_score, locale, ui)}</dd></div><div><dt>{ui('Last updated')}</dt><dd>{formatDateTime(node.updated_at || node.observed_at, locale, ui)}</dd></div></dl>
                          </button>
                          <div className="digital-twin-card-actions">
                            <button className="button button--secondary" type="button" onClick={() => node.node_key && setFocusNodeKey(node.node_key)}>{ui('Show connections')}</button>
                            {sourcePath ? <Link className="button button--secondary digital-twin-link-button" to={sourcePath}><TenantNavIcon path={basePath || '/digital-twin'} size={16} /> {ui('Open {record}').replace('{record}', sourceText(node.label, ui('record')))}</Link> : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : <div className="digital-twin-inline-empty">{ui('No topology points were returned. Clear filters or confirm that the tenant has permitted source records in the selected area.')}</div>}
                <PaginationBar page={pagination.nodes} onPrevious={() => changePage('nodes', pagination.nodes?.previous_offset)} onNext={() => changePage('nodes', pagination.nodes?.next_offset)} />
              </section>

              <section className="card digital-twin-context-section" aria-labelledby="digital-twin-edge-title">
                <div className="digital-twin-section-heading">
                  <div className="digital-twin-section-title"><span className="digital-twin-heading-icon"><TenantNavIcon path="/workspace" size={17} /></span><div><h3 id="digital-twin-edge-title">{ui('Dependencies')}</h3><p className="card__subtext">{ui('Visible relationships and dependency paths, ordered according to the selected review perspective.')}</p></div></div>
                  <span className="digital-twin-count-pill">{ui('{count} matching').replace('{count}', matchingCountLabel(pagination.edges?.total_matching ?? edges.length, boundedCount, locale, ui))}</span>
                </div>
                {edges.length ? (
                  <div className="digital-twin-dependency-list">
                    {edges.map((edge, index) => (
                      <article key={edge.edge_key || edge.edge_id || `${edge.relationship || 'dependency'}-${index}`}>
                        <span className="digital-twin-dependency-icon"><TenantNavIcon path="/digital-twin" size={16} /></span>
                        <div className="digital-twin-dependency-copy">
                          <strong>{edge.source_label && edge.target_label ? `${sourceText(edge.source_label)} → ${sourceText(edge.target_label)}` : relationshipLabel(edge.relationship, ui)}</strong>
                          <span>{relationshipLabel(edge.relationship, ui)} · {domainLabel(edge.twin_domain, ui)} · {statusLabel(edge.status, ui)}</span>
                          <div className="digital-twin-edge-actions">
                            {edge.source_node_key ? <button type="button" onClick={() => setFocusNodeKey(edge.source_node_key || null)}>{ui('Review source')}</button> : null}
                            {edge.target_node_key ? <button type="button" onClick={() => setFocusNodeKey(edge.target_node_key || null)}>{ui('Review affected record')}</button> : null}
                          </div>
                        </div>
                        <div className="digital-twin-dependency-confidence"><span>{ui('Confidence')}</span><strong>{formatPercent(edge.confidence_score, locale, ui)}</strong></div>
                      </article>
                    ))}
                  </div>
                ) : <div className="digital-twin-inline-empty">{ui('No dependency relationships were returned for the current filters.')}</div>}
                <PaginationBar page={pagination.edges} onPrevious={() => changePage('edges', pagination.edges?.previous_offset)} onNext={() => changePage('edges', pagination.edges?.next_offset)} />
              </section>

              <section className="digital-twin-overlay-section" aria-labelledby="digital-twin-overlay-title">
                <div className="digital-twin-section-heading digital-twin-section-heading--outside">
                  <div className="digital-twin-section-title"><span className="digital-twin-heading-icon"><TenantNavIcon path="/action-center" size={17} /></span><div><h3 id="digital-twin-overlay-title">{ui('Operational overlays')}</h3><p className="card__subtext">{ui('Operational pressure, coordination, event, and risk context, ordered according to the selected review perspective.')}</p></div></div>
                  <span className="digital-twin-count-pill">{ui('{count} matching').replace('{count}', matchingCountLabel(pagination.overlays?.total_matching ?? overlays.length, boundedCount, locale, ui))}</span>
                </div>
                {overlays.length ? (
                  <div className="digital-twin-overlay-grid">
                    {overlays.map((overlay, index) => {
                      const sourcePath = permittedSourcePath(overlay.source_record_path, overlay.source_surface);
                      const basePath = sourceSurfaceToAppPath(overlay.source_surface);
                      return (
                        <article className="card digital-twin-overlay-card" key={overlay.overlay_key || overlay.overlay_id || `${overlay.title || 'overlay'}-${index}`}>
                          <div className="digital-twin-card-heading"><span className="digital-twin-card-icon"><TenantNavIcon path={basePath || '/action-center'} size={18} /></span><div className="digital-twin-badges"><span className={`digital-twin-badge digital-twin-badge--${String(overlay.urgency || 'unknown').toLowerCase()}`}>{urgencyLabel(overlay.urgency, ui)}</span><span className="digital-twin-badge">{overlayTypeLabel(overlay.overlay_type, ui)}</span><span className="digital-twin-badge">{domainLabel(overlay.twin_domain, ui)}</span></div></div>
                          <h4>{overlay.title_key ? digitalTwinRiskTitle(overlay.title_key, overlay.title, ui) : sourceText(overlay.title, ui('Operational context'))}</h4>
                          <p className="card__subtext">{overlay.summary_key ? digitalTwinSystemText(overlay.summary_key, overlay.summary, ui) : (overlay.summary || ui('No additional source summary was provided.'))}</p>
                          <dl className="digital-twin-facts digital-twin-facts--overlay"><div><dt>{ui('Priority')}</dt><dd>{formatScore(overlay.priority_score, locale, ui)}</dd></div><div><dt>{ui('Confidence')}</dt><dd>{formatPercent(overlay.confidence_score, locale, ui)}</dd></div><div><dt>{ui('Last updated')}</dt><dd>{formatDateTime(overlay.updated_at || overlay.created_at, locale, ui)}</dd></div></dl>
                          <div className="digital-twin-card-actions">
                            {(overlay.target_node_key || overlay.source_node_key) ? <button className="button button--secondary" type="button" onClick={() => setFocusNodeKey(overlay.target_node_key || overlay.source_node_key || null)}>{ui('Review connected context')}</button> : null}
                            {sourcePath ? <Link className="button button--secondary digital-twin-link-button" to={sourcePath}><TenantNavIcon path={basePath || '/action-center'} size={16} /> {ui('Open exact source record')}</Link> : null}
                            {basePath !== '/action-center' ? <Link className="button button--secondary digital-twin-link-button" to="/action-center"><TenantNavIcon path="/action-center" size={16} /> {ui('Open Action Center')}</Link> : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : <div className="digital-twin-inline-empty">{ui('No operational overlays were returned for the current filters.')}</div>}
                <PaginationBar page={pagination.overlays} onPrevious={() => changePage('overlays', pagination.overlays?.previous_offset)} onNext={() => changePage('overlays', pagination.overlays?.next_offset)} />
              </section>
            </>
          )}
        </section>
      ) : null}

      {view === 'limits' ? (
        <section className="digital-twin-limit-grid" aria-labelledby="digital-twin-limits-title">
          <div className="digital-twin-section-heading digital-twin-section-heading--outside"><div className="digital-twin-section-title"><span className="digital-twin-heading-icon"><TenantNavIcon path="/permissions" size={17} /></span><div><h2 id="digital-twin-limits-title">{ui('Safety and interpretation limits')}</h2><p className="card__subtext">{ui('These rules apply to every topology point, dependency, and overlay shown on this page.')}</p></div></div></div>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/digital-twin" size={18} /></span><div><h3>{ui('Not a live simulation')}</h3><p className="card__subtext">{ui('The page shows a current read-only snapshot. It does not simulate future stock, labor, routes, facilities, or supplier behavior.')}</p></div></article>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/stock" size={18} /></span><div><h3>{ui('No automatic operational change')}</h3><p className="card__subtext">{ui('Nothing here can reassign labor, reserve stock, change routing, mutate tasks, or modify source records.')}</p></div></article>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/workspace" size={18} /></span><div><h3>{ui('Perspective changes emphasis')}</h3><p className="card__subtext">{ui('Topology, flow, risk, congestion, and dependency choices now change which matching records are prioritized first. They still do not generate a graphical map, measured heatmap, or simulation.')}</p></div></article>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/intelligence-review" size={18} /></span><div><h3>{ui('Risk context remains explainable')}</h3><p className="card__subtext">{guidance.risk_propagation_guidance_key ? digitalTwinSystemText(guidance.risk_propagation_guidance_key, guidance.risk_propagation_guidance, ui) : (guidance.risk_propagation_guidance || ui('Risk context comes from permitted source records and knowledge-graph evidence.'))}</p></div></article>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/action-center" size={18} /></span><div><h3>{ui('Congestion remains advisory')}</h3><p className="card__subtext">{guidance.congestion_heatmap_guidance_key ? digitalTwinSystemText(guidance.congestion_heatmap_guidance_key, guidance.congestion_heatmap_guidance, ui) : (guidance.congestion_heatmap_guidance || ui('Congestion context does not change work allocation or inventory.'))}</p></div></article>
          <article className="card digital-twin-limit-card"><span className="digital-twin-limit-icon"><TenantNavIcon path="/permissions" size={18} /></span><div><h3>{ui('Source permissions still apply')}</h3><p className="card__subtext">{ui('Only permitted context is returned. Every source page keeps its own route, role, permission, tenant, and workflow controls.')}</p></div></article>
        </section>
      ) : null}
    </div>
  );
}
