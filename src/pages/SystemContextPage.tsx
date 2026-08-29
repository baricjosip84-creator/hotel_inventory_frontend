import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppTranslation } from '../i18n/I18nContext';
import type { AppLocale } from '../i18n/config';
import { formatLocalizedCurrency, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { formatCurrencyAmount, getActiveTenantCurrency } from '../lib/tenantCurrency';
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

type UiTranslator = (englishText: string) => string;

const KNOWN_VALUE_LABELS: Record<string, string> = {
  access: 'Access', alerts: 'Alerts', attention_required: 'Attention required', available: 'Available',
  blocked: 'Blocked', captured: 'Captured', clean_observed: 'Clean observed', costing: 'Costing',
  critical: 'Critical', current: 'Current', fresh: 'Fresh', high: 'High', included: 'Included', info: 'Info',
  insufficient_history: 'Insufficient history', inventory: 'Inventory', limited: 'Limited', low: 'Low', medium: 'Medium',
  needs_review: 'Needs review', negative: 'Negative', neutral: 'Neutral', not_timestamped: 'Not timestamped',
  open_for_read_only_use: 'Open for read-only use', positive: 'Positive', procurement: 'Procurement', ready: 'Ready',
  restricted: 'Restricted', review_recommended: 'Review recommended', stale: 'Stale', stale_sources_present: 'Stale sources present',
  strong: 'Strong', system_context: 'System Context', unknown: 'Unknown', usable_with_review: 'Usable with review',
  warning: 'Warning', watch: 'Watch', aging: 'Aging', improving: 'Improving', degrading: 'Degrading', stable: 'Stable',
  clear_for_read_only_use: 'Clear for read-only use'
};

function readableError(error: unknown, unknownErrorLabel: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return unknownErrorLabel;
}

function formatNumber(value: number | string | null | undefined, locale: AppLocale): string {
  const parsed = Number(value ?? 0);
  return formatLocalizedNumber(Number.isFinite(parsed) ? parsed : 0, locale);
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercentScore(value: number | string | null | undefined, locale: AppLocale): string {
  return formatLocalizedNumber(toNumber(value) / 100, locale, { style: 'percent', maximumFractionDigits: 2 });
}

function formatDateTime(value: string | number | null | undefined, locale: AppLocale, ui: UiTranslator): string {
  if (!value) return ui('Not reported');
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? ui('Not reported') : formatLocalizedDateTime(parsed, locale);
}

function formatKnownValue(value: string | null | undefined, ui: UiTranslator): string {
  if (!value) return ui('Not evaluated');
  const label = KNOWN_VALUE_LABELS[String(value).toLowerCase()];
  return label ? ui(label) : value;
}

function sourceRoute(section: string | null | undefined, ui: UiTranslator): { to: string; label: string } {
  switch (String(section || '').toLowerCase()) {
    case 'alerts': return { to: '/alerts', label: ui('Open Alerts') };
    case 'inventory': return { to: '/stock', label: ui('Open Stock') };
    case 'procurement': return { to: '/shipments', label: ui('Open Shipments') };
    case 'costing': return { to: '/reports', label: ui('Open Reports') };
    case 'audit': return { to: '/audit', label: ui('Open Audit') };
    case 'access': return { to: '/sessions', label: ui('Open Sessions') };
    default: return { to: '/action-center', label: ui('Open Action Center') };
  }
}

function riskRoute(code: string, ui: UiTranslator): { to: string; label: string } {
  if (code.includes('alert')) return { to: '/alerts', label: ui('Open Alerts') };
  if (code.includes('cost') || code.includes('variance')) return { to: '/reports', label: ui('Open Reports') };
  if (code.includes('stock')) return { to: '/stock', label: ui('Open Stock') };
  return { to: '/action-center', label: ui('Open Action Center') };
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

function ErrorNotice(props: { title: string; error: unknown; unknownErrorLabel: string }) {
  return (
    <div className="app-error-state system-context-error">
      <strong>{props.title}</strong>
      <span>{readableError(props.error, props.unknownErrorLabel)}</span>
    </div>
  );
}

function getSnapshotContext(snapshot: SystemContextSnapshot | undefined): SystemContextResponse | null {
  const value = snapshot?.context_snapshot;
  if (!value || typeof value !== 'object') return null;
  return value as SystemContextResponse;
}

export default function SystemContextPage() {
  const { locale, ui } = useAppTranslation();
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
      setRefreshMessage(ui('System Context refreshed. No stock, workflow, or automation changes were made.'));
    } catch (error) {
      setRefreshMessage(ui('Refresh failed: {error}').replace('{error}', readableError(error, ui('Unknown error'))));
    } finally {
      setRefreshingPage(false);
    }
  };

  const createSystemContextReviewRequest = async () => {
    if (!data) return;
    setReviewRequestMessage(null);
    setReviewRequestError(null);

    if (!canCreateExecutionRequests) {
      setReviewRequestError(ui('Your role cannot create execution requests.'));
      return;
    }
    if (!data.recommendations.length) {
      setReviewRequestError(ui('There are no recommendations to place into a review request.'));
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
      setReviewRequestMessage(ui('Review request created. It still follows the normal review and approval workflow.'));
    } catch (error) {
      setReviewRequestError(readableError(error, ui('Unknown error')));
    } finally {
      setCreatingReviewRequest(false);
    }
  };

  const captureHistoricalSnapshot = async () => {
    setSnapshotCaptureMessage(null);
    setSnapshotCaptureError(null);
    if (!canGovernDecisionIntelligence) {
      setSnapshotCaptureError(ui('Decision Intelligence governance permission is required to save planning history.'));
      return;
    }

    setCapturingSnapshot(true);
    try {
      const response = await apiRequest<SystemContextSnapshotCaptureResponse>('/system-context/snapshots/capture', {
        method: 'POST',
        body: JSON.stringify({ sections: [] })
      });
      setSnapshotCaptureMessage(ui('Read-only context snapshot saved. It did not change inventory or execute work.'));
      if (response.snapshot_id) setSelectedSnapshotId(response.snapshot_id);
      await invalidateSystemContextQueries();
    } catch (error) {
      setSnapshotCaptureError(readableError(error, ui('Unknown error')));
    } finally {
      setCapturingSnapshot(false);
    }
  };

  const captureForecastScenarioSet = async () => {
    setScenarioCaptureMessage(null);
    setScenarioCaptureError(null);
    if (!canGovernDecisionIntelligence) {
      setScenarioCaptureError(ui('Decision Intelligence governance permission is required to save a scenario set.'));
      return;
    }

    setCapturingScenarioSet(true);
    try {
      await apiRequest<SystemContextForecastScenarioCaptureResponse>('/system-context/snapshots/forecast-scenarios/capture', {
        method: 'POST',
        body: JSON.stringify({ limit: 25 })
      });
      setScenarioCaptureMessage(ui('Read-only scenario set saved. No forecast execution, stock mutation, or automation was performed.'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['system-context-forecast-scenarios'] }),
        queryClient.invalidateQueries({ queryKey: ['system-context-forecast-scenario-history'] })
      ]);
    } catch (error) {
      setScenarioCaptureError(readableError(error, ui('Unknown error')));
    } finally {
      setCapturingScenarioSet(false);
    }
  };

  return (
    <div className="io-operational-page io-workspace-page io-system-context-page system-context-page">
      <OperationalWorkspaceHero
        iconPath="/system-context"
        eyebrow={ui('Operational intelligence')}
        title={ui('System Context workspace')}
        description={
          <p>{ui('See what the system currently knows about your operation, what needs attention, and whether the available data is safe to use for planning. This page does not change stock or execute actions.')}</p>
        }
        meta={
          <>
            <OperationalWorkspaceMetaPill>{ui('Read-only')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{data ? formatKnownValue(data.status, ui) : ui('Loading')}</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          <>
            <OperationalWorkspaceStatus value={riskCount} label={(riskCount === 1 ? ui('{count} risk signal · refreshed {time}') : ui('{count} risk signals · refreshed {time}')).replace('{count}', formatNumber(riskCount, locale)).replace('{time}', formatDateTime(contextQuery.dataUpdatedAt || null, locale, ui))} />
            <button className="app-button app-button--secondary" type="button" onClick={refreshSystemContextPage} disabled={refreshingPage}>
              {refreshingPage ? ui('Refreshing…') : ui('Refresh context')}
            </button>
          </>
        }
      />

      {refreshMessage ? <div className="app-info-state">{refreshMessage}</div> : null}
      {contextQuery.error ? <ErrorNotice title={ui('System Context failed to load')} error={contextQuery.error} unknownErrorLabel={ui('Unknown error')} /> : null}
      {contextQuery.isLoading ? <div className="app-empty-state">{ui('Loading system context…')}</div> : null}

      {data ? (
        <>
          <section className="system-context-metrics io-workspace-stats">
            <MetricCard iconPath="/system-context" label={ui('Context status')} value={formatKnownValue(data.status, ui)} detail={ui('Overall posture of the information available to the system.')} tone={toneForStatus(data.status)} />
            <MetricCard iconPath="/alerts" label={ui('Risk signals')} value={formatNumber(riskCount, locale)} detail={(criticalCount === 1 ? ui('{count} critical signal.') : ui('{count} critical signals.')).replace('{count}', formatNumber(criticalCount, locale))} tone={criticalCount ? 'bad' : riskCount ? 'warn' : 'good'} />
            <MetricCard iconPath="/action-center" label={ui('Recommended actions')} value={formatNumber(recommendationCount, locale)} detail={(highPriorityRecommendationCount === 1 ? ui('{count} high-priority item.') : ui('{count} high-priority items.')).replace('{count}', formatNumber(highPriorityRecommendationCount, locale))} tone={highPriorityRecommendationCount ? 'bad' : recommendationCount ? 'warn' : 'good'} />
            <MetricCard iconPath="/insights" label={ui('Data quality')} value={formatPercentScore(contextQualityScore, locale)} detail={formatKnownValue(data.context_quality?.status, ui)} tone={toneForStatus(data.context_quality?.status)} />
            <MetricCard iconPath="/reliability-command" label={ui('Planning readiness')} value={formatPercentScore(automationReadinessScore, locale)} detail={(toNumber(data.automation_readiness?.failed_checks) === 1 ? ui('{count} blocker.') : ui('{count} blockers.')).replace('{count}', formatNumber(data.automation_readiness?.failed_checks, locale))} tone={toneForStatus(data.automation_readiness?.status)} />
          </section>

          <OperationalWorkspaceTabs ariaLabel={ui('System Context views')}>
            <OperationalWorkspaceTab active={activeView === 'overview'} iconPath="/system-context" label={ui('Overview')} onClick={() => setView('overview')} />
            <OperationalWorkspaceTab active={activeView === 'history'} iconPath="/probabilistic-forecasting" label={ui('Planning history')} onClick={() => setView('history')} />
            {canViewTenantDiagnostics ? (
              <OperationalWorkspaceTab active={activeView === 'diagnostics'} iconPath="/admin-system" label={ui('Diagnostics')} onClick={() => setView('diagnostics')} />
            ) : null}
          </OperationalWorkspaceTabs>

          {activeView === 'overview' ? (
            <div className="system-context-view">
              <section className="app-panel app-panel--padded system-context-panel">
                <PanelHeading iconPath="/action-center" title={ui('What needs attention')} subtitle={ui('These are the current tenant issues System Context believes deserve human review. The source workflow remains authoritative.')} />
                {data.risk_signals.length ? (
                  <div className="system-context-action-list">
                    {data.risk_signals.map((signal) => {
                      const route = riskRoute(signal.code, ui);
                      const tone: Tone = signal.severity === 'critical' ? 'bad' : signal.severity === 'warning' ? 'warn' : 'neutral';
                      return (
                        <article className="system-context-action-card" key={signal.code}>
                          <div className="system-context-action-card__body">
                            <StatusPill tone={tone}>{formatKnownValue(signal.severity, ui)}</StatusPill>
                            <div>
                              <strong>{signal.message}</strong>
                              <span>{signal.count !== undefined ? (toNumber(signal.count) === 1 ? ui('{count} affected item.') : ui('{count} affected items.')).replace('{count}', formatNumber(signal.count, locale)) : ui('Review the source workflow for current evidence.')}</span>
                            </div>
                          </div>
                          <Link className="button button--secondary" to={route.to}>{route.label}</Link>
                        </article>
                      );
                    })}
                  </div>
                ) : <EmptyState>{ui('No current System Context risk signals.')}</EmptyState>}
              </section>

              <section className="app-panel app-panel--padded system-context-panel">
                <div className="system-context-panel-heading-row">
                  <PanelHeading iconPath="/collaboration" title={ui('Recommended next steps')} subtitle={ui('Plain-language guidance for people. Nothing below is executed automatically.')} />
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={createSystemContextReviewRequest}
                    disabled={creatingReviewRequest || !canCreateExecutionRequests || data.recommendations.length === 0}
                  >
                    <TenantNavIcon path="/execution-requests" size={16} />
                    {creatingReviewRequest ? ui('Creating…') : ui('Create review request')}
                  </button>
                </div>
                {reviewRequestMessage ? <div className="app-success-state">{reviewRequestMessage}</div> : null}
                {reviewRequestError ? <div className="app-error-state">{reviewRequestError}</div> : null}
                {data.recommendations.length ? (
                  <div className="system-context-recommendations">
                    {data.recommendations.map((item) => {
                      const route = sourceRoute(item.source_section, ui);
                      const tone: Tone = item.priority === 'high' ? 'bad' : item.priority === 'medium' ? 'warn' : 'neutral';
                      return (
                        <article className="system-context-recommendation" key={item.code}>
                          <div className="system-context-recommendation__top">
                            <StatusPill tone={tone}>{formatKnownValue(item.priority, ui)}</StatusPill>
                            {item.requires_human_review ? <StatusPill>{ui('Human review')}</StatusPill> : null}
                            {item.executes_actions === false ? <StatusPill tone="good">{ui('Read-only')}</StatusPill> : null}
                          </div>
                          <h3>{item.title}</h3>
                          <p>{item.action}</p>
                          {item.ranking_reason ? <span className="system-context-muted">{ui('Why: {reason}').replace('{reason}', item.ranking_reason)}</span> : null}
                          <Link to={route.to}>{route.label} →</Link>
                        </article>
                      );
                    })}
                  </div>
                ) : <EmptyState>{ui('No recommendations right now.')}</EmptyState>}
              </section>

              <section className="system-context-two-column">
                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/stock" title={ui('Operational snapshot')} subtitle={ui('A small set of business facts that are useful to a tenant. Internal identifiers and engine data are intentionally omitted.')} />
                  <div className="system-context-summary-grid">
                    <div><span>{ui('Products')}</span><strong>{formatNumber(data.context.inventory?.total_products, locale)}</strong></div>
                    <div><span>{ui('Low-stock products')}</span><strong>{formatNumber(data.context.inventory?.low_stock_products, locale)}</strong></div>
                    <div><span>{ui('Storage locations')}</span><strong>{formatNumber(data.context.inventory?.storage_locations, locale)}</strong></div>
                    <div><span>{ui('Open shipments')}</span><strong>{formatNumber(data.context.procurement?.open_shipments, locale)}</strong></div>
                    <div><span>{ui('Partial shipments')}</span><strong>{formatNumber(data.context.procurement?.partial_shipments, locale)}</strong></div>
                    <div><span>{ui('Open purchase orders')}</span><strong>{formatNumber(data.context.procurement?.open_purchase_orders, locale)}</strong></div>
                    <div><span>{ui('Estimated inventory value')}</span><strong>{(() => { const amount = toNumber(data.context.costing?.estimated_inventory_value); try { return formatLocalizedCurrency(amount, getActiveTenantCurrency(), locale, { maximumFractionDigits: 2 }); } catch { return formatCurrencyAmount(amount, getActiveTenantCurrency(), 2); } })()}</strong></div>
                    <div><span>{ui('Unresolved alerts')}</span><strong>{formatNumber(data.context.alerts?.unresolved_alerts, locale)}</strong></div>
                  </div>
                  <div className="system-context-link-row">
                    <Link to="/stock">{ui('Open Stock')}</Link><Link to="/shipments">{ui('Open Shipments')}</Link><Link to="/reports">{ui('Open Reports')}</Link>
                  </div>
                </div>

                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/reliability-command" title={ui('Data confidence')} subtitle={ui('How complete and current the information is before people rely on it for planning.')} />
                  <div className="system-context-confidence-block">
                    <div><span>{ui('Quality')}</span><strong>{formatPercentScore(data.context_quality.score, locale)}</strong><StatusPill tone={toneForStatus(data.context_quality.status)}>{formatKnownValue(data.context_quality.status, ui)}</StatusPill></div>
                    <div><span>{ui('Freshness')}</span><strong>{formatKnownValue(data.context_freshness.status, ui)}</strong><StatusPill tone={toneForStatus(data.context_freshness.status)}>{(toNumber(data.context_freshness.stale_sources) === 1 ? ui('{count} stale source') : ui('{count} stale sources')).replace('{count}', formatNumber(data.context_freshness.stale_sources, locale))}</StatusPill></div>
                    <div><span>{ui('Planning readiness')}</span><strong>{formatPercentScore(data.automation_readiness.score, locale)}</strong><StatusPill tone={toneForStatus(data.automation_readiness.status)}>{formatKnownValue(data.automation_readiness.status, ui)}</StatusPill></div>
                  </div>
                  <p className="system-context-muted">{data.context_quality.summary}</p>
                  {toNumber(data.context_freshness.stale_sources) > 0 || toNumber(data.context_freshness.aging_sources) > 0 ? (
                    <div className="system-context-mini-list">
                      {data.context_freshness.items.filter((item) => ['stale', 'aging', 'unknown'].includes(item.status)).slice(0, 5).map((item) => (
                        <div key={item.section}><strong>{formatKnownValue(item.section, ui)}</strong><span>{item.message}</span></div>
                      ))}
                    </div>
                  ) : <EmptyState>{ui('All reported context sources are current.')}</EmptyState>}
                </div>
              </section>

              <section className="app-panel app-panel--padded system-context-panel">
                <PanelHeading iconPath="/reliability-command" title={ui('Safety boundaries')} subtitle={ui('What this page can and cannot do. These protections are more important to a tenant than the internal engine implementation.')} />
                <div className="system-context-safety-grid">
                  <div className="system-context-safety-card system-context-safety-card--good"><strong>{ui('Read operational context')}</strong><span>{ui('Yes')}</span><p>{ui('Information is scoped to the current tenant.')}</p></div>
                  <div className="system-context-safety-card system-context-safety-card--good"><strong>{ui('Create a review request')}</strong><span>{canCreateExecutionRequests ? ui('Permission-based') : ui('No permission')}</span><p>{ui('A request enters the normal governed review workflow.')}</p></div>
                  <div className="system-context-safety-card"><strong>{ui('Change inventory')}</strong><span>{ui('No')}</span><p>{ui('System Context does not change quantities, products, shipments, or suppliers.')}</p></div>
                  <div className="system-context-safety-card"><strong>{ui('Run automation')}</strong><span>{ui('No')}</span><p>{ui('No automatic execution is performed from this page.')}</p></div>
                  <div className="system-context-safety-card"><strong>{ui('Human approval')}</strong><span>{data.context_freshness.predictive_guardrails?.approval_required_for_any_followup === false ? ui('Policy dependent') : ui('Required')}</span><p>{ui('Follow-up work stays in the authoritative source workflow.')}</p></div>
                </div>
              </section>
            </div>
          ) : null}

          {activeView === 'history' ? (
            <div className="system-context-view">
              <section className="app-panel app-panel--padded system-context-panel">
                <div className="system-context-panel-heading-row">
                  <PanelHeading iconPath="/probabilistic-forecasting" title={ui('Planning history')} subtitle={ui('Optional read-only history for comparing how operational context changes over time. This is useful for managers and administrators, but it is not required for everyday stock work.')} />
                  <div className="system-context-button-row">
                    <button className="button button--secondary" type="button" onClick={captureHistoricalSnapshot} disabled={capturingSnapshot || !canGovernDecisionIntelligence}>
                      {capturingSnapshot ? ui('Saving…') : ui('Save context snapshot')}
                    </button>
                    <button className="button button--secondary" type="button" onClick={captureForecastScenarioSet} disabled={capturingScenarioSet || !canGovernDecisionIntelligence}>
                      {capturingScenarioSet ? ui('Saving…') : ui('Save scenario set')}
                    </button>
                  </div>
                </div>
                {!canGovernDecisionIntelligence ? <div className="app-info-state">{ui('Saving analytical history requires Decision Intelligence governance permission. You can still view existing history.')}</div> : null}
                {snapshotCaptureMessage ? <div className="app-success-state">{snapshotCaptureMessage}</div> : null}
                {snapshotCaptureError ? <div className="app-error-state">{snapshotCaptureError}</div> : null}
                {scenarioCaptureMessage ? <div className="app-success-state">{scenarioCaptureMessage}</div> : null}
                {scenarioCaptureError ? <div className="app-error-state">{scenarioCaptureError}</div> : null}
              </section>

              <section className="system-context-two-column">
                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/system-context" title={ui('Saved context snapshots')} subtitle={ui("Point-in-time records of this page's read-only context.")} />
                  {snapshotsQuery.isLoading ? <EmptyState>{ui('Loading snapshots…')}</EmptyState> : null}
                  {snapshotsQuery.error ? <ErrorNotice title={ui('Snapshots failed to load')} error={snapshotsQuery.error} unknownErrorLabel={ui('Unknown error')} /> : null}
                  {snapshotsQuery.data?.length ? (
                    <div className="system-context-history-list">
                      {snapshotsQuery.data.map((snapshot) => (
                        <button key={snapshot.id} type="button" className={selectedSnapshotId === snapshot.id ? 'is-selected' : ''} onClick={() => setSelectedSnapshotId(snapshot.id)}>
                          <strong>{formatDateTime(snapshot.generated_at, locale, ui)}</strong>
                          <span>{formatKnownValue(snapshot.snapshot_status || 'captured', ui)} · {formatKnownValue(snapshot.source, ui)}</span>
                        </button>
                      ))}
                    </div>
                  ) : !snapshotsQuery.isLoading ? <EmptyState>{ui('No saved snapshots yet.')}</EmptyState> : null}
                </div>

                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/insights" title={ui('Selected snapshot')} subtitle={ui('A tenant-friendly summary. Internal IDs, fingerprints, source tables, and raw JSON are intentionally hidden.')} />
                  {selectedSnapshotQuery.isLoading ? <EmptyState>{ui('Loading selected snapshot…')}</EmptyState> : null}
                  {selectedSnapshotQuery.error ? <ErrorNotice title={ui('Snapshot detail failed to load')} error={selectedSnapshotQuery.error} unknownErrorLabel={ui('Unknown error')} /> : null}
                  {selectedSnapshotQuery.data ? (
                    <div className="system-context-snapshot-summary">
                      <div><span>{ui('Captured')}</span><strong>{formatDateTime(selectedSnapshotQuery.data.generated_at, locale, ui)}</strong></div>
                      <div><span>{ui('Status')}</span><strong>{formatKnownValue(selectedSnapshotQuery.data.snapshot_status, ui)}</strong></div>
                      <div><span>{ui('Risk signals')}</span><strong>{selectedSnapshotContext ? formatNumber(selectedSnapshotContext.risk_signals?.length, locale) : ui('Not stored')}</strong></div>
                      <div><span>{ui('Recommendations')}</span><strong>{selectedSnapshotContext ? formatNumber(selectedSnapshotContext.recommendations?.length, locale) : ui('Not stored')}</strong></div>
                      <div><span>{ui('Context quality')}</span><strong>{selectedSnapshotContext ? formatPercentScore(selectedSnapshotContext.context_quality?.score, locale) : ui('Not stored')}</strong></div>
                      <div><span>{ui('Planning readiness')}</span><strong>{selectedSnapshotContext ? formatPercentScore(selectedSnapshotContext.automation_readiness?.score, locale) : ui('Not stored')}</strong></div>
                    </div>
                  ) : <EmptyState>{ui('Select a snapshot to review its summary.')}</EmptyState>}
                </div>
              </section>

              <section className="app-panel app-panel--padded system-context-panel">
                <PanelHeading iconPath="/insights" title={ui('What changed between the latest snapshots')} subtitle={ui('Only business-facing changes are shown. This comparison is read-only.')} />
                {(snapshotsQuery.data?.length ?? 0) < 2 ? <EmptyState>{ui('At least two snapshots are needed for comparison.')}</EmptyState> : null}
                {snapshotComparisonQuery.isLoading ? <EmptyState>{ui('Comparing snapshots…')}</EmptyState> : null}
                {snapshotComparisonQuery.error ? <ErrorNotice title={ui('Snapshot comparison failed')} error={snapshotComparisonQuery.error} unknownErrorLabel={ui('Unknown error')} /> : null}
                {snapshotComparisonQuery.data && (snapshotsQuery.data?.length ?? 0) >= 2 ? (
                  <>
                    <div className="system-context-comparison-meta">{formatDateTime(snapshotComparisonQuery.data.previous_generated_at, locale, ui)} → {formatDateTime(snapshotComparisonQuery.data.current_generated_at, locale, ui)}</div>
                    {snapshotChanges.length ? (
                      <div className="system-context-summary-grid">
                        {snapshotChanges.map((item) => (
                          <div key={item.code}><span>{item.label}</span><strong>{item.delta > 0 ? '+' : ''}{formatNumber(item.delta, locale)}</strong><small>{formatNumber(item.previous, locale)} → {formatNumber(item.current, locale)}</small></div>
                        ))}
                      </div>
                    ) : <EmptyState>{ui('No measured values changed between the latest two snapshots.')}</EmptyState>}
                  </>
                ) : null}
              </section>

              <section className="app-panel app-panel--padded system-context-panel">
                <PanelHeading iconPath="/probabilistic-forecasting" title={ui('Read-only scenario planning')} subtitle={ui('Scenario evidence is optional planning support. It does not run a live forecast model, create stock changes, or execute automation.')} />
                {forecastScenarioQuery.isLoading ? <EmptyState>{ui('Loading scenario planning…')}</EmptyState> : null}
                {forecastScenarioQuery.error ? <ErrorNotice title={ui('Scenario planning failed to load')} error={forecastScenarioQuery.error} unknownErrorLabel={ui('Unknown error')} /> : null}
                {forecastScenarioQuery.data?.status === 'insufficient_history' ? (
                  <EmptyState>{ui('More saved context history is required before scenario planning can be calculated. Available snapshots: {count}.').replace('{count}', formatNumber(forecastScenarioQuery.data.available_snapshots, locale))}</EmptyState>
                ) : forecastScenarioQuery.data?.forecast_scenarios?.length ? (
                  <div className="system-context-recommendations">
                    {forecastScenarioQuery.data.forecast_scenarios.slice(0, 8).map((scenario) => (
                      <article className="system-context-recommendation" key={scenario.code}>
                        <div className="system-context-recommendation__top"><StatusPill>{formatKnownValue(scenario.priority, ui)}</StatusPill><StatusPill tone="good">{ui('Read-only')}</StatusPill></div>
                        <h3>{scenario.label}</h3>
                        <p>{ui('Direction: {direction} · Projected change: {change}').replace('{direction}', formatKnownValue(scenario.preview_direction, ui)).replace('{change}', formatNumber(scenario.projected_delta, locale))}</p>
                        <span className="system-context-muted">{ui('Confidence {confidence} · Risk {risk}').replace('{confidence}', formatNumber(scenario.confidence_score, locale)).replace('{risk}', formatKnownValue(scenario.risk_classification, ui))}</span>
                      </article>
                    ))}
                  </div>
                ) : !forecastScenarioQuery.isLoading ? <EmptyState>{ui('No scenario rows are available.')}</EmptyState> : null}

                {forecastScenarioHistoryQuery.data?.length ? (
                  <details className="system-context-details">
                    <summary>{ui('Saved scenario sets ({count})').replace('{count}', formatNumber(forecastScenarioHistoryQuery.data.length, locale))}</summary>
                    <div className="system-context-history-list system-context-history-list--static">
                      {forecastScenarioHistoryQuery.data.map((item) => (
                        <div key={item.id}><strong>{formatDateTime(item.generated_at, locale, ui)}</strong><span>{ui('{count} scenarios · {status}').replace('{count}', formatNumber(item.scenario_summary?.scenario_count, locale)).replace('{status}', formatKnownValue(item.scenario_status, ui))}</span></div>
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
                <PanelHeading iconPath="/admin-system" title={ui('Tenant diagnostics')} subtitle={ui('Restricted implementation context for administrators with Tenant Diagnostics permission. The previous page exposed dozens of low-level forecast and execution-engine panels to every System Context reader; those details are now intentionally removed from the normal tenant experience.')} />
                <div className="app-info-state">{ui('Internal Phase B/C/D step names, raw blocker codes, fingerprints, source-table names, replay internals, and model-engine plumbing are not shown here because they do not help a tenant operate inventory.')}</div>
              </section>

              <section className="system-context-two-column">
                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/reliability-command" title={ui('Execution safety')} subtitle={ui('Compact technical evidence about whether System Context could be used as input to a governed follow-up.')} />
                  {executionGateQuery.isLoading ? <EmptyState>{ui('Loading execution safety…')}</EmptyState> : null}
                  {executionGateQuery.error ? <ErrorNotice title={ui('Execution safety failed to load')} error={executionGateQuery.error} unknownErrorLabel={ui('Unknown error')} /> : null}
                  {executionGate ? (
                    <div className="system-context-diagnostic-list">
                      <div><span>{ui('Gate')}</span><strong>{executionGate.allowed ? ui('Open') : ui('Blocked')}</strong></div>
                      <div><span>{ui('Risk level')}</span><strong>{formatKnownValue(executionGate.risk_level, ui)}</strong></div>
                      <div><span>{ui('Readiness')}</span><strong>{formatKnownValue(executionGate.evidence.readiness_status, ui)}</strong></div>
                      <div><span>{ui('Blocked gates')}</span><strong>{formatNumber(executionGate.evidence.blocked_execution_gates, locale)}</strong></div>
                      <div><span>{ui('Critical risks')}</span><strong>{formatNumber(executionGate.evidence.critical_risk_signals.length, locale)}</strong></div>
                      <div><span>{ui('Mutation allowed by dry-run policy')}</span><strong>{executionGate.evidence.mutation_allowed_by_dry_run_policy ? ui('Yes') : ui('No')}</strong></div>
                    </div>
                  ) : null}
                </div>

                <div className="app-panel app-panel--padded system-context-panel">
                  <PanelHeading iconPath="/system-context" title={ui('Context contract')} subtitle={ui('The safety contract currently returned by the System Context service.')} />
                  <div className="system-context-diagnostic-list">
                    <div><span>{ui('Read-only')}</span><strong>{data.automation_contract.read_only ? ui('Yes') : ui('No')}</strong></div>
                    <div><span>{ui('Tenant-scoped')}</span><strong>{data.automation_contract.tenant_scoped ? ui('Yes') : ui('No')}</strong></div>
                    <div><span>{ui('Safe for AI summary')}</span><strong>{data.automation_contract.safe_for_ai_summary ? ui('Yes') : ui('No')}</strong></div>
                    <div><span>{ui('Mutation allowed')}</span><strong>{data.automation_contract.mutation_allowed ? ui('Yes') : ui('No')}</strong></div>
                    <div><span>{ui('Decision boundary')}</span><strong>{formatKnownValue(data.decision_boundaries.status, ui)}</strong></div>
                    <div><span>{ui('Escalation conditions')}</span><strong>{formatNumber(data.decision_boundaries.escalation_conditions.length, locale)}</strong></div>
                  </div>
                </div>
              </section>

              <section className="app-panel app-panel--padded system-context-panel">
                <PanelHeading iconPath="/insights" title={ui('Source health')} subtitle={ui('Logical source groups only. Database table names are deliberately not exposed in the tenant UI.')} />
                <div className="system-context-source-grid">
                  {data.context_sources.map((source) => {
                    const freshness = data.context_freshness.items.find((item) => item.section === source.section);
                    const quality = data.context_quality.source_quality.find((item) => item.section === source.section);
                    return (
                      <article key={source.section}>
                        <div><strong>{formatKnownValue(source.section, ui)}</strong><StatusPill tone={toneForStatus(freshness?.status)}>{formatKnownValue(freshness?.status, ui)}</StatusPill></div>
                        <p>{source.description}</p>
                        <span>{ui('Quality {quality} · Last observed {time}').replace('{quality}', quality ? formatPercentScore(quality.score, locale) : '—').replace('{time}', formatDateTime(source.last_observed_at, locale, ui))}</span>
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
