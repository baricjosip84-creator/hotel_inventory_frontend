import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { apiRequest, ApiError } from '../lib/api';
import type { AutomationRunnerAccountabilityDigestResponse, AutomationRunnerActivationChecklistResponse, AutomationRunnerAuditBundleResponse, AutomationRunnerArchiveManifestResponse, AutomationRunnerRetentionReportResponse, AutomationRunnerCertificationEvidenceResponse, AutomationRunnerCertificationReportResponse, AutomationRunnerChangeControlPackResponse, AutomationRunnerClosureSealResponse, AutomationRunnerFinalizationManifestResponse, AutomationRunnerCloseoutReportResponse, AutomationRunnerContainmentReportResponse, AutomationRunnerExecutiveSummaryResponse, AutomationRunnerGovernancePackResponse, AutomationRunnerHandoffBriefResponse, AutomationRunnerIncidentDrillResponse, AutomationRunnerLaunchAttestationResponse, AutomationRunnerDriftReportResponse, AutomationRunnerModuleClosureResponse, AutomationRunnerObservabilitySnapshotResponse, AutomationRunnerProductionSafetyLockResponse, AutomationRunnerOperationsReviewResponse, AutomationRunnerPolicyMatrixResponse, AutomationRunnerPostLaunchMonitorResponse, AutomationRunnerPreflightResponse, AutomationRunnerReadinessCertificationResponse, AutomationRunnerReadinessResponse, AutomationRunnerReleaseGuardResponse, AutomationRunnerRollbackPlanResponse, AutomationRunnerRollbackVerificationResponse, AutomationRunnerSafetyReportResponse, AutomationRunnerStatusResponse, AutomationRunnerStewardshipChecklistResponse, AutomationRunnerStewardshipLedgerResponse, AutomationSchedule, AutomationScheduleAuditPackResponse, AutomationScheduleDryRunResponse, AutomationScheduleListResponse, AutomationScheduleManualRunResponse, AutomationScheduleRunEventsResponse, AutomationScheduleTypesResponse } from '../types/inventory';

type StatusFilter = '' | AutomationSchedule['status'];
type TypeFilter = '' | AutomationSchedule['automation_type'];

type FormState = {
  name: string;
  description: string;
  automation_type: AutomationSchedule['automation_type'];
  schedule_kind: AutomationSchedule['schedule_kind'];
  time: string;
  timezone: string;
  default_status: 'draft' | 'pending_review';
};

const defaultForm: FormState = {
  name: '',
  description: '',
  automation_type: 'cost_risk_review',
  schedule_kind: 'manual',
  time: '09:00',
  timezone: 'Europe/Zagreb',
  default_status: 'draft'
};

const automationTypes: AutomationSchedule['automation_type'][] = [
  'cost_risk_review',
  'cost_governance_review',
  'system_context_review',
  'execution_readiness_review'
];

const statuses: AutomationSchedule['status'][] = ['draft', 'paused', 'disabled'];
const scheduleKinds: AutomationSchedule['schedule_kind'][] = ['manual', 'daily', 'weekly', 'monthly'];

function label(value?: string | null): string {
  return value ? value.replace(/_/g, ' ') : '-';
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre style={styles.json}>{JSON.stringify(value ?? null, null, 2)}</pre>;
}

export default function AutomationSchedulesPage() {
  const [data, setData] = useState<AutomationScheduleListResponse | null>(null);
  const [types, setTypes] = useState<AutomationScheduleTypesResponse | null>(null);
  const [runnerReadiness, setRunnerReadiness] = useState<AutomationRunnerReadinessResponse | null>(null);
  const [runnerExecutiveSummary, setRunnerExecutiveSummary] = useState<AutomationRunnerExecutiveSummaryResponse | null>(null);
  const [runnerStatus, setRunnerStatus] = useState<AutomationRunnerStatusResponse | null>(null);
  const [runnerReleaseGuard, setRunnerReleaseGuard] = useState<AutomationRunnerReleaseGuardResponse | null>(null);
  const [runnerChangeControlPack, setRunnerChangeControlPack] = useState<AutomationRunnerChangeControlPackResponse | null>(null);
  const [runnerRollbackPlan, setRunnerRollbackPlan] = useState<AutomationRunnerRollbackPlanResponse | null>(null);
  const [runnerRollbackVerification, setRunnerRollbackVerification] = useState<AutomationRunnerRollbackVerificationResponse | null>(null);
  const [runnerCertificationReport, setRunnerCertificationReport] = useState<AutomationRunnerCertificationReportResponse | null>(null);
  const [runnerCertificationEvidence, setRunnerCertificationEvidence] = useState<AutomationRunnerCertificationEvidenceResponse | null>(null);
  const [runnerLaunchAttestation, setRunnerLaunchAttestation] = useState<AutomationRunnerLaunchAttestationResponse | null>(null);
  const [runnerPostLaunchMonitor, setRunnerPostLaunchMonitor] = useState<AutomationRunnerPostLaunchMonitorResponse | null>(null);
  const [runnerIncidentDrill, setRunnerIncidentDrill] = useState<AutomationRunnerIncidentDrillResponse | null>(null);
  const [runnerCloseoutReport, setRunnerCloseoutReport] = useState<AutomationRunnerCloseoutReportResponse | null>(null);
  const [runnerArchiveManifest, setRunnerArchiveManifest] = useState<AutomationRunnerArchiveManifestResponse | null>(null);
  const [runnerRetentionReport, setRunnerRetentionReport] = useState<AutomationRunnerRetentionReportResponse | null>(null);
  const [runnerHandoffBrief, setRunnerHandoffBrief] = useState<AutomationRunnerHandoffBriefResponse | null>(null);
  const [runnerStewardshipChecklist, setRunnerStewardshipChecklist] = useState<AutomationRunnerStewardshipChecklistResponse | null>(null);
  const [runnerStewardshipLedger, setRunnerStewardshipLedger] = useState<AutomationRunnerStewardshipLedgerResponse | null>(null);
  const [runnerAuditBundle, setRunnerAuditBundle] = useState<AutomationRunnerAuditBundleResponse | null>(null);
  const [runnerObservabilitySnapshot, setRunnerObservabilitySnapshot] = useState<AutomationRunnerObservabilitySnapshotResponse | null>(null);
  const [runnerProductionSafetyLock, setRunnerProductionSafetyLock] = useState<AutomationRunnerProductionSafetyLockResponse | null>(null);
  const [runnerReadinessCertification, setRunnerReadinessCertification] = useState<AutomationRunnerReadinessCertificationResponse | null>(null);
  const [runnerModuleClosure, setRunnerModuleClosure] = useState<AutomationRunnerModuleClosureResponse | null>(null);
  const [runnerClosureSeal, setRunnerClosureSeal] = useState<AutomationRunnerClosureSealResponse | null>(null);
  const [runnerFinalizationManifest, setRunnerFinalizationManifest] = useState<AutomationRunnerFinalizationManifestResponse | null>(null);
  const [runnerSafetyReport, setRunnerSafetyReport] = useState<AutomationRunnerSafetyReportResponse | null>(null);
  const [runnerGovernancePack, setRunnerGovernancePack] = useState<AutomationRunnerGovernancePackResponse | null>(null);
  const [runnerDriftReport, setRunnerDriftReport] = useState<AutomationRunnerDriftReportResponse | null>(null);
  const [runnerPreflight, setRunnerPreflight] = useState<AutomationRunnerPreflightResponse | null>(null);
  const [runnerAccountabilityDigest, setRunnerAccountabilityDigest] = useState<AutomationRunnerAccountabilityDigestResponse | null>(null);
  const [runnerOperationsReview, setRunnerOperationsReview] = useState<AutomationRunnerOperationsReviewResponse | null>(null);
  const [runnerPolicyMatrix, setRunnerPolicyMatrix] = useState<AutomationRunnerPolicyMatrixResponse | null>(null);
  const [runnerActivationChecklist, setRunnerActivationChecklist] = useState<AutomationRunnerActivationChecklistResponse | null>(null);
  const [runnerContainmentReport, setRunnerContainmentReport] = useState<AutomationRunnerContainmentReportResponse | null>(null);
  const [runEvents, setRunEvents] = useState<AutomationScheduleRunEventsResponse | null>(null);
  const [selected, setSelected] = useState<AutomationSchedule | null>(null);
  const [dryRunResult, setDryRunResult] = useState<AutomationScheduleDryRunResponse | null>(null);
  const [manualRunResult, setManualRunResult] = useState<AutomationScheduleManualRunResponse | null>(null);
  const [auditPack, setAuditPack] = useState<AutomationScheduleAuditPackResponse | null>(null);
  const [status, setStatus] = useState<StatusFilter>('');
  const [automationType, setAutomationType] = useState<TypeFilter>('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (automationType) params.set('automation_type', automationType);
    if (search.trim()) params.set('search', search.trim());
    params.set('limit', '50');
    return params.toString();
  }, [status, automationType, search]);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [response, typeResponse, readinessResponse, executiveSummaryResponse, runnerStatusResponse, releaseGuardResponse, changeControlPackResponse, rollbackPlanResponse, rollbackVerificationResponse, certificationReportResponse, certificationEvidenceResponse, launchAttestationResponse, safetyReportResponse, governancePackResponse, preflightResponse, accountabilityDigestResponse, operationsReviewResponse, policyMatrixResponse, activationChecklistResponse, containmentReportResponse, driftReportResponse, postLaunchMonitorResponse, incidentDrillResponse, closeoutReportResponse, archiveManifestResponse, retentionReportResponse, handoffBriefResponse, stewardshipChecklistResponse, stewardshipLedgerResponse, auditBundleResponse, observabilitySnapshotResponse, productionSafetyLockResponse, readinessCertificationResponse, moduleClosureResponse, closureSealResponse, finalizationManifestResponse, runEventsResponse] = await Promise.all([
        apiRequest<AutomationScheduleListResponse>(`/automation-schedules?${query}`),
        apiRequest<AutomationScheduleTypesResponse>('/automation-schedules/types'),
        apiRequest<AutomationRunnerReadinessResponse>('/automation-schedules/runner-readiness'),
        apiRequest<AutomationRunnerExecutiveSummaryResponse>('/automation-schedules/runner-executive-summary'),
        apiRequest<AutomationRunnerStatusResponse>('/automation-schedules/runner-status'),
        apiRequest<AutomationRunnerReleaseGuardResponse>('/automation-schedules/runner-release-guard'),
        apiRequest<AutomationRunnerChangeControlPackResponse>('/automation-schedules/runner-change-control-pack'),
        apiRequest<AutomationRunnerRollbackPlanResponse>('/automation-schedules/runner-rollback-plan'),
        apiRequest<AutomationRunnerRollbackVerificationResponse>('/automation-schedules/runner-rollback-verification'),
        apiRequest<AutomationRunnerCertificationReportResponse>('/automation-schedules/runner-certification-report'),
        apiRequest<AutomationRunnerCertificationEvidenceResponse>('/automation-schedules/runner-certification-evidence'),
        apiRequest<AutomationRunnerLaunchAttestationResponse>('/automation-schedules/runner-launch-attestation'),
        apiRequest<AutomationRunnerSafetyReportResponse>('/automation-schedules/runner-safety-report'),
        apiRequest<AutomationRunnerGovernancePackResponse>('/automation-schedules/runner-governance-pack'),
        apiRequest<AutomationRunnerPreflightResponse>('/automation-schedules/runner-preflight'),
        apiRequest<AutomationRunnerAccountabilityDigestResponse>('/automation-schedules/runner-accountability-digest'),
        apiRequest<AutomationRunnerOperationsReviewResponse>('/automation-schedules/runner-operations-review'),
        apiRequest<AutomationRunnerPolicyMatrixResponse>('/automation-schedules/runner-policy-matrix'),
        apiRequest<AutomationRunnerActivationChecklistResponse>('/automation-schedules/runner-activation-checklist'),
        apiRequest<AutomationRunnerContainmentReportResponse>('/automation-schedules/runner-containment-report'),
        apiRequest<AutomationRunnerDriftReportResponse>('/automation-schedules/runner-drift-report'),
        apiRequest<AutomationRunnerPostLaunchMonitorResponse>('/automation-schedules/runner-post-launch-monitor'),
        apiRequest<AutomationRunnerIncidentDrillResponse>('/automation-schedules/runner-incident-drill'),
        apiRequest<AutomationRunnerCloseoutReportResponse>('/automation-schedules/runner-closeout-report'),
        apiRequest<AutomationRunnerArchiveManifestResponse>('/automation-schedules/runner-archive-manifest'),
        apiRequest<AutomationRunnerRetentionReportResponse>('/automation-schedules/runner-retention-report'),
        apiRequest<AutomationRunnerHandoffBriefResponse>('/automation-schedules/runner-handoff-brief'),
        apiRequest<AutomationRunnerStewardshipChecklistResponse>('/automation-schedules/runner-stewardship-checklist'),
        apiRequest<AutomationRunnerStewardshipLedgerResponse>('/automation-schedules/runner-stewardship-ledger'),
        apiRequest<AutomationRunnerAuditBundleResponse>('/automation-schedules/runner-audit-bundle'),
        apiRequest<AutomationRunnerObservabilitySnapshotResponse>('/automation-schedules/runner-observability-snapshot'),
        apiRequest<AutomationRunnerProductionSafetyLockResponse>('/automation-schedules/runner-production-safety-lock'),
        apiRequest<AutomationRunnerReadinessCertificationResponse>('/automation-schedules/runner-readiness-certification'),
        apiRequest<AutomationRunnerModuleClosureResponse>('/automation-schedules/runner-module-closure'),
        apiRequest<AutomationRunnerClosureSealResponse>('/automation-schedules/runner-closure-seal'),
        apiRequest<AutomationRunnerFinalizationManifestResponse>('/automation-schedules/runner-finalization-manifest'),
        apiRequest<AutomationScheduleRunEventsResponse>('/automation-schedules/run-events?limit=10')
      ]);
      setData(response);
      setTypes(typeResponse);
      setRunnerReadiness(readinessResponse);
      setRunnerExecutiveSummary(executiveSummaryResponse);
      setRunnerStatus(runnerStatusResponse);
      setRunnerReleaseGuard(releaseGuardResponse);
      setRunnerChangeControlPack(changeControlPackResponse);
      setRunnerRollbackPlan(rollbackPlanResponse);
      setRunnerRollbackVerification(rollbackVerificationResponse);
      setRunnerCertificationReport(certificationReportResponse);
      setRunnerCertificationEvidence(certificationEvidenceResponse);
      setRunnerLaunchAttestation(launchAttestationResponse);
      setRunnerSafetyReport(safetyReportResponse);
      setRunnerGovernancePack(governancePackResponse);
      setRunnerPreflight(preflightResponse);
      setRunnerAccountabilityDigest(accountabilityDigestResponse);
      setRunnerOperationsReview(operationsReviewResponse);
      setRunnerPolicyMatrix(policyMatrixResponse);
      setRunnerActivationChecklist(activationChecklistResponse);
      setRunnerContainmentReport(containmentReportResponse);
      setRunnerDriftReport(driftReportResponse);
      setRunnerPostLaunchMonitor(postLaunchMonitorResponse);
      setRunnerIncidentDrill(incidentDrillResponse);
      setRunnerCloseoutReport(closeoutReportResponse);
      setRunnerArchiveManifest(archiveManifestResponse);
      setRunnerRetentionReport(retentionReportResponse);
      setRunnerHandoffBrief(handoffBriefResponse);
      setRunnerStewardshipChecklist(stewardshipChecklistResponse);
      setRunnerStewardshipLedger(stewardshipLedgerResponse);
      setRunnerAuditBundle(auditBundleResponse);
      setRunnerObservabilitySnapshot(observabilitySnapshotResponse);
      setRunnerProductionSafetyLock(productionSafetyLockResponse);
      setRunnerReadinessCertification(readinessCertificationResponse);
      setRunnerModuleClosure(moduleClosureResponse);
      setRunnerClosureSeal(closureSealResponse);
      setRunnerFinalizationManifest(finalizationManifestResponse);
      setRunEvents(runEventsResponse);
      if (selected) {
        setSelected(response.rows.find((row) => row.id === selected.id) || null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load automation schedules');
    } finally {
      setLoading(false);
    }
  }, [query, selected]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const createSchedule = async () => {
    if (!form.name.trim()) {
      setError('Schedule name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await apiRequest<AutomationSchedule>('/automation-schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          automation_type: form.automation_type,
          schedule_kind: form.schedule_kind,
          schedule_config: {
            frequency: form.schedule_kind,
            time: form.time,
            timezone: form.timezone
          },
          request_defaults: {
            default_status: form.default_status
          }
        })
      });
      setSelected(created);
      setForm(defaultForm);
      await loadSchedules();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const pauseSchedule = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<AutomationSchedule>(`/automation-schedules/${schedule.id}/pause`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSelected(updated);
      await loadSchedules();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to pause automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const disableSchedule = async (schedule: AutomationSchedule) => {
    const reason = window.prompt('Why should this automation schedule be disabled?');
    if (!reason || reason.trim().length < 3) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<AutomationSchedule>(`/automation-schedules/${schedule.id}/disable`, {
        method: 'POST',
        body: JSON.stringify({ disabled_reason: reason.trim() })
      });
      setSelected(updated);
      await loadSchedules();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to disable automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const tryResume = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    try {
      await apiRequest<AutomationSchedule>(`/automation-schedules/${schedule.id}/resume`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      await loadSchedules();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Runner is not enabled yet; resume is intentionally blocked in Step 200');
    } finally {
      setSaving(false);
    }
  };


  const runScheduleManually = async (schedule: AutomationSchedule) => {
    const confirmed = window.confirm('Create an execution request from this schedule? This will not approve or execute the request.');
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<AutomationScheduleManualRunResponse>(`/automation-schedules/${schedule.id}/run`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSelected(response.schedule);
      setManualRunResult(response);
      setDryRunResult(null);
      setAuditPack(null);
      await loadSchedules();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create execution request from automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const dryRunSchedule = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<AutomationScheduleDryRunResponse>(`/automation-schedules/${schedule.id}/dry-run`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSelected(schedule);
      setDryRunResult(response);
      setManualRunResult(null);
      setAuditPack(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to dry-run automation schedule');
    } finally {
      setSaving(false);
    }
  };


  const loadAuditPack = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<AutomationScheduleAuditPackResponse>(`/automation-schedules/${schedule.id}/audit-pack`);
      setSelected(schedule);
      setAuditPack(response);
      setDryRunResult(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load scheduler audit pack');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <section style={styles.headerCard}>
        <div>
          <h2 style={styles.title}>Automation Schedules</h2>
          <p style={styles.subtitle}>
            Configure future scheduled checks. Step 241 adds final read-only readiness certification. Schedules still create reviewable requests only when explicitly allowed and never approve or execute them.
          </p>
        </div>
        <div style={styles.safetyBadge}>No auto execution</div>
      </section>

      {error ? <div style={styles.error}>{error}</div> : null}


      {runnerExecutiveSummary ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner executive summary</h3>
              <p style={styles.muted}>{runnerExecutiveSummary.recommendation}</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerExecutiveSummary.overall_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{label(String(runnerExecutiveSummary.summary.runner_mode))}</strong><span>Runner mode</span></div>
            <div style={styles.metric}><strong>{runnerExecutiveSummary.summary.due_schedule_count}</strong><span>Due schedules</span></div>
            <div style={styles.metric}><strong>{runnerExecutiveSummary.summary.schedule_created_request_count}</strong><span>Schedule requests</span></div>
            <div style={styles.metric}><strong>{runnerExecutiveSummary.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <ul style={styles.list}>
            {runnerExecutiveSummary.decision_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}: {row.detail}</li>
            ))}
          </ul>
        </section>
      ) : null}



      {runnerLaunchAttestation ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner launch attestation</h3>
              <p style={styles.muted}>Read-only launch evidence for controlled automation request creation. It cannot enable flags, start jobs, create requests, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerLaunchAttestation.launch_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerLaunchAttestation.summary.failed_attestation_count}</strong><span>Failed attestations</span></div>
            <div style={styles.metric}><strong>{runnerLaunchAttestation.summary.watch_attestation_count}</strong><span>Watch attestations</span></div>
            <div style={styles.metric}><strong>{label(runnerLaunchAttestation.summary.certification_posture)}</strong><span>Certification</span></div>
            <div style={styles.metric}><strong>{runnerLaunchAttestation.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Attestation rows</h4>
          <ul style={styles.list}>
            {runnerLaunchAttestation.attestation_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}: {row.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Launch evidence refs</h4>
          <JsonBlock value={runnerLaunchAttestation.evidence_refs} />
        </section>
      ) : null}



      {runnerPostLaunchMonitor ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner post-launch monitor</h3>
              <p style={styles.muted}>Read-only 24-hour monitor for automation request creation evidence. It cannot start jobs, create requests, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerPostLaunchMonitor.monitor_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerPostLaunchMonitor.summary.failed_monitor_check_count}</strong><span>Failed checks</span></div>
            <div style={styles.metric}><strong>{runnerPostLaunchMonitor.summary.watch_monitor_check_count}</strong><span>Watch checks</span></div>
            <div style={styles.metric}><strong>{runnerPostLaunchMonitor.summary.failed_recent_run_event_count}</strong><span>Recent failures</span></div>
            <div style={styles.metric}><strong>{runnerPostLaunchMonitor.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Monitor rows</h4>
          <ul style={styles.list}>
            {runnerPostLaunchMonitor.monitor_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}: {row.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Recent evidence</h4>
          <JsonBlock value={{
            recent_run_event_breakdown: runnerPostLaunchMonitor.recent_run_event_breakdown,
            recent_schedule_created_request_breakdown: runnerPostLaunchMonitor.recent_schedule_created_request_breakdown
          }} />
        </section>
      ) : null}



      {runnerIncidentDrill ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner incident drill</h3>
              <p style={styles.muted}>Read-only containment checklist for automation request creation incidents. It cannot change flags, create requests, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerIncidentDrill.drill_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerIncidentDrill.summary.failed_drill_check_count}</strong><span>Failed drill checks</span></div>
            <div style={styles.metric}><strong>{runnerIncidentDrill.summary.watch_drill_check_count}</strong><span>Watch drill checks</span></div>
            <div style={styles.metric}><strong>{runnerIncidentDrill.summary.recent_failed_run_event_count}</strong><span>Recent failures</span></div>
            <div style={styles.metric}><strong>{runnerIncidentDrill.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Drill checks</h4>
          <ul style={styles.list}>
            {runnerIncidentDrill.drill_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}{row.required ? ' · required' : ''}: {row.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Incident actions</h4>
          <ul style={styles.list}>
            {runnerIncidentDrill.incident_actions.map((row) => (
              <li key={row.key}><strong>{row.label}</strong> — {label(row.action_type)}: {row.detail}</li>
            ))}
          </ul>
        </section>
      ) : null}



      {runnerCloseoutReport ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner closeout report</h3>
              <p style={styles.muted}>Read-only phase closeout for controlled automation request creation. It cannot start jobs, create requests, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerCloseoutReport.closeout_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerCloseoutReport.summary.failed_closeout_check_count}</strong><span>Failed closeout checks</span></div>
            <div style={styles.metric}><strong>{runnerCloseoutReport.summary.watch_closeout_check_count}</strong><span>Watch closeout checks</span></div>
            <div style={styles.metric}><strong>{runnerCloseoutReport.summary.incident_failed_check_count}</strong><span>Incident failures</span></div>
            <div style={styles.metric}><strong>{runnerCloseoutReport.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Closeout checks</h4>
          <ul style={styles.list}>
            {runnerCloseoutReport.closeout_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}{row.required ? ' · required' : ''}: {row.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Closeout evidence</h4>
          <JsonBlock value={runnerCloseoutReport.evidence_refs} />
        </section>
      ) : null}


      {runnerArchiveManifest ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner archive manifest</h3>
              <p style={styles.muted}>Read-only operator handoff manifest for the automation request-creation phase. It cannot start jobs, create requests, approve, execute, retry, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerArchiveManifest.archive_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerArchiveManifest.summary.failed_manifest_check_count}</strong><span>Failed manifest checks</span></div>
            <div style={styles.metric}><strong>{runnerArchiveManifest.summary.watch_manifest_check_count}</strong><span>Watch manifest checks</span></div>
            <div style={styles.metric}><strong>{label(runnerArchiveManifest.summary.closeout_posture)}</strong><span>Closeout posture</span></div>
            <div style={styles.metric}><strong>{runnerArchiveManifest.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Manifest checks</h4>
          <ul style={styles.list}>
            {runnerArchiveManifest.manifest_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}{row.required ? ' · required' : ''}: {row.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Archive evidence</h4>
          <JsonBlock value={runnerArchiveManifest.evidence_refs} />
        </section>
      ) : null}


      {runnerRetentionReport ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner retention report</h3>
              <p style={styles.muted}>Read-only retention evidence for archive and run-ledger records. It cannot purge, export, compact, create requests, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerRetentionReport.retention_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerRetentionReport.summary.total_run_events}</strong><span>Total run events</span></div>
            <div style={styles.metric}><strong>{runnerRetentionReport.summary.recent_run_events_7d}</strong><span>Recent run events</span></div>
            <div style={styles.metric}><strong>{runnerRetentionReport.summary.linked_request_events}</strong><span>Linked request events</span></div>
            <div style={styles.metric}><strong>{runnerRetentionReport.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Retention checks</h4>
          <ul style={styles.list}>
            {runnerRetentionReport.retention_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}{row.required ? ' · required' : ''}: {row.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Retention evidence</h4>
          <JsonBlock value={runnerRetentionReport.evidence_refs} />
        </section>
      ) : null}

      {runnerHandoffBrief ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner handoff brief</h3>
              <p style={styles.muted}>Read-only operator handoff for automation runner governance evidence. It cannot start jobs, create requests, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerHandoffBrief.handoff_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerHandoffBrief.summary.failed_handoff_check_count}</strong><span>Failed handoff checks</span></div>
            <div style={styles.metric}><strong>{runnerHandoffBrief.summary.watch_handoff_check_count}</strong><span>Watch handoff checks</span></div>
            <div style={styles.metric}><strong>{runnerHandoffBrief.summary.total_run_events}</strong><span>Total run events</span></div>
            <div style={styles.metric}><strong>{runnerHandoffBrief.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Handoff checks</h4>
          <ul style={styles.list}>
            {runnerHandoffBrief.handoff_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}{row.required ? ' · required' : ''}: {row.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Operator follow-ups</h4>
          <ul style={styles.list}>
            {runnerHandoffBrief.operator_followups.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <JsonBlock value={runnerHandoffBrief.evidence_refs} />
        </section>
      ) : null}



      {runnerStewardshipChecklist ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner stewardship checklist</h3>
              <p style={styles.muted}>Read-only ownership checklist for post-handoff automation governance. It cannot change flags, create requests, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerStewardshipChecklist.stewardship_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerStewardshipChecklist.summary.failed_stewardship_check_count}</strong><span>Failed stewardship checks</span></div>
            <div style={styles.metric}><strong>{runnerStewardshipChecklist.summary.watch_stewardship_check_count}</strong><span>Watch stewardship checks</span></div>
            <div style={styles.metric}><strong>{label(runnerStewardshipChecklist.summary.handoff_posture)}</strong><span>Handoff posture</span></div>
            <div style={styles.metric}><strong>{runnerStewardshipChecklist.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Stewardship checks</h4>
          <ul style={styles.list}>
            {runnerStewardshipChecklist.checklist_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}{row.required ? ' · required' : ''} · owner: {label(row.owner)}: {row.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Stewardship actions</h4>
          <ul style={styles.list}>
            {runnerStewardshipChecklist.stewardship_actions.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <JsonBlock value={runnerStewardshipChecklist.evidence_refs} />
        </section>
      ) : null}



      {runnerStewardshipLedger ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner stewardship ledger</h3>
              <p style={styles.muted}>Read-only owner ledger for schedules, run events, request traceability, and execution-boundary evidence. It cannot change flags, create requests, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerStewardshipLedger.ledger_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerStewardshipLedger.summary.failed_ledger_check_count}</strong><span>Failed ledger checks</span></div>
            <div style={styles.metric}><strong>{runnerStewardshipLedger.summary.watch_ledger_check_count}</strong><span>Watch ledger checks</span></div>
            <div style={styles.metric}><strong>{runnerStewardshipLedger.summary.total_schedules}</strong><span>Total schedules</span></div>
            <div style={styles.metric}><strong>{runnerStewardshipLedger.summary.total_run_events}</strong><span>Total run events</span></div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerStewardshipLedger.summary.linked_request_events}</strong><span>Linked request events</span></div>
            <div style={styles.metric}><strong>{runnerStewardshipLedger.summary.failed_run_events}</strong><span>Failed run events</span></div>
            <div style={styles.metric}><strong>{formatDateTime(runnerStewardshipLedger.summary.latest_run_event_at)}</strong><span>Latest run event</span></div>
            <div style={styles.metric}><strong>{runnerStewardshipLedger.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Stewardship ledger checks</h4>
          <ul style={styles.list}>
            {runnerStewardshipLedger.ledger_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label} · owner: {label(row.owner)}: {row.detail}</li>
            ))}
          </ul>
          <JsonBlock value={runnerStewardshipLedger.evidence_refs} />
        </section>
      ) : null}






      {runnerFinalizationManifest ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.sectionTitle}>Step 245 finalization manifest</h3>
              <p style={styles.muted}>Read-only operator handoff manifest for the closed automation module. It summarizes the closure seal and final boundaries without creating requests, starting jobs, approving, executing, or mutating inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerFinalizationManifest.manifest_posture)}</div>
          </div>
          <div style={styles.metricsGrid}>
            <div style={styles.metric}><strong>{runnerFinalizationManifest.summary.failed_manifest_count}</strong><span>Failed manifest checks</span></div>
            <div style={styles.metric}><strong>{runnerFinalizationManifest.summary.watch_manifest_count}</strong><span>Watch manifest checks</span></div>
            <div style={styles.metric}><strong>{label(runnerFinalizationManifest.module_posture)}</strong><span>Module posture</span></div>
            <div style={styles.metric}><strong>{runnerFinalizationManifest.summary.open_review_queue}</strong><span>Open review queue</span></div>
            <div style={styles.metric}><strong>{runnerFinalizationManifest.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <p style={styles.muted}>Closure seal: <code>{runnerFinalizationManifest.closure_seal}</code></p>
          <h4 style={styles.smallTitle}>Manifest rows</h4>
          <ul style={styles.compactList}>
            {runnerFinalizationManifest.manifest_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}: {row.detail}</li>
            ))}
          </ul>
          {runnerFinalizationManifest.completion_certificate ? (
            <>
              <h4 style={styles.smallTitle}>Completion certificate</h4>
              <div style={styles.metricGrid}>
                <div style={styles.metric}><strong>{runnerFinalizationManifest.completion_certificate.module_closed ? 'Yes' : 'No'}</strong><span>Module closed</span></div>
                <div style={styles.metric}><strong>{runnerFinalizationManifest.completion_certificate.future_work_requires_new_phase ? 'Yes' : 'No'}</strong><span>New phase required</span></div>
                <div style={styles.metric}><strong>{runnerFinalizationManifest.completion_certificate.allowed_current_scope.length}</strong><span>Allowed scopes</span></div>
                <div style={styles.metric}><strong>{runnerFinalizationManifest.completion_certificate.prohibited_without_new_phase.length}</strong><span>Blocked future actions</span></div>
              </div>
            </>
          ) : null}
          <h4 style={styles.smallTitle}>Final boundaries</h4>
          <JsonBlock value={runnerFinalizationManifest.final_boundaries} />
        </section>
      ) : null}

      {runnerClosureSeal ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.sectionTitle}>Step 243 closure seal</h3>
              <p style={styles.muted}>Deterministic read-only seal for the completed automation module. It hashes final boundaries and evidence refs without creating requests, starting jobs, or executing actions.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerClosureSeal.seal_posture)}</div>
          </div>
          <div style={styles.metricsGrid}>
            <div style={styles.metric}><strong>{runnerClosureSeal.summary.failed_seal_count}</strong><span>Failed seal checks</span></div>
            <div style={styles.metric}><strong>{runnerClosureSeal.summary.watch_seal_count}</strong><span>Watch seal checks</span></div>
            <div style={styles.metric}><strong>{label(runnerClosureSeal.module_posture)}</strong><span>Module posture</span></div>
            <div style={styles.metric}><strong>{runnerClosureSeal.summary.schedule_created_request_count}</strong><span>Schedule requests</span></div>
            <div style={styles.metric}><strong>{runnerClosureSeal.summary.open_review_queue}</strong><span>Open review queue</span></div>
            <div style={styles.metric}><strong>{runnerClosureSeal.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <p style={styles.muted}>Seal: <code>{runnerClosureSeal.closure_seal}</code></p>
          <h4 style={styles.smallTitle}>Seal rows</h4>
          <ul style={styles.compactList}>
            {runnerClosureSeal.seal_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}: {row.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Sealed payload</h4>
          <JsonBlock value={runnerClosureSeal.sealed_payload} />
        </section>
      ) : null}

      {runnerModuleClosure ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.sectionTitle}>Step 242 module closure</h3>
              <p style={styles.muted}>Read-only final closure for the automation module. This confirms the module is complete without enabling execution, retries, background jobs, or inventory mutations.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerModuleClosure.module_posture)}</div>
          </div>
          <div style={styles.metricsGrid}>
            <div style={styles.metric}><strong>{runnerModuleClosure.summary.failed_closure_count}</strong><span>Failed closure checks</span></div>
            <div style={styles.metric}><strong>{runnerModuleClosure.summary.watch_closure_count}</strong><span>Watch closure checks</span></div>
            <div style={styles.metric}><strong>{label(runnerModuleClosure.summary.certification_posture)}</strong><span>Certification</span></div>
            <div style={styles.metric}><strong>{runnerModuleClosure.summary.schedule_created_request_count}</strong><span>Schedule requests</span></div>
            <div style={styles.metric}><strong>{runnerModuleClosure.summary.open_review_queue}</strong><span>Open review queue</span></div>
            <div style={styles.metric}><strong>{runnerModuleClosure.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Closure rows</h4>
          <ul style={styles.compactList}>
            {runnerModuleClosure.closure_rows.map((row) => (
              <li key={row.key}><strong>{label(row.status)}</strong> — {row.label}: {row.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Final boundaries</h4>
          <JsonBlock value={runnerModuleClosure.final_boundaries} />
        </section>
      ) : null}

      {runnerReadinessCertification ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.sectionTitle}>Step 241 readiness certification</h3>
              <p style={styles.muted}>Final read-only certification surface for automation readiness, evidence traceability, permission posture, and the no-execution boundary.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerReadinessCertification.certification_posture)}</div>
          </div>
          <div style={styles.metricsGrid}>
            <div style={styles.metric}><strong>{runnerReadinessCertification.summary.failed_check_count}</strong><span>Failed checks</span></div>
            <div style={styles.metric}><strong>{runnerReadinessCertification.summary.watch_check_count}</strong><span>Watch checks</span></div>
            <div style={styles.metric}><strong>{runnerReadinessCertification.summary.total_schedule_count}</strong><span>Schedules</span></div>
            <div style={styles.metric}><strong>{runnerReadinessCertification.summary.total_run_events}</strong><span>Run events</span></div>
            <div style={styles.metric}><strong>{runnerReadinessCertification.summary.schedule_created_request_count}</strong><span>Schedule requests</span></div>
            <div style={styles.metric}><strong>{runnerReadinessCertification.summary.open_review_queue}</strong><span>Open review queue</span></div>
            <div style={styles.metric}><strong>{runnerReadinessCertification.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
            <div style={styles.metric}><strong>{label(runnerReadinessCertification.request_creation_posture)}</strong><span>Request posture</span></div>
          </div>
          <h4 style={styles.smallTitle}>Certification checks</h4>
          <ul style={styles.compactList}>
            {runnerReadinessCertification.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Certification evidence refs</h4>
          <JsonBlock value={runnerReadinessCertification.evidence_refs} />
        </section>
      ) : null}

      {runnerProductionSafetyLock ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.sectionTitle}>Production safety lock</h3>
              <p style={styles.muted}>Global and tenant-level lock posture for schedule-triggered request creation. This panel is read-only and cannot create, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerProductionSafetyLock.posture)}</div>
          </div>
          <div style={styles.metricsGrid}>
            <div style={styles.metric}><strong>{runnerProductionSafetyLock.manual_request_creation_allowed ? 'Yes' : 'No'}</strong><span>Manual request creation</span></div>
            <div style={styles.metric}><strong>{runnerProductionSafetyLock.auto_request_creation_allowed ? 'Yes' : 'No'}</strong><span>Auto request creation</span></div>
            <div style={styles.metric}><strong>{runnerProductionSafetyLock.locks.manual.global_disable ? 'On' : 'Off'}</strong><span>Global disable</span></div>
            <div style={styles.metric}><strong>{runnerProductionSafetyLock.locks.manual.tenant_request_creation_enabled ? 'Enabled' : 'Disabled'}</strong><span>Tenant toggle</span></div>
            <div style={styles.metric}><strong>{runnerProductionSafetyLock.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Lock checks</h4>
          <ul style={styles.compactList}>
            {runnerProductionSafetyLock.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
        </section>
      ) : null}


      {runnerObservabilitySnapshot ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.sectionTitle}>Runner observability snapshot</h3>
              <p style={styles.muted}>{runnerObservabilitySnapshot.headline}</p>
            </div>
            <div style={styles.safetyBadge}>{runnerObservabilitySnapshot.read_only ? 'Read only' : 'Review required'}</div>
          </div>
          <div style={styles.metricsGrid}>
            <div style={styles.metric}><strong>{runnerObservabilitySnapshot.summary.total_run_events}</strong><span>Run events</span></div>
            <div style={styles.metric}><strong>{runnerObservabilitySnapshot.summary.succeeded_run_events}</strong><span>Succeeded</span></div>
            <div style={styles.metric}><strong>{runnerObservabilitySnapshot.summary.failed_run_events}</strong><span>Failed</span></div>
            <div style={styles.metric}><strong>{runnerObservabilitySnapshot.summary.skipped_run_events}</strong><span>Skipped</span></div>
            <div style={styles.metric}><strong>{runnerObservabilitySnapshot.summary.request_linked_run_events}</strong><span>Request links</span></div>
            <div style={styles.metric}><strong>{runnerObservabilitySnapshot.summary.open_request_count}</strong><span>Open review queue</span></div>
            <div style={styles.metric}><strong>{formatDateTime(runnerObservabilitySnapshot.summary.latest_run_event_at)}</strong><span>Latest run</span></div>
            <div style={styles.metric}><strong>{runnerObservabilitySnapshot.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Operator signals</h4>
          <ul style={styles.compactList}>
            {runnerObservabilitySnapshot.operator_signals.map((signal) => (
              <li key={signal.key}><strong>{label(signal.status)}</strong> — {signal.label}: {signal.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Recent schedule run events</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Schedule</th>
                <th style={styles.th}>Run</th>
                <th style={styles.th}>Request</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {runnerObservabilitySnapshot.recent_events.map((event) => (
                <tr key={event.id}>
                  <td style={styles.td}>{event.schedule_name || event.automation_schedule_id}<br /><span style={styles.muted}>{label(event.automation_type)}</span></td>
                  <td style={styles.td}>{label(event.run_status)}<br /><span style={styles.muted}>{label(event.run_mode)}</span></td>
                  <td style={styles.td}>{event.execution_request_id ? label(event.execution_request_status) : 'No request'}<br /><span style={styles.muted}>{event.execution_request_id || '-'}</span></td>
                  <td style={styles.td}>{formatDateTime(event.created_at)}</td>
                </tr>
              ))}
              {!runnerObservabilitySnapshot.recent_events.length ? (
                <tr><td style={styles.td} colSpan={4}>No schedule run events recorded yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}

      {runnerAuditBundle ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Step 238 runner audit bundle</h3>
              <p style={styles.muted}>Read-only trace bundle for schedule run events, linked execution requests, and execution-boundary evidence. It cannot create, approve, execute, retry, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{runnerAuditBundle.read_only ? 'Audit only' : 'Review required'}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerAuditBundle.summary.schedule_count}</strong><span>Schedules</span></div>
            <div style={styles.metric}><strong>{runnerAuditBundle.summary.run_event_count}</strong><span>Run events</span></div>
            <div style={styles.metric}><strong>{runnerAuditBundle.summary.linked_execution_request_count}</strong><span>Linked requests</span></div>
            <div style={styles.metric}><strong>{runnerAuditBundle.summary.execution_metadata_count}</strong><span>Execution metadata</span></div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerAuditBundle.traceability.request_links_visible}</strong><span>Visible request links</span></div>
            <div style={styles.metric}><strong>{runnerAuditBundle.traceability.run_events_without_request}</strong><span>Run events without request</span></div>
            <div style={styles.metric}><strong>{runnerAuditBundle.summary.failed_run_event_count}</strong><span>Failed runs</span></div>
            <div style={styles.metric}><strong>{runnerAuditBundle.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <h4 style={styles.smallTitle}>Audit bundle checks</h4>
          <ul style={styles.list}>
            {runnerAuditBundle.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <JsonBlock value={runnerAuditBundle.evidence_refs} />
        </section>
      ) : null}

      {runnerChangeControlPack ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Step 222 change-control pack</h3>
              <p style={styles.muted}>Read-only rollout evidence for automation request creation. It cannot enable flags, start the runner, create requests, approve requests, execute requests, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerChangeControlPack.change_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerChangeControlPack.summary.failed_required_count}</strong><span>Failed required</span></div>
            <div style={styles.metric}><strong>{runnerChangeControlPack.summary.watch_required_count}</strong><span>Watch required</span></div>
            <div style={styles.metric}><strong>{runnerChangeControlPack.summary.recent_run_event_count}</strong><span>Recent run events</span></div>
            <div style={styles.metric}><strong>{runnerChangeControlPack.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <div style={styles.checkGrid}>
            {runnerChangeControlPack.change_controls.map((row) => (
              <div key={row.key} style={styles.checkItem}>
                <strong>{row.label}</strong>
                <span>{label(row.status)}{row.required ? ' · required' : ''}</span>
                <p>{row.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {runnerReleaseGuard ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Step 221 release guard</h3>
              <p style={styles.muted}>Read-only release guard for automation expansion. It cannot enable flags, start the runner, create requests, approve requests, execute requests, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerReleaseGuard.release_posture)}</div>
          </div>
          <div style={styles.metricsGrid}>
            <div style={styles.metric}><strong>{runnerReleaseGuard.summary.failed_required_count}</strong><span>Failed required</span></div>
            <div style={styles.metric}><strong>{runnerReleaseGuard.summary.watch_required_count}</strong><span>Watch required</span></div>
            <div style={styles.metric}><strong>{runnerReleaseGuard.summary.due_schedule_count}</strong><span>Due schedules</span></div>
            <div style={styles.metric}><strong>{runnerReleaseGuard.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
          </div>
          <div style={styles.checkGrid}>
            {runnerReleaseGuard.guard_rows.map((row) => (
              <div key={row.key} style={styles.checkItem}>
                <strong>{row.label}</strong>
                <span>{label(row.status)}{row.required ? ' · required' : ''}</span>
                <p>{row.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {runnerReadiness ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner readiness</h3>
              <p style={styles.muted}>Step 219 shows controlled runner readiness plus containment report, drift report, activation checklist, policy matrix, operations review, preflight, accountability, duplicate-guard, and run-ledger evidence. Dry run previews, Run Schedule creates at most one request for a run key, and flagged background mode can create due requests without approval/execution.</p>
            </div>
            <div style={styles.safetyBadge}>{runnerReadiness.can_create_execution_requests ? 'Request creation enabled' : 'Readiness only'}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerReadiness.totals.total_schedules}</strong><span>Total schedules</span></div>
            <div style={styles.metric}><strong>{runnerReadiness.totals.eligible_for_future_runner_review}</strong><span>Future review candidates</span></div>
            <div style={styles.metric}><strong>{runnerReadiness.totals.runnable_now}</strong><span>Due auto-request candidates</span></div>
            <div style={styles.metric}><strong>{runnerReadiness.runner_enabled ? 'Enabled' : 'Disabled'}</strong><span>Runner</span></div>
          </div>
          <div style={styles.detailGrid}>
            <div>
              <h4 style={styles.smallTitle}>Readiness checks</h4>
              <ul style={styles.list}>
                {runnerReadiness.readiness_checks.map((check) => (
                  <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={styles.smallTitle}>Current blockers</h4>
              <ul style={styles.list}>
                {runnerReadiness.blockers.map((blocker) => (
                  <li key={blocker.key}><strong>{blocker.label}</strong>: {blocker.detail}</li>
                ))}
              </ul>
            </div>
          </div>
          {runnerReadiness.schedule_preview.length ? (
            <>
              <h4 style={styles.smallTitle}>Future runner preview</h4>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Schedule</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Runner state</th>
                      <th style={styles.th}>Next run metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runnerReadiness.schedule_preview.map((schedule) => (
                      <tr key={schedule.id}>
                        <td style={styles.td}>{schedule.name}</td>
                        <td style={styles.td}>{label(schedule.automation_type)}</td>
                        <td style={styles.td}>{label(schedule.status)}</td>
                        <td style={styles.td}>{label(schedule.runner_state)}</td>
                        <td style={styles.td}>{formatDateTime(schedule.next_run_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}



      {runnerDriftReport ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner drift report</h3>
              <p style={styles.muted}>Read-only drift visibility for overdue schedules, failed run events, stale schedule-created review queues, and execution-boundary drift. It cannot create, approve, retry, or execute requests.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerDriftReport.drift_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerDriftReport.summary.due_schedule_count}</strong><span>Due schedules</span></div>
            <div style={styles.metric}><strong>{runnerDriftReport.summary.overdue_7d_schedule_count}</strong><span>Overdue 7d</span></div>
            <div style={styles.metric}><strong>{runnerDriftReport.summary.failed_run_event_count}</strong><span>Failed run events</span></div>
            <div style={styles.metric}><strong>{runnerDriftReport.summary.stale_review_request_count}</strong><span>Stale reviews</span></div>
          </div>
          <h4 style={styles.smallTitle}>Drift signals</h4>
          <ul style={styles.list}>
            {runnerDriftReport.drift_signals.map((signal) => (
              <li key={signal.key}><strong>{label(signal.status)}</strong> — {signal.label}: {signal.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Drift report checks</h4>
          <ul style={styles.list}>
            {runnerDriftReport.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
        </section>
      ) : null}




      {runnerContainmentReport ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner containment report</h3>
              <p style={styles.muted}>Read-only scope control for schedule-created requests. It flags unsupported request types, status drift, executable request types, and execution metadata without creating or executing anything.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerContainmentReport.containment_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerContainmentReport.summary.schedule_created_request_count}</strong><span>Schedule-created requests</span></div>
            <div style={styles.metric}><strong>{runnerContainmentReport.summary.unsupported_request_type_count}</strong><span>Unsupported types</span></div>
            <div style={styles.metric}><strong>{runnerContainmentReport.summary.executable_request_type_count}</strong><span>Executable types</span></div>
            <div style={styles.metric}><strong>{runnerContainmentReport.summary.execution_boundary_count}</strong><span>Execution metadata</span></div>
          </div>
          <h4 style={styles.smallTitle}>Containment checks</h4>
          <ul style={styles.list}>
            {runnerContainmentReport.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          {runnerContainmentReport.request_rows.length ? (
            <>
              <h4 style={styles.smallTitle}>Schedule-created request containment rows</h4>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Execution</th>
                      <th style={styles.th}>Count</th>
                      <th style={styles.th}>Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runnerContainmentReport.request_rows.map((row) => (
                      <tr key={`${row.request_type}-${row.request_status}-${row.execution_status}`}>
                        <td style={styles.td}>{label(row.request_type)} {row.allowed_request_type ? '' : '(review)'}</td>
                        <td style={styles.td}>{label(row.request_status)} {row.allowed_request_status ? '' : '(drift)'}</td>
                        <td style={styles.td}>{label(row.execution_status)}</td>
                        <td style={styles.td}>{row.request_count}</td>
                        <td style={styles.td}>{formatDateTime(row.latest_request_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {runnerActivationChecklist ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner activation checklist</h3>
              <p style={styles.muted}>Read-only checklist for controlled auto-request creation readiness. It cannot enable flags, start a runner, create requests, approve requests, or execute requests.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerActivationChecklist.activation_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerActivationChecklist.summary.failed_required_count}</strong><span>Failed required</span></div>
            <div style={styles.metric}><strong>{runnerActivationChecklist.summary.watch_required_count}</strong><span>Watch required</span></div>
            <div style={styles.metric}><strong>{runnerActivationChecklist.summary.due_schedule_count}</strong><span>Due schedules</span></div>
            <div style={styles.metric}><strong>{runnerActivationChecklist.summary.executed_schedule_request_count}</strong><span>Executed schedule requests</span></div>
          </div>
          <h4 style={styles.smallTitle}>Activation checks</h4>
          <ul style={styles.list}>
            {runnerActivationChecklist.checklist.map((item) => (
              <li key={item.key}><strong>{label(item.status)}</strong> — {item.label}: {item.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Activation evidence</h4>
          <JsonBlock value={runnerActivationChecklist.evidence} />
        </section>
      ) : null}

      {runnerPreflight ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner request-creation preflight</h3>
              <p style={styles.muted}>Read-only review of due schedules before controlled auto-request creation. It does not start the runner or create requests.</p>
            </div>
            <div style={styles.safetyBadge}>{runnerPreflight.request_creation_enabled ? 'Auto-request flag on' : 'Preflight only'}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerPreflight.summary.due_schedule_count}</strong><span>Due schedules</span></div>
            <div style={styles.metric}><strong>{runnerPreflight.summary.would_create_request_count_if_enabled}</strong><span>Would create if enabled</span></div>
            <div style={styles.metric}><strong>{runnerPreflight.summary.schedules_with_existing_open_requests}</strong><span>Existing open requests</span></div>
            <div style={styles.metric}><strong>{runnerPreflight.summary.schedules_without_run_ledger}</strong><span>No run ledger yet</span></div>
          </div>
          <h4 style={styles.smallTitle}>Preflight checks</h4>
          <ul style={styles.list}>
            {runnerPreflight.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          {runnerPreflight.due_schedules.length ? (
            <>
              <h4 style={styles.smallTitle}>Due schedule candidates</h4>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Schedule</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Due at</th>
                      <th style={styles.th}>Default request status</th>
                      <th style={styles.th}>Open requests</th>
                      <th style={styles.th}>Run events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runnerPreflight.due_schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td style={styles.td}>{schedule.name}</td>
                        <td style={styles.td}>{label(schedule.automation_type)}</td>
                        <td style={styles.td}>{formatDateTime(schedule.next_run_at)}</td>
                        <td style={styles.td}>{label(schedule.default_request_status)}</td>
                        <td style={styles.td}>{schedule.open_schedule_request_count}</td>
                        <td style={styles.td}>{schedule.run_event_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {runnerStatus ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Background runner permission profile</h3>
              <p style={styles.muted}>Runner status only. Auto-request creation is explicit-flag controlled, race-guarded, and capped; approval, execution, and inventory mutation remain blocked.</p>
            </div>
            <div style={styles.safetyBadge}>{runnerStatus.request_creation_enabled ? 'Creates requests only' : (runnerStatus.enabled ? 'Observe only' : 'Disabled')}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerStatus.enabled ? 'Enabled flag' : 'Disabled'}</strong><span>Runner flag</span></div>
            <div style={styles.metric}><strong>{runnerStatus.started ? 'Started' : 'Not started'}</strong><span>Process state</span></div>
            <div style={styles.metric}><strong>{runnerStatus.request_creation_enabled ? 'Yes' : 'No'}</strong><span>Auto request creation</span></div>
            <div style={styles.metric}><strong>{runnerStatus.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
            <div style={styles.metric}><strong>{runnerStatus.permission_profile?.uses_broad_role ? 'Broad role' : 'Explicit only'}</strong><span>Runner permissions</span></div>
            <div style={styles.metric}><strong>{runnerStatus.request_creation_hard_cap ?? '—'}</strong><span>Request hard cap</span></div>
            <div style={styles.metric}><strong>{runnerStatus.race_protection?.enabled ? 'Enabled' : '—'}</strong><span>Race guard</span></div>
          </div>
          <h4 style={styles.smallTitle}>Runner safety checks</h4>
          <ul style={styles.list}>
            {runnerStatus.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Runner status</h4>
          <JsonBlock value={runnerStatus} />
        </section>
      ) : null}



      {runnerRollbackPlan ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner rollback plan</h3>
              <p style={styles.muted}>Read-only rollback guidance for controlled auto-request creation. It cannot change flags, create requests, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerRollbackPlan.rollback_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerRollbackPlan.summary.recent_auto_run_event_count}</strong><span>Auto events / 24h</span></div>
            <div style={styles.metric}><strong>{runnerRollbackPlan.summary.recent_failed_auto_run_event_count}</strong><span>Failed auto events</span></div>
            <div style={styles.metric}><strong>{runnerRollbackPlan.summary.recent_linked_request_count}</strong><span>Linked requests</span></div>
            <div style={styles.metric}><strong>{runnerRollbackPlan.summary.required_rollback_step_count}</strong><span>Required steps</span></div>
          </div>
          <h4 style={styles.smallTitle}>Rollback steps</h4>
          <ul style={styles.list}>
            {runnerRollbackPlan.rollback_steps.map((step) => (
              <li key={step.key}><strong>{step.required ? 'Required' : 'Optional'}</strong> — {step.label}: {step.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Rollback checks</h4>
          <ul style={styles.list}>
            {runnerRollbackPlan.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Rollback plan JSON</h4>
          <JsonBlock value={runnerRollbackPlan} />
        </section>
      ) : null}




      {runnerCertificationReport ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner certification report</h3>
              <p style={styles.muted}>Read-only certification across runner status, rollback verification, run ledger, and schedule-created request evidence. It cannot create, approve, execute, or mutate anything.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerCertificationReport.certification_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerCertificationReport.summary.schedule_count}</strong><span>Schedules</span></div>
            <div style={styles.metric}><strong>{runnerCertificationReport.summary.due_schedule_count}</strong><span>Due schedules</span></div>
            <div style={styles.metric}><strong>{runnerCertificationReport.summary.schedule_created_request_count}</strong><span>Schedule requests</span></div>
            <div style={styles.metric}><strong>{runnerCertificationReport.summary.execution_metadata_count}</strong><span>Execution metadata</span></div>
          </div>
          <h4 style={styles.smallTitle}>Certification checks</h4>
          <ul style={styles.list}>
            {runnerCertificationReport.certification_checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Certification evidence</h4>
          <JsonBlock value={runnerCertificationReport.evidence_refs} />
        </section>
      ) : null}



      {runnerCertificationEvidence ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner certification evidence</h3>
              <p style={styles.muted}>Read-only evidence bundle for certification review. It only displays schedule, request, and run-ledger evidence; it cannot start the runner, create requests, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerCertificationEvidence.evidence_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerCertificationEvidence.evidence_summary.schedule_breakdown_rows}</strong><span>Schedule rows</span></div>
            <div style={styles.metric}><strong>{runnerCertificationEvidence.evidence_summary.request_breakdown_rows}</strong><span>Request rows</span></div>
            <div style={styles.metric}><strong>{runnerCertificationEvidence.evidence_summary.run_breakdown_rows}</strong><span>Run rows</span></div>
            <div style={styles.metric}><strong>{runnerCertificationEvidence.evidence_summary.latest_evidence_rows}</strong><span>Recent evidence</span></div>
          </div>
          <h4 style={styles.smallTitle}>Evidence bundle</h4>
          <JsonBlock value={runnerCertificationEvidence} />
        </section>
      ) : null}

      {runnerRollbackVerification ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner rollback verification</h3>
              <p style={styles.muted}>Read-only verification after controlled auto-request rollback. It cannot change flags, create requests, approve, execute, or mutate inventory.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerRollbackVerification.verification_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerRollbackVerification.summary.recent_auto_run_event_count}</strong><span>Auto events / 24h</span></div>
            <div style={styles.metric}><strong>{runnerRollbackVerification.summary.recent_failed_auto_run_event_count}</strong><span>Failed auto events</span></div>
            <div style={styles.metric}><strong>{runnerRollbackVerification.summary.recent_schedule_created_request_count}</strong><span>Schedule requests</span></div>
            <div style={styles.metric}><strong>{runnerRollbackVerification.summary.recent_schedule_request_execution_metadata_count}</strong><span>Execution metadata</span></div>
          </div>
          <h4 style={styles.smallTitle}>Verification checks</h4>
          <ul style={styles.list}>
            {runnerRollbackVerification.verification_checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Rollback verification JSON</h4>
          <JsonBlock value={runnerRollbackVerification} />
        </section>
      ) : null}

      {runnerSafetyReport ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner safety report</h3>
              <p style={styles.muted}>Read-only governance summary for schedule due-state, run-ledger health, and linked execution-request posture. This report cannot start the runner or create requests.</p>
            </div>
            <div style={styles.safetyBadge}>{runnerSafetyReport.request_creation_enabled ? 'Auto request flag on' : 'No auto request creation'}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerSafetyReport.schedule_summary.due_request_creation_candidates}</strong><span>Due candidates</span></div>
            <div style={styles.metric}><strong>{runnerSafetyReport.run_ledger_summary.total_run_events}</strong><span>Run events</span></div>
            <div style={styles.metric}><strong>{runnerSafetyReport.linked_request_summary.awaiting_review_count}</strong><span>Awaiting review</span></div>
            <div style={styles.metric}><strong>{runnerSafetyReport.linked_request_summary.executed_count}</strong><span>Executed by scheduler</span></div>
          </div>
          <h4 style={styles.smallTitle}>Safety report checks</h4>
          <ul style={styles.list}>
            {runnerSafetyReport.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Safety report JSON</h4>
          <JsonBlock value={runnerSafetyReport} />
        </section>
      ) : null}




      {runnerPolicyMatrix ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner policy matrix</h3>
              <p style={styles.muted}>Read-only capability matrix for scheduler request creation boundaries. Approval, execution, retry, and inventory mutation remain disallowed.</p>
            </div>
            <div style={styles.safetyBadge}>{runnerPolicyMatrix.request_creation_enabled ? 'Request creation flag on' : 'Policy only'}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerPolicyMatrix.summary.due_schedule_count}</strong><span>Due schedules</span></div>
            <div style={styles.metric}><strong>{runnerPolicyMatrix.summary.schedule_created_request_count}</strong><span>Schedule-created requests</span></div>
            <div style={styles.metric}><strong>{runnerPolicyMatrix.summary.failed_run_event_count}</strong><span>Failed run events</span></div>
            <div style={styles.metric}><strong>{runnerPolicyMatrix.summary.executed_schedule_created_request_count}</strong><span>Executed schedule requests</span></div>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Capability</th>
                  <th style={styles.th}>Manual</th>
                  <th style={styles.th}>Automatic</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Boundary</th>
                </tr>
              </thead>
              <tbody>
                {runnerPolicyMatrix.policy_rows.map((row) => (
                  <tr key={row.key}>
                    <td style={styles.td}>{row.capability}</td>
                    <td style={styles.td}>{row.manual_allowed ? 'Allowed' : 'Blocked'}</td>
                    <td style={styles.td}>{row.automatic_allowed ? 'Allowed' : 'Blocked'}</td>
                    <td style={styles.td}>{label(row.status)}</td>
                    <td style={styles.td}>{row.boundary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4 style={styles.smallTitle}>Policy checks</h4>
          <ul style={styles.list}>
            {runnerPolicyMatrix.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {runnerOperationsReview ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner operations review</h3>
              <p style={styles.muted}>Read-only operational posture for scheduler request creation. It cannot start the runner, create requests, approve requests, or execute anything.</p>
            </div>
            <div style={styles.safetyBadge}>{label(runnerOperationsReview.operations_posture)}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerOperationsReview.summary.due_schedule_count}</strong><span>Due schedules</span></div>
            <div style={styles.metric}><strong>{runnerOperationsReview.summary.open_schedule_request_count}</strong><span>Open schedule requests</span></div>
            <div style={styles.metric}><strong>{runnerOperationsReview.summary.failed_run_event_count}</strong><span>Failed run events</span></div>
            <div style={styles.metric}><strong>{runnerOperationsReview.summary.executed_schedule_request_count}</strong><span>Executed schedule requests</span></div>
          </div>
          <h4 style={styles.smallTitle}>Operations checks</h4>
          <ul style={styles.list}>
            {runnerOperationsReview.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Operations review JSON</h4>
          <JsonBlock value={runnerOperationsReview} />
        </section>
      ) : null}



      {runnerAccountabilityDigest ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner accountability digest</h3>
              <p style={styles.muted}>Read-only actor and request-state evidence for scheduler-created run events. This digest cannot create, approve, or execute requests.</p>
            </div>
            <div style={styles.safetyBadge}>{runnerAccountabilityDigest.read_only ? 'Accountability only' : 'Review required'}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerAccountabilityDigest.schedule_summary.total_schedules}</strong><span>Total schedules</span></div>
            <div style={styles.metric}><strong>{runnerAccountabilityDigest.schedule_summary.due_count}</strong><span>Due schedules</span></div>
            <div style={styles.metric}><strong>{runnerAccountabilityDigest.actor_breakdown.length}</strong><span>Actor rows</span></div>
            <div style={styles.metric}><strong>{runnerAccountabilityDigest.request_status_breakdown.length}</strong><span>Request state rows</span></div>
          </div>
          <h4 style={styles.smallTitle}>Accountability checks</h4>
          <ul style={styles.list}>
            {runnerAccountabilityDigest.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          {runnerAccountabilityDigest.actor_breakdown.length ? (
            <>
              <h4 style={styles.smallTitle}>Actor breakdown</h4>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Actor</th>
                      <th style={styles.th}>Mode</th>
                      <th style={styles.th}>Trigger</th>
                      <th style={styles.th}>Events</th>
                      <th style={styles.th}>Linked requests</th>
                      <th style={styles.th}>Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runnerAccountabilityDigest.actor_breakdown.map((row) => (
                      <tr key={`${row.actor_name}-${row.run_mode}-${row.trigger_source}`}>
                        <td style={styles.td}>{row.actor_name}</td>
                        <td style={styles.td}>{label(row.run_mode)}</td>
                        <td style={styles.td}>{label(row.trigger_source)}</td>
                        <td style={styles.td}>{row.run_event_count} ({row.failed_count} failed)</td>
                        <td style={styles.td}>{row.linked_request_count}</td>
                        <td style={styles.td}>{formatDateTime(row.latest_event_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
          {runnerAccountabilityDigest.request_status_breakdown.length ? (
            <>
              <h4 style={styles.smallTitle}>Schedule-created request states</h4>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Request status</th>
                      <th style={styles.th}>Execution status</th>
                      <th style={styles.th}>Count</th>
                      <th style={styles.th}>Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runnerAccountabilityDigest.request_status_breakdown.map((row) => (
                      <tr key={`${row.request_status}-${row.execution_status}`}>
                        <td style={styles.td}>{label(row.request_status)}</td>
                        <td style={styles.td}>{label(row.execution_status)}</td>
                        <td style={styles.td}>{row.request_count}</td>
                        <td style={styles.td}>{formatDateTime(row.latest_request_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {runnerGovernancePack ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner governance pack</h3>
              <p style={styles.muted}>Read-only evidence pack for due schedules, latest run events, linked schedule-created requests, and safety-report posture. It cannot create or execute requests.</p>
            </div>
            <div style={styles.safetyBadge}>{runnerGovernancePack.read_only ? 'Evidence only' : 'Review required'}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerGovernancePack.evidence_summary.due_schedule_sample_count}</strong><span>Due schedule sample</span></div>
            <div style={styles.metric}><strong>{runnerGovernancePack.evidence_summary.latest_run_event_sample_count}</strong><span>Run event sample</span></div>
            <div style={styles.metric}><strong>{runnerGovernancePack.evidence_summary.linked_request_sample_count}</strong><span>Linked request sample</span></div>
            <div style={styles.metric}><strong>{runnerGovernancePack.evidence_summary.executed_linked_request_sample_count}</strong><span>Executed sample</span></div>
          </div>
          <h4 style={styles.smallTitle}>Governance pack checks</h4>
          <ul style={styles.list}>
            {runnerGovernancePack.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Governance pack JSON</h4>
          <JsonBlock value={runnerGovernancePack} />
        </section>
      ) : null}

      {runEvents ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Recent scheduler run ledger</h3>
              <p style={styles.muted}>Read-only schedule run evidence across manual and controlled runner-created requests. This view cannot create, approve, or execute requests.</p>
            </div>
            <div style={styles.safetyBadge}>Ledger only</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runEvents.total}</strong><span>Total ledger events</span></div>
            <div style={styles.metric}><strong>{runEvents.summary.succeeded_count}</strong><span>Succeeded</span></div>
            <div style={styles.metric}><strong>{runEvents.summary.skipped_count}</strong><span>Skipped</span></div>
            <div style={styles.metric}><strong>{runEvents.summary.linked_execution_request_count}</strong><span>Linked requests shown</span></div>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Schedule</th>
                  <th style={styles.th}>Mode</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Request</th>
                  <th style={styles.th}>Started</th>
                </tr>
              </thead>
              <tbody>
                {runEvents.rows.map((event) => (
                  <tr key={event.id}>
                    <td style={styles.td}>{event.schedule_name}</td>
                    <td style={styles.td}>{label(event.run_mode)}</td>
                    <td style={styles.td}>{label(event.status)}</td>
                    <td style={styles.td}>{event.execution_request_id ? `${label(event.request_type)} / ${label(event.execution_request_status || event.request_status)}` : '-'}</td>
                    <td style={styles.td}>{formatDateTime(event.started_at)}</td>
                  </tr>
                ))}
                {!runEvents.rows.length ? (
                  <tr><td style={styles.empty} colSpan={5}>No scheduler run ledger events yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <h4 style={styles.smallTitle}>Run ledger safety checks</h4>
          <ul style={styles.list}>
            {runEvents.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Create schedule</h3>
          <div style={styles.formGrid}>
            <label style={styles.field}>
              <span>Name</span>
              <input style={styles.input} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label style={styles.field}>
              <span>Automation type</span>
              <select style={styles.input} value={form.automation_type} onChange={(event) => setForm({ ...form, automation_type: event.target.value as FormState['automation_type'] })}>
                {automationTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
              </select>
            </label>
            <label style={styles.field}>
              <span>Frequency</span>
              <select style={styles.input} value={form.schedule_kind} onChange={(event) => setForm({ ...form, schedule_kind: event.target.value as FormState['schedule_kind'] })}>
                {scheduleKinds.map((kind) => <option key={kind} value={kind}>{label(kind)}</option>)}
              </select>
            </label>
            <label style={styles.field}>
              <span>Time</span>
              <input style={styles.input} type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
            </label>
            <label style={styles.field}>
              <span>Timezone</span>
              <input style={styles.input} value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
            </label>
            <label style={styles.field}>
              <span>Future request default</span>
              <select style={styles.input} value={form.default_status} onChange={(event) => setForm({ ...form, default_status: event.target.value as FormState['default_status'] })}>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending review</option>
              </select>
            </label>
          </div>
          <label style={styles.field}>
            <span>Description</span>
            <textarea style={styles.textarea} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <button style={styles.primaryButton} disabled={saving} onClick={() => void createSchedule()}>
            {saving ? 'Saving…' : 'Create draft schedule'}
          </button>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Step 211 safety contract</h3>
          <ul style={styles.list}>
            <li>Background runner startup is explicit and disabled by default.</li>
            <li>System-runner request creation uses explicit permissions, not a broad tenant role.</li>
            <li>Auto-request creation requires explicit backend flags.</li>
            <li>Execution requests can be created manually or by controlled due-schedule processing only.</li>
            <li>No stock, shipment, or product records are mutated.</li>
            <li>Run-ledger events record request creation and duplicate-skip evidence without approving or executing requests.</li>
            <li>Runner safety report is read-only and cannot start jobs, create requests, approve requests, or execute requests.</li>
            <li>Scheduler audit packs are read-only evidence and do not create or execute requests.</li>
          </ul>
          {types ? <JsonBlock value={types.safety} /> : null}
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.toolbar}>
          <input style={styles.input} placeholder="Search schedules" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select style={styles.input} value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="">All statuses</option>
            {statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <select style={styles.input} value={automationType} onChange={(event) => setAutomationType(event.target.value as TypeFilter)}>
            <option value="">All types</option>
            {automationTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <button style={styles.secondaryButton} disabled={loading} onClick={() => void loadSchedules()}>Refresh</button>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Frequency</th>
                <th style={styles.th}>Next run</th>
                <th style={styles.th}>Last run</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((schedule) => (
                <tr key={schedule.id}>
                  <td style={styles.td}>{schedule.name}</td>
                  <td style={styles.td}>{label(schedule.automation_type)}</td>
                  <td style={styles.td}>{label(schedule.status)}</td>
                  <td style={styles.td}>{label(schedule.schedule_kind)}</td>
                  <td style={styles.td}>{formatDateTime(schedule.next_run_at)}</td>
                  <td style={styles.td}>{formatDateTime(schedule.last_run_at)}</td>
                  <td style={styles.tdActions}>
                    <button style={styles.linkButton} onClick={() => setSelected(schedule)}>View</button>
                    {schedule.status !== 'disabled' ? <button style={styles.linkButton} disabled={saving} onClick={() => void dryRunSchedule(schedule)}>Dry run</button> : null}
                    <button style={styles.linkButton} disabled={saving} onClick={() => void loadAuditPack(schedule)}>Audit Pack</button>
                    {schedule.status !== 'disabled' ? <button style={styles.linkButton} disabled={saving} onClick={() => void runScheduleManually(schedule)}>Run Schedule</button> : null}
                    {schedule.status !== 'disabled' ? <button style={styles.linkButton} disabled={saving} onClick={() => void pauseSchedule(schedule)}>Pause</button> : null}
                    {schedule.status !== 'disabled' ? <button style={styles.linkButton} disabled={saving} onClick={() => void disableSchedule(schedule)}>Disable</button> : null}
                    {schedule.status === 'paused' ? <button style={styles.linkButton} disabled={saving} onClick={() => void tryResume(schedule)}>Resume</button> : null}
                  </td>
                </tr>
              ))}
              {!loading && !data?.rows.length ? (
                <tr><td style={styles.empty} colSpan={7}>No automation schedules found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>



      {manualRunResult ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Manual schedule run result</h3>
              <p style={styles.muted}>Execution request created. It was not approved, executed, or applied to stock/products/shipments.</p>
            </div>
            <div style={styles.safetyBadge}>Request created only</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{manualRunResult.created_execution_request_count}</strong><span>Requests created</span></div>
            <div style={styles.metric}><strong>{manualRunResult.duplicate_guard_triggered ? 'Yes' : 'No'}</strong><span>Duplicate guard</span></div>
            <div style={styles.metric}><strong>{label(manualRunResult.execution_request.status)}</strong><span>Request status</span></div>
            <div style={styles.metric}><strong>{manualRunResult.executes_requests ? 'Yes' : 'No'}</strong><span>Executed request</span></div>
            <div style={styles.metric}><strong>{manualRunResult.runner_enabled ? 'Enabled' : 'Disabled'}</strong><span>Runner</span></div>
          </div>
          <h4 style={styles.smallTitle}>Created execution request</h4>
          <JsonBlock value={manualRunResult.execution_request} />
          {manualRunResult.run_event ? (
            <>
              <h4 style={styles.smallTitle}>Run ledger event</h4>
              <JsonBlock value={manualRunResult.run_event} />
            </>
          ) : null}
          <h4 style={styles.smallTitle}>Safety checks</h4>
          <ul style={styles.list}>
            {manualRunResult.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Notes</h4>
          <ul style={styles.list}>
            {manualRunResult.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      ) : null}


      {auditPack ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Scheduler audit pack</h3>
              <p style={styles.muted}>Read-only evidence for schedule configuration, run-ledger events, audit events, and linked execution requests.</p>
            </div>
            <div style={styles.safetyBadge}>Read only</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{auditPack.evidence_summary.schedule_audit_event_count}</strong><span>Schedule audit events</span></div>
            <div style={styles.metric}><strong>{auditPack.evidence_summary.execution_request_count}</strong><span>Linked requests</span></div>
            <div style={styles.metric}><strong>{auditPack.evidence_summary.execution_request_audit_event_count}</strong><span>Request audit events</span></div>
            <div style={styles.metric}><strong>{auditPack.evidence_summary.run_event_count ?? 0}</strong><span>Run ledger events</span></div>
            <div style={styles.metric}><strong>{auditPack.evidence_summary.duplicate_skipped_audit_event_count ?? 0}</strong><span>Duplicate skips</span></div>
            <div style={styles.metric}><strong>{auditPack.completeness.safe_for_scheduler_governance_review ? 'Ready' : 'Review'}</strong><span>Governance status</span></div>
          </div>
          <h4 style={styles.smallTitle}>Audit pack checks</h4>
          <ul style={styles.list}>
            {auditPack.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Evidence summary</h4>
          <JsonBlock value={auditPack.evidence_summary} />
          <h4 style={styles.smallTitle}>Linked execution requests</h4>
          <JsonBlock value={auditPack.linked_execution_requests} />
          <h4 style={styles.smallTitle}>Run ledger</h4>
          <JsonBlock value={auditPack.run_ledger || []} />
          <h4 style={styles.smallTitle}>Full scheduler audit pack JSON</h4>
          <JsonBlock value={auditPack} />
        </section>
      ) : null}

      {dryRunResult ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Manual dry-run result</h3>
              <p style={styles.muted}>Preview only. No execution request was created and no business records were changed.</p>
            </div>
            <div style={styles.safetyBadge}>Dry run only</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{dryRunResult.would_create_execution_request ? 'Yes later' : 'No'}</strong><span>Would create request</span></div>
            <div style={styles.metric}><strong>{dryRunResult.would_execute_request ? 'Yes' : 'No'}</strong><span>Would execute</span></div>
            <div style={styles.metric}><strong>{dryRunResult.would_mutate_inventory ? 'Yes' : 'No'}</strong><span>Would mutate inventory</span></div>
            <div style={styles.metric}><strong>{dryRunResult.runner_enabled ? 'Enabled' : 'Disabled'}</strong><span>Runner</span></div>
          </div>
          <h4 style={styles.smallTitle}>Dry-run checks</h4>
          <ul style={styles.list}>
            {dryRunResult.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Candidate execution request preview</h4>
          <JsonBlock value={dryRunResult.candidate_request} />
          <h4 style={styles.smallTitle}>Notes</h4>
          <ul style={styles.list}>
            {dryRunResult.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      ) : null}

      {selected ? (
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Schedule detail</h3>
          <div style={styles.detailGrid}>
            <div><strong>Name</strong><br />{selected.name}</div>
            <div><strong>Status</strong><br />{label(selected.status)}</div>
            <div><strong>Type</strong><br />{label(selected.automation_type)}</div>
            <div><strong>Next run metadata</strong><br />{formatDateTime(selected.next_run_at)}</div>
          </div>
          <h4 style={styles.smallTitle}>Schedule config</h4>
          <JsonBlock value={selected.schedule_config} />
          <h4 style={styles.smallTitle}>Request defaults</h4>
          <JsonBlock value={selected.request_defaults} />
          <h4 style={styles.smallTitle}>Safety</h4>
          <JsonBlock value={selected.safety} />
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  headerCard: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: 20, border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff' },
  title: { margin: 0, fontSize: 24 },
  subtitle: { margin: '6px 0 0', color: '#64748b', maxWidth: 760 },
  safetyBadge: { alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 999, background: '#fef3c7', color: '#92400e', fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 16 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  muted: { margin: '4px 0 0', color: '#64748b' },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '12px 0' },
  metric: { display: 'flex', flexDirection: 'column', gap: 4, padding: 12, border: '1px solid #e5e7eb', borderRadius: 12, background: '#f8fafc' },
  card: { padding: 16, border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff' },
  cardTitle: { margin: '0 0 12px', fontSize: 18 },
  smallTitle: { margin: '16px 0 8px', fontSize: 14 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#334155' },
  input: { padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff' },
  textarea: { minHeight: 80, padding: 10, border: '1px solid #cbd5e1', borderRadius: 10, resize: 'vertical' },
  primaryButton: { marginTop: 12, padding: '10px 14px', border: 0, borderRadius: 10, background: '#0f172a', color: '#fff', cursor: 'pointer' },
  secondaryButton: { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', cursor: 'pointer' },
  linkButton: { padding: 0, border: 0, background: 'transparent', color: '#2563eb', cursor: 'pointer', fontWeight: 600 },
  toolbar: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', color: '#475569', fontSize: 13 },
  td: { padding: 10, borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  tdActions: { padding: 10, borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10, flexWrap: 'wrap' },
  empty: { padding: 20, textAlign: 'center', color: '#64748b' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  json: { margin: 0, padding: 12, borderRadius: 12, background: '#f8fafc', overflowX: 'auto', fontSize: 12 },
  list: { margin: 0, paddingLeft: 18, color: '#475569' },
  error: { padding: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 12 }
};
