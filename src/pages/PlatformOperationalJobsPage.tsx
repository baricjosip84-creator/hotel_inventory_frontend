import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformOperationalJobsPage.css';

type PlatformUser = { id: string; email: string; is_active?: boolean };
type Runbook = { id: string; title: string; is_active?: boolean };
type Pagination = { limit: number; offset: number; total: number; has_more: boolean };
type EvidenceAccess = { platform_user_identity: boolean; runbook_identity: boolean };
type EvidenceContract = {
  application_registry_only: boolean;
  run_records_are_application_execution_evidence: boolean;
  successful_run_does_not_prove_external_business_outcome: boolean;
  scheduler_heartbeat_does_not_prove_external_dependency_health: boolean;
  worker_handler_success_reflects_application_handler_result_only: boolean;
};
type Job = {
  id: string; name: string; job_key: string; category: string; status: string; schedule_label?: string | null;
  owner_platform_user_id?: string | null; owner_email?: string | null; owner_present?: boolean;
  runbook_id?: string | null; runbook_title?: string | null; runbook_present?: boolean;
  last_run_at?: string | null; last_status?: string | null; last_duration_ms?: number | null; last_error?: string | null; next_run_at?: string | null;
  consecutive_failures: number; failure_threshold: number; overdue?: boolean; failing_attention?: boolean; notes?: string | null; updated_at: string;
  current_run_id?: string | null; current_run_started_at?: string | null; claimed_by_platform_user_id?: string | null; claimed_by_email?: string | null;
  claim_expires_at?: string | null; actively_claimed?: boolean; dead_lettered_at?: string | null; next_retry_at?: string | null; last_retry_scheduled_at?: string | null;
  dead_lettered?: boolean; retry_due?: boolean; worker_handler?: string | null; worker_payload?: Record<string, unknown> | null; worker_enabled?: boolean;
  worker_dry_run?: boolean; last_worker_id?: string | null; last_worker_result?: Record<string, unknown> | null; alert_on_failure?: boolean;
  alert_on_dead_letter?: boolean; last_alerted_at?: string | null; recurrence_type?: string; recurrence_interval?: number | null; recurrence_anchor_at?: string | null;
  last_success_at?: string | null; last_failure_at?: string | null;
};
type JobRun = { id: string; job_id: string; started_at: string; finished_at?: string | null; status: string; duration_ms?: number | null; error_message?: string | null; triggered_by_email?: string | null; triggering_actor_present?: boolean; worker_id?: string | null; worker_metadata?: Record<string, unknown> | null; created_at: string };
type JobRunsResponse = { runs: JobRun[]; pagination: Pagination; evidence_access: EvidenceAccess };
type ExecutionMetricsResponse = { days: number; by_status: { status: string; count: number }[]; slowest_jobs: { job_id: string; runs: number; avg_duration_ms?: number | null; max_duration_ms?: number | null }[]; failing_jobs: { id: string; name: string; job_key: string; consecutive_failures: number; failure_threshold: number; last_error?: string | null; last_failure_at?: string | null }[]; stale_claims: number };
type WorkerHeartbeat = { id: string; worker_id: string; worker_type: string; status: string; last_seen_at: string; created_at?: string | null; updated_at?: string | null; current_job_id?: string | null; current_run_id?: string | null; reported_run_status?: string | null; reported_run_finished_at?: string | null; reported_run_job_id?: string | null; reported_job_current_run_id?: string | null; is_stale?: boolean; is_unhealthy_status?: boolean; is_flapping?: boolean; is_identity_changed_recent?: boolean; is_run_claim_mismatch?: boolean; is_missing_source?: boolean; metadata?: Record<string, unknown>; last_status_changed_at?: string | null; status_changed_count?: number; last_status_change_metadata?: Record<string, unknown> | null; status_change_window_started_at?: string | null; status_change_window_count?: number | null; unhealthy_status_change_window_count?: number | null; last_identity_changed_at?: string | null; identity_changed_count?: number | null; last_identity_change_metadata?: Record<string, unknown> | null };
type WorkerHeartbeatCheck = { status: string; checked: number; stale: number; unhealthy_status?: number; flapping?: number; identity_changed?: number; run_claim_mismatch?: number; missing_source?: number; no_workers?: boolean; stale_after_seconds: number; notification_action: string; notification_id?: string | null; notification_resolved_count?: number; obsolete_notification_resolved_count?: number };
type WorkerHandlerOption = string | { key: string; label?: string; description?: string };
type DefaultOperationalJob = { name: string; job_key: string; category: string; worker_handler: string; recurrence_type: string; recurrence_interval?: number; schedule_label?: string; notes?: string };
type JobsResponse = { jobs: Job[]; summary: { total: number; overdue: number; failing: number; last_failed: number; claimed: number; expired_claims: number; dead_lettered: number; retry_due: number; by_status: Record<string, number>; by_category: Record<string, number> }; pagination: Pagination; evidence_access: EvidenceAccess; evidence_contract: EvidenceContract; categories: string[]; statuses: string[]; mutable_statuses: string[]; run_statuses: string[] };

type JobForm = { name: string; job_key: string; category: string; status: string; schedule_label: string; owner_platform_user_id: string; next_run_at: string; failure_threshold: string; runbook_id: string; notes: string; worker_handler: string; worker_payload: string; worker_enabled: boolean; worker_dry_run: boolean; alert_on_failure: boolean; alert_on_dead_letter: boolean; recurrence_type: string; recurrence_interval: string; recurrence_anchor_at: string };
type RunForm = { last_status: string; last_duration_ms: string; last_error: string; next_run_at: string };

const PAGE_SIZE = 50;
const FALLBACK_CATEGORIES = ['backup','billing','notification','webhook','retention','health_scan','sla_scan','maintenance','reporting','operational','other'];
const FALLBACK_STATUSES = ['enabled','paused','degraded','disabled','archived'];
const MUTABLE_STATUSES = FALLBACK_STATUSES.filter((status) => status !== 'archived');
const emptyForm = (): JobForm => ({ name: '', job_key: '', category: 'operational', status: 'enabled', schedule_label: '', owner_platform_user_id: '', next_run_at: '', failure_threshold: '3', runbook_id: '', notes: '', worker_handler: '', worker_payload: '{}', worker_enabled: false, worker_dry_run: true, alert_on_failure: true, alert_on_dead_letter: true, recurrence_type: 'manual', recurrence_interval: '', recurrence_anchor_at: '' });
const emptyRunForm = (): RunForm => ({ last_status: 'success', last_duration_ms: '', last_error: '', next_run_at: '' });

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function clean(value: string) { const trimmed = value.trim(); return trimmed || null; }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function dateTime(value?: string | null) { if (!value) return 'Not recorded'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString(); }
function toLocalDateTimeInput(value?: string | null) { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const pad = (part: number) => String(part).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function parseWorkerPayload(value: string) { try { const parsed = value.trim() ? JSON.parse(value) : {}; return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null; } catch { return null; } }
function metadataSummary(value?: Record<string, unknown> | null) { const entries = Object.entries(value || {}); return entries.length ? entries.slice(0, 4).map(([key, val]) => `${key}: ${typeof val === 'object' ? JSON.stringify(val).slice(0, 80) : String(val)}`).join(' · ') : 'Not recorded'; }
function jobKeyLooksValid(value: string) { return /^[a-z0-9][a-z0-9._:-]{2,119}$/.test(value.trim().toLowerCase()); }
function jobTone(job: Job) { if (job.status === 'archived') return 'neutral'; if (job.status === 'degraded' || job.failing_attention || job.last_status === 'failed' || job.dead_lettered_at) return 'danger'; if (job.status === 'paused' || job.overdue || job.retry_due) return 'warn'; return 'good'; }
function toForm(job: Job): JobForm { return { name: job.name || '', job_key: job.job_key || '', category: job.category || 'operational', status: job.status === 'archived' ? 'enabled' : job.status || 'enabled', schedule_label: job.schedule_label || '', owner_platform_user_id: job.owner_platform_user_id || '', next_run_at: toLocalDateTimeInput(job.next_run_at), failure_threshold: String(job.failure_threshold || 3), runbook_id: job.runbook_id || '', notes: job.notes || '', worker_handler: job.worker_handler || '', worker_payload: JSON.stringify(job.worker_payload || {}, null, 2), worker_enabled: Boolean(job.worker_enabled), worker_dry_run: job.worker_dry_run !== false, alert_on_failure: job.alert_on_failure !== false, alert_on_dead_letter: job.alert_on_dead_letter !== false, recurrence_type: job.recurrence_type || 'manual', recurrence_interval: job.recurrence_interval ? String(job.recurrence_interval) : '', recurrence_anchor_at: toLocalDateTimeInput(job.recurrence_anchor_at) }; }

export default function PlatformOperationalJobsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_WRITE);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadRunbooks = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ);
  const canReadNotifications = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ);
  const canReadDependencies = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const requestedCategory = searchParams.get('category') || '';
  const requestedStatus = searchParams.get('status') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedAttention = searchParams.get('attention_only');
  const requestedArchived = searchParams.get('include_archived');
  const category = FALLBACK_CATEGORIES.includes(requestedCategory) ? requestedCategory : '';
  const status = FALLBACK_STATUSES.includes(requestedStatus) ? requestedStatus : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const attentionOnly = requestedAttention === null ? true : requestedAttention === 'true';
  const includeArchived = requestedArchived === 'true';
  const invalidFilters = Boolean((requestedCategory && !category) || (requestedStatus && !status) || (requestedSearch && !search) || (requestedAttention !== null && !['true','false'].includes(requestedAttention)) || (requestedArchived !== null && !['true','false'].includes(requestedArchived)));

  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState<JobForm>(() => emptyForm());
  const [editingId, setEditingId] = useState('');
  const [runJobId, setRunJobId] = useState('');
  const [runForm, setRunForm] = useState<RunForm>(() => emptyRunForm());
  const [historyJobId, setHistoryJobId] = useState('');
  const [historyOffset, setHistoryOffset] = useState(0);
  const [heartbeatCheckResult, setHeartbeatCheckResult] = useState<WorkerHeartbeatCheck | null>(null);
  const [message, setMessage] = useState('');
  const [mutationError, setMutationError] = useState('');

  useEffect(() => { setOffset(0); }, [category, status, search, attentionOnly, includeArchived, invalidFilters]);
  useEffect(() => { setHistoryOffset(0); }, [historyJobId]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), attention_only: String(attentionOnly), include_archived: String(includeArchived) });
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [category, status, search, attentionOnly, includeArchived, offset]);

  const jobs = useQuery({ queryKey: ['platform', 'operational-jobs', category, status, search, attentionOnly, includeArchived, offset], queryFn: () => platformApiRequest<JobsResponse>(`/platform/operational-jobs?${queryString}`), enabled: !invalidFilters });
  const users = useQuery({ queryKey: ['platform', 'jobs-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite && canReadUsers });
  const runbooks = useQuery({ queryKey: ['platform', 'jobs-runbooks'], queryFn: () => platformApiRequest<{ runbooks: Runbook[] }>('/platform/runbooks?active=true&limit=300'), enabled: canWrite && canReadRunbooks });
  const jobRuns = useQuery({ queryKey: ['platform', 'operational-job-runs', historyJobId, historyOffset], queryFn: () => platformApiRequest<JobRunsResponse>(`/platform/operational-jobs/${historyJobId}/runs?limit=25&offset=${historyOffset}`), enabled: Boolean(historyJobId) });
  const dueJobs = useQuery({ queryKey: ['platform', 'operational-jobs-due'], queryFn: () => platformApiRequest<Job[]>('/platform/operational-jobs/scheduler/due?limit=25') });
  const workerHeartbeats = useQuery({ queryKey: ['platform', 'operational-worker-heartbeats'], queryFn: () => platformApiRequest<WorkerHeartbeat[]>('/platform/operational-jobs/scheduler/heartbeats?stale_after_seconds=300') });
  const executionMetrics = useQuery({ queryKey: ['platform', 'operational-execution-metrics'], queryFn: () => platformApiRequest<ExecutionMetricsResponse>('/platform/operational-jobs/execution-metrics?days=14') });
  const workerHandlers = useQuery({ queryKey: ['platform', 'worker-handler-options'], queryFn: () => platformApiRequest<{ handlers: WorkerHandlerOption[] }>('/platform/operational-jobs/worker/handlers') });
  const defaultJobs = useQuery({ queryKey: ['platform', 'operational-job-defaults'], queryFn: () => platformApiRequest<{ jobs: DefaultOperationalJob[] }>('/platform/operational-jobs/defaults') });

  const rows = jobs.data?.jobs || [];
  const summary = jobs.data?.summary;
  const pagination = jobs.data?.pagination;
  const categories = jobs.data?.categories || FALLBACK_CATEGORIES;
  const statuses = jobs.data?.statuses || FALLBACK_STATUSES;
  const mutableStatuses = jobs.data?.mutable_statuses || MUTABLE_STATUSES;
  const metrics = executionMetrics.data;
  const trackedWorkers = workerHeartbeats.data || [];
  const staleWorkers = trackedWorkers.filter((worker) => worker.is_stale);
  const unhealthyWorkers = trackedWorkers.filter((worker) => worker.is_unhealthy_status);
  const flappingWorkers = trackedWorkers.filter((worker) => worker.is_flapping);
  const mismatchWorkers = trackedWorkers.filter((worker) => worker.is_run_claim_mismatch);
  const missingSourceWorkers = trackedWorkers.filter((worker) => worker.is_missing_source);
  const noWorkers = trackedWorkers.length === 0;

  const updateUrlFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const setBoolFilter = (key: string, value: boolean) => updateUrlFilter(key, String(value));
  const refreshOperationalJobData = async (jobId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['platform', 'operational-jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['platform', 'operational-execution-metrics'] }),
      queryClient.invalidateQueries({ queryKey: ['platform', 'operational-jobs-due'] }),
      queryClient.invalidateQueries({ queryKey: ['platform', 'operational-worker-heartbeats'] }),
      jobId ? queryClient.invalidateQueries({ queryKey: ['platform', 'operational-job-runs', jobId] }) : queryClient.invalidateQueries({ queryKey: ['platform', 'operational-job-runs'] })
    ]);
  };
  const refreshPage = async () => {
    setMessage(''); setMutationError('');
    await Promise.all([jobs.refetch(), dueJobs.refetch(), workerHeartbeats.refetch(), executionMetrics.refetch(), workerHandlers.refetch(), defaultJobs.refetch(), canWrite && canReadUsers ? users.refetch() : Promise.resolve(), canWrite && canReadRunbooks ? runbooks.refetch() : Promise.resolve()]);
  };
  const handleMutationError = (error: unknown) => { setMessage(''); setMutationError(readableError(error)); };

  const detailsPayload = () => {
    const parsedWorkerPayload = parseWorkerPayload(form.worker_payload) || {};
    const body: Record<string, unknown> = {
      name: form.name.trim(), job_key: form.job_key.trim().toLowerCase(), category: form.category, status: form.status,
      schedule_label: clean(form.schedule_label), next_run_at: form.next_run_at ? new Date(form.next_run_at).toISOString() : null,
      failure_threshold: Number(form.failure_threshold || 3), notes: clean(form.notes), worker_handler: clean(form.worker_handler), worker_payload: parsedWorkerPayload,
      worker_enabled: form.worker_enabled, worker_dry_run: form.worker_dry_run, alert_on_failure: form.alert_on_failure, alert_on_dead_letter: form.alert_on_dead_letter,
      recurrence_type: form.recurrence_type, recurrence_interval: form.recurrence_type === 'manual' ? null : Number(form.recurrence_interval), recurrence_anchor_at: form.recurrence_anchor_at ? new Date(form.recurrence_anchor_at).toISOString() : null
    };
    if (canReadUsers) body.owner_platform_user_id = clean(form.owner_platform_user_id);
    if (canReadRunbooks) body.runbook_id = clean(form.runbook_id);
    return body;
  };

  const save = useMutation({ mutationFn: () => platformApiRequest(editingId ? `/platform/operational-jobs/${editingId}` : '/platform/operational-jobs', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(detailsPayload()) }), onSuccess: async () => { setMessage(editingId ? 'Operational job changes saved.' : 'Operational job created.'); setMutationError(''); setEditingId(''); setForm(emptyForm()); if (!editingId) setBoolFilter('attention_only', false); await refreshOperationalJobData(); }, onError: handleMutationError });
  const recordRun = useMutation({ mutationFn: () => platformApiRequest(`/platform/operational-jobs/${runJobId}/runs`, { method: 'POST', body: JSON.stringify({ last_status: runForm.last_status, last_duration_ms: runForm.last_duration_ms ? Number(runForm.last_duration_ms) : null, last_error: clean(runForm.last_error), next_run_at: runForm.next_run_at ? new Date(runForm.next_run_at).toISOString() : null }) }), onSuccess: async () => { const id = runJobId; setRunJobId(''); setRunForm(emptyRunForm()); setMessage('Application run evidence recorded.'); setMutationError(''); await refreshOperationalJobData(id); }, onError: handleMutationError });
  const archive = useMutation({ mutationFn: (id: string) => platformApiRequest(`/platform/operational-jobs/${id}/archive`, { method: 'POST', body: '{}' }), onSuccess: async (_data, id) => { setMessage('Operational job archived.'); setMutationError(''); await refreshOperationalJobData(id); }, onError: handleMutationError });
  const claimJob = useMutation({ mutationFn: (id: string) => platformApiRequest<{ job: Job; run: { id: string } }>(`/platform/operational-jobs/${id}/claim`, { method: 'POST', body: JSON.stringify({ lease_seconds: 900, worker_id: 'platform-ui-manual-claim', worker_metadata: { source: 'platform_operational_jobs_ui', action: 'manual_claim' } }) }), onSuccess: async (_data, id) => { setMessage('Operational job claimed.'); setMutationError(''); await refreshOperationalJobData(id); }, onError: handleMutationError });
  const completeClaim = useMutation({ mutationFn: ({ id, runId, status: resultStatus }: { id: string; runId: string; status: 'success' | 'failed' | 'skipped' }) => platformApiRequest<Job>(`/platform/operational-jobs/${id}/complete-claim`, { method: 'POST', body: JSON.stringify({ run_id: runId, status: resultStatus, worker_id: 'platform-ui-manual-claim', worker_metadata: { source: 'platform_operational_jobs_ui', action: `manual_complete_${resultStatus}` } }) }), onSuccess: async (_data, variables) => { setMessage(`Claim completed as ${variables.status}.`); setMutationError(''); await refreshOperationalJobData(variables.id); }, onError: handleMutationError });
  const releaseClaim = useMutation({ mutationFn: (id: string) => platformApiRequest(`/platform/operational-jobs/${id}/release-claim`, { method: 'POST', body: '{}' }), onSuccess: async (_data, id) => { setMessage('Operational job claim released.'); setMutationError(''); await refreshOperationalJobData(id); }, onError: handleMutationError });
  const scheduleRetry = useMutation({ mutationFn: (id: string) => platformApiRequest(`/platform/operational-jobs/${id}/schedule-retry`, { method: 'POST', body: JSON.stringify({ retry_at: null }) }), onSuccess: async (_data, id) => { setMessage('Retry scheduled.'); setMutationError(''); await refreshOperationalJobData(id); }, onError: handleMutationError });
  const releaseExpiredClaims = useMutation({ mutationFn: () => platformApiRequest('/platform/operational-jobs/release-expired-claims', { method: 'POST', body: '{}' }), onSuccess: async () => { setMessage('Expired claims released.'); setMutationError(''); await refreshOperationalJobData(); }, onError: handleMutationError });
  const recoverStaleClaims = useMutation({ mutationFn: () => platformApiRequest('/platform/operational-jobs/recover-stale-claims', { method: 'POST', body: JSON.stringify({ older_than_seconds: 0 }) }), onSuccess: async () => { setMessage('Stale claims recovered.'); setMutationError(''); await refreshOperationalJobData(); }, onError: handleMutationError });
  const runWorkerOnce = useMutation({ mutationFn: () => platformApiRequest('/platform/operational-jobs/worker/run-once', { method: 'POST', body: JSON.stringify({ limit: 10, lease_seconds: 900 }) }), onSuccess: async () => { setMessage('Worker run-once completed; review recorded run evidence below.'); setMutationError(''); await refreshOperationalJobData(); }, onError: handleMutationError });
  const runHeartbeatCheck = useMutation({ mutationFn: () => platformApiRequest<WorkerHeartbeatCheck>('/platform/operational-jobs/scheduler/heartbeat-check', { method: 'POST', body: JSON.stringify({ stale_after_seconds: 300 }) }), onSuccess: async (result) => { setHeartbeatCheckResult(result); setMessage('Heartbeat check completed.'); setMutationError(''); await refreshOperationalJobData(); }, onError: handleMutationError });

  const parsedWorkerPayload = parseWorkerPayload(form.worker_payload);
  const handlerKeys = (workerHandlers.data?.handlers || []).map((item) => typeof item === 'string' ? item : item.key);
  const invalidWorkerPayload = parsedWorkerPayload === null;
  const invalidJobKey = Boolean(form.job_key.trim()) && !jobKeyLooksValid(form.job_key);
  const invalidFailureThreshold = !Number.isInteger(Number(form.failure_threshold)) || Number(form.failure_threshold) < 1 || Number(form.failure_threshold) > 100;
  const invalidRecurrence = form.recurrence_type !== 'manual' && (!Number.isInteger(Number(form.recurrence_interval)) || Number(form.recurrence_interval) < 1 || Number(form.recurrence_interval) > 100000);
  const invalidWorkerHandler = Boolean(form.worker_handler) && handlerKeys.length > 0 && !handlerKeys.includes(form.worker_handler);
  const missingEnabledHandler = form.worker_enabled && !form.worker_handler;
  const saveDisabled = save.isPending || !form.name.trim() || !form.job_key.trim() || invalidJobKey || invalidWorkerPayload || invalidFailureThreshold || invalidRecurrence || invalidWorkerHandler || missingEnabledHandler;
  const runDisabled = recordRun.isPending || (Boolean(runForm.last_duration_ms) && Number(runForm.last_duration_ms) < 0);

  const hasPrimaryData = Boolean(jobs.data);
  const primaryError = invalidFilters ? 'One or more URL filters are invalid.' : jobs.error ? readableError(jobs.error) : '';
  const backgroundWarning = hasPrimaryData && jobs.error ? 'Showing the last successful registry snapshot because refresh failed.' : '';
  const auxiliaryError = dueJobs.error || workerHeartbeats.error || executionMetrics.error || workerHandlers.error || defaultJobs.error;
  const isRefreshing = jobs.isFetching || dueJobs.isFetching || workerHeartbeats.isFetching || executionMetrics.isFetching || workerHandlers.isFetching || defaultJobs.isFetching;
  const heartbeatAttention = noWorkers || staleWorkers.length > 0 || unhealthyWorkers.length > 0 || flappingWorkers.length > 0 || mismatchWorkers.length > 0 || missingSourceWorkers.length > 0;

  return <div className="platform-operational-jobs">
    <OperationalWorkspaceHero iconPath="/platform/operational-jobs" eyebrow="Platform operations" title="Operational jobs" description="Manage the application scheduler registry, execution claims, retries, run evidence and worker heartbeat evidence. Recorded success is application evidence only; it does not prove an external business or infrastructure outcome occurred." meta={<><OperationalWorkspaceMetaPill>Registry evidence</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{pagination?.total ?? summary?.total ?? 0} filtered jobs</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>50 per page</OperationalWorkspaceMetaPill></>} aside={<div className="platform-operational-jobs__hero-aside"><OperationalWorkspaceStatus value={heartbeatAttention ? 'Attention' : 'Recorded healthy'} label={heartbeatAttention ? 'Worker/scheduler evidence needs review' : 'No current worker evidence warning'} /><div className="platform-operational-jobs__refresh-block"><button className="app-button app-button--secondary" type="button" onClick={() => void refreshPage()} disabled={isRefreshing}>{isRefreshing ? 'Refreshing…' : 'Refresh'}</button><span>Preserves last successful registry snapshot on refresh failure.</span></div></div>} />

    {message ? <div className="platform-operational-jobs__success"><strong>{message}</strong><button type="button" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {mutationError ? <div className="platform-operational-jobs__warning"><strong>Action failed:</strong> {mutationError}<button type="button" onClick={() => setMutationError('')}>Dismiss</button></div> : null}
    {backgroundWarning ? <div className="platform-operational-jobs__warning">{backgroundWarning}<button className="app-button app-button--secondary" type="button" onClick={() => void jobs.refetch()}>Retry</button></div> : null}
    {auxiliaryError ? <div className="platform-operational-jobs__warning">Supporting scheduler/worker evidence could not be fully refreshed. Registry data remains available.</div> : null}

    <OperationalWorkspaceStats ariaLabel="Operational job registry summary">
      <OperationalWorkspaceStatCard label="Filtered jobs" value={summary?.total ?? 0} helper="Registry-wide filtered count" iconPath="/platform/operational-jobs" />
      <OperationalWorkspaceStatCard label="Overdue" value={summary?.overdue ?? 0} helper="Recorded next run is in the past" tone={(summary?.overdue || 0) > 0 ? 'warn' : 'good'} iconPath="/platform/operational-jobs" />
      <OperationalWorkspaceStatCard label="Failing" value={summary?.failing ?? 0} helper="Failure threshold reached" tone={(summary?.failing || 0) > 0 ? 'danger' : 'good'} iconPath="/platform/operational-jobs" />
      <OperationalWorkspaceStatCard label="Active claims" value={summary?.claimed ?? 0} helper="Application execution claims" tone="blue" iconPath="/platform/operational-jobs" />
      <OperationalWorkspaceStatCard label="Dead-lettered" value={summary?.dead_lettered ?? 0} helper="Recorded retry exhaustion" tone={(summary?.dead_lettered || 0) > 0 ? 'danger' : 'good'} iconPath="/platform/operational-jobs" />
      <OperationalWorkspaceStatCard label="Retry due" value={summary?.retry_due ?? 0} helper="Recorded retry timestamp is due" tone={(summary?.retry_due || 0) > 0 ? 'warn' : 'neutral'} iconPath="/platform/operational-jobs" />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-operational-jobs__section">
      <OperationalSectionHeader iconPath="/platform/operational-jobs" title="Evidence boundary" description="Operational Jobs records application scheduler state, worker heartbeats, claims and handler results. A successful run proves that the application recorded a successful handler result; it does not certify backup integrity, vendor delivery, contractual SLA performance, infrastructure health, customer acknowledgement or any other external outcome." />
      <div className="platform-operational-jobs__truth-note"><strong>Identity evidence is permission-scoped.</strong><span>Platform-user identities require PLATFORM_USERS_READ. Runbook identity requires PLATFORM_RUNBOOKS_READ. Restricted link presence can remain visible without exposing the protected identity.</span></div>
    </section>

    <section className="io-workspace-panel platform-operational-jobs__section">
      <OperationalSectionHeader iconPath="/platform/operational-jobs" title="Filters and worker controls" description="Filters are stored in the URL. Registry KPIs describe the whole filtered result, not only this loaded page." actions={canWrite ? <div className="platform-operational-jobs__actions"><button className="app-button app-button--secondary" type="button" onClick={() => window.confirm('Release all expired operational job claims?') && releaseExpiredClaims.mutate()} disabled={releaseExpiredClaims.isPending}>Release expired claims</button><button className="app-button app-button--secondary" type="button" onClick={() => window.confirm('Recover stale operational job claims?') && recoverStaleClaims.mutate()} disabled={recoverStaleClaims.isPending}>Recover stale claims</button><button className="app-button app-button--primary" type="button" onClick={() => window.confirm('Run due worker-enabled operational jobs once now? This executes application handlers.') && runWorkerOnce.mutate()} disabled={runWorkerOnce.isPending}>Run worker once</button></div> : null} />
      <div className="platform-operational-jobs__filter-grid">
        <label>Category<select value={category} onChange={(event) => updateUrlFilter('category', event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Status<select value={status} onChange={(event) => updateUrlFilter('status', event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label className="platform-operational-jobs__search">Search<input value={search} onChange={(event) => updateUrlFilter('search', event.target.value)} placeholder="Name, job key, notes, visible owner/runbook" /></label>
        <label className="platform-operational-jobs__checkbox"><input type="checkbox" checked={attentionOnly} onChange={(event) => setBoolFilter('attention_only', event.target.checked)} /> Attention only</label>
        <label className="platform-operational-jobs__checkbox"><input type="checkbox" checked={includeArchived} onChange={(event) => setBoolFilter('include_archived', event.target.checked)} /> Include archived</label>
      </div>
    </section>

    {!hasPrimaryData && primaryError ? <section className="platform-operational-jobs__blocking-error"><strong>Operational job registry could not be loaded.</strong><span>{primaryError}</span><button className="app-button app-button--secondary" type="button" onClick={() => invalidFilters ? setSearchParams({}, { replace: true }) : void jobs.refetch()}>{invalidFilters ? 'Clear invalid filters' : 'Retry'}</button></section> : null}

    <section className="io-workspace-panel platform-operational-jobs__section">
      <OperationalSectionHeader iconPath="/platform/operational-jobs" title="Worker execution evidence" description={`Durable application run evidence from the last ${metrics?.days ?? 14} days. This proves recorded scheduler/handler activity inside the application, not an external outcome.`} actions={<button className="app-button app-button--secondary" type="button" onClick={() => void executionMetrics.refetch()} disabled={executionMetrics.isFetching}>Refresh evidence</button>} />
      <div className="platform-operational-jobs__evidence-grid"><div><span>Total recorded runs</span><strong>{(metrics?.by_status || []).reduce((sum, item) => sum + Number(item.count || 0), 0)}</strong></div><div><span>Successful</span><strong>{metrics?.by_status.find((item) => item.status === 'success')?.count ?? 0}</strong></div><div><span>Failed</span><strong>{metrics?.by_status.find((item) => item.status === 'failed')?.count ?? 0}</strong></div><div><span>Stale claims</span><strong>{metrics?.stale_claims ?? 0}</strong></div></div>
      <div className="platform-operational-jobs__two-column"><div><h4>Failing jobs</h4>{(metrics?.failing_jobs || []).length === 0 ? <p>No failing jobs in this evidence window.</p> : <ul>{(metrics?.failing_jobs || []).slice(0,5).map((item) => <li key={item.id}><strong>{item.name}</strong><span>{item.job_key} · {item.consecutive_failures}/{item.failure_threshold} failures</span>{item.last_error ? <em>{item.last_error}</em> : null}</li>)}</ul>}</div><div><h4>Slowest jobs</h4>{(metrics?.slowest_jobs || []).length === 0 ? <p>No duration evidence recorded yet.</p> : <ul>{(metrics?.slowest_jobs || []).slice(0,5).map((item) => <li key={item.job_id}><strong>{item.runs} run(s)</strong><span>Average {item.avg_duration_ms ?? '—'} ms · Max {item.max_duration_ms ?? '—'} ms</span><span>{item.job_id}</span></li>)}</ul>}</div></div>
    </section>

    <section className="io-workspace-panel platform-operational-jobs__section">
      <OperationalSectionHeader iconPath="/platform/operational-jobs" title="Scheduler and worker state" description="Heartbeat evidence shows what the application most recently recorded from workers. It does not independently prove host or dependency health." actions={canWrite ? <button className="app-button app-button--secondary" type="button" onClick={() => runHeartbeatCheck.mutate()} disabled={runHeartbeatCheck.isPending}>Run heartbeat check</button> : null} />
      <div className="platform-operational-jobs__evidence-grid"><div><span>Due jobs</span><strong>{dueJobs.data?.length ?? 0}</strong></div><div><span>Tracked workers</span><strong>{trackedWorkers.length}</strong></div><div><span>Stale/unhealthy</span><strong>{staleWorkers.length + unhealthyWorkers.length}</strong></div><div><span>Claim/source issues</span><strong>{mismatchWorkers.length + missingSourceWorkers.length}</strong></div></div>
      {heartbeatCheckResult ? <div className="platform-operational-jobs__truth-note"><strong>Latest heartbeat check: {pretty(heartbeatCheckResult.status)}</strong><span>Checked {heartbeatCheckResult.checked}; stale {heartbeatCheckResult.stale}; unhealthy {heartbeatCheckResult.unhealthy_status || 0}; flapping {heartbeatCheckResult.flapping || 0}; identity changes {heartbeatCheckResult.identity_changed || 0}; claim mismatch {heartbeatCheckResult.run_claim_mismatch || 0}; missing source {heartbeatCheckResult.missing_source || 0}; notification {pretty(heartbeatCheckResult.notification_action)}{heartbeatCheckResult.notification_resolved_count ? `; resolved ${heartbeatCheckResult.notification_resolved_count}` : ''}{heartbeatCheckResult.obsolete_notification_resolved_count ? `; obsolete alerts resolved ${heartbeatCheckResult.obsolete_notification_resolved_count}` : ''}.</span></div> : null}
      <div className="platform-operational-jobs__two-column"><div><h4>Due application jobs</h4>{(dueJobs.data || []).length === 0 ? <p>No due worker-enabled jobs are currently recorded.</p> : <ul>{(dueJobs.data || []).map((item) => <li key={item.id}><strong>{item.name}</strong><span>{item.job_key} · next {dateTime(item.next_run_at)}</span></li>)}</ul>}</div><div><h4>Worker heartbeats</h4>{trackedWorkers.length === 0 ? <p>No worker heartbeat has been recorded.</p> : <ul>{trackedWorkers.map((worker) => <li key={worker.id}><strong>{worker.worker_id}</strong><span>{pretty(worker.status)} · seen {dateTime(worker.last_seen_at)} · type {pretty(worker.worker_type)}</span><span>{worker.is_stale ? 'Stale · ' : ''}{worker.is_unhealthy_status ? 'Unhealthy · ' : ''}{worker.is_flapping ? 'Flapping · ' : ''}{worker.is_identity_changed_recent ? 'Recent identity change · ' : ''}{worker.is_run_claim_mismatch ? 'Claim mismatch · ' : ''}{worker.is_missing_source ? 'Missing source' : ''}</span><span>Current job {worker.current_job_id || '—'} · run {worker.current_run_id || '—'} · reported run {worker.reported_run_status || '—'} / {worker.reported_run_job_id || '—'}</span><span>Run finished {dateTime(worker.reported_run_finished_at)} · reported job current run {worker.reported_job_current_run_id || '—'}</span><span>Source: {metadataSummary(worker.metadata)} · registered {dateTime(worker.created_at)} · updated {dateTime(worker.updated_at)}</span><span>Identity changes {worker.identity_changed_count ?? 0} · last {dateTime(worker.last_identity_changed_at)}{worker.last_identity_change_metadata ? ` · ${metadataSummary(worker.last_identity_change_metadata)}` : ''}</span><span>Status changes {worker.status_changed_count ?? 0} · window {worker.status_change_window_count ?? 0} · unhealthy window {worker.unhealthy_status_change_window_count ?? 0} · last {dateTime(worker.last_status_changed_at)}</span>{worker.last_status_change_metadata ? <span>Status-change evidence: {metadataSummary(worker.last_status_change_metadata)}</span> : null}</li>)}</ul>}</div></div>
    </section>

    <section className="io-workspace-panel platform-operational-jobs__section">
      <OperationalSectionHeader iconPath="/platform/operational-jobs" title="Default worker coverage" description="Configured defaults are seed/reference definitions. A default definition does not prove the corresponding job exists, is enabled, or has run successfully." />
      <div className="platform-operational-jobs__default-grid">{(defaultJobs.data?.jobs || []).map((item) => <article key={item.job_key}><strong>{item.name}</strong><span>{item.job_key}</span><span>{pretty(item.category)} · {item.schedule_label || pretty(item.recurrence_type)}</span><span>Handler: {item.worker_handler}</span></article>)}</div>
    </section>

    {canWrite ? <section id="platform-operational-jobs-form" className="io-workspace-panel platform-operational-jobs__section">
      <OperationalSectionHeader iconPath="/platform/operational-jobs" title={editingId ? 'Edit operational job' : 'Add operational job'} description={editingId ? 'Archived jobs are immutable. Restricted owner/runbook linkage is preserved when its source permission is unavailable.' : 'Create an application scheduler registry record. Enabling worker execution requires a registered handler.'} />
      <div className="platform-operational-jobs__form-grid">
        <label>Name<input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></label>
        <label>Job key<input value={form.job_key} onChange={(e) => setForm((v) => ({ ...v, job_key: e.target.value }))} placeholder="platform.example.job" /></label>
        <label>Category<select value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}>{categories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Status<select value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}>{mutableStatuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Schedule label<input value={form.schedule_label} onChange={(e) => setForm((v) => ({ ...v, schedule_label: e.target.value }))} /></label>
        {canReadUsers ? <label>Owner<select value={form.owner_platform_user_id} onChange={(e) => setForm((v) => ({ ...v, owner_platform_user_id: e.target.value }))}><option value="">No owner</option>{(users.data || []).filter((u) => u.is_active !== false).map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}</select></label> : <div className="platform-operational-jobs__restricted"><strong>Owner identity restricted</strong><span>PLATFORM_USERS_READ is required to view or change this linkage.</span></div>}
        {canReadRunbooks ? <label>Runbook<select value={form.runbook_id} onChange={(e) => setForm((v) => ({ ...v, runbook_id: e.target.value }))}><option value="">No runbook</option>{(runbooks.data?.runbooks || []).filter((r) => r.is_active !== false).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label> : <div className="platform-operational-jobs__restricted"><strong>Runbook identity restricted</strong><span>PLATFORM_RUNBOOKS_READ is required to view or change this linkage.</span></div>}
        <label>Next run<input type="datetime-local" value={form.next_run_at} onChange={(e) => setForm((v) => ({ ...v, next_run_at: e.target.value }))} /></label>
        <label>Failure threshold<input type="number" min="1" max="100" value={form.failure_threshold} onChange={(e) => setForm((v) => ({ ...v, failure_threshold: e.target.value }))} /></label>
        <label>Recurrence<select value={form.recurrence_type} onChange={(e) => setForm((v) => ({ ...v, recurrence_type: e.target.value, recurrence_interval: e.target.value === 'manual' ? '' : v.recurrence_interval }))}><option value="manual">Manual</option><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option><option value="weeks">Weeks</option></select></label>
        <label>Recurrence interval<input type="number" min="1" max="100000" disabled={form.recurrence_type === 'manual'} value={form.recurrence_interval} onChange={(e) => setForm((v) => ({ ...v, recurrence_interval: e.target.value }))} /></label>
        <label>Recurrence anchor<input type="datetime-local" value={form.recurrence_anchor_at} onChange={(e) => setForm((v) => ({ ...v, recurrence_anchor_at: e.target.value }))} /></label>
        <label>Worker handler<select value={form.worker_handler} onChange={(e) => setForm((v) => ({ ...v, worker_handler: e.target.value }))}><option value="">No handler</option>{(workerHandlers.data?.handlers || []).map((item) => { const key = typeof item === 'string' ? item : item.key; const text = typeof item === 'string' ? pretty(item) : item.label || pretty(item.key); return <option key={key} value={key}>{text}</option>; })}</select></label>
        <label className="platform-operational-jobs__span-all">Worker payload JSON<textarea value={form.worker_payload} onChange={(e) => setForm((v) => ({ ...v, worker_payload: e.target.value }))} /></label>
        <label className="platform-operational-jobs__span-all">Notes<textarea value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} /></label>
        <label className="platform-operational-jobs__checkbox"><input type="checkbox" checked={form.worker_enabled} onChange={(e) => setForm((v) => ({ ...v, worker_enabled: e.target.checked }))} /> Worker enabled</label>
        <label className="platform-operational-jobs__checkbox"><input type="checkbox" checked={form.worker_dry_run} onChange={(e) => setForm((v) => ({ ...v, worker_dry_run: e.target.checked }))} /> Dry run</label>
        <label className="platform-operational-jobs__checkbox"><input type="checkbox" checked={form.alert_on_failure} onChange={(e) => setForm((v) => ({ ...v, alert_on_failure: e.target.checked }))} /> Alert on failure</label>
        <label className="platform-operational-jobs__checkbox"><input type="checkbox" checked={form.alert_on_dead_letter} onChange={(e) => setForm((v) => ({ ...v, alert_on_dead_letter: e.target.checked }))} /> Alert on dead letter</label>
      </div>
      {saveDisabled ? <div className="platform-operational-jobs__validation">Complete the required fields. Job key must be valid; worker payload must be a JSON object; thresholds/recurrence must be valid; worker-enabled jobs need a registered handler.</div> : null}
      <div className="platform-operational-jobs__actions"><button className="app-button app-button--primary" type="button" onClick={() => save.mutate()} disabled={saveDisabled}>{save.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create job'}</button>{editingId ? <button className="app-button app-button--secondary" type="button" onClick={() => { setEditingId(''); setForm(emptyForm()); }}>Cancel edit</button> : null}</div>
    </section> : null}

    {runJobId && canWrite ? <section className="io-workspace-panel platform-operational-jobs__section"><OperationalSectionHeader iconPath="/platform/operational-jobs" title="Record application run evidence" description="Use this only to record an application execution result. It does not certify an external outcome." /><div className="platform-operational-jobs__form-grid"><label>Run status<select value={runForm.last_status} onChange={(e) => setRunForm((v) => ({ ...v, last_status: e.target.value }))}><option value="success">Success</option><option value="failed">Failed</option><option value="skipped">Skipped</option></select></label><label>Duration ms<input type="number" min="0" value={runForm.last_duration_ms} onChange={(e) => setRunForm((v) => ({ ...v, last_duration_ms: e.target.value }))} /></label><label>Next run<input type="datetime-local" value={runForm.next_run_at} onChange={(e) => setRunForm((v) => ({ ...v, next_run_at: e.target.value }))} /></label><label>Error / note<input value={runForm.last_error} onChange={(e) => setRunForm((v) => ({ ...v, last_error: e.target.value }))} /></label></div><div className="platform-operational-jobs__actions"><button className="app-button app-button--primary" type="button" onClick={() => recordRun.mutate()} disabled={runDisabled}>Save run evidence</button><button className="app-button app-button--secondary" type="button" onClick={() => { setRunJobId(''); setRunForm(emptyRunForm()); }}>Cancel</button></div></section> : null}

    {historyJobId ? <section className="io-workspace-panel platform-operational-jobs__section"><OperationalSectionHeader iconPath="/platform/operational-jobs" title="Execution history" description="Historical application run records for the selected job." actions={<button className="app-button app-button--secondary" type="button" onClick={() => setHistoryJobId('')}>Close history</button>} />{jobRuns.isLoading && !jobRuns.data ? <div className="platform-operational-jobs__loading">Loading execution history…</div> : null}<div className="platform-operational-jobs__list">{(jobRuns.data?.runs || []).map((run) => <article key={run.id} className="platform-operational-jobs__card"><div className="platform-operational-jobs__card-header"><div><h4>{pretty(run.status)}</h4><p>Started {dateTime(run.started_at)}</p></div><span data-tone={run.status === 'success' ? 'good' : run.status === 'failed' ? 'danger' : 'neutral'}>{pretty(run.status)}</span></div><div className="platform-operational-jobs__details"><div><span>Finished</span><strong>{dateTime(run.finished_at)}</strong></div><div><span>Duration</span><strong>{run.duration_ms ?? '—'} ms</strong></div><div><span>Triggered by</span><strong>{run.triggered_by_email || (run.triggering_actor_present ? 'Restricted Platform user' : 'System / not recorded')}</strong></div><div><span>Worker</span><strong>{run.worker_id || 'Not recorded'}</strong></div></div><p>{metadataSummary(run.worker_metadata)}</p>{run.error_message ? <div className="platform-operational-jobs__error-text">{run.error_message}</div> : null}</article>)}</div>{jobRuns.data?.pagination ? <div className="platform-operational-jobs__pagination"><button className="app-button app-button--secondary" type="button" onClick={() => setHistoryOffset((v) => Math.max(0, v - 25))} disabled={historyOffset === 0}>Previous</button><span>{Math.min(historyOffset + 1, jobRuns.data.pagination.total)}-{Math.min(historyOffset + jobRuns.data.pagination.limit, jobRuns.data.pagination.total)} of {jobRuns.data.pagination.total}</span><button className="app-button app-button--secondary" type="button" onClick={() => setHistoryOffset((v) => v + 25)} disabled={!jobRuns.data.pagination.has_more}>Next</button></div> : null}</section> : null}

    <section className="io-workspace-panel platform-operational-jobs__section"><OperationalSectionHeader iconPath="/platform/operational-jobs" title="Operational job registry" description="Archived jobs are immutable. Owner and runbook identity are shown only when the current Platform permission snapshot allows them." />{jobs.isLoading && !jobs.data ? <div className="platform-operational-jobs__loading">Loading operational jobs…</div> : null}{rows.length === 0 && jobs.data ? <div className="platform-operational-jobs__empty"><strong>No operational jobs match these filters.</strong><span>Change the filters or create a new job if you have write permission.</span></div> : null}<div className="platform-operational-jobs__list">{rows.map((job) => <article key={job.id} className="platform-operational-jobs__card"><div className="platform-operational-jobs__card-header"><div><h4>{job.name}</h4><p>{job.job_key}</p></div><span data-tone={jobTone(job)}>{pretty(job.status)}</span></div><div className="platform-operational-jobs__details"><div><span>Category</span><strong>{pretty(job.category)}</strong></div><div><span>Schedule</span><strong>{job.schedule_label || 'Not recorded'}</strong></div><div><span>Owner</span><strong>{job.owner_email || (job.owner_present ? 'Restricted Platform user' : 'Not linked')}</strong></div><div><span>Runbook</span><strong>{job.runbook_title || (job.runbook_present ? 'Restricted runbook' : 'Not linked')}</strong></div><div><span>Last run</span><strong>{dateTime(job.last_run_at)}</strong></div><div><span>Last status</span><strong>{pretty(job.last_status)}</strong></div><div><span>Next run</span><strong>{dateTime(job.next_run_at)}</strong></div><div><span>Failures</span><strong>{job.consecutive_failures}/{job.failure_threshold}</strong></div><div><span>Claimed by</span><strong>{job.claimed_by_email || (job.current_run_id ? 'Restricted/system actor' : 'Not claimed')}</strong></div><div><span>Claim expires</span><strong>{dateTime(job.claim_expires_at)}</strong></div><div><span>Next retry</span><strong>{dateTime(job.next_retry_at)}</strong></div><div><span>Dead-lettered</span><strong>{dateTime(job.dead_lettered_at)}</strong></div></div>{job.last_error ? <div className="platform-operational-jobs__error-text">{job.last_error}</div> : null}{job.notes ? <div className="platform-operational-jobs__notes"><strong>Notes</strong><span>{job.notes}</span></div> : null}<div className="platform-operational-jobs__card-footer"><div className="platform-operational-jobs__source-links"><button className="app-button app-button--secondary" type="button" onClick={() => setHistoryJobId((current) => current === job.id ? '' : job.id)}>Execution history</button>{canReadRunbooks && job.runbook_id ? <Link to="/platform/runbooks">Runbook evidence</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div>{canWrite && job.status !== 'archived' ? <div className="platform-operational-jobs__actions"><button className="app-button app-button--secondary" type="button" onClick={() => { setEditingId(job.id); setForm(toForm(job)); scrollToFormSection('platform-operational-jobs-form'); }}>Edit</button><button className="app-button app-button--secondary" type="button" onClick={() => { setRunJobId(job.id); setRunForm(emptyRunForm()); }}>Record run</button>{!job.current_run_id ? <button className="app-button app-button--secondary" type="button" onClick={() => window.confirm('Claim this operational job for manual application work?') && claimJob.mutate(job.id)} disabled={claimJob.isPending}>Claim</button> : <><button className="app-button app-button--primary" type="button" onClick={() => completeClaim.mutate({ id: job.id, runId: job.current_run_id as string, status: 'success' })} disabled={completeClaim.isPending}>Complete success</button><button className="app-button app-button--danger" type="button" onClick={() => completeClaim.mutate({ id: job.id, runId: job.current_run_id as string, status: 'failed' })} disabled={completeClaim.isPending}>Complete failed</button><button className="app-button app-button--secondary" type="button" onClick={() => releaseClaim.mutate(job.id)} disabled={releaseClaim.isPending}>Release claim</button></>}{(job.dead_lettered_at || job.last_status === 'failed') && !job.current_run_id ? <button className="app-button app-button--secondary" type="button" onClick={() => window.confirm('Schedule this operational job for retry now?') && scheduleRetry.mutate(job.id)} disabled={scheduleRetry.isPending}>Retry now</button> : null}<button className="app-button app-button--danger" type="button" onClick={() => window.confirm('Archive this operational job? Archived records become immutable and worker scheduling is disabled.') && archive.mutate(job.id)} disabled={archive.isPending || Boolean(job.current_run_id)}>Archive</button></div> : <span className="platform-operational-jobs__immutable">{job.status === 'archived' ? 'Archived — immutable' : ''}</span>}</div></article>)}</div>{pagination ? <div className="platform-operational-jobs__pagination"><button className="app-button app-button--secondary" type="button" onClick={() => setOffset((v) => Math.max(0, v - PAGE_SIZE))} disabled={offset === 0}>Previous</button><span>{pagination.total === 0 ? '0' : `${offset + 1}-${Math.min(offset + pagination.limit, pagination.total)}`} of {pagination.total}</span><button className="app-button app-button--secondary" type="button" onClick={() => setOffset((v) => v + PAGE_SIZE)} disabled={!pagination.has_more}>Next</button></div> : null}</section>

    <section className="io-workspace-panel platform-operational-jobs__section"><OperationalSectionHeader iconPath="/platform/operational-jobs" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." /><div className="platform-operational-jobs__supporting-links">{canReadRunbooks ? <Link to="/platform/runbooks">Runbooks</Link> : null}{canReadNotifications ? <Link to="/platform/notifications">Notifications</Link> : null}{canReadDependencies ? <Link to="/platform/service-dependencies">Service dependencies</Link> : null}{canReadDependencies ? <Link to="/platform/integration-monitoring">Integration monitoring</Link> : null}{canReadUsers ? <Link to="/platform/users">Platform users</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div></section>
  </div>;
}
