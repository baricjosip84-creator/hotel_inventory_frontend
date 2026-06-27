import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

type PlatformUser = { id: string; email: string };
type Runbook = { id: string; title: string };
type Job = {
  id: string; name: string; job_key: string; category: string; status: string; schedule_label?: string | null;
  owner_platform_user_id?: string | null; owner_email?: string | null; runbook_id?: string | null; runbook_title?: string | null;
  last_run_at?: string | null; last_status?: string | null; last_duration_ms?: number | null; last_error?: string | null; next_run_at?: string | null;
  consecutive_failures: number; failure_threshold: number; overdue?: boolean; failing_attention?: boolean; notes?: string | null; updated_at: string;
  current_run_id?: string | null; current_run_started_at?: string | null; claimed_by_platform_user_id?: string | null; claimed_by_email?: string | null; claim_expires_at?: string | null; actively_claimed?: boolean; dead_lettered_at?: string | null; next_retry_at?: string | null; last_retry_scheduled_at?: string | null; dead_lettered?: boolean; retry_due?: boolean; worker_handler?: string | null; worker_payload?: Record<string, unknown> | null; worker_enabled?: boolean; worker_dry_run?: boolean; last_worker_id?: string | null; last_worker_result?: Record<string, unknown> | null; alert_on_failure?: boolean; alert_on_dead_letter?: boolean; last_alerted_at?: string | null; recurrence_type?: string; recurrence_interval?: number | null; recurrence_anchor_at?: string | null; last_success_at?: string | null; last_failure_at?: string | null;
};
type JobRun = { id: string; job_id: string; started_at: string; finished_at?: string | null; status: string; duration_ms?: number | null; error_message?: string | null; triggered_by_email?: string | null; worker_id?: string | null; worker_metadata?: Record<string, unknown> | null; created_at: string };
type JobRunsResponse = { runs: JobRun[] };
type ExecutionMetricsResponse = { days: number; by_status: { status: string; count: number }[]; slowest_jobs: { job_id: string; runs: number; avg_duration_ms?: number | null; max_duration_ms?: number | null }[]; failing_jobs: { id: string; name: string; job_key: string; consecutive_failures: number; failure_threshold: number; last_error?: string | null; last_failure_at?: string | null }[]; stale_claims: number };
type WorkerHeartbeat = { id: string; worker_id: string; worker_type: string; status: string; last_seen_at: string; created_at?: string | null; updated_at?: string | null; current_job_id?: string | null; current_run_id?: string | null; reported_run_status?: string | null; reported_run_finished_at?: string | null; reported_run_job_id?: string | null; reported_job_current_run_id?: string | null; is_stale?: boolean; is_unhealthy_status?: boolean; is_flapping?: boolean; is_identity_changed_recent?: boolean; is_run_claim_mismatch?: boolean; is_missing_source?: boolean; metadata?: Record<string, unknown>; last_status_changed_at?: string | null; status_changed_count?: number; last_status_change_metadata?: Record<string, unknown> | null; status_change_window_started_at?: string | null; status_change_window_count?: number | null; unhealthy_status_change_window_count?: number | null; last_identity_changed_at?: string | null; identity_changed_count?: number | null; last_identity_change_metadata?: Record<string, unknown> | null };
type WorkerHeartbeatCheck = { status: string; checked: number; stale: number; unhealthy_status?: number; flapping?: number; identity_changed?: number; run_claim_mismatch?: number; missing_source?: number; no_workers?: boolean; stale_after_seconds: number; stale_workers: WorkerHeartbeat[]; unhealthy_workers?: WorkerHeartbeat[]; flapping_workers?: WorkerHeartbeat[]; identity_changed_workers?: WorkerHeartbeat[]; run_claim_mismatch_workers?: WorkerHeartbeat[]; missing_source_workers?: WorkerHeartbeat[]; notification_action: string; notification_id?: string | null; notification_resolved_count?: number; obsolete_notification_resolved_count?: number };
type WorkerHandlerOption = string | { key: string; label?: string; description?: string };
type DefaultOperationalJob = { name: string; job_key: string; category: string; worker_handler: string; recurrence_type: string; recurrence_interval?: number; schedule_label?: string; notes?: string };

type JobsResponse = { jobs: Job[]; summary: { total: number; overdue: number; failing: number; last_failed: number; claimed?: number; expired_claims?: number; dead_lettered?: number; retry_due?: number; by_status: Record<string, number>; by_category: Record<string, number> }; categories: string[]; statuses: string[]; run_statuses: string[] };

const emptyForm = { name: '', job_key: '', category: 'operational', status: 'enabled', schedule_label: '', owner_platform_user_id: '', next_run_at: '', failure_threshold: '3', runbook_id: '', notes: '', worker_handler: '', worker_payload: '{}', worker_enabled: false, worker_dry_run: true, alert_on_failure: true, alert_on_dead_letter: true, recurrence_type: 'manual', recurrence_interval: '', recurrence_anchor_at: '' };
type JobForm = typeof emptyForm;
const runFormDefault = { last_status: 'success', last_duration_ms: '', last_error: '', next_run_at: '' };
function metadataSummary(value?: Record<string, unknown> | null) { const entries = Object.entries(value || {}); if (!entries.length) return '—'; return entries.slice(0, 4).map(([key, val]) => `${key}: ${typeof val === 'object' ? JSON.stringify(val).slice(0, 80) : String(val)}`).join(' · '); }

function label(value?: string | null) { return value ? value.replace(/_/g, ' ') : '—'; }
function dateTime(value?: string | null) { return value ? new Date(value).toLocaleString() : '—'; }
function toInputDateTime(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 16) : ''; }
function statusStyle(job: Job): CSSProperties { if (job.status === 'archived') return styles.badgeMuted; if (job.status === 'degraded' || job.failing_attention || job.last_status === 'failed') return styles.badgeDanger; if (job.status === 'paused' || job.overdue) return styles.badgeWarn; return styles.badgeGood; }
function toForm(job: Job): JobForm { return { name: job.name || '', job_key: job.job_key || '', category: job.category || 'operational', status: job.status || 'enabled', schedule_label: job.schedule_label || '', owner_platform_user_id: job.owner_platform_user_id || '', next_run_at: toInputDateTime(job.next_run_at), failure_threshold: String(job.failure_threshold || 3), runbook_id: job.runbook_id || '', notes: job.notes || '',
    worker_handler: job.worker_handler || '',
    worker_payload: JSON.stringify(job.worker_payload || {}, null, 2),
    worker_enabled: Boolean(job.worker_enabled),
    worker_dry_run: job.worker_dry_run !== false,
    alert_on_failure: job.alert_on_failure !== false,
    alert_on_dead_letter: job.alert_on_dead_letter !== false,
    recurrence_type: job.recurrence_type || 'manual',
    recurrence_interval: job.recurrence_interval ? String(job.recurrence_interval) : '',
    recurrence_anchor_at: job.recurrence_anchor_at || '' }; }
function payload(form: JobForm) { return { name: form.name, job_key: form.job_key, category: form.category, status: form.status, schedule_label: form.schedule_label || null, owner_platform_user_id: form.owner_platform_user_id || null, next_run_at: form.next_run_at ? new Date(form.next_run_at).toISOString() : null, failure_threshold: Number(form.failure_threshold || 3), runbook_id: form.runbook_id || null, notes: form.notes || null,
    worker_handler: form.worker_handler || null,
    worker_payload: (() => { try { return form.worker_payload ? JSON.parse(form.worker_payload) : {}; } catch { return {}; } })(),
    worker_enabled: form.worker_enabled,
    worker_dry_run: form.worker_dry_run,
    alert_on_failure: form.alert_on_failure,
    alert_on_dead_letter: form.alert_on_dead_letter,
    recurrence_type: form.recurrence_type,
    recurrence_interval: form.recurrence_interval ? Number(form.recurrence_interval) : null,
    recurrence_anchor_at: form.recurrence_anchor_at || null }; }

export default function PlatformOperationalJobsPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_WRITE);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadRunbooks = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ);
  const [filters, setFilters] = useState({ category: '', status: '', search: '', attention_only: true, include_archived: false });
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [runJobId, setRunJobId] = useState<string | null>(null);
  const [historyJobId, setHistoryJobId] = useState<string | null>(null);
  const [runForm, setRunForm] = useState(runFormDefault);
  const [heartbeatCheckResult, setHeartbeatCheckResult] = useState<WorkerHeartbeatCheck | null>(null);

  const queryString = useMemo(() => { const params = new URLSearchParams(); if (filters.category) params.set('category', filters.category); if (filters.status) params.set('status', filters.status); if (filters.search) params.set('search', filters.search); if (filters.attention_only) params.set('attention_only', 'true'); if (filters.include_archived) params.set('include_archived', 'true'); params.set('limit', '300'); return params.toString(); }, [filters]);
  const jobs = useQuery({ queryKey: ['platform', 'operational-jobs', filters], queryFn: () => platformApiRequest<JobsResponse>(`/platform/operational-jobs?${queryString}`) });
  const users = useQuery({ queryKey: ['platform', 'jobs-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite && canReadUsers });
  const runbooks = useQuery({ queryKey: ['platform', 'jobs-runbooks'], queryFn: () => platformApiRequest<{ runbooks: Runbook[] }>('/platform/runbooks?limit=300'), enabled: canWrite && canReadRunbooks });
  const jobRuns = useQuery({ queryKey: ['platform', 'operational-job-runs', historyJobId], queryFn: () => platformApiRequest<JobRunsResponse>(`/platform/operational-jobs/${historyJobId}/runs?limit=25`), enabled: Boolean(historyJobId) });
  const dueJobs = useQuery({ queryKey: ['platform', 'operational-jobs-due'], queryFn: () => platformApiRequest<Job[]>('/platform/operational-jobs/scheduler/due?limit=25') });
  const workerHeartbeats = useQuery({ queryKey: ['platform', 'operational-worker-heartbeats'], queryFn: () => platformApiRequest<WorkerHeartbeat[]>('/platform/operational-jobs/scheduler/heartbeats?stale_after_seconds=300') });
  const executionMetrics = useQuery({ queryKey: ['platform', 'operational-execution-metrics'], queryFn: () => platformApiRequest<ExecutionMetricsResponse>('/platform/operational-jobs/execution-metrics?days=14') });
  const workerHandlers = useQuery({ queryKey: ['platform', 'worker-handler-options'], queryFn: () => platformApiRequest<{ handlers: WorkerHandlerOption[] }>('/platform/operational-jobs/worker/handlers') });
  const defaultJobs = useQuery({ queryKey: ['platform', 'operational-job-defaults'], queryFn: () => platformApiRequest<{ jobs: DefaultOperationalJob[] }>('/platform/operational-jobs/defaults') });


  const refreshOperationalJobData = async (jobId?: string | null) => {
    await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-jobs'] });
    await queryClient.refetchQueries({ queryKey: ['platform', 'operational-jobs'], type: 'active' });
    if (jobId) {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-job-runs', jobId] });
      await queryClient.refetchQueries({ queryKey: ['platform', 'operational-job-runs', jobId], type: 'active' });
    } else {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-job-runs'] });
    }
    await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-execution-metrics'] });
  };

  const save = useMutation({ mutationFn: () => { const wasEditing = Boolean(editingId); const body = JSON.stringify(payload(form)); return editingId ? platformApiRequest(`/platform/operational-jobs/${editingId}`, { method: 'PATCH', body }) : platformApiRequest('/platform/operational-jobs', { method: 'POST', body }).then((created) => ({ created, wasEditing })); }, onSuccess: async (result: unknown) => { const wasEditing = typeof result === 'object' && result !== null && 'wasEditing' in result ? Boolean((result as { wasEditing?: boolean }).wasEditing) : Boolean(editingId); setForm(emptyForm); setEditingId(null); if (!wasEditing) setFilters((prev) => ({ ...prev, attention_only: false })); await refreshOperationalJobData(); } });
  const recordRun = useMutation({ mutationFn: () => platformApiRequest(`/platform/operational-jobs/${runJobId}/runs`, { method: 'POST', body: JSON.stringify({ last_status: runForm.last_status, last_duration_ms: runForm.last_duration_ms ? Number(runForm.last_duration_ms) : null, last_error: runForm.last_error || null, next_run_at: runForm.next_run_at ? new Date(runForm.next_run_at).toISOString() : null }) }), onSuccess: async () => { const recordedJobId = runJobId; setHistoryJobId(recordedJobId); setRunJobId(null); setRunForm(runFormDefault); await refreshOperationalJobData(recordedJobId); } });
  const archive = useMutation({ mutationFn: (id: string) => platformApiRequest(`/platform/operational-jobs/${id}/archive`, { method: 'POST', body: JSON.stringify({}) }), onSuccess: async (_data, jobId) => { await refreshOperationalJobData(jobId); } });
  const claimJob = useMutation({ mutationFn: (id: string) => platformApiRequest<{ job: Job; run: { id: string } }>(`/platform/operational-jobs/${id}/claim`, { method: 'POST', body: JSON.stringify({ lease_seconds: 900, worker_id: 'platform-ui-manual-claim', worker_metadata: { source: 'platform_operational_jobs_ui', action: 'manual_claim' } }) }), onSuccess: async (_data, jobId) => { setHistoryJobId(jobId); await refreshOperationalJobData(jobId); } });
  const completeClaim = useMutation({ mutationFn: ({ id, runId, status }: { id: string; runId: string; status: 'success' | 'failed' | 'skipped' }) => platformApiRequest<Job>(`/platform/operational-jobs/${id}/complete-claim`, { method: 'POST', body: JSON.stringify({ run_id: runId, status, worker_id: 'platform-ui-manual-claim', worker_metadata: { source: 'platform_operational_jobs_ui', action: `manual_complete_${status}` } }) }), onSuccess: async (_data, variables) => { setHistoryJobId(variables.id); await refreshOperationalJobData(variables.id); } });
  const releaseClaim = useMutation({ mutationFn: (id: string) => platformApiRequest<Job>(`/platform/operational-jobs/${id}/release-claim`, { method: 'POST', body: JSON.stringify({}) }), onSuccess: async (_data, jobId) => { setHistoryJobId(jobId); await refreshOperationalJobData(jobId); } });
  const scheduleRetry = useMutation({ mutationFn: (id: string) => platformApiRequest(`/platform/operational-jobs/${id}/schedule-retry`, { method: 'POST', body: JSON.stringify({ retry_at: null }) }), onSuccess: async (_data, jobId) => { await refreshOperationalJobData(jobId); } });
  const releaseExpiredClaims = useMutation({ mutationFn: () => platformApiRequest('/platform/operational-jobs/release-expired-claims', { method: 'POST', body: JSON.stringify({}) }), onSuccess: async () => { await refreshOperationalJobData(); } });
  const runWorkerOnce = useMutation({ mutationFn: () => platformApiRequest('/platform/operational-jobs/worker/run-once', { method: 'POST', body: JSON.stringify({ limit: 10, lease_seconds: 900 }) }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-jobs'] }); await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-jobs-due'] }); await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-worker-heartbeats'] }); await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-execution-metrics'] }); await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-job-runs'] }); } });
  const runHeartbeatCheck = useMutation({ mutationFn: () => platformApiRequest<WorkerHeartbeatCheck>('/platform/operational-jobs/scheduler/heartbeat-check', { method: 'POST', body: JSON.stringify({ stale_after_seconds: 300 }) }), onSuccess: async (result) => { setHeartbeatCheckResult(result); await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-worker-heartbeats'] }); await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-execution-metrics'] }); await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-jobs'] }); } });
  const recoverStaleClaims = useMutation({ mutationFn: () => platformApiRequest('/platform/operational-jobs/recover-stale-claims', { method: 'POST', body: JSON.stringify({ older_than_seconds: 0 }) }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-jobs'] }); await queryClient.invalidateQueries({ queryKey: ['platform', 'operational-execution-metrics'] }); } });

  const response = jobs.data;
  const categories = response?.categories || ['backup','billing','notification','webhook','retention','health_scan','sla_scan','maintenance','reporting','operational','other'];
  const statuses = response?.statuses || ['enabled','paused','degraded','disabled','archived'];
  const rows = response?.jobs || [];
  const summary = response?.summary;

  const metrics = executionMetrics.data;
  const runStatusCounts = metrics?.by_status || [];
  const failingMetricJobs = metrics?.failing_jobs || [];
  const slowestMetricJobs = metrics?.slowest_jobs || [];
  const defaultOperationalJobs = defaultJobs.data?.jobs || [];
  const handlerOptions = workerHandlers.data?.handlers || [];
  const trackedWorkers = workerHeartbeats.data || [];
  const noWorkerHeartbeats = trackedWorkers.length === 0;
  const staleWorkers = trackedWorkers.filter((worker) => worker.is_stale);
  const unhealthyStatusWorkers = trackedWorkers.filter((worker) => worker.is_unhealthy_status);
  const flappingWorkers = trackedWorkers.filter((worker) => worker.is_flapping);
  const identityChangedWorkers = trackedWorkers.filter((worker) => Number(worker.identity_changed_count || 0) > 0);
  const recentIdentityChangedWorkers = trackedWorkers.filter((worker) => worker.is_identity_changed_recent);
  const runClaimMismatchWorkers = trackedWorkers.filter((worker) => worker.is_run_claim_mismatch);
  const missingSourceWorkers = trackedWorkers.filter((worker) => worker.is_missing_source);

  return (
    <div style={styles.page}>
      <header style={styles.header}><div><h1 style={styles.title}>Operational jobs</h1><p style={styles.subtitle}>Track recurring platform work such as backups, retention scans, billing syncs, webhook delivery, health scans, and SLA checks.</p></div></header>
      <section style={styles.metrics}><div style={styles.metric}><strong>{summary?.total ?? 0}</strong><span>Total shown</span></div><div style={styles.metric}><strong>{summary?.overdue ?? 0}</strong><span>Overdue</span></div><div style={styles.metric}><strong>{summary?.failing ?? 0}</strong><span>Failing threshold</span></div><div style={styles.metric}><strong>{summary?.last_failed ?? 0}</strong><span>Last run failed</span></div><div style={styles.metric}><strong>{summary?.claimed ?? 0}</strong><span>Active claims</span></div><div style={styles.metric}><strong>{summary?.expired_claims ?? 0}</strong><span>Expired claims</span></div><div style={styles.metric}><strong>{summary?.dead_lettered ?? 0}</strong><span>Dead-lettered</span></div><div style={styles.metric}><strong>{summary?.retry_due ?? 0}</strong><span>Retry due</span></div></section>


      <section style={styles.panel}>
        <div style={styles.cardTop}>
          <div>
            <h2 style={styles.sectionTitle}>Worker execution evidence</h2>
            <p style={styles.muted}>Durable run evidence from the last {metrics?.days ?? 14} days. Use this to prove the scheduler is really executing jobs, not only configured.</p>
          </div>
          <button type="button" onClick={() => executionMetrics.refetch()} style={styles.secondaryButton}>Refresh execution evidence</button>
        </div>
        <div style={styles.metrics}>
          <div style={styles.metric}><strong>{runStatusCounts.reduce((sum, item) => sum + Number(item.count || 0), 0)}</strong><span>Total recorded runs</span></div>
          <div style={styles.metric}><strong>{runStatusCounts.find((item) => item.status === 'success')?.count ?? 0}</strong><span>Successful runs</span></div>
          <div style={styles.metric}><strong>{runStatusCounts.find((item) => item.status === 'failed')?.count ?? 0}</strong><span>Failed runs</span></div>
          <div style={styles.metric}><strong>{metrics?.stale_claims ?? 0}</strong><span>Stale active claims</span></div>
        </div>
        {executionMetrics.isLoading ? <p>Loading execution evidence…</p> : null}
        <div style={styles.grid2}>
          <div>
            <h3 style={styles.smallTitle}>Failing jobs</h3>
            {failingMetricJobs.length === 0 ? <p style={styles.muted}>No failing jobs in the current evidence window.</p> : <ul style={styles.simpleList}>{failingMetricJobs.slice(0, 5).map((job) => <li key={job.id} style={styles.listItem}><strong>{job.name}</strong><span>{job.job_key}</span><span style={styles.muted}>Failures: {job.consecutive_failures}/{job.failure_threshold} · Last failure: {dateTime(job.last_failure_at)}</span>{job.last_error ? <span style={styles.errorText}>{job.last_error}</span> : null}</li>)}</ul>}
          </div>
          <div>
            <h3 style={styles.smallTitle}>Slowest jobs</h3>
            {slowestMetricJobs.length === 0 ? <p style={styles.muted}>No duration evidence recorded yet.</p> : <ul style={styles.simpleList}>{slowestMetricJobs.slice(0, 5).map((job) => <li key={job.job_id} style={styles.listItem}><strong>{job.runs} run(s)</strong><span>Average: {job.avg_duration_ms ?? '—'} ms · Max: {job.max_duration_ms ?? '—'} ms</span><span style={styles.muted}>{job.job_id}</span></li>)}</ul>}
          </div>
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.cardTop}>
          <div>
            <h2 style={styles.sectionTitle}>Scheduler / worker state</h2>
            <p style={styles.muted}>Heartbeat checks now create, replace, or resolve operational notifications. Recent worker identity changes produce critical notification evidence, and production workers missing source metadata now produce warning evidence, and workers reporting impossible job/run claims now produce critical evidence.</p>
          </div>
          <div style={styles.actions}>
            <button type="button" onClick={() => { dueJobs.refetch(); workerHeartbeats.refetch(); }} style={styles.secondaryButton}>Refresh scheduler state</button>
            {canWrite ? <button type="button" onClick={() => runHeartbeatCheck.mutate()} disabled={runHeartbeatCheck.isPending} style={(staleWorkers.length || unhealthyStatusWorkers.length || flappingWorkers.length || recentIdentityChangedWorkers.length || runClaimMismatchWorkers.length || noWorkerHeartbeats) ? styles.dangerButton : styles.secondaryButton}>Run heartbeat check</button> : null}
          </div>
        </div>
        <div style={styles.metrics}>
          <div style={styles.metric}><strong>{trackedWorkers.length}</strong><span>Tracked workers</span></div>
          <div style={styles.metric}><strong>{staleWorkers.length}</strong><span>Stale workers</span></div>
          <div style={styles.metric}><strong>{unhealthyStatusWorkers.length}</strong><span>Unhealthy status</span></div><div style={styles.metric}><strong>{flappingWorkers.length}</strong><span>Flapping workers</span></div><div style={styles.metric}><strong>{trackedWorkers.reduce((sum, worker) => sum + Number(worker.status_changed_count || 0), 0)}</strong><span>Status transitions</span></div><div style={styles.metric}><strong>{identityChangedWorkers.length}</strong><span>Identity changed</span></div><div style={styles.metric}><strong>{recentIdentityChangedWorkers.length}</strong><span>Recent identity risk</span></div><div style={styles.metric}><strong>{runClaimMismatchWorkers.length}</strong><span>Run claim mismatch</span></div><div style={styles.metric}><strong>{missingSourceWorkers.length}</strong><span>Missing source</span></div>
          <div style={styles.metric}><strong>{heartbeatCheckResult?.notification_action || '—'}</strong><span>Notification action</span></div><div style={styles.metric}><strong>{heartbeatCheckResult?.obsolete_notification_resolved_count ?? '—'}</strong><span>Obsolete alerts resolved</span></div>
        </div>
        {heartbeatCheckResult ? <p style={(heartbeatCheckResult.no_workers || heartbeatCheckResult.stale || heartbeatCheckResult.unhealthy_status || heartbeatCheckResult.flapping || heartbeatCheckResult.identity_changed || heartbeatCheckResult.run_claim_mismatch || heartbeatCheckResult.missing_source) ? styles.errorText : styles.note}>Heartbeat check {label(heartbeatCheckResult.status)}: {heartbeatCheckResult.checked} checked, {heartbeatCheckResult.stale} stale, {heartbeatCheckResult.unhealthy_status ?? 0} unhealthy status, {heartbeatCheckResult.flapping ?? 0} flapping, {heartbeatCheckResult.identity_changed ?? 0} recent identity change(s), {heartbeatCheckResult.run_claim_mismatch ?? 0} run-claim mismatch, {heartbeatCheckResult.missing_source ?? 0} missing source{heartbeatCheckResult.no_workers ? ', no workers recorded' : ''}, notification {heartbeatCheckResult.notification_action}{heartbeatCheckResult.notification_resolved_count ? `, resolved ${heartbeatCheckResult.notification_resolved_count}` : ''}{heartbeatCheckResult.obsolete_notification_resolved_count ? `, replaced/resolved obsolete alerts ${heartbeatCheckResult.obsolete_notification_resolved_count}` : ''}.</p> : null}
        {noWorkerHeartbeats ? <p style={styles.errorText}>No operational worker heartbeat has been recorded. The heartbeat check will create a critical notification because scheduled jobs may not be running.</p> : null}
        {unhealthyStatusWorkers.length ? <p style={styles.errorText}>{unhealthyStatusWorkers.length} worker heartbeat(s) are recent but report an unhealthy status. The heartbeat check will create or refresh operational notification evidence.</p> : null}
        {flappingWorkers.length ? <p style={styles.errorText}>{flappingWorkers.length} worker heartbeat(s) changed status too often with unhealthy transitions in the active transition window. The heartbeat check will create or refresh flapping-worker notification evidence.</p> : null}
        {recentIdentityChangedWorkers.length ? <p style={styles.errorText}>{recentIdentityChangedWorkers.length} worker heartbeat identity change(s) happened in the active evidence window. The heartbeat check will create critical notification evidence until the identity-change window clears.</p> : identityChangedWorkers.length ? <p style={styles.note}>{identityChangedWorkers.length} worker heartbeat(s) have older identity-change evidence. Confirm these were expected redeploys or host changes, not a reused/spoofed worker id.</p> : null}
        {runClaimMismatchWorkers.length ? <p style={styles.errorText}>{runClaimMismatchWorkers.length} worker heartbeat(s) report current job/run claims that do not match running job-run state. The heartbeat check will create critical evidence because the scheduler may be claiming impossible work.</p> : null}
        {missingSourceWorkers.length ? <p style={styles.errorText}>{missingSourceWorkers.length} non-manual worker heartbeat(s) are missing source metadata. Add metadata.source, metadata.component, metadata.hostname, or metadata.host so identity-change evidence is meaningful.</p> : null}
        <div style={styles.grid2}>
          <div>
            <h3 style={styles.smallTitle}>Due jobs</h3>
            {(dueJobs.data || []).length === 0 ? <p style={styles.muted}>No jobs are currently due for scheduler execution.</p> : (
              <ul style={styles.simpleList}>
                {(dueJobs.data || []).map((job) => (
                  <li key={job.id} style={styles.listItem}>
                    <strong>{job.name}</strong><span style={styles.muted}>Worker: {job.worker_enabled ? (job.worker_dry_run ? 'dry-run' : 'enabled') : 'disabled'}{job.worker_handler ? ` · ${job.worker_handler}` : ''}{job.last_alerted_at ? ` · Last alert: ${dateTime(job.last_alerted_at)}` : ''}</span>
                    <span>{job.next_retry_at ? `Retry due ${dateTime(job.next_retry_at)}` : `Next run ${dateTime(job.next_run_at)}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 style={styles.smallTitle}>Worker heartbeats</h3>
            {trackedWorkers.length === 0 ? <p style={styles.errorText}>No scheduler or worker heartbeats recorded yet. Run the heartbeat check to create missing-worker operational evidence.</p> : (
              <ul style={styles.simpleList}>
                {trackedWorkers.map((worker) => (
                  <li key={worker.id} style={styles.listItem}>
                    <strong>{worker.worker_id}</strong>
                    <span>{worker.status}{worker.is_stale ? ' · stale' : worker.is_unhealthy_status ? ' · unhealthy status' : worker.is_flapping ? ' · flapping' : worker.is_run_claim_mismatch ? ' · run claim mismatch' : ' · healthy'} · {dateTime(worker.last_seen_at)}</span>
                    <span style={styles.muted}>Type: {worker.worker_type} · Job: {worker.current_job_id || '—'} · Run: {worker.current_run_id || '—'}</span>
                    <span style={styles.muted}>Run claim evidence: status {worker.reported_run_status || '—'} · finished {dateTime(worker.reported_run_finished_at)} · run job {worker.reported_run_job_id || '—'} · job current run {worker.reported_job_current_run_id || '—'}</span>
                    <span style={styles.muted}>Registered: {dateTime(worker.created_at)} · Last updated: {dateTime(worker.updated_at)}</span>
                    <span style={styles.muted}>Source evidence: {metadataSummary(worker.metadata)}</span>
                    <span style={styles.muted}>Identity changes: {worker.identity_changed_count ?? 0} · Last identity change: {dateTime(worker.last_identity_changed_at)}</span>
                    {(worker.last_identity_change_metadata && Object.keys(worker.last_identity_change_metadata).length) ? <span style={styles.muted}>Identity evidence: {metadataSummary(worker.last_identity_change_metadata)}</span> : null}
                    <span style={styles.muted}>Status changes: {worker.status_changed_count ?? 0} · Window changes: {worker.status_change_window_count ?? 0} · Unhealthy window changes: {worker.unhealthy_status_change_window_count ?? 0} · Window start: {dateTime(worker.status_change_window_started_at)}</span>
                    <span style={styles.muted}>Last status change: {dateTime(worker.last_status_changed_at)}</span>
                    {(worker.last_status_change_metadata && Object.keys(worker.last_status_change_metadata).length) ? <span style={styles.muted}>Transition evidence: {metadataSummary(worker.last_status_change_metadata)}</span> : null}
                    {worker.is_stale ? <span style={styles.errorText}>This worker is stale and should have an operational notification after the heartbeat check runs.</span> : null}
                    {worker.is_unhealthy_status ? <span style={styles.errorText}>This worker heartbeat is recent, but its reported status is unhealthy and should create notification evidence.</span> : null}
                    {worker.is_flapping ? <span style={styles.errorText}>This worker changed status too often with unhealthy transitions in the active window and should create flapping-worker notification evidence. Normal online/running lifecycle changes are not enough by themselves.</span> : null}
                    {worker.is_identity_changed_recent ? <span style={styles.errorText}>This worker id recently changed type/source and should create identity-risk notification evidence after the heartbeat check runs.</span> : null}
                    {worker.is_run_claim_mismatch ? <span style={styles.errorText}>This worker reports a current run/job claim that is missing, finished, not running, or not the job's active claim. Run the heartbeat check to create critical evidence.</span> : null}
                    {worker.is_missing_source ? <span style={styles.errorText}>This non-manual worker is missing source metadata, so identity-change monitoring cannot prove where the worker is reporting from.</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.cardTop}>
          <div>
            <h2 style={styles.sectionTitle}>Default worker coverage</h2>
            <p style={styles.muted}>Registered handlers: {handlerOptions.length}. Default jobs include the integration-monitoring notification scan so risk notifications can run from the operational worker instead of only by manual button.</p>
          </div>
        </div>
        <div style={styles.cards}>
          {defaultOperationalJobs.filter((job) => job.worker_handler === 'integration_monitoring_notification_scan' || job.job_key === 'platform.integration_monitoring.notification_scan').map((job) => (
            <article key={job.job_key} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <strong>{job.name}</strong>
                  <div style={styles.muted}>{job.job_key}</div>
                </div>
                <span style={styles.badgeGood}>{job.worker_handler}</span>
              </div>
              <div style={styles.details}>
                <span>Category: {label(job.category)}</span>
                <span>Schedule: {job.schedule_label || '—'}</span>
                <span>Recurrence: {label(job.recurrence_type)} {job.recurrence_interval || ''}</span>
              </div>
              {job.notes ? <p style={styles.note}>{job.notes}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section style={styles.panel}><div style={styles.cardTop}><h2 style={styles.sectionTitle}>Filters</h2>{canWrite ? <><button type="button" onClick={() => releaseExpiredClaims.mutate()} disabled={releaseExpiredClaims.isPending} style={styles.secondaryButton}>Release expired claims</button><button type="button" onClick={() => recoverStaleClaims.mutate()} disabled={recoverStaleClaims.isPending} style={styles.secondaryButton}>Recover stale claims</button><button type="button" onClick={() => runWorkerOnce.mutate()} disabled={runWorkerOnce.isPending} style={styles.primaryButton}>Run worker once</button></> : null}</div><div style={styles.grid4}><select value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))} style={styles.input}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Search jobs" style={styles.input} /><label style={styles.checkRow}><input type="checkbox" checked={filters.attention_only} onChange={(event) => setFilters((prev) => ({ ...prev, attention_only: event.target.checked }))} /> Attention only</label><label style={styles.checkRow}><input type="checkbox" checked={filters.include_archived} onChange={(event) => setFilters((prev) => ({ ...prev, include_archived: event.target.checked }))} /> Include archived</label></div></section>
      {canWrite ? <section id="platform-operational-jobs-form" style={styles.panel}>
        <h2 style={styles.sectionTitle}>{editingId ? 'Edit job' : 'Add job'}</h2>
        {(!form.name.trim() || !form.job_key.trim()) ? <p style={styles.validationText}>Job name and job key are required before creating an operational job.</p> : null}
        <div style={styles.grid3}>
          <label style={styles.fieldLabel}>Job name<input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Example: Nightly retention scan" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Job key<input value={form.job_key} onChange={(event) => setForm((prev) => ({ ...prev, job_key: event.target.value }))} placeholder="example.nightly.retention_scan" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Schedule label<input value={form.schedule_label} onChange={(event) => setForm((prev) => ({ ...prev, schedule_label: event.target.value }))} placeholder="Manual test / Every hour" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Recurrence type<select value={form.recurrence_type} onChange={(event) => setForm((prev) => ({ ...prev, recurrence_type: event.target.value }))} style={styles.input}><option value="manual">Manual</option><option value="minutes">Every N minutes</option><option value="hours">Every N hours</option><option value="days">Every N days</option><option value="weeks">Every N weeks</option></select></label>
          <label style={styles.fieldLabel}>Recurrence interval<input value={form.recurrence_interval} onChange={(event) => setForm((prev) => ({ ...prev, recurrence_interval: event.target.value }))} placeholder="Required for minutes/hours/days/weeks" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Worker handler<input value={form.worker_handler} onChange={(event) => setForm((prev) => ({ ...prev, worker_handler: event.target.value }))} placeholder="Registered worker handler" style={styles.input} /></label>
          <label style={styles.checkRow}><input type="checkbox" checked={form.worker_enabled} onChange={(event) => setForm((prev) => ({ ...prev, worker_enabled: event.target.checked }))} /> Enable worker execution</label>
          <label style={styles.checkRow}><input type="checkbox" checked={form.worker_dry_run} onChange={(event) => setForm((prev) => ({ ...prev, worker_dry_run: event.target.checked }))} /> Dry run</label>
          <label style={styles.checkRow}><input type="checkbox" checked={form.alert_on_failure} onChange={(event) => setForm((prev) => ({ ...prev, alert_on_failure: event.target.checked }))} /> Alert on failure</label>
          <label style={styles.checkRow}><input type="checkbox" checked={form.alert_on_dead_letter} onChange={(event) => setForm((prev) => ({ ...prev, alert_on_dead_letter: event.target.checked }))} /> Alert on dead-letter</label>
          <label style={styles.fieldLabel}>Category<select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} style={styles.input}>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
          <label style={styles.fieldLabel}>Status<select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
          <label style={styles.fieldLabel}>Failure threshold<input value={form.failure_threshold} onChange={(event) => setForm((prev) => ({ ...prev, failure_threshold: event.target.value }))} type="number" min="1" max="100" placeholder="3" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Next run at<input value={form.next_run_at} onChange={(event) => setForm((prev) => ({ ...prev, next_run_at: event.target.value }))} type="datetime-local" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Owner<select value={form.owner_platform_user_id} onChange={(event) => setForm((prev) => ({ ...prev, owner_platform_user_id: event.target.value }))} style={styles.input}><option value="">No owner</option>{(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select></label>
          <label style={styles.fieldLabel}>Runbook<select value={form.runbook_id} onChange={(event) => setForm((prev) => ({ ...prev, runbook_id: event.target.value }))} style={styles.input}><option value="">No runbook</option>{(runbooks.data?.runbooks || []).map((runbook) => <option key={runbook.id} value={runbook.id}>{runbook.title}</option>)}</select></label>
        </div>
        <label style={styles.fieldLabel}>Notes<textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Optional operational notes" style={styles.textarea} /></label>
        <div style={styles.actions}>
          <button type="button" onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim() || !form.job_key.trim()} style={{ ...styles.primaryButton, ...((save.isPending || !form.name.trim() || !form.job_key.trim()) ? styles.disabledButton : {}) }}>{editingId ? 'Save job' : 'Create job'}</button>
          {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} style={styles.secondaryButton}>Cancel edit</button> : null}
        </div>
      </section> : null}
      {runJobId && canWrite ? <section style={styles.panel}><h2 style={styles.sectionTitle}>Record job run</h2><div style={styles.grid4}><label style={styles.fieldLabel}>Run status<select value={runForm.last_status} onChange={(event) => setRunForm((prev) => ({ ...prev, last_status: event.target.value }))} style={styles.input}>{(response?.run_statuses || ['success','failed','skipped','running']).map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label><label style={styles.fieldLabel}>Duration ms<input value={runForm.last_duration_ms} onChange={(event) => setRunForm((prev) => ({ ...prev, last_duration_ms: event.target.value }))} type="number" min="0" placeholder="Duration ms" style={styles.input} /></label><label style={styles.fieldLabel}>Next run at<input value={runForm.next_run_at} onChange={(event) => setRunForm((prev) => ({ ...prev, next_run_at: event.target.value }))} type="datetime-local" style={styles.input} /></label><label style={styles.fieldLabel}>Error / note<input value={runForm.last_error} onChange={(event) => setRunForm((prev) => ({ ...prev, last_error: event.target.value }))} placeholder="Error / note" style={styles.input} /></label></div><div style={styles.actions}><button type="button" onClick={() => recordRun.mutate()} disabled={recordRun.isPending} style={styles.primaryButton}>Save run result</button><button type="button" onClick={() => setRunJobId(null)} style={styles.secondaryButton}>Cancel</button></div></section> : null}

      {historyJobId ? <section style={styles.panel}><h2 style={styles.sectionTitle}>Recent execution history</h2>{jobRuns.isLoading ? <p>Loading run history…</p> : null}{(jobRuns.data?.runs || []).length === 0 && !jobRuns.isLoading ? <p>No run history recorded for this job yet.</p> : null}<div style={styles.cards}>{(jobRuns.data?.runs || []).map((run) => <article key={run.id} style={styles.card}><div style={styles.cardTop}><div><strong>{label(run.status)}</strong><div style={styles.muted}>Started: {dateTime(run.started_at)}</div></div><span style={run.status === 'success' ? styles.badgeGood : run.status === 'failed' ? styles.badgeDanger : styles.badgeMuted}>{label(run.status)}</span></div><div style={styles.details}><span>Finished: {dateTime(run.finished_at)}</span><span>Duration: {run.duration_ms ?? '—'} ms</span><span>Triggered by: {run.triggered_by_email || '—'}</span><span>Worker: {run.worker_id || '—'}</span><span>Evidence: {metadataSummary(run.worker_metadata)}</span></div>{run.error_message ? <p style={styles.errorText}>{run.error_message}</p> : null}</article>)}</div></section> : null}
      <section style={styles.panel}><h2 style={styles.sectionTitle}>Jobs</h2>{jobs.isLoading ? <p>Loading jobs…</p> : null}{rows.length === 0 && !jobs.isLoading ? <p>No jobs found.</p> : null}<div style={styles.cards}>{rows.map((job) => <article key={job.id} style={styles.card}><div style={styles.cardTop}><div><strong>{job.name}</strong><div style={styles.muted}>{job.job_key}</div></div><span style={statusStyle(job)}>{label(job.status)}</span></div><div style={styles.details}><span>Category: {label(job.category)}</span><span>Schedule: {job.schedule_label || '—'}</span><span>Owner: {job.owner_email || '—'}</span><span>Runbook: {job.runbook_title || '—'}</span><span>Last run: {dateTime(job.last_run_at)}</span><span>Last status: {label(job.last_status)}</span><span>Duration: {job.last_duration_ms ?? '—'} ms</span><span>Next run: {dateTime(job.next_run_at)}</span><span>Failures: {job.consecutive_failures}/{job.failure_threshold}</span><span>Claimed by: {job.claimed_by_email || '—'}</span><span>Claim expires: {dateTime(job.claim_expires_at)}</span><span>Next retry: {dateTime(job.next_retry_at)}</span><span>Dead-lettered: {dateTime(job.dead_lettered_at)}</span></div>{job.last_error && !(job.last_status === 'skipped' && job.last_error === 'Claim released manually') ? <p style={styles.errorText}>{job.last_error}</p> : null}{job.notes ? <p style={styles.note}><strong>Notes:</strong> {job.notes}</p> : null}{canWrite ? <div style={styles.actions}><button type="button" onClick={() => { setEditingId(job.id); setForm(toForm(job)); scrollToFormSection('platform-operational-jobs-form'); }} style={styles.secondaryButton}>Edit</button><button type="button" onClick={() => { setRunJobId(job.id); setRunForm(runFormDefault); }} style={styles.secondaryButton}>Record run</button><button type="button" onClick={() => setHistoryJobId((current) => current === job.id ? null : job.id)} style={styles.secondaryButton}>History</button>{!job.current_run_id && job.status !== 'archived' ? <button type="button" onClick={() => claimJob.mutate(job.id)} disabled={claimJob.isPending} style={styles.secondaryButton}>Claim</button> : null}{job.current_run_id ? <button type="button" onClick={() => completeClaim.mutate({ id: job.id, runId: job.current_run_id as string, status: 'success' })} disabled={completeClaim.isPending} style={styles.primaryButton}>Complete success</button> : null}{job.current_run_id ? <button type="button" onClick={() => completeClaim.mutate({ id: job.id, runId: job.current_run_id as string, status: 'failed' })} disabled={completeClaim.isPending} style={styles.dangerButton}>Complete failed</button> : null}{job.current_run_id ? <button type="button" onClick={() => releaseClaim.mutate(job.id)} disabled={releaseClaim.isPending} style={styles.secondaryButton}>Release claim</button> : null}{job.dead_lettered_at || job.last_status === 'failed' ? <button type="button" onClick={() => scheduleRetry.mutate(job.id)} disabled={scheduleRetry.isPending} style={styles.secondaryButton}>Retry now</button> : null}{job.status !== 'archived' ? <button type="button" onClick={() => archive.mutate(job.id)} style={styles.dangerButton}>Archive</button> : null}</div> : null}</article>)}</div></section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  smallTitle: { margin: '0 0 0.5rem', fontSize: '1rem' },
  simpleList: { display: 'grid', gap: '0.5rem', padding: 0, margin: 0, listStyle: 'none' },
  listItem: { display: 'grid', gap: '0.15rem', padding: '0.6rem', border: '1px solid #d8dee9', borderRadius: 8, background: '#fff' }, page: { display: 'flex', flexDirection: 'column', gap: 20 }, header: { display: 'flex', justifyContent: 'space-between', gap: 16 }, title: { margin: 0, fontSize: 28 }, subtitle: { margin: '6px 0 0', color: '#555', maxWidth: 900 }, metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }, metric: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }, panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }, sectionTitle: { margin: 0, fontSize: 18 }, grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }, grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }, grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, alignItems: 'center' }, fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, color: '#374151', fontSize: 13, fontWeight: 600 }, input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10 }, textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, minHeight: 86 }, checkRow: { display: 'flex', alignItems: 'center', gap: 8, color: '#374151' }, actions: { display: 'flex', gap: 8, flexWrap: 'wrap' }, primaryButton: { background: '#111827', color: '#fff', border: 0, borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }, secondaryButton: { background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }, dangerButton: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }, disabledButton: { opacity: 0.5, cursor: 'not-allowed' }, validationText: { margin: 0, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', padding: 10, borderRadius: 10 }, cards: { display: 'grid', gap: 12 }, card: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }, cardTop: { display: 'flex', justifyContent: 'space-between', gap: 12 }, details: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, color: '#374151', fontSize: 13 }, badge: { borderRadius: 999, padding: '4px 9px', background: '#eef2ff', color: '#3730a3', alignSelf: 'flex-start' }, badgeGood: { borderRadius: 999, padding: '4px 9px', background: '#dcfce7', color: '#166534', alignSelf: 'flex-start' }, badgeWarn: { borderRadius: 999, padding: '4px 9px', background: '#fef3c7', color: '#92400e', alignSelf: 'flex-start' }, badgeDanger: { borderRadius: 999, padding: '4px 9px', background: '#fee2e2', color: '#991b1b', alignSelf: 'flex-start' }, badgeMuted: { borderRadius: 999, padding: '4px 9px', background: '#f3f4f6', color: '#4b5563', alignSelf: 'flex-start' }, muted: { color: '#6b7280', fontSize: 13 }, errorText: { margin: 0, color: '#991b1b', background: '#fef2f2', padding: 10, borderRadius: 10 }, note: { margin: 0, color: '#374151', background: '#f9fafb', padding: 10, borderRadius: 10 } };
