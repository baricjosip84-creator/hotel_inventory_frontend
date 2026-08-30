import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';
import { getAccessToken, getSupportSessionInfo, getTenantObservabilityIdentity } from '../lib/auth';
import { hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // v3.49.50: repetitive hero pills intentionally hidden; original rendering retained below.
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './OperationalExperiencePages.css';
import './MobileExecutionPage.css';

type ActionUrgency = 'critical' | 'high' | 'medium' | 'low';
type ExecutionTaskSourceType = 'manual' | 'reservation' | 'requisition' | 'purchase_order' | 'shipment' | 'transfer' | 'cycle_count' | 'replenishment' | 'execution_request';
type MobileAction = 'start' | 'complete' | 'block' | 'unblock';

type MobileExecutionTask = {
  mobile_action_id: string;
  action_id: string;
  task_source_id?: string | null;
  execution_task_status?: string | null;
  execution_task_source_type?: ExecutionTaskSourceType | null;
  execution_task_source_id?: string | null;
  mobile_domain?: string;
  queue_status?: string;
  urgency?: ActionUrgency | string;
  priority_score?: number;
  title?: string;
  summary?: string | null;
  facility_id?: string | null;
  storage_location_id?: string | null;
  barcode_ready?: boolean;
  offline_safe_snapshot?: boolean;
  recommended_mobile_next_step?: string | null;
  prohibited_mobile_actions?: string[];
  source_surface?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type MobileExecutionResponse = {
  definition?: {
    foundation_type?: string;
    execution_mode?: string;
    source_foundation?: string;
    mobile_capabilities?: string[];
    safety_contract?: Record<string, boolean>;
  };
  filters?: {
    action_domain?: string;
    urgency?: string | null;
    execution_task_source_type?: ExecutionTaskSourceType | null;
    limit?: number;
  };
  summary?: {
    total_mobile_tasks?: number;
    critical_mobile_tasks?: number;
    barcode_ready_tasks?: number;
    by_urgency?: Record<string, number>;
    by_queue_status?: Record<string, number>;
  };
  guidance?: {
    next_mobile_action_id?: string | null;
    next_action_id?: string | null;
    next_action_title?: string | null;
    next_action_urgency?: string | null;
    offline_guidance?: string;
    scanner_guidance?: string;
    evidence_guidance?: string;
  };
  mobile_tasks?: MobileExecutionTask[];
  non_mutation_guarantee?: boolean;
  mutation_scope?: string;
  generated_at?: string;
};

type OfflineOperation = {
  operation_id: string;
  task_id: string;
  action: MobileAction;
  note?: string;
  created_at: string;
  last_error?: string | null;
  failure_count?: number;
};

type MobileSyncResponse = {
  success_count?: number;
  failure_count?: number;
  results?: Array<{
    operation_id?: string | null;
    task_id?: string | null;
    action?: string;
    status: 'applied' | 'failed';
    error?: string;
  }>;
};

const CACHE_KEY_PREFIX = 'inventory-mobile-execution-snapshot-v2';
const PENDING_KEY_PREFIX = 'inventory-mobile-execution-pending-v2';
const LEGACY_CACHE_KEY = 'inventory-mobile-execution-snapshot-v1';
const LEGACY_PENDING_KEY = 'inventory-mobile-execution-pending-v1';
const DEVICE_KEY = 'inventory-mobile-execution-device-v1';

const URGENCY_FILTERS: Array<{ value: 'all' | ActionUrgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const SOURCE_FILTERS: Array<{ value: 'all' | ExecutionTaskSourceType; label: string }> = [
  { value: 'all', label: 'All task sources' },
  { value: 'execution_request', label: 'Execution requests' },
  { value: 'manual', label: 'Manual' },
  { value: 'reservation', label: 'Reservation' },
  { value: 'requisition', label: 'Requisition' },
  { value: 'purchase_order', label: 'Purchase order' },
  { value: 'shipment', label: 'Shipment' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'cycle_count', label: 'Cycle count' },
  { value: 'replenishment', label: 'Replenishment' }
];


const ACTION_LABELS: Record<MobileAction, string> = {
  start: 'Start',
  complete: 'Complete',
  block: 'Block',
  unblock: 'Unblock'
};

const CANONICAL_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  ready: 'Ready',
  assigned: 'Assigned',
  in_progress: 'In progress',
  blocked: 'Blocked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Pending',
  open: 'Open',
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  execution_request: 'Execution request',
  manual: 'Manual',
  reservation: 'Reservation',
  requisition: 'Requisition',
  purchase_order: 'Purchase order',
  shipment: 'Shipment',
  transfer: 'Transfer',
  cycle_count: 'Cycle count',
  replenishment: 'Replenishment',
  offline_capable_task_lifecycle_execution: 'Offline-capable task execution'
};

/* v3.49.50: retained for easy reversal with the hidden Mobile safety contract.
const SAFETY_LABELS: Record<string, string> = {
  tenant_isolated: 'Tenant isolated',
  permission_gated: 'Permission gated',
  audit_traceable_source: 'Audit-traceable source',
  human_action_only: 'Human action only',
  approval_gated_when_required: 'Approval gated when required',
  no_inventory_mutation: 'No direct inventory mutation',
  no_procurement_mutation: 'No direct procurement mutation',
  no_execution_mutation: 'No direct execution mutation',
  no_financial_mutation: 'No direct financial mutation',
  no_erp_writeback: 'No ERP writeback',
  no_accounting_writeback: 'No accounting writeback',
  no_supplier_execution: 'No supplier execution',
  no_carrier_execution: 'No carrier execution',
  no_external_workflow_execution: 'No external workflow execution',
  no_external_ai_callout: 'No external AI callout',
  execution_task_lifecycle_mutation_only: 'Execution-task lifecycle changes only'
};
*/


function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function canonicalLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  const raw = String(value || 'unknown');
  return ui(CANONICAL_LABELS[raw] || formatLabel(raw).replace(/^./, (character) => character.toUpperCase()));
}

/* v3.49.50: retained for easy reversal with the hidden Mobile safety contract.
function safetyLabel(value: string, ui: (englishText: string) => string): string {
  return ui(SAFETY_LABELS[value] || formatLabel(value).replace(/^./, (character) => character.toUpperCase()));
}
*/

function formatDateTime(value: string | null | undefined, locale: AppLocale, ui: (englishText: string) => string): string {
  if (!value) return ui('Not reported');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatLocalizedDateTime(date, locale);
}

function countLabel(count: number, singular: string, plural: string, locale: AppLocale, ui: (englishText: string) => string): string {
  return `${formatLocalizedNumber(count, locale)} ${ui(count === 1 ? singular : plural)}`;
}

function makeId(prefix: string): string {
  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function readStored<T>(key: string | null, fallback: T): T {
  if (!key) return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

type MobileStorageKeys = { cache: string; pending: string };

function getMobileStorageKeys(): MobileStorageKeys | null {
  const identity = getTenantObservabilityIdentity(getAccessToken());
  if (!identity?.tenantId) return null;

  const supportSession = getSupportSessionInfo();
  const actorId = identity.userId || supportSession.supportSessionId;
  if (!actorId) return null;

  const actorType = identity.supportSession ? 'support' : 'tenant';
  const scope = `${identity.tenantId}:${actorType}:${actorId}`;
  return {
    cache: `${CACHE_KEY_PREFIX}:${scope}`,
    pending: `${PENDING_KEY_PREFIX}:${scope}`
  };
}

function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = makeId('device');
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

function sourceSurfaceToAppPath(sourceSurface?: string): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) return null;
  const tenantRoutes = new Set([
    '/action-center', '/workspace', '/execution-tasks', '/execution-requests', '/scanner', '/shipments',
    '/stock-transfers', '/inventory-reservations', '/inventory-requisitions', '/procurement-recommendations'
  ]);
  return tenantRoutes.has(sourceSurface) ? sourceSurface : null;
}

function allowedActions(status?: string | null): MobileAction[] {
  if (status === 'blocked') return ['unblock'];
  if (status === 'ready' || status === 'assigned' || status === 'in_progress') return ['start', 'complete', 'block'].filter((action) => !(status === 'in_progress' && action === 'start')) as MobileAction[];
  return [];
}

function urgencyToneClass(value?: string | null): 'danger' | 'warning' | 'amber' | 'green' {
  const urgency = String(value || 'low').toLowerCase();
  if (urgency === 'critical') return 'danger';
  if (urgency === 'high') return 'warning';
  if (urgency === 'medium') return 'amber';
  return 'green';
}

function actionButtonClass(action: MobileAction): string {
  if (action === 'complete') return 'button mobile-execution-task-button mobile-execution-task-button--primary';
  if (action === 'block') return 'button button--secondary mobile-execution-task-button mobile-execution-task-button--danger';
  return 'button button--secondary mobile-execution-task-button';
}

async function fetchMobileExecutionSummary(urgency: 'all' | ActionUrgency, sourceType: 'all' | ExecutionTaskSourceType): Promise<MobileExecutionResponse> {
  const params = new URLSearchParams({ action_domain: 'execution', limit: '50' });
  if (urgency !== 'all') params.set('urgency', urgency);
  if (sourceType !== 'all') params.set('execution_task_source_type', sourceType);
  return apiRequest<MobileExecutionResponse>(`/operational-action-center/mobile-execution-summary?${params.toString()}`);
}

export default function MobileExecutionPage() {
  const { locale, ui } = useAppTranslation();
  const storageKeys = useMemo(() => getMobileStorageKeys(), []);
  const [urgency, setUrgency] = useState<'all' | ActionUrgency>('all');
  const [sourceType, setSourceType] = useState<'all' | ExecutionTaskSourceType>('all');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [cachedResponse, setCachedResponse] = useState<MobileExecutionResponse | null>(() => readStored<MobileExecutionResponse | null>(storageKeys ? `${storageKeys.cache}:all:all` : null, null));
  const [cachedFilterKey, setCachedFilterKey] = useState('all:all');
  const [pending, setPending] = useState<OfflineOperation[]>(() => readStored<OfflineOperation[]>(storageKeys?.pending || null, []));
  const [syncing, setSyncing] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [blockReasonTaskId, setBlockReasonTaskId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const canUpdateTasks = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_UPDATE);
  const canCompleteTasks = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_COMPLETE);
  const canUseScanner = hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ);
  const canRunAction = (action: MobileAction) => action === 'complete' ? canCompleteTasks : canUpdateTasks;
  const canRunAnyMobileAction = canUpdateTasks || canCompleteTasks;
  const currentFilterKey = `${urgency}:${sourceType}`;
  const currentCacheStorageKey = storageKeys ? `${storageKeys.cache}:${currentFilterKey}` : null;

  const mobileExecutionQuery = useQuery({
    queryKey: ['mobile-execution-summary', urgency, sourceType],
    queryFn: () => fetchMobileExecutionSummary(urgency, sourceType),
    retry: online ? 1 : false
  });

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    // v1 used browser-wide keys. Remove those unscoped caches so an account
    // switch on a shared device cannot expose another tenant/user's queue.
    localStorage.removeItem(LEGACY_CACHE_KEY);
    localStorage.removeItem(LEGACY_PENDING_KEY);
  }, []);

  useEffect(() => {
    const next = readStored<MobileExecutionResponse | null>(currentCacheStorageKey, null);
    setCachedResponse(next);
    setCachedFilterKey(currentFilterKey);
  }, [currentCacheStorageKey, currentFilterKey]);

  useEffect(() => {
    if (!mobileExecutionQuery.data) return;
    setCachedResponse(mobileExecutionQuery.data);
    setCachedFilterKey(currentFilterKey);
    if (currentCacheStorageKey) localStorage.setItem(currentCacheStorageKey, JSON.stringify(mobileExecutionQuery.data));
  }, [mobileExecutionQuery.data, currentCacheStorageKey, currentFilterKey]);

  const persistPending = (operations: OfflineOperation[]) => {
    setPending(operations);
    if (storageKeys) localStorage.setItem(storageKeys.pending, JSON.stringify(operations));
  };

  const removePendingOperation = (operationId: string) => {
    persistPending(pending.filter((operation) => operation.operation_id !== operationId));
    setMessage(ui('Queued action removed from this device.'));
    setActionError(null);
  };

  const matchingCachedResponse = cachedFilterKey === currentFilterKey ? cachedResponse : null;
  const response = mobileExecutionQuery.data || matchingCachedResponse || undefined;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const mobileTasks = response?.mobile_tasks || [];
  /* v3.49.50: retained for easy reversal with the hidden Mobile safety contract section.
  const safetyEntries = useMemo(() => Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled), [response?.definition?.safety_contract]);
  */

  const replayPending = async () => {
    if (!online || syncing || pending.length === 0 || !canRunAnyMobileAction) return;
    setSyncing(true);
    setActionError(null);
    try {
      const result = await apiRequest<MobileSyncResponse>('/inventory-capabilities/mobile-sync', {
        method: 'POST',
        body: JSON.stringify({ device_id: getDeviceId(), request_id: makeId('sync'), operations: pending })
      });
      const applied = new Set((result.results || []).filter((row) => row.status === 'applied').map((row) => row.operation_id).filter(Boolean));
      const failedByOperationId = new Map((result.results || [])
        .filter((row) => row.status === 'failed' && row.operation_id)
        .map((row) => [row.operation_id as string, row.error || ui('The queued action could not be applied.')]));
      const remaining = pending
        .filter((operation) => !applied.has(operation.operation_id))
        .map((operation) => failedByOperationId.has(operation.operation_id)
          ? { ...operation, last_error: failedByOperationId.get(operation.operation_id) || null, failure_count: (operation.failure_count || 0) + 1 }
          : operation);
      persistPending(remaining);
      const failed = (result.results || []).filter((row) => row.status === 'failed');
      if (failed.length) {
        setActionError(`${formatLocalizedNumber(failed.length, locale)} ${ui(failed.length === 1 ? 'queued action could not be applied.' : 'queued actions could not be applied.')} ${failed[0]?.error || ''}`.trim());
      } else {
        setMessage(countLabel(applied.size, 'offline action synchronized.', 'offline actions synchronized.', locale, ui));
      }
      await mobileExecutionQuery.refetch();
    } catch (error) {
      if (error instanceof ApiError) setActionError(error.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (online && pending.length > 0 && canRunAnyMobileAction && !syncing) void replayPending();
    // replayPending intentionally uses the latest render state and should run only when these state gates change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, pending.length, canRunAnyMobileAction]);

  const runAction = async (task: MobileExecutionTask, action: MobileAction, note?: string) => {
    if (!task.task_source_id || !canRunAction(action)) return;
    const normalizedNote = note?.trim() || undefined;
    if (action === 'block' && !normalizedNote) {
      setActionError(ui('Enter a reason before blocking this task.'));
      return;
    }
    const operation: OfflineOperation = {
      operation_id: makeId('op'),
      task_id: task.task_source_id,
      action,
      note: normalizedNote,
      created_at: new Date().toISOString()
    };
    setMessage(null);
    setActionError(null);

    if (!navigator.onLine) {
      persistPending([...pending, operation]);
      setMessage(ui('Task action queued on this device. It will synchronize when online.'));
      if (action === 'block') { setBlockReasonTaskId(null); setBlockReason(''); }
      return;
    }

    setBusyTaskId(task.task_source_id);
    try {
      const result = await apiRequest<MobileSyncResponse>('/inventory-capabilities/mobile-sync', {
        method: 'POST',
        body: JSON.stringify({ device_id: getDeviceId(), request_id: makeId('sync'), operations: [operation] })
      });
      const first = result.results?.[0];
      if (first?.status === 'failed') throw new Error(first.error || ui('The task action could not be applied.'));
      setMessage(ui('Task action applied successfully.'));
      if (action === 'block') { setBlockReasonTaskId(null); setBlockReason(''); }
      await mobileExecutionQuery.refetch();
    } catch (error) {
      if (!navigator.onLine) {
        persistPending([...pending, operation]);
        setOnline(false);
        setMessage(ui('Task action queued because the device lost its connection.'));
        if (action === 'block') { setBlockReasonTaskId(null); setBlockReason(''); }
      } else {
        setActionError(error instanceof ApiError ? error.message : error instanceof Error ? error.message : ui('Unable to update the task.'));
      }
    } finally {
      setBusyTaskId(null);
    }
  };

  const hasUsableResponse = Boolean(response);
  const usingOfflineSnapshot = !mobileExecutionQuery.data && Boolean(matchingCachedResponse);

  return (
    <div className="mobile-execution-page mobile-execution-page--refined io-operational-page io-workspace-page io-workspace-legacy-normalized">
      {/*
        v3.49.50 — Tenant simplification. These repetitive hero pills are intentionally hidden.
        Original rendering preserved for easy reversal:
        <OperationalWorkspaceHero meta={<>
          <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("Touch-first")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("Offline queue protected")}</OperationalWorkspaceMetaPill>
        </>} />
      */}
      <OperationalWorkspaceHero
        iconPath="/mobile-execution"
        eyebrow={ui("Mobile & warehouse execution")}
        title={ui("Mobile Execution")}
        description={ui("Touch-first execution queue for permitted warehouse work, with safe offline queuing and audited synchronization when connectivity returns.")}
        aside={<OperationalWorkspaceStatus value={ui(online ? 'Online' : 'Offline')} label={countLabel(pending.length, 'queued action awaiting synchronization', 'queued actions awaiting synchronization', locale, ui)} />}
      />

      <OperationalWorkspaceStats ariaLabel={ui("Mobile execution overview")}>
        <OperationalWorkspaceStatCard
          label={ui("Mobile queue")}
          value={formatLocalizedNumber(numberValue(summary.total_mobile_tasks ?? mobileTasks.length), locale)}
          helper={ui("Execution tasks prepared for touch-first warehouse work")}
          iconPath="/mobile-execution"
          tone="blue"
        />
        <OperationalWorkspaceStatCard
          label={ui("Critical tasks")}
          value={formatLocalizedNumber(numberValue(summary.critical_mobile_tasks), locale)}
          helper={ui("Highest urgency items requiring operator attention")}
          iconPath="/alerts"
          tone={numberValue(summary.critical_mobile_tasks) > 0 ? 'danger' : 'good'}
        />
        <OperationalWorkspaceStatCard
          label={ui("Connection")}
          value={ui(online ? 'Online' : 'Offline')}
          helper={countLabel(pending.length, 'action waiting to synchronize', 'actions waiting to synchronize', locale, ui)}
          iconPath="/real-time-operations-feed"
          tone={online ? 'good' : 'warn'}
        />
        <OperationalWorkspaceStatCard
          label={ui("Execution mode")}
          value={canonicalLabel(response?.definition?.execution_mode, ui)}
          helper={ui("Only execution-task lifecycle changes are allowed from this surface")}
          iconPath="/execution-tasks"
          tone="neutral"
        />
      </OperationalWorkspaceStats>

      <section className="section mobile-execution-section">
        <div className="section__title mobile-execution-section-title">
          <span className="mobile-execution-section-icon"><TenantNavIcon path="/mobile-execution" size={16} /></span>
          {ui("Mobile execution controls")}
        </div>
        <div className="card mobile-execution-controls-shell">
          <div className="mobile-execution-toolbar">
            <select aria-label={ui("Filter mobile tasks by urgency")} className="mobile-execution-select" value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | ActionUrgency)}>{URGENCY_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}</select>
            <select aria-label={ui("Filter mobile tasks by source")} className="mobile-execution-select" value={sourceType} onChange={(event) => setSourceType(event.target.value as 'all' | ExecutionTaskSourceType)}>{SOURCE_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}</select>
            <button className="button button--secondary mobile-execution-control-button" type="button" onClick={() => mobileExecutionQuery.refetch()} disabled={mobileExecutionQuery.isFetching || !online}>
              <TenantNavIcon path="/real-time-operations-feed" size={15} />
              {mobileExecutionQuery.isFetching ? ui('Refreshing…') : ui('Refresh mobile queue')}
            </button>
            <button className="button button--secondary mobile-execution-control-button" type="button" onClick={() => void replayPending()} disabled={!online || syncing || pending.length === 0 || !canRunAnyMobileAction}>
              <TenantNavIcon path="/mobile-execution" size={15} />
              {syncing ? ui('Synchronizing…') : `${ui('Sync pending')} (${formatLocalizedNumber(pending.length, locale)})`}
            </button>
            {canUseScanner ? <Link className="button button--secondary mobile-execution-control-button" to="/scanner"><TenantNavIcon path="/scanner" size={15} />{ui("Open scanner")}</Link> : null}
            <Link className="button button--secondary mobile-execution-control-button" to="/execution-tasks"><TenantNavIcon path="/execution-tasks" size={15} />{ui("Open execution tasks")}</Link>
          </div>

          {mobileExecutionQuery.isLoading && !cachedResponse ? <p className="card__subtext">{ui("Loading mobile execution queue…")}</p> : null}
          {mobileExecutionQuery.error && !hasUsableResponse ? <p className="form-error">{mobileExecutionQuery.error instanceof ApiError ? mobileExecutionQuery.error.message : ui('Unable to load the mobile execution queue.')}</p> : null}
          {usingOfflineSnapshot ? <p className="card__subtext"><strong>{ui("Offline snapshot:")}</strong> {ui("showing the last successfully downloaded queue.")}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}
          {actionError ? <p className="form-error">{actionError}</p> : null}
          {hasUsableResponse ? (
            <div className="mobile-execution-guidance">
              <div className="mobile-execution-connection-row">
                <span className={`mobile-execution-state-pill ${online ? 'mobile-execution-state-pill--online' : 'mobile-execution-state-pill--offline'}`}>
                  <span className="mobile-execution-state-dot" />
                  {ui(online ? 'Server-connected queue' : 'Local offline snapshot')}
                </span>
                {pending.length > 0 ? <span className="mobile-execution-pending-pill">{countLabel(pending.length, "queued action", "queued actions", locale, ui)}</span> : null}
              </div>
              <div className="mobile-execution-guidance-grid">
                <div className="mobile-execution-guidance-item"><span className="mobile-execution-guidance-icon"><TenantNavIcon path="/mobile-execution" size={15} /></span><p>{guidance.offline_guidance}</p></div>
                <div className="mobile-execution-guidance-item"><span className="mobile-execution-guidance-icon"><TenantNavIcon path="/scanner" size={15} /></span><p>{guidance.scanner_guidance}</p></div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {pending.length > 0 ? (
        <section className="section mobile-execution-section">
          <div className="section__title mobile-execution-section-title">
            <span className="mobile-execution-section-icon"><TenantNavIcon path="/mobile-execution" size={16} /></span>
            {ui('Queued offline actions')}
            <span className="mobile-execution-section-count">{formatLocalizedNumber(pending.length, locale)}</span>
          </div>
          <div className="mobile-execution-pending-list">
            {pending.map((operation) => (
              <div className="card mobile-execution-pending-row" key={operation.operation_id}>
                <div>
                  <div className="mobile-execution-pending-title">{ui(ACTION_LABELS[operation.action])} · {ui('Task')} {operation.task_id}</div>
                  <div className="card__subtext">{ui('Queued:')} {formatDateTime(operation.created_at, locale, ui)}</div>
                  {operation.note ? <div className="card__subtext"><strong>{ui('Reason:')}</strong> {operation.note}</div> : null}
                  {operation.last_error ? <div className="form-error"><strong>{ui('Could not apply:')}</strong> {operation.last_error}</div> : null}
                </div>
                <button className="button button--secondary" type="button" onClick={() => removePendingOperation(operation.operation_id)}>{ui('Remove queued action')}</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section mobile-execution-section">
        <div className="section__title mobile-execution-section-title">
          <span className="mobile-execution-section-icon"><TenantNavIcon path="/execution-tasks" size={16} /></span>
          {ui("Touch-first task queue")}
          {mobileTasks.length > 0 ? <span className="mobile-execution-section-count">{formatLocalizedNumber(mobileTasks.length, locale)}</span> : null}
        </div>
        {mobileTasks.length === 0 && !mobileExecutionQuery.isLoading ? <div className="card mobile-execution-empty-card"><span className="mobile-execution-icon mobile-execution-icon--blue"><TenantNavIcon path="/execution-tasks" size={18} /></span><div><div className="mobile-execution-empty-title">{ui("No matching mobile tasks")}</div><p className="card__subtext">{ui("No mobile execution tasks matched the selected filters.")}</p></div></div> : (
          <div className="mobile-execution-queue-grid">
            {mobileTasks.map((task) => {
              const sourcePath = sourceSurfaceToAppPath(task.source_surface);
              const actions = allowedActions(task.execution_task_status);
              const queuedCount = pending.filter((operation) => operation.task_id === task.task_source_id).length;
              const urgencyClass = urgencyToneClass(task.urgency);
              return (
                <article className={`card mobile-execution-task-card mobile-execution-task-card--${urgencyClass}`} key={task.mobile_action_id}>
                  <div className="mobile-execution-task-header">
                    <div className="mobile-execution-task-lead">
                      <span className={`mobile-execution-icon mobile-execution-icon--${urgencyClass}`}><TenantNavIcon path={sourcePath || '/execution-tasks'} size={17} /></span>
                      <div className="mobile-execution-task-heading">
                        <div className="card__label">{canonicalLabel(task.execution_task_status || task.queue_status, ui)}</div>
                        <h3>{task.title || ui('Untitled mobile task')}</h3>
                      </div>
                    </div>
                    <span className={`mobile-execution-urgency-pill mobile-execution-urgency-pill--${urgencyClass}`}>{canonicalLabel(task.urgency, ui)}</span>
                  </div>

                  <p className="card__subtext mobile-execution-task-summary">{task.summary || ui('No task summary was provided.')}</p>

                  <div className="mobile-execution-task-badges">
                    {task.barcode_ready ? <span className="mobile-execution-meta-pill"><TenantNavIcon path="/scanner" size={13} />{ui("Scan-ready")}</span> : null}
                    {task.offline_safe_snapshot ? <span className="mobile-execution-meta-pill"><TenantNavIcon path="/mobile-execution" size={13} />{ui("Offline snapshot")}</span> : null}
                    {queuedCount ? <span className="mobile-execution-meta-pill mobile-execution-meta-pill--pending">{countLabel(queuedCount, "pending action", "pending actions", locale, ui)}</span> : null}
                    {task.execution_task_source_type ? <span className="mobile-execution-meta-pill"><TenantNavIcon path={sourcePath || '/execution-tasks'} size={13} />{ui("Source")} {canonicalLabel(task.execution_task_source_type, ui)}</span> : null}
                  </div>

                  <div className="mobile-execution-task-detail">
                    <div className="card__label">{ui("Recommended next step")}</div>
                    <p className="card__subtext">{task.recommended_mobile_next_step || ui("No recommended next step was provided.")}</p>
                  </div>
                  <div className="mobile-execution-task-detail mobile-execution-task-detail--time">
                    <div className="card__label">{ui("Last updated")}</div>
                    <p className="card__subtext">{formatDateTime(task.updated_at || task.created_at, locale, ui)}</p>
                  </div>

                  {blockReasonTaskId === task.task_source_id ? (
                    <div className="mobile-execution-block-reason">
                      <label className="card__label" htmlFor={`mobile-block-reason-${task.task_source_id}`}>{ui('Why is this task blocked?')}</label>
                      <textarea
                        id={`mobile-block-reason-${task.task_source_id}`}
                        className="mobile-execution-block-reason-input"
                        value={blockReason}
                        maxLength={1000}
                        rows={3}
                        onChange={(event) => setBlockReason(event.target.value)}
                        placeholder={ui('Enter the reason another person needs to know before this task can continue.')}
                      />
                      <div className="mobile-execution-task-actions">
                        <button className="button mobile-execution-task-button mobile-execution-task-button--primary" type="button" disabled={busyTaskId === task.task_source_id || blockReason.trim().length === 0} onClick={() => void runAction(task, 'block', blockReason)}>{ui('Confirm block')}</button>
                        <button className="button button--secondary mobile-execution-task-button" type="button" onClick={() => { setBlockReasonTaskId(null); setBlockReason(''); }}>{ui('Cancel')}</button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mobile-execution-task-actions">
                    {task.task_source_id ? actions.filter((action) => canRunAction(action)).map((action) => (
                      <button
                        key={action}
                        className={actionButtonClass(action)}
                        type="button"
                        disabled={busyTaskId === task.task_source_id}
                        onClick={() => {
                          if (action === 'block') {
                            setBlockReasonTaskId(task.task_source_id || null);
                            setBlockReason('');
                            setActionError(null);
                            return;
                          }
                          void runAction(task, action);
                        }}
                      >
                        {ui(ACTION_LABELS[action])}
                      </button>
                    )) : null}
                    {sourcePath ? <Link className="button button--secondary mobile-execution-source-button" to={sourcePath}><TenantNavIcon path={sourcePath} size={14} />{ui("Open source workflow")}</Link> : null}
                    {task.barcode_ready && task.execution_task_source_id ? <Link className="button button--secondary mobile-execution-source-button" to={`/scanner?shipmentId=${encodeURIComponent(task.execution_task_source_id)}`}><TenantNavIcon path="/scanner" size={14} />{ui("Scan/verify")}</Link> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/*
        v3.49.50 — Tenant simplification. The technical Mobile safety contract is intentionally
        hidden from normal tenant UI. The original rendering remains preserved below.
      <section className="section mobile-execution-section">
        <div className="section__title mobile-execution-section-title">
          <span className="mobile-execution-section-icon"><TenantNavIcon path="/permissions" size={16} /></span>
          {ui("Mobile safety contract")}
        </div>
        <div className="mobile-execution-safety-grid">
          {safetyEntries.length === 0 ? <div className="card mobile-execution-empty-card"><p className="card__subtext">{ui("Safety contract details were not returned by the backend.")}</p></div> : safetyEntries.map(([key]) => <div className="card mobile-execution-safety-card" key={key}><span className="mobile-execution-icon mobile-execution-icon--green"><TenantNavIcon path="/permissions" size={16} /></span><div><div className="card__label">{ui("Enabled guardrail")}</div><div className="mobile-execution-safety-title">{safetyLabel(key, ui)}</div></div></div>)}
        </div>
      </section>
      */}
    </div>
  );
}
