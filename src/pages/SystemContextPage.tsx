import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import type { SystemContextExecutionGateResponse, SystemContextResponse, SystemContextSnapshot, SystemContextSnapshotCaptureResponse, SystemContextSnapshotComparison, SystemContextSnapshotTrendSeries, SystemContextForecastPreview, SystemContextForecastSeries, SystemContextForecastHorizons, SystemContextBaselineForecast, SystemContextMovingAverageForecast, SystemContextWeightedTrendForecast, SystemContextVolatilityAdjustedForecast, SystemContextForecastConfidence, SystemContextForecastAccuracy, SystemContextForecastComparison, SystemContextForecastRiskClassification, SystemContextForecastAccuracyGovernance, SystemContextForecastErrorGovernance, SystemContextForecastDegradationGovernance, SystemContextForecastConfidenceGovernance, SystemContextForecastAdjustmentGovernance, SystemContextForecastOutcomeValidationGovernance, SystemContextForecastGovernanceReadiness, SystemContextForecastPhaseClosure, SystemContextExecutionIntelligenceLinkage, SystemContextExecutionIntelligenceOutcomeScoring, SystemContextExecutionIntelligenceRollbackEvidence, SystemContextExecutionIntelligenceRiskScoring, SystemContextExecutionIntelligenceClosedLoopLearning, SystemContextExecutionIntelligenceReadiness, SystemContextExecutionIntelligencePhaseClosure, SystemContextAIOperationsPipelineMonitoring, SystemContextAIOperationsHealthMonitoring, SystemContextAIOperationsDegradationMonitoring, SystemContextAIOperationsDataQualityMonitoring, SystemContextAIOperationsStaleIntelligenceMonitoring, SystemContextAIOperationsNotificationMonitoring, SystemContextAIOperationsSlaMonitoring, SystemContextAIOperationsAuditEvidenceMonitoring, SystemContextAIOperationsReadinessGate, SystemContextForecastVersionGovernance, SystemContextForecastRanking, SystemContextForecastScenarioSet, SystemContextForecastScenarioCaptureResponse, SystemContextForecastScenarioHistoryItem } from '../types/inventory';

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown error';
}

function formatNumber(value: number | string | null | undefined): string {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : '0';
}

function formatCurrency(value: number | string | null | undefined): string {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : '$0.00';
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

function StatCard(props: { title: string; value: string; subtitle: string; tone?: 'default' | 'warn' | 'bad' }) {
  const valueStyle = props.tone === 'bad' ? styles.statValueBad : props.tone === 'warn' ? styles.statValueWarn : styles.statValue;
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

function Section(props: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="app-panel app-panel--padded" style={styles.panel}>
      <h3 style={styles.panelTitle}>{props.title}</h3>
      <p style={styles.panelSubtitle}>{props.subtitle}</p>
      {props.children}
    </section>
  );
}

function KeyValue(props: { label: string; value: string }) {
  return <div style={styles.keyValueRow}><strong>{props.label}</strong><span>{props.value}</span></div>;
}

function ErrorNotice(props: { title: string; endpoint: string; error: unknown; explanation: string }) {
  return (
    <div className="app-error-state" style={styles.errorNotice}>
      <strong>{props.title}</strong>
      <span>{props.explanation}</span>
      <code style={styles.errorEndpoint}>{props.endpoint}</code>
      <span>{readableError(props.error)}</span>
    </div>
  );
}

function getSnapshotContextValue(snapshot: SystemContextSnapshot | undefined, key: string): unknown {
  const contextSnapshot = snapshot?.context_snapshot;
  if (!contextSnapshot || typeof contextSnapshot !== 'object') return undefined;
  return (contextSnapshot as Record<string, unknown>)[key];
}

export default function SystemContextPage() {
  const capabilities = getRoleCapabilities();
  const canCreateExecutionRequests = capabilities.canCreateExecutionRequests;

  const contextQuery = useQuery({
    queryKey: ['system-context'],
    queryFn: () => apiRequest<SystemContextResponse>('/system-context')
  });

  const executionGateQuery = useQuery({
    queryKey: ['system-context-execution-gate'],
    queryFn: () => apiRequest<SystemContextExecutionGateResponse>('/system-context/execution-gate'),
    enabled: contextQuery.isSuccess
  });

  const snapshotsQuery = useQuery({
    queryKey: ['system-context-snapshots'],
    queryFn: () => apiRequest<SystemContextSnapshot[]>('/system-context/snapshots?limit=25')
  });

  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [loadAdvancedAiOperations, setLoadAdvancedAiOperations] = useState(false);

  const selectedSnapshotQuery = useQuery({
    queryKey: ['system-context-snapshot', selectedSnapshotId],
    queryFn: () => apiRequest<SystemContextSnapshot>(`/system-context/snapshots/${selectedSnapshotId}`),
    enabled: Boolean(selectedSnapshotId)
  });

  const snapshotComparisonQuery = useQuery({
    queryKey: ['system-context-snapshot-comparison'],
    queryFn: () => apiRequest<SystemContextSnapshotComparison>('/system-context/snapshots/compare/latest'),
    enabled: (snapshotsQuery.data?.length ?? 0) > 0
  });

  const snapshotTrendQuery = useQuery({
    queryKey: ['system-context-snapshot-trends'],
    queryFn: () => apiRequest<SystemContextSnapshotTrendSeries>('/system-context/snapshots/trends?limit=25')
  });

  const forecastPreviewQuery = useQuery({
    queryKey: ['system-context-forecast-preview'],
    queryFn: () => apiRequest<SystemContextForecastPreview>('/system-context/snapshots/forecast-preview?limit=25')
  });

  const forecastSeriesQuery = useQuery({
    queryKey: ['system-context-forecast-series'],
    queryFn: () => apiRequest<SystemContextForecastSeries>('/system-context/snapshots/forecast-series?limit=25')
  });


  const forecastHorizonQuery = useQuery({
    queryKey: ['system-context-forecast-horizons'],
    queryFn: () => apiRequest<SystemContextForecastHorizons>('/system-context/snapshots/forecast-horizons?limit=25')
  });

  const forecastBaselineQuery = useQuery({
    queryKey: ['system-context-forecast-baseline'],
    queryFn: () => apiRequest<SystemContextBaselineForecast>('/system-context/snapshots/forecast-baseline?limit=25')
  });


  const forecastMovingAverageQuery = useQuery({
    queryKey: ['system-context-forecast-moving-average'],
    queryFn: () => apiRequest<SystemContextMovingAverageForecast>('/system-context/snapshots/forecast-moving-average?limit=25')
  });

  const forecastWeightedTrendQuery = useQuery({
    queryKey: ['system-context-forecast-weighted-trend'],
    queryFn: () => apiRequest<SystemContextWeightedTrendForecast>('/system-context/snapshots/forecast-weighted-trend?limit=25')
  });

  const forecastVolatilityAdjustedQuery = useQuery({
    queryKey: ['system-context-forecast-volatility-adjusted'],
    queryFn: () => apiRequest<SystemContextVolatilityAdjustedForecast>('/system-context/snapshots/forecast-volatility-adjusted?limit=25')
  });

  const forecastConfidenceQuery = useQuery({
    queryKey: ['system-context-forecast-confidence'],
    queryFn: () => apiRequest<SystemContextForecastConfidence>('/system-context/snapshots/forecast-confidence?limit=25')
  });


  const forecastAccuracyQuery = useQuery({
    queryKey: ['system-context-forecast-accuracy'],
    queryFn: () => apiRequest<SystemContextForecastAccuracy>('/system-context/snapshots/forecast-accuracy?limit=25')
  });

  const forecastComparisonQuery = useQuery({
    queryKey: ['system-context-forecast-comparison'],
    queryFn: () => apiRequest<SystemContextForecastComparison>('/system-context/snapshots/forecast-comparison?limit=25')
  });

  const forecastRiskClassificationQuery = useQuery({
    queryKey: ['system-context-forecast-risk-classification'],
    queryFn: () => apiRequest<SystemContextForecastRiskClassification>('/system-context/snapshots/forecast-risk-classification?limit=25')
  });


  const forecastAccuracyGovernanceQuery = useQuery({
    queryKey: ['system-context-forecast-accuracy-governance'],
    queryFn: () => apiRequest<SystemContextForecastAccuracyGovernance>('/system-context/snapshots/forecast-accuracy-governance?limit=25')
  });





  const forecastGovernanceReadinessQuery = useQuery({
    queryKey: ['system-context-forecast-governance-readiness'],
    queryFn: () => apiRequest<SystemContextForecastGovernanceReadiness>('/system-context/snapshots/forecast-governance-readiness?limit=25')
  });

  const forecastPhaseClosureQuery = useQuery({
    queryKey: ['system-context-forecast-phase-closure'],
    queryFn: () => apiRequest<SystemContextForecastPhaseClosure>('/system-context/snapshots/forecast-phase-closure?limit=25')
  });


  const executionIntelligenceLinkageQuery = useQuery({
    queryKey: ['system-context-execution-intelligence-linkage'],
    queryFn: () => apiRequest<SystemContextExecutionIntelligenceLinkage>('/system-context/execution-intelligence/linkage?limit=50')
  });

  const executionIntelligenceOutcomeScoringQuery = useQuery({
    queryKey: ['system-context-execution-intelligence-outcome-scoring'],
    queryFn: () => apiRequest<SystemContextExecutionIntelligenceOutcomeScoring>('/system-context/execution-intelligence/outcome-scoring?limit=50')
  });

  const executionIntelligenceRollbackEvidenceQuery = useQuery({
    queryKey: ['system-context-execution-intelligence-rollback-evidence'],
    queryFn: () => apiRequest<SystemContextExecutionIntelligenceRollbackEvidence>('/system-context/execution-intelligence/rollback-evidence?limit=50')
  });


  const executionIntelligenceRiskScoringQuery = useQuery({
    queryKey: ['system-context-execution-intelligence-risk-scoring'],
    queryFn: () => apiRequest<SystemContextExecutionIntelligenceRiskScoring>('/system-context/execution-intelligence/risk-scoring?limit=50')
  });


  const executionIntelligenceClosedLoopLearningQuery = useQuery({
    queryKey: ['system-context-execution-intelligence-closed-loop-learning'],
    queryFn: () => apiRequest<SystemContextExecutionIntelligenceClosedLoopLearning>('/system-context/execution-intelligence/closed-loop-learning?limit=50')
  });


  const executionIntelligenceReadinessQuery = useQuery({
    queryKey: ['system-context-execution-intelligence-readiness'],
    queryFn: () => apiRequest<SystemContextExecutionIntelligenceReadiness>('/system-context/execution-intelligence/readiness?limit=50')
  });


  const executionIntelligencePhaseClosureQuery = useQuery({
    queryKey: ['system-context-execution-intelligence-phase-closure'],
    queryFn: () => apiRequest<SystemContextExecutionIntelligencePhaseClosure>('/system-context/execution-intelligence/phase-closure?limit=50')
  });



  const aiOperationsPipelineMonitoringQuery = useQuery({
    queryKey: ['system-context-ai-operations-pipeline-monitoring'],
    queryFn: () => apiRequest<SystemContextAIOperationsPipelineMonitoring>('/system-context/ai-operations/pipeline-monitoring?limit=10'),
    enabled: loadAdvancedAiOperations
  });

  const aiOperationsHealthMonitoringQuery = useQuery({
    queryKey: ['system-context-ai-operations-health-monitoring'],
    queryFn: () => apiRequest<SystemContextAIOperationsHealthMonitoring>('/system-context/ai-operations/health-monitoring?limit=10'),
    enabled: loadAdvancedAiOperations
  });


  const aiOperationsDegradationMonitoringQuery = useQuery({
    queryKey: ['system-context-ai-operations-degradation-monitoring'],
    queryFn: () => apiRequest<SystemContextAIOperationsDegradationMonitoring>('/system-context/ai-operations/degradation-monitoring?limit=10'),
    enabled: loadAdvancedAiOperations
  });

  const aiOperationsDataQualityMonitoringQuery = useQuery({
    queryKey: ['system-context-ai-operations-data-quality-monitoring'],
    queryFn: () => apiRequest<SystemContextAIOperationsDataQualityMonitoring>('/system-context/ai-operations/data-quality-monitoring?limit=10'),
    enabled: loadAdvancedAiOperations
  });

  const aiOperationsStaleIntelligenceMonitoringQuery = useQuery({
    queryKey: ['system-context-ai-operations-stale-intelligence-monitoring'],
    queryFn: () => apiRequest<SystemContextAIOperationsStaleIntelligenceMonitoring>('/system-context/ai-operations/stale-intelligence-monitoring?limit=10'),
    enabled: loadAdvancedAiOperations
  });

  const aiOperationsNotificationMonitoringQuery = useQuery({
    queryKey: ['system-context-ai-operations-notification-monitoring'],
    queryFn: () => apiRequest<SystemContextAIOperationsNotificationMonitoring>('/system-context/ai-operations/notification-monitoring?limit=10'),
    enabled: loadAdvancedAiOperations
  });

  const aiOperationsSlaMonitoringQuery = useQuery({
    queryKey: ['system-context-ai-operations-sla-monitoring'],
    queryFn: () => apiRequest<SystemContextAIOperationsSlaMonitoring>('/system-context/ai-operations/sla-monitoring?limit=10'),
    enabled: loadAdvancedAiOperations
  });

  const aiOperationsAuditEvidenceMonitoringQuery = useQuery({
    queryKey: ['system-context-ai-operations-audit-evidence-monitoring'],
    queryFn: () => apiRequest<SystemContextAIOperationsAuditEvidenceMonitoring>('/system-context/ai-operations/audit-evidence-monitoring?limit=10'),
    enabled: loadAdvancedAiOperations
  });

  const aiOperationsReadinessGateQuery = useQuery({
    queryKey: ['system-context-ai-operations-readiness-gate'],
    queryFn: () => apiRequest<SystemContextAIOperationsReadinessGate>('/system-context/ai-operations/readiness-gate?limit=10'),
    enabled: loadAdvancedAiOperations
  });


  const forecastOutcomeValidationGovernanceQuery = useQuery({
    queryKey: ['system-context-forecast-outcome-validation-governance'],
    queryFn: () => apiRequest<SystemContextForecastOutcomeValidationGovernance>('/system-context/snapshots/forecast-outcome-validation-governance?limit=25')
  });

  const forecastAdjustmentGovernanceQuery = useQuery({
    queryKey: ['system-context-forecast-adjustment-governance'],
    queryFn: () => apiRequest<SystemContextForecastAdjustmentGovernance>('/system-context/snapshots/forecast-adjustment-governance?limit=25')
  });

  const forecastConfidenceGovernanceQuery = useQuery({
    queryKey: ['system-context-forecast-confidence-governance'],
    queryFn: () => apiRequest<SystemContextForecastConfidenceGovernance>('/system-context/snapshots/forecast-confidence-governance?limit=25')
  });

  const forecastDegradationGovernanceQuery = useQuery({
    queryKey: ['system-context-forecast-degradation-governance'],
    queryFn: () => apiRequest<SystemContextForecastDegradationGovernance>('/system-context/snapshots/forecast-degradation-governance?limit=25')
  });

  const forecastErrorGovernanceQuery = useQuery({
    queryKey: ['system-context-forecast-error-governance'],
    queryFn: () => apiRequest<SystemContextForecastErrorGovernance>('/system-context/snapshots/forecast-error-governance?limit=25')
  });

  const forecastVersionGovernanceQuery = useQuery({
    queryKey: ['system-context-forecast-version-governance'],
    queryFn: () => apiRequest<SystemContextForecastVersionGovernance>('/system-context/snapshots/forecast-version-governance?limit=25')
  });

  const forecastRankingQuery = useQuery({
    queryKey: ['system-context-forecast-ranking'],
    queryFn: () => apiRequest<SystemContextForecastRanking>('/system-context/snapshots/forecast-ranking?limit=25')
  });

  const forecastScenarioQuery = useQuery({
    queryKey: ['system-context-forecast-scenarios'],
    queryFn: () => apiRequest<SystemContextForecastScenarioSet>('/system-context/snapshots/forecast-scenarios?limit=25')
  });

  const forecastScenarioHistoryQuery = useQuery({
    queryKey: ['system-context-forecast-scenario-history'],
    queryFn: () => apiRequest<SystemContextForecastScenarioHistoryItem[]>('/system-context/snapshots/forecast-scenarios/history?limit=10')
  });

  const data = contextQuery.data;
  const executionGate = executionGateQuery.data;
  const riskCount = data?.risk_signals?.length ?? 0;
  const criticalCount = data?.risk_signals?.filter((signal) => signal.severity === 'critical').length ?? 0;
  const recommendationCount = data?.recommendations?.length ?? 0;
  const highPriorityRecommendationCount = data?.recommendations?.filter((item) => item.priority === 'high').length ?? 0;
  const readinessScore = Number(data?.automation_readiness?.score ?? 0);
  const forecastRiskByCode = new Map((forecastRiskClassificationQuery.data?.classified_scenarios ?? []).map((scenario) => [scenario.code, scenario]));
  const forecastRankingByCode = new Map((forecastRankingQuery.data?.ranked_scenarios ?? []).map((scenario) => [scenario.code, scenario]));
  const forecastScenarioViewerRows = (forecastScenarioQuery.data?.forecast_scenarios ?? []).map((scenario) => ({
    scenario,
    ranking: forecastRankingByCode.get(scenario.code) ?? null,
    risk: forecastRiskByCode.get(scenario.code) ?? null
  }));

  const forecastVisualizationRows = forecastScenarioViewerRows.map((row) => ({
    ...row,
    rankingScore: Number(row.ranking?.ranking_score ?? row.scenario.confidence_score ?? 0),
    riskScore: Number(row.risk?.forecast_risk_score ?? 0),
    confidenceScore: Number(row.scenario.confidence_score ?? 0),
    projectedDeltaMagnitude: Math.abs(Number(row.scenario.projected_delta ?? 0))
  })).sort((a, b) => b.rankingScore - a.rankingScore);

  const forecastVisualizationSummary = {
    scenarioCount: forecastVisualizationRows.length,
    highRiskCount: forecastVisualizationRows.filter((row) => ['high', 'critical'].includes(String(row.risk?.forecast_risk_band ?? row.scenario.risk_classification ?? '').toLowerCase())).length,
    actionableCount: forecastVisualizationRows.filter((row) => String(row.ranking?.actionability_classification ?? '').includes('review')).length,
    averageConfidence: forecastVisualizationRows.length
      ? forecastVisualizationRows.reduce((sum, row) => sum + row.confidenceScore, 0) / forecastVisualizationRows.length
      : 0,
    averageRisk: forecastVisualizationRows.length
      ? forecastVisualizationRows.reduce((sum, row) => sum + row.riskScore, 0) / forecastVisualizationRows.length
      : 0
  };

  const forecastConfidenceRiskRows = forecastVisualizationRows.map((row) => {
    const riskBand = String(row.risk?.forecast_risk_band ?? row.scenario.risk_classification ?? 'unknown');
    const confidenceBand = String(row.scenario.confidence_band ?? row.ranking?.ranking_band ?? 'unknown');
    const reviewPriority = String(row.risk?.review_priority ?? row.ranking?.actionability_classification ?? 'review_unavailable');
    const needsReview = ['high', 'critical'].includes(riskBand.toLowerCase()) || reviewPriority.includes('review');

    return {
      ...row,
      riskBand,
      confidenceBand,
      reviewPriority,
      needsReview,
      confidenceRiskGap: Math.max(0, row.riskScore - row.confidenceScore)
    };
  }).sort((a, b) => {
    if (Number(b.needsReview) !== Number(a.needsReview)) return Number(b.needsReview) - Number(a.needsReview);
    return (b.riskScore + b.confidenceRiskGap) - (a.riskScore + a.confidenceRiskGap);
  });

  const forecastConfidenceRiskSummary = {
    scenarioCount: forecastConfidenceRiskRows.length,
    reviewRequiredCount: forecastConfidenceRiskRows.filter((row) => row.needsReview).length,
    confidenceRiskGapCount: forecastConfidenceRiskRows.filter((row) => row.confidenceRiskGap > 0).length,
    highestRiskScore: forecastConfidenceRiskRows.length ? Math.max(...forecastConfidenceRiskRows.map((row) => row.riskScore)) : 0,
    lowestConfidenceScore: forecastConfidenceRiskRows.length ? Math.min(...forecastConfidenceRiskRows.map((row) => row.confidenceScore)) : 0
  };

  const [creatingReviewRequest, setCreatingReviewRequest] = useState(false);
  const [reviewRequestMessage, setReviewRequestMessage] = useState<string | null>(null);
  const [reviewRequestError, setReviewRequestError] = useState<string | null>(null);
  const [capturingSnapshot, setCapturingSnapshot] = useState(false);
  const [snapshotCaptureMessage, setSnapshotCaptureMessage] = useState<string | null>(null);
  const [snapshotCaptureError, setSnapshotCaptureError] = useState<string | null>(null);
  const [capturingForecastScenarioSet, setCapturingForecastScenarioSet] = useState(false);
  const [forecastScenarioCaptureMessage, setForecastScenarioCaptureMessage] = useState<string | null>(null);
  const [forecastScenarioCaptureError, setForecastScenarioCaptureError] = useState<string | null>(null);


  const captureHistoricalSnapshot = async () => {
    setCapturingSnapshot(true);
    setSnapshotCaptureMessage(null);
    setSnapshotCaptureError(null);

    try {
      const response = await apiRequest<SystemContextSnapshotCaptureResponse>('/system-context/snapshots/capture', {
        method: 'POST',
        body: JSON.stringify({
          sections: []
        })
      });

      setSnapshotCaptureMessage(
        `Snapshot captured for read-only history${response.snapshot_id ? `: ${response.snapshot_id}` : ''}. No execution or mutation was performed.`
      );
      await snapshotsQuery.refetch();
      await snapshotComparisonQuery.refetch();
      await snapshotTrendQuery.refetch();
      await forecastPreviewQuery.refetch();
      await forecastSeriesQuery.refetch();
      await forecastScenarioQuery.refetch();
      await forecastScenarioHistoryQuery.refetch();
      if (response.snapshot_id) {
        setSelectedSnapshotId(response.snapshot_id);
      }
    } catch (error) {
      setSnapshotCaptureError(readableError(error));
    } finally {
      setCapturingSnapshot(false);
    }
  };


  const captureForecastScenarioSet = async () => {
    setCapturingForecastScenarioSet(true);
    setForecastScenarioCaptureMessage(null);
    setForecastScenarioCaptureError(null);

    try {
      const response = await apiRequest<SystemContextForecastScenarioCaptureResponse>('/system-context/snapshots/forecast-scenarios/capture', {
        method: 'POST',
        body: JSON.stringify({
          limit: 25
        })
      });

      setForecastScenarioCaptureMessage(
        `Forecast scenario set captured for read-only intelligence${response.scenario_set_id ? `: ${response.scenario_set_id}` : ''}. No execution, mutation, forecast model run, or automation was performed.`
      );
      await forecastScenarioQuery.refetch();
      await forecastScenarioHistoryQuery.refetch();
    } catch (error) {
      setForecastScenarioCaptureError(readableError(error));
    } finally {
      setCapturingForecastScenarioSet(false);
    }
  };

  const createSystemContextReviewRequest = async () => {
    if (!data) return;

    if (!canCreateExecutionRequests) {
      setReviewRequestMessage(null);
      setReviewRequestError('Your current role cannot create execution requests.');
      return;
    }

    setCreatingReviewRequest(true);
    setReviewRequestMessage(null);
    setReviewRequestError(null);

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

      setReviewRequestMessage('System Context review request created. It still requires normal review and approval workflow.');
    } catch (error) {
      setReviewRequestError(readableError(error));
    } finally {
      setCreatingReviewRequest(false);
    }
  };


  return (
    <div style={styles.page}>
      {contextQuery.error ? (
        <ErrorNotice
          title="System Context failed to load"
          endpoint="GET /api/system-context"
          error={contextQuery.error}
          explanation="This is the main System Context snapshot. It reads tenant inventory, procurement, costing, alerts, audit, and access signals. If the database is overloaded or temporarily unreachable, this panel cannot load."
        />
      ) : null}
      {executionGateQuery.error ? (
        <ErrorNotice
          title="Execution Gate failed to load"
          endpoint="GET /api/system-context/execution-gate"
          error={executionGateQuery.error}
          explanation="This is the read-only decision gate built from the System Context snapshot. It is now loaded only after the main System Context request succeeds, so it no longer hits the backend at the exact same time as the main snapshot."
        />
      ) : null}
      {contextQuery.isLoading ? <div className="app-empty-state">Loading system context...</div> : null}

      {data ? (
        <>
          <section className="app-grid-stats" style={styles.statsGrid}>
            <StatCard title="Context Status" value={data.status.replace(/_/g, ' ')} subtitle="Derived tenant posture for automation inputs." tone={data.status === 'attention_required' ? 'bad' : data.status === 'watch' ? 'warn' : 'default'} />
            <StatCard title="Risk Signals" value={String(riskCount)} subtitle="Signals exposed to future automation safely." tone={riskCount > 0 ? 'warn' : 'default'} />
            <StatCard title="Critical Signals" value={String(criticalCount)} subtitle="Signals requiring immediate human review." tone={criticalCount > 0 ? 'bad' : 'default'} />
            <StatCard title="Recommendations" value={String(recommendationCount)} subtitle={`${highPriorityRecommendationCount} high-priority automation prep items.`} tone={highPriorityRecommendationCount > 0 ? 'bad' : recommendationCount > 0 ? 'warn' : 'default'} />
            <StatCard title="Automation Readiness" value={`${Number.isFinite(readinessScore) ? readinessScore : 0}%`} subtitle={`${data?.automation_readiness?.status?.replace(/_/g, ' ') ?? 'not evaluated'} · ${formatNumber(data?.automation_readiness?.failed_checks)} blockers`} tone={toNumber(data?.automation_readiness?.failed_checks) > 0 ? 'bad' : toNumber(data?.automation_readiness?.warning_checks) > 0 ? 'warn' : 'default'} />
            <StatCard title="Context Quality" value={`${formatNumber(data.context_quality?.score)}%`} subtitle={data.context_quality?.status?.replace(/_/g, ' ') ?? 'not evaluated'} tone={data.context_quality?.status === 'limited' ? 'bad' : data.context_quality?.status === 'usable_with_review' ? 'warn' : 'default'} />
            <StatCard title="Context Freshness" value={data.context_freshness?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.context_freshness?.stale_sources)} stale · ${formatNumber(data.context_freshness?.aging_sources)} aging`} tone={toNumber(data.context_freshness?.stale_sources) > 0 ? 'bad' : toNumber(data.context_freshness?.aging_sources) > 0 || toNumber(data.context_freshness?.unknown_sources) > 0 ? 'warn' : 'default'} />
            <StatCard title="Context Sources" value={String(data.context_sources?.length ?? 0)} subtitle="Included read-only source groups for explainability." />
            <StatCard title="Automation Plan" value={String(data.automation_plan?.length ?? 0)} subtitle="Manual-only phases derived from readiness and recommendations." />
            <StatCard title="Decision Boundaries" value={data.decision_boundaries?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.decision_boundaries?.escalation_conditions?.length)} escalation conditions`} tone={data.decision_boundaries?.status === 'restricted' ? 'bad' : data.decision_boundaries?.status === 'review_required' ? 'warn' : 'default'} />
            <StatCard title="Execution Gates" value={data.execution_gates?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.execution_gates?.blocked_gates)} blocked · ${formatNumber(data.execution_gates?.review_gates)} review`} tone={toNumber(data.execution_gates?.blocked_gates) > 0 ? 'bad' : toNumber(data.execution_gates?.review_gates) > 0 ? 'warn' : 'default'} />
            <StatCard title="Context Observability" value={data.context_observability?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.context_observability?.observed_signals)} signals · ${formatNumber(data.context_observability?.evidence_events_7d)} evidence events`} tone={data.context_observability?.status === 'blocked_observed' ? 'bad' : data.context_observability?.status === 'review_observed' ? 'warn' : 'default'} />
            <StatCard title="Review Checklist" value={data.automation_review_checklist?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_review_checklist?.total_items)} items · ${formatNumber(data.automation_review_checklist?.critical_items)} critical`} tone={data.automation_review_checklist?.status === 'blocked' ? 'bad' : data.automation_review_checklist?.status === 'needs_review' || data.automation_review_checklist?.status === 'watch' ? 'warn' : 'default'} />
            <StatCard title="Action Hooks" value={data.automation_action_hooks?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_action_hooks?.safe_read_only_hooks)} safe · ${formatNumber(data.automation_action_hooks?.approval_required_hooks)} approval required`} tone={toNumber(data.automation_action_hooks?.blocked_hooks) > 0 ? 'bad' : toNumber(data.automation_action_hooks?.approval_required_hooks) > 0 ? 'warn' : 'default'} />
            <StatCard title="Hook Policy" value={data.automation_hook_policy?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_hook_policy?.read_only_allowed)} read-only · ${formatNumber(data.automation_hook_policy?.prohibited_mutations)} prohibited`} tone={toNumber(data.automation_hook_policy?.blocked) > 0 ? 'bad' : toNumber(data.automation_hook_policy?.approval_required) > 0 ? 'warn' : 'default'} />
            <StatCard title="Execution Log" value={data.automation_execution_log?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_execution_log?.total_events)} events · ${formatNumber(data.automation_execution_log?.blocked_events)} blocked`} tone={toNumber(data.automation_execution_log?.blocked_events) > 0 ? 'bad' : data.automation_execution_log?.status === 'review_events_present' ? 'warn' : 'default'} />
            <StatCard title="Execution Replay" value={data.automation_execution_replay?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_execution_replay?.replayable_events)} replayable events · ${formatNumber(data.automation_execution_replay?.blocked_steps)} blocked steps`} tone={(data.automation_execution_replay?.status === 'blocked' || toNumber(data.automation_execution_replay?.blocked_steps) > 1) ? 'bad' : data.automation_execution_replay?.status === 'needs_review' ? 'warn' : 'default'} />
            <StatCard title="Replay Verification" value={data.automation_execution_replay_verification?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_execution_replay_verification?.passed_checks)} passed · ${formatNumber(data.automation_execution_replay_verification?.failed_checks)} failed`} tone={toNumber(data.automation_execution_replay_verification?.failed_checks) > 0 ? 'bad' : toNumber(data.automation_execution_replay_verification?.review_checks) > 0 ? 'warn' : 'default'} />
            <StatCard title="Dry Run Summary" value={data.automation_dry_run_summary?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_dry_run_summary?.ready_scenarios)} ready · ${formatNumber(data.automation_dry_run_summary?.blocked_scenarios)} blocked`} tone={(data.automation_dry_run_summary?.status === 'blocked' || toNumber(data.automation_dry_run_summary?.blocked_scenarios) > 1) ? 'bad' : data.automation_dry_run_summary?.status === 'approval_required' ? 'warn' : 'default'} />
            <StatCard title="Dry Run Evidence" value={data.automation_dry_run_evidence?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_dry_run_evidence?.complete_items)} complete · ${formatNumber(data.automation_dry_run_evidence?.blocked_items)} blocked`} tone={toNumber(data.automation_dry_run_evidence?.blocked_items) > 0 ? 'bad' : toNumber(data.automation_dry_run_evidence?.review_items) > 0 ? 'warn' : 'default'} />
            <StatCard title="Dry Run Policy" value={data.automation_dry_run_policy?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_dry_run_policy?.enforced_rules)} enforced · ${formatNumber(data.automation_dry_run_policy?.review_rules)} review`} tone={toNumber(data.automation_dry_run_policy?.blocked_rules) > 1 ? 'bad' : toNumber(data.automation_dry_run_policy?.review_rules) > 0 ? 'warn' : 'default'} />
            <StatCard title="Dry Run Outcomes" value={data.automation_dry_run_outcomes?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_dry_run_outcomes?.ready_outcomes)} ready · ${formatNumber(data.automation_dry_run_outcomes?.approval_required_outcomes)} approval`} tone={toNumber(data.automation_dry_run_outcomes?.blocked_outcomes) > 1 ? 'bad' : toNumber(data.automation_dry_run_outcomes?.approval_required_outcomes) > 0 ? 'warn' : 'default'} />
            <StatCard title="Dry Run Closure" value={data.automation_dry_run_closure?.status?.replace(/_/g, ' ') ?? 'not evaluated'} subtitle={`${formatNumber(data.automation_dry_run_closure?.closed_checks)} closed · ${formatNumber(data.automation_dry_run_closure?.review_required_checks)} review`} tone={toNumber(data.automation_dry_run_closure?.blocked_checks) > 0 ? 'bad' : toNumber(data.automation_dry_run_closure?.review_required_checks) > 0 ? 'warn' : 'default'} />
            <StatCard title="Live Execution Gate" value={executionGate ? (executionGate.allowed ? 'allowed' : 'blocked') : 'not evaluated'} subtitle={executionGate ? `${executionGate.risk_level.replace(/_/g, ' ')} risk · ${formatNumber(executionGate.blockers.length)} blockers` : 'Controlled live-execution preflight.'} tone={executionGate ? (!executionGate.allowed ? 'bad' : executionGate.risk_level === 'medium' ? 'warn' : 'default') : 'default'} />
          </section>

          <div style={styles.grid}>
            <Section title="Tenant Context" subtitle="Read-only identity and generation metadata.">
              <div style={styles.list}>
                <KeyValue label="Tenant" value={data.tenant.name} />
                <KeyValue label="Tenant ID" value={data.tenant.id} />
                <KeyValue label="Generated" value={formatDateTime(data.generated_at)} />
                <KeyValue label="Sections" value={data.sections.join(', ')} />
              </div>
            </Section>

            <Section title="Inventory Context" subtitle="Operational inventory shape used by future automation.">
              <div style={styles.list}>
                <KeyValue label="Products" value={formatNumber(data.context.inventory?.total_products)} />
                <KeyValue label="Stocked Products" value={formatNumber(data.context.inventory?.stocked_products)} />
                <KeyValue label="Low Stock Products" value={formatNumber(data.context.inventory?.low_stock_products)} />
                <KeyValue label="Storage Locations" value={formatNumber(data.context.inventory?.storage_locations)} />
              </div>
            </Section>

            <Section title="Procurement Context" subtitle="Open procurement workload summary.">
              <div style={styles.list}>
                <KeyValue label="Open Shipments" value={formatNumber(data.context.procurement?.open_shipments)} />
                <KeyValue label="Partial Shipments" value={formatNumber(data.context.procurement?.partial_shipments)} />
                <KeyValue label="Open Purchase Orders" value={formatNumber(data.context.procurement?.open_purchase_orders)} />
                <KeyValue label="Approved Purchase Orders" value={formatNumber(data.context.procurement?.approved_purchase_orders)} />
              </div>
            </Section>

            <Section title="Costing Context" subtitle="Costing health exposed after the closed costing module.">
              <div style={styles.list}>
                <KeyValue label="Costed Products" value={formatNumber(data.context.costing?.costed_products)} />
                <KeyValue label="Uncosted Stocked Products" value={formatNumber(data.context.costing?.uncosted_stocked_products)} />
                <KeyValue label="High Variance Products" value={formatNumber(data.context.costing?.high_variance_products)} />
                <KeyValue label="Estimated Value" value={formatCurrency(data.context.costing?.estimated_inventory_value)} />
              </div>
            </Section>

            <Section title="Risk Signals" subtitle="Human-readable, non-executing signals for future automation.">
              <div style={styles.list}>
                {data.risk_signals.length ? data.risk_signals.map((signal) => (
                  <article key={signal.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{signal.code.replace(/_/g, ' ')}</div>
                    <div style={styles.itemText}>{signal.message}</div>
                    <div style={styles.itemMeta}>{signal.severity.toUpperCase()} · Count {formatNumber(signal.count)}</div>
                  </article>
                )) : <div className="app-empty-state">No context risk signals.</div>}
              </div>
            </Section>

            {data.predictive_readiness_summary ? (
            <Section title="Predictive Readiness" subtitle="Read-only readiness for future forecasting and operator planning.">
              <div style={styles.grid}>
                <StatCard title="Readiness Score" value={formatNumber(data.predictive_readiness_summary.score)} subtitle={data.predictive_readiness_summary.status.replace(/_/g, ' ')} />
                <StatCard title="Signals" value={formatNumber(data.predictive_readiness_summary.signal_count)} subtitle="Recommendation signals available." />
                <StatCard title="High Confidence" value={formatNumber(data.predictive_readiness_summary.high_confidence_signal_count)} subtitle="Signals with high confidence." />
                <StatCard title="Repeated Signals" value={formatNumber(data.predictive_readiness_summary.repeated_signal_count)} subtitle="Repeated operational signal groups." />
                <StatCard title="Volatility Signals" value={formatNumber(data.predictive_readiness_summary.volatility_signal_count)} subtitle="High-volatility signals." />
              </div>
              <div style={styles.list}>
                <KeyValue label="Allowed Use" value={data.predictive_readiness_summary.allowed_use.replace(/_/g, ' ')} />
                <KeyValue label="Blocked Use" value={data.predictive_readiness_summary.blocked_use.replace(/_/g, ' ')} />
                <KeyValue label="Read Only" value={data.predictive_readiness_summary.read_only ? 'Yes' : 'No'} />
                <KeyValue label="Executes Actions" value={data.predictive_readiness_summary.executes_actions ? 'Yes' : 'No'} />
                {data.predictive_readiness_summary.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
                {data.predictive_readiness_summary.predictive_guardrails ? (
                  <>
                    <h4 style={styles.itemTitle}>Predictive Guardrails</h4>
                    <KeyValue label="Mutation Allowed" value={data.predictive_readiness_summary.predictive_guardrails.mutation_allowed ? 'Yes' : 'No'} />
                    <KeyValue label="Request Creation Allowed" value={data.predictive_readiness_summary.predictive_guardrails.request_creation_allowed ? 'Yes' : 'No'} />
                    <KeyValue label="Automatic Execution Allowed" value={data.predictive_readiness_summary.predictive_guardrails.automatic_execution_allowed ? 'Yes' : 'No'} />
                    <KeyValue label="Approval Required" value={data.predictive_readiness_summary.predictive_guardrails.approval_required_for_any_followup ? 'Yes' : 'No'} />
                    <KeyValue label="Tenant Scoped Only" value={data.predictive_readiness_summary.predictive_guardrails.tenant_scoped_only ? 'Yes' : 'No'} />
                  </>
                ) : null}
                {data.predictive_readiness_summary.explainability ? (
                  <>
                    <h4 style={styles.itemTitle}>Predictive Explainability</h4>
                    <KeyValue label="Score Model" value={data.predictive_readiness_summary.explainability.score_model.replace(/_/g, ' ')} />
                    <KeyValue label="Confidence Basis" value={data.predictive_readiness_summary.explainability.confidence_basis.replace(/_/g, ' ')} />
                    <KeyValue label="Score Inputs" value={data.predictive_readiness_summary.explainability.score_inputs.join(', ')} />
                    {data.predictive_readiness_summary.explainability.limitations.map((note) => <div key={note} style={styles.note}>{note}</div>)}
                  </>
                ) : null}
              </div>
            </Section>
          ) : null}





{snapshotComparisonQuery.data ? (
  <Section title="Snapshot Comparison" subtitle="Read-only comparison of the latest two System Context snapshots.">
    <div style={styles.note}>
      Snapshot comparison is deterministic and read-only. It does not create execution requests, execute actions, or mutate inventory.
    </div>
    {snapshotComparisonQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient History</div>
        <div style={styles.itemText}>At least two snapshots are required for comparison.</div>
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Read Only</span>
            <strong>{snapshotComparisonQuery.data.read_only ? 'Yes' : 'No'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Executes Actions</span>
            <strong>{snapshotComparisonQuery.data.executes_actions ? 'Yes' : 'No'}</strong>
          </div>
        </div>
        {snapshotComparisonQuery.data.comparisons.map((item) => (
          <div key={item.code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{item.label}</div>
            <div style={styles.itemMeta}>Direction: {item.direction}</div>
            <div style={styles.itemText}>Current: {formatNumber(item.current)} · Previous: {formatNumber(item.previous)} · Delta: {formatNumber(item.delta)}</div>
          </div>
        ))}
      </div>
    )}
  </Section>
) : null}

{snapshotComparisonQuery.error ? (
  <div className="app-error-state">{readableError(snapshotComparisonQuery.error)}</div>
) : null}


{snapshotTrendQuery.data ? (
  <Section title="Snapshot Trend Foundation" subtitle="Read-only historical trend series built from stored System Context snapshots.">
    <div style={styles.note}>
      Trend analysis is deterministic and read-only. It does not run forecasting models, create execution requests, mutate inventory, or schedule automation.
    </div>
    {snapshotTrendQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient Trend History</div>
        <div style={styles.itemText}>At least {formatNumber(snapshotTrendQuery.data.minimum_required_snapshots)} snapshots are required for trend analysis. Available snapshots: {formatNumber(snapshotTrendQuery.data.available_snapshots)}.</div>
        {snapshotTrendQuery.data.forecast_readiness_summary ? (
          <div style={styles.itemMeta}>Forecast readiness posture: {snapshotTrendQuery.data.forecast_readiness_summary.posture.replace(/_/g, ' ')} · Future foundation ready: {snapshotTrendQuery.data.forecast_readiness_summary.ready_for_future_forecasting_foundation ? 'yes' : 'no'}</div>
        ) : null}
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Read Only</span>
            <strong>{snapshotTrendQuery.data.read_only ? 'Yes' : 'No'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Executes Actions</span>
            <strong>{snapshotTrendQuery.data.executes_actions ? 'Yes' : 'No'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Snapshots Used</span>
            <strong>{formatNumber(snapshotTrendQuery.data.available_snapshots)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Metrics Increased</span>
            <strong>{formatNumber(snapshotTrendQuery.data.trend_summary?.increased_metric_count)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Metrics Decreased</span>
            <strong>{formatNumber(snapshotTrendQuery.data.trend_summary?.decreased_metric_count)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>High Volatility</span>
            <strong>{formatNumber(snapshotTrendQuery.data.trend_summary?.high_volatility_metric_count)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Avg Confidence</span>
            <strong>{formatNumber(snapshotTrendQuery.data.trend_summary?.average_directional_confidence_score)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>High Confidence Metrics</span>
            <strong>{formatNumber(snapshotTrendQuery.data.trend_summary?.high_confidence_metric_count)}</strong>
          </div>
        </div>
        {snapshotTrendQuery.data.forecast_readiness_summary ? (
          <div style={styles.itemCard}>
            <div style={styles.itemTitle}>Forecast Readiness Foundation</div>
            <div style={styles.itemText}>Posture: {snapshotTrendQuery.data.forecast_readiness_summary.posture.replace(/_/g, ' ')} · Future foundation ready: {snapshotTrendQuery.data.forecast_readiness_summary.ready_for_future_forecasting_foundation ? 'yes' : 'no'}</div>
            <div style={styles.itemMeta}>Average confidence: {formatNumber(snapshotTrendQuery.data.forecast_readiness_summary.average_directional_confidence_score)} · High confidence metrics: {formatNumber(snapshotTrendQuery.data.forecast_readiness_summary.high_confidence_metric_count)} · High volatility metrics: {formatNumber(snapshotTrendQuery.data.forecast_readiness_summary.high_volatility_metric_count)}</div>
            <div style={styles.itemMeta}>Forecast model: {snapshotTrendQuery.data.forecast_readiness_summary.forecast_model_enabled ? 'enabled' : 'disabled'} · Execution: {snapshotTrendQuery.data.forecast_readiness_summary.execution_enabled ? 'enabled' : 'disabled'} · Mutation: {snapshotTrendQuery.data.forecast_readiness_summary.mutation_enabled ? 'enabled' : 'disabled'} · Automation: {snapshotTrendQuery.data.forecast_readiness_summary.automation_enabled ? 'enabled' : 'disabled'}</div>
            {snapshotTrendQuery.data.forecast_readiness_summary.blocking_reasons.map((reason) => <div key={reason} style={styles.itemMeta}>Blocking: {reason}</div>)}
            {snapshotTrendQuery.data.forecast_readiness_summary.watch_reasons.map((reason) => <div key={reason} style={styles.itemMeta}>Watch: {reason}</div>)}
          </div>
        ) : null}
        {snapshotTrendQuery.data.trend_summary ? (
          <div style={styles.itemCard}>
            <div style={styles.itemTitle}>Directional Trend Summary</div>
            <div style={styles.itemText}>
              Increased: {formatNumber(snapshotTrendQuery.data.trend_summary.increased_metric_count)} · Decreased: {formatNumber(snapshotTrendQuery.data.trend_summary.decreased_metric_count)} · Unchanged: {formatNumber(snapshotTrendQuery.data.trend_summary.unchanged_metric_count)}
            </div>
            <div style={styles.itemMeta}>
              Volatility: stable {formatNumber(snapshotTrendQuery.data.trend_summary.stable_metric_count)} · moderate {formatNumber(snapshotTrendQuery.data.trend_summary.moderate_volatility_metric_count)} · high {formatNumber(snapshotTrendQuery.data.trend_summary.high_volatility_metric_count)}
            </div>
            <div style={styles.itemMeta}>
              Directional confidence: high {formatNumber(snapshotTrendQuery.data.trend_summary.high_confidence_metric_count)} · medium {formatNumber(snapshotTrendQuery.data.trend_summary.medium_confidence_metric_count)} · low {formatNumber(snapshotTrendQuery.data.trend_summary.low_confidence_metric_count)}
            </div>
          </div>
        ) : null}
        {snapshotTrendQuery.data.trends.map((trend) => (
          <div key={trend.code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{trend.label}</div>
            <div style={styles.itemMeta}>Direction: {trend.direction} · Latest segment: {trend.latest_segment_direction} ({formatNumber(trend.latest_segment_delta)}) · Volatility: {trend.volatility_classification}</div>
            <div style={styles.itemText}>Oldest: {formatNumber(trend.first)} · Latest: {formatNumber(trend.latest)} · Delta: {formatNumber(trend.delta)}</div>
            <div style={styles.itemMeta}>Directional confidence: {trend.directional_confidence.level.replace(/_/g, ' ')} · Score {formatNumber(trend.directional_confidence.score)} · Stable direction ratio {formatNumber(trend.directional_confidence.stable_direction_ratio)}</div>
            <div style={styles.itemMeta}>Trend windows: short {trend.trend_windows.short.direction} ({formatNumber(trend.trend_windows.short.consistency_ratio)}) · medium {trend.trend_windows.medium.direction} ({trend.trend_windows.medium.status.replace(/_/g, ' ')}) · long {trend.trend_windows.long.direction} ({formatNumber(trend.trend_windows.long.consistency_ratio)})</div>
            <div style={styles.itemMeta}>Directional foundation: {trend.directional_foundation.momentum.replace(/_/g, ' ')} · Avg Δ/snapshot {formatNumber(trend.directional_foundation.average_delta_per_snapshot)} · Forecast model: {trend.directional_foundation.forecast_model_enabled ? 'enabled' : 'disabled'}</div>
            <div style={styles.itemMeta}>Series: {trend.points.map((point) => `${formatDateTime(point.generated_at)} = ${formatNumber(point.value)}`).join(' | ')}</div>
          </div>
        ))}
        {snapshotTrendQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    )}
  </Section>
) : null}

{snapshotTrendQuery.error ? (
  <div className="app-error-state">{readableError(snapshotTrendQuery.error)}</div>
) : null}


{forecastSeriesQuery.data ? (
  <Section title="Historical Forecast Series Builder" subtitle="Read-only normalized model-input series built from stored snapshot trends.">
    <div style={styles.note}>
      Forecast series are data preparation only. They do not run a forecast model, create execution requests, mutate inventory, or schedule automation.
    </div>
    {forecastSeriesQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient Forecast Series History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastSeriesQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastSeriesQuery.data.available_snapshots)}.</div>
        {forecastSeriesQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Read Only</span>
            <strong>{forecastSeriesQuery.data.read_only ? 'Yes' : 'No'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Series Builder Only</span>
            <strong>{forecastSeriesQuery.data.series_builder_only ? 'Yes' : 'No'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Series Count</span>
            <strong>{formatNumber(forecastSeriesQuery.data.forecast_series_summary?.series_count)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Ready Series</span>
            <strong>{formatNumber(forecastSeriesQuery.data.forecast_series_summary?.model_input_ready_series_count)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Total Points</span>
            <strong>{formatNumber(forecastSeriesQuery.data.forecast_series_summary?.total_point_count)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Forecast Model</span>
            <strong>{forecastSeriesQuery.data.forecast_model_enabled ? 'Enabled' : 'Disabled'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Mutation</span>
            <strong>{forecastSeriesQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Automation</span>
            <strong>{forecastSeriesQuery.data.automation_enabled ? 'Enabled' : 'Disabled'}</strong>
          </div>
        </div>
        {forecastSeriesQuery.data.forecast_series.map((series) => (
          <div key={series.code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{series.label}</div>
            <div style={styles.itemText}>Points: {formatNumber(series.point_count)} · Ready for model input: {series.model_input_ready ? 'yes' : 'no'} · Volatility: {series.volatility_classification.replace(/_/g, ' ')}</div>
            <div style={styles.itemMeta}>First: {formatNumber(series.statistics.first_value)} · Latest: {formatNumber(series.statistics.latest_value)} · Net Δ: {formatNumber(series.statistics.net_delta)} · Avg Δ/snapshot: {formatNumber(series.average_delta_per_snapshot)}</div>
            <div style={styles.itemMeta}>Observed: {formatDateTime(series.first_observed_at)} → {formatDateTime(series.latest_observed_at)} · Confidence: {series.directional_confidence_level.replace(/_/g, ' ')} ({formatNumber(series.directional_confidence_score)})</div>
            <div style={styles.itemMeta}>Forecast model: {series.forecast_model_enabled ? 'enabled' : 'disabled'} · Execution: {series.execution_enabled ? 'enabled' : 'disabled'} · Mutation: {series.mutation_enabled ? 'enabled' : 'disabled'} · Automation: {series.automation_enabled ? 'enabled' : 'disabled'}</div>
          </div>
        ))}
        {forecastSeriesQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    )}
  </Section>
) : null}

{forecastSeriesQuery.error ? (
  <div className="app-error-state">{readableError(forecastSeriesQuery.error)}</div>
) : null}


{forecastHorizonQuery.data ? (
  <Section title="Forecast Horizon Infrastructure" subtitle="Read-only near, planning, and extended projection windows built from historical forecast series evidence.">
    <div style={styles.note}>
      Forecast horizons organize deterministic projections only. They do not run forecast models, create execution requests, mutate inventory, or schedule automation.
    </div>
    {forecastHorizonQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient Forecast Horizon History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastHorizonQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastHorizonQuery.data.available_snapshots)}.</div>
        {forecastHorizonQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Read Only</span><strong>{forecastHorizonQuery.data.read_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Projection Only</span><strong>{forecastHorizonQuery.data.horizon_projection_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Horizons</span><strong>{formatNumber(forecastHorizonQuery.data.horizon_summary?.horizon_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Metric Projections</span><strong>{formatNumber(forecastHorizonQuery.data.horizon_summary?.total_metric_projection_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Watch Projections</span><strong>{formatNumber(forecastHorizonQuery.data.horizon_summary?.total_watch_projection_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Forecast Model</span><strong>{forecastHorizonQuery.data.forecast_model_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastHorizonQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Automation</span><strong>{forecastHorizonQuery.data.automation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastHorizonQuery.data.forecast_horizons.map((horizon) => (
          <div key={horizon.horizon_code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{horizon.horizon_label}</div>
            <div style={styles.itemText}>Snapshot span: {formatNumber(horizon.snapshot_span)} · Projections: {formatNumber(horizon.metric_projection_count)} · Ready inputs: {formatNumber(horizon.model_input_ready_count)} · Watch: {formatNumber(horizon.watch_projection_count)}</div>
            {horizon.metric_projections.map((projection) => (
              <div key={`${horizon.horizon_code}-${projection.metric_code}`} style={styles.itemMeta}>
                {projection.label}: {projection.projected_direction.replace(/_/g, ' ')} · Value {formatNumber(projection.projected_value)} · Δ {formatNumber(projection.projected_delta)} · Confidence {projection.confidence_level.replace(/_/g, ' ')} · Risk {projection.risk_classification.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        ))}
        {forecastHorizonQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    )}
  </Section>
) : null}

{forecastHorizonQuery.error ? (
  <div className="app-error-state">{readableError(forecastHorizonQuery.error)}</div>
) : null}


{forecastBaselineQuery.data ? (
  <Section title="Baseline Forecast Engine" subtitle="Deterministic read-only baseline forecasts built from historical forecast series evidence.">
    <div style={styles.note}>
      Baseline forecasts are intelligence only. They do not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastBaselineQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient Baseline Forecast History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastBaselineQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastBaselineQuery.data.available_snapshots)}.</div>
        {forecastBaselineQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Read Only</span><strong>{forecastBaselineQuery.data.read_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Baseline Only</span><strong>{forecastBaselineQuery.data.baseline_forecast_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Deterministic Engine</span><strong>{forecastBaselineQuery.data.deterministic_engine ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Horizons</span><strong>{formatNumber(forecastBaselineQuery.data.baseline_forecast_summary?.horizon_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Metric Forecasts</span><strong>{formatNumber(forecastBaselineQuery.data.baseline_forecast_summary?.total_metric_forecast_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Watch Forecasts</span><strong>{formatNumber(forecastBaselineQuery.data.baseline_forecast_summary?.total_watch_forecast_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>{forecastBaselineQuery.data.execution_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastBaselineQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastBaselineQuery.data.baseline_forecasts.map((forecast) => (
          <div key={forecast.horizon_code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{forecast.horizon_label}</div>
            <div style={styles.itemText}>Snapshot span: {formatNumber(forecast.snapshot_span)} · Forecasts: {formatNumber(forecast.metric_forecast_count)} · Ready inputs: {formatNumber(forecast.model_input_ready_count)} · Watch: {formatNumber(forecast.watch_forecast_count)}</div>
            {forecast.metric_forecasts.map((metricForecast) => (
              <div key={`${forecast.horizon_code}-${metricForecast.metric_code}`} style={styles.itemMeta}>
                {metricForecast.label}: {metricForecast.baseline_forecast_direction.replace(/_/g, ' ')} · Value {formatNumber(metricForecast.baseline_forecast_value)} · Δ {formatNumber(metricForecast.baseline_forecast_delta)} · Confidence {metricForecast.confidence_level.replace(/_/g, ' ')} · Risk {metricForecast.risk_classification.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        ))}
        {forecastBaselineQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    )}
  </Section>
) : null}

{forecastBaselineQuery.error ? (
  <div className="app-error-state">{readableError(forecastBaselineQuery.error)}</div>
) : null}


{forecastMovingAverageQuery.data ? (
  <Section title="Moving Average Forecast Engine" subtitle="Deterministic read-only moving average forecasts built from historical forecast series values.">
    <div style={styles.note}>
      Moving average forecasts smooth historical snapshot values only. They do not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastMovingAverageQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient Moving Average Forecast History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastMovingAverageQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastMovingAverageQuery.data.available_snapshots)}.</div>
        {forecastMovingAverageQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Read Only</span><strong>{forecastMovingAverageQuery.data.read_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Moving Average Only</span><strong>{forecastMovingAverageQuery.data.moving_average_forecast_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Deterministic Engine</span><strong>{forecastMovingAverageQuery.data.deterministic_engine ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Windows</span><strong>{formatNumber(forecastMovingAverageQuery.data.moving_average_summary?.window_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Metric Forecasts</span><strong>{formatNumber(forecastMovingAverageQuery.data.moving_average_summary?.total_metric_forecast_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Watch Forecasts</span><strong>{formatNumber(forecastMovingAverageQuery.data.moving_average_summary?.total_watch_forecast_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>{forecastMovingAverageQuery.data.execution_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastMovingAverageQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastMovingAverageQuery.data.moving_average_forecasts.map((forecast) => (
          <div key={forecast.window_code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{forecast.window_label}</div>
            <div style={styles.itemText}>Window size: {formatNumber(forecast.requested_window_size)} · Forecasts: {formatNumber(forecast.metric_forecast_count)} · Ready inputs: {formatNumber(forecast.model_input_ready_count)} · Watch: {formatNumber(forecast.watch_forecast_count)}</div>
            {forecast.metric_forecasts.map((metricForecast) => (
              <div key={`${forecast.window_code}-${metricForecast.metric_code}`} style={styles.itemMeta}>
                {metricForecast.label}: {metricForecast.moving_average_forecast_direction.replace(/_/g, ' ')} · Moving Avg {formatNumber(metricForecast.moving_average_value)} · Δ {formatNumber(metricForecast.moving_average_forecast_delta)} · Effective Window {formatNumber(metricForecast.effective_window_size)} · Confidence {metricForecast.confidence_level.replace(/_/g, ' ')} · Risk {metricForecast.risk_classification.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        ))}
        {forecastMovingAverageQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    )}
  </Section>
) : null}

{forecastMovingAverageQuery.error ? (
  <div className="app-error-state">{readableError(forecastMovingAverageQuery.error)}</div>
) : null}



{forecastWeightedTrendQuery.data ? (
  <Section title="Weighted Trend Forecast Engine" subtitle="Deterministic read-only weighted trend forecasts that emphasize recent historical movement.">
    <div style={styles.note}>
      Weighted trend forecasts are intelligence only. They do not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastWeightedTrendQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient Weighted Trend Forecast History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastWeightedTrendQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastWeightedTrendQuery.data.available_snapshots)}.</div>
        {forecastWeightedTrendQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Read Only</span><strong>{forecastWeightedTrendQuery.data.read_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Weighted Trend Only</span><strong>{forecastWeightedTrendQuery.data.weighted_trend_forecast_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Deterministic Engine</span><strong>{forecastWeightedTrendQuery.data.deterministic_engine ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Windows</span><strong>{formatNumber(forecastWeightedTrendQuery.data.weighted_trend_summary?.window_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Metric Forecasts</span><strong>{formatNumber(forecastWeightedTrendQuery.data.weighted_trend_summary?.total_metric_forecast_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Watch Forecasts</span><strong>{formatNumber(forecastWeightedTrendQuery.data.weighted_trend_summary?.total_watch_forecast_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>{forecastWeightedTrendQuery.data.execution_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastWeightedTrendQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastWeightedTrendQuery.data.weighted_trend_forecasts.map((forecast) => (
          <div key={forecast.window_code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{forecast.window_label}</div>
            <div style={styles.itemText}>Window size: {formatNumber(forecast.requested_window_size)} · Projection span: {formatNumber(forecast.projection_span)} · Forecasts: {formatNumber(forecast.metric_forecast_count)} · Ready inputs: {formatNumber(forecast.model_input_ready_count)} · Watch: {formatNumber(forecast.watch_forecast_count)}</div>
            {forecast.metric_forecasts.map((metricForecast) => (
              <div key={`${forecast.window_code}-${metricForecast.metric_code}`} style={styles.itemMeta}>
                {metricForecast.label}: {metricForecast.weighted_trend_forecast_direction.replace(/_/g, ' ')} · Weighted Δ/snapshot {formatNumber(metricForecast.weighted_delta_per_snapshot)} · Projected Value {formatNumber(metricForecast.weighted_trend_forecast_value)} · Projected Δ {formatNumber(metricForecast.weighted_trend_forecast_delta)} · Confidence {metricForecast.confidence_level.replace(/_/g, ' ')} · Risk {metricForecast.risk_classification.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        ))}
        {forecastWeightedTrendQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    )}
  </Section>
) : null}

{forecastWeightedTrendQuery.error ? (
  <div className="app-error-state">{readableError(forecastWeightedTrendQuery.error)}</div>
) : null}


{forecastVolatilityAdjustedQuery.data ? (
  <Section title="Volatility-Aware Forecast Adjustment" subtitle="Deterministic read-only forecast adjustments that dampen weighted-trend movement when volatility is elevated.">
    <div style={styles.note}>
      Volatility-adjusted forecasts are intelligence only. They do not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastVolatilityAdjustedQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient Volatility-Adjusted Forecast History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastVolatilityAdjustedQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastVolatilityAdjustedQuery.data.available_snapshots)}.</div>
        {forecastVolatilityAdjustedQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Read Only</span><strong>{forecastVolatilityAdjustedQuery.data.read_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Volatility Adjusted Only</span><strong>{forecastVolatilityAdjustedQuery.data.volatility_adjusted_forecast_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Deterministic Engine</span><strong>{forecastVolatilityAdjustedQuery.data.deterministic_engine ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Windows</span><strong>{formatNumber(forecastVolatilityAdjustedQuery.data.volatility_adjusted_summary?.window_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Metric Forecasts</span><strong>{formatNumber(forecastVolatilityAdjustedQuery.data.volatility_adjusted_summary?.total_metric_forecast_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Watch Forecasts</span><strong>{formatNumber(forecastVolatilityAdjustedQuery.data.volatility_adjusted_summary?.total_watch_forecast_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>{forecastVolatilityAdjustedQuery.data.execution_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastVolatilityAdjustedQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastVolatilityAdjustedQuery.data.volatility_adjusted_forecasts.map((forecast) => (
          <div key={forecast.window_code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{forecast.window_label}</div>
            <div style={styles.itemText}>Window size: {formatNumber(forecast.requested_window_size)} · Projection span: {formatNumber(forecast.projection_span)} · Forecasts: {formatNumber(forecast.metric_forecast_count)} · Ready inputs: {formatNumber(forecast.model_input_ready_count)} · Watch: {formatNumber(forecast.watch_forecast_count)}</div>
            {forecast.metric_forecasts.map((metricForecast) => (
              <div key={`${forecast.window_code}-${metricForecast.metric_code}`} style={styles.itemMeta}>
                {metricForecast.label}: {metricForecast.volatility_adjusted_direction.replace(/_/g, ' ')} · Source Δ {formatNumber(metricForecast.source_weighted_delta)} · Factor {formatNumber(metricForecast.volatility_adjustment_factor)} · Adjusted Δ {formatNumber(metricForecast.volatility_adjusted_delta)} · Adjusted Value {formatNumber(metricForecast.volatility_adjusted_forecast_value)} · Confidence {metricForecast.confidence_level.replace(/_/g, ' ')} · Risk {metricForecast.risk_classification.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        ))}
        {forecastVolatilityAdjustedQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    )}
  </Section>
) : null}

{forecastVolatilityAdjustedQuery.error ? (
  <div className="app-error-state">{readableError(forecastVolatilityAdjustedQuery.error)}</div>
) : null}


{forecastConfidenceQuery.data ? (
  <Section title="Forecast Confidence Engine" subtitle="Deterministic read-only confidence scoring for forecast outputs.">
    <div style={styles.note}>
      Forecast confidence is intelligence only. It does not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastConfidenceQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient Forecast Confidence History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastConfidenceQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastConfidenceQuery.data.available_snapshots)}.</div>
        {forecastConfidenceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Read Only</span><strong>{forecastConfidenceQuery.data.read_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Confidence Only</span><strong>{forecastConfidenceQuery.data.confidence_engine_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Deterministic Engine</span><strong>{forecastConfidenceQuery.data.deterministic_engine ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Average Confidence</span><strong>{formatNumber(forecastConfidenceQuery.data.forecast_confidence_summary?.average_confidence_score)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Overall Band</span><strong>{forecastConfidenceQuery.data.forecast_confidence_summary?.overall_confidence_band.replace(/_/g, ' ')}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Watch Metrics</span><strong>{formatNumber(forecastConfidenceQuery.data.forecast_confidence_summary?.total_watch_confidence_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>{forecastConfidenceQuery.data.execution_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastConfidenceQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastConfidenceQuery.data.forecast_confidence_windows.map((window) => (
          <div key={window.window_code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{window.window_label}</div>
            <div style={styles.itemText}>Window size: {formatNumber(window.requested_window_size)} · Projection span: {formatNumber(window.projection_span)} · Average confidence: {formatNumber(window.average_confidence_score)} · Band: {window.confidence_band.replace(/_/g, ' ')} · Watch: {formatNumber(window.watch_confidence_count)}</div>
            {window.metric_confidences.map((metricConfidence) => (
              <div key={`${window.window_code}-${metricConfidence.metric_code}`} style={styles.itemMeta}>
                {metricConfidence.label}: score {formatNumber(metricConfidence.confidence_score)} · Band {metricConfidence.confidence_band.replace(/_/g, ' ')} · Risk {metricConfidence.confidence_risk_classification.replace(/_/g, ' ')} · Forecast value {formatNumber(metricConfidence.forecast_value)} · Forecast Δ {formatNumber(metricConfidence.forecast_delta)} · Volatility {metricConfidence.volatility_classification.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        ))}
        {forecastConfidenceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    )}
  </Section>
) : null}

{forecastConfidenceQuery.error ? (
  <div className="app-error-state">{readableError(forecastConfidenceQuery.error)}</div>
) : null}


{forecastAccuracyQuery.data ? (
  <Section title="Forecast Accuracy Tracking" subtitle="Deterministic read-only historical backtest scoring for forecast reliability.">
    <div style={styles.note}>
      Forecast accuracy tracking compares deterministic historical predictions against already-observed snapshot values only. It does not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastAccuracyQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient Forecast Accuracy History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastAccuracyQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastAccuracyQuery.data.available_snapshots)}.</div>
        {forecastAccuracyQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Read Only</span><strong>{forecastAccuracyQuery.data.read_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Accuracy Only</span><strong>{forecastAccuracyQuery.data.forecast_accuracy_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Historical Backtest</span><strong>{forecastAccuracyQuery.data.historical_backtest_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Average Accuracy</span><strong>{formatNumber(forecastAccuracyQuery.data.forecast_accuracy_summary?.average_accuracy_score)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Overall Band</span><strong>{forecastAccuracyQuery.data.forecast_accuracy_summary?.overall_accuracy_band.replace(/_/g, ' ')}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Evaluations</span><strong>{formatNumber(forecastAccuracyQuery.data.forecast_accuracy_summary?.total_evaluation_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>{forecastAccuracyQuery.data.execution_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastAccuracyQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastAccuracyQuery.data.metric_accuracy.map((metricAccuracy) => (
          <div key={metricAccuracy.metric_code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{metricAccuracy.label}</div>
            <div style={styles.itemText}>Accuracy score: {formatNumber(metricAccuracy.accuracy_score)} · Band: {metricAccuracy.accuracy_band.replace(/_/g, ' ')} · Risk: {metricAccuracy.accuracy_risk_classification.replace(/_/g, ' ')} · Evaluations: {formatNumber(metricAccuracy.evaluation_count)}</div>
            <div style={styles.itemMeta}>MAE {formatNumber(metricAccuracy.mean_absolute_error)} · MAPE {formatNumber(metricAccuracy.mean_absolute_percent_error)}% · Directional accuracy {formatNumber(Number(metricAccuracy.directional_accuracy_rate) * 100)}% · Volatility {metricAccuracy.volatility_classification.replace(/_/g, ' ')}</div>
          </div>
        ))}
        {forecastAccuracyQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    )}
  </Section>
) : null}

{forecastAccuracyQuery.error ? (
  <div className="app-error-state">{readableError(forecastAccuracyQuery.error)}</div>
) : null}






{forecastConfidenceGovernanceQuery.data ? (<>
  





<Section title="Phase C — Execution Intelligence Linkage" subtitle="Read-only traceability from system recommendations into execution request lifecycle evidence.">
{executionIntelligenceLinkageQuery.data ? (
  <>
    <div style={styles.readOnlyBanner}>
      Execution intelligence linkage is evidence only. It does not submit, approve, execute, retry, rollback, mutate tenant operations, start workers, or schedule automation.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{executionIntelligenceLinkageQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{executionIntelligenceLinkageQuery.data.phase_c_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{executionIntelligenceLinkageQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(executionIntelligenceLinkageQuery.data.linkage_summary.readiness_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Coverage</span><strong>{formatNumber(executionIntelligenceLinkageQuery.data.linkage_summary.linkage_coverage_rate * 100)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Linked Requests</span><strong>{formatNumber(executionIntelligenceLinkageQuery.data.linkage_summary.linked_recommendation_execution_requests)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Executed Requests</span><strong>{formatNumber(executionIntelligenceLinkageQuery.data.linkage_summary.executed_recommendation_execution_requests)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{executionIntelligenceLinkageQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {executionIntelligenceLinkageQuery.data.linkage_blockers.length > 0 ? <div style={styles.warningText}>Linkage blockers: {executionIntelligenceLinkageQuery.data.linkage_blockers.join(', ')}</div> : null}
    {executionIntelligenceLinkageQuery.data.request_linkage_evidence.map((request) => (
      <div key={request.execution_request_id} style={styles.listItem}>
        <div style={styles.itemTitle}>{request.request_type.replace(/_/g, ' ')} — {request.linkage_status.replace(/_/g, ' ')}</div>
        <div style={styles.itemText}>Lifecycle: {request.lifecycle_stage.replace(/_/g, ' ')} · Status: {request.status.replace(/_/g, ' ')} · Execution: {(request.execution_status || 'not executed').replace(/_/g, ' ')}</div>
        <div style={styles.itemMeta}>Recommendation key: {request.recommendation_key || '-'} · Requested: {formatDateTime(request.requested_at)} · Reviewed: {formatDateTime(request.reviewed_at)} · Executed: {formatDateTime(request.executed_at)}</div>
        {request.linkage_blockers.length > 0 ? <div style={styles.warningText}>Request blockers: {request.linkage_blockers.join(', ')}</div> : null}
      </div>
    ))}
    {executionIntelligenceLinkageQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </>
) : (
  <div className="app-empty-state">Execution intelligence linkage evidence is loading.</div>
)}
{executionIntelligenceLinkageQuery.error ? (
  <div className="app-error-state">{readableError(executionIntelligenceLinkageQuery.error)}</div>
) : null}
</Section>



<Section title="Phase C — Execution Outcome Scoring" subtitle="Read-only scoring of recommendation execution results, audit evidence, rollback evidence, and runtime blockers.">
{executionIntelligenceOutcomeScoringQuery.data ? (
  <>
    <div style={styles.readOnlyBanner}>
      Execution outcome scoring is evidence only. It does not submit, approve, execute, retry, rollback, mutate tenant operations, start workers, or schedule automation.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{executionIntelligenceOutcomeScoringQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{executionIntelligenceOutcomeScoringQuery.data.phase_c_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{executionIntelligenceOutcomeScoringQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(executionIntelligenceOutcomeScoringQuery.data.outcome_scoring_summary.readiness_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Average Outcome Score</span><strong>{formatNumber(executionIntelligenceOutcomeScoringQuery.data.outcome_scoring_summary.average_execution_outcome_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Scored Rate</span><strong>{formatNumber(executionIntelligenceOutcomeScoringQuery.data.outcome_scoring_summary.scored_execution_outcome_rate * 100)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Failed Executions</span><strong>{formatNumber(executionIntelligenceOutcomeScoringQuery.data.outcome_scoring_summary.failed_recommendation_execution_requests)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{executionIntelligenceOutcomeScoringQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {executionIntelligenceOutcomeScoringQuery.data.outcome_scoring_blockers.length > 0 ? <div style={styles.warningText}>Outcome scoring blockers: {executionIntelligenceOutcomeScoringQuery.data.outcome_scoring_blockers.join(', ')}</div> : null}
    {executionIntelligenceOutcomeScoringQuery.data.request_outcome_scoring_evidence.map((request) => (
      <div key={request.execution_request_id} style={styles.listItem}>
        <div style={styles.itemTitle}>{request.request_type.replace(/_/g, ' ')} — {request.outcome_classification.replace(/_/g, ' ')}</div>
        <div style={styles.itemText}>Score: {formatNumber(request.execution_outcome_score)}% · Status: {request.status.replace(/_/g, ' ')} · Execution: {(request.execution_status || 'not executed').replace(/_/g, ' ')} · Result: {(request.result_outcome || 'missing').replace(/_/g, ' ')}</div>
        <div style={styles.itemMeta}>Recommendation key: {request.recommendation_key || '-'} · Executed: {formatDateTime(request.executed_at)} · Audit evidence: {request.has_audit_evidence ? 'yes' : 'no'} · Rollback evidence: {request.rollback_evidence_present ? 'yes' : 'no'}</div>
        {request.outcome_blockers.length > 0 ? <div style={styles.warningText}>Outcome blockers: {request.outcome_blockers.join(', ')}</div> : null}
      </div>
    ))}
    {executionIntelligenceOutcomeScoringQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </>
) : (
  <div className="app-empty-state">Execution outcome scoring evidence is loading.</div>
)}
{executionIntelligenceOutcomeScoringQuery.error ? (
  <div className="app-error-state">{readableError(executionIntelligenceOutcomeScoringQuery.error)}</div>
) : null}
</Section>


<Section title="Phase C — Execution Rollback Evidence" subtitle="Read-only rollback and recovery evidence governance for risky or failed recommendation executions.">
{executionIntelligenceRollbackEvidenceQuery.data ? (
  <>
    <div style={styles.readOnlyBanner}>
      Rollback evidence governance is evidence only. It does not execute, retry, rollback, mutate tenant operations, start workers, or schedule automation.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{executionIntelligenceRollbackEvidenceQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{executionIntelligenceRollbackEvidenceQuery.data.phase_c_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{executionIntelligenceRollbackEvidenceQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(executionIntelligenceRollbackEvidenceQuery.data.rollback_evidence_summary.readiness_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Coverage</span><strong>{formatNumber(executionIntelligenceRollbackEvidenceQuery.data.rollback_evidence_summary.rollback_evidence_coverage_rate * 100)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Rollback Required</span><strong>{formatNumber(executionIntelligenceRollbackEvidenceQuery.data.rollback_evidence_summary.rollback_required_execution_requests)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Missing Required Evidence</span><strong>{formatNumber(executionIntelligenceRollbackEvidenceQuery.data.rollback_evidence_summary.missing_required_rollback_evidence_requests)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{executionIntelligenceRollbackEvidenceQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {executionIntelligenceRollbackEvidenceQuery.data.rollback_evidence_blockers.length > 0 ? <div style={styles.warningText}>Rollback evidence blockers: {executionIntelligenceRollbackEvidenceQuery.data.rollback_evidence_blockers.join(', ')}</div> : null}
    {executionIntelligenceRollbackEvidenceQuery.data.request_rollback_evidence.map((request) => (
      <div key={request.execution_request_id} style={styles.listItem}>
        <div style={styles.itemTitle}>{request.request_type.replace(/_/g, ' ')} — {request.rollback_posture.replace(/_/g, ' ')}</div>
        <div style={styles.itemText}>Status: {request.status.replace(/_/g, ' ')} · Execution: {(request.execution_status || 'not executed').replace(/_/g, ' ')} · Result: {(request.result_outcome || 'missing').replace(/_/g, ' ')}</div>
        <div style={styles.itemMeta}>Recommendation key: {request.recommendation_key || '-'} · Executed: {formatDateTime(request.executed_at)} · Rollback required: {request.rollback_required ? 'yes' : 'no'} · Rollback evidence: {request.rollback_evidence_present ? 'yes' : 'no'} · Recovery evidence: {request.recovery_evidence_present ? 'yes' : 'no'}</div>
        {request.rollback_blockers.length > 0 ? <div style={styles.warningText}>Rollback blockers: {request.rollback_blockers.join(', ')}</div> : null}
      </div>
    ))}
    {executionIntelligenceRollbackEvidenceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </>
) : (
  <div className="app-empty-state">Execution rollback evidence is loading.</div>
)}
{executionIntelligenceRollbackEvidenceQuery.error ? (
  <div className="app-error-state">{readableError(executionIntelligenceRollbackEvidenceQuery.error)}</div>
) : null}
</Section>


<Section title="Phase C — Execution Risk Scoring" subtitle="Read-only commercial risk scoring for recommendation executions before closed-loop learning evidence.">
{executionIntelligenceRiskScoringQuery.data ? (
  <>
    <div style={styles.readOnlyBanner}>
      Execution risk scoring is evidence only. It does not execute, retry, rollback, mutate tenant operations, start workers, or schedule automation.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{executionIntelligenceRiskScoringQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{executionIntelligenceRiskScoringQuery.data.phase_c_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{executionIntelligenceRiskScoringQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(executionIntelligenceRiskScoringQuery.data.risk_scoring_summary.readiness_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Average Risk Score</span><strong>{formatNumber(executionIntelligenceRiskScoringQuery.data.risk_scoring_summary.average_execution_risk_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>High/Critical Rate</span><strong>{formatNumber(executionIntelligenceRiskScoringQuery.data.risk_scoring_summary.high_or_critical_execution_risk_rate * 100)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Critical Risks</span><strong>{formatNumber(executionIntelligenceRiskScoringQuery.data.risk_scoring_summary.critical_execution_risk_requests)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{executionIntelligenceRiskScoringQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {executionIntelligenceRiskScoringQuery.data.risk_scoring_blockers.length > 0 ? <div style={styles.warningText}>Risk scoring blockers: {executionIntelligenceRiskScoringQuery.data.risk_scoring_blockers.join(', ')}</div> : null}
    {executionIntelligenceRiskScoringQuery.data.request_risk_scoring_evidence.map((request) => (
      <div key={request.execution_request_id} style={styles.listItem}>
        <div style={styles.itemTitle}>{request.request_type.replace(/_/g, ' ')} — {request.risk_classification.replace(/_/g, ' ')}</div>
        <div style={styles.itemText}>Risk score: {formatNumber(request.execution_risk_score)}% · Status: {request.status.replace(/_/g, ' ')} · Execution: {(request.execution_status || 'not executed').replace(/_/g, ' ')} · Result: {(request.result_outcome || 'missing').replace(/_/g, ' ')}</div>
        <div style={styles.itemMeta}>Recommendation key: {request.recommendation_key || '-'} · Executed: {formatDateTime(request.executed_at)} · Audit evidence: {request.has_audit_evidence ? 'yes' : 'no'} · Rollback required: {request.rollback_required ? 'yes' : 'no'} · Rollback evidence: {request.rollback_evidence_present ? 'yes' : 'no'}</div>
        {request.explicit_risk_signals.length > 0 ? <div style={styles.itemMeta}>Risk signals: {request.explicit_risk_signals.join(', ')}</div> : null}
        {request.risk_blockers.length > 0 ? <div style={styles.warningText}>Risk blockers: {request.risk_blockers.join(', ')}</div> : null}
      </div>
    ))}
    {executionIntelligenceRiskScoringQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </>
) : (
  <div className="app-empty-state">Execution risk scoring evidence is loading.</div>
)}
{executionIntelligenceRiskScoringQuery.error ? (
  <div className="app-error-state">{readableError(executionIntelligenceRiskScoringQuery.error)}</div>
) : null}
</Section>


<Section title="Phase C — Closed-Loop Learning Evidence" subtitle="Read-only evidence proving recommendation execution requests connect to measured outcomes and learning signals.">
{executionIntelligenceClosedLoopLearningQuery.data ? (
  <>
    <div style={styles.readOnlyBanner}>
      Closed-loop learning evidence is read-only. It does not execute recommendations, mutate tenant operations, train models, or schedule automation.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{executionIntelligenceClosedLoopLearningQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{executionIntelligenceClosedLoopLearningQuery.data.phase_c_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{executionIntelligenceClosedLoopLearningQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(executionIntelligenceClosedLoopLearningQuery.data.closed_loop_learning_summary.readiness_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Completion Rate</span><strong>{formatNumber(executionIntelligenceClosedLoopLearningQuery.data.closed_loop_learning_summary.closed_loop_completion_rate * 100)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Learning Signal Coverage</span><strong>{formatNumber(executionIntelligenceClosedLoopLearningQuery.data.closed_loop_learning_summary.learning_signal_coverage_rate * 100)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blocked Requests</span><strong>{formatNumber(executionIntelligenceClosedLoopLearningQuery.data.closed_loop_learning_summary.blocked_closed_loop_execution_requests)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{executionIntelligenceClosedLoopLearningQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {executionIntelligenceClosedLoopLearningQuery.data.closed_loop_learning_blockers.length > 0 ? <div style={styles.warningText}>Closed-loop blockers: {executionIntelligenceClosedLoopLearningQuery.data.closed_loop_learning_blockers.join(', ')}</div> : null}
    {executionIntelligenceClosedLoopLearningQuery.data.request_closed_loop_learning_evidence.map((request) => (
      <div key={request.execution_request_id} style={styles.listItem}>
        <div style={styles.itemTitle}>{request.recommendation_key || request.execution_request_id} — {request.closed_loop_ready ? 'closed loop ready' : 'closed loop blocked'}</div>
        <div style={styles.itemText}>Execution: {(request.execution_status || 'not executed').replace(/_/g, ' ')} · Outcomes: {formatNumber(request.matched_outcome_count)} · Learning signals: {formatNumber(request.learning_signal_count)} · Evidence: {formatNumber(request.learning_signal_evidence_count)} · Closed actions: {formatNumber(request.closed_learning_action_count)}</div>
        <div style={styles.itemMeta}>Executed: {formatDateTime(request.executed_at)} · Result evidence: {request.has_execution_result ? 'yes' : 'no'} · Signals: {request.learning_signals.length ? request.learning_signals.join(', ') : '-'}</div>
        <div style={styles.itemMeta}>Outcome keys: {request.outcome_keys.length ? request.outcome_keys.join(', ') : '-'}</div>
        {request.closed_loop_blockers.length > 0 ? <div style={styles.warningText}>Closed-loop blockers: {request.closed_loop_blockers.join(', ')}</div> : null}
      </div>
    ))}
    {executionIntelligenceClosedLoopLearningQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </>
) : (
  <div className="app-empty-state">Closed-loop learning evidence is loading.</div>
)}
{executionIntelligenceClosedLoopLearningQuery.error ? (
  <div className="app-error-state">{readableError(executionIntelligenceClosedLoopLearningQuery.error)}</div>
) : null}
</Section>

<Section title="Phase B — Forecast Phase Closure" subtitle="Read-only closure evidence for the implemented forecast governance and accuracy capability set.">
{forecastPhaseClosureQuery.data ? (
  <>
    <div style={styles.readOnlyBanner}>
      Forecast phase closure is evidence only. It does not execute forecasts, create execution requests, mutate tenant operations, start workers, or schedule automation.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{forecastPhaseClosureQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{forecastPhaseClosureQuery.data.phase_b_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{forecastPhaseClosureQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Capability Status</span><strong>{forecastPhaseClosureQuery.data.capability_status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Runtime Data</span><strong>{forecastPhaseClosureQuery.data.runtime_data_status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Closure Score</span><strong>{formatNumber(forecastPhaseClosureQuery.data.phase_closure_summary.closure_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Closed Capabilities</span><strong>{formatNumber(forecastPhaseClosureQuery.data.phase_closure_summary.closed_capability_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blocked Capabilities</span><strong>{formatNumber(forecastPhaseClosureQuery.data.phase_closure_summary.blocked_capability_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Phase</span><strong>{forecastPhaseClosureQuery.data.next_phase}</strong></div>
    </div>
    {forecastPhaseClosureQuery.data.phase_closure_blockers.length > 0 ? <div style={styles.warningText}>Closure blockers: {forecastPhaseClosureQuery.data.phase_closure_blockers.join(', ')}</div> : null}
    {forecastPhaseClosureQuery.data.capability_closure_evidence.map((capability) => (
      <div key={capability.code} style={styles.listItem}>
        <div style={styles.itemTitle}>{capability.label} — {capability.closure_status.replace(/_/g, ' ')}</div>
        <div style={styles.itemText}>Step: {capability.phase_b_step} · Source status: {capability.source_status.replace(/_/g, ' ')} · Evidence: {capability.evidence_reference ?? '-'}</div>
        {capability.closure_blockers.length > 0 ? <div style={styles.warningText}>Capability blockers: {capability.closure_blockers.join(', ')}</div> : null}
      </div>
    ))}
    {forecastPhaseClosureQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </>
) : (
  <div className="app-empty-state">Forecast phase closure evidence is loading.</div>
)}
{forecastPhaseClosureQuery.error ? (
  <div className="app-error-state">{readableError(forecastPhaseClosureQuery.error)}</div>
) : null}
</Section>

<Section title="Phase B — Forecast Governance Readiness" subtitle="Read-only readiness gate aggregating all Phase B forecast governance controls into one commercial review view.">
{forecastGovernanceReadinessQuery.data ? (
  <>
    <div style={styles.readOnlyBanner}>
      Forecast governance readiness is evidence only. It does not execute forecasts, create execution requests, mutate tenant operations, or schedule automation.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase Step</span><strong>{forecastGovernanceReadinessQuery.data.phase_b_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{forecastGovernanceReadinessQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(forecastGovernanceReadinessQuery.data.governance_readiness_summary.readiness_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Controls</span><strong>{formatNumber(forecastGovernanceReadinessQuery.data.governance_readiness_summary.control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready Controls</span><strong>{formatNumber(forecastGovernanceReadinessQuery.data.governance_readiness_summary.ready_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blocked Controls</span><strong>{formatNumber(forecastGovernanceReadinessQuery.data.governance_readiness_summary.blocked_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Avg Control Score</span><strong>{formatNumber(forecastGovernanceReadinessQuery.data.governance_readiness_summary.average_control_readiness_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blockers</span><strong>{formatNumber(forecastGovernanceReadinessQuery.data.governance_readiness_summary.blocker_count)}</strong></div>
    </div>
    {forecastGovernanceReadinessQuery.data.governance_readiness_blockers.length > 0 ? <div style={styles.warningText}>Readiness blockers: {forecastGovernanceReadinessQuery.data.governance_readiness_blockers.join(', ')}</div> : null}
    {forecastGovernanceReadinessQuery.data.control_readiness.map((control) => (
      <div key={control.code} style={styles.listItem}>
        <div style={styles.itemTitle}>{control.label} — {control.control_status.replace(/_/g, ' ')}</div>
        <div style={styles.itemText}>Step: {control.phase_b_step} · Source status: {control.source_status.replace(/_/g, ' ')} · Readiness score: {control.readiness_score == null ? '-' : `${formatNumber(control.readiness_score)}%`} · Snapshots: {formatNumber(control.available_snapshots)}</div>
        {control.control_blockers.length > 0 ? <div style={styles.warningText}>Control blockers: {control.control_blockers.join(', ')}</div> : null}
      </div>
    ))}
    {forecastGovernanceReadinessQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </>
) : (
  <div className="app-empty-state">Forecast governance readiness evidence is loading.</div>
)}
{forecastGovernanceReadinessQuery.error ? (
  <div className="app-error-state">{readableError(forecastGovernanceReadinessQuery.error)}</div>
) : null}
</Section>

<Section title="Phase B — Forecast Outcome Validation Governance" subtitle="Read-only validation evidence proving forecast signals can be measured after outcomes are observed.">
{forecastOutcomeValidationGovernanceQuery.data ? (
  forecastOutcomeValidationGovernanceQuery.data.status === 'insufficient_history' ? (
    <div style={styles.listItem}>
      <div style={styles.itemTitle}>Insufficient Forecast Outcome Validation History</div>
      <div style={styles.itemText}>At least {formatNumber(forecastOutcomeValidationGovernanceQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastOutcomeValidationGovernanceQuery.data.available_snapshots)}.</div>
      {forecastOutcomeValidationGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
    </div>
  ) : (
    <>
      <div style={styles.readOnlyBanner}>
        Forecast outcome validation governance is evidence only. It does not execute recommendations, mutate inventory, change suppliers or shipments, or schedule automation.
      </div>
      <div style={styles.summaryGrid}>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase Step</span><strong>{forecastOutcomeValidationGovernanceQuery.data.phase_b_step}</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{forecastOutcomeValidationGovernanceQuery.data.status.replace(/_/g, ' ')}</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(forecastOutcomeValidationGovernanceQuery.data.outcome_validation_summary?.readiness_score)}%</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Scenarios</span><strong>{formatNumber(forecastOutcomeValidationGovernanceQuery.data.outcome_validation_summary?.scenario_count)}</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready</span><strong>{formatNumber(forecastOutcomeValidationGovernanceQuery.data.outcome_validation_summary?.ready_scenario_count)}</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blocked</span><strong>{formatNumber(forecastOutcomeValidationGovernanceQuery.data.outcome_validation_summary?.blocked_scenario_count)}</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Evidence Coverage</span><strong>{formatNumber((forecastOutcomeValidationGovernanceQuery.data.outcome_validation_summary?.validation_evidence_coverage_rate ?? 0) * 100)}%</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blockers</span><strong>{formatNumber(forecastOutcomeValidationGovernanceQuery.data.outcome_validation_summary?.blocker_count)}</strong></div>
      </div>
      {forecastOutcomeValidationGovernanceQuery.data.outcome_validation_blockers.length > 0 ? <div style={styles.warningText}>Governance blockers: {forecastOutcomeValidationGovernanceQuery.data.outcome_validation_blockers.join(', ')}</div> : null}
      {forecastOutcomeValidationGovernanceQuery.data.scenario_outcome_validation_governance.slice(0, 8).map((scenario) => (
        <div key={scenario.code ?? scenario.label} style={styles.listItem}>
          <div style={styles.itemTitle}>{scenario.label} — {scenario.outcome_validation_status}</div>
          <div style={styles.itemText}>Risk: {scenario.forecast_risk_band.replace(/_/g, ' ')} · Priority: {scenario.review_priority.replace(/_/g, ' ')} · Confidence: {formatNumber(scenario.confidence_score)} · Accuracy: {scenario.historical_accuracy_score == null ? '-' : formatNumber(scenario.historical_accuracy_score)}</div>
          <div style={styles.itemMeta}>Projected value: {formatNumber(scenario.projected_value)} · Projected delta: {formatNumber(scenario.projected_delta)} · Direction consensus: {scenario.direction_consensus.replace(/_/g, ' ')} · Evaluations: {formatNumber(scenario.historical_evaluation_count)}</div>
          {scenario.outcome_validation_blockers.length > 0 ? <div style={styles.warningText}>Scenario blockers: {scenario.outcome_validation_blockers.join(', ')}</div> : null}
        </div>
      ))}
      {forecastOutcomeValidationGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
    </>
  )
) : (
  <div className="app-empty-state">Forecast outcome validation governance evidence is loading.</div>
)}
{forecastOutcomeValidationGovernanceQuery.error ? (
  <div className="app-error-state">{readableError(forecastOutcomeValidationGovernanceQuery.error)}</div>
) : null}
</Section>

<Section title="Phase B — Forecast Adjustment Governance" subtitle="Read-only adjustment/override evidence for volatility-adjusted forecasts, exposure limits, and review blockers.">
{forecastAdjustmentGovernanceQuery.data ? (
  forecastAdjustmentGovernanceQuery.data.status === 'insufficient_history' ? (
    <div style={styles.listItem}>
      <div style={styles.itemTitle}>Insufficient Forecast Adjustment Governance History</div>
      <div style={styles.itemText}>At least {formatNumber(forecastAdjustmentGovernanceQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastAdjustmentGovernanceQuery.data.available_snapshots)}.</div>
      {forecastAdjustmentGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
    </div>
  ) : (
    <>
      <div style={styles.summaryGrid}>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase Step</span><strong>{forecastAdjustmentGovernanceQuery.data.phase_b_step}</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(forecastAdjustmentGovernanceQuery.data.adjustment_governance_summary?.readiness_score)}%</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Windows</span><strong>{formatNumber(forecastAdjustmentGovernanceQuery.data.adjustment_governance_summary?.window_count)}</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Metrics</span><strong>{formatNumber(forecastAdjustmentGovernanceQuery.data.adjustment_governance_summary?.metric_count)}</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Adjusted Metrics</span><strong>{formatNumber(forecastAdjustmentGovernanceQuery.data.adjustment_governance_summary?.adjusted_metric_count)}</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>High Volatility</span><strong>{formatNumber(forecastAdjustmentGovernanceQuery.data.adjustment_governance_summary?.high_volatility_adjustment_count)}</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Explained</span><strong>{formatNumber(forecastAdjustmentGovernanceQuery.data.adjustment_governance_summary?.explained_adjustment_count)}</strong></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blockers</span><strong>{formatNumber(forecastAdjustmentGovernanceQuery.data.adjustment_governance_summary?.blocker_count)}</strong></div>
      </div>
      {forecastAdjustmentGovernanceQuery.data.window_adjustment_governance.map((window) => (
        <div key={window.window_code ?? window.window_label} style={styles.listItem}>
          <div style={styles.itemTitle}>{window.window_label} — {window.adjustment_governance_status}</div>
          <div style={styles.itemText}>Ready metrics: {formatNumber(window.ready_metric_count)} / {formatNumber(window.metric_count)} · Adjusted metrics: {formatNumber(window.adjusted_metric_count)} · Exposure: {formatNumber(window.adjusted_metric_exposure_rate * 100)}% · Explanation coverage: {formatNumber(window.adjustment_explanation_coverage_rate * 100)}%</div>
          {window.adjustment_governance_blockers.length > 0 ? <div style={styles.warningText}>Window blockers: {window.adjustment_governance_blockers.join(', ')}</div> : null}
          {window.metric_adjustment_governance.slice(0, 5).map((metric) => (
            <div key={`${window.window_code}-${metric.metric_code}`} style={styles.nestedListItem}>
              <div style={styles.itemTitle}>{metric.label} — {metric.adjustment_governance_status}</div>
              <div style={styles.itemText}>Factor: {formatNumber(metric.volatility_adjustment_factor)} · Source delta: {formatNumber(metric.source_weighted_delta)} · Adjusted delta: {formatNumber(metric.volatility_adjusted_delta)} · Volatility: {metric.volatility_classification}</div>
              {metric.adjustment_governance_blockers.length > 0 ? <div style={styles.warningText}>Metric blockers: {metric.adjustment_governance_blockers.join(', ')}</div> : null}
            </div>
          ))}
        </div>
      ))}
      {forecastAdjustmentGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
    </>
  )
) : (
  <div className="app-empty-state">Forecast adjustment governance evidence is loading.</div>
)}
{forecastAdjustmentGovernanceQuery.error ? (
  <div className="app-error-state">{readableError(forecastAdjustmentGovernanceQuery.error)}</div>
) : null}
</Section>

<Section title="Phase B — Forecast Confidence Governance" subtitle="Read-only confidence visibility, low-confidence exposure, and review blockers for forecast governance.">
    <div style={styles.readOnlyBanner}>
      Forecast confidence governance is evidence only. It does not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastConfidenceGovernanceQuery.data.status === 'insufficient_history' ? (
      <div style={styles.emptyState}>
        <div style={styles.itemTitle}>Insufficient Forecast Confidence Governance History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastConfidenceGovernanceQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastConfidenceGovernanceQuery.data.available_snapshots)}.</div>
        {forecastConfidenceGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase Step</span><strong>{forecastConfidenceGovernanceQuery.data.phase_b_step}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(forecastConfidenceGovernanceQuery.data.confidence_governance_summary?.readiness_score)}%</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Windows</span><strong>{formatNumber(forecastConfidenceGovernanceQuery.data.confidence_governance_summary?.window_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Metrics</span><strong>{formatNumber(forecastConfidenceGovernanceQuery.data.confidence_governance_summary?.metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready Metrics</span><strong>{formatNumber(forecastConfidenceGovernanceQuery.data.confidence_governance_summary?.ready_metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Low Confidence</span><strong>{formatNumber(forecastConfidenceGovernanceQuery.data.confidence_governance_summary?.low_confidence_metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Watch Confidence</span><strong>{formatNumber(forecastConfidenceGovernanceQuery.data.confidence_governance_summary?.watch_confidence_metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Avg Confidence</span><strong>{formatNumber(forecastConfidenceGovernanceQuery.data.confidence_governance_summary?.average_confidence_score)}</strong></div>
        </div>
        {forecastConfidenceGovernanceQuery.data.window_confidence_governance.map((window) => (
          <div key={window.window_code || window.window_label} style={styles.detailCard}>
            <div style={styles.itemTitle}>{window.window_label}</div>
            <div style={styles.itemText}>Status: {window.confidence_governance_status.replace(/_/g, ' ')} · Ready: {window.confidence_governance_ready ? 'yes' : 'no'} · Average confidence {formatNumber(window.average_confidence_score)} / floor {formatNumber(window.minimum_confidence_score)}</div>
            <div style={styles.itemMeta}>Metrics: {formatNumber(window.metric_count)} · Ready {formatNumber(window.ready_metric_count)} · Low confidence {formatNumber(window.low_confidence_metric_count)} · Watch confidence {formatNumber(window.watch_confidence_metric_count)}</div>
            <div style={styles.itemMeta}>Low exposure {formatNumber(Number(window.low_confidence_exposure_rate) * 100)}% / max {formatNumber(Number(window.max_low_confidence_exposure_rate) * 100)}% · Watch exposure {formatNumber(Number(window.watch_confidence_exposure_rate) * 100)}% / max {formatNumber(Number(window.max_watch_confidence_exposure_rate) * 100)}%</div>
            {window.confidence_governance_blockers.length > 0 ? <div style={styles.note}>Window blockers: {window.confidence_governance_blockers.map((item) => item.replace(/_/g, ' ')).join(', ')}</div> : null}
            {window.metric_confidence_governance.slice(0, 5).map((metric) => (
              <div key={metric.metric_code || metric.label} style={styles.itemCard}>
                <div style={styles.itemTitle}>{metric.label}</div>
                <div style={styles.itemText}>Score: {formatNumber(metric.confidence_score)} · Band: {metric.confidence_band.replace(/_/g, ' ')} · Risk: {metric.confidence_risk_classification.replace(/_/g, ' ')}</div>
                <div style={styles.itemMeta}>Volatility: {metric.volatility_classification.replace(/_/g, ' ')} · Input ready: {metric.model_input_ready ? 'yes' : 'no'} · Forecast {formatNumber(metric.forecast_value)} · Delta {formatNumber(metric.forecast_delta)}</div>
                {metric.confidence_governance_blockers.length > 0 ? <div style={styles.note}>Blockers: {metric.confidence_governance_blockers.map((item) => item.replace(/_/g, ' ')).join(', ')}</div> : null}
              </div>
            ))}
          </div>
        ))}
        {forecastConfidenceGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </>
    )}
  </Section>
</>) : null}

{forecastConfidenceGovernanceQuery.error ? (
  <div className="app-error-state">{readableError(forecastConfidenceGovernanceQuery.error)}</div>
) : null}

{forecastDegradationGovernanceQuery.data ? (
  <Section title="Phase B — Forecast Degradation Governance" subtitle="Read-only detection for worsening recent forecast quality, recent MAPE exposure, and degradation blockers.">
    <div style={styles.readOnlyBanner}>
      Forecast degradation governance is evidence only. It does not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastDegradationGovernanceQuery.data.status === 'insufficient_history' ? (
      <div style={styles.emptyState}>
        <div style={styles.itemTitle}>Insufficient Forecast Degradation Governance History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastDegradationGovernanceQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastDegradationGovernanceQuery.data.available_snapshots)}.</div>
        {forecastDegradationGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase Step</span><strong>{forecastDegradationGovernanceQuery.data.phase_b_step}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(forecastDegradationGovernanceQuery.data.degradation_governance_summary?.readiness_score)}%</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Metrics</span><strong>{formatNumber(forecastDegradationGovernanceQuery.data.degradation_governance_summary?.metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready</span><strong>{formatNumber(forecastDegradationGovernanceQuery.data.degradation_governance_summary?.ready_metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blocked</span><strong>{formatNumber(forecastDegradationGovernanceQuery.data.degradation_governance_summary?.blocked_metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Degraded</span><strong>{formatNumber(forecastDegradationGovernanceQuery.data.degradation_governance_summary?.degraded_metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Avg Recent MAPE</span><strong>{formatNumber(forecastDegradationGovernanceQuery.data.degradation_governance_summary?.average_recent_mean_absolute_percent_error)}%</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Avg Degradation</span><strong>{formatNumber(forecastDegradationGovernanceQuery.data.degradation_governance_summary?.average_degradation_delta)} pts</strong></div>
        </div>
        {forecastDegradationGovernanceQuery.data.metric_degradation_governance.map((metric) => (
          <div key={metric.metric_code || metric.label} style={styles.detailCard}>
            <div style={styles.itemTitle}>{metric.label}</div>
            <div style={styles.itemText}>Status: {metric.degradation_governance_status.replace(/_/g, ' ')} · Ready: {metric.degradation_governance_ready ? 'yes' : 'no'} · Severity: {metric.degradation_severity.replace(/_/g, ' ')}</div>
            <div style={styles.itemMeta}>Evaluations: {formatNumber(metric.evaluation_count)} · Recent MAPE {formatNumber(metric.recent_mean_absolute_percent_error)}% / max {formatNumber(metric.max_recent_mean_absolute_percent_error)}% · Prior MAPE {formatNumber(metric.prior_mean_absolute_percent_error)}% · Degradation {formatNumber(metric.degradation_delta)} pts / max {formatNumber(metric.max_degradation_delta)} pts</div>
            <div style={styles.itemMeta}>Recent MAE {formatNumber(metric.recent_mean_absolute_error)} · Recent actual avg {formatNumber(metric.recent_average_actual_value)} · Recent error/value ratio {formatNumber(Number(metric.recent_error_to_value_ratio) * 100)}%</div>
            {metric.degradation_governance_blockers.length > 0 ? <div style={styles.note}>Blockers: {metric.degradation_governance_blockers.map((item) => item.replace(/_/g, ' ')).join(', ')}</div> : null}
          </div>
        ))}
        {forecastDegradationGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </>
    )}
  </Section>
) : null}
{forecastDegradationGovernanceQuery.error ? (
  <div className="app-error-state">{readableError(forecastDegradationGovernanceQuery.error)}</div>
) : null}

{forecastErrorGovernanceQuery.data ? (
  <Section title="Phase B — Forecast Error Governance" subtitle="Read-only tolerance gate for forecast error exposure, MAPE thresholds, and material error blockers.">
    <div style={styles.readOnlyBanner}>
      Forecast error governance is evidence only. It does not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastErrorGovernanceQuery.data.status === 'insufficient_history' ? (
      <div style={styles.emptyState}>
        <div style={styles.itemTitle}>Insufficient Forecast Error Governance History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastErrorGovernanceQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastErrorGovernanceQuery.data.available_snapshots)}.</div>
        {forecastErrorGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase Step</span><strong>{forecastErrorGovernanceQuery.data.phase_b_step}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(forecastErrorGovernanceQuery.data.error_governance_summary?.readiness_score)}%</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Metrics</span><strong>{formatNumber(forecastErrorGovernanceQuery.data.error_governance_summary?.metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready</span><strong>{formatNumber(forecastErrorGovernanceQuery.data.error_governance_summary?.ready_metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blocked</span><strong>{formatNumber(forecastErrorGovernanceQuery.data.error_governance_summary?.blocked_metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blockers</span><strong>{formatNumber(forecastErrorGovernanceQuery.data.error_governance_summary?.blocker_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Avg MAPE</span><strong>{formatNumber(forecastErrorGovernanceQuery.data.error_governance_summary?.average_mean_absolute_percent_error)}%</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Critical Errors</span><strong>{formatNumber(forecastErrorGovernanceQuery.data.error_governance_summary?.critical_error_metric_count)}</strong></div>
        </div>
        {forecastErrorGovernanceQuery.data.metric_error_governance.map((metric) => (
          <div key={metric.metric_code || metric.label} style={styles.detailCard}>
            <div style={styles.itemTitle}>{metric.label}</div>
            <div style={styles.itemText}>Status: {metric.error_governance_status.replace(/_/g, ' ')} · Ready: {metric.error_governance_ready ? 'yes' : 'no'} · Severity: {metric.error_severity.replace(/_/g, ' ')}</div>
            <div style={styles.itemMeta}>Evaluations: {formatNumber(metric.evaluation_count)} · MAE {formatNumber(metric.mean_absolute_error)} · MAPE {formatNumber(metric.mean_absolute_percent_error)}% / max {formatNumber(metric.max_mean_absolute_percent_error)}% · Error/value ratio {formatNumber(Number(metric.error_to_value_ratio) * 100)}%</div>
            {metric.error_governance_blockers.length > 0 ? <div style={styles.note}>Blockers: {metric.error_governance_blockers.map((item) => item.replace(/_/g, ' ')).join(', ')}</div> : null}
          </div>
        ))}
        {forecastErrorGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </>
    )}
  </Section>
) : null}
{forecastErrorGovernanceQuery.error ? (
  <div className="app-error-state">{readableError(forecastErrorGovernanceQuery.error)}</div>
) : null}

{forecastAccuracyGovernanceQuery.data ? (
  <Section title="Phase B — Forecast Accuracy Governance" subtitle="Read-only governance gate for forecast accuracy, directional accuracy, backtest depth, and metric-level blockers.">
    <div style={styles.readOnlyBanner}>
      Forecast accuracy governance is evidence only. It does not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastAccuracyGovernanceQuery.data.status === 'insufficient_history' ? (
      <div style={styles.emptyState}>
        <div style={styles.itemTitle}>Insufficient Forecast Accuracy Governance History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastAccuracyGovernanceQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastAccuracyGovernanceQuery.data.available_snapshots)}.</div>
        {forecastAccuracyGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase Step</span><strong>{forecastAccuracyGovernanceQuery.data.phase_b_step}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(forecastAccuracyGovernanceQuery.data.accuracy_governance_summary?.readiness_score)}%</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Metrics</span><strong>{formatNumber(forecastAccuracyGovernanceQuery.data.accuracy_governance_summary?.metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready</span><strong>{formatNumber(forecastAccuracyGovernanceQuery.data.accuracy_governance_summary?.ready_metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blocked</span><strong>{formatNumber(forecastAccuracyGovernanceQuery.data.accuracy_governance_summary?.blocked_metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blockers</span><strong>{formatNumber(forecastAccuracyGovernanceQuery.data.accuracy_governance_summary?.blocker_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Avg Accuracy</span><strong>{formatNumber(forecastAccuracyGovernanceQuery.data.accuracy_governance_summary?.average_accuracy_score)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Avg Direction</span><strong>{formatNumber(Number(forecastAccuracyGovernanceQuery.data.accuracy_governance_summary?.average_directional_accuracy_rate ?? 0) * 100)}%</strong></div>
        </div>
        {forecastAccuracyGovernanceQuery.data.metric_accuracy_governance.map((metric) => (
          <div key={metric.metric_code || metric.label} style={styles.detailCard}>
            <div style={styles.itemTitle}>{metric.label}</div>
            <div style={styles.itemText}>Status: {metric.governance_status.replace(/_/g, ' ')} · Ready: {metric.governance_ready ? 'yes' : 'no'} · Accuracy: {formatNumber(metric.accuracy_score)} · Direction: {formatNumber(Number(metric.directional_accuracy_rate) * 100)}%</div>
            <div style={styles.itemMeta}>Evaluations: {formatNumber(metric.evaluation_count)} · MAPE {formatNumber(metric.mean_absolute_percent_error)}% · Band: {metric.accuracy_band.replace(/_/g, ' ')} · Risk: {metric.accuracy_risk_classification.replace(/_/g, ' ')}</div>
            {metric.governance_blockers.length > 0 ? <div style={styles.note}>Blockers: {metric.governance_blockers.map((item) => item.replace(/_/g, ' ')).join(', ')}</div> : null}
          </div>
        ))}
        {forecastAccuracyGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </>
    )}
  </Section>
) : null}
{forecastAccuracyGovernanceQuery.error ? (
  <div className="app-error-state">{readableError(forecastAccuracyGovernanceQuery.error)}</div>
) : null}


{forecastVersionGovernanceQuery.data ? (
  <Section title="Phase B — Forecast Version Governance" subtitle="Read-only version keys, SHA-256 fingerprints, source lineage, and governance blockers for each forecast capability.">
    <div style={styles.readOnlyBanner}>
      Forecast version governance is evidence only. It does not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastVersionGovernanceQuery.data.status === 'insufficient_history' ? (
      <div style={styles.emptyState}>
        <div style={styles.itemTitle}>Insufficient Forecast Version Governance History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastVersionGovernanceQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastVersionGovernanceQuery.data.available_snapshots)}.</div>
        {forecastVersionGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase Step</span><strong>{forecastVersionGovernanceQuery.data.phase_b_step}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(forecastVersionGovernanceQuery.data.version_governance_summary?.readiness_score)}%</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Versions</span><strong>{formatNumber(forecastVersionGovernanceQuery.data.version_governance_summary?.version_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready</span><strong>{formatNumber(forecastVersionGovernanceQuery.data.version_governance_summary?.ready_version_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blocked</span><strong>{formatNumber(forecastVersionGovernanceQuery.data.version_governance_summary?.blocked_version_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blockers</span><strong>{formatNumber(forecastVersionGovernanceQuery.data.version_governance_summary?.blocker_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>{forecastVersionGovernanceQuery.data.execution_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastVersionGovernanceQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastVersionGovernanceQuery.data.forecast_versions.map((version) => (
          <div key={version.code} style={styles.detailCard}>
            <div style={styles.itemTitle}>{version.label}</div>
            <div style={styles.itemText}>Status: {version.status.replace(/_/g, ' ')} · Source: {version.source_status.replace(/_/g, ' ')} · Ready: {version.governance_ready ? 'yes' : 'no'} · Readiness rate: {formatNumber(Number(version.readiness_rate) * 100)}%</div>
            <div style={styles.itemMeta}>Version key: {version.forecast_version_key}</div>
            <div style={styles.itemMeta}>Fingerprint: {version.forecast_version_fingerprint.slice(0, 16)}… · Metrics: {formatNumber(version.metric_count)} · Watch: {formatNumber(version.watch_count)} · Snapshots: {formatNumber(version.snapshot_lineage.available_snapshots)}</div>
            {version.governance_blockers.length > 0 ? <div style={styles.note}>Blockers: {version.governance_blockers.map((item) => item.replace(/_/g, ' ')).join(', ')}</div> : null}
          </div>
        ))}
        {forecastVersionGovernanceQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </>
    )}
  </Section>
) : null}
{forecastVersionGovernanceQuery.error ? (
  <div className="app-error-state">{readableError(forecastVersionGovernanceQuery.error)}</div>
) : null}


{forecastComparisonQuery.data ? (
  <Section title="Forecast Comparison Engine" subtitle="Read-only comparison of deterministic forecast model families and directional consensus.">
    <div style={styles.readOnlyBanner}>
      Forecast comparison evaluates forecast outputs only. It does not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastComparisonQuery.data.status === 'insufficient_history' ? (
      <div style={styles.emptyState}>
        <div style={styles.itemTitle}>Insufficient Forecast Comparison History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastComparisonQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastComparisonQuery.data.available_snapshots)}.</div>
        {forecastComparisonQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Read Only</span><strong>{forecastComparisonQuery.data.read_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Comparison Only</span><strong>{forecastComparisonQuery.data.forecast_comparison_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Average Score</span><strong>{formatNumber(forecastComparisonQuery.data.forecast_comparison_summary?.average_comparison_score)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Overall Band</span><strong>{forecastComparisonQuery.data.forecast_comparison_summary?.overall_comparison_band.replace(/_/g, ' ')}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Watch Metrics</span><strong>{formatNumber(forecastComparisonQuery.data.forecast_comparison_summary?.watch_metric_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>{forecastComparisonQuery.data.execution_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastComparisonQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastComparisonQuery.data.metric_comparisons.map((metricComparison) => (
          <div key={metricComparison.metric_code} style={styles.detailCard}>
            <div style={styles.itemTitle}>{metricComparison.label}</div>
            <div style={styles.itemText}>Best Model: {metricComparison.best_model_label || '-'} · Score {formatNumber(metricComparison.best_model_score)} · Consensus {metricComparison.direction_consensus.replace(/_/g, ' ')} · Accuracy {metricComparison.historical_accuracy_band?.replace(/_/g, ' ') || 'not available'}</div>
            {metricComparison.model_forecasts.slice(0, 4).map((modelForecast) => (
              <div key={`${metricComparison.metric_code}-${modelForecast.model_code}-${modelForecast.window_code}`} style={styles.note}>
                {modelForecast.model_label}: {modelForecast.forecast_direction.replace(/_/g, ' ')} · Value {formatNumber(modelForecast.forecast_value)} · Δ {formatNumber(modelForecast.forecast_delta)} · Score {formatNumber(modelForecast.comparison_score)} · Risk {modelForecast.risk_classification.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        ))}
        {forecastComparisonQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </>
    )}
  </Section>
) : null}
{forecastComparisonQuery.error ? (
  <div className="app-error-state">{readableError(forecastComparisonQuery.error)}</div>
) : null}


{forecastRiskClassificationQuery.data ? (
  <Section title="Forecast Risk Classification" subtitle="Read-only classification of ranked forecast signals into review risk bands.">
    <div style={styles.readOnlyBanner}>
      Forecast risk classification is review intelligence only. It does not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastRiskClassificationQuery.data.status === 'insufficient_history' ? (
      <div style={styles.emptyState}>
        <div style={styles.itemTitle}>Insufficient Forecast Risk History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastRiskClassificationQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastRiskClassificationQuery.data.available_snapshots)}.</div>
        {forecastRiskClassificationQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Read Only</span><strong>{forecastRiskClassificationQuery.data.read_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Risk Only</span><strong>{forecastRiskClassificationQuery.data.risk_classification_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Classified</span><strong>{formatNumber(forecastRiskClassificationQuery.data.risk_summary?.classified_scenario_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Average Risk</span><strong>{formatNumber(forecastRiskClassificationQuery.data.risk_summary?.average_forecast_risk_score)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Critical</span><strong>{formatNumber(forecastRiskClassificationQuery.data.risk_summary?.critical_risk_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>High</span><strong>{formatNumber(forecastRiskClassificationQuery.data.risk_summary?.high_risk_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>{forecastRiskClassificationQuery.data.execution_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastRiskClassificationQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastRiskClassificationQuery.data.classified_scenarios.map((classifiedScenario) => (
          <div key={classifiedScenario.code} style={styles.detailCard}>
            <div style={styles.itemTitle}>#{classifiedScenario.risk_rank} · {classifiedScenario.label}</div>
            <div style={styles.itemText}>Risk score: {formatNumber(classifiedScenario.forecast_risk_score)} · Band: {classifiedScenario.forecast_risk_band.replace(/_/g, ' ')} · Review: {classifiedScenario.review_priority.replace(/_/g, ' ')}</div>
            <div style={styles.itemMeta}>Rank score: {formatNumber(classifiedScenario.ranking_score)} · Ranking band: {classifiedScenario.ranking_band.replace(/_/g, ' ')} · Source risk: {classifiedScenario.source_risk_classification.replace(/_/g, ' ')}</div>
            <div style={styles.itemMeta}>Direction: {classifiedScenario.preview_direction.replace(/_/g, ' ')} · Projected value: {formatNumber(classifiedScenario.projected_value)} · Projected Δ: {formatNumber(classifiedScenario.projected_delta)}</div>
            <div style={styles.itemMeta}>Execution: {classifiedScenario.execution_enabled ? 'enabled' : 'disabled'} · Mutation: {classifiedScenario.mutation_enabled ? 'enabled' : 'disabled'} · Automation: {classifiedScenario.automation_enabled ? 'enabled' : 'disabled'}</div>
          </div>
        ))}
        {forecastRiskClassificationQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </>
    )}
  </Section>
) : null}
{forecastRiskClassificationQuery.error ? (
  <div className="app-error-state">{readableError(forecastRiskClassificationQuery.error)}</div>
) : null}

{forecastRankingQuery.data ? (
  <Section title="Forecast Scenario Ranking" subtitle="Read-only ranking of deterministic forecast scenario intelligence for review priority.">
    <div style={styles.readOnlyBanner}>
      Forecast scenario ranking is informational only. It does not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastRankingQuery.data.status === 'insufficient_history' ? (
      <div style={styles.emptyState}>
        <div style={styles.itemTitle}>Insufficient Forecast Ranking History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastRankingQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastRankingQuery.data.available_snapshots)}.</div>
        {forecastRankingQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Read Only</span><strong>{forecastRankingQuery.data.read_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ranking Only</span><strong>{forecastRankingQuery.data.ranking_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ranked Scenarios</span><strong>{formatNumber(forecastRankingQuery.data.ranking_summary?.ranked_scenario_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Average Rank Score</span><strong>{formatNumber(forecastRankingQuery.data.ranking_summary?.average_ranking_score)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Top Ranked</span><strong>{formatNumber(forecastRankingQuery.data.ranking_summary?.top_ranked_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Watch Scenarios</span><strong>{formatNumber(forecastRankingQuery.data.ranking_summary?.watch_scenario_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>{forecastRankingQuery.data.execution_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastRankingQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastRankingQuery.data.ranked_scenarios.map((rankedScenario) => (
          <div key={rankedScenario.code} style={styles.detailCard}>
            <div style={styles.itemTitle}>#{rankedScenario.rank} · {rankedScenario.label}</div>
            <div style={styles.itemText}>Rank score: {formatNumber(rankedScenario.ranking_score)} · Band: {rankedScenario.ranking_band.replace(/_/g, ' ')} · Actionability: {rankedScenario.actionability_classification.replace(/_/g, ' ')}</div>
            <div style={styles.itemMeta}>Direction: {rankedScenario.preview_direction.replace(/_/g, ' ')} · Projected value: {formatNumber(rankedScenario.projected_value)} · Projected Δ: {formatNumber(rankedScenario.projected_delta)}</div>
            <div style={styles.itemMeta}>Best model: {rankedScenario.best_model_label || '-'} · Comparison score: {formatNumber(rankedScenario.comparison_score)} · Accuracy score: {formatNumber(rankedScenario.historical_accuracy_score)}</div>
            <div style={styles.itemMeta}>Risk: {rankedScenario.risk_classification.replace(/_/g, ' ')} · Priority: {rankedScenario.priority.replace(/_/g, ' ')} · Execution: {rankedScenario.execution_enabled ? 'enabled' : 'disabled'} · Mutation: {rankedScenario.mutation_enabled ? 'enabled' : 'disabled'}</div>
          </div>
        ))}
        {forecastRankingQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </>
    )}
  </Section>
) : null}
{forecastRankingQuery.error ? (
  <div className="app-error-state">{readableError(forecastRankingQuery.error)}</div>
) : null}

{forecastScenarioQuery.data ? (
  <Section title="Forecast Scenario Persistence Foundation" subtitle="Tenant-scoped read-only forecast scenario intelligence prepared for persistence.">
    <div style={styles.note}>
      Forecast scenarios are persisted intelligence only. They do not run forecast models, create execution requests, mutate inventory, or schedule automation.
    </div>
    <div style={styles.actionRow}>
      <button className="app-button app-button--secondary" type="button" onClick={captureForecastScenarioSet} disabled={capturingForecastScenarioSet || forecastScenarioQuery.data.status !== 'forecast_scenarios_ready'}>
        {capturingForecastScenarioSet ? 'Capturing scenario set...' : 'Capture Read-Only Scenario Set'}
      </button>
      <span style={styles.itemMeta}>Manual capture stores forecast intelligence only.</span>
    </div>
    {forecastScenarioCaptureMessage ? <div className="app-success-state">{forecastScenarioCaptureMessage}</div> : null}
    {forecastScenarioCaptureError ? <div className="app-error-state">{forecastScenarioCaptureError}</div> : null}
    {forecastScenarioQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient Forecast Scenario History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastScenarioQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastScenarioQuery.data.available_snapshots)}.</div>
        {forecastScenarioQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Read Only</span><strong>{forecastScenarioQuery.data.read_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Persistence Only</span><strong>{forecastScenarioQuery.data.scenario_persistence_only ? 'Yes' : 'No'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Scenarios</span><strong>{formatNumber(forecastScenarioQuery.data.scenario_summary?.scenario_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready Inputs</span><strong>{formatNumber(forecastScenarioQuery.data.scenario_summary?.model_input_ready_scenario_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Watch Scenarios</span><strong>{formatNumber(forecastScenarioQuery.data.scenario_summary?.watch_scenario_count)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Forecast Model</span><strong>{forecastScenarioQuery.data.forecast_model_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>{forecastScenarioQuery.data.mutation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Automation</span><strong>{forecastScenarioQuery.data.automation_enabled ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
        {forecastScenarioQuery.data.forecast_scenarios.map((scenario) => (
          <div key={scenario.code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{scenario.label}</div>
            <div style={styles.itemText}>Direction: {scenario.preview_direction.replace(/_/g, ' ')} · Projected value: {formatNumber(scenario.projected_value)} · Projected Δ: {formatNumber(scenario.projected_delta)}</div>
            <div style={styles.itemMeta}>Risk: {scenario.risk_classification.replace(/_/g, ' ')} · Priority: {scenario.priority.replace(/_/g, ' ')} · Input ready: {scenario.model_input_ready ? 'yes' : 'no'}</div>
            <div style={styles.itemMeta}>Historical points: {formatNumber(scenario.historical_point_count)} · Historical net Δ: {formatNumber(scenario.historical_net_delta)} · Confidence: {scenario.confidence_level.replace(/_/g, ' ')} ({formatNumber(scenario.confidence_score)})</div>
            <div style={styles.itemMeta}>Forecast model: {scenario.forecast_model_enabled ? 'enabled' : 'disabled'} · Execution: {scenario.execution_enabled ? 'enabled' : 'disabled'} · Mutation: {scenario.mutation_enabled ? 'enabled' : 'disabled'} · Automation: {scenario.automation_enabled ? 'enabled' : 'disabled'}</div>
          </div>
        ))}
        {forecastScenarioHistoryQuery.data?.length ? (
          <div style={styles.itemCard}>
            <div style={styles.itemTitle}>Captured Scenario History</div>
            {forecastScenarioHistoryQuery.data.map((item) => (
              <div key={item.id} style={styles.itemMeta}>{formatDateTime(item.generated_at)} · {formatNumber(item.scenario_summary?.scenario_count)} scenarios · {item.scenario_status.replace(/_/g, ' ')}</div>
            ))}
          </div>
        ) : null}
        {forecastScenarioQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    )}
  </Section>
) : null}

{forecastScenarioQuery.error ? (
  <div className="app-error-state">{readableError(forecastScenarioQuery.error)}</div>
) : null}

{forecastScenarioQuery.data ? (
  <Section title="Forecast Scenario Viewer" subtitle="Consolidated read-only view of scenario, ranking, and risk evidence.">
    <div style={styles.readOnlyBanner}>
      The scenario viewer consolidates forecast intelligence for operator review only. It does not create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastScenarioQuery.data.status === 'insufficient_history' ? (
      <div style={styles.emptyState}>
        <div style={styles.itemTitle}>Insufficient Scenario Viewer History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastScenarioQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastScenarioQuery.data.available_snapshots)}.</div>
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Viewer Rows</span><strong>{formatNumber(forecastScenarioViewerRows.length)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ranked Evidence</span><strong>{formatNumber(forecastScenarioViewerRows.filter((row) => row.ranking).length)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Risk Evidence</span><strong>{formatNumber(forecastScenarioViewerRows.filter((row) => row.risk).length)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>Disabled</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Mutation</span><strong>Disabled</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Automation</span><strong>Disabled</strong></div>
        </div>
        {forecastScenarioViewerRows.map(({ scenario, ranking, risk }) => (
          <div key={scenario.code} style={styles.detailCard}>
            <div style={styles.itemTitle}>{ranking ? `#${ranking.rank} · ` : ''}{scenario.label}</div>
            <div style={styles.itemText}>Direction: {scenario.preview_direction.replace(/_/g, ' ')} · Projected value: {formatNumber(scenario.projected_value)} · Projected Δ: {formatNumber(scenario.projected_delta)}</div>
            <div style={styles.itemMeta}>Scenario priority: {scenario.priority.replace(/_/g, ' ')} · Scenario risk: {scenario.risk_classification.replace(/_/g, ' ')} · Input ready: {scenario.model_input_ready ? 'yes' : 'no'}</div>
            <div style={styles.itemMeta}>Ranking: {ranking ? `${formatNumber(ranking.ranking_score)} · ${ranking.ranking_band.replace(/_/g, ' ')} · ${ranking.actionability_classification.replace(/_/g, ' ')}` : 'not available'}</div>
            <div style={styles.itemMeta}>Risk classification: {risk ? `${formatNumber(risk.forecast_risk_score)} · ${risk.forecast_risk_band.replace(/_/g, ' ')} · ${risk.review_priority.replace(/_/g, ' ')}` : 'not available'}</div>
            <div style={styles.itemMeta}>Best model: {ranking?.best_model_label || '-'} · Consensus: {ranking?.direction_consensus.replace(/_/g, ' ') || '-'} · Historical accuracy: {formatNumber(ranking?.historical_accuracy_score)}</div>
            <div style={styles.itemMeta}>Execution: disabled · Mutation: disabled · Automation: disabled</div>
          </div>
        ))}
        <div style={styles.note}>Scenario viewer output is assembled from existing read-only scenario, ranking, and risk APIs. It is not an execution recommendation.</div>
      </div>
    )}
  </Section>
) : null}

{forecastScenarioQuery.data ? (
  <Section title="Forecast Visualization Dashboard" subtitle="Read-only visual summary of scenario ranking, confidence, risk, and projected directional magnitude.">
    <div style={styles.readOnlyBanner}>
      Forecast visualization is a dashboard-only view over existing forecast intelligence. It does not execute forecasts, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastScenarioQuery.data.status === 'insufficient_history' ? (
      <div style={styles.emptyState}>
        <div style={styles.itemTitle}>Insufficient Forecast Visualization History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastScenarioQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastScenarioQuery.data.available_snapshots)}.</div>
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Visualized Scenarios</span><strong>{formatNumber(forecastVisualizationSummary.scenarioCount)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Avg Confidence</span><strong>{formatNumber(forecastVisualizationSummary.averageConfidence)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Avg Risk</span><strong>{formatNumber(forecastVisualizationSummary.averageRisk)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>High Risk</span><strong>{formatNumber(forecastVisualizationSummary.highRiskCount)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>Disabled</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Automation</span><strong>Disabled</strong></div>
        </div>
        <div style={styles.visualizationGrid}>
          {forecastVisualizationRows.slice(0, 6).map((row) => (
            <div key={`visual-${row.scenario.code}`} style={styles.visualizationCard}>
              <div style={styles.itemTitle}>{row.scenario.label}</div>
              <div style={styles.itemMeta}>Direction {row.scenario.preview_direction.replace(/_/g, ' ')} · Δ {formatNumber(row.scenario.projected_delta)} · Best model {row.ranking?.best_model_label || '-'}</div>
              <div style={styles.barGroup}>
                <div style={styles.barLabel}><span>Ranking</span><strong>{formatNumber(row.rankingScore)}</strong></div>
                <div style={styles.barTrack}><div style={{ ...styles.barFill, width: `${Math.min(100, Math.max(0, row.rankingScore))}%` }} /></div>
              </div>
              <div style={styles.barGroup}>
                <div style={styles.barLabel}><span>Confidence</span><strong>{formatNumber(row.confidenceScore)}</strong></div>
                <div style={styles.barTrack}><div style={{ ...styles.barFill, width: `${Math.min(100, Math.max(0, row.confidenceScore))}%` }} /></div>
              </div>
              <div style={styles.barGroup}>
                <div style={styles.barLabel}><span>Risk</span><strong>{formatNumber(row.riskScore)}</strong></div>
                <div style={styles.barTrack}><div style={{ ...styles.barFill, width: `${Math.min(100, Math.max(0, row.riskScore))}%` }} /></div>
              </div>
              <div style={styles.itemMeta}>Review priority: {row.risk?.review_priority.replace(/_/g, ' ') || 'not available'} · Actionability: {row.ranking?.actionability_classification.replace(/_/g, ' ') || 'not available'}</div>
            </div>
          ))}
        </div>
        <div style={styles.note}>Dashboard bars are deterministic visualizations of existing read-only forecast scenario, ranking, and risk evidence. They are not execution recommendations.</div>
      </div>
    )}
  </Section>
) : null}


{forecastScenarioQuery.data ? (
  <Section title="Forecast Confidence + Risk Rendering" subtitle="Read-only combined rendering of confidence posture, risk posture, and review priority.">
    <div style={styles.readOnlyBanner}>
      Confidence and risk rendering is a human-review visualization only. It does not execute forecasts, create execution requests, mutate inventory, change suppliers or shipments, or schedule automation.
    </div>
    {forecastScenarioQuery.data.status === 'insufficient_history' ? (
      <div style={styles.emptyState}>
        <div style={styles.itemTitle}>Insufficient Confidence + Risk History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastScenarioQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastScenarioQuery.data.available_snapshots)}.</div>
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Rendered Scenarios</span><strong>{formatNumber(forecastConfidenceRiskSummary.scenarioCount)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Review Required</span><strong>{formatNumber(forecastConfidenceRiskSummary.reviewRequiredCount)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Risk Over Confidence</span><strong>{formatNumber(forecastConfidenceRiskSummary.confidenceRiskGapCount)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Highest Risk</span><strong>{formatNumber(forecastConfidenceRiskSummary.highestRiskScore)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Lowest Confidence</span><strong>{formatNumber(forecastConfidenceRiskSummary.lowestConfidenceScore)}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution</span><strong>Disabled</strong></div>
        </div>
        <div style={styles.visualizationGrid}>
          {forecastConfidenceRiskRows.slice(0, 6).map((row) => (
            <div key={`confidence-risk-${row.scenario.code}`} style={styles.visualizationCard}>
              <div style={styles.itemTitle}>{row.needsReview ? 'Review · ' : 'Monitor · '}{row.scenario.label}</div>
              <div style={styles.itemText}>Confidence {row.confidenceBand.replace(/_/g, ' ')} · Risk {row.riskBand.replace(/_/g, ' ')} · Review priority {row.reviewPriority.replace(/_/g, ' ')}</div>
              <div style={styles.barGroup}>
                <div style={styles.barLabel}><span>Confidence</span><strong>{formatNumber(row.confidenceScore)}</strong></div>
                <div style={styles.barTrack}><div style={{ ...styles.barFill, width: `${Math.min(100, Math.max(0, row.confidenceScore))}%` }} /></div>
              </div>
              <div style={styles.barGroup}>
                <div style={styles.barLabel}><span>Risk</span><strong>{formatNumber(row.riskScore)}</strong></div>
                <div style={styles.barTrack}><div style={{ ...styles.barFill, width: `${Math.min(100, Math.max(0, row.riskScore))}%` }} /></div>
              </div>
              <div style={styles.barGroup}>
                <div style={styles.barLabel}><span>Risk / Confidence Gap</span><strong>{formatNumber(row.confidenceRiskGap)}</strong></div>
                <div style={styles.barTrack}><div style={{ ...styles.barFill, width: `${Math.min(100, Math.max(0, row.confidenceRiskGap))}%` }} /></div>
              </div>
              <div style={styles.itemMeta}>Best model: {row.ranking?.best_model_label || '-'} · Consensus: {row.ranking?.direction_consensus.replace(/_/g, ' ') || '-'} · Projected Δ: {formatNumber(row.scenario.projected_delta)}</div>
              <div style={styles.itemMeta}>Execution: disabled · Mutation: disabled · Automation: disabled</div>
            </div>
          ))}
        </div>
        <div style={styles.note}>This rendering combines existing scenario, ranking, and risk evidence only. It is not an execution recommendation and does not create operational side effects.</div>
      </div>
    )}
  </Section>
) : null}

{forecastScenarioHistoryQuery.error ? (
  <div className="app-error-state">{readableError(forecastScenarioHistoryQuery.error)}</div>
) : null}

{forecastPreviewQuery.data ? (
  <Section title="Forecast Preview Foundation" subtitle="Read-only directional preview built from historical snapshot trend evidence.">
    <div style={styles.note}>
      Forecast preview is informational only. It does not run a forecast model, create execution requests, mutate inventory, or schedule automation.
    </div>
    {forecastPreviewQuery.data.status === 'insufficient_history' ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Insufficient Forecast Preview History</div>
        <div style={styles.itemText}>At least {formatNumber(forecastPreviewQuery.data.minimum_required_snapshots)} snapshots are required. Available snapshots: {formatNumber(forecastPreviewQuery.data.available_snapshots)}.</div>
        {forecastPreviewQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    ) : (
      <div style={styles.list}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Read Only</span>
            <strong>{forecastPreviewQuery.data.read_only ? 'Yes' : 'No'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Preview Only</span>
            <strong>{forecastPreviewQuery.data.preview_only ? 'Yes' : 'No'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Executes Actions</span>
            <strong>{forecastPreviewQuery.data.executes_actions ? 'Yes' : 'No'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Horizon</span>
            <strong>{formatNumber(forecastPreviewQuery.data.preview_horizon_snapshots)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Projected Increase</span>
            <strong>{formatNumber(forecastPreviewQuery.data.forecast_preview_summary?.projected_increase_count)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Projected Decrease</span>
            <strong>{formatNumber(forecastPreviewQuery.data.forecast_preview_summary?.projected_decrease_count)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Projected Stable</span>
            <strong>{formatNumber(forecastPreviewQuery.data.forecast_preview_summary?.projected_stable_count)}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Watch Metrics</span>
            <strong>{formatNumber(forecastPreviewQuery.data.forecast_preview_summary?.watch_metric_count)}</strong>
          </div>
        </div>
        {forecastPreviewQuery.data.metric_previews.map((preview) => (
          <div key={preview.code} style={styles.itemCard}>
            <div style={styles.itemTitle}>{preview.label}</div>
            <div style={styles.itemText}>Direction: {preview.preview_direction.replace(/_/g, ' ')} · Preview value: {formatNumber(preview.preview_value)} · Preview delta: {formatNumber(preview.preview_delta)}</div>
            <div style={styles.itemMeta}>Latest value: {formatNumber(preview.source_latest_value)} · Avg Δ/snapshot: {formatNumber(preview.average_delta_per_snapshot)} · Horizon snapshots: {formatNumber(preview.preview_horizon_snapshots)}</div>
            <div style={styles.itemMeta}>Confidence: {preview.confidence_level.replace(/_/g, ' ')} ({formatNumber(preview.confidence_score)}) · Band: {preview.confidence_band} · Risk: {preview.risk_indicator.replace(/_/g, ' ')}</div>
            <div style={styles.itemMeta}>Forecast model: {preview.forecast_model_enabled ? 'enabled' : 'disabled'} · Execution: {preview.execution_enabled ? 'enabled' : 'disabled'} · Mutation: {preview.mutation_enabled ? 'enabled' : 'disabled'} · Automation: {preview.automation_enabled ? 'enabled' : 'disabled'}</div>
          </div>
        ))}
        {forecastPreviewQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </div>
    )}
  </Section>
) : null}

{forecastPreviewQuery.error ? (
  <div className="app-error-state">{readableError(forecastPreviewQuery.error)}</div>
) : null}

<Section
  title="Historical Snapshot Viewer"
  subtitle="Read-only inspection of historical System Context snapshots."
>
  <div style={styles.note}>
    Snapshot capture is manual, read-only, and policy guarded. Forecasting execution,
    inventory mutation, and automation controls are intentionally unavailable.
  </div>

  <div style={styles.grid}>
    <StatCard
      title="Snapshot Viewer Mode"
      value="Read Only"
      subtitle="Historical inspection only"
    />
    <StatCard
      title="Capture Controls"
      value="Manual"
      subtitle="Policy-guarded capture only"
    />
    <StatCard
      title="Execution Controls"
      value="Unavailable"
      subtitle="No operational execution"
    />
  </div>

  <div style={styles.actionRow}>
    <button
      type="button"
      className="btn btn-secondary"
      onClick={captureHistoricalSnapshot}
      disabled={capturingSnapshot}
    >
      {capturingSnapshot ? 'Capturing Snapshot...' : 'Capture Read-Only Snapshot'}
    </button>
    <span style={styles.itemMeta}>Creates historical evidence only. No execution request, automation run, or inventory mutation is performed.</span>
  </div>
  {snapshotCaptureMessage ? <div style={styles.note}>{snapshotCaptureMessage}</div> : null}
  {snapshotCaptureError ? <div className="app-error-state">{snapshotCaptureError}</div> : null}

  <div style={styles.list}>
    {snapshotsQuery.isLoading ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Loading snapshots</div>
        <div style={styles.itemText}>Fetching historical System Context snapshots.</div>
      </div>
    ) : null}

    {snapshotsQuery.error ? (
      <div className="app-error-state">{readableError(snapshotsQuery.error)}</div>
    ) : null}

    {!snapshotsQuery.isLoading && !snapshotsQuery.error && (snapshotsQuery.data?.length ?? 0) === 0 ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>No snapshots yet</div>
        <div style={styles.itemText}>Capture a read-only snapshot to start building historical context.</div>
      </div>
    ) : null}

    {(snapshotsQuery.data ?? []).map((snapshot) => (
      <button
        key={snapshot.id}
        type="button"
        style={selectedSnapshotId === snapshot.id ? styles.selectedSnapshotCard : styles.snapshotCard}
        onClick={() => setSelectedSnapshotId(snapshot.id)}
      >
        <span style={styles.itemTitle}>{formatDateTime(snapshot.generated_at)}</span>
        <span style={styles.itemMeta}>{snapshot.source} · {snapshot.snapshot_status}</span>
        <span style={styles.itemText}>Read-only historical snapshot</span>
      </button>
    ))}

    {selectedSnapshotQuery.isLoading ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Loading snapshot detail</div>
        <div style={styles.itemText}>Fetching selected snapshot.</div>
      </div>
    ) : null}

    {selectedSnapshotQuery.error ? (
      <div className="app-error-state">{readableError(selectedSnapshotQuery.error)}</div>
    ) : null}

    {selectedSnapshotQuery.data ? (
      <div style={styles.itemCard}>
        <div style={styles.itemTitle}>Snapshot Detail</div>
        <KeyValue label="Snapshot ID" value={selectedSnapshotQuery.data.id} />
        <KeyValue label="Generated At" value={formatDateTime(selectedSnapshotQuery.data.generated_at)} />
        <KeyValue label="Source" value={selectedSnapshotQuery.data.source} />
        <KeyValue label="Status" value={selectedSnapshotQuery.data.snapshot_status} />
        <KeyValue label="Read Only" value="Yes" />
        <KeyValue label="Executes Actions" value="No" />

        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Predictive Readiness</span>
            <strong>{selectedSnapshotQuery.data.predictive_readiness_summary ? 'Stored' : 'Missing'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Forecast Scenarios</span>
            <strong>{Array.isArray(selectedSnapshotQuery.data.forecast_scenarios) ? selectedSnapshotQuery.data.forecast_scenarios.length : 0}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Historical Window</span>
            <strong>{selectedSnapshotQuery.data.historical_signal_window ? 'Stored' : 'Missing'}</strong>
          </div>
          <div style={styles.summaryTile}>
            <span style={styles.summaryLabel}>Context Payload</span>
            <strong>{selectedSnapshotQuery.data.context_snapshot ? 'Stored' : 'Unavailable'}</strong>
          </div>
        </div>

        {selectedSnapshotQuery.data.predictive_readiness_summary ? (
          <div style={styles.snapshotSubsection}>
            <div style={styles.itemTitle}>Stored Predictive Readiness</div>
            <pre style={styles.jsonPreview}>{JSON.stringify(selectedSnapshotQuery.data.predictive_readiness_summary, null, 2)}</pre>
          </div>
        ) : null}

        {Array.isArray(selectedSnapshotQuery.data.forecast_scenarios) && selectedSnapshotQuery.data.forecast_scenarios.length ? (
          <div style={styles.snapshotSubsection}>
            <div style={styles.itemTitle}>Stored Forecast Scenarios</div>
            <pre style={styles.jsonPreview}>{JSON.stringify(selectedSnapshotQuery.data.forecast_scenarios, null, 2)}</pre>
          </div>
        ) : null}

        {selectedSnapshotQuery.data.historical_signal_window ? (
          <div style={styles.snapshotSubsection}>
            <div style={styles.itemTitle}>Stored Historical Signal Window</div>
            <pre style={styles.jsonPreview}>{JSON.stringify(selectedSnapshotQuery.data.historical_signal_window, null, 2)}</pre>
          </div>
        ) : null}

        {getSnapshotContextValue(selectedSnapshotQuery.data, 'snapshot_capture_policy') ? (
          <div style={styles.snapshotSubsection}>
            <div style={styles.itemTitle}>Capture Policy</div>
            <pre style={styles.jsonPreview}>{JSON.stringify(getSnapshotContextValue(selectedSnapshotQuery.data, 'snapshot_capture_policy'), null, 2)}</pre>
          </div>
        ) : null}

        {getSnapshotContextValue(selectedSnapshotQuery.data, 'snapshot_fingerprint') ? (
          <KeyValue label="Snapshot Fingerprint" value={String(getSnapshotContextValue(selectedSnapshotQuery.data, 'snapshot_fingerprint'))} />
        ) : null}
      </div>
    ) : null}

    <div style={styles.itemCard}>
      <div style={styles.itemTitle}>Safety Guarantees</div>
      <div style={styles.itemText}>
        Only manual read-only snapshot capture and read-only historical inspection are exposed. Execution controls, mutation actions,
        automation scheduling, and forecasting execution pathways remain unavailable.
      </div>
    </div>
  </div>
</Section>


          {data.historical_signal_window ? (
            <Section title="Historical Signal Window" subtitle="Read-only foundation for future historical forecasting.">
              <div style={styles.grid}>
                <StatCard title="Available Snapshots" value={formatNumber(data.historical_signal_window.available_snapshots)} subtitle={`Minimum required: ${data.historical_signal_window.minimum_required_snapshots}`} />
                <StatCard title="Historical Data Loaded" value={data.historical_signal_window.historical_data_loaded ? 'Yes' : 'No'} subtitle={data.historical_signal_window.status.replace(/_/g, ' ')} />
                <StatCard title="Forecast Ready" value={data.historical_signal_window.ready_for_historical_forecasting ? 'Yes' : 'No'} subtitle={data.historical_signal_window.window_label.replace(/_/g, ' ')} />
              </div>
              <div style={styles.list}>
                <KeyValue label="Baseline Source" value={data.historical_signal_window.baseline_source.replace(/_/g, ' ')} />
                <KeyValue label="Read Only" value={data.historical_signal_window.read_only ? 'Yes' : 'No'} />
                <KeyValue label="Executes Actions" value={data.historical_signal_window.executes_actions ? 'Yes' : 'No'} />
                {data.historical_signal_window.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>
          ) : null}

            <Section title="Phase C — Execution Intelligence Readiness" subtitle="Read-only readiness gate aggregating linkage, outcome scoring, rollback, risk, and closed-loop learning controls.">
              {executionIntelligenceReadinessQuery.data ? (
                <>
                  <div style={styles.readOnlyBanner}>
                    Execution intelligence readiness is evidence only. It does not execute, retry, rollback, mutate tenant operations, start workers, or schedule automation.
                  </div>
                  <div style={styles.summaryGrid}>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{executionIntelligenceReadinessQuery.data.phase}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{executionIntelligenceReadinessQuery.data.phase_c_step}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{executionIntelligenceReadinessQuery.data.status.replace(/_/g, ' ')}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(executionIntelligenceReadinessQuery.data.execution_intelligence_readiness_summary.readiness_score)}%</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready Controls</span><strong>{formatNumber(executionIntelligenceReadinessQuery.data.execution_intelligence_readiness_summary.ready_capability_count)} / {formatNumber(executionIntelligenceReadinessQuery.data.execution_intelligence_readiness_summary.capability_count)}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blocked Controls</span><strong>{formatNumber(executionIntelligenceReadinessQuery.data.execution_intelligence_readiness_summary.blocked_capability_count)}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blockers</span><strong>{formatNumber(executionIntelligenceReadinessQuery.data.execution_intelligence_readiness_summary.blocker_count)}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{executionIntelligenceReadinessQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
                  </div>
                  {executionIntelligenceReadinessQuery.data.execution_intelligence_readiness_blockers.length > 0 ? <div style={styles.warningText}>Readiness blockers: {executionIntelligenceReadinessQuery.data.execution_intelligence_readiness_blockers.join(', ')}</div> : null}
                  {executionIntelligenceReadinessQuery.data.capability_evidence.map((capability) => (
                    <div key={capability.capability_key} style={styles.itemCard}>
                      <div style={styles.itemTitle}>{capability.capability_label} — {capability.capability_ready ? 'ready' : 'blocked'}</div>
                      <div style={styles.itemMeta}>Step: {capability.phase_c_step} · Status: {capability.status.replace(/_/g, ' ')} · Score: {formatNumber(capability.readiness_score)}% · Ready by status: {capability.ready_by_status ? 'yes' : 'no'} · Ready by score: {capability.ready_by_score ? 'yes' : 'no'}</div>
                      {capability.blockers.length > 0 ? <div style={styles.warningText}>Capability blockers: {capability.blockers.join(', ')}</div> : null}
                    </div>
                  ))}
                  {executionIntelligenceReadinessQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
                </>
              ) : (
                <div className="app-empty-state">Execution intelligence readiness is loading.</div>
              )}
              {executionIntelligenceReadinessQuery.error ? (
                <div className="app-error-state">{readableError(executionIntelligenceReadinessQuery.error)}</div>
              ) : null}
            </Section>


            

<Section title="Phase D — AI Operations" subtitle="Advanced AI operations panels are loaded on demand to avoid overloading the production database during normal page load.">
  <div style={styles.stack}>
    <div className="app-empty-state">
      Main System Context loads first. Use this button only when you need the heavy AI Operations monitoring evidence.
    </div>
    <button className="button button--secondary" type="button" onClick={() => setLoadAdvancedAiOperations(true)} disabled={loadAdvancedAiOperations}>
      {loadAdvancedAiOperations ? 'AI Operations loading enabled' : 'Load AI Operations panels'}
    </button>
  </div>
</Section>

<Section title="Phase D — AI Operations Pipeline Monitoring" subtitle="Read-only production monitoring across recommendation outcome, forecast governance, and execution intelligence pipelines.">
{aiOperationsPipelineMonitoringQuery.data ? (
  <div style={styles.stack}>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{aiOperationsPipelineMonitoringQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{aiOperationsPipelineMonitoringQuery.data.phase_d_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{aiOperationsPipelineMonitoringQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Monitoring Score</span><strong>{formatNumber(aiOperationsPipelineMonitoringQuery.data.pipeline_monitoring_summary.monitoring_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready Controls</span><strong>{formatNumber(aiOperationsPipelineMonitoringQuery.data.pipeline_monitoring_summary.ready_control_count)} / {formatNumber(aiOperationsPipelineMonitoringQuery.data.pipeline_monitoring_summary.control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{aiOperationsPipelineMonitoringQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {aiOperationsPipelineMonitoringQuery.data.pipeline_monitoring_blockers.length > 0 ? <div style={styles.warningText}>AI operations blockers: {aiOperationsPipelineMonitoringQuery.data.pipeline_monitoring_blockers.join(', ')}</div> : null}
    {aiOperationsPipelineMonitoringQuery.data.pipeline_controls.map((control) => (
      <div key={control.code} style={styles.cardRow}>
        <strong>{control.label}</strong>
        <span>{control.phase} · {control.actual_status.replace(/_/g, ' ')} · score {formatNumber(control.monitoring_score)}%</span>
        {control.blockers.length > 0 ? <small>Blockers: {control.blockers.join(', ')}</small> : <small>Monitoring ready · Evidence: {control.evidence_reference}</small>}
      </div>
    ))}
    {aiOperationsPipelineMonitoringQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </div>
) : <div>{loadAdvancedAiOperations ? 'Loading AI operations pipeline monitoring...' : 'AI Operations panel not loaded yet. Click Load AI Operations panels above when needed.'}</div>}
{aiOperationsPipelineMonitoringQuery.error ? (
  <div className="app-error-state">{readableError(aiOperationsPipelineMonitoringQuery.error)}</div>
) : null}
</Section>

<Section title="Phase D — AI Operations Health Monitoring" subtitle="Read-only production health evidence for monitored AI/intelligence pipelines.">
{aiOperationsHealthMonitoringQuery.data ? (
  <div style={styles.stack}>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{aiOperationsHealthMonitoringQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{aiOperationsHealthMonitoringQuery.data.phase_d_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{aiOperationsHealthMonitoringQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Health Score</span><strong>{formatNumber(aiOperationsHealthMonitoringQuery.data.health_monitoring_summary.health_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Healthy Controls</span><strong>{formatNumber(aiOperationsHealthMonitoringQuery.data.health_monitoring_summary.healthy_control_count)} / {formatNumber(aiOperationsHealthMonitoringQuery.data.health_monitoring_summary.control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{aiOperationsHealthMonitoringQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {aiOperationsHealthMonitoringQuery.data.health_monitoring_blockers.length > 0 ? <div style={styles.warningText}>AI health blockers: {aiOperationsHealthMonitoringQuery.data.health_monitoring_blockers.join(', ')}</div> : null}
    {aiOperationsHealthMonitoringQuery.data.health_controls.map((control) => (
      <div key={control.code} style={styles.cardRow}>
        <strong>{control.label}</strong>
        <span>{control.phase} · {control.health_status.replace(/_/g, ' ')} · score {formatNumber(control.monitoring_score)}%</span>
        {control.blockers.length > 0 ? <small>Health blockers: {control.blockers.join(', ')}</small> : <small>Healthy · Evidence: {control.evidence_reference || 'not provided'}</small>}
      </div>
    ))}
    {aiOperationsHealthMonitoringQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </div>
) : <div>{loadAdvancedAiOperations ? 'Loading AI operations health monitoring...' : 'AI Operations panel not loaded yet. Click Load AI Operations panels above when needed.'}</div>}
{aiOperationsHealthMonitoringQuery.error ? (
  <div className="app-error-state">{readableError(aiOperationsHealthMonitoringQuery.error)}</div>
) : null}
</Section>



<Section title="Phase D — AI Degradation Monitoring" subtitle="Read-only degradation monitoring across production AI/intelligence controls.">
{aiOperationsDegradationMonitoringQuery.data ? (
  <div style={styles.stack}>
    <div style={styles.readOnlyBanner}>
      AI degradation monitoring is evidence only. It does not generate recommendations, execute requests, mutate tenant data, start workers, schedule automation, or call external AI providers.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{aiOperationsDegradationMonitoringQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{aiOperationsDegradationMonitoringQuery.data.phase_d_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{aiOperationsDegradationMonitoringQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Severity</span><strong>{aiOperationsDegradationMonitoringQuery.data.degradation_severity.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Degradation Score</span><strong>{formatNumber(aiOperationsDegradationMonitoringQuery.data.degradation_monitoring_summary.degradation_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Affected Controls</span><strong>{formatNumber(aiOperationsDegradationMonitoringQuery.data.degradation_monitoring_summary.affected_control_count)} / {formatNumber(aiOperationsDegradationMonitoringQuery.data.degradation_monitoring_summary.control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Critical Controls</span><strong>{formatNumber(aiOperationsDegradationMonitoringQuery.data.degradation_monitoring_summary.critical_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{aiOperationsDegradationMonitoringQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {aiOperationsDegradationMonitoringQuery.data.degradation_monitoring_blockers.length > 0 ? <div style={styles.warningText}>AI degradation blockers: {aiOperationsDegradationMonitoringQuery.data.degradation_monitoring_blockers.join(', ')}</div> : null}
    {aiOperationsDegradationMonitoringQuery.data.degradation_controls.map((control) => (
      <div key={control.code} style={styles.cardRow}>
        <strong>{control.label}</strong>
        <span>{control.phase} · health {control.health_status.replace(/_/g, ' ')} · degradation {control.degradation_severity.replace(/_/g, ' ')} · score {formatNumber(control.monitoring_score)}%</span>
        {control.blockers.length > 0 ? <small>Degradation blockers: {control.blockers.join(', ')}</small> : <small>No degradation detected · Evidence: {control.evidence_reference || 'not provided'}</small>}
      </div>
    ))}
    {aiOperationsDegradationMonitoringQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </div>
) : <div>{loadAdvancedAiOperations ? 'Loading AI degradation monitoring...' : 'AI Operations panel not loaded yet. Click Load AI Operations panels above when needed.'}</div>}
{aiOperationsDegradationMonitoringQuery.error ? (
  <div className="app-error-state">{readableError(aiOperationsDegradationMonitoringQuery.error)}</div>
) : null}
</Section>

<Section title="Phase D — AI Data Quality Monitoring" subtitle="Read-only evidence-quality monitoring for production AI/intelligence controls.">
{aiOperationsDataQualityMonitoringQuery.data ? (
  <div style={styles.stack}>
    <div style={styles.readOnlyBanner}>
      AI data quality monitoring is evidence only. It does not generate recommendations, execute requests, mutate tenant data, start workers, schedule automation, or call external AI providers.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{aiOperationsDataQualityMonitoringQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{aiOperationsDataQualityMonitoringQuery.data.phase_d_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{aiOperationsDataQualityMonitoringQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Data Quality</span><strong>{aiOperationsDataQualityMonitoringQuery.data.data_quality_status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Quality Score</span><strong>{formatNumber(aiOperationsDataQualityMonitoringQuery.data.data_quality_monitoring_summary.data_quality_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Complete Controls</span><strong>{formatNumber(aiOperationsDataQualityMonitoringQuery.data.data_quality_monitoring_summary.complete_control_count)} / {formatNumber(aiOperationsDataQualityMonitoringQuery.data.data_quality_monitoring_summary.control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blocked Controls</span><strong>{formatNumber(aiOperationsDataQualityMonitoringQuery.data.data_quality_monitoring_summary.blocked_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{aiOperationsDataQualityMonitoringQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {aiOperationsDataQualityMonitoringQuery.data.data_quality_monitoring_blockers.length > 0 ? <div style={styles.warningText}>AI data quality blockers: {aiOperationsDataQualityMonitoringQuery.data.data_quality_monitoring_blockers.join(', ')}</div> : null}
    {aiOperationsDataQualityMonitoringQuery.data.data_quality_controls.map((control) => (
      <div key={control.code} style={styles.cardRow}>
        <strong>{control.label}</strong>
        <span>{control.phase} · quality {control.data_quality_status.replace(/_/g, ' ')} · degradation {control.degradation_severity.replace(/_/g, ' ')} · score {formatNumber(control.monitoring_score)}%</span>
        {control.blockers.length > 0 ? <small>Data quality blockers: {control.blockers.join(', ')}</small> : <small>Data quality ready · Evidence: {control.evidence_reference || 'not provided'}</small>}
      </div>
    ))}
    {aiOperationsDataQualityMonitoringQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </div>
) : <div>{loadAdvancedAiOperations ? 'Loading AI data quality monitoring...' : 'AI Operations panel not loaded yet. Click Load AI Operations panels above when needed.'}</div>}
{aiOperationsDataQualityMonitoringQuery.error ? (
  <div className="app-error-state">{readableError(aiOperationsDataQualityMonitoringQuery.error)}</div>
) : null}
</Section>


<Section title="Phase D — AI Stale Intelligence Monitoring" subtitle="Read-only freshness monitoring for production AI/intelligence evidence.">
{aiOperationsStaleIntelligenceMonitoringQuery.data ? (
  <div style={styles.stack}>
    <div style={styles.readOnlyBanner}>
      AI stale intelligence monitoring is evidence only. It does not generate recommendations, execute requests, mutate tenant data, start workers, schedule automation, or call external AI providers.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{aiOperationsStaleIntelligenceMonitoringQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{aiOperationsStaleIntelligenceMonitoringQuery.data.phase_d_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{aiOperationsStaleIntelligenceMonitoringQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Freshness</span><strong>{aiOperationsStaleIntelligenceMonitoringQuery.data.freshness_status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Freshness Score</span><strong>{formatNumber(aiOperationsStaleIntelligenceMonitoringQuery.data.stale_intelligence_monitoring_summary.freshness_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Fresh Controls</span><strong>{formatNumber(aiOperationsStaleIntelligenceMonitoringQuery.data.stale_intelligence_monitoring_summary.fresh_control_count)} / {formatNumber(aiOperationsStaleIntelligenceMonitoringQuery.data.stale_intelligence_monitoring_summary.control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Stale Controls</span><strong>{formatNumber(aiOperationsStaleIntelligenceMonitoringQuery.data.stale_intelligence_monitoring_summary.stale_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{aiOperationsStaleIntelligenceMonitoringQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {aiOperationsStaleIntelligenceMonitoringQuery.data.stale_intelligence_monitoring_blockers.length > 0 ? <div style={styles.warningText}>AI stale intelligence blockers: {aiOperationsStaleIntelligenceMonitoringQuery.data.stale_intelligence_monitoring_blockers.join(', ')}</div> : null}
    {aiOperationsStaleIntelligenceMonitoringQuery.data.stale_intelligence_controls.map((control) => (
      <div key={control.code} style={styles.cardRow}>
        <strong>{control.label}</strong>
        <span>{control.phase} · freshness {control.freshness_status.replace(/_/g, ' ')} · quality {control.data_quality_status.replace(/_/g, ' ')} · score {formatNumber(control.monitoring_score)}%</span>
        {control.blockers.length > 0 ? <small>Freshness blockers: {control.blockers.join(', ')}</small> : <small>Freshness ready · Evidence: {control.evidence_reference || 'not provided'}</small>}
      </div>
    ))}
    {aiOperationsStaleIntelligenceMonitoringQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </div>
) : <div>{loadAdvancedAiOperations ? 'Loading AI stale intelligence monitoring...' : 'AI Operations panel not loaded yet. Click Load AI Operations panels above when needed.'}</div>}
{aiOperationsStaleIntelligenceMonitoringQuery.error ? (
  <div className="app-error-state">{readableError(aiOperationsStaleIntelligenceMonitoringQuery.error)}</div>
) : null}
</Section>


<Section title="Phase D — AI Operational Notification Monitoring" subtitle="Read-only notification evidence monitoring for blocked, watched, or stale AI operations controls.">
{aiOperationsNotificationMonitoringQuery.data ? (
  <div style={styles.stack}>
    <div style={styles.readOnlyBanner}>
      AI operational notification monitoring is evidence only. It does not send notifications, generate recommendations, execute requests, mutate tenant data, start workers, schedule automation, or call external AI providers.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{aiOperationsNotificationMonitoringQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{aiOperationsNotificationMonitoringQuery.data.phase_d_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{aiOperationsNotificationMonitoringQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Coverage Score</span><strong>{formatNumber(aiOperationsNotificationMonitoringQuery.data.operational_notification_monitoring_summary.notification_coverage_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Required Notifications</span><strong>{formatNumber(aiOperationsNotificationMonitoringQuery.data.operational_notification_monitoring_summary.notification_required_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready Required</span><strong>{formatNumber(aiOperationsNotificationMonitoringQuery.data.operational_notification_monitoring_summary.notification_ready_required_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Critical Controls</span><strong>{formatNumber(aiOperationsNotificationMonitoringQuery.data.operational_notification_monitoring_summary.critical_notification_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{aiOperationsNotificationMonitoringQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {aiOperationsNotificationMonitoringQuery.data.operational_notification_monitoring_blockers.length > 0 ? <div style={styles.warningText}>AI operational notification blockers: {aiOperationsNotificationMonitoringQuery.data.operational_notification_monitoring_blockers.join(', ')}</div> : null}
    {aiOperationsNotificationMonitoringQuery.data.operational_notification_controls.map((control) => (
      <div key={control.code} style={styles.cardRow}>
        <strong>{control.label}</strong>
        <span>{control.phase} · notification {control.notification_status.replace(/_/g, ' ')} · severity {control.notification_severity.replace(/_/g, ' ')} · freshness {control.freshness_status.replace(/_/g, ' ')}</span>
        {control.blockers.length > 0 ? <small>Notification blockers: {control.blockers.join(', ')}</small> : <small>Notification evidence ready · Evidence: {control.evidence_reference || 'not required'}</small>}
      </div>
    ))}
    {aiOperationsNotificationMonitoringQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </div>
) : <div>{loadAdvancedAiOperations ? 'Loading AI operational notification monitoring...' : 'AI Operations panel not loaded yet. Click Load AI Operations panels above when needed.'}</div>}
{aiOperationsNotificationMonitoringQuery.error ? (
  <div className="app-error-state">{readableError(aiOperationsNotificationMonitoringQuery.error)}</div>
) : null}
</Section>


<Section title="Phase D — AI Operations SLA Monitoring" subtitle="Read-only SLA posture for AI operations monitoring controls.">
{aiOperationsSlaMonitoringQuery.data ? (
  <div style={styles.stack}>
    <div style={styles.readOnlyBanner}>
      AI operations SLA monitoring is evidence only. It does not send notifications, generate recommendations, execute requests, mutate tenant data, start workers, schedule automation, or call external AI providers.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{aiOperationsSlaMonitoringQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{aiOperationsSlaMonitoringQuery.data.phase_d_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{aiOperationsSlaMonitoringQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>SLA Score</span><strong>{formatNumber(aiOperationsSlaMonitoringQuery.data.ai_operations_sla_monitoring_summary.sla_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready Controls</span><strong>{formatNumber(aiOperationsSlaMonitoringQuery.data.ai_operations_sla_monitoring_summary.sla_ready_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Breached Controls</span><strong>{formatNumber(aiOperationsSlaMonitoringQuery.data.ai_operations_sla_monitoring_summary.sla_breached_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>At Risk Controls</span><strong>{formatNumber(aiOperationsSlaMonitoringQuery.data.ai_operations_sla_monitoring_summary.sla_at_risk_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{aiOperationsSlaMonitoringQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {aiOperationsSlaMonitoringQuery.data.ai_operations_sla_monitoring_blockers.length > 0 ? <div style={styles.warningText}>AI operations SLA blockers: {aiOperationsSlaMonitoringQuery.data.ai_operations_sla_monitoring_blockers.join(', ')}</div> : null}
    {aiOperationsSlaMonitoringQuery.data.ai_operations_sla_controls.map((control) => (
      <div key={control.code} style={styles.cardRow}>
        <strong>{control.label}</strong>
        <span>{control.phase} · SLA {control.sla_status.replace(/_/g, ' ')} · notification {control.notification_status.replace(/_/g, ' ')} · monitoring score {formatNumber(control.monitoring_score)}%</span>
        {control.blockers.length > 0 ? <small>SLA blockers: {control.blockers.join(', ')}</small> : <small>SLA evidence ready · Evidence: {control.evidence_reference || 'provided'}</small>}
      </div>
    ))}
    {aiOperationsSlaMonitoringQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </div>
) : <div>{loadAdvancedAiOperations ? 'Loading AI operations SLA monitoring...' : 'AI Operations panel not loaded yet. Click Load AI Operations panels above when needed.'}</div>}
{aiOperationsSlaMonitoringQuery.error ? (
  <div className="app-error-state">{readableError(aiOperationsSlaMonitoringQuery.error)}</div>
) : null}
</Section>



<Section title="Phase D — AI Audit Evidence Monitoring" subtitle="Read-only audit-grade evidence posture for AI operations controls.">
{aiOperationsAuditEvidenceMonitoringQuery.data ? (
  <div style={styles.stack}>
    <div style={styles.readOnlyBanner}>
      AI audit evidence monitoring is evidence only. It does not generate recommendations, execute requests, mutate tenant data, send notifications, start workers, schedule automation, or call external AI providers.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{aiOperationsAuditEvidenceMonitoringQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{aiOperationsAuditEvidenceMonitoringQuery.data.phase_d_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{aiOperationsAuditEvidenceMonitoringQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Audit Evidence Score</span><strong>{formatNumber(aiOperationsAuditEvidenceMonitoringQuery.data.ai_audit_evidence_monitoring_summary.audit_evidence_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready Controls</span><strong>{formatNumber(aiOperationsAuditEvidenceMonitoringQuery.data.ai_audit_evidence_monitoring_summary.audit_ready_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Missing Evidence</span><strong>{formatNumber(aiOperationsAuditEvidenceMonitoringQuery.data.ai_audit_evidence_monitoring_summary.missing_evidence_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Safety Flag Issues</span><strong>{formatNumber(aiOperationsAuditEvidenceMonitoringQuery.data.ai_audit_evidence_monitoring_summary.safety_flag_blocked_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{aiOperationsAuditEvidenceMonitoringQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {aiOperationsAuditEvidenceMonitoringQuery.data.ai_audit_evidence_monitoring_blockers.length > 0 ? <div style={styles.warningText}>AI audit evidence blockers: {aiOperationsAuditEvidenceMonitoringQuery.data.ai_audit_evidence_monitoring_blockers.join(', ')}</div> : null}
    {aiOperationsAuditEvidenceMonitoringQuery.data.ai_audit_evidence_controls.map((control) => (
      <div key={control.code} style={styles.cardRow}>
        <strong>{control.label}</strong>
        <span>{control.phase} · audit {control.audit_evidence_status.replace(/_/g, ' ')} · SLA {control.sla_status.replace(/_/g, ' ')} · monitoring score {formatNumber(control.monitoring_score)}%</span>
        {control.blockers.length > 0 ? <small>Audit blockers: {control.blockers.join(', ')}</small> : <small>Audit evidence ready · Evidence: {control.evidence_reference || 'provided'}</small>}
      </div>
    ))}
    {aiOperationsAuditEvidenceMonitoringQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </div>
) : <div>{loadAdvancedAiOperations ? 'Loading AI audit evidence monitoring...' : 'AI Operations panel not loaded yet. Click Load AI Operations panels above when needed.'}</div>}
{aiOperationsAuditEvidenceMonitoringQuery.error ? (
  <div className="app-error-state">{readableError(aiOperationsAuditEvidenceMonitoringQuery.error)}</div>
) : null}
</Section>



<Section title="Phase D — AI Operations Readiness Gate" subtitle="Read-only production readiness gate across all AI operations monitoring controls.">
{aiOperationsReadinessGateQuery.data ? (
  <div style={styles.stack}>
    <div style={styles.readOnlyBanner}>
      AI operations readiness gate is evidence only. It does not generate recommendations, execute requests, mutate tenant data, send notifications, start workers, schedule automation, or call external AI providers.
    </div>
    <div style={styles.summaryGrid}>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{aiOperationsReadinessGateQuery.data.phase}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{aiOperationsReadinessGateQuery.data.phase_d_step}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{aiOperationsReadinessGateQuery.data.status.replace(/_/g, ' ')}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Readiness Score</span><strong>{formatNumber(aiOperationsReadinessGateQuery.data.ai_operations_readiness_gate_summary.readiness_score)}%</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Ready Controls</span><strong>{formatNumber(aiOperationsReadinessGateQuery.data.ai_operations_readiness_gate_summary.ready_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Blocked Controls</span><strong>{formatNumber(aiOperationsReadinessGateQuery.data.ai_operations_readiness_gate_summary.blocked_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Missing Required</span><strong>{formatNumber(aiOperationsReadinessGateQuery.data.ai_operations_readiness_gate_summary.missing_required_control_count)}</strong></div>
      <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Capability</span><strong>{aiOperationsReadinessGateQuery.data.next_capability.replace(/_/g, ' ')}</strong></div>
    </div>
    {aiOperationsReadinessGateQuery.data.ai_operations_readiness_gate_blockers.length > 0 ? <div style={styles.warningText}>AI operations readiness blockers: {aiOperationsReadinessGateQuery.data.ai_operations_readiness_gate_blockers.join(', ')}</div> : null}
    {aiOperationsReadinessGateQuery.data.missing_required_controls.length > 0 ? <div style={styles.warningText}>Missing required controls: {aiOperationsReadinessGateQuery.data.missing_required_controls.join(', ')}</div> : null}
    {aiOperationsReadinessGateQuery.data.ai_operations_readiness_controls.map((control) => (
      <div key={control.code} style={styles.cardRow}>
        <strong>{control.label}</strong>
        <span>{control.phase} · readiness {control.readiness_status.replace(/_/g, ' ')} · audit {control.audit_evidence_status.replace(/_/g, ' ')} · SLA {control.sla_status.replace(/_/g, ' ')}</span>
        {control.blockers.length > 0 ? <small>Readiness blockers: {control.blockers.join(', ')}</small> : <small>Readiness gate evidence ready · Evidence: {control.evidence_reference || 'provided'}</small>}
      </div>
    ))}
    {aiOperationsReadinessGateQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
  </div>
) : <div>{loadAdvancedAiOperations ? 'Loading AI operations readiness gate...' : 'AI Operations panel not loaded yet. Click Load AI Operations panels above when needed.'}</div>}
{aiOperationsReadinessGateQuery.error ? (
  <div className="app-error-state">{readableError(aiOperationsReadinessGateQuery.error)}</div>
) : null}
</Section>

<Section title="Phase C — Execution Intelligence Phase Closure" subtitle="Read-only closure evidence for the implemented execution-intelligence loop capability set.">
              {executionIntelligencePhaseClosureQuery.data ? (
                <>
                  <div style={styles.readOnlyBanner}>
                    Phase C closure evidence is capability/readiness evidence only. It does not submit, approve, execute, retry, rollback, mutate tenant operations, start workers, or schedule automation.
                  </div>
                  <div style={styles.summaryGrid}>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Phase</span><strong>{executionIntelligencePhaseClosureQuery.data.phase}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Step</span><strong>{executionIntelligencePhaseClosureQuery.data.phase_c_step}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Status</span><strong>{executionIntelligencePhaseClosureQuery.data.status.replace(/_/g, ' ')}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Capability Status</span><strong>{executionIntelligencePhaseClosureQuery.data.capability_status.replace(/_/g, ' ')}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Runtime Data</span><strong>{executionIntelligencePhaseClosureQuery.data.runtime_data_status.replace(/_/g, ' ')}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Closure Score</span><strong>{formatNumber(executionIntelligencePhaseClosureQuery.data.phase_closure_summary.closure_score)}%</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Closed Controls</span><strong>{formatNumber(executionIntelligencePhaseClosureQuery.data.phase_closure_summary.closed_capability_count)} / {formatNumber(executionIntelligencePhaseClosureQuery.data.phase_closure_summary.capability_count)}</strong></div>
                    <div style={styles.summaryTile}><span style={styles.summaryLabel}>Next Phase</span><strong>{executionIntelligencePhaseClosureQuery.data.next_phase}</strong></div>
                  </div>
                  {executionIntelligencePhaseClosureQuery.data.phase_closure_blockers.length > 0 ? <div style={styles.warningText}>Phase closure blockers: {executionIntelligencePhaseClosureQuery.data.phase_closure_blockers.join(', ')}</div> : null}
                  {executionIntelligencePhaseClosureQuery.data.capability_closure_evidence.map((capability) => (
                    <div key={capability.code} style={styles.itemCard}>
                      <div style={styles.itemTitle}>{capability.label} — {capability.closure_ready ? 'closed' : 'blocked'}</div>
                      <div style={styles.itemMeta}>Step: {capability.phase_c_step} · Status: {capability.closure_status.replace(/_/g, ' ')} · Source: {capability.source_status.replace(/_/g, ' ')} · Evidence: {capability.evidence_reference || 'missing'}</div>
                      {capability.closure_blockers.length > 0 ? <div style={styles.warningText}>Closure blockers: {capability.closure_blockers.join(', ')}</div> : null}
                    </div>
                  ))}
                  {executionIntelligencePhaseClosureQuery.data.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
                </>
              ) : (
                <div className="app-empty-state">Execution intelligence phase closure evidence is loading.</div>
              )}
              {executionIntelligencePhaseClosureQuery.error ? (
                <div className="app-error-state">{readableError(executionIntelligencePhaseClosureQuery.error)}</div>
              ) : null}
            </Section>


          {data.forecast_scenarios && data.forecast_scenarios.length > 0 ? (

            <Section title="Forecast Scenarios" subtitle="Read-only scenario planning derived from predictive readiness metadata.">
              <div style={styles.grid}>
                {data.forecast_scenarios.map((scenario) => (
                  <article key={scenario.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{scenario.title}</div>
                    <div style={styles.itemText}>{scenario.summary}</div>
                    <div style={styles.itemMeta}>
                      Horizon: {scenario.horizon.replace(/_/g, ' ')} · Likelihood: {scenario.likelihood.replace(/_/g, ' ')} · Impact: {scenario.impact.replace(/_/g, ' ')}
                    </div>
                    <div style={styles.itemMeta}>Operator action: {scenario.recommended_operator_action}</div>
                    <div style={styles.itemMeta}>
                      {scenario.read_only ? 'Read-only scenario' : 'Actionable'} · {scenario.executes_actions ? 'Executes actions' : 'No execution'}
                    </div>
                  </article>
                ))}
              </div>
            </Section>
          ) : null}

          {data.recommendation_intelligence_summary ? (
            <Section title="Recommendation Intelligence Summary" subtitle="Read-only score, confidence, stability, and volatility distribution.">
              <div style={styles.grid}>
                <StatCard title="Average Score" value={formatNumber(data.recommendation_intelligence_summary.average_intelligence_score)} subtitle="Mean recommendation intelligence score." />
                <StatCard title="Urgent" value={formatNumber(data.recommendation_intelligence_summary.urgent_recommendations)} subtitle="Recommendations ranked urgent." />
                <StatCard title="Review" value={formatNumber(data.recommendation_intelligence_summary.review_recommendations)} subtitle="Recommendations requiring operator review." />
                <StatCard title="Repeated Signals" value={formatNumber(data.recommendation_intelligence_summary.repeated_signals)} subtitle="Repeated source-section signals." />
                <StatCard title="High Confidence" value={formatNumber(data.recommendation_intelligence_summary.high_confidence_recommendations)} subtitle="High-confidence recommendations." />
                <StatCard title="High Volatility" value={formatNumber(data.recommendation_intelligence_summary.high_volatility_recommendations)} subtitle="High volatility recommendation signals." />
              </div>
            </Section>
          ) : null}

          {data.recommendation_groups && data.recommendation_groups.length > 0 ? (
              <Section title="Recommendation Groups" subtitle="Grouped read-only guidance for operator review.">
                <div style={styles.grid}>
                  {data.recommendation_groups.map((group) => (
                    <article key={group.code} style={styles.itemCard}>
                      <div style={styles.itemTitle}>{group.title}</div>
                      <div style={styles.itemText}>
                        Linked recommendations: {group.recommendation_codes.join(', ')}
                      </div>
                      <div style={styles.itemMeta}>
                        {group.read_only ? 'Read-only guidance' : 'Actionable'} ·{' '}
                        {group.requires_human_review ? 'Human review required' : 'Automated'}
                      </div>
                    </article>
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title="Automation Recommendations" subtitle="Derived next steps for humans before future automation acts on context.">
              <div style={styles.list}>
                <div style={styles.actionRow}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={createSystemContextReviewRequest}
                    disabled={creatingReviewRequest || !canCreateExecutionRequests}
                  >
                    {creatingReviewRequest ? 'Creating Review Request...' : 'Create Review Request'}
                  </button>
                  <span style={styles.itemMeta}>{canCreateExecutionRequests ? 'Creates a system_recommendation review request only. No execution is performed.' : 'Creating review requests requires execution request create permission.'}</span>
                </div>
                {reviewRequestMessage ? <div style={styles.note}>{reviewRequestMessage}</div> : null}
                {reviewRequestError ? <div className="app-error-state">{reviewRequestError}</div> : null}
                {data.recommendations.length ? data.recommendations.map((item) => (
                  <article key={item.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{item.title}</div>
                    <div style={styles.itemText}>{item.action}</div>
                    <div style={styles.itemMeta}>
                      {item.priority.toUpperCase()} · {item.source_section.replace(/_/g, ' ')}
                      {item.intelligence_score !== undefined ? ` · Score: ${item.intelligence_score}` : ''}
                      {item.intelligence_rank_band ? ` · Rank: ${item.intelligence_rank_band.replace(/_/g, ' ')}` : ''}
                      {item.intelligence_confidence ? ` · Confidence: ${item.intelligence_confidence.replace(/_/g, ' ')}` : ''}
                      {item.signal_freshness_score !== undefined ? ` · Freshness: ${item.signal_freshness_score}` : ''}
                      {item.volatility_indicator ? ` · Volatility: ${item.volatility_indicator.replace(/_/g, ' ')}` : ''}
                      {item.trend_direction ? ` · Trend: ${item.trend_direction.replace(/_/g, ' ')}` : ''}
                      {item.recommendation_momentum ? ` · Momentum: ${item.recommendation_momentum.replace(/_/g, ' ')}` : ''}
                      {item.signal_age_bucket ? ` · Age: ${item.signal_age_bucket.replace(/_/g, ' ')}` : ''}
                      {item.repeated_signal ? ' · Repeated signal' : ''}
                      {item.suggested_request_type ? ` · Suggested request: ${item.suggested_request_type.replace(/_/g, ' ')}` : ''}
                      {item.requires_human_review ? ' · Human review required' : ''}
                      {item.executes_actions === false ? ' · Read-only recommendation' : ''}
                    </div>
                    {item.ranking_reason ? <div style={styles.itemMeta}>{item.ranking_reason}</div> : null}
                    {item.stability_signal ? <div style={styles.itemMeta}>Stability: {item.stability_signal.replace(/_/g, ' ')}</div> : null}
                    {item.trend_explanation ? (
                      <div style={styles.itemMeta}>Trend Explanation: {item.trend_explanation}</div>
                    ) : null}
                    {Array.isArray(item.intelligence_rationale) && item.intelligence_rationale.length ? (
                      <div style={styles.itemMeta}>Rationale: {item.intelligence_rationale.join(' · ')}</div>
                    ) : null}
                  </article>
                )) : <div className="app-empty-state">No automation preparation recommendations.</div>}
              </div>
            </Section>

            <Section title="Automation Readiness" subtitle="Deterministic preflight checks for future automation and AI workflows.">
              <div style={styles.list}>
                <KeyValue label="Status" value={data.automation_readiness.status.replace(/_/g, ' ')} />
                <KeyValue label="Score" value={`${formatNumber(data.automation_readiness.score)}%`} />
                <KeyValue label="Passed Checks" value={formatNumber(data.automation_readiness.passed_checks)} />
                <KeyValue label="Warnings" value={formatNumber(data.automation_readiness.warning_checks)} />
                <KeyValue label="Blockers" value={formatNumber(data.automation_readiness.failed_checks)} />
                {data.automation_readiness.checks.map((check) => (
                  <article key={check.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{check.label}</div>
                    <div style={styles.itemText}>{check.message}</div>
                    <div style={styles.itemMeta}>{check.status.toUpperCase()} · {check.code.replace(/_/g, ' ')}</div>
                  </article>
                ))}
              </div>
            </Section>

            <Section title="Context Quality" subtitle="Confidence score for using this snapshot in read-only planning.">
              <div style={styles.list}>
                <KeyValue label="Status" value={data.context_quality.status.replace(/_/g, ' ')} />
                <KeyValue label="Score" value={`${formatNumber(data.context_quality.score)}%`} />
                <div style={styles.note}>{data.context_quality.summary}</div>
                {data.context_quality.factors.map((factor) => (
                  <article key={factor.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{factor.label}</div>
                    <div style={styles.itemText}>{factor.message}</div>
                    <div style={styles.itemMeta}>{factor.status.toUpperCase()} · {factor.code.replace(/_/g, ' ')}</div>
                  </article>
                ))}
                {data.context_quality.source_quality.map((source) => (
                  <article key={source.section} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{source.section.replace(/_/g, ' ')}</div>
                    <div style={styles.itemText}>{source.message}</div>
                    <div style={styles.itemMeta}>STATUS {source.status.toUpperCase()} · SCORE {formatNumber(source.score)}%</div>
                  </article>
                ))}
              </div>
            </Section>

            <Section title="Context Freshness" subtitle="Advisory timestamp posture for source groups used in this snapshot.">
              <div style={styles.list}>
                <KeyValue label="Status" value={data.context_freshness.status.replace(/_/g, ' ')} />
                <KeyValue label="Current Sources" value={formatNumber(data.context_freshness.current_sources)} />
                <KeyValue label="Aging Sources" value={formatNumber(data.context_freshness.aging_sources)} />
                <KeyValue label="Stale Sources" value={formatNumber(data.context_freshness.stale_sources)} />
                <KeyValue label="Unknown Sources" value={formatNumber(data.context_freshness.unknown_sources)} />
                {data.context_freshness.items.map((item) => (
                  <article key={item.section} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{item.section.replace(/_/g, ' ')}</div>
                    <div style={styles.itemText}>{item.message}</div>
                    <div style={styles.itemMeta}>STATUS {item.status.replace(/_/g, ' ').toUpperCase()} · AGE {item.age_hours === null || item.age_hours === undefined ? '-' : `${formatNumber(item.age_hours)}h`} · LAST OBSERVED {formatDateTime(item.last_observed_at)}</div>
                  </article>
                ))}
                {data.context_freshness.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>

            <Section title="Automation Plan" subtitle="Manual-only sequencing for future automation enablement.">
              <div style={styles.list}>
                {data.automation_plan?.length ? data.automation_plan.map((phase) => (
                  <article key={phase.phase} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{phase.title}</div>
                    <div style={styles.itemText}>{phase.description}</div>
                    <div style={styles.itemMeta}>PHASE {phase.phase.replace(/_/g, ' ').toUpperCase()} · STATUS {phase.status.replace(/_/g, ' ').toUpperCase()} · REQUIRED {phase.required_before_automation ? 'YES' : 'NO'}</div>
                    <div style={styles.itemMeta}>Evidence: {phase.evidence.join(', ')}</div>
                  </article>
                )) : <div className="app-empty-state">No automation plan phases available.</div>}
              </div>
            </Section>

            <Section title="Context Source Map" subtitle="Explainable source groups used to build this read-only context snapshot.">
              <div style={styles.list}>
                {data.context_sources.length ? data.context_sources.map((source) => (
                  <article key={source.section} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{source.section.replace(/_/g, ' ')}</div>
                    <div style={styles.itemText}>{source.description}</div>
                    <div style={styles.itemMeta}>STATUS {source.status.toUpperCase()} · Tables {source.source_tables.join(', ') || '-'} · Last observed {formatDateTime(source.last_observed_at)}</div>
                  </article>
                )) : <div className="app-empty-state">No context source metadata available.</div>}
              </div>
            </Section>

            <Section title="Decision Boundaries" subtitle="Explicit allow, restrict, and prohibit rules for future automation use.">
              <div style={styles.list}>
                <KeyValue label="Boundary Status" value={data.decision_boundaries.status.replace(/_/g, ' ')} />
                <KeyValue label="Allowed Use Cases" value={data.decision_boundaries.allowed_use_cases.join(', ') || '-'} />
                <KeyValue label="Restricted Use Cases" value={data.decision_boundaries.restricted_use_cases.join(', ') || '-'} />
                <KeyValue label="Prohibited Use Cases" value={data.decision_boundaries.prohibited_use_cases.join(', ') || '-'} />
                {data.decision_boundaries.boundaries.map((boundary) => (
                  <article key={boundary.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{boundary.title}</div>
                    <div style={styles.itemText}>{boundary.description}</div>
                    <div style={styles.itemMeta}>STATUS {boundary.status.replace(/_/g, ' ').toUpperCase()} · HUMAN REVIEW {boundary.required_human_review ? 'YES' : 'NO'} · SOURCES {boundary.source_sections.join(', ')}</div>
                  </article>
                ))}
                {data.decision_boundaries.escalation_conditions.length ? data.decision_boundaries.escalation_conditions.map((condition) => (
                  <article key={condition.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{condition.code.replace(/_/g, ' ')}</div>
                    <div style={styles.itemText}>{condition.message}</div>
                    <div style={styles.itemMeta}>{condition.severity.toUpperCase()} · Evidence {condition.evidence.join(', ')}</div>
                  </article>
                )) : <div className="app-empty-state">No decision-boundary escalation conditions.</div>}
              </div>
            </Section>

            <Section title="Execution Gates" subtitle="Derived preflight controls for future automation without granting mutation authority.">
              <div style={styles.list}>
                <KeyValue label="Gate Status" value={data.execution_gates.status.replace(/_/g, ' ')} />
                <KeyValue label="Open Gates" value={formatNumber(data.execution_gates.open_gates)} />
                <KeyValue label="Review Gates" value={formatNumber(data.execution_gates.review_gates)} />
                <KeyValue label="Blocked Gates" value={formatNumber(data.execution_gates.blocked_gates)} />
                {data.execution_gates.gates.map((gate) => (
                  <article key={gate.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{gate.label}</div>
                    <div style={styles.itemText}>{gate.description}</div>
                    <div style={styles.itemMeta}>STATUS {gate.status.replace(/_/g, ' ').toUpperCase()} · OWNER {gate.owner.replace(/_/g, ' ').toUpperCase()} · REQUIRED {gate.required_before_execution ? 'YES' : 'NO'}</div>
                    <div style={styles.itemMeta}>Evidence: {gate.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.execution_gates.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>

            <Section title="Context Observability" subtitle="What this read-only snapshot could observe, explain, and support with evidence.">
              <div style={styles.list}>
                <KeyValue label="Status" value={data.context_observability.status.replace(/_/g, ' ')} />
                <KeyValue label="Observed Signals" value={formatNumber(data.context_observability.observed_signals)} />
                <KeyValue label="Evidence Events (7d)" value={formatNumber(data.context_observability.evidence_events_7d)} />
                <KeyValue label="Observable Sources" value={`${formatNumber(data.context_observability.observable_sources)} / ${formatNumber(data.context_observability.requested_sources)}`} />
                <KeyValue label="Latest Observed" value={formatDateTime(data.context_observability.latest_observed_at)} />
                {data.context_observability.items.map((item) => (
                  <article key={item.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{item.label}</div>
                    <div style={styles.itemText}>{item.message}</div>
                    <div style={styles.itemMeta}>STATUS {item.status.replace(/_/g, ' ').toUpperCase()} · Evidence {item.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.context_observability.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Review Checklist" subtitle="Prioritized human-review checklist derived from readiness, recommendations, and freshness signals.">
              <div style={styles.list}>
                <KeyValue label="Checklist Status" value={data.automation_review_checklist.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Items" value={formatNumber(data.automation_review_checklist.total_items)} />
                <KeyValue label="Critical / High" value={`${formatNumber(data.automation_review_checklist.critical_items)} / ${formatNumber(data.automation_review_checklist.high_items)}`} />
                <KeyValue label="Medium / Low" value={`${formatNumber(data.automation_review_checklist.medium_items)} / ${formatNumber(data.automation_review_checklist.low_items)}`} />
                {data.automation_review_checklist.items.length ? data.automation_review_checklist.items.map((item) => (
                  <article key={item.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{item.title}</div>
                    <div style={styles.itemText}>{item.action}</div>
                    <div style={styles.itemMeta}>PRIORITY {item.priority.replace(/_/g, ' ').toUpperCase()} · CATEGORY {item.category.replace(/_/g, ' ').toUpperCase()} · OWNER {item.owner.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>Evidence: {item.evidence.join(', ') || '-'}</div>
                  </article>
                )) : <div className="app-empty-state">No automation review checklist items.</div>}
                {data.automation_review_checklist.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Action Hooks" subtitle="Descriptor-only hooks for future read-only automation and human review routing.">
              <div style={styles.list}>
                <KeyValue label="Hook Status" value={data.automation_action_hooks.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Hooks" value={formatNumber(data.automation_action_hooks.total_hooks)} />
                <KeyValue label="Safe Read-only Hooks" value={formatNumber(data.automation_action_hooks.safe_read_only_hooks)} />
                <KeyValue label="Approval Required" value={formatNumber(data.automation_action_hooks.approval_required_hooks)} />
                <KeyValue label="Blocked Hooks" value={formatNumber(data.automation_action_hooks.blocked_hooks)} />
                {data.automation_action_hooks.hooks.length ? data.automation_action_hooks.hooks.map((hook) => (
                  <article key={hook.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{hook.title}</div>
                    <div style={styles.itemText}>{hook.description}</div>
                    <div style={styles.itemMeta}>TYPE {hook.hook_type.replace(/_/g, ' ').toUpperCase()} · STATUS {hook.status.replace(/_/g, ' ').toUpperCase()} · OWNER {hook.owner.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>SAFE {hook.safe_to_trigger ? 'YES' : 'NO'} · APPROVAL {hook.requires_human_approval ? 'REQUIRED' : 'NOT REQUIRED'} · Evidence {hook.evidence.join(', ') || '-'}</div>
                  </article>
                )) : <div className="app-empty-state">No automation action hooks available.</div>}
                {data.automation_action_hooks.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Hook Policy" subtitle="Read-only policy rules for exposing action-hook descriptors to future automation surfaces.">
              <div style={styles.list}>
                <KeyValue label="Policy Status" value={data.automation_hook_policy.status.replace(/_/g, ' ')} />
                <KeyValue label="Read-only Allowed" value={formatNumber(data.automation_hook_policy.read_only_allowed)} />
                <KeyValue label="Approval Required" value={formatNumber(data.automation_hook_policy.approval_required)} />
                <KeyValue label="Blocked" value={formatNumber(data.automation_hook_policy.blocked)} />
                <KeyValue label="Prohibited Mutations" value={formatNumber(data.automation_hook_policy.prohibited_mutations)} />
                {data.automation_hook_policy.rules.map((rule) => (
                  <article key={rule.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{rule.title}</div>
                    <div style={styles.itemText}>{rule.description}</div>
                    <div style={styles.itemMeta}>STATUS {rule.status.replace(/_/g, ' ').toUpperCase()} · Applies to {rule.applies_to.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_hook_policy.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Execution Log" subtitle="Derived, non-persisted event descriptors for future automation traceability.">
              <div style={styles.list}>
                <KeyValue label="Log Status" value={data.automation_execution_log.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Events" value={formatNumber(data.automation_execution_log.total_events)} />
                <KeyValue label="Hook Events" value={formatNumber(data.automation_execution_log.hook_events)} />
                <KeyValue label="Gate Events" value={formatNumber(data.automation_execution_log.gate_events)} />
                <KeyValue label="Blocked Events" value={formatNumber(data.automation_execution_log.blocked_events)} />
                {data.automation_execution_log.events.map((event) => (
                  <article key={event.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{event.title}</div>
                    <div style={styles.itemText}>{event.message}</div>
                    <div style={styles.itemMeta}>TYPE {event.event_type.replace(/_/g, ' ').toUpperCase()} · STATUS {event.status.replace(/_/g, ' ').toUpperCase()} · ACTOR {event.actor_type.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>Source {event.source.replace(/_/g, ' ')} · Evidence {event.evidence.join(', ') || '-'} · Occurred {formatDateTime(event.occurred_at)}</div>
                  </article>
                ))}
                {data.automation_execution_log.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>

            <Section title="Automation Execution Replay" subtitle="Read-only replay plan for explaining automation traces without executing hooks.">
              <div style={styles.list}>
                <KeyValue label="Replay Status" value={data.automation_execution_replay.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Steps" value={formatNumber(data.automation_execution_replay.total_steps)} />
                <KeyValue label="Replayable Events" value={formatNumber(data.automation_execution_replay.replayable_events)} />
                <KeyValue label="Mutation Replay Allowed" value={data.automation_execution_replay.mutation_replay_allowed ? 'Yes' : 'No'} />
                {data.automation_execution_replay.steps.map((step) => (
                  <article key={step.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{step.sequence}. {step.title}</div>
                    <div style={styles.itemText}>{step.description}</div>
                    <div style={styles.itemMeta}>TYPE {step.replay_type.replace(/_/g, ' ').toUpperCase()} · STATUS {step.status.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>Evidence {step.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_execution_replay.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Replay Verification" subtitle="Derived checks that verify replay output is safe, explainable, and non-mutating.">
              <div style={styles.list}>
                <KeyValue label="Verification Status" value={data.automation_execution_replay_verification.status.replace(/_/g, ' ')} />
                <KeyValue label="Verification Scope" value={data.automation_execution_replay_verification.verification_scope.replace(/_/g, ' ')} />
                <KeyValue label="Passed Checks" value={formatNumber(data.automation_execution_replay_verification.passed_checks)} />
                <KeyValue label="Review Checks" value={formatNumber(data.automation_execution_replay_verification.review_checks)} />
                <KeyValue label="Failed Checks" value={formatNumber(data.automation_execution_replay_verification.failed_checks)} />
                {data.automation_execution_replay_verification.checks.map((check) => (
                  <article key={check.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{check.title}</div>
                    <div style={styles.itemText}>{check.description}</div>
                    <div style={styles.itemMeta}>STATUS {check.status.replace(/_/g, ' ').toUpperCase()} · Evidence {check.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_execution_replay_verification.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Dry Run Summary" subtitle="Descriptor-only dry-run scenarios for future read-only automation previews.">
              <div style={styles.list}>
                <KeyValue label="Dry Run Status" value={data.automation_dry_run_summary.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Scenarios" value={formatNumber(data.automation_dry_run_summary.total_scenarios)} />
                <KeyValue label="Ready Scenarios" value={formatNumber(data.automation_dry_run_summary.ready_scenarios)} />
                <KeyValue label="Approval Required" value={formatNumber(data.automation_dry_run_summary.approval_required_scenarios)} />
                <KeyValue label="Blocked Scenarios" value={formatNumber(data.automation_dry_run_summary.blocked_scenarios)} />
                <KeyValue label="Mutation Scenarios Allowed" value={formatNumber(data.automation_dry_run_summary.mutation_scenarios_allowed)} />
                {data.automation_dry_run_summary.scenarios.map((scenario) => (
                  <article key={scenario.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{scenario.title}</div>
                    <div style={styles.itemText}>{scenario.description}</div>
                    <div style={styles.itemMeta}>TYPE {scenario.dry_run_type.replace(/_/g, ' ').toUpperCase()} · STATUS {scenario.status.replace(/_/g, ' ').toUpperCase()} · MUTATION {scenario.mutation_allowed ? 'ALLOWED' : 'BLOCKED'}</div>
                    <div style={styles.itemMeta}>Approval {scenario.human_approval_required ? 'required' : 'not required'} · Expected output: {scenario.expected_output}</div>
                    <div style={styles.itemMeta}>Inputs {scenario.required_inputs.join(', ') || '-'} · Evidence {scenario.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_dry_run_summary.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Dry Run Evidence" subtitle="Derived evidence map for future dry-run previews and human review.">
              <div style={styles.list}>
                <KeyValue label="Evidence Status" value={data.automation_dry_run_evidence.status.replace(/_/g, ' ')} />
                <KeyValue label="Evidence Scope" value={data.automation_dry_run_evidence.evidence_scope.replace(/_/g, ' ')} />
                <KeyValue label="Complete Items" value={formatNumber(data.automation_dry_run_evidence.complete_items)} />
                <KeyValue label="Review Items" value={formatNumber(data.automation_dry_run_evidence.review_items)} />
                <KeyValue label="Blocked Items" value={formatNumber(data.automation_dry_run_evidence.blocked_items)} />
                {data.automation_dry_run_evidence.items.map((item) => (
                  <article key={item.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{item.title}</div>
                    <div style={styles.itemText}>{item.description}</div>
                    <div style={styles.itemMeta}>TYPE {item.evidence_type.replace(/_/g, ' ').toUpperCase()} · STATUS {item.status.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>Scenarios {item.scenario_codes.join(', ') || '-'} · Evidence {item.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_dry_run_evidence.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Dry Run Policy" subtitle="Read-only policy controls for future dry-run previews.">
              <div style={styles.list}>
                <KeyValue label="Policy Status" value={data.automation_dry_run_policy.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Rules" value={formatNumber(data.automation_dry_run_policy.total_rules)} />
                <KeyValue label="Enforced Rules" value={formatNumber(data.automation_dry_run_policy.enforced_rules)} />
                <KeyValue label="Review Rules" value={formatNumber(data.automation_dry_run_policy.review_rules)} />
                <KeyValue label="Blocked Rules" value={formatNumber(data.automation_dry_run_policy.blocked_rules)} />
                <KeyValue label="Mutation Allowed" value={data.automation_dry_run_policy.mutation_allowed ? 'Yes' : 'No'} />
                {data.automation_dry_run_policy.rules.map((rule) => (
                  <article key={rule.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{rule.title}</div>
                    <div style={styles.itemText}>{rule.description}</div>
                    <div style={styles.itemMeta}>TYPE {rule.rule_type.replace(/_/g, ' ').toUpperCase()} · STATUS {rule.status.replace(/_/g, ' ').toUpperCase()} · ENFORCEMENT {rule.enforcement.replace(/_/g, ' ').toUpperCase()}</div>
                    <div style={styles.itemMeta}>Required {rule.required ? 'yes' : 'no'} · Applies to {rule.applies_to.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_dry_run_policy.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Dry Run Outcomes" subtitle="Final read-only outcome posture for dry-run previews after policy and evidence checks.">
              <div style={styles.list}>
                <KeyValue label="Outcome Status" value={data.automation_dry_run_outcomes.status.replace(/_/g, ' ')} />
                <KeyValue label="Total Outcomes" value={formatNumber(data.automation_dry_run_outcomes.total_outcomes)} />
                <KeyValue label="Ready Outcomes" value={formatNumber(data.automation_dry_run_outcomes.ready_outcomes)} />
                <KeyValue label="Approval Required" value={formatNumber(data.automation_dry_run_outcomes.approval_required_outcomes)} />
                <KeyValue label="Blocked Outcomes" value={formatNumber(data.automation_dry_run_outcomes.blocked_outcomes)} />
                <KeyValue label="Downstream Execution Allowed" value={data.automation_dry_run_outcomes.downstream_execution_allowed ? 'Yes' : 'No'} />
                {data.automation_dry_run_outcomes.outcomes.map((outcome) => (
                  <article key={outcome.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{outcome.title}</div>
                    <div style={styles.itemText}>{outcome.summary}</div>
                    <div style={styles.itemMeta}>SCENARIO {outcome.scenario_code.replace(/_/g, ' ').toUpperCase()} · STATUS {outcome.status.replace(/_/g, ' ').toUpperCase()} · SAFE TO PRESENT {outcome.safe_to_present ? 'YES' : 'NO'}</div>
                    <div style={styles.itemMeta}>Downstream execution {outcome.downstream_execution_allowed ? 'allowed' : 'blocked'} · Blocking reasons {outcome.blocking_reasons.join(', ') || '-'}</div>
                    <div style={styles.itemMeta}>Evidence {outcome.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_dry_run_outcomes.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Automation Dry Run Closure" subtitle="Closure checks that confirm the dry-run surface remains read-only and non-executing.">
              <div style={styles.list}>
                <KeyValue label="Closure Status" value={data.automation_dry_run_closure.status.replace(/_/g, ' ')} />
                <KeyValue label="Closure Scope" value={data.automation_dry_run_closure.closure_scope.replace(/_/g, ' ')} />
                <KeyValue label="Closed Checks" value={formatNumber(data.automation_dry_run_closure.closed_checks)} />
                <KeyValue label="Review Required" value={formatNumber(data.automation_dry_run_closure.review_required_checks)} />
                <KeyValue label="Blocked Checks" value={formatNumber(data.automation_dry_run_closure.blocked_checks)} />
                <KeyValue label="Ready For Execution Engine" value={data.automation_dry_run_closure.ready_for_future_execution_engine ? 'Yes' : 'No'} />
                {data.automation_dry_run_closure.checks.map((check) => (
                  <article key={check.code} style={styles.itemCard}>
                    <div style={styles.itemTitle}>{check.title}</div>
                    <div style={styles.itemText}>{check.description}</div>
                    <div style={styles.itemMeta}>STATUS {check.status.replace(/_/g, ' ').toUpperCase()} · Evidence {check.evidence.join(', ') || '-'}</div>
                  </article>
                ))}
                {data.automation_dry_run_closure.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>


            <Section title="Live Execution Gate" subtitle="Read-only gate for discussing controlled real execution without running actions.">
              <div style={styles.list}>
                {executionGate ? (
                  <>
                    <KeyValue label="Allowed" value={executionGate.allowed ? 'Yes' : 'No'} />
                    <KeyValue label="Risk Level" value={executionGate.risk_level.replace(/_/g, ' ')} />
                    <KeyValue label="Evaluated" value={formatDateTime(executionGate.evaluated_at)} />
                    <KeyValue label="Required Permissions" value={executionGate.required_permissions.join(', ') || '-'} />
                    <div style={styles.note}>{executionGate.reason}</div>
                    <div style={styles.note}>{executionGate.recommendation}</div>
                    <article style={styles.itemCard}>
                      <div style={styles.itemTitle}>Gate Evidence</div>
                      <div style={styles.itemText}>Readiness {executionGate.evidence.readiness_status.replace(/_/g, ' ')} · Execution gates {executionGate.evidence.execution_gate_status.replace(/_/g, ' ')} · Dry run closure {executionGate.evidence.dry_run_closure_status.replace(/_/g, ' ')}</div>
                      <div style={styles.itemMeta}>FAILED READINESS {formatNumber(executionGate.evidence.readiness_failed_checks)} · CRITICAL RISKS {executionGate.evidence.critical_risk_signals.join(', ') || '-'} · HIGH RECOMMENDATIONS {executionGate.evidence.high_priority_recommendations.join(', ') || '-'}</div>
                      <div style={styles.itemMeta}>BLOCKED GATES {formatNumber(executionGate.evidence.blocked_execution_gates)} · DRY RUN BLOCKED {formatNumber(executionGate.evidence.dry_run_blocked_checks)} · MUTATION ALLOWED {executionGate.evidence.mutation_allowed_by_dry_run_policy ? 'YES' : 'NO'}</div>
                    </article>
                    {executionGate.blockers.length ? executionGate.blockers.map((blocker) => (
                      <article key={blocker} style={styles.itemCard}>
                        <div style={styles.itemTitle}>{blocker.replace(/_/g, ' ')}</div>
                        <div style={styles.itemText}>This blocker must be resolved before any controlled-execution design can proceed.</div>
                        <div style={styles.itemMeta}>BLOCKER · LIVE EXECUTION GATE</div>
                      </article>
                    )) : <div className="app-empty-state">No live execution gate blockers.</div>}
                    {executionGate.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
                  </>
                ) : <div className="app-empty-state">Live execution gate not loaded.</div>}
              </div>
            </Section>

            <Section title="Automation Contract" subtitle="Guardrails for future automation and AI use.">
              <div style={styles.list}>
                <KeyValue label="Read Only" value={data.automation_contract.read_only ? 'Yes' : 'No'} />
                <KeyValue label="Tenant Scoped" value={data.automation_contract.tenant_scoped ? 'Yes' : 'No'} />
                <KeyValue label="Mutation Allowed" value={data.automation_contract.mutation_allowed ? 'Yes' : 'No'} />
                {data.automation_contract.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
              </div>
            </Section>
          </div>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: '20px', width: '100%', minWidth: 0 },
  statsGrid: { width: '100%', minWidth: 0 },
  statCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '18px', minWidth: 0 },
  statTitle: { color: '#64748b', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' },
  statValue: { marginTop: '10px', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' },
  statValueWarn: { marginTop: '10px', fontSize: '1.6rem', fontWeight: 800, color: '#b45309', textTransform: 'capitalize' },
  statValueBad: { marginTop: '10px', fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', textTransform: 'capitalize' },
  statSubtitle: { marginTop: '8px', color: '#475569', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '20px', width: '100%', minWidth: 0 },
  panel: { minWidth: 0, overflow: 'hidden' },
  panelTitle: { margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' },
  panelSubtitle: { margin: '8px 0 16px', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' },
  list: { display: 'grid', gap: '12px', minWidth: 0 },
  actionRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', minWidth: 0 },
  keyValueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', minWidth: 0 },
  errorNotice: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem' },
  errorEndpoint: { padding: '0.2rem 0.45rem', borderRadius: '0.45rem', background: '#fff', border: '1px solid #fecaca', color: '#7f1d1d' },
  itemCard: { border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px', display: 'grid', gap: '8px', minWidth: 0 },
  itemTitle: { fontWeight: 800, color: '#0f172a', textTransform: 'capitalize', wordBreak: 'break-word' },
  itemText: { color: '#334155', lineHeight: 1.5, wordBreak: 'break-word' },
  itemMeta: { color: '#64748b', fontSize: '0.88rem', lineHeight: 1.45, wordBreak: 'break-word' },
  visualizationGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '12px', minWidth: 0 },
  visualizationCard: { border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px', display: 'grid', gap: '10px', minWidth: 0, background: '#ffffff' },
  barGroup: { display: 'grid', gap: '6px', minWidth: 0 },
  barLabel: { display: 'flex', justifyContent: 'space-between', gap: '10px', color: '#475569', fontSize: '0.86rem', fontWeight: 700 },
  barTrack: { height: '8px', borderRadius: '999px', background: '#e5e7eb', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '999px', background: '#475569' },
  note: { color: '#334155', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px', lineHeight: 1.45 }
};
