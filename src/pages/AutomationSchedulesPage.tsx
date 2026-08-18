import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import { fetchTenantSubscriptionAccess, type TenantFeatureEntitlementRow } from '../lib/tenantSubscriptionAccess';
import type {
  AutomationRunnerReadinessResponse,
  AutomationRunnerRunOnceResponse,
  AutomationRunnerStatusResponse,
  AutomationSchedule,
  AutomationScheduleAuditPackResponse,
  AutomationScheduleDryRunResponse,
  AutomationScheduleListResponse,
  AutomationScheduleManualRunResponse,
  AutomationScheduleRunEventsResponse,
  AutomationScheduleTypesResponse,
  AutomationTypeDefinition
} from '../types/inventory';
import './AutomationSchedulesPage.css';

type StatusFilter = '' | AutomationSchedule['status'];
type TypeFilter = '' | AutomationSchedule['automation_type'];
type ScheduleKind = 'manual' | 'daily' | 'weekly' | 'monthly';
type RequestDefaultStatus = 'draft' | 'pending_review';
type AutomationWorkspaceSection = 'overview' | 'registry' | 'create' | 'detail' | 'safety';

type FormState = {
  name: string;
  description: string;
  automation_type: AutomationSchedule['automation_type'];
  schedule_kind: ScheduleKind;
  time: string;
  timezone: string;
  day_of_week: number;
  day_of_month: number;
  default_status: RequestDefaultStatus;
};

type ConfirmationState =
  | { kind: 'activate'; schedule: AutomationSchedule }
  | { kind: 'disable'; schedule: AutomationSchedule }
  | { kind: 'manual_run'; schedule: AutomationSchedule }
  | { kind: 'run_due' }
  | { kind: 'acknowledge_anomaly' }
  | null;

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PAGE_SIZES = [25, 50, 100];

const fallbackAutomationTypes: AutomationTypeDefinition[] = [
  {
    automation_type: 'cost_risk_review',
    label: 'Cost Risk Review',
    description: 'Prepare a controlled review request for cost-risk signals.',
    default_request_type: 'cost_review',
    creates_execution_requests_later: true,
    executes_actions: false,
    risk_level: 'low'
  },
  {
    automation_type: 'cost_governance_review',
    label: 'Cost Governance Review',
    description: 'Prepare a controlled review request for costing governance and audit readiness.',
    default_request_type: 'cost_review',
    creates_execution_requests_later: true,
    executes_actions: false,
    risk_level: 'low'
  },
  {
    automation_type: 'system_context_review',
    label: 'System Context Review',
    description: 'Prepare a reviewable System Context recommendation snapshot.',
    default_request_type: 'system_recommendation',
    creates_execution_requests_later: true,
    executes_actions: false,
    risk_level: 'low'
  },
  {
    automation_type: 'execution_readiness_review',
    label: 'Execution Readiness Review',
    description: 'Prepare a review request for execution gates and readiness signals.',
    default_request_type: 'system_recommendation',
    creates_execution_requests_later: true,
    executes_actions: false,
    risk_level: 'medium'
  }
];

const createDefaultForm = (): FormState => ({
  name: '',
  description: '',
  automation_type: 'cost_risk_review',
  schedule_kind: 'manual',
  time: '09:00',
  timezone: DEFAULT_TIMEZONE,
  day_of_week: 1,
  day_of_month: 1,
  default_status: 'draft'
});

function getAutomationEntitlement(featureEntitlements?: TenantFeatureEntitlementRow[]): TenantFeatureEntitlementRow | null {
  return featureEntitlements?.find((entitlement) => entitlement.feature === 'automation') || null;
}

function humanize(value?: string | null): string {
  if (!value) return '—';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value?: string | null, timezone?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(timezone ? { timeZone: timezone } : {})
    }).format(parsed);
  } catch {
    return parsed.toLocaleString();
  }
}

function numberValue(value: number | string | undefined | null): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scheduleConfigValue(schedule: AutomationSchedule, key: string): unknown {
  return schedule.schedule_config?.[key];
}

function scheduleTimezone(schedule: AutomationSchedule): string {
  const value = scheduleConfigValue(schedule, 'timezone');
  return typeof value === 'string' && value.trim() ? value : 'UTC';
}

function schedulePattern(schedule: AutomationSchedule): string {
  const kind = schedule.schedule_kind as ScheduleKind;
  if (kind === 'manual') return 'Manual only';
  const time = typeof scheduleConfigValue(schedule, 'time') === 'string' ? String(scheduleConfigValue(schedule, 'time')) : '09:00';
  const timezone = scheduleTimezone(schedule);
  if (kind === 'daily') return `Daily at ${time} · ${timezone}`;
  if (kind === 'weekly') {
    const day = Number(scheduleConfigValue(schedule, 'day_of_week'));
    return `Every ${DAY_NAMES[Number.isInteger(day) && day >= 0 && day <= 6 ? day : 1]} at ${time} · ${timezone}`;
  }
  const day = Number(scheduleConfigValue(schedule, 'day_of_month'));
  return `Monthly on day ${Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1} at ${time} · ${timezone}`;
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function StatusChip({ status }: { status?: string | null }) {
  const normalized = status || 'unknown';
  return <span className={`automation-schedules-chip automation-schedules-chip--${normalized}`}>{humanize(normalized)}</span>;
}

export default function AutomationSchedulesPage() {
  const capabilities = getRoleCapabilities();
  const canCreateAutomationSchedules = capabilities.canCreateAutomationSchedules;
  const canUpdateAutomationSchedules = capabilities.canUpdateAutomationSchedules;
  const canPauseAutomationSchedules = capabilities.canPauseAutomationSchedules;
  const canResumeAutomationSchedules = capabilities.canResumeAutomationSchedules;
  const canDisableAutomationSchedules = capabilities.canDisableAutomationSchedules;
  const canCreateExecutionRequests = capabilities.canCreateExecutionRequests;
  const canViewExecutionRequests = capabilities.canViewExecutionRequests;

  const [automationEntitlement, setAutomationEntitlement] = useState<TenantFeatureEntitlementRow | null>(null);
  const [data, setData] = useState<AutomationScheduleListResponse | null>(null);
  const [types, setTypes] = useState<AutomationScheduleTypesResponse | null>(null);
  const [runnerReadiness, setRunnerReadiness] = useState<AutomationRunnerReadinessResponse | null>(null);
  const [runnerStatus, setRunnerStatus] = useState<AutomationRunnerStatusResponse | null>(null);
  const [runEvents, setRunEvents] = useState<AutomationScheduleRunEventsResponse | null>(null);
  const [selected, setSelected] = useState<AutomationSchedule | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [form, setForm] = useState<FormState>(() => createDefaultForm());
  const [dryRunResult, setDryRunResult] = useState<AutomationScheduleDryRunResponse | null>(null);
  const [manualRunResult, setManualRunResult] = useState<AutomationScheduleManualRunResponse | null>(null);
  const [runnerRunOnceResult, setRunnerRunOnceResult] = useState<AutomationRunnerRunOnceResponse | null>(null);
  const [auditPack, setAuditPack] = useState<AutomationScheduleAuditPackResponse | null>(null);

  const [status, setStatus] = useState<StatusFilter>('');
  const [automationType, setAutomationType] = useState<TypeFilter>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [governanceOpen, setGovernanceOpen] = useState(false);
  const [governanceLoading, setGovernanceLoading] = useState(false);
  const [governanceLoaded, setGovernanceLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [confirmationText, setConfirmationText] = useState('');

  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState<AutomationWorkspaceSection>('overview');
  const registryRef = useRef<HTMLDivElement | null>(null);
  const createRef = useRef<HTMLDivElement | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);
  const safetyRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (automationType) params.set('automation_type', automationType);
    if (search) params.set('search', search);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return params.toString();
  }, [automationType, limit, offset, search, status]);

  const availableTypes = types?.automation_types?.length ? types.automation_types : fallbackAutomationTypes;
  const selectedTypeDefinition = availableTypes.find((row) => row.automation_type === form.automation_type) || null;
  const total = numberValue(data?.total);
  const currentStart = total === 0 ? 0 : offset + 1;
  const currentEnd = Math.min(offset + numberValue(data?.rows.length), total);
  const hasPreviousPage = offset > 0;
  const hasNextPage = offset + limit < total;

  const activeCount = useMemo(() => {
    if (!runnerReadiness) return 0;
    const explicit = runnerReadiness.totals.active_schedules;
    if (explicit !== undefined) return numberValue(explicit);
    return Math.max(
      0,
      numberValue(runnerReadiness.totals.total_schedules)
        - numberValue(runnerReadiness.totals.draft_schedules)
        - numberValue(runnerReadiness.totals.paused_schedules)
        - numberValue(runnerReadiness.totals.disabled_schedules)
    );
  }, [runnerReadiness]);

  const loadCore = useCallback(async ({ preserveMessage = false }: { preserveMessage?: boolean } = {}) => {
    setLoading(true);
    setError(null);
    setWarning(null);
    if (!preserveMessage) setMessage(null);

    try {
      const subscriptionAccess = await fetchTenantSubscriptionAccess();
      const entitlement = getAutomationEntitlement(subscriptionAccess.feature_entitlements);
      setAutomationEntitlement(entitlement);

      if (entitlement && !entitlement.allowed) {
        setData(null);
        setTypes(null);
        setRunnerReadiness(null);
        setSelected(null);
        return;
      }

      const results = await Promise.allSettled([
        apiRequest<AutomationScheduleListResponse>(`/automation-schedules?${query}`),
        apiRequest<AutomationScheduleTypesResponse>('/automation-schedules/types'),
        apiRequest<AutomationRunnerReadinessResponse>('/automation-schedules/runner-readiness')
      ]);

      const [listResult, typesResult, readinessResult] = results;
      const secondaryWarnings: string[] = [];

      if (listResult.status === 'fulfilled') {
        setData(listResult.value);
        setSelected((current) => {
          if (!current) return null;
          const refreshed = listResult.value.rows.find((row) => row.id === current.id);
          return refreshed ? { ...current, ...refreshed } : current;
        });
      } else {
        throw listResult.reason;
      }

      if (typesResult.status === 'fulfilled') setTypes(typesResult.value);
      else secondaryWarnings.push('Schedule type guidance could not be refreshed.');

      if (readinessResult.status === 'fulfilled') setRunnerReadiness(readinessResult.value);
      else secondaryWarnings.push('Runner readiness summary could not be refreshed.');

      if (secondaryWarnings.length) setWarning(secondaryWarnings.join(' '));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load automation schedules');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadGovernance = useCallback(async () => {
    setGovernanceLoading(true);
    setWarning(null);
    try {
      const requests: Array<Promise<unknown>> = [
        apiRequest<AutomationRunnerStatusResponse>('/automation-schedules/runner-status')
      ];
      if (canViewExecutionRequests) {
        requests.push(apiRequest<AutomationScheduleRunEventsResponse>('/automation-schedules/run-events?limit=25&offset=0'));
      }

      const results = await Promise.allSettled(requests);
      const warnings: string[] = [];

      if (results[0]?.status === 'fulfilled') setRunnerStatus(results[0].value as AutomationRunnerStatusResponse);
      else warnings.push('Automation safety status could not be loaded.');

      if (canViewExecutionRequests) {
        if (results[1]?.status === 'fulfilled') setRunEvents(results[1].value as AutomationScheduleRunEventsResponse);
        else warnings.push('Recent automation activity could not be loaded.');
      }

      setGovernanceLoaded(true);
      if (warnings.length) setWarning(warnings.join(' '));
    } finally {
      setGovernanceLoading(false);
    }
  }, [canViewExecutionRequests]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (governanceOpen && !governanceLoaded && !governanceLoading) void loadGovernance();
  }, [governanceLoaded, governanceLoading, governanceOpen, loadGovernance]);

  const refreshPage = async () => {
    await loadCore();
    if (governanceOpen) await loadGovernance();
  };

  const scheduleToForm = (schedule: AutomationSchedule): FormState => {
    const config = schedule.schedule_config || {};
    const defaults = schedule.request_defaults || {};
    return {
      name: schedule.name,
      description: schedule.description || '',
      automation_type: schedule.automation_type,
      schedule_kind: (schedule.schedule_kind as ScheduleKind) || 'manual',
      time: typeof config.time === 'string' ? config.time : '09:00',
      timezone: typeof config.timezone === 'string' ? config.timezone : DEFAULT_TIMEZONE,
      day_of_week: Number.isInteger(Number(config.day_of_week)) ? Number(config.day_of_week) : 1,
      day_of_month: Number.isInteger(Number(config.day_of_month)) ? Number(config.day_of_month) : 1,
      default_status: defaults.default_status === 'pending_review' ? 'pending_review' : 'draft'
    };
  };

  const validateForm = (value: FormState): string | null => {
    if (value.name.trim().length < 3) return 'Schedule name must contain at least 3 characters.';
    if (value.name.trim().length > 255) return 'Schedule name must contain 255 characters or fewer.';
    if (value.description.length > 4000) return 'Description must contain 4,000 characters or fewer.';
    if (value.schedule_kind !== 'manual' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) return 'Choose a valid schedule time.';
    if (value.schedule_kind !== 'manual' && !isValidTimezone(value.timezone.trim())) return 'Enter a valid IANA timezone, such as Europe/Zagreb or UTC.';
    if (value.schedule_kind === 'weekly' && (value.day_of_week < 0 || value.day_of_week > 6)) return 'Choose a valid weekday.';
    if (value.schedule_kind === 'monthly' && (value.day_of_month < 1 || value.day_of_month > 31)) return 'Monthly day must be between 1 and 31.';
    return null;
  };

  const buildScheduleConfig = (value: FormState) => ({
    frequency: value.schedule_kind,
    time: value.time,
    timezone: value.timezone.trim(),
    ...(value.schedule_kind === 'weekly' ? { day_of_week: value.day_of_week } : {}),
    ...(value.schedule_kind === 'monthly' ? { day_of_month: value.day_of_month } : {})
  });

  const createSchedule = async () => {
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const created = await apiRequest<AutomationSchedule>('/automation-schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          automation_type: form.automation_type,
          schedule_kind: form.schedule_kind,
          schedule_config: buildScheduleConfig(form),
          request_defaults: { default_status: form.default_status }
        })
      });
      setSelected(created);
      setActiveWorkspaceSection('detail');
      setEditForm(null);
      setForm(createDefaultForm());
      setMessage(`Created draft schedule “${created.name}”. It will not run automatically until it is activated and runner request creation is explicitly enabled.`);
      await loadCore({ preserveMessage: true });
      window.setTimeout(() => document.getElementById('automation-schedule-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const loadScheduleDetail = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiRequest<AutomationSchedule>(`/automation-schedules/${schedule.id}`);
      setSelected(response);
      setActiveWorkspaceSection('detail');
      setEditForm(null);
      setDryRunResult(null);
      setManualRunResult(null);
      setAuditPack(null);
      window.setTimeout(() => document.getElementById('automation-schedule-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load automation schedule detail');
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = async (schedule: AutomationSchedule) => {
    if (!editForm) return;
    const validationError = validateForm(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiRequest<AutomationSchedule>(`/automation-schedules/${schedule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          automation_type: editForm.automation_type,
          schedule_kind: editForm.schedule_kind,
          schedule_config: buildScheduleConfig(editForm),
          request_defaults: { default_status: editForm.default_status }
        })
      });
      setSelected(updated);
      setEditForm(null);
      setMessage(`Saved “${updated.name}”. Its next-run time was recalculated from the updated calendar settings.`);
      await loadCore({ preserveMessage: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const pauseSchedule = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiRequest<AutomationSchedule>(`/automation-schedules/${schedule.id}/pause`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSelected(updated);
      setEditForm(null);
      setMessage(`Paused “${updated.name}”. It is no longer eligible for automatic due processing.`);
      await loadCore({ preserveMessage: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to pause automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const resumeSchedule = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiRequest<AutomationSchedule>(`/automation-schedules/${schedule.id}/resume`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSelected(updated);
      setEditForm(null);
      setMessage(`Activated “${updated.name}”. Its next run was scheduled from now, so an old paused date will not be processed as an immediate catch-up run.`);
      await loadCore({ preserveMessage: true });
      if (governanceOpen) await loadGovernance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to activate automation schedule');
    } finally {
      setSaving(false);
      setConfirmation(null);
    }
  };

  const disableSchedule = async (schedule: AutomationSchedule, reason: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiRequest<AutomationSchedule>(`/automation-schedules/${schedule.id}/disable`, {
        method: 'POST',
        body: JSON.stringify({ disabled_reason: reason.trim() })
      });
      setSelected(updated);
      setEditForm(null);
      setMessage(`Disabled “${updated.name}”. The reason is preserved in its audit trail.`);
      await loadCore({ preserveMessage: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to disable automation schedule');
    } finally {
      setSaving(false);
      setConfirmation(null);
      setConfirmationText('');
    }
  };

  const dryRunSchedule = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiRequest<AutomationScheduleDryRunResponse>(`/automation-schedules/${schedule.id}/dry-run`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSelected(response.schedule || schedule);
      setActiveWorkspaceSection('detail');
      setEditForm(null);
      setDryRunResult(response);
      setManualRunResult(null);
      setAuditPack(null);
      setMessage(`Dry run completed for “${schedule.name}”. No execution request or inventory record was changed.`);
      window.setTimeout(() => document.getElementById('automation-schedule-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to preview automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const runScheduleManually = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiRequest<AutomationScheduleManualRunResponse>(`/automation-schedules/${schedule.id}/run`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSelected(response.schedule);
      setActiveWorkspaceSection('detail');
      setEditForm(null);
      setManualRunResult(response);
      setDryRunResult(null);
      setAuditPack(null);
      setMessage(response.duplicate_guard_triggered
        ? `No duplicate request was created for “${schedule.name}”; the existing matching request was reused.`
        : `Created a reviewable execution request from “${schedule.name}”. Nothing was approved or executed automatically.`);
      await loadCore({ preserveMessage: true });
      if (governanceOpen) await loadGovernance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create an execution request from this schedule');
    } finally {
      setSaving(false);
      setConfirmation(null);
    }
  };

  const loadAuditPack = async (schedule: AutomationSchedule) => {
    if (!canViewExecutionRequests) {
      setError('Your current role cannot read linked execution-request evidence.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiRequest<AutomationScheduleAuditPackResponse>(`/automation-schedules/${schedule.id}/audit-pack`);
      setSelected(schedule);
      setActiveWorkspaceSection('detail');
      setEditForm(null);
      setAuditPack(response);
      setDryRunResult(null);
      setManualRunResult(null);
      setMessage(`Loaded the audit pack for “${schedule.name}”.`);
      window.setTimeout(() => document.getElementById('automation-schedule-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load the schedule audit pack');
    } finally {
      setSaving(false);
    }
  };

  const runDueSchedulesOnce = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiRequest<AutomationRunnerRunOnceResponse>('/automation-schedules/runner/run-once', {
        method: 'POST',
        body: JSON.stringify({ limit: numberValue(runnerStatus?.batch_limit) || 10, confirm_request_creation: true })
      });
      setRunnerRunOnceResult(response);
      setMessage(`Run-once finished: ${numberValue(response.created_execution_request_count)} request(s) created, ${numberValue(response.skipped_schedule_count)} schedule(s) skipped, and nothing executed automatically.`);
      await loadCore({ preserveMessage: true });
      await loadGovernance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to run due schedules once');
    } finally {
      setSaving(false);
      setConfirmation(null);
    }
  };

  const acknowledgeRunnerUnsafeOutputReview = async (reviewNote: string) => {
    const expectedLastUnsafeAt = runnerStatus?.unsafe_runner_output_review_expected_last_unsafe_runner_output_at
      || runnerStatus?.expected_last_unsafe_runner_output_at
      || runnerStatus?.last_unsafe_runner_output_at
      || null;
    const expectedUnsafeCount = numberValue(
      runnerStatus?.unsafe_runner_output_review_expected_count
      ?? runnerStatus?.expected_unsafe_runner_output_count
      ?? runnerStatus?.unsafe_runner_output_count
    );

    if (!expectedLastUnsafeAt || expectedUnsafeCount <= 0) {
      setError('Refresh automation safety status before acknowledging the review.');
      setConfirmation(null);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiRequest<AutomationRunnerStatusResponse>('/automation-schedules/runner/unsafe-output-review/acknowledge', {
        method: 'POST',
        body: JSON.stringify({
          confirm_unsafe_output_review: true,
          expected_last_unsafe_runner_output_at: expectedLastUnsafeAt,
          expected_unsafe_runner_output_count: expectedUnsafeCount,
          review_note: reviewNote.trim()
        })
      });
      setRunnerStatus(response);
      setMessage('Automation safety review was acknowledged and the audit evidence remains preserved.');
      await loadGovernance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to acknowledge runner anomaly review');
    } finally {
      setSaving(false);
      setConfirmation(null);
      setConfirmationText('');
    }
  };

  const confirmAction = async () => {
    if (!confirmation) return;
    if (confirmation.kind === 'activate') return resumeSchedule(confirmation.schedule);
    if (confirmation.kind === 'manual_run') return runScheduleManually(confirmation.schedule);
    if (confirmation.kind === 'run_due') return runDueSchedulesOnce();
    if (confirmation.kind === 'disable') {
      if (confirmationText.trim().length < 3) {
        setError('Enter a disable reason of at least 3 characters.');
        return;
      }
      return disableSchedule(confirmation.schedule, confirmationText);
    }
    if (confirmation.kind === 'acknowledge_anomaly') {
      const min = numberValue(runnerStatus?.unsafe_runner_output_review_note_min_length) || 10;
      const max = numberValue(runnerStatus?.unsafe_runner_output_review_note_max_length) || 1000;
      if (confirmationText.trim().length < min || confirmationText.trim().length > max) {
        setError(`Review note must contain between ${min} and ${max} characters.`);
        return;
      }
      return acknowledgeRunnerUnsafeOutputReview(confirmationText);
    }
  };

  const navigateWorkspaceSection = (section: AutomationWorkspaceSection, target: HTMLElement | null) => {
    setActiveWorkspaceSection(section);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearFilters = () => {
    setStatus('');
    setAutomationType('');
    setSearchInput('');
    setSearch('');
    setOffset(0);
  };

  const formFields = (value: FormState, onChange: (next: FormState) => void, idPrefix: string) => (
    <>
      <div className="automation-schedules-form-grid">
        <label className="automation-schedules-field" htmlFor={`${idPrefix}-name`}>
          <span>Name</span>
          <input id={`${idPrefix}-name`} value={value.name} maxLength={255} onChange={(event) => onChange({ ...value, name: event.target.value })} placeholder="Example: Weekly cost-risk review" />
        </label>
        <label className="automation-schedules-field" htmlFor={`${idPrefix}-type`}>
          <span>Review type</span>
          <select id={`${idPrefix}-type`} value={value.automation_type} onChange={(event) => onChange({ ...value, automation_type: event.target.value })}>
            {availableTypes.map((type) => <option key={type.automation_type} value={type.automation_type}>{type.label}</option>)}
          </select>
        </label>
        <label className="automation-schedules-field" htmlFor={`${idPrefix}-frequency`}>
          <span>Frequency</span>
          <select id={`${idPrefix}-frequency`} value={value.schedule_kind} onChange={(event) => onChange({ ...value, schedule_kind: event.target.value as ScheduleKind })}>
            <option value="manual">Manual only</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        {value.schedule_kind !== 'manual' ? (
          <>
            <label className="automation-schedules-field" htmlFor={`${idPrefix}-time`}>
              <span>Local time</span>
              <input id={`${idPrefix}-time`} type="time" value={value.time} onChange={(event) => onChange({ ...value, time: event.target.value })} />
            </label>
            <label className="automation-schedules-field" htmlFor={`${idPrefix}-timezone`}>
              <span>Timezone</span>
              <input id={`${idPrefix}-timezone`} value={value.timezone} maxLength={100} list="automation-timezones" onChange={(event) => onChange({ ...value, timezone: event.target.value })} placeholder="Europe/Zagreb" />
            </label>
          </>
        ) : null}
        {value.schedule_kind === 'weekly' ? (
          <label className="automation-schedules-field" htmlFor={`${idPrefix}-weekday`}>
            <span>Weekday</span>
            <select id={`${idPrefix}-weekday`} value={value.day_of_week} onChange={(event) => onChange({ ...value, day_of_week: Number(event.target.value) })}>
              {DAY_NAMES.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>
        ) : null}
        {value.schedule_kind === 'monthly' ? (
          <label className="automation-schedules-field" htmlFor={`${idPrefix}-month-day`}>
            <span>Day of month</span>
            <input id={`${idPrefix}-month-day`} type="number" min={1} max={31} value={value.day_of_month} onChange={(event) => onChange({ ...value, day_of_month: Number(event.target.value) })} />
          </label>
        ) : null}
        <label className="automation-schedules-field" htmlFor={`${idPrefix}-request-status`}>
          <span>Created request starts as</span>
          <select id={`${idPrefix}-request-status`} value={value.default_status} onChange={(event) => onChange({ ...value, default_status: event.target.value as RequestDefaultStatus })}>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending review</option>
          </select>
        </label>
      </div>
      <label className="automation-schedules-field" htmlFor={`${idPrefix}-description`}>
        <span>Description</span>
        <textarea id={`${idPrefix}-description`} value={value.description} maxLength={4000} onChange={(event) => onChange({ ...value, description: event.target.value })} placeholder="Explain the business review this schedule prepares." />
      </label>
      <datalist id="automation-timezones">
        <option value="Europe/Zagreb" />
        <option value="UTC" />
        <option value="Europe/London" />
        <option value="Europe/Berlin" />
        <option value="America/New_York" />
        <option value="America/Chicago" />
        <option value="America/Los_Angeles" />
        <option value="Asia/Dubai" />
        <option value="Asia/Singapore" />
        <option value="Asia/Tokyo" />
        <option value="Australia/Sydney" />
      </datalist>
    </>
  );

  if (automationEntitlement && !automationEntitlement.allowed) {
    return (
      <div className="automation-schedules-page io-operational-page io-workspace-page">
        <OperationalWorkspaceHero
          iconPath="/automation-schedules"
          eyebrow="Execution workflow"
          title="Automation schedules"
          description="Plan recurring review checks that can prepare execution requests without automatic approval, execution, or inventory changes."
          meta={<OperationalWorkspaceMetaPill>Tenant-scoped</OperationalWorkspaceMetaPill>}
          aside={<StatusChip status="disabled" />}
        />
        <section className="app-panel automation-schedules-card">
          <OperationalSectionHeader iconPath="/automation-schedules" title="Automation schedules are not included in this tenant plan" description="The feature is unavailable for this tenant, so schedule endpoints are not used." />
        </section>
      </div>
    );
  }

  return (
    <div className="automation-schedules-page io-operational-page io-workspace-page" id="automation-schedules-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/automation-schedules"
        eyebrow="Execution workflow"
        title="Automation schedules"
        description="Plan recurring review checks that can prepare execution requests. Schedules never approve or execute changes automatically."
        meta={
          <>
            <OperationalWorkspaceMetaPill>Tenant-scoped</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Review scheduling</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>No automatic execution</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          <button type="button" className="btn btn-secondary" disabled={loading || saving} onClick={() => void refreshPage()}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {error ? <div className="automation-schedules-alert automation-schedules-alert--error" role="alert">{error}</div> : null}
      {warning ? <div className="automation-schedules-alert automation-schedules-alert--warning" role="status">{warning}</div> : null}
      {message ? <div className="automation-schedules-alert automation-schedules-alert--success" role="status">{message}</div> : null}

      <OperationalWorkspaceStats ariaLabel="Automation schedule summary">
        <OperationalWorkspaceStatCard label="Total schedules" value={numberValue(runnerReadiness?.totals.total_schedules)} helper={`${numberValue(runnerReadiness?.totals.draft_schedules)} drafts`} tone="slate" iconPath="/automation-schedules" loading={loading} />
        <OperationalWorkspaceStatCard label="Active" value={activeCount} helper="Currently eligible for scheduled review preparation" tone={activeCount > 0 ? 'blue' : 'neutral'} iconPath="/automation-schedules" loading={loading} />
        <OperationalWorkspaceStatCard label="Due now" value={numberValue(runnerReadiness?.totals.due_schedule_count)} helper="Active schedules currently due" tone={numberValue(runnerReadiness?.totals.due_schedule_count) > 0 ? 'warn' : 'good'} iconPath="/alerts" loading={loading} />
        <OperationalWorkspaceStatCard label="Paused" value={numberValue(runnerReadiness?.totals.paused_schedules)} helper="Temporarily excluded from scheduled runs" tone="neutral" iconPath="/automation-schedules" loading={loading} />
        <OperationalWorkspaceStatCard label="Disabled" value={numberValue(runnerReadiness?.totals.disabled_schedules)} helper="Permanently stopped schedules" tone={numberValue(runnerReadiness?.totals.disabled_schedules) > 0 ? 'warn' : 'good'} iconPath="/automation-schedules" loading={loading} />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel="Automation schedule work areas" hint="Jump to the part of the scheduling workflow you need.">
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'overview'} iconPath="/dashboard" label="Overview" onClick={() => navigateWorkspaceSection('overview', document.getElementById('automation-schedules-workspace-top'))} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'registry'} iconPath="/automation-schedules" label="Schedules" count={total} onClick={() => navigateWorkspaceSection('registry', registryRef.current)} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'create'} iconPath="/execution-requests" label="Create schedule" onClick={() => navigateWorkspaceSection('create', createRef.current)} disabled={!canCreateAutomationSchedules} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'detail'} iconPath="/audit" label="Schedule detail" onClick={() => navigateWorkspaceSection('detail', detailRef.current)} disabled={!selected} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'safety'} iconPath="/reliability-command" label="Automation safety" onClick={() => { setGovernanceOpen(true); navigateWorkspaceSection('safety', safetyRef.current); }} />
      </OperationalWorkspaceTabs>

      <div ref={registryRef} id="automation-schedule-registry" className="automation-schedules-scroll-anchor">
        <section className="app-panel automation-schedules-card automation-schedules-section-card">
          <OperationalSectionHeader
            iconPath="/automation-schedules"
            title="Schedule registry"
            description="Find tenant schedules, review their status, and open one for actions or history."
            actions={<button type="button" className="btn btn-secondary" disabled={loading || saving} onClick={clearFilters}>Clear filters</button>}
          />

          <div className="automation-schedules-filters">
            <label>
              <span>Search</span>
              <input value={searchInput} maxLength={255} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name, description, review type, status, or timezone" />
            </label>
            <label>
              <span>Status</span>
              <select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setOffset(0); }}>
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <label>
              <span>Review type</span>
              <select value={automationType} onChange={(event) => { setAutomationType(event.target.value as TypeFilter); setOffset(0); }}>
                <option value="">All types</option>
                {availableTypes.map((type) => <option key={type.automation_type} value={type.automation_type}>{type.label}</option>)}
              </select>
            </label>
            <label>
              <span>Rows per page</span>
              <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setOffset(0); }}>
                {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>

          <div className="automation-schedules-table-wrap">
            <table className="automation-schedules-table">
              <thead><tr><th>Schedule</th><th>Status</th><th>Timing</th><th>Next run</th><th>Actions</th></tr></thead>
              <tbody>
                {data?.rows.map((schedule) => (
                  <tr key={schedule.id} className={selected?.id === schedule.id ? 'automation-schedules-row--selected' : undefined}>
                    <td><button type="button" className="automation-schedules-name-button" onClick={() => void loadScheduleDetail(schedule)}>{schedule.name}</button><span>{schedule.type_definition?.label || humanize(schedule.automation_type)}</span></td>
                    <td><StatusChip status={schedule.status} /></td>
                    <td>{schedulePattern(schedule)}</td>
                    <td>{schedule.next_run_at ? formatDateTime(schedule.next_run_at, scheduleTimezone(schedule)) : 'Not scheduled'}</td>
                    <td>
                      <div className="automation-schedules-row-actions">
                        <button type="button" onClick={() => void loadScheduleDetail(schedule)}>View</button>
                        <button type="button" disabled={saving || schedule.status === 'disabled'} onClick={() => void dryRunSchedule(schedule)}>Preview</button>
                        {canCreateAutomationSchedules && canCreateExecutionRequests ? <button type="button" disabled={saving || schedule.status === 'disabled'} onClick={() => setConfirmation({ kind: 'manual_run', schedule })}>Create request</button> : null}
                        {(schedule.status === 'draft' || schedule.status === 'paused') && canResumeAutomationSchedules ? <button type="button" disabled={saving} onClick={() => setConfirmation({ kind: 'activate', schedule })}>Activate</button> : null}
                        {(schedule.status === 'draft' || schedule.status === 'active') && canPauseAutomationSchedules ? <button type="button" disabled={saving} onClick={() => void pauseSchedule(schedule)}>Pause</button> : null}
                        {schedule.status !== 'disabled' && canDisableAutomationSchedules ? <button type="button" className="automation-schedules-danger-link" disabled={saving} onClick={() => { setConfirmation({ kind: 'disable', schedule }); setConfirmationText(''); }}>Disable</button> : null}
                        {canViewExecutionRequests ? <button type="button" onClick={() => void loadAuditPack(schedule)}>Audit</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !data?.rows.length ? <tr><td colSpan={5} className="automation-schedules-empty">No schedules match the current filters.</td></tr> : null}
                {loading && !data?.rows.length ? <tr><td colSpan={5} className="automation-schedules-empty">Loading schedules…</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="automation-schedules-pagination">
            <span>Showing {currentStart}–{currentEnd} of {total}</span>
            <div>
              <button type="button" disabled={!hasPreviousPage || loading} onClick={() => setOffset(Math.max(0, offset - limit))}>Previous</button>
              <button type="button" disabled={!hasNextPage || loading} onClick={() => setOffset(offset + limit)}>Next</button>
            </div>
          </div>
        </section>
      </div>

      <div ref={createRef} id="automation-schedule-create" className="automation-schedules-scroll-anchor">
        <section className="app-panel automation-schedules-card automation-schedules-section-card">
          <OperationalSectionHeader iconPath="/execution-requests" title="Create schedule" description="Create a draft schedule for a recurring or manual review. Nothing runs until the schedule is activated." />
          {canCreateAutomationSchedules ? (
            <>
              {formFields(form, setForm, 'automation-create')}
              {selectedTypeDefinition ? <p className="automation-schedules-type-help"><strong>{selectedTypeDefinition.label}:</strong> {selectedTypeDefinition.description}</p> : null}
              <div className="automation-schedules-create-footer">
                <span>A schedule may prepare a reviewable request. It cannot approve, execute, or change stock.</span>
                <button type="button" className="btn btn-primary" disabled={saving || form.name.trim().length < 3} onClick={() => void createSchedule()}>{saving ? 'Creating…' : 'Create draft schedule'}</button>
              </div>
            </>
          ) : <div className="automation-schedules-readonly">You can view schedules, but your role cannot create them.</div>}
        </section>
      </div>

      {selected ? (
        <section ref={detailRef} id="automation-schedule-detail" className="app-panel automation-schedules-card automation-schedules-detail-card automation-schedules-scroll-anchor">
          <OperationalSectionHeader
            iconPath="/audit"
            title={selected.name}
            description={selected.description || 'No description recorded.'}
            actions={<StatusChip status={selected.status} />}
          />

          <div className="automation-schedules-detail-actions" aria-label="Selected schedule actions">
            <button type="button" className="btn btn-secondary" disabled={saving || selected.status === 'disabled'} onClick={() => void dryRunSchedule(selected)}>Preview</button>
            {canCreateAutomationSchedules && canCreateExecutionRequests ? <button type="button" className="btn btn-secondary" disabled={saving || selected.status === 'disabled'} onClick={() => setConfirmation({ kind: 'manual_run', schedule: selected })}>Create request</button> : null}
            {(selected.status === 'draft' || selected.status === 'paused') && canResumeAutomationSchedules ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => setConfirmation({ kind: 'activate', schedule: selected })}>Activate</button> : null}
            {(selected.status === 'draft' || selected.status === 'active') && canPauseAutomationSchedules ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void pauseSchedule(selected)}>Pause</button> : null}
            {selected.status !== 'disabled' && canDisableAutomationSchedules ? <button type="button" className="btn btn-danger" disabled={saving} onClick={() => { setConfirmation({ kind: 'disable', schedule: selected }); setConfirmationText(''); }}>Disable</button> : null}
            {canViewExecutionRequests ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void loadAuditPack(selected)}>Load audit history</button> : null}
          </div>

          <div className="automation-schedules-detail-grid">
            <div><span>Review type</span><strong>{selected.type_definition?.label || humanize(selected.automation_type)}</strong></div>
            <div><span>Schedule</span><strong>{schedulePattern(selected)}</strong></div>
            <div><span>Next run</span><strong>{selected.next_run_at ? formatDateTime(selected.next_run_at, scheduleTimezone(selected)) : 'Not scheduled'}</strong></div>
            <div><span>Last run</span><strong>{formatDateTime(selected.last_run_at, scheduleTimezone(selected))}</strong></div>
            <div><span>Created by</span><strong>{selected.created_by_name || 'System / unavailable'}</strong></div>
            <div><span>Updated</span><strong>{formatDateTime(selected.updated_at)}</strong></div>
            <div><span>Created request starts as</span><strong>{humanize(String(selected.request_defaults?.default_status || 'draft'))}</strong></div>
            <div><span>Automatic execution</span><strong>No</strong></div>
          </div>

          {selected.disabled_reason ? <div className="automation-schedules-alert automation-schedules-alert--warning"><strong>Disable reason:</strong> {selected.disabled_reason}</div> : null}

          {selected.timeline?.length ? (
            <div className="automation-schedules-timeline">
              <h4>Lifecycle</h4>
              {selected.timeline.map((row, index) => <div key={`${row.status}-${row.at || index}`}><span className="automation-schedules-timeline-dot" /><div><strong>{row.label}</strong><span>{formatDateTime(row.at)} · {row.by || 'Unknown user'}</span></div></div>)}
            </div>
          ) : null}

          {canUpdateAutomationSchedules && selected.status !== 'disabled' ? (
            <div id="automation-schedule-edit-form" className="automation-schedules-edit-panel">
              <div className="automation-schedules-section-heading">
                <div><h4>Edit schedule</h4><p>Changing calendar settings recalculates the next future occurrence.</p></div>
                {!editForm ? <button type="button" className="btn btn-secondary" onClick={() => { setEditForm(scheduleToForm(selected)); scrollToFormSection('automation-schedule-edit-form'); }}>Edit</button> : null}
              </div>
              {editForm ? <>{formFields(editForm, setEditForm, 'automation-edit')}<div className="automation-schedules-actions"><button type="button" className="btn btn-primary" disabled={saving} onClick={() => void updateSchedule(selected)}>{saving ? 'Saving…' : 'Save changes'}</button><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setEditForm(scheduleToForm(selected))}>Reset</button></div></> : null}
            </div>
          ) : null}

          {dryRunResult ? (
            <div className="automation-schedules-result-panel">
              <div className="automation-schedules-section-heading"><div><h4>Preview result</h4><p>No request or business record was changed.</p></div><span className="automation-schedules-safety-pill">Preview only</span></div>
              <div className="automation-schedules-metrics">
                <div><strong>{dryRunResult.would_create_execution_request ? 'Yes' : 'No'}</strong><span>Would prepare request</span></div>
                <div><strong>{dryRunResult.would_execute_request ? 'Yes' : 'No'}</strong><span>Would execute</span></div>
                <div><strong>{dryRunResult.would_mutate_inventory ? 'Yes' : 'No'}</strong><span>Would change inventory</span></div>
                <div><strong>{humanize(dryRunResult.candidate_request.status)}</strong><span>Request starting status</span></div>
              </div>
              <ul className="automation-schedules-check-list">{dryRunResult.checks.map((check) => <li key={check.key}><StatusChip status={check.status} /><span><strong>{check.label}</strong>{check.detail}</span></li>)}</ul>
            </div>
          ) : null}

          {manualRunResult ? (
            <div className="automation-schedules-result-panel">
              <div className="automation-schedules-section-heading"><div><h4>Request creation result</h4><p>The resulting request still follows its normal review and approval workflow.</p></div><StatusChip status={manualRunResult.execution_request?.status} /></div>
              <div className="automation-schedules-metrics">
                <div><strong>{manualRunResult.created_execution_request_count}</strong><span>Requests created</span></div>
                <div><strong>{manualRunResult.duplicate_guard_triggered ? 'Yes' : 'No'}</strong><span>Duplicate prevented</span></div>
                <div><strong>No</strong><span>Automatic approval</span></div>
                <div><strong>No</strong><span>Automatic execution</span></div>
              </div>
              <ul className="automation-schedules-check-list">{manualRunResult.checks.map((check) => <li key={check.key}><StatusChip status={check.status} /><span><strong>{check.label}</strong>{check.detail}</span></li>)}</ul>
            </div>
          ) : null}

          {auditPack ? (
            <div className="automation-schedules-result-panel">
              <div className="automation-schedules-section-heading"><div><h4>Audit history</h4><p>Schedule activity, linked requests, and completeness checks.</p></div><StatusChip status={auditPack.completeness.complete ? 'pass' : 'watch'} /></div>
              <div className="automation-schedules-metrics">
                <div><strong>{auditPack.evidence_summary.schedule_audit_event_count}</strong><span>Schedule events</span></div>
                <div><strong>{auditPack.evidence_summary.execution_request_count}</strong><span>Linked requests</span></div>
                <div><strong>{auditPack.evidence_summary.run_event_count || 0}</strong><span>Schedule runs</span></div>
                <div><strong>{auditPack.completeness.complete ? 'Complete' : 'Review needed'}</strong><span>Audit status</span></div>
              </div>
              <ul className="automation-schedules-check-list">{auditPack.checks.map((check) => <li key={check.key}><StatusChip status={check.status} /><span><strong>{check.label}</strong>{check.detail}</span></li>)}</ul>
              {auditPack.linked_execution_requests.length ? (
                <div className="automation-schedules-table-wrap">
                  <table className="automation-schedules-table automation-schedules-table--compact">
                    <thead><tr><th>Request type</th><th>Workflow</th><th>Execution</th><th>Created</th></tr></thead>
                    <tbody>{auditPack.linked_execution_requests.map((request) => <tr key={request.id}><td>{humanize(request.request_type)}</td><td>{humanize(request.status)}</td><td>{humanize(request.execution_status)}</td><td>{formatDateTime(request.created_at)}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : <p className="automation-schedules-muted">No linked execution requests were found.</p>}
            </div>
          ) : null}
        </section>
      ) : null}

      <section ref={safetyRef} id="automation-schedule-safety" className="app-panel automation-schedules-card automation-schedules-section-card automation-schedules-scroll-anchor">
        <OperationalSectionHeader
          iconPath="/reliability-command"
          title="Automation safety"
          description="Review whether schedules can prepare requests and see recent schedule activity. Technical runner diagnostics remain outside the normal tenant workflow."
          actions={<button type="button" className="btn btn-secondary" aria-expanded={governanceOpen} onClick={() => setGovernanceOpen((current) => !current)}>{governanceOpen ? 'Hide details' : 'Show details'}</button>}
        />

        <div className="automation-schedules-safety-baseline">
          <div><strong>Off</strong><span>Automatic execution</span><small>Schedules cannot approve or execute requests.</small></div>
          <div><strong>{activeCount}</strong><span>Active schedules</span><small>Only active schedules can become due.</small></div>
          <div><strong>{numberValue(runnerReadiness?.totals.due_schedule_count)}</strong><span>Due now</span><small>Schedules currently ready for review preparation.</small></div>
        </div>

        {governanceOpen ? (
          <div className="automation-schedules-safety-content">
            {!governanceLoaded && governanceLoading ? <p className="automation-schedules-muted">Loading automation safety status…</p> : null}
            {!governanceLoaded && !governanceLoading ? <button type="button" className="btn btn-secondary" onClick={() => void loadGovernance()}>Load safety status</button> : null}

            {runnerStatus ? (
              <>
                <div className="automation-schedules-metrics automation-schedules-metrics--safety">
                  <div><strong>{runnerStatus.request_creation_enabled ? 'Enabled' : 'Off'}</strong><span>Request preparation</span></div>
                  <div><strong>{runnerStatus.started ? 'Running' : 'Not running'}</strong><span>Background scheduler</span></div>
                  <div><strong>Off</strong><span>Automatic execution</span></div>
                  <div><strong>{numberValue(runnerStatus.failed_tick_count)}</strong><span>Failed runs</span></div>
                  <div><strong>{humanize(runnerStatus.last_tick_outcome)}</strong><span>Last activity</span></div>
                </div>

                {canCreateAutomationSchedules && canCreateExecutionRequests ? (
                  <div className="automation-schedules-actions">
                    <button type="button" className="btn btn-primary" disabled={saving || !runnerStatus.request_creation_enabled} onClick={() => setConfirmation({ kind: 'run_due' })}>Process due schedules now</button>
                    <span className="automation-schedules-muted">This can prepare reviewable requests only; it cannot approve or execute them.</span>
                  </div>
                ) : null}

                {runnerStatus.unsafe_runner_output_review_required ? (
                  <div className="automation-schedules-alert automation-schedules-alert--warning">
                    <strong>Automation safety review required.</strong> A recorded anomaly needs acknowledgement before broader schedule use.
                    {canCreateAutomationSchedules && runnerStatus.unsafe_runner_output_review_acknowledge_allowed ? <button type="button" className="btn btn-secondary" onClick={() => { setConfirmation({ kind: 'acknowledge_anomaly' }); setConfirmationText(''); }}>Acknowledge review</button> : null}
                  </div>
                ) : null}
              </>
            ) : null}

            {runEvents ? (
              <div className="automation-schedules-recent-activity">
                <div className="automation-schedules-section-heading"><div><h4>Recent schedule activity</h4><p>Latest manual or scheduled processing attempts for this tenant.</p></div><span>{runEvents.total} total</span></div>
                <div className="automation-schedules-table-wrap">
                  <table className="automation-schedules-table automation-schedules-table--compact">
                    <thead><tr><th>Schedule</th><th>Run type</th><th>Outcome</th><th>Request prepared</th><th>Time</th></tr></thead>
                    <tbody>{runEvents.rows.map((event) => <tr key={event.id}><td>{event.schedule_name}</td><td>{humanize(event.run_mode)}</td><td><StatusChip status={event.status} /></td><td>{event.execution_request_id ? 'Yes' : 'No'}</td><td>{formatDateTime(event.created_at)}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {runnerRunOnceResult ? (
              <div className="automation-schedules-result-panel">
                <h4>Latest processing result</h4>
                <div className="automation-schedules-metrics">
                  <div><strong>{runnerRunOnceResult.processed_schedule_count}</strong><span>Processed</span></div>
                  <div><strong>{runnerRunOnceResult.created_execution_request_count}</strong><span>Requests prepared</span></div>
                  <div><strong>{runnerRunOnceResult.skipped_schedule_count || 0}</strong><span>Skipped</span></div>
                  <div><strong>{runnerRunOnceResult.failed_schedule_count || 0}</strong><span>Failed</span></div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {confirmation ? (
        <div className="automation-schedules-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setConfirmation(null); }}>
          <section className="automation-schedules-modal" role="dialog" aria-modal="true" aria-labelledby="automation-confirmation-title">
            <h3 id="automation-confirmation-title">
              {confirmation.kind === 'activate' ? 'Activate schedule' : null}
              {confirmation.kind === 'disable' ? 'Disable schedule' : null}
              {confirmation.kind === 'manual_run' ? 'Create execution request' : null}
              {confirmation.kind === 'run_due' ? 'Process due schedules now' : null}
              {confirmation.kind === 'acknowledge_anomaly' ? 'Acknowledge automation safety review' : null}
            </h3>
            {confirmation.kind === 'activate' ? <p>Activate “{confirmation.schedule.name}”? Its next run will be recalculated from now. If controlled request creation is enabled, a due run may prepare a reviewable request but cannot approve or execute it.</p> : null}
            {confirmation.kind === 'manual_run' ? <p>Create one reviewable execution request from “{confirmation.schedule.name}”? Duplicate protection applies. Nothing will be approved or executed automatically.</p> : null}
            {confirmation.kind === 'run_due' ? <p>Process currently due active schedules now? This may prepare reviewable execution requests only.</p> : null}
            {confirmation.kind === 'disable' ? (
              <label className="automation-schedules-field">
                <span>Disable reason</span>
                <textarea value={confirmationText} minLength={3} maxLength={1000} onChange={(event) => setConfirmationText(event.target.value)} placeholder="Explain why this schedule is being disabled." />
              </label>
            ) : null}
            {confirmation.kind === 'acknowledge_anomaly' ? (
              <label className="automation-schedules-field">
                <span>Review note</span>
                <textarea value={confirmationText} minLength={numberValue(runnerStatus?.unsafe_runner_output_review_note_min_length) || 10} maxLength={numberValue(runnerStatus?.unsafe_runner_output_review_note_max_length) || 1000} onChange={(event) => setConfirmationText(event.target.value)} placeholder="Record what was reviewed and why the evidence is understood." />
                <small>The review is recorded for audit purposes; raw technical evidence is not shown on the tenant page.</small>
              </label>
            ) : null}
            <div className="automation-schedules-modal-actions">
              <button type="button" className="automation-schedules-button automation-schedules-button--secondary" disabled={saving} onClick={() => { setConfirmation(null); setConfirmationText(''); }}>Cancel</button>
              <button type="button" className={`automation-schedules-button ${confirmation.kind === 'disable' ? 'automation-schedules-button--danger' : 'automation-schedules-button--primary'}`} disabled={saving} onClick={() => void confirmAction()}>{saving ? 'Working…' : 'Confirm'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
