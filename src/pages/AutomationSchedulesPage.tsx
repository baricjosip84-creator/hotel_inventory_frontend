import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // v3.49.107: tenant title info pills intentionally hidden.
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

function formatDateTime(value: string | null | undefined, locale: AppLocale, timezone?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  try {
    return formatLocalizedDateTime(parsed, locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(timezone ? { timeZone: timezone } : {})
    });
  } catch {
    return formatLocalizedDateTime(parsed, locale);
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

function schedulePattern(schedule: AutomationSchedule, ui: (text: string) => string): string {
  const kind = schedule.schedule_kind as ScheduleKind;
  if (kind === 'manual') return ui('Manual only');
  const time = typeof scheduleConfigValue(schedule, 'time') === 'string' ? String(scheduleConfigValue(schedule, 'time')) : '09:00';
  const timezone = scheduleTimezone(schedule);
  if (kind === 'daily') return ui('Daily at {time} · {timezone}').replace('{time}', time).replace('{timezone}', timezone);
  if (kind === 'weekly') {
    const day = Number(scheduleConfigValue(schedule, 'day_of_week'));
    const dayName = ui(DAY_NAMES[Number.isInteger(day) && day >= 0 && day <= 6 ? day : 1]);
    return ui('Every {day} at {time} · {timezone}').replace('{day}', dayName).replace('{time}', time).replace('{timezone}', timezone);
  }
  const day = Number(scheduleConfigValue(schedule, 'day_of_month'));
  return ui('Monthly on day {day} at {time} · {timezone}').replace('{day}', String(Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1)).replace('{time}', time).replace('{timezone}', timezone);
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
  const { ui } = useAppTranslation();
  const normalized = status || 'unknown';
  return <span className={`automation-schedules-chip automation-schedules-chip--${normalized}`}>{ui(humanize(normalized))}</span>;
}

export default function AutomationSchedulesPage() {
  const { locale, ui } = useAppTranslation();
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

  const availableTypes = types?.automation_types?.length ? types.automation_types : fallbackAutomationTypes.map((row) => ({ ...row, label: ui(row.label), description: ui(row.description) }));
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
      else secondaryWarnings.push(ui('Schedule type guidance could not be refreshed.'));

      if (readinessResult.status === 'fulfilled') setRunnerReadiness(readinessResult.value);
      else secondaryWarnings.push(ui('Runner readiness summary could not be refreshed.'));

      if (secondaryWarnings.length) setWarning(secondaryWarnings.join(' '));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ui('Failed to load automation schedules'));
    } finally {
      setLoading(false);
    }
  }, [query, ui]);

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
      else warnings.push(ui('Automation safety status could not be loaded.'));

      if (canViewExecutionRequests) {
        if (results[1]?.status === 'fulfilled') setRunEvents(results[1].value as AutomationScheduleRunEventsResponse);
        else warnings.push(ui('Recent automation activity could not be loaded.'));
      }

      setGovernanceLoaded(true);
      if (warnings.length) setWarning(warnings.join(' '));
    } finally {
      setGovernanceLoading(false);
    }
  }, [canViewExecutionRequests, ui]);

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
    if (value.name.trim().length < 3) return ui('Schedule name must contain at least 3 characters.');
    if (value.name.trim().length > 255) return ui('Schedule name must contain 255 characters or fewer.');
    if (value.description.length > 4000) return ui('Description must contain 4,000 characters or fewer.');
    if (value.schedule_kind !== 'manual' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) return ui('Choose a valid schedule time.');
    if (value.schedule_kind !== 'manual' && !isValidTimezone(value.timezone.trim())) return ui('Enter a valid IANA timezone, such as Europe/Zagreb or UTC.');
    if (value.schedule_kind === 'weekly' && (value.day_of_week < 0 || value.day_of_week > 6)) return ui('Choose a valid weekday.');
    if (value.schedule_kind === 'monthly' && (value.day_of_month < 1 || value.day_of_month > 31)) return ui('Monthly day must be between 1 and 31.');
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
      setMessage(ui('Created draft schedule “{name}”. It will not run automatically until it is activated and runner request creation is explicitly enabled.').replace('{name}', created.name));
      await loadCore({ preserveMessage: true });
      window.setTimeout(() => document.getElementById('automation-schedule-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ui('Failed to create automation schedule'));
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
      setError(err instanceof ApiError ? err.message : ui('Failed to load automation schedule detail'));
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
      setMessage(ui('Saved “{name}”. Its next-run time was recalculated from the updated calendar settings.').replace('{name}', updated.name));
      await loadCore({ preserveMessage: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ui('Failed to update automation schedule'));
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
      setMessage(ui('Paused “{name}”. It is no longer eligible for automatic due processing.').replace('{name}', updated.name));
      await loadCore({ preserveMessage: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ui('Failed to pause automation schedule'));
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
      setMessage(ui('Activated “{name}”. Its next run was scheduled from now, so an old paused date will not be processed as an immediate catch-up run.').replace('{name}', updated.name));
      await loadCore({ preserveMessage: true });
      if (governanceOpen) await loadGovernance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ui('Failed to activate automation schedule'));
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
      setMessage(ui('Disabled “{name}”. The reason is preserved in its audit trail.').replace('{name}', updated.name));
      await loadCore({ preserveMessage: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ui('Failed to disable automation schedule'));
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
      setMessage(ui('Dry run completed for “{name}”. No execution request or inventory record was changed.').replace('{name}', schedule.name));
      window.setTimeout(() => document.getElementById('automation-schedule-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ui('Failed to preview automation schedule'));
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
        ? ui('No duplicate request was created for “{name}”; the existing matching request was reused.').replace('{name}', schedule.name)
        : ui('Created a reviewable execution request from “{name}”. Nothing was approved or executed automatically.').replace('{name}', schedule.name));
      await loadCore({ preserveMessage: true });
      if (governanceOpen) await loadGovernance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ui('Failed to create an execution request from this schedule'));
    } finally {
      setSaving(false);
      setConfirmation(null);
    }
  };

  const loadAuditPack = async (schedule: AutomationSchedule) => {
    if (!canViewExecutionRequests) {
      setError(ui('Your current role cannot read linked execution-request evidence.'));
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
      setMessage(ui('Loaded the audit pack for “{name}”.').replace('{name}', schedule.name));
      window.setTimeout(() => document.getElementById('automation-schedule-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ui('Failed to load the schedule audit pack'));
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
      setMessage(ui('Run-once finished: {created} request(s) created, {skipped} schedule(s) skipped, and nothing executed automatically.').replace('{created}', formatLocalizedNumber(numberValue(response.created_execution_request_count), locale)).replace('{skipped}', formatLocalizedNumber(numberValue(response.skipped_schedule_count), locale)));
      await loadCore({ preserveMessage: true });
      await loadGovernance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ui('Failed to run due schedules once'));
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
      setError(ui('Refresh automation safety status before acknowledging the review.'));
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
      setMessage(ui('Automation safety review was acknowledged and the audit evidence remains preserved.'));
      await loadGovernance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ui('Failed to acknowledge runner anomaly review'));
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
        setError(ui('Enter a disable reason of at least 3 characters.'));
        return;
      }
      return disableSchedule(confirmation.schedule, confirmationText);
    }
    if (confirmation.kind === 'acknowledge_anomaly') {
      const min = numberValue(runnerStatus?.unsafe_runner_output_review_note_min_length) || 10;
      const max = numberValue(runnerStatus?.unsafe_runner_output_review_note_max_length) || 1000;
      if (confirmationText.trim().length < min || confirmationText.trim().length > max) {
        setError(ui('Review note must contain between {min} and {max} characters.').replace('{min}', formatLocalizedNumber(min, locale)).replace('{max}', formatLocalizedNumber(max, locale)));
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
          <span>{ui('Name')}</span>
          <input id={`${idPrefix}-name`} value={value.name} maxLength={255} onChange={(event) => onChange({ ...value, name: event.target.value })} placeholder={ui('Example: Weekly cost-risk review')} />
        </label>
        <label className="automation-schedules-field" htmlFor={`${idPrefix}-type`}>
          <span>{ui('Review type')}</span>
          <select id={`${idPrefix}-type`} value={value.automation_type} onChange={(event) => onChange({ ...value, automation_type: event.target.value })}>
            {availableTypes.map((type) => <option key={type.automation_type} value={type.automation_type}>{type.label}</option>)}
          </select>
        </label>
        <label className="automation-schedules-field" htmlFor={`${idPrefix}-frequency`}>
          <span>{ui('Frequency')}</span>
          <select id={`${idPrefix}-frequency`} value={value.schedule_kind} onChange={(event) => onChange({ ...value, schedule_kind: event.target.value as ScheduleKind })}>
            <option value="manual">{ui('Manual only')}</option>
            <option value="daily">{ui('Daily')}</option>
            <option value="weekly">{ui('Weekly')}</option>
            <option value="monthly">{ui('Monthly')}</option>
          </select>
        </label>
        {value.schedule_kind !== 'manual' ? (
          <>
            <label className="automation-schedules-field" htmlFor={`${idPrefix}-time`}>
              <span>{ui('Local time')}</span>
              <input id={`${idPrefix}-time`} type="time" value={value.time} onChange={(event) => onChange({ ...value, time: event.target.value })} />
            </label>
            <label className="automation-schedules-field" htmlFor={`${idPrefix}-timezone`}>
              <span>{ui('Timezone')}</span>
              <input id={`${idPrefix}-timezone`} value={value.timezone} maxLength={100} list="automation-timezones" onChange={(event) => onChange({ ...value, timezone: event.target.value })} placeholder="Europe/Zagreb" />
            </label>
          </>
        ) : null}
        {value.schedule_kind === 'weekly' ? (
          <label className="automation-schedules-field" htmlFor={`${idPrefix}-weekday`}>
            <span>{ui('Weekday')}</span>
            <select id={`${idPrefix}-weekday`} value={value.day_of_week} onChange={(event) => onChange({ ...value, day_of_week: Number(event.target.value) })}>
              {DAY_NAMES.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>
        ) : null}
        {value.schedule_kind === 'monthly' ? (
          <label className="automation-schedules-field" htmlFor={`${idPrefix}-month-day`}>
            <span>{ui('Day of month')}</span>
            <input id={`${idPrefix}-month-day`} type="number" min={1} max={31} value={value.day_of_month} onChange={(event) => onChange({ ...value, day_of_month: Number(event.target.value) })} />
          </label>
        ) : null}
        <label className="automation-schedules-field" htmlFor={`${idPrefix}-request-status`}>
          <span>{ui('New request status')}</span>
          <select id={`${idPrefix}-request-status`} value={value.default_status} onChange={(event) => onChange({ ...value, default_status: event.target.value as RequestDefaultStatus })}>
            <option value="draft">{ui('Draft')}</option>
            <option value="pending_review">{ui('Pending review')}</option>
          </select>
        </label>
      </div>
      <label className="automation-schedules-field" htmlFor={`${idPrefix}-description`}>
        <span>{ui('Description')}</span>
        <textarea id={`${idPrefix}-description`} value={value.description} maxLength={4000} onChange={(event) => onChange({ ...value, description: event.target.value })} placeholder={ui('Explain the business review this schedule prepares.')} />
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
          eyebrow={ui('Execution workflow')}
          title={ui('Automation schedules')}
          description={ui('Plan recurring review checks that can prepare execution requests without automatic approval, execution, or inventory changes.')}
          meta={
            undefined /*
              v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
              Previous rendering preserved for easy restoration:
              <OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill>
            */
          }
          aside={<StatusChip status="disabled" />}
        />
        <section className="app-panel automation-schedules-card">
          <OperationalSectionHeader iconPath="/automation-schedules" title={ui('Automation schedules are not included in this tenant plan')} description={ui('The feature is unavailable for this tenant, so schedule endpoints are not used.')} />
        </section>
      </div>
    );
  }

  return (
    <div className="automation-schedules-page io-operational-page io-workspace-page" id="automation-schedules-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/automation-schedules"
        eyebrow={ui('Execution workflow')}
        title={ui('Automation schedules')}
        description={ui('Plan recurring review checks that can prepare execution requests. Schedules never approve or execute changes automatically.')}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
                      <>
                        <OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui('Review scheduling')}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui('No automatic execution')}</OperationalWorkspaceMetaPill>
                      </>
                    
          */
        }
        aside={
          <button type="button" className="btn btn-secondary" disabled={loading || saving} onClick={() => void refreshPage()}>
            {loading ? ui('Refreshing…') : ui('Refresh')}
          </button>
        }
      />

      {error ? <div className="automation-schedules-alert automation-schedules-alert--error" role="alert">{error}</div> : null}
      {warning ? <div className="automation-schedules-alert automation-schedules-alert--warning" role="status">{warning}</div> : null}
      {message ? <div className="automation-schedules-alert automation-schedules-alert--success" role="status">{message}</div> : null}

      <OperationalWorkspaceStats ariaLabel={ui('Automation schedule summary')}>
        <OperationalWorkspaceStatCard label={ui('Total schedules')} value={numberValue(runnerReadiness?.totals.total_schedules)} helper={ui('{count} drafts').replace('{count}', formatLocalizedNumber(numberValue(runnerReadiness?.totals.draft_schedules), locale))} tone="slate" iconPath="/automation-schedules" loading={loading} />
        <OperationalWorkspaceStatCard label={ui('Active')} value={activeCount} helper={ui('Currently eligible for scheduled review preparation')} tone={activeCount > 0 ? 'blue' : 'neutral'} iconPath="/automation-schedules" loading={loading} />
        <OperationalWorkspaceStatCard label={ui('Due now')} value={numberValue(runnerReadiness?.totals.due_schedule_count)} helper={ui('Active schedules currently due')} tone={numberValue(runnerReadiness?.totals.due_schedule_count) > 0 ? 'warn' : 'good'} iconPath="/alerts" loading={loading} />
        <OperationalWorkspaceStatCard label={ui('Paused')} value={numberValue(runnerReadiness?.totals.paused_schedules)} helper={ui('Temporarily excluded from scheduled runs')} tone="neutral" iconPath="/automation-schedules" loading={loading} />
        <OperationalWorkspaceStatCard label={ui('Disabled')} value={numberValue(runnerReadiness?.totals.disabled_schedules)} helper={ui('Permanently stopped schedules')} tone={numberValue(runnerReadiness?.totals.disabled_schedules) > 0 ? 'warn' : 'good'} iconPath="/automation-schedules" loading={loading} />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel={ui('Automation schedule work areas')} hint={ui('Jump to the part of the scheduling workflow you need.')}>
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'overview'} iconPath="/dashboard" label={ui('Overview')} onClick={() => navigateWorkspaceSection('overview', document.getElementById('automation-schedules-workspace-top'))} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'registry'} iconPath="/automation-schedules" label={ui('Schedules')} count={total} onClick={() => navigateWorkspaceSection('registry', registryRef.current)} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'create'} iconPath="/execution-requests" label={ui('Create schedule')} onClick={() => navigateWorkspaceSection('create', createRef.current)} disabled={!canCreateAutomationSchedules} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'detail'} iconPath="/audit" label={ui('Schedule detail')} onClick={() => navigateWorkspaceSection('detail', detailRef.current)} disabled={!selected} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'safety'} iconPath="/reliability-command" label={ui('Automation safety')} onClick={() => { setGovernanceOpen(true); navigateWorkspaceSection('safety', safetyRef.current); }} />
      </OperationalWorkspaceTabs>

      <div ref={registryRef} id="automation-schedule-registry" className="automation-schedules-scroll-anchor">
        <section className="app-panel automation-schedules-card automation-schedules-section-card">
          <OperationalSectionHeader
            iconPath="/automation-schedules"
            title={ui('Schedule registry')}
            description={ui('Find tenant schedules, review their status, and open one for actions or history.')}
            actions={<button type="button" className="btn btn-secondary" disabled={loading || saving} onClick={clearFilters}>{ui('Clear filters')}</button>}
          />

          <div className="automation-schedules-filters">
            <label>
              <span>{ui('Search')}</span>
              <input value={searchInput} maxLength={255} onChange={(event) => setSearchInput(event.target.value)} placeholder={ui('Search name, description, review type, status, or timezone')} />
            </label>
            <label>
              <span>{ui('Status')}</span>
              <select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setOffset(0); }}>
                <option value="">{ui('All statuses')}</option>
                <option value="draft">{ui('Draft')}</option>
                <option value="active">{ui('Active')}</option>
                <option value="paused">{ui('Paused')}</option>
                <option value="disabled">{ui('Disabled')}</option>
              </select>
            </label>
            <label>
              <span>{ui('Review type')}</span>
              <select value={automationType} onChange={(event) => { setAutomationType(event.target.value as TypeFilter); setOffset(0); }}>
                <option value="">{ui('All types')}</option>
                {availableTypes.map((type) => <option key={type.automation_type} value={type.automation_type}>{type.label}</option>)}
              </select>
            </label>
            <label>
              <span>{ui('Rows per page')}</span>
              <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setOffset(0); }}>
                {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>

          <div className="automation-schedules-table-wrap">
            <table className="automation-schedules-table">
              <thead><tr><th>{ui('Schedule')}</th><th>{ui('Status')}</th><th>{ui('Timing')}</th><th>{ui('Next run')}</th><th>{ui('Actions')}</th></tr></thead>
              <tbody>
                {data?.rows.map((schedule) => (
                  <tr key={schedule.id} className={selected?.id === schedule.id ? 'automation-schedules-row--selected' : undefined}>
                    <td><button type="button" className="automation-schedules-name-button" onClick={() => void loadScheduleDetail(schedule)}>{schedule.name}</button><span>{schedule.type_definition?.label || ui(humanize(schedule.automation_type))}</span></td>
                    <td><StatusChip status={schedule.status} /></td>
                    <td>{schedulePattern(schedule, ui)}</td>
                    <td>{schedule.next_run_at ? formatDateTime(schedule.next_run_at, locale, scheduleTimezone(schedule)) : ui('Not scheduled')}</td>
                    <td>
                      <div className="automation-schedules-row-actions">
                        <button type="button" onClick={() => void loadScheduleDetail(schedule)}>{ui('View')}</button>
                        <button type="button" disabled={saving || schedule.status === 'disabled'} onClick={() => void dryRunSchedule(schedule)}>{ui('Preview')}</button>
                        {canCreateAutomationSchedules && canCreateExecutionRequests ? <button type="button" disabled={saving || schedule.status === 'disabled'} onClick={() => setConfirmation({ kind: 'manual_run', schedule })}>{ui('Create request')}</button> : null}
                        {(schedule.status === 'draft' || schedule.status === 'paused') && canResumeAutomationSchedules ? <button type="button" disabled={saving} onClick={() => setConfirmation({ kind: 'activate', schedule })}>{ui('Activate')}</button> : null}
                        {(schedule.status === 'draft' || schedule.status === 'active') && canPauseAutomationSchedules ? <button type="button" disabled={saving} onClick={() => void pauseSchedule(schedule)}>{ui('Pause')}</button> : null}
                        {schedule.status !== 'disabled' && canDisableAutomationSchedules ? <button type="button" className="automation-schedules-danger-link" disabled={saving} onClick={() => { setConfirmation({ kind: 'disable', schedule }); setConfirmationText(''); }}>{ui('Disable')}</button> : null}
                        {canViewExecutionRequests ? <button type="button" onClick={() => void loadAuditPack(schedule)}>{ui('Audit')}</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !data?.rows.length ? <tr><td colSpan={5} className="automation-schedules-empty">{ui('No schedules match the current filters.')}</td></tr> : null}
                {loading && !data?.rows.length ? <tr><td colSpan={5} className="automation-schedules-empty">{ui('Loading schedules…')}</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="automation-schedules-pagination">
            <span>{ui('Showing')} {ui('{start}–{end} of {total}').replace('{start}', formatLocalizedNumber(currentStart, locale)).replace('{end}', formatLocalizedNumber(currentEnd, locale)).replace('{total}', formatLocalizedNumber(total, locale))}</span>
            <div>
              <button type="button" disabled={!hasPreviousPage || loading} onClick={() => setOffset(Math.max(0, offset - limit))}>{ui('Previous')}</button>
              <button type="button" disabled={!hasNextPage || loading} onClick={() => setOffset(offset + limit)}>{ui('Next')}</button>
            </div>
          </div>
        </section>
      </div>

      <div ref={createRef} id="automation-schedule-create" className="automation-schedules-scroll-anchor">
        <section className="app-panel automation-schedules-card automation-schedules-section-card">
          <OperationalSectionHeader iconPath="/execution-requests" title={ui('Create schedule')} description={ui('Create a draft schedule for a recurring or manual review. Nothing runs until the schedule is activated.')} />
          {canCreateAutomationSchedules ? (
            <>
              {formFields(form, setForm, 'automation-create')}
              {selectedTypeDefinition ? <p className="automation-schedules-type-help"><strong>{selectedTypeDefinition.label}:</strong> {selectedTypeDefinition.description}</p> : null}
              <div className="automation-schedules-create-footer">
                <span>{ui('A schedule may prepare a reviewable request. It cannot approve, execute, or change stock.')}</span>
                <button type="button" className="btn btn-primary" disabled={saving || form.name.trim().length < 3} onClick={() => void createSchedule()}>{saving ? ui('Creating…') : ui('Create draft schedule')}</button>
              </div>
            </>
          ) : <div className="automation-schedules-readonly">{ui('You can view schedules, but your role cannot create them.')}</div>}
        </section>
      </div>

      {selected ? (
        <section ref={detailRef} id="automation-schedule-detail" className="app-panel automation-schedules-card automation-schedules-detail-card automation-schedules-scroll-anchor">
          <OperationalSectionHeader
            iconPath="/audit"
            title={selected.name}
            description={selected.description || ui('No description recorded.')}
            actions={<StatusChip status={selected.status} />}
          />

          <div className="automation-schedules-detail-actions" aria-label={ui('Selected schedule actions')}>
            <button type="button" className="btn btn-secondary" disabled={saving || selected.status === 'disabled'} onClick={() => void dryRunSchedule(selected)}>{ui('Preview')}</button>
            {canCreateAutomationSchedules && canCreateExecutionRequests ? <button type="button" className="btn btn-secondary" disabled={saving || selected.status === 'disabled'} onClick={() => setConfirmation({ kind: 'manual_run', schedule: selected })}>{ui('Create request')}</button> : null}
            {(selected.status === 'draft' || selected.status === 'paused') && canResumeAutomationSchedules ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => setConfirmation({ kind: 'activate', schedule: selected })}>{ui('Activate')}</button> : null}
            {(selected.status === 'draft' || selected.status === 'active') && canPauseAutomationSchedules ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void pauseSchedule(selected)}>{ui('Pause')}</button> : null}
            {selected.status !== 'disabled' && canDisableAutomationSchedules ? <button type="button" className="btn btn-danger" disabled={saving} onClick={() => { setConfirmation({ kind: 'disable', schedule: selected }); setConfirmationText(''); }}>{ui('Disable')}</button> : null}
            {canViewExecutionRequests ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void loadAuditPack(selected)}>{ui('Load audit history')}</button> : null}
          </div>

          <div className="automation-schedules-detail-grid">
            <div><span>{ui('Review type')}</span><strong>{selected.type_definition?.label || ui(humanize(selected.automation_type))}</strong></div>
            <div><span>{ui('Schedule')}</span><strong>{schedulePattern(selected, ui)}</strong></div>
            <div><span>{ui('Next run')}</span><strong>{selected.next_run_at ? formatDateTime(selected.next_run_at, locale, scheduleTimezone(selected)) : ui('Not scheduled')}</strong></div>
            <div><span>{ui('Last run')}</span><strong>{formatDateTime(selected.last_run_at, scheduleTimezone(selected))}</strong></div>
            <div><span>{ui('Created by')}</span><strong>{selected.created_by_name || ui('System / unavailable')}</strong></div>
            <div><span>{ui('Updated')}</span><strong>{formatDateTime(selected.updated_at, locale)}</strong></div>
            <div><span>{ui('New request status')}</span><strong>{ui(humanize(String(selected.request_defaults?.default_status || 'draft')))}</strong></div>
            <div><span>{ui('Automatic execution')}</span><strong>{ui('No')}</strong></div>
          </div>

          {selected.disabled_reason ? <div className="automation-schedules-alert automation-schedules-alert--warning"><strong>{ui('Disable reason:')}</strong> {selected.disabled_reason}</div> : null}

          {selected.timeline?.length ? (
            <div className="automation-schedules-timeline">
              <h4>{ui('Lifecycle')}</h4>
              {selected.timeline.map((row, index) => <div key={`${row.status}-${row.at || index}`}><span className="automation-schedules-timeline-dot" /><div><strong>{row.label}</strong><span>{formatDateTime(row.at, locale)} · {row.by || ui('Unknown user')}</span></div></div>)}
            </div>
          ) : null}

          {canUpdateAutomationSchedules && selected.status !== 'disabled' ? (
            <div id="automation-schedule-edit-form" className="automation-schedules-edit-panel">
              <div className="automation-schedules-section-heading">
                <div><h4>{ui('Edit schedule')}</h4><p>{ui('Changing calendar settings recalculates the next future occurrence.')}</p></div>
                {!editForm ? <button type="button" className="btn btn-secondary" onClick={() => { setEditForm(scheduleToForm(selected)); scrollToFormSection('automation-schedule-edit-form'); }}>{ui('Edit')}</button> : null}
              </div>
              {editForm ? <>{formFields(editForm, setEditForm, 'automation-edit')}<div className="automation-schedules-actions"><button type="button" className="btn btn-primary" disabled={saving} onClick={() => void updateSchedule(selected)}>{saving ? ui('Saving…') : ui('Save changes')}</button><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setEditForm(scheduleToForm(selected))}>{ui('Reset')}</button></div></> : null}
            </div>
          ) : null}

          {dryRunResult ? (
            <div className="automation-schedules-result-panel">
              <div className="automation-schedules-section-heading"><div><h4>{ui('Preview result')}</h4><p>{ui('No request or business record was changed.')}</p></div><span className="automation-schedules-safety-pill">{ui('Preview only')}</span></div>
              <div className="automation-schedules-metrics">
                <div><strong>{dryRunResult.would_create_execution_request ? ui('Yes') : ui('No')}</strong><span>{ui('Would prepare request')}</span></div>
                <div><strong>{dryRunResult.would_execute_request ? ui('Yes') : ui('No')}</strong><span>{ui('Would execute')}</span></div>
                <div><strong>{dryRunResult.would_mutate_inventory ? ui('Yes') : ui('No')}</strong><span>{ui('Would change inventory')}</span></div>
                <div><strong>{humanize(dryRunResult.candidate_request.status)}</strong><span>{ui('Request starting status')}</span></div>
              </div>
              <ul className="automation-schedules-check-list">{dryRunResult.checks.map((check) => <li key={check.key}><StatusChip status={check.status} /><span><strong>{check.label}</strong>{check.detail}</span></li>)}</ul>
            </div>
          ) : null}

          {manualRunResult ? (
            <div className="automation-schedules-result-panel">
              <div className="automation-schedules-section-heading"><div><h4>{ui('Request creation result')}</h4><p>{ui('The resulting request still follows its normal review and approval workflow.')}</p></div><StatusChip status={manualRunResult.execution_request?.status} /></div>
              <div className="automation-schedules-metrics">
                <div><strong>{manualRunResult.created_execution_request_count}</strong><span>{ui('Requests created')}</span></div>
                <div><strong>{manualRunResult.duplicate_guard_triggered ? ui('Yes') : ui('No')}</strong><span>{ui('Duplicate prevented')}</span></div>
                <div><strong>{ui('No')}</strong><span>{ui('Automatic approval')}</span></div>
                <div><strong>{ui('No')}</strong><span>{ui('Automatic execution')}</span></div>
              </div>
              <ul className="automation-schedules-check-list">{manualRunResult.checks.map((check) => <li key={check.key}><StatusChip status={check.status} /><span><strong>{check.label}</strong>{check.detail}</span></li>)}</ul>
            </div>
          ) : null}

          {auditPack ? (
            <div className="automation-schedules-result-panel">
              <div className="automation-schedules-section-heading"><div><h4>{ui('Audit history')}</h4><p>{ui('Schedule activity, linked requests, and completeness checks.')}</p></div><StatusChip status={auditPack.completeness.complete ? 'pass' : 'watch'} /></div>
              <div className="automation-schedules-metrics">
                <div><strong>{auditPack.evidence_summary.schedule_audit_event_count}</strong><span>{ui('Schedule events')}</span></div>
                <div><strong>{auditPack.evidence_summary.execution_request_count}</strong><span>{ui('Linked requests')}</span></div>
                <div><strong>{auditPack.evidence_summary.run_event_count || 0}</strong><span>{ui('Schedule runs')}</span></div>
                <div><strong>{auditPack.completeness.complete ? ui('Complete') : ui('Review needed')}</strong><span>{ui('Audit status')}</span></div>
              </div>
              <ul className="automation-schedules-check-list">{auditPack.checks.map((check) => <li key={check.key}><StatusChip status={check.status} /><span><strong>{check.label}</strong>{check.detail}</span></li>)}</ul>
              {auditPack.linked_execution_requests.length ? (
                <div className="automation-schedules-table-wrap">
                  <table className="automation-schedules-table automation-schedules-table--compact">
                    <thead><tr><th>{ui('Request type')}</th><th>{ui('Workflow')}</th><th>{ui('Execution')}</th><th>{ui('Created')}</th></tr></thead>
                    <tbody>{auditPack.linked_execution_requests.map((request) => <tr key={request.id}><td>{ui(humanize(request.request_type))}</td><td>{ui(humanize(request.status))}</td><td>{ui(humanize(request.execution_status))}</td><td>{formatDateTime(request.created_at, locale)}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : <p className="automation-schedules-muted">{ui('No linked execution requests were found.')}</p>}
            </div>
          ) : null}
        </section>
      ) : null}

      <section ref={safetyRef} id="automation-schedule-safety" className="app-panel automation-schedules-card automation-schedules-section-card automation-schedules-scroll-anchor">
        <OperationalSectionHeader
          iconPath="/reliability-command"
          title={ui('Automation safety')}
          description={ui('See whether scheduled reviews are available and check recent automation activity.')}
          actions={<button type="button" className="btn btn-secondary" aria-expanded={governanceOpen} onClick={() => setGovernanceOpen((current) => !current)}>{governanceOpen ? ui('Hide details') : ui('Show details')}</button>}
        />

        <div className="automation-schedules-safety-baseline">
          <div><strong>{ui('Off')}</strong><span>{ui('Automatic execution')}</span><small>{ui('Schedules cannot approve or execute requests.')}</small></div>
          <div><strong>{formatLocalizedNumber(numberValue(activeCount), locale)}</strong><span>{ui('Active schedules')}</span><small>{ui('Only active schedules can become due.')}</small></div>
          <div><strong>{formatLocalizedNumber(numberValue(numberValue(runnerReadiness?.totals.due_schedule_count)), locale)}</strong><span>{ui('Due now')}</span><small>{ui('Schedules currently ready for review preparation.')}</small></div>
        </div>

        {governanceOpen ? (
          <div className="automation-schedules-safety-content">
            {!governanceLoaded && governanceLoading ? <p className="automation-schedules-muted">{ui('Loading automation safety status…')}</p> : null}
            {!governanceLoaded && !governanceLoading ? <button type="button" className="btn btn-secondary" onClick={() => void loadGovernance()}>{ui('Load safety status')}</button> : null}

            {runnerStatus ? (
              <>
                <div className="automation-schedules-metrics automation-schedules-metrics--safety">
                  <div><strong>{runnerStatus.request_creation_enabled ? ui('Enabled') : ui('Off')}</strong><span>{ui('Request preparation')}</span></div>
                  <div><strong>{runnerStatus.started ? ui('Running') : ui('Not running')}</strong><span>{ui('Background scheduler')}</span></div>
                  <div><strong>{ui('Off')}</strong><span>{ui('Automatic execution')}</span></div>
                  <div><strong>{formatLocalizedNumber(numberValue(numberValue(runnerStatus.failed_tick_count)), locale)}</strong><span>{ui('Failed runs')}</span></div>
                  <div><strong>{ui(humanize(runnerStatus.last_tick_outcome))}</strong><span>{ui('Last activity')}</span></div>
                </div>

                {canCreateAutomationSchedules && canCreateExecutionRequests ? (
                  <div className="automation-schedules-actions">
                    <button type="button" className="btn btn-primary" disabled={saving || !runnerStatus.request_creation_enabled} onClick={() => setConfirmation({ kind: 'run_due' })}>{ui('Process due schedules now')}</button>
                    <span className="automation-schedules-muted">{ui('This can prepare reviewable requests only; it cannot approve or execute them.')}</span>
                  </div>
                ) : null}

                {runnerStatus.unsafe_runner_output_review_required ? (
                  <div className="automation-schedules-alert automation-schedules-alert--warning">
                    <strong>{ui('Automation safety review required.')}</strong> {ui('A recorded anomaly needs acknowledgement before broader schedule use.')}
                    {canCreateAutomationSchedules && runnerStatus.unsafe_runner_output_review_acknowledge_allowed ? <button type="button" className="btn btn-secondary" onClick={() => { setConfirmation({ kind: 'acknowledge_anomaly' }); setConfirmationText(''); }}>{ui('Acknowledge review')}</button> : null}
                  </div>
                ) : null}
              </>
            ) : null}

            {runEvents ? (
              <div className="automation-schedules-recent-activity">
                <div className="automation-schedules-section-heading"><div><h4>{ui('Recent schedule activity')}</h4><p>{ui('Latest manual or scheduled processing attempts for this tenant.')}</p></div><span>{ui('{count} total').replace('{count}', formatLocalizedNumber(runEvents.total, locale))}</span></div>
                <div className="automation-schedules-table-wrap">
                  <table className="automation-schedules-table automation-schedules-table--compact">
                    <thead><tr><th>{ui('Schedule')}</th><th>{ui('Run type')}</th><th>{ui('Outcome')}</th><th>{ui('Request prepared')}</th><th>{ui('Time')}</th></tr></thead>
                    <tbody>{runEvents.rows.map((event) => <tr key={event.id}><td>{event.schedule_name}</td><td>{ui(humanize(event.run_mode))}</td><td><StatusChip status={event.status} /></td><td>{event.execution_request_id ? ui('Yes') : ui('No')}</td><td>{formatDateTime(event.created_at, locale)}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {runnerRunOnceResult ? (
              <div className="automation-schedules-result-panel">
                <h4>{ui('Latest processing result')}</h4>
                <div className="automation-schedules-metrics">
                  <div><strong>{formatLocalizedNumber(numberValue(runnerRunOnceResult.processed_schedule_count), locale)}</strong><span>{ui('Processed')}</span></div>
                  <div><strong>{formatLocalizedNumber(numberValue(runnerRunOnceResult.created_execution_request_count), locale)}</strong><span>{ui('Requests prepared')}</span></div>
                  <div><strong>{formatLocalizedNumber(numberValue(runnerRunOnceResult.skipped_schedule_count || 0), locale)}</strong><span>{ui('Skipped')}</span></div>
                  <div><strong>{formatLocalizedNumber(numberValue(runnerRunOnceResult.failed_schedule_count || 0), locale)}</strong><span>{ui('Failed')}</span></div>
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
              {confirmation.kind === 'activate' ? ui('Activate schedule') : null}
              {confirmation.kind === 'disable' ? ui('Disable schedule') : null}
              {confirmation.kind === 'manual_run' ? ui('Create execution request') : null}
              {confirmation.kind === 'run_due' ? ui('Process due schedules now') : null}
              {confirmation.kind === 'acknowledge_anomaly' ? ui('Acknowledge automation safety review') : null}
            </h3>
            {confirmation.kind === 'activate' ? <p>{ui('Activate “{name}”? Its next run will be recalculated from now. If controlled request creation is enabled, a due run may prepare a reviewable request but cannot approve or execute it.').replace('{name}', confirmation.schedule.name)}</p> : null}
            {confirmation.kind === 'manual_run' ? <p>{ui('Create one reviewable execution request from “{name}”? Duplicate protection applies. Nothing will be approved or executed automatically.').replace('{name}', confirmation.schedule.name)}</p> : null}
            {confirmation.kind === 'run_due' ? <p>{ui('Process currently due active schedules now? This may prepare reviewable execution requests only.')}</p> : null}
            {confirmation.kind === 'disable' ? (
              <label className="automation-schedules-field">
                <span>{ui('Disable reason')}</span>
                <textarea value={confirmationText} minLength={3} maxLength={1000} onChange={(event) => setConfirmationText(event.target.value)} placeholder={ui('Explain why this schedule is being disabled.')} />
              </label>
            ) : null}
            {confirmation.kind === 'acknowledge_anomaly' ? (
              <label className="automation-schedules-field">
                <span>{ui('Review note')}</span>
                <textarea value={confirmationText} minLength={numberValue(runnerStatus?.unsafe_runner_output_review_note_min_length) || 10} maxLength={numberValue(runnerStatus?.unsafe_runner_output_review_note_max_length) || 1000} onChange={(event) => setConfirmationText(event.target.value)} placeholder={ui('Record what was reviewed and why the evidence is understood.')} />
                <small>{ui('The review is recorded for audit purposes; raw technical evidence is not shown on the tenant page.')}</small>
              </label>
            ) : null}
            <div className="automation-schedules-modal-actions">
              <button type="button" className="automation-schedules-button automation-schedules-button--secondary" disabled={saving} onClick={() => { setConfirmation(null); setConfirmationText(''); }}>{ui('Cancel')}</button>
              <button type="button" className={`automation-schedules-button ${confirmation.kind === 'disable' ? 'automation-schedules-button--danger' : 'automation-schedules-button--primary'}`} disabled={saving} onClick={() => void confirmAction()}>{saving ? ui('Working…') : ui('Confirm')}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
