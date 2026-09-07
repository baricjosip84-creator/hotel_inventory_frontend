import { useEffect, useMemo, useRef, useState } from 'react';
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
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './OperationalExperiencePages.css';
import './MobileExecutionPage.css';

type ActionUrgency = 'critical' | 'high' | 'medium' | 'low';
type ExecutionTaskSourceType = 'manual' | 'reservation' | 'requisition' | 'purchase_order' | 'shipment' | 'transfer' | 'cycle_count' | 'replenishment' | 'execution_request';
type MobileAction = 'take' | 'start' | 'complete' | 'block' | 'unblock';
type AssignmentScope = 'mine' | 'unassigned' | 'team';

type MobileExecutionTask = {
  id: string;
  task_code?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  urgency?: ActionUrgency | string;
  task_type?: string | null;
  source_type?: ExecutionTaskSourceType | null;
  source_id?: string | null;
  source_route?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  assignment_state?: 'mine' | 'unassigned' | 'other';
  storage_location_id?: string | null;
  storage_location_name?: string | null;
  due_at?: string | null;
  sla_due_at?: string | null;
  due_bucket?: 'overdue' | 'due_soon' | 'scheduled' | 'unscheduled' | string;
  is_overdue?: boolean;
  is_due_soon?: boolean;
  step_label?: string | null;
  scan_supported?: boolean;
  scan_mode?: string | null;
  expected_product_count?: number;
  can_take?: boolean;
  compact_payload?: {
    product_name?: string | null;
    line_count?: number;
    quantity?: number | null;
    from_location?: string | null;
    to_location?: string | null;
  };
};

type MobileExecutionResponse = {
  generated_at?: string;
  current_user_id?: string | null;
  count?: number;
  filters?: {
    assignment_scope?: AssignmentScope;
    urgency?: string | null;
    source_type?: ExecutionTaskSourceType | null;
    limit?: number;
    offset?: number;
  };
  pagination?: {
    limit?: number;
    offset?: number;
    total?: number;
    returned?: number;
    has_more?: boolean;
  };
  summary?: {
    total?: number;
    ready?: number;
    assigned?: number;
    in_progress?: number;
    blocked?: number;
    overdue?: number;
    scan_supported?: number;
  };
  tasks?: MobileExecutionTask[];
};

type OfflineOperation = {
  operation_id: string;
  task_id: string;
  task_label?: string | null;
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

const CACHE_KEY_PREFIX = 'inventory-mobile-execution-snapshot-v3';
const PENDING_KEY_PREFIX = 'inventory-mobile-execution-pending-v3';
const LEGACY_KEYS = [
  'inventory-mobile-execution-snapshot-v1',
  'inventory-mobile-execution-pending-v1'
];
const DEVICE_KEY = 'inventory-mobile-execution-device-v1';
const PAGE_SIZE = 25;

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

const SCOPE_OPTIONS: Array<{ value: AssignmentScope; label: string; description: string }> = [
  { value: 'mine', label: 'My tasks', description: 'Work assigned to you.' },
  { value: 'unassigned', label: 'Unassigned tasks', description: 'Work that still needs an owner.' },
  { value: 'team', label: 'Team tasks', description: 'Assigned work across the team. Other people’s tasks are read-only here.' }
];

const ACTION_LABELS: Record<MobileAction, string> = {
  take: 'Take task',
  start: 'Start',
  complete: 'Complete',
  block: 'Block',
  unblock: 'Unblock'
};

const CANONICAL_LABELS: Record<string, string> = {
  unknown: 'Unknown', ready: 'Ready', assigned: 'Assigned', in_progress: 'In progress', blocked: 'Blocked', completed: 'Completed', cancelled: 'Cancelled',
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', overdue: 'Overdue', due_soon: 'Due soon', scheduled: 'Scheduled', unscheduled: 'No deadline',
  manual: 'Manual', reservation: 'Reservation', requisition: 'Requisition', purchase_order: 'Purchase order', shipment: 'Shipment', transfer: 'Transfer', cycle_count: 'Cycle count', replenishment: 'Replenishment', execution_request: 'Execution request'
};

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

function writeStored(key: string | null, value: unknown): boolean {
  if (!key) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function readStoredRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function mobileStorageAvailable(): boolean {
  const probe = `${DEVICE_KEY}:probe`;
  try {
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
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
  return { cache: `${CACHE_KEY_PREFIX}:${scope}`, pending: `${PENDING_KEY_PREFIX}:${scope}` };
}

let fallbackDeviceId: string | null = null;

function getDeviceId(): string {
  const existing = readStoredRaw(DEVICE_KEY);
  if (existing) return existing;
  if (fallbackDeviceId) return fallbackDeviceId;
  const created = makeId('device');
  fallbackDeviceId = created;
  writeStoredRaw(DEVICE_KEY, created);
  return created;
}

function urgencyToneClass(value?: string | null): 'danger' | 'warning' | 'amber' | 'green' {
  const urgency = String(value || 'low').toLowerCase();
  if (urgency === 'critical') return 'danger';
  if (urgency === 'high') return 'warning';
  if (urgency === 'medium') return 'amber';
  return 'green';
}

function actionButtonClass(action: MobileAction): string {
  if (action === 'complete' || action === 'take') return 'button mobile-execution-task-button mobile-execution-task-button--primary';
  if (action === 'block') return 'button button--secondary mobile-execution-task-button mobile-execution-task-button--danger';
  return 'button button--secondary mobile-execution-task-button';
}

function canOpenTaskSource(task: MobileExecutionTask): boolean {
  if (!task.source_type || task.source_type === 'manual') return hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ);
  const requiredPermission = {
    reservation: TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ,
    requisition: TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_READ,
    purchase_order: TENANT_PERMISSIONS.PURCHASE_ORDERS_READ,
    shipment: TENANT_PERMISSIONS.SHIPMENTS_READ,
    transfer: TENANT_PERMISSIONS.STOCK_TRANSFERS_READ,
    cycle_count: TENANT_PERMISSIONS.CYCLE_COUNTS_READ,
    replenishment: TENANT_PERMISSIONS.PAR_LEVELS_READ,
    execution_request: TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW
  }[task.source_type];
  return requiredPermission ? hasPermission(requiredPermission) : false;
}

function taskSourceLink(task: MobileExecutionTask): string | null {
  if (!canOpenTaskSource(task)) return null;
  const route = task.source_route || '/execution-tasks';
  const params = new URLSearchParams();

  if (task.source_type === 'cycle_count') params.set('tab', 'cycle-counts');
  else if (task.source_type === 'replenishment') params.set('tab', 'par-levels');

  if (task.source_id) {
    if (task.source_type === 'shipment') params.set('shipmentId', task.source_id);
    else if (task.source_type === 'purchase_order') params.set('purchaseOrderId', task.source_id);
    else if (task.source_type === 'reservation') params.set('reservationId', task.source_id);
    else if (task.source_type === 'requisition') params.set('requisitionId', task.source_id);
    else if (task.source_type === 'transfer') params.set('transfer_id', task.source_id);
    else if (task.source_type === 'execution_request') params.set('request_id', task.source_id);
  }

  return params.size ? `${route}?${params.toString()}` : route;
}

function dueCopy(task: MobileExecutionTask, locale: AppLocale, ui: (englishText: string) => string): string {
  const due = task.sla_due_at || task.due_at;
  if (!due) return ui('No deadline');
  const prefix = task.is_overdue ? ui('Overdue') : task.is_due_soon ? ui('Due soon') : ui('Due');
  return `${prefix}: ${formatDateTime(due, locale, ui)}`;
}

function effectiveAssignmentState(task: MobileExecutionTask, pending: OfflineOperation[]): 'mine' | 'unassigned' | 'other' {
  if (pending.some((operation) => operation.task_id === task.id && operation.action === 'take')) return 'mine';
  return task.assignment_state || (!task.assigned_to ? 'unassigned' : 'other');
}

function allowedActions(task: MobileExecutionTask, pending: OfflineOperation[]): MobileAction[] {
  const assignment = effectiveAssignmentState(task, pending);
  if (assignment === 'other') return [];
  if (assignment === 'unassigned') return task.can_take ? ['take'] : [];
  if (task.status === 'blocked') return ['unblock'];
  if (task.status === 'ready' || task.status === 'assigned') return ['start', 'complete', 'block'];
  if (task.status === 'in_progress') return ['complete', 'block'];
  return [];
}

async function fetchMobileExecutionQueue({ urgency, sourceType, assignmentScope, page }: { urgency: 'all' | ActionUrgency; sourceType: 'all' | ExecutionTaskSourceType; assignmentScope: AssignmentScope; page: number }): Promise<MobileExecutionResponse> {
  const params = new URLSearchParams({ assignment_scope: assignmentScope, limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
  if (urgency !== 'all') params.set('urgency', urgency);
  if (sourceType !== 'all') params.set('source_type', sourceType);
  return apiRequest<MobileExecutionResponse>(`/execution-tasks/mobile-queue?${params.toString()}`);
}

export default function MobileExecutionPage() {
  const { locale, ui } = useAppTranslation();
  const storageKeys = useMemo(() => getMobileStorageKeys(), []);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const [assignmentScope, setAssignmentScope] = useState<AssignmentScope>('mine');
  const [urgency, setUrgency] = useState<'all' | ActionUrgency>('all');
  const [sourceType, setSourceType] = useState<'all' | ExecutionTaskSourceType>('all');
  const [page, setPage] = useState(0);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [storageAvailable, setStorageAvailable] = useState(() => mobileStorageAvailable());
  const [pending, setPending] = useState<OfflineOperation[]>(() => readStored<OfflineOperation[]>(storageKeys?.pending || null, []));
  const [syncing, setSyncing] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [blockReasonTaskId, setBlockReasonTaskId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [evidenceTask, setEvidenceTask] = useState<MobileExecutionTask | null>(null);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null);

  const canUpdateTasks = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_UPDATE);
  const canCompleteTasks = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_COMPLETE);
  const canUseScanner = hasPermission(TENANT_PERMISSIONS.PRODUCTS_READ) && canUpdateTasks;
  const canUploadEvidence = hasPermission(TENANT_PERMISSIONS.ATTACHMENTS_WRITE) && hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ);
  const canRunAction = (action: MobileAction) => action === 'complete' ? canCompleteTasks : canUpdateTasks;
  const canRunAnyMobileAction = canUpdateTasks || canCompleteTasks;

  const filterKey = `${assignmentScope}:${urgency}:${sourceType}:${page}`;
  const cacheKey = storageKeys ? `${storageKeys.cache}:${filterKey}` : null;
  const [cachedResponse, setCachedResponse] = useState<MobileExecutionResponse | null>(() => readStored<MobileExecutionResponse | null>(cacheKey, null));
  const [cachedFilterKey, setCachedFilterKey] = useState(filterKey);

  const mobileExecutionQuery = useQuery({
    queryKey: ['mobile-execution-queue', assignmentScope, urgency, sourceType, page],
    queryFn: () => fetchMobileExecutionQueue({ urgency, sourceType, assignmentScope, page }),
    retry: online ? 1 : false
  });

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    try {
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      setStorageAvailable(false);
    }
  }, []);

  useEffect(() => {
    const next = readStored<MobileExecutionResponse | null>(cacheKey, null);
    setCachedResponse(next);
    setCachedFilterKey(filterKey);
  }, [cacheKey, filterKey]);

  useEffect(() => {
    if (!mobileExecutionQuery.data) return;
    setCachedResponse(mobileExecutionQuery.data);
    setCachedFilterKey(filterKey);
    if (cacheKey && !writeStored(cacheKey, mobileExecutionQuery.data)) setStorageAvailable(false);
  }, [mobileExecutionQuery.data, cacheKey, filterKey]);

  useEffect(() => { setPage(0); }, [assignmentScope, urgency, sourceType]);

  const persistPending = (operations: OfflineOperation[]): boolean => {
    setPending(operations);
    if (!storageKeys) return false;
    const persisted = writeStored(storageKeys.pending, operations);
    if (!persisted) setStorageAvailable(false);
    return persisted;
  };

  const response = mobileExecutionQuery.data || (cachedFilterKey === filterKey ? cachedResponse : null) || undefined;
  const tasks = response?.tasks || [];
  const summary = response?.summary || {};
  const pagination = response?.pagination || {};
  const total = numberValue(pagination.total ?? summary.total);
  const showingFrom = tasks.length ? page * PAGE_SIZE + 1 : 0;
  const showingTo = page * PAGE_SIZE + tasks.length;
  const usingOfflineSnapshot = !mobileExecutionQuery.data && Boolean(response);

  const replayPending = async () => {
    if (!online || syncing || pending.length === 0 || !canRunAnyMobileAction) return;
    setSyncing(true); setActionError(null); setMessage(null);
    const queued = [...pending];
    const remaining: OfflineOperation[] = [];
    let applied = 0;
    let firstFailure: string | null = null;
    try {
      for (let index = 0; index < queued.length; index += 1) {
        const operation = queued[index];
        try {
          const result = await apiRequest<MobileSyncResponse>('/inventory-capabilities/mobile-sync', {
            method: 'POST', body: JSON.stringify({ device_id: getDeviceId(), request_id: operation.operation_id, operations: [operation] })
          });
          const row = result.results?.[0];
          if (row?.status === 'applied') { applied += 1; continue; }
          const errorMessage = row?.error || ui('The queued action could not be applied.');
          firstFailure ||= errorMessage;
          remaining.push({ ...operation, last_error: errorMessage, failure_count: (operation.failure_count || 0) + 1 });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : ui('The queued action could not be applied.');
          firstFailure ||= errorMessage;
          if (error instanceof ApiError) {
            remaining.push({ ...operation, last_error: errorMessage, failure_count: (operation.failure_count || 0) + 1 });
            continue;
          }
          remaining.push(operation, ...queued.slice(index + 1));
          break;
        }
      }
      persistPending(remaining);
      if (firstFailure) setActionError(firstFailure);
      else setMessage(countLabel(applied, 'offline action synchronized.', 'offline actions synchronized.', locale, ui));
      await mobileExecutionQuery.refetch();
    } finally { setSyncing(false); }
  };

  useEffect(() => { if (online && pending.length > 0 && canRunAnyMobileAction) void replayPending(); }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAction = async (task: MobileExecutionTask, action: MobileAction, note?: string) => {
    if (!task.id || !canRunAction(action)) return;
    const normalizedNote = note?.trim() || undefined;
    if (action === 'block' && !normalizedNote) { setActionError(ui('Enter a reason before blocking this task.')); return; }
    const operation: OfflineOperation = { operation_id: makeId('op'), task_id: task.id, task_label: task.title || null, action, note: normalizedNote, created_at: new Date().toISOString() };
    setMessage(null); setActionError(null);
    if (!navigator.onLine) {
      const persisted = persistPending([...pending, operation]);
      setMessage(persisted
        ? ui('Task action queued on this device. It will synchronize when online.')
        : ui('Task action is queued for this open page only. Keep this page open until the device is online so it can synchronize.'));
      if (action === 'block') { setBlockReasonTaskId(null); setBlockReason(''); }
      return;
    }
    setBusyTaskId(task.id);
    try {
      const result = await apiRequest<MobileSyncResponse>('/inventory-capabilities/mobile-sync', {
        method: 'POST', body: JSON.stringify({ device_id: getDeviceId(), request_id: operation.operation_id, operations: [operation] })
      });
      const first = result.results?.[0];
      if (first?.status === 'failed') { setActionError(first.error || ui('The task action could not be applied.')); return; }
      if (first?.status !== 'applied') throw new Error('Mobile synchronization response did not confirm whether the action was applied.');
      setMessage(action === 'take' ? ui('Task assigned to you.') : ui('Task action applied successfully.'));
      if (action === 'block') { setBlockReasonTaskId(null); setBlockReason(''); }
      await mobileExecutionQuery.refetch();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        const persisted = pending.some((queued) => queued.operation_id === operation.operation_id) || persistPending([...pending, operation]);
        setMessage(persisted
          ? ui('Task action queued because synchronization could not be confirmed. It will retry safely without repeating a confirmed action.')
          : ui('Task action is waiting in this open page because synchronization could not be confirmed. Keep this page open until it can retry.'));
      } else setActionError(error.message);
    } finally { setBusyTaskId(null); }
  };

  const beginEvidence = (task: MobileExecutionTask, mode: 'photo' | 'file') => {
    setEvidenceTask(task); setEvidenceMessage(null); setActionError(null);
    window.setTimeout(() => (mode === 'photo' ? photoInputRef.current : evidenceInputRef.current)?.click(), 0);
  };

  const uploadEvidence = async (file: File | undefined) => {
    if (!file || !evidenceTask || !canUploadEvidence) return;
    setEvidenceUploading(true); setActionError(null); setEvidenceMessage(null);
    try {
      const params = new URLSearchParams({ entity_type: 'execution_task', entity_id: evidenceTask.id, original_filename: file.name, mime_type: file.type || 'application/octet-stream' });
      await apiRequest(`/enterprise-inventory/attachments/upload?${params.toString()}`, {
        method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file, skipMutationFeedback: true
      });
      setEvidenceMessage(ui('Evidence attached to the execution task successfully.'));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : ui('Evidence could not be attached.'));
    } finally {
      setEvidenceUploading(false); setEvidenceTask(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (evidenceInputRef.current) evidenceInputRef.current.value = '';
    }
  };

  return (
    <div className="mobile-execution-page mobile-execution-page--refined io-operational-page io-workspace-page io-workspace-legacy-normalized">
      <input ref={photoInputRef} className="mobile-execution-hidden-file" type="file" accept="image/*" capture="environment" onChange={(event) => void uploadEvidence(event.target.files?.[0])} />
      <input ref={evidenceInputRef} className="mobile-execution-hidden-file" type="file" accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx" onChange={(event) => void uploadEvidence(event.target.files?.[0])} />

      <OperationalWorkspaceHero
        iconPath="/mobile-execution"
        eyebrow={ui('Mobile & warehouse execution')}
        title={ui('Mobile Execution')}
        description={ui('Your mobile work queue: see ownership, location and deadlines, take unassigned work, scan the correct item, attach evidence, and keep safe task actions working offline.')}
        aside={<OperationalWorkspaceStatus value={ui(online ? 'Online' : 'Offline')} label={countLabel(pending.length, 'queued action awaiting synchronization', 'queued actions awaiting synchronization', locale, ui)} />}
      />

      <OperationalWorkspaceStats ariaLabel={ui('Mobile execution overview')}>
        <OperationalWorkspaceStatCard label={ui('Matching tasks')} value={formatLocalizedNumber(total, locale)} helper={ui(SCOPE_OPTIONS.find((option) => option.value === assignmentScope)?.description || 'Mobile work queue')} iconPath="/mobile-execution" tone="blue" />
        <OperationalWorkspaceStatCard label={ui('Overdue')} value={formatLocalizedNumber(numberValue(summary.overdue), locale)} helper={ui('Tasks whose due or SLA time has already passed')} iconPath="/alerts" tone={numberValue(summary.overdue) > 0 ? 'danger' : 'good'} />
        <OperationalWorkspaceStatCard label={ui('Connection')} value={ui(online ? 'Online' : 'Offline')} helper={countLabel(pending.length, 'action waiting to synchronize', 'actions waiting to synchronize', locale, ui)} iconPath="/real-time-operations-feed" tone={online ? 'good' : 'warn'} />
        <OperationalWorkspaceStatCard label={ui('Current view')} value={ui(SCOPE_OPTIONS.find((option) => option.value === assignmentScope)?.label || 'My tasks')} helper={ui('Responsibility is visible before a worker changes task state')} iconPath="/execution-tasks" tone="neutral" />
      </OperationalWorkspaceStats>

      <section className="section mobile-execution-section">
        <div className="section__title mobile-execution-section-title"><span className="mobile-execution-section-icon"><TenantNavIcon path="/mobile-execution" size={16} /></span>{ui('Mobile execution controls')}</div>
        <div className="card mobile-execution-controls-shell">
          <div className="mobile-execution-scope-tabs" role="group" aria-label={ui('Choose task ownership view')}>
            {SCOPE_OPTIONS.map((option) => <button key={option.value} type="button" className={`button button--secondary mobile-execution-scope-button ${assignmentScope === option.value ? 'mobile-execution-scope-button--active' : ''}`} onClick={() => setAssignmentScope(option.value)}>{ui(option.label)}</button>)}
          </div>
          <div className="mobile-execution-toolbar">
            <select aria-label={ui('Filter mobile tasks by urgency')} className="mobile-execution-select" value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | ActionUrgency)}>{URGENCY_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}</select>
            <select aria-label={ui('Filter mobile tasks by source')} className="mobile-execution-select" value={sourceType} onChange={(event) => setSourceType(event.target.value as 'all' | ExecutionTaskSourceType)}>{SOURCE_FILTERS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}</select>
            <button className="button button--secondary mobile-execution-control-button" type="button" onClick={() => mobileExecutionQuery.refetch()} disabled={mobileExecutionQuery.isFetching || !online}>{mobileExecutionQuery.isFetching ? ui('Refreshing…') : ui('Refresh mobile queue')}</button>
            <button className="button button--secondary mobile-execution-control-button" type="button" onClick={() => void replayPending()} disabled={!online || syncing || pending.length === 0 || !canRunAnyMobileAction}>{syncing ? ui('Synchronizing…') : `${ui('Sync pending')} (${formatLocalizedNumber(pending.length, locale)})`}</button>
            <Link className="button button--secondary mobile-execution-control-button" to="/execution-tasks">{ui('Open execution tasks')}</Link>
          </div>
          {!storageAvailable ? <p className="form-error">{ui('Offline storage is unavailable. Mobile Execution will continue, but cached queue pages and queued actions are kept only while this page remains open.')}</p> : null}
          {usingOfflineSnapshot ? <p className="card__subtext"><strong>{ui('Offline snapshot:')}</strong> {ui('showing the last successfully downloaded queue page.')}</p> : null}
          {mobileExecutionQuery.error && !response ? <p className="form-error">{mobileExecutionQuery.error instanceof ApiError ? mobileExecutionQuery.error.message : ui('Unable to load the mobile execution queue.')}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}
          {evidenceMessage ? <p className="form-success">{evidenceMessage}</p> : null}
          {actionError ? <p className="form-error">{actionError}</p> : null}
        </div>
      </section>

      {pending.length > 0 ? <section className="section mobile-execution-section"><div className="section__title mobile-execution-section-title">{ui('Queued offline actions')}<span className="mobile-execution-section-count">{formatLocalizedNumber(pending.length, locale)}</span></div><div className="mobile-execution-pending-list">{pending.map((operation) => <div className="card mobile-execution-pending-row" key={operation.operation_id}><div><div className="mobile-execution-pending-title">{ui(ACTION_LABELS[operation.action])} · {operation.task_label || ui('Execution task')}</div><div className="card__subtext">{ui('Queued:')} {formatDateTime(operation.created_at, locale, ui)}</div>{operation.note ? <div className="card__subtext"><strong>{ui('Reason:')}</strong> {operation.note}</div> : null}{operation.last_error ? <div className="form-error">{operation.last_error}</div> : null}</div><button className="button button--secondary" type="button" onClick={() => persistPending(pending.filter((item) => item.operation_id !== operation.operation_id))}>{ui('Remove queued action')}</button></div>)}</div></section> : null}

      <section className="section mobile-execution-section">
        <div className="section__title mobile-execution-section-title"><span className="mobile-execution-section-icon"><TenantNavIcon path="/execution-tasks" size={16} /></span>{ui('Touch-first task queue')}{total > 0 ? <span className="mobile-execution-section-count">{ui('Showing {from}-{to} of {total}').replace('{from}', String(showingFrom)).replace('{to}', String(showingTo)).replace('{total}', String(total))}</span> : null}</div>
        {!response ? <div className="card"><p className="card__subtext">{ui('Loading mobile execution queue…')}</p></div> : tasks.length === 0 ? <div className="card mobile-execution-empty-card"><div><div className="mobile-execution-empty-title">{ui('No matching mobile tasks')}</div><p className="card__subtext">{ui('No mobile execution tasks matched the selected responsibility and filters.')}</p></div></div> : <div className="mobile-execution-queue-grid">
          {tasks.map((task) => {
            const assignment = effectiveAssignmentState(task, pending);
            const actions = allowedActions(task, pending).filter((action) => canRunAction(action));
            const urgencyClass = urgencyToneClass(task.urgency);
            const queuedCount = pending.filter((operation) => operation.task_id === task.id).length;
            const sourceLink = taskSourceLink(task);
            const locationFrom = task.compact_payload?.from_location;
            const locationTo = task.compact_payload?.to_location;
            return <article className={`card mobile-execution-task-card mobile-execution-task-card--${urgencyClass}`} key={task.id}>
              <div className="mobile-execution-task-header"><div className="mobile-execution-task-lead"><span className={`mobile-execution-icon mobile-execution-icon--${urgencyClass}`}><TenantNavIcon path={task.source_route || '/execution-tasks'} size={17} /></span><div className="mobile-execution-task-heading"><div className="card__label">{canonicalLabel(task.status, ui)} · {task.task_code || ui('Execution task')}</div><h3>{task.title || ui('Untitled mobile task')}</h3></div></div><span className={`mobile-execution-urgency-pill mobile-execution-urgency-pill--${urgencyClass}`}>{canonicalLabel(task.urgency, ui)}</span></div>
              <p className="card__subtext mobile-execution-task-summary">{task.description || task.step_label || ui('No task summary was provided.')}</p>

              <div className="mobile-execution-task-facts">
                <div className="mobile-execution-task-fact"><span className="card__label">{ui('Assigned to')}</span><strong>{assignment === 'mine' ? ui('You') : assignment === 'unassigned' ? ui('Unassigned') : task.assigned_to_name || ui('Another team member')}</strong></div>
                <div className="mobile-execution-task-fact"><span className="card__label">{ui('Location')}</span><strong>{locationFrom && locationTo ? `${locationFrom} → ${locationTo}` : task.storage_location_name || locationFrom || locationTo || ui('No location specified')}</strong></div>
                <div className="mobile-execution-task-fact"><span className="card__label">{ui('Deadline')}</span><strong className={task.is_overdue ? 'mobile-execution-due--overdue' : ''}>{dueCopy(task, locale, ui)}</strong></div>
              </div>

              <div className="mobile-execution-task-badges">
                {task.scan_supported ? <span className="mobile-execution-meta-pill"><TenantNavIcon path="/scanner" size={13} />{ui('Scan-ready')}</span> : null}
                {queuedCount ? <span className="mobile-execution-meta-pill mobile-execution-meta-pill--pending">{countLabel(queuedCount, 'pending action', 'pending actions', locale, ui)}</span> : null}
                {task.source_type ? <span className="mobile-execution-meta-pill">{ui('Source')} {canonicalLabel(task.source_type, ui)}</span> : null}
                {task.compact_payload?.line_count ? <span className="mobile-execution-meta-pill">{countLabel(task.compact_payload.line_count, 'line', 'lines', locale, ui)}</span> : null}
              </div>

              {task.compact_payload?.product_name || task.compact_payload?.quantity ? <div className="mobile-execution-task-detail"><div className="card__label">{ui('Work context')}</div><p className="card__subtext">{[task.compact_payload.product_name, task.compact_payload.quantity ? `${formatLocalizedNumber(task.compact_payload.quantity, locale)} ${ui('unit(s)')}` : null].filter(Boolean).join(' · ')}</p></div> : null}

              {blockReasonTaskId === task.id ? <div className="mobile-execution-block-reason"><label className="card__label" htmlFor={`mobile-block-reason-${task.id}`}>{ui('Why is this task blocked?')}</label><textarea id={`mobile-block-reason-${task.id}`} className="mobile-execution-block-reason-input" value={blockReason} maxLength={1000} rows={3} onChange={(event) => setBlockReason(event.target.value)} placeholder={ui('Enter the reason another person needs to know before this task can continue.')} /><div className="mobile-execution-task-actions"><button className="button mobile-execution-task-button mobile-execution-task-button--primary" type="button" disabled={busyTaskId === task.id || blockReason.trim().length === 0} onClick={() => void runAction(task, 'block', blockReason)}>{ui('Confirm block')}</button><button className="button button--secondary mobile-execution-task-button" type="button" onClick={() => { setBlockReasonTaskId(null); setBlockReason(''); }}>{ui('Cancel')}</button></div></div> : null}

              <div className="mobile-execution-task-actions">
                {actions.map((action) => <button key={action} className={actionButtonClass(action)} type="button" disabled={busyTaskId === task.id} onClick={() => { if (action === 'block') { setBlockReasonTaskId(task.id); setBlockReason(''); setActionError(null); return; } void runAction(task, action); }}>{ui(ACTION_LABELS[action])}</button>)}
                {task.scan_supported && canUseScanner ? <Link className="button button--secondary mobile-execution-source-button" to={`/scanner?mode=task&executionTaskId=${encodeURIComponent(task.id)}`}><TenantNavIcon path="/scanner" size={14} />{ui('Scan/verify task item')}</Link> : null}
                {sourceLink ? <Link className="button button--secondary mobile-execution-source-button" to={sourceLink}><TenantNavIcon path={task.source_route || '/execution-tasks'} size={14} />{ui('Open source workflow')}</Link> : null}
                {canUploadEvidence ? <button className="button button--secondary mobile-execution-source-button" type="button" disabled={evidenceUploading} onClick={() => beginEvidence(task, 'photo')}><TenantNavIcon path="/mobile-execution" size={14} />{ui('Take photo')}</button> : null}
                {canUploadEvidence ? <button className="button button--secondary mobile-execution-source-button" type="button" disabled={evidenceUploading} onClick={() => beginEvidence(task, 'file')}>{ui('Add evidence')}</button> : null}
              </div>
              {assignment === 'other' ? <p className="card__subtext mobile-execution-assignment-note">{ui('This task belongs to another team member. You can review it here, but Mobile Execution will not let you change its task state.')}</p> : null}
            </article>;
          })}
        </div>}

        {response && (page > 0 || total > PAGE_SIZE) ? <div className="mobile-execution-pagination"><button className="button button--secondary" type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>{ui('Previous')}</button><span className="card__subtext">{ui('Showing {from}-{to} of {total}').replace('{from}', String(showingFrom)).replace('{to}', String(showingTo)).replace('{total}', String(total))}</span><button className="button button--secondary" type="button" disabled={!pagination.has_more} onClick={() => setPage((value) => value + 1)}>{ui('Next')}</button></div> : null}
      </section>
    </div>
  );
}
