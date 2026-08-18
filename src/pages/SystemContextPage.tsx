import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { formatCurrencyAmount } from '../lib/tenantCurrency';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import type {
  SystemContextExecutionGateResponse,
  SystemContextForecastScenarioCaptureResponse,
  SystemContextForecastScenarioHistoryItem,
  SystemContextForecastScenarioSet,
  SystemContextResponse,
  SystemContextSnapshot,
  SystemContextSnapshotCaptureResponse,
  SystemContextSnapshotComparison
} from '../types/inventory';
import './SystemContextPage.css';

type SystemContextView = 'overview' | 'history' | 'diagnostics';
type Tone = 'neutral' | 'good' | 'warn' | 'bad';

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown error';
}

function formatNumber(value: number | string | null | undefined): string {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : '0';
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value?: string | number | null): string {
  if (!value) return 'Not reported';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not reported' : parsed.toLocaleString();
}

function humanize(value: string | null | undefined): string {
  if (!value) return 'Not evaluated';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function sourceRoute(section?: string | null): { to: string; label: string } {
  switch (String(section || '').toLowerCase()) {
    case 'alerts': return { to: '/alerts', label: 'Open Alerts' };
    case 'inventory': return { to: '/stock', label: 'Open Stock' };
    case 'procurement': return { to: '/shipments', label: 'Open Shipments' };
    case 'costing': return { to: '/reports', label: 'Open Reports' };
    case 'audit': return { to: '/audit', label: 'Open Audit' };
    case 'access': return { to: '/sessions', label: 'Open Sessions' };
    default: return { to: '/action-center', label: 'Open Action Center' };
  }
}

function riskRoute(code: string): { to: string; label: string } {
  if (code.includes('alert')) return { to: '/alerts', label: 'Open Alerts' };
  if (code.includes('cost') || code.includes('variance')) return { to: '/reports', label: 'Open Reports' };
  if (code.includes('stock')) return { to: '/stock', label: 'Open Stock' };
  return { to: '/action-center', label: 'Open Action Center' };
}

function toneForStatus(value: string | null | undefined): Tone {
  const normalized = String(value || '').toLowerCase();
  if (['ready', 'current', 'strong', 'clear_for_read_only_use', 'open_for_read_only_use', 'clean_observed'].includes(normalized)) return 'good';
  if (normalized.includes('block') || normalized.includes('attention') || normalized.includes('stale') || normalized.includes('limited')) return 'bad';
  if (normalized.includes('watch') || normalized.includes('review') || normalized.includes('warn') || normalized.includes('restricted')) return 'warn';
  return 'neutral';
}

function MetricCard(props: { iconPath: string; label: string; value: string; detail: string; tone?: Tone }) {
  return <OperationalWorkspaceStatCard label={props.label} value={props.value} helper={props.detail} tone={props.tone} iconPath={props.iconPath} />;
}

function PanelHeading(props: { iconPath: string; title: string; subtitle: string }) {
  return (
    <div className="system-context-panel-heading">
      <span className="system-context-icon-box"><TenantNavIcon path={props.iconPath} size={18} /></span>
      <div>
        <h2>{props.title}</h2>
        <p>{props.subtitle}</p>
      </div>
    </div>
  );
}

function StatusPill(props: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`system-context-pill system-context-pill--${props.tone ?? 'neutral'}`}>{props.children}</span>;
}

function EmptyState(props: { children: React.ReactNode }) {
  return <div className="system-context-empty">{props.children}</div>;
}

function ErrorNotice(props: { title: string; error: unknown }) {
  return (
    <div className="app-error-state system-context-error">
      <strong>{props.title}</strong>
      <span>{readableError(props.error)}</span>
    </div>
  );
}

function getSnapshotContext(snapshot: SystemContextSnapshot | undefined): SystemContextResponse | null {
  const value = snapshot?.context_snapshot;
  if (!value || typeof value !== 'object') return null;
  return value as SystemContextResponse;
}

export default function SystemContextPage() {
  const queryClient = useQueryClient();
  const capabilities = getRoleCapabilities();
  const canCreateExecutionRequests = capabilities.canCreateExecutionRequests;
  const canGovernDecisionIntelligence = capabilities.canGovernDecisionIntelligence;
  const canViewTenantDiagnostics = capabilities.canViewTenantDiagnostics;

  const [view, setView] = useState<SystemContextView>('overview');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [refreshingPage, setRefreshingPage] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [creatingReviewRequest, setCreatingReviewRequest] = useState(false);
  const [reviewRequestMessage, setReviewRequestMessage] = useState<string | null>(null);
  const [reviewRequestError, setReviewRequestError] = useState<string | null>(null);
  const [capturingSnapshot, setCapturingSnapshot] = useState(false);
  const [snapshotCaptureMessage, setSnapshotCaptureMessage] = useState<string | null>(null);
  const [snapshotCaptureError, setSnapshotCaptureError] = useState<string | null>(null);
  const [capturingScenarioSet, setCapturingScenarioSet] = useState(false);
  const [scenarioCaptureMessage, setScenarioCaptureMessage] = useState<string | null>(null);
  const [scenarioCaptureError, setScenarioCaptureError] = useState<string | null>(null);

  const contextQuery = useQuery({
    queryKey: ['system-context'],
    queryFn: () => apiRequest<SystemContextResponse>('/system-context')
  });

  const executionGateQuery = useQuery({
    queryKey: ['system-context-execution-gate'],
    queryFn: () => apiRequest<SystemContextExecutionGateResponse>('/system-context/execution-gate'),
    enabled: contextQuery.isSuccess
  });

  const activeView: SystemContextView = view === 'diagnostics' && !canViewTenantDiagnostics ? 'overview' : view;
  const historyEnabled = activeView === 'history';

  const snapshotsQuery = useQuery({
    queryKey: ['system-context-snapshots'],
    queryFn: () => apiRequest<SystemContextSnapshot[]>('/system-context/snapshots?limit=25'),
    enabled: historyEnabled
  });

  const selectedSnapshotQuery = useQuery({
    queryKey: ['system-context-snapshot', selectedSnapshotId],
    queryFn: () => apiRequest<SystemContextSnapshot>(`/system-context/snapshots/${selectedSnapshotId}`),
    enabled: historyEnabled && Boolean(selectedSnapshotId)
  });

  const snapshotComparisonQuery = useQuery({
    queryKey: ['system-context-snapshot-comparison'],
    queryFn: () => apiRequest<SystemContextSnapshotComparison>('/system-context/snapshots/compare/latest'),
    enabled: historyEnabled && (snapshotsQuery.data?.length ?? 0) >= 2
  });

  const forecastScenarioQuery = useQuery({
    queryKey: ['system-context-forecast-scenarios'],
    queryFn: () => apiRequest<SystemContextForecastScenarioSet>('/system-context/snapshots/forecast-scenarios?limit=25'),
    enabled: historyEnabled
  });

  const forecastScenarioHistoryQuery = useQuery({
    queryKey: ['system-context-forecast-scenario-history'],
    queryFn: () => apiRequest<SystemContextForecastScenarioHistoryItem[]>('/system-context/snapshots/forecast-scenarios/history?limit=10'),
    enabled: historyEnabled
  });

  const data = contextQuery.data;
  const executionGate = executionGateQuery.data;
  const selectedSnapshotContext = getSnapshotContext(selectedSnapshotQuery.data);

  const riskCount = data?.risk_signals?.length ?? 0;
  const criticalCount = data?.risk_signals?.filter((signal) => signal.severity === 'critical').length ?? 0;
  const recommendationCount = data?.recommendations?.length ?? 0;
  const highPriorityRecommendationCount = data?.recommendations?.filter((item) => item.priority === 'high').length ?? 0;
  const contextQualityScore = toNumber(data?.context_quality?.score);
  const automationReadinessScore = toNumber(data?.automation_readiness?.score);

  const snapshotChanges = useMemo(
    () => snapshotComparisonQuery.data?.comparisons.filter((item) => Number(item.delta) !== 0) ?? [],
    [snapshotComparisonQuery.data]
  );

  const invalidateSystemContextQueries = () => queryClient.invalidateQueries({
    predicate: (query) => String(query.queryKey[0] ?? '').startsWith('system-context')
  });

  const refreshSystemContextPage = async () => {
    setRefreshingPage(true);
    setRefreshMessage(null);
    try {
      await invalidateSystemContextQueries();
      setRefreshMessage('System Context refreshed. No stock, workflow, or automation changes were made.');
    } catch (error) {
      setRefreshMessage(`Refresh failed: ${readableError(error)}`);
    } finally {
      setRefreshingPage(false);
    }
  };

  const createSystemContextReviewRequest = async () => {
    if (!data) return;
    setReviewRequestMessage(null);
    setReviewRequestError(null);

    if (!canCreateExecutionRequests) {
      setReviewRequestError('Your role cannot create execution requests.');
      return;
    }
    if (!data.recommendations.length) {
      setReviewRequestError('There are no recommendations to place into a review request.');
      return;
    }

    setCreatingReviewRequest(true);
    try {
      const gateSnapshot = executionGate ?? await apiRequest<SystemContextExecutionGateResponse>('/system-context/execution-gate');
      await apiRequest('/execution-requests', {
        method: 'POST',
        body: JSON.stringify({
          request_type: 'system_recommendation',
          payload: {
            source: 'system_context_page',
            requested_action: 'review_system_context_recommendations',
            recommendation_codes: data.recommendations.map((item) => item.code),
            recommendation_group_codes: (data.recommendation_groups ?? []).map((group) => group.code),
            note: 'Created from System Context recommendations. This is a review request only and does not execute actions.'
          },
          gate_snapshot: gateSnapshot,
          context_snapshot: data
        })
      });
      setReviewRequestMessage('Review request created. It still follows the normal review and approval workflow.');
    } catch (error) {
      setReviewRequestError(readableError(error));
    } finally {
      setCreatingReviewRequest(false);
    }
  };

  const captureHistoricalSnapshot = async () => {
    setSnapshotCaptureMessage(null);
    setSnapshotCaptureError(null);
    if (!canGovernDecisionIntelligence) {
      setSnapshotCaptureError('Decision Intelligence governance permission is required to save planning history.');
      return;
    }

    setCapturingSnapshot(true);
    try {
      const response = await apiRequest<SystemContextSnapshotCaptureResponse>('/system-context/snapshots/capture', {
        method: 'POST',
        body: JSON.stringify({ sections: [] })
      });
      setSnapshotCaptureMessage('Read-only context snapshot saved. It did not change inventory or execute work.');
      if (response.snapshot_id) setSelectedSnapshotId(response.snapshot_id);
      await invalidateSystemContextQueries();
    } catch (error) {
      setSnapshotCaptureError(readableError(error));
    } finally {
      setCapturingSnapshot(false);
    }
  };

  const captureForecastScenarioSet = async () => {
    setScenarioCaptureMessage(null);
    setScenarioCaptureError(null);
    if (!canGovernDecisionIntelligence) {
      setScenarioCaptureError('Decision Intelligence governance permission is required to save a scenario set.');
      return;
    }

    setCapturingScenarioSet(true);
    try {
      await apiRequest<SystemContextForecastScenarioCaptureResponse>('/system-context/snapshots/forecast-scenarios/capture', {
        method: 'POST',
        body: JSON.stringify({ limit: 25 })
      });
      setScenarioCaptureMessage('Read-only scenario set saved. No forecast execution, stock mutation, or automation was performed.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['system-context-forecast-scenarios'] }),
        queryClient.invalidateQueries({ queryKey: ['system-context-forecast-scenario-history'] })
      ]);
    } catch (error) {
      setScenarioCaptureError(readableError(error));
    } finally {
      setCapturingScenarioSet(false);
    }
  };

  return (
    <div className="io-operational-page io-workspace-page io-system-context-page system-context-page">
      <OperationalWorkspaceHero
        iconPath="/system-context"
        eyebrow="Operational intelligence"
        title="System Context workspace"
        description={
          <p>
            See what the system currently knows about your operation, what needs attention, and whether the available data is safe to use for planning. This page does not change stock or execute actions.
          </p>
        }
        meta={
          <>
            <OperationalWorkspaceMetaPill>Read-only</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Tenant-scoped</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{data ? humanize(data.status) : 'Loading'}</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          <>
            <OperationalWorkspaceStatus value={riskCount} label={`risk signal${riskCount === 1 ? '' : 's'} · refreshed ${formatDateTime(contextQuery.dataUpdatedAt || null)}`} />
            <button className="app-button app-button--secondary" type="button" onClick={refreshSystemContextPage} disabled={refreshingPage}>
              {refreshingPage ? 'Refreshing…' : 'Refresh context'}
            </button>
          </>
        }
      />

      {refreshMessage ? <div className="app-info-state">{refreshMessage}</div> : null}
      {contextQuery.error ? <ErrorNotice title="System Context failed to load" error={contextQuery.error} /> : null}
      {contextQuery.isLoading ? <div className="app-empty-state">Loading system context…</div> : null}

      {data ? (
        <>
          <section className="system-context-metrics io-workspace-stats">
            <MetricCard iconPath="/system-context" label="Context status" value={humanize(data.status)} detail="Overall posture of the information available to the system." tone={toneForStatus(data.status)} />
            <MetricCard iconPath="/alerts" label="Risk signals" value={formatNumber(riskCount)} detail={`${criticalCount} critical signal${criticalCount === 1 ? '' : 's'}.`} tone={criticalCount ? 'bad' : riskCount ? 'warn' : 'good'} />
            <MetricCard iconPath="/action-center" label="Recommended actions" value={formatNumber(recommendationCount)} detail={`${highPriorityRecommendationCount} high-priority item${highPriorityRecommendationCount === 1 ? '' : 's'}.`} tone={highPriorityRecommendationCount ? 'bad' : recommendationCount ? 'warn' : 'good'} />
            <MetricCard iconPath="/insights" label="Data quality" value={`${formatNumber(contextQualityScore)}%`} detail={humanize(data.context_quality?.status)} tone={toneForStatus(data.context_quality?.status)} />
            <MetricCard iconPath="/reliability-command" label="Planning readiness" value={`${formatNumber(automationReadinessScore)}%`} detail={`${formatNumber(data.automation_readiness?.failed_checks)} blocker${toNumber(data.automation_readiness?.failed_checks) === 1 ? '' : 's'}.`} tone={toneForStatus(data.automation_readiness?.status)} />
          </section>

          <OperationalWorkspaceTabs ariaLabel="System Context views">
            <OperationalWorkspaceTab active={activeView === 'overview'} iconPath="/system-context" label="Overview" onClick={() => setView('overview')} />
            <OperationalWorkspaceTab active={activeView === 'history'} iconPath="/probabilistic-forecasting" label="Planning history" onClick={() => setView('history')} />
            {canViewTenantDiagnostics ? (
              <OperationalWorkspaceTab active={activeView === 'diagnostics'} iconPath="/admin-system" label="Diagnostics" onClick={() => setView('diagnostics')} />
            ) : null}
          </OperationalWorkspaceTabs>

          {activeView === 'overview' ? (
            <div className="system-context-view">
              <section className="app-panel app-panel--padded system-context-panel">
                <PanelHeading iconPath="/action-center" title="What needs attention" subtitle="These are the current tenant issues System Context believes deserve human review. The source workflow remains authoritative." />
                {data.risk_signals.length ? (
                  <div className="system-context-action-list">
                    {data.risk_signals.map((signal) => {
                      const route = riskRoute(signal.code);
                      const tone: Tone = signal.severity === 'critical' ? 'bad' : signal.severity === 'warning' ? 'warn' : 'neutral';
                      return (
                        <article className="system-context-action-card" key={signal.code}>
                          <div className="system-context-action-card__body">
                            <StatusPill tone={tone}>{humanize(signal.severity)}</StatusPill>
                            <div>
                              <strong>{signal.message}</strong>
                              <span>{signal.count !== undefined ? `${formatNumber(signal.count)} affected item${toNumber(signal.count) === 1 ? '' : 's'}.` : 'Review the source workflow for current evidence.'}</span>
                            </div>
                          </div>
                          <Link className="button button--secondary" to={route.to}>{route.label}</Link>
                        </article>
                      );
                    })}
                  </div>
                ) : <EmptyState>No current System Context risk signals.</EmptyState>}
              </section>

              <section className="app-panel app-panel--padded system-context-panel">
                <div className="system-context-panel-heading-row">
                  <PanelHeading iconPath="/collaboration" title="Recommended next steps" subtitle="Plain-language guidance for people. Nothing below is executed automatically." />
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={createSystemContextReviewRequest}
                    disabled={creatingReviewRequest || !canCreateExecutionRequests || data.recommendations.length === 0}
                  >
                    <TenantNavIcon path="/execution-requests" size={16} />
                    {creatingReviewRequest ? 'Creating…' : 'Create review request'}
                  </button>
                </div>
                {reviewRequestMessage ? <div className="app-success-state">{reviewRequestMessage}</div> : null}
                {reviewRequestError ? <div className="app-error-state">{reviewRequestError}</div> : null}
                {data.recommendations.length ? (
                  <div className="system-context-recommendations">
                    {data.recommendations.map((item) => {
                      const route = sourceRoute(item.source_section);
                      const tone: Tone = item.priority === 'high' ? 'bad' : item.priority === 'medium' ? 'warn' : 'neutral';
                      return (
                        <article className="system-context-recommendation" key={item.code}>
                          <div className="system-context-recommendation__top">
                            <StatusPill tone={tone}>{humanize(item.priority)}</StatusPill>
                            {item.requires_human_review ? <StatusPill>Human review</StatusPill> : null}
                            {item.executes_actions === false ? <StatusPill tone="good">Read-only</StatusPill> : null}
                          </div>
                          <h3>{item.title}</h3>
                          <p>{item.action}</p>
                          {item.ranking_reason ? <span className="system-context-muted">Why: {item.ranking_reason}</span> : null}
                          <Link to={route.to}>{route.label} →</Link>
                        </article>
                      );
                    })}
                  </div>
                ) : <EmptyState>No recommendations right now.</EmptyState>}
              </section>

              <section className="system-context-two-column">
                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/stock" title="Operational snapshot" subtitle="A small set of business facts that are useful to a tenant. Internal identifiers and engine data are intentionally omitted." />
                  <div className="system-context-summary-grid">
                    <div><span>Products</span><strong>{formatNumber(data.context.inventory?.total_products)}</strong></div>
                    <div><span>Low-stock products</span><strong>{formatNumber(data.context.inventory?.low_stock_products)}</strong></div>
                    <div><span>Storage locations</span><strong>{formatNumber(data.context.inventory?.storage_locations)}</strong></div>
                    <div><span>Open shipments</span><strong>{formatNumber(data.context.procurement?.open_shipments)}</strong></div>
                    <div><span>Partial shipments</span><strong>{formatNumber(data.context.procurement?.partial_shipments)}</strong></div>
                    <div><span>Open purchase orders</span><strong>{formatNumber(data.context.procurement?.open_purchase_orders)}</strong></div>
                    <div><span>Estimated inventory value</span><strong>{formatCurrencyAmount(data.context.costing?.estimated_inventory_value)}</strong></div>
                    <div><span>Unresolved alerts</span><strong>{formatNumber(data.context.alerts?.unresolved_alerts)}</strong></div>
                  </div>
                  <div className="system-context-link-row">
                    <Link to="/stock">Open Stock</Link><Link to="/shipments">Open Shipments</Link><Link to="/reports">Open Reports</Link>
                  </div>
                </div>

                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/reliability-command" title="Data confidence" subtitle="How complete and current the information is before people rely on it for planning." />
                  <div className="system-context-confidence-block">
                    <div><span>Quality</span><strong>{formatNumber(data.context_quality.score)}%</strong><StatusPill tone={toneForStatus(data.context_quality.status)}>{humanize(data.context_quality.status)}</StatusPill></div>
                    <div><span>Freshness</span><strong>{humanize(data.context_freshness.status)}</strong><StatusPill tone={toneForStatus(data.context_freshness.status)}>{formatNumber(data.context_freshness.stale_sources)} stale</StatusPill></div>
                    <div><span>Planning readiness</span><strong>{formatNumber(data.automation_readiness.score)}%</strong><StatusPill tone={toneForStatus(data.automation_readiness.status)}>{humanize(data.automation_readiness.status)}</StatusPill></div>
                  </div>
                  <p className="system-context-muted">{data.context_quality.summary}</p>
                  {toNumber(data.context_freshness.stale_sources) > 0 || toNumber(data.context_freshness.aging_sources) > 0 ? (
                    <div className="system-context-mini-list">
                      {data.context_freshness.items.filter((item) => ['stale', 'aging', 'unknown'].includes(item.status)).slice(0, 5).map((item) => (
                        <div key={item.section}><strong>{humanize(item.section)}</strong><span>{item.message}</span></div>
                      ))}
                    </div>
                  ) : <EmptyState>All reported context sources are current.</EmptyState>}
                </div>
              </section>

              <section className="app-panel app-panel--padded system-context-panel">
                <PanelHeading iconPath="/reliability-command" title="Safety boundaries" subtitle="What this page can and cannot do. These protections are more important to a tenant than the internal engine implementation." />
                <div className="system-context-safety-grid">
                  <div className="system-context-safety-card system-context-safety-card--good"><strong>Read operational context</strong><span>Yes</span><p>Information is scoped to the current tenant.</p></div>
                  <div className="system-context-safety-card system-context-safety-card--good"><strong>Create a review request</strong><span>{canCreateExecutionRequests ? 'Permission-based' : 'No permission'}</span><p>A request enters the normal governed review workflow.</p></div>
                  <div className="system-context-safety-card"><strong>Change inventory</strong><span>No</span><p>System Context does not change quantities, products, shipments, or suppliers.</p></div>
                  <div className="system-context-safety-card"><strong>Run automation</strong><span>No</span><p>No automatic execution is performed from this page.</p></div>
                  <div className="system-context-safety-card"><strong>Human approval</strong><span>{data.context_freshness.predictive_guardrails?.approval_required_for_any_followup === false ? 'Policy dependent' : 'Required'}</span><p>Follow-up work stays in the authoritative source workflow.</p></div>
                </div>
              </section>
            </div>
          ) : null}

          {activeView === 'history' ? (
            <div className="system-context-view">
              <section className="app-panel app-panel--padded system-context-panel">
                <div className="system-context-panel-heading-row">
                  <PanelHeading iconPath="/probabilistic-forecasting" title="Planning history" subtitle="Optional read-only history for comparing how operational context changes over time. This is useful for managers and administrators, but it is not required for everyday stock work." />
                  <div className="system-context-button-row">
                    <button className="button button--secondary" type="button" onClick={captureHistoricalSnapshot} disabled={capturingSnapshot || !canGovernDecisionIntelligence}>
                      {capturingSnapshot ? 'Saving…' : 'Save context snapshot'}
                    </button>
                    <button className="button button--secondary" type="button" onClick={captureForecastScenarioSet} disabled={capturingScenarioSet || !canGovernDecisionIntelligence}>
                      {capturingScenarioSet ? 'Saving…' : 'Save scenario set'}
                    </button>
                  </div>
                </div>
                {!canGovernDecisionIntelligence ? <div className="app-info-state">Saving analytical history requires Decision Intelligence governance permission. You can still view existing history.</div> : null}
                {snapshotCaptureMessage ? <div className="app-success-state">{snapshotCaptureMessage}</div> : null}
                {snapshotCaptureError ? <div className="app-error-state">{snapshotCaptureError}</div> : null}
                {scenarioCaptureMessage ? <div className="app-success-state">{scenarioCaptureMessage}</div> : null}
                {scenarioCaptureError ? <div className="app-error-state">{scenarioCaptureError}</div> : null}
              </section>

              <section className="system-context-two-column">
                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/system-context" title="Saved context snapshots" subtitle="Point-in-time records of this page's read-only context." />
                  {snapshotsQuery.isLoading ? <EmptyState>Loading snapshots…</EmptyState> : null}
                  {snapshotsQuery.error ? <ErrorNotice title="Snapshots failed to load" error={snapshotsQuery.error} /> : null}
                  {snapshotsQuery.data?.length ? (
                    <div className="system-context-history-list">
                      {snapshotsQuery.data.map((snapshot) => (
                        <button key={snapshot.id} type="button" className={selectedSnapshotId === snapshot.id ? 'is-selected' : ''} onClick={() => setSelectedSnapshotId(snapshot.id)}>
                          <strong>{formatDateTime(snapshot.generated_at)}</strong>
                          <span>{humanize(snapshot.snapshot_status || 'captured')} · {humanize(snapshot.source)}</span>
                        </button>
                      ))}
                    </div>
                  ) : !snapshotsQuery.isLoading ? <EmptyState>No saved snapshots yet.</EmptyState> : null}
                </div>

                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/insights" title="Selected snapshot" subtitle="A tenant-friendly summary. Internal IDs, fingerprints, source tables, and raw JSON are intentionally hidden." />
                  {selectedSnapshotQuery.isLoading ? <EmptyState>Loading selected snapshot…</EmptyState> : null}
                  {selectedSnapshotQuery.error ? <ErrorNotice title="Snapshot detail failed to load" error={selectedSnapshotQuery.error} /> : null}
                  {selectedSnapshotQuery.data ? (
                    <div className="system-context-snapshot-summary">
                      <div><span>Captured</span><strong>{formatDateTime(selectedSnapshotQuery.data.generated_at)}</strong></div>
                      <div><span>Status</span><strong>{humanize(selectedSnapshotQuery.data.snapshot_status)}</strong></div>
                      <div><span>Risk signals</span><strong>{selectedSnapshotContext ? formatNumber(selectedSnapshotContext.risk_signals?.length) : 'Not stored'}</strong></div>
                      <div><span>Recommendations</span><strong>{selectedSnapshotContext ? formatNumber(selectedSnapshotContext.recommendations?.length) : 'Not stored'}</strong></div>
                      <div><span>Context quality</span><strong>{selectedSnapshotContext ? `${formatNumber(selectedSnapshotContext.context_quality?.score)}%` : 'Not stored'}</strong></div>
                      <div><span>Planning readiness</span><strong>{selectedSnapshotContext ? `${formatNumber(selectedSnapshotContext.automation_readiness?.score)}%` : 'Not stored'}</strong></div>
                    </div>
                  ) : <EmptyState>Select a snapshot to review its summary.</EmptyState>}
                </div>
              </section>

              <section className="app-panel app-panel--padded system-context-panel">
                <PanelHeading iconPath="/insights" title="What changed between the latest snapshots" subtitle="Only business-facing changes are shown. This comparison is read-only." />
                {(snapshotsQuery.data?.length ?? 0) < 2 ? <EmptyState>At least two snapshots are needed for comparison.</EmptyState> : null}
                {snapshotComparisonQuery.isLoading ? <EmptyState>Comparing snapshots…</EmptyState> : null}
                {snapshotComparisonQuery.error ? <ErrorNotice title="Snapshot comparison failed" error={snapshotComparisonQuery.error} /> : null}
                {snapshotComparisonQuery.data && (snapshotsQuery.data?.length ?? 0) >= 2 ? (
                  <>
                    <div className="system-context-comparison-meta">{formatDateTime(snapshotComparisonQuery.data.previous_generated_at)} → {formatDateTime(snapshotComparisonQuery.data.current_generated_at)}</div>
                    {snapshotChanges.length ? (
                      <div className="system-context-summary-grid">
                        {snapshotChanges.map((item) => (
                          <div key={item.code}><span>{item.label}</span><strong>{item.delta > 0 ? '+' : ''}{formatNumber(item.delta)}</strong><small>{formatNumber(item.previous)} → {formatNumber(item.current)}</small></div>
                        ))}
                      </div>
                    ) : <EmptyState>No measured values changed between the latest two snapshots.</EmptyState>}
                  </>
                ) : null}
              </section>

              <section className="app-panel app-panel--padded system-context-panel">
                <PanelHeading iconPath="/probabilistic-forecasting" title="Read-only scenario planning" subtitle="Scenario evidence is optional planning support. It does not run a live forecast model, create stock changes, or execute automation." />
                {forecastScenarioQuery.isLoading ? <EmptyState>Loading scenario planning…</EmptyState> : null}
                {forecastScenarioQuery.error ? <ErrorNotice title="Scenario planning failed to load" error={forecastScenarioQuery.error} /> : null}
                {forecastScenarioQuery.data?.status === 'insufficient_history' ? (
                  <EmptyState>More saved context history is required before scenario planning can be calculated. Available snapshots: {formatNumber(forecastScenarioQuery.data.available_snapshots)}.</EmptyState>
                ) : forecastScenarioQuery.data?.forecast_scenarios?.length ? (
                  <div className="system-context-recommendations">
                    {forecastScenarioQuery.data.forecast_scenarios.slice(0, 8).map((scenario) => (
                      <article className="system-context-recommendation" key={scenario.code}>
                        <div className="system-context-recommendation__top"><StatusPill>{humanize(scenario.priority)}</StatusPill><StatusPill tone="good">Read-only</StatusPill></div>
                        <h3>{scenario.label}</h3>
                        <p>Direction: {humanize(scenario.preview_direction)} · Projected change: {formatNumber(scenario.projected_delta)}</p>
                        <span className="system-context-muted">Confidence {formatNumber(scenario.confidence_score)} · Risk {humanize(scenario.risk_classification)}</span>
                      </article>
                    ))}
                  </div>
                ) : !forecastScenarioQuery.isLoading ? <EmptyState>No scenario rows are available.</EmptyState> : null}

                {forecastScenarioHistoryQuery.data?.length ? (
                  <details className="system-context-details">
                    <summary>Saved scenario sets ({forecastScenarioHistoryQuery.data.length})</summary>
                    <div className="system-context-history-list system-context-history-list--static">
                      {forecastScenarioHistoryQuery.data.map((item) => (
                        <div key={item.id}><strong>{formatDateTime(item.generated_at)}</strong><span>{formatNumber(item.scenario_summary?.scenario_count)} scenarios · {humanize(item.scenario_status)}</span></div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </section>
            </div>
          ) : null}

          {activeView === 'diagnostics' && canViewTenantDiagnostics ? (
            <div className="system-context-view">
              <section className="app-panel app-panel--padded system-context-panel system-context-diagnostics-intro">
                <PanelHeading iconPath="/admin-system" title="Tenant diagnostics" subtitle="Restricted implementation context for administrators with Tenant Diagnostics permission. The previous page exposed dozens of low-level forecast and execution-engine panels to every System Context reader; those details are now intentionally removed from the normal tenant experience." />
                <div className="app-info-state">Internal Phase B/C/D step names, raw blocker codes, fingerprints, source-table names, replay internals, and model-engine plumbing are not shown here because they do not help a tenant operate inventory.</div>
              </section>

              <section className="system-context-two-column">
                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/reliability-command" title="Execution safety" subtitle="Compact technical evidence about whether System Context could be used as input to a governed follow-up." />
                  {executionGateQuery.isLoading ? <EmptyState>Loading execution safety…</EmptyState> : null}
                  {executionGateQuery.error ? <ErrorNotice title="Execution safety failed to load" error={executionGateQuery.error} /> : null}
                  {executionGate ? (
                    <div className="system-context-diagnostic-list">
                      <div><span>Gate</span><strong>{executionGate.allowed ? 'Open' : 'Blocked'}</strong></div>
                      <div><span>Risk level</span><strong>{humanize(executionGate.risk_level)}</strong></div>
                      <div><span>Readiness</span><strong>{humanize(executionGate.evidence.readiness_status)}</strong></div>
                      <div><span>Blocked gates</span><strong>{formatNumber(executionGate.evidence.blocked_execution_gates)}</strong></div>
                      <div><span>Critical risks</span><strong>{formatNumber(executionGate.evidence.critical_risk_signals.length)}</strong></div>
                      <div><span>Mutation allowed by dry-run policy</span><strong>{executionGate.evidence.mutation_allowed_by_dry_run_policy ? 'Yes' : 'No'}</strong></div>
                    </div>
                  ) : null}
                </div>

                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/system-context" title="Context contract" subtitle="The safety contract currently returned by the System Context service." />
                  <div className="system-context-diagnostic-list">
                    <div><span>Read-only</span><strong>{data.automation_contract.read_only ? 'Yes' : 'No'}</strong></div>
                    <div><span>Tenant-scoped</span><strong>{data.automation_contract.tenant_scoped ? 'Yes' : 'No'}</strong></div>
                    <div><span>Safe for AI summary</span><strong>{data.automation_contract.safe_for_ai_summary ? 'Yes' : 'No'}</strong></div>
                    <div><span>Mutation allowed</span><strong>{data.automation_contract.mutation_allowed ? 'Yes' : 'No'}</strong></div>
                    <div><span>Decision boundary</span><strong>{humanize(data.decision_boundaries.status)}</strong></div>
                    <div><span>Escalation conditions</span><strong>{formatNumber(data.decision_boundaries.escalation_conditions.length)}</strong></div>
                  </div>
                </div>
              </section>

              <section className="app-panel app-panel--padded system-context-panel">
                <PanelHeading iconPath="/insights" title="Source health" subtitle="Logical source groups only. Database table names are deliberately not exposed in the tenant UI." />
                <div className="system-context-source-grid">
                  {data.context_sources.map((source) => {
                    const freshness = data.context_freshness.items.find((item) => item.section === source.section);
                    const quality = data.context_quality.source_quality.find((item) => item.section === source.section);
                    return (
                      <article key={source.section}>
                        <div><strong>{humanize(source.section)}</strong><StatusPill tone={toneForStatus(freshness?.status)}>{humanize(freshness?.status)}</StatusPill></div>
                        <p>{source.description}</p>
                        <span>Quality {quality ? formatNumber(quality.score) : '—'}% · Last observed {formatDateTime(source.last_observed_at)}</span>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
