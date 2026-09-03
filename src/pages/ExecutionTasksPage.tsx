import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';
import { ApiError, apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // v3.49.107: tenant title info pills intentionally hidden.
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import './ExecutionTasksPage.css';

type ExecutionTaskStatus = 'draft' | 'ready' | 'assigned' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
type ExecutionTaskType = 'picking' | 'reservation_fulfillment' | 'receiving' | 'replenishment' | 'transfer' | 'cycle_count' | 'general';
type ExecutionTaskPriority = 'low' | 'normal' | 'high' | 'urgent';
type ExecutionTaskSourceType = 'manual' | 'reservation' | 'requisition' | 'purchase_order' | 'shipment' | 'transfer' | 'cycle_count' | 'replenishment' | 'execution_request';
type ExecutionTaskBatchStatus = 'draft' | 'released' | 'cancelled';
type ExecutionTaskBatchType = 'manual' | 'reservation_fulfillment' | 'receiving' | 'replenishment' | 'transfer' | 'mixed';
type TaskAction = 'ready' | 'start' | 'unblock' | 'complete' | 'cancel' | 'block' | 'assign';
type BatchAction = 'release' | 'cancel';
type ExecutionTasksWorkspaceSection = 'overview' | 'queue' | 'create' | 'detail' | 'management';

type ExecutionTaskAuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

type ExecutionTask = {
  id: string;
  tenant_id: string;
  task_code: string;
  batch_id?: string | null;
  task_type: ExecutionTaskType;
  status: ExecutionTaskStatus;
  priority: ExecutionTaskPriority;
  title: string;
  description?: string | null;
  source_type: ExecutionTaskSourceType;
  source_id?: string | null;
  facility_id?: string | null;
  storage_location_id?: string | null;
  assigned_to?: string | null;
  assigned_by?: string | null;
  created_by?: string | null;
  due_at?: string | null;
  sla_due_at?: string | null;
  ready_at?: string | null;
  assigned_at?: string | null;
  started_at?: string | null;
  blocked_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  dependency_snapshot?: Array<Record<string, unknown>>;
  payload?: Record<string, unknown>;
  blocked_reason?: string | null;
  cancellation_reason?: string | null;
  completion_note?: string | null;
  created_at: string;
  updated_at: string;
  priority_score?: number;
  due_bucket?: 'overdue' | 'due_soon' | 'scheduled' | 'unscheduled' | 'closed';
  is_overdue?: boolean;
  is_due_soon?: boolean;
  sla_status?: 'overdue' | 'due_soon' | 'blocked' | 'on_track';
  escalation_level?: number;
};

type ExecutionTaskBatch = {
  id: string;
  tenant_id: string;
  batch_code: string;
  batch_type: ExecutionTaskBatchType;
  status: ExecutionTaskBatchStatus;
  priority: ExecutionTaskPriority;
  title: string;
  description?: string | null;
  facility_id?: string | null;
  storage_location_id?: string | null;
  assigned_to?: string | null;
  due_at?: string | null;
  sla_due_at?: string | null;
  task_count?: number;
  open_task_count?: number;
  completed_task_count?: number;
  created_at: string;
  updated_at: string;
};

type ExecutionTaskWorkload = {
  assigned_to?: string | null;
  operator_label: string;
  open_task_count: number;
  ready_task_count: number;
  assigned_task_count: number;
  in_progress_task_count: number;
  blocked_task_count: number;
  urgent_high_task_count: number;
  overdue_task_count: number;
  due_soon_task_count: number;
  next_due_at?: string | null;
  workload_score: number;
};

type ExecutionTaskThroughputDashboard = {
  window_days: number;
  totals: {
    total_task_count: number;
    open_task_count: number;
    completed_task_count: number;
    cancelled_task_count: number;
    blocked_task_count: number;
    urgent_high_task_count: number;
    overdue_task_count: number;
    avg_completion_hours: number | null;
  };
  by_status: Array<{ status: ExecutionTaskStatus; count: number }>;
  by_type: Array<{ task_type: ExecutionTaskType; count: number }>;
  by_source: Array<{ source_type: ExecutionTaskSourceType; count: number }>;
  daily: Array<{ day: string; created_count: number; completed_count: number; cancelled_count: number }>;
};

type MobileExecutionQueueTask = {
  id: string;
  task_code: string;
  title: string;
  status: ExecutionTaskStatus;
  priority: ExecutionTaskPriority;
  task_type: ExecutionTaskType;
  source_type: ExecutionTaskSourceType;
  assigned_to?: string | null;
  storage_location_id?: string | null;
  due_at?: string | null;
  sla_due_at?: string | null;
  priority_score?: number;
  due_bucket?: string;
  is_overdue?: boolean;
  action_hint: string;
  step_label: string;
  scan_required: boolean;
  compact_payload: {
    product_name?: string | null;
    line_count?: number;
    quantity?: number | null;
    from_location?: string | null;
    to_location?: string | null;
  };
};

type MobileExecutionQueue = {
  generated_at: string;
  count: number;
  summary: {
    ready: number;
    assigned: number;
    in_progress: number;
    blocked: number;
    overdue: number;
    scan_required: number;
  };
  tasks: MobileExecutionQueueTask[];
};

type MobileOptimizationVisibility = {
  generated_at: string;
  summary: {
    visible_signal_count: number;
    execution_pressure_score: number;
    open_task_count: number;
    blocked_task_count: number;
    overdue_task_count: number;
    urgent_high_task_count: number;
  };
  by_signal_type: Array<{ item_type: string; count: number }>;
  signals: Array<{
    id: string;
    plan_id: string;
    plan_code?: string | null;
    plan_type?: string | null;
    item_type: string;
    status: string;
    score: number;
    confidence?: number | null;
    recommendation: string;
    rationale?: string | null;
    compact_label: string;
    action_hint: string;
  }>;
};

type OptimizationExecutionDashboard = {
  generated_at: string;
  summary: {
    plan_count: number;
    optimization_signal_count: number;
    top_signal_count: number;
    average_signal_score: number;
    execution_pressure_score: number;
    open_task_count: number;
    blocked_task_count: number;
    overdue_task_count: number;
    urgent_high_task_count: number;
  };
  by_plan_status: Array<{ status: string; count: number }>;
  by_plan_type: Array<{ plan_type: string; count: number }>;
  by_signal_type: Array<{ item_type: string; count: number; average_score: number; average_confidence?: number | null }>;
  top_recommendations: Array<{
    id: string;
    plan_id: string;
    item_type: string;
    status: string;
    score: number;
    confidence?: number | null;
    recommendation: string;
    rationale?: string | null;
  }>;
};

type ExecutionTaskOptionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
};

type ExecutionTaskOptionLocation = {
  id: string;
  name: string;
  temperature_zone?: string | null;
  is_active: boolean;
};

type ExecutionTaskOptions = {
  users: ExecutionTaskOptionUser[];
  active_users: ExecutionTaskOptionUser[];
  locations: ExecutionTaskOptionLocation[];
  active_locations: ExecutionTaskOptionLocation[];
};

type ExecutionTaskSummary = {
  matching_task_count: number;
  open_task_count: number;
  blocked_task_count: number;
  overdue_task_count: number;
  due_soon_task_count: number;
  unassigned_task_count: number;
};

type NewTaskForm = {
  title: string;
  description: string;
  task_type: ExecutionTaskType;
  priority: ExecutionTaskPriority;
  status: 'draft' | 'ready';
  source_type: Exclude<ExecutionTaskSourceType, 'execution_request'>;
  source_id: string;
  facility_id: string;
  storage_location_id: string;
  assigned_to: string;
  due_at: string;
  sla_due_at: string;
};

type ActionDialog =
  | { kind: 'task'; action: TaskAction; task: ExecutionTask; value: string; assigneeId: string }
  | { kind: 'batch'; action: BatchAction; batch: ExecutionTaskBatch; value: string };

const TASK_TYPES: ExecutionTaskType[] = ['picking', 'reservation_fulfillment', 'receiving', 'replenishment', 'transfer', 'cycle_count', 'general'];
const PRIORITIES: ExecutionTaskPriority[] = ['urgent', 'high', 'normal', 'low'];
const STATUSES: ExecutionTaskStatus[] = ['draft', 'ready', 'assigned', 'in_progress', 'blocked', 'completed', 'cancelled'];
const BATCH_STATUSES: ExecutionTaskBatchStatus[] = ['draft', 'released', 'cancelled'];
const BATCH_TYPES: ExecutionTaskBatchType[] = ['manual', 'reservation_fulfillment', 'receiving', 'replenishment', 'transfer', 'mixed'];
const SOURCE_TYPES: ExecutionTaskSourceType[] = ['manual', 'reservation', 'requisition', 'purchase_order', 'shipment', 'transfer', 'cycle_count', 'replenishment', 'execution_request'];
const MANUAL_CREATE_SOURCE_TYPES = SOURCE_TYPES.filter((sourceType): sourceType is Exclude<ExecutionTaskSourceType, 'execution_request'> => sourceType !== 'execution_request');
const EMPTY_SUMMARY: ExecutionTaskSummary = {
  matching_task_count: 0,
  open_task_count: 0,
  blocked_task_count: 0,
  overdue_task_count: 0,
  due_soon_task_count: 0,
  unassigned_task_count: 0
};
const EMPTY_OPTIONS: ExecutionTaskOptions = { users: [], active_users: [], locations: [], active_locations: [] };
const INITIAL_FORM: NewTaskForm = {
  title: '',
  description: '',
  task_type: 'general',
  priority: 'normal',
  status: 'draft',
  source_type: 'manual',
  source_id: '',
  facility_id: '',
  storage_location_id: '',
  assigned_to: '',
  due_at: '',
  sla_due_at: ''
};

type UiFn = (text: string) => string;

const CANONICAL_LABELS: Record<string, string> = {
  draft: 'Draft', ready: 'Ready', assigned: 'Assigned', in_progress: 'In progress', blocked: 'Blocked', completed: 'Completed', cancelled: 'Cancelled',
  picking: 'Picking', reservation_fulfillment: 'Reservation fulfillment', receiving: 'Receiving', replenishment: 'Replenishment', transfer: 'Transfer', cycle_count: 'Cycle count', general: 'General',
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
  manual: 'Manual', reservation: 'Reservation', requisition: 'Requisition', purchase_order: 'Purchase order', shipment: 'Shipment', execution_request: 'Execution request', mixed: 'Mixed', released: 'Released',
  overdue: 'Overdue', due_soon: 'Due soon', scheduled: 'Scheduled', unscheduled: 'Unscheduled', closed: 'Closed', on_track: 'On track',
  start: 'Start', unblock: 'Unblock', complete: 'Complete', cancel: 'Cancel', block: 'Block', assign: 'Assign', release: 'Release',
  product_name: 'Product name', product_unit: 'Product unit', storage_location_name: 'Storage location', from_storage_location_name: 'From storage location', to_storage_location_name: 'To storage location',
  reservation_number: 'Reservation number', purchase_order_number: 'Purchase order number', transfer_number: 'Transfer number', requisition_number: 'Requisition number',
  replenishment_quantity: 'Replenishment quantity', allocated_quantity: 'Allocated quantity', total_quantity: 'Total quantity', item_count: 'Item count', line_count: 'Line count', status: 'Status'
};

function label(value: string | null | undefined, ui: UiFn): string {
  if (!value) return ui('Not recorded');
  const canonical = CANONICAL_LABELS[value];
  return canonical ? ui(canonical) : value.replace(/_/g, ' ');
}

function dateTime(value: string | null | undefined, locale: AppLocale, ui: UiFn): string {
  if (!value) return ui('Not scheduled');
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : formatLocalizedDateTime(parsed, locale);
}

function formatNumber(value: number, locale: AppLocale): string {
  return formatLocalizedNumber(value, locale, { maximumFractionDigits: 2 });
}

function toIsoOrNull(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function errorMessage(error: unknown, ui: UiFn): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return ui('The request could not be completed.');
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function downloadTextFile(content: string, filename: string, type = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function payloadFacts(payload: Record<string, unknown> | undefined, ui: UiFn): Array<{ key: string; value: string }> {
  if (!payload) return [];
  const preferredKeys = [
    'product_name', 'product_unit', 'storage_location_name', 'from_storage_location_name',
    'to_storage_location_name', 'reservation_number', 'purchase_order_number', 'transfer_number',
    'requisition_number', 'replenishment_quantity', 'allocated_quantity', 'total_quantity',
    'item_count', 'line_count', 'status'
  ];
  return preferredKeys.flatMap((key) => {
    const value = payload[key];
    if (value === undefined || value === null || value === '') return [];
    if (typeof value === 'object') return [];
    return [{ key: label(key, ui), value: String(value) }];
  });
}

export default function ExecutionTasksPage() {
  const { locale, ui } = useAppTranslation();
  const [searchParams] = useSearchParams();
  const requestedTaskId = searchParams.get('task_id')?.trim() || '';
  const queueRef = useRef<HTMLDivElement | null>(null);
  const createRef = useRef<HTMLDivElement | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);
  const managementRef = useRef<HTMLDetailsElement | null>(null);

  const canRead = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ);
  const canCreate = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_CREATE);
  const canAssign = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_ASSIGN);
  const canUpdate = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_UPDATE);
  const canComplete = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_COMPLETE);
  const canCancel = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_CANCEL);
  const canReadOptimization = hasPermission(TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_READ);
  const canCreateOptimization = hasPermission(TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_CREATE);

  const [options, setOptions] = useState<ExecutionTaskOptions>(EMPTY_OPTIONS);
  const [summary, setSummary] = useState<ExecutionTaskSummary>(EMPTY_SUMMARY);
  const [tasks, setTasks] = useState<ExecutionTask[]>([]);
  const [selected, setSelected] = useState<ExecutionTask | null>(null);
  const [taskAudit, setTaskAudit] = useState<ExecutionTaskAuditRow[]>([]);
  const [batches, setBatches] = useState<ExecutionTaskBatch[]>([]);
  const [workload, setWorkload] = useState<ExecutionTaskWorkload[]>([]);
  const [slaQueue, setSlaQueue] = useState<ExecutionTask[]>([]);
  const [throughput, setThroughput] = useState<ExecutionTaskThroughputDashboard | null>(null);
  const [mobileQueue, setMobileQueue] = useState<MobileExecutionQueue | null>(null);
  const [optimizationDashboard, setOptimizationDashboard] = useState<OptimizationExecutionDashboard | null>(null);
  const [mobileOptimization, setMobileOptimization] = useState<MobileOptimizationVisibility | null>(null);

  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState<ExecutionTasksWorkspaceSection>('overview');

  const [statusFilter, setStatusFilter] = useState<ExecutionTaskStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ExecutionTaskType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ExecutionTaskPriority | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<ExecutionTaskSourceType | 'all'>('all');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [storageLocationIdFilter, setStorageLocationIdFilter] = useState('');
  const [sourceIdFilter, setSourceIdFilter] = useState('');
  const [facilityIdFilter, setFacilityIdFilter] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  const [priorityQueueMode, setPriorityQueueMode] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [offset, setOffset] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [batchStatusFilter, setBatchStatusFilter] = useState<ExecutionTaskBatchStatus | 'all'>('all');
  const [batchTypeFilter, setBatchTypeFilter] = useState<ExecutionTaskBatchType | 'all'>('all');
  const [form, setForm] = useState<NewTaskForm>(INITIAL_FORM);
  const [actionDialog, setActionDialog] = useState<ActionDialog | null>(null);

  const userById = useMemo(() => new Map(options.users.map((user) => [user.id, user])), [options.users]);
  const locationById = useMemo(() => new Map(options.locations.map((location) => [location.id, location])), [options.locations]);
  const displayedTasks = tasks.slice(0, pageSize);
  const canGoPrevious = offset > 0;
  const visibleStart = displayedTasks.length ? offset + 1 : 0;
  const visibleEnd = offset + displayedTasks.length;

  const advancedIdError = useMemo(() => {
    const checks = [
      [ui('Source ID'), sourceIdFilter],
      [ui('Facility ID'), facilityIdFilter]
    ] as const;
    for (const [name, value] of checks) {
      if (value.trim() && !isUuid(value.trim())) return ui('{label} must be a valid UUID.').replace('{label}', name);
    }
    return null;
  }, [facilityIdFilter, sourceIdFilter, ui]);

  const createValidation = useMemo(() => {
    if (form.title.trim().length < 3) return ui('Enter a title with at least three characters.');
    if (form.source_type !== 'manual' && !form.source_id.trim()) return ui('A linked source ID is required for a non-manual source.');
    if (form.source_id.trim() && !isUuid(form.source_id.trim())) return ui('Source ID must be a valid UUID.');
    if (form.facility_id.trim() && !isUuid(form.facility_id.trim())) return ui('Facility ID must be a valid UUID.');
    return null;
  }, [form, ui]);

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchDraft.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [searchDraft]);

  useEffect(() => {
    setOffset(0);
  }, [assignedToFilter, facilityIdFilter, openOnly, pageSize, priorityFilter, priorityQueueMode, search, sourceFilter, sourceIdFilter, statusFilter, storageLocationIdFilter, typeFilter]);

  const buildTaskParams = useCallback((includePagination = true) => {
    const params = new URLSearchParams();
    if (includePagination) {
      params.set('limit', String(Math.min(pageSize + 1, 101)));
      params.set('offset', String(offset));
    }
    if (priorityQueueMode) {
      params.set('open_only', 'true');
    } else {
      params.set('open_only', openOnly ? 'true' : 'false');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (search) params.set('search', search);
    }
    if (typeFilter !== 'all') params.set('task_type', typeFilter);
    if (sourceFilter !== 'all') params.set('source_type', sourceFilter);
    if (assignedToFilter) params.set('assigned_to', assignedToFilter);
    if (storageLocationIdFilter) params.set('storage_location_id', storageLocationIdFilter);
    if (sourceIdFilter.trim()) params.set('source_id', sourceIdFilter.trim());
    if (facilityIdFilter.trim()) params.set('facility_id', facilityIdFilter.trim());
    return params;
  }, [assignedToFilter, facilityIdFilter, offset, openOnly, pageSize, priorityFilter, priorityQueueMode, search, sourceFilter, sourceIdFilter, statusFilter, storageLocationIdFilter, typeFilter]);

  const loadOptions = useCallback(async () => {
    if (!canRead) return;
    setOptionsLoading(true);
    try {
      setOptions(await apiRequest<ExecutionTaskOptions>('/execution-tasks/options'));
    } catch (requestError) {
      setError(`${ui('Task options could not be loaded.')} ${errorMessage(requestError, ui)}`);
    } finally {
      setOptionsLoading(false);
    }
  }, [canRead, ui]);

  const loadOperationalData = useCallback(async (preserveMessage = false) => {
    if (!canRead) return;
    if (advancedIdError) {
      setError(advancedIdError);
      return;
    }
    setLoading(true);
    setError(null);
    if (!preserveMessage) setMessage(null);

    const taskParams = buildTaskParams(true);
    const summaryParams = buildTaskParams(false);
    const taskEndpoint = priorityQueueMode ? '/execution-tasks/priority-queue' : '/execution-tasks';

    try {
      const [taskRows, nextSummary] = await Promise.all([
        apiRequest<ExecutionTask[]>(`${taskEndpoint}?${taskParams.toString()}`),
        apiRequest<ExecutionTaskSummary>(`/execution-tasks/summary?${summaryParams.toString()}`)
      ]);
      let nextTasks = taskRows;
      let linkedTaskError: string | null = null;
      setHasNextPage(taskRows.length > pageSize);
      nextTasks = taskRows.slice(0, pageSize);

      if (requestedTaskId && isUuid(requestedTaskId) && !nextTasks.some((task) => task.id === requestedTaskId)) {
        try {
          const linkedTask = await apiRequest<ExecutionTask>(`/execution-tasks/${requestedTaskId}`);
          nextTasks = [linkedTask, ...nextTasks.filter((task) => task.id !== linkedTask.id)].slice(0, pageSize);
        } catch (requestError) {
          linkedTaskError = `${ui('The linked task could not be opened.')} ${errorMessage(requestError, ui)}`;
        }
      } else if (requestedTaskId && !isUuid(requestedTaskId)) {
        linkedTaskError = ui('The linked execution task ID is invalid.');
      }

      setTasks(nextTasks);
      setSummary(nextSummary);
      setSelected((current) => {
        if (requestedTaskId) {
          const linked = nextTasks.find((task) => task.id === requestedTaskId);
          if (linked) return linked;
        }
        return nextTasks.find((task) => task.id === current?.id) || nextTasks[0] || null;
      });
      if (linkedTaskError) setError(linkedTaskError);
    } catch (requestError) {
      setError(errorMessage(requestError, ui));
    } finally {
      setLoading(false);
    }
  }, [advancedIdError, buildTaskParams, canRead, pageSize, priorityQueueMode, requestedTaskId, ui]);

  const buildSharedAnalyticsParams = useCallback(() => {
    const params = new URLSearchParams();
    if (typeFilter !== 'all') params.set('task_type', typeFilter);
    if (sourceFilter !== 'all') params.set('source_type', sourceFilter);
    if (assignedToFilter) params.set('assigned_to', assignedToFilter);
    if (storageLocationIdFilter) params.set('storage_location_id', storageLocationIdFilter);
    if (sourceIdFilter.trim()) params.set('source_id', sourceIdFilter.trim());
    if (facilityIdFilter.trim()) params.set('facility_id', facilityIdFilter.trim());
    return params;
  }, [assignedToFilter, facilityIdFilter, sourceFilter, sourceIdFilter, storageLocationIdFilter, typeFilter]);

  const loadAnalytics = useCallback(async () => {
    if (!canRead || advancedIdError) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    const shared = buildSharedAnalyticsParams();
    const workloadParams = new URLSearchParams(shared);
    workloadParams.set('limit', '25');
    const slaParams = new URLSearchParams(shared);
    slaParams.set('limit', '25');
    slaParams.set('sla_status', 'all');
    const throughputParams = new URLSearchParams(shared);
    throughputParams.set('days', '14');
    const mobileParams = new URLSearchParams(shared);
    mobileParams.set('limit', '20');
    const batchParams = new URLSearchParams(shared);
    batchParams.set('limit', '50');
    if (batchStatusFilter !== 'all') batchParams.set('status', batchStatusFilter);
    if (batchTypeFilter !== 'all') batchParams.set('batch_type', batchTypeFilter);
    if (search) batchParams.set('search', search);

    try {
      const [nextBatches, nextWorkload, nextSlaQueue, nextThroughput, nextMobileQueue, nextOptimization, nextMobileOptimization] = await Promise.all([
        apiRequest<ExecutionTaskBatch[]>(`/execution-tasks/batches?${batchParams.toString()}`),
        apiRequest<ExecutionTaskWorkload[]>(`/execution-tasks/workload?${workloadParams.toString()}`),
        apiRequest<ExecutionTask[]>(`/execution-tasks/sla-queue?${slaParams.toString()}`),
        apiRequest<ExecutionTaskThroughputDashboard>(`/execution-tasks/throughput-dashboard?${throughputParams.toString()}`),
        apiRequest<MobileExecutionQueue>(`/execution-tasks/mobile-queue?${mobileParams.toString()}`),
        canReadOptimization ? apiRequest<OptimizationExecutionDashboard>('/optimization-plans/execution-dashboard?limit=10&minimum_score=0') : Promise.resolve(null),
        canReadOptimization ? apiRequest<MobileOptimizationVisibility>('/optimization-plans/mobile-visibility?limit=8&minimum_score=0') : Promise.resolve(null)
      ]);
      setBatches(nextBatches);
      setWorkload(nextWorkload);
      setSlaQueue(nextSlaQueue);
      setThroughput(nextThroughput);
      setMobileQueue(nextMobileQueue);
      setOptimizationDashboard(nextOptimization);
      setMobileOptimization(nextMobileOptimization);
    } catch (requestError) {
      setAnalyticsError(errorMessage(requestError, ui));
    } finally {
      setAnalyticsLoading(false);
    }
  }, [advancedIdError, batchStatusFilter, batchTypeFilter, buildSharedAnalyticsParams, canRead, canReadOptimization, search, ui]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    void loadOperationalData();
  }, [loadOperationalData]);

  useEffect(() => {
    if (analyticsOpen) void loadAnalytics();
  }, [analyticsOpen, loadAnalytics]);

  useEffect(() => {
    if (!canRead || !selected?.id) {
      setTaskAudit([]);
      return;
    }
    let cancelled = false;
    const loadAudit = async () => {
      try {
        const rows = await apiRequest<ExecutionTaskAuditRow[]>(`/execution-tasks/${selected.id}/audit?limit=100`);
        if (!cancelled) setTaskAudit(rows);
      } catch {
        if (!cancelled) setTaskAudit([]);
      }
    };
    void loadAudit();
    return () => { cancelled = true; };
  }, [canRead, selected?.id]);

  useEffect(() => {
    if (requestedTaskId && selected?.id === requestedTaskId) {
      window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }, [requestedTaskId, selected?.id]);

  const userLabel = (userId?: string | null) => {
    if (!userId) return ui('Unassigned');
    const user = userById.get(userId);
    return user ? `${user.name}${user.is_active ? '' : ` ${ui('(inactive)')}`}` : `${ui('User')} ${userId.slice(0, 8)}…`;
  };

  const locationLabel = (locationId?: string | null) => {
    if (!locationId) return ui('No storage location');
    const location = locationById.get(locationId);
    return location ? `${location.name}${location.is_active ? '' : ` ${ui('(retired)')}`}` : `${ui('Location')} ${locationId.slice(0, 8)}…`;
  };

  const navigateWorkspaceSection = (section: ExecutionTasksWorkspaceSection, target: HTMLElement | null) => {
    setActiveWorkspaceSection(section);
    window.setTimeout(() => target?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20);
  };

  const selectTask = (task: ExecutionTask) => {
    setSelected(task);
    setActiveWorkspaceSection('detail');
    window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const openTaskById = async (taskId: string) => {
    const loadedTask = tasks.find((candidate) => candidate.id === taskId);
    if (loadedTask) {
      selectTask(loadedTask);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const task = await apiRequest<ExecutionTask>(`/execution-tasks/${taskId}`);
      selectTask(task);
    } catch (requestError) {
      setError(errorMessage(requestError, ui));
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setPriorityFilter('all');
    setSourceFilter('all');
    setAssignedToFilter('');
    setStorageLocationIdFilter('');
    setSourceIdFilter('');
    setFacilityIdFilter('');
    setOpenOnly(true);
    setPriorityQueueMode(false);
    setSearchDraft('');
    setBatchStatusFilter('all');
    setBatchTypeFilter('all');
    setOffset(0);
  };

  const createTask = async () => {
    if (createValidation) {
      setError(createValidation);
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const created = await apiRequest<ExecutionTask>('/execution-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          task_type: form.task_type,
          priority: form.priority,
          status: form.status,
          source_type: form.source_type,
          source_id: form.source_type === 'manual' ? null : form.source_id.trim(),
          facility_id: form.facility_id.trim() || null,
          storage_location_id: form.storage_location_id || null,
          assigned_to: form.assigned_to || null,
          due_at: toIsoOrNull(form.due_at),
          sla_due_at: toIsoOrNull(form.sla_due_at)
        })
      });
      setForm(INITIAL_FORM);
      setSelected(created);
      setMessage(ui('Created {taskCode}.').replace('{taskCode}', created.task_code));
      await loadOperationalData(true);
    } catch (requestError) {
      setError(errorMessage(requestError, ui));
    } finally {
      setSaving(false);
    }
  };

  const runTaskAction = async (task: ExecutionTask, action: TaskAction, body: Record<string, string> = {}) => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await apiRequest<ExecutionTask>(`/execution-tasks/${task.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      setSelected(updated);
      setMessage(ui('{taskCode} is now {status}.').replace('{taskCode}', updated.task_code).replace('{status}', label(updated.status, ui).toLocaleLowerCase(locale)));
      await loadOperationalData(true);
      if (analyticsOpen) await loadAnalytics();
    } catch (requestError) {
      setError(errorMessage(requestError, ui));
    } finally {
      setSaving(false);
    }
  };

  const runBatchAction = async (batch: ExecutionTaskBatch, action: BatchAction, body: Record<string, string> = {}) => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await apiRequest<ExecutionTaskBatch>(`/execution-tasks/batches/${batch.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      setMessage(ui('{batchCode} is now {status}.').replace('{batchCode}', updated.batch_code).replace('{status}', label(updated.status, ui).toLocaleLowerCase(locale)));
      await loadOperationalData(true);
      await loadAnalytics();
    } catch (requestError) {
      setError(errorMessage(requestError, ui));
    } finally {
      setSaving(false);
    }
  };

  const confirmDialogAction = async () => {
    if (!actionDialog) return;
    if (actionDialog.kind === 'task') {
      const { action, task, value, assigneeId } = actionDialog;
      if (action === 'assign' && !assigneeId) return;
      if ((action === 'block' || action === 'cancel') && value.trim().length < 3) return;
      const body: Record<string, string> = action === 'assign'
        ? { assigned_to: assigneeId }
        : action === 'block'
          ? { blocked_reason: value.trim() }
          : action === 'cancel'
            ? { cancellation_reason: value.trim() }
            : action === 'complete'
              ? { completion_note: value.trim() }
              : {};
      setActionDialog(null);
      await runTaskAction(task, action, body);
      return;
    }

    if (actionDialog.action === 'cancel' && actionDialog.value.trim().length < 3) return;
    const body: Record<string, string> = actionDialog.action === 'cancel' ? { cancellation_reason: actionDialog.value.trim() } : {};
    const { batch, action } = actionDialog;
    setActionDialog(null);
    await runBatchAction(batch, action, body);
  };

  const exportTaskAnalytics = async () => {
    if (advancedIdError) {
      setError(advancedIdError);
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    const params = buildTaskParams(false);
    params.set('days', '365');
    params.set('limit', '10000');
    try {
      const csv = await apiRequest<string>(`/execution-tasks/analytics.csv?${params.toString()}`);
      downloadTextFile(csv, `execution-task-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
      setMessage(ui('Complete filtered task analytics exported. The export is safely limited to 10,000 rows.'));
    } catch (requestError) {
      setError(errorMessage(requestError, ui));
    } finally {
      setSaving(false);
    }
  };

  const exportOptimizationAnalytics = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const csv = await apiRequest<string>('/optimization-plans/analytics.csv?days=90&limit=10000&minimum_score=0');
      downloadTextFile(csv, `inventory-optimization-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
      setMessage(ui('Optimization analytics exported.'));
    } catch (requestError) {
      setError(errorMessage(requestError, ui));
    } finally {
      setSaving(false);
    }
  };

  const generateAiRecommendationScaffolds = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const plan = await apiRequest<{ plan_code: string; item_count: number }>('/optimization-plans/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'AI recommendation scaffolding',
          recommendation_mode: 'operations_review',
          minimum_score: 0,
          limit: 25
        })
      });
      setMessage(ui('Generated advisory plan {planCode} with {count} signals. No task or stock record was changed.').replace('{planCode}', plan.plan_code).replace('{count}', formatNumber(plan.item_count, locale)));
      await loadAnalytics();
    } catch (requestError) {
      setError(errorMessage(requestError, ui));
    } finally {
      setSaving(false);
    }
  };

  if (!canRead) {
    return (
      <main className="execution-tasks-page">
        <section className="execution-tasks-card execution-tasks-permission-state">
          <h1>{ui("Execution Tasks")}</h1>
          <p>{ui("You do not have permission to view this tenant’s execution-task queue.")}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="execution-tasks-page io-operational-page io-workspace-page" id="execution-tasks-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/execution-tasks"
        eyebrow={ui("Execution workflow")}
        title={ui("Operational task queue")}
        description={ui("Coordinate tenant work from assignment through completion. Execution tasks organize and evidence the work; stock-changing actions remain governed by their source workflows.")}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
                      <>
                        <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui("Operational work queue")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>
                          {ui(canCreate || canAssign || canUpdate || canComplete || canCancel ? 'Workflow access' : 'Read-only access')}
                        </OperationalWorkspaceMetaPill>
                      </>
                    
          */
        }
        aside={
          <div className="execution-tasks-actions">
            <button type="button" className="btn btn-secondary" disabled={saving || loading} onClick={() => void exportTaskAnalytics()}>{ui("Export filtered CSV")}</button>
            <button type="button" className="btn btn-secondary" disabled={loading || saving} onClick={() => void Promise.all([loadOptions(), loadOperationalData(true), analyticsOpen ? loadAnalytics() : Promise.resolve()])}>
              {ui(loading ? 'Refreshing…' : 'Refresh')}
            </button>
          </div>
        }
      />

      {message ? <div className="execution-tasks-alert execution-tasks-alert--success" role="status">{message}</div> : null}
      {error ? <div className="execution-tasks-alert execution-tasks-alert--error" role="alert">{error}</div> : null}

      <OperationalWorkspaceStats ariaLabel={ui("Task summary")}>
        <OperationalWorkspaceStatCard label={ui("Open")} value={formatNumber(summary.open_task_count, locale)} helper={ui("Work not yet completed or cancelled")} tone={summary.open_task_count > 0 ? 'blue' : 'neutral'} iconPath="/execution-tasks" loading={loading} />
        <OperationalWorkspaceStatCard label={ui("Blocked")} value={formatNumber(summary.blocked_task_count, locale)} helper={ui("Tasks waiting for a blocker to be resolved")} tone={summary.blocked_task_count > 0 ? 'warn' : 'good'} iconPath="/alerts" loading={loading} />
        <OperationalWorkspaceStatCard label={ui("Overdue")} value={formatNumber(summary.overdue_task_count, locale)} helper={ui("Past the task due or SLA time")} tone={summary.overdue_task_count > 0 ? 'danger' : 'good'} iconPath="/alerts" loading={loading} />
        <OperationalWorkspaceStatCard label={ui("Unassigned")} value={formatNumber(summary.unassigned_task_count, locale)} helper={ui('{count} due within 24 hours').replace('{count}', formatNumber(summary.due_soon_task_count, locale))} tone={summary.unassigned_task_count > 0 ? 'warn' : 'good'} iconPath="/users" loading={loading} />
        <OperationalWorkspaceStatCard label={ui("Matching tasks")} value={formatNumber(summary.matching_task_count, locale)} helper={ui("All tasks under the current filters")} tone="slate" iconPath="/dashboard" loading={loading} />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel={ui("Execution task work areas")} hint={ui("Jump to the part of the task workflow you need.")}>
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'overview'} iconPath="/dashboard" label={ui("Overview")} onClick={() => navigateWorkspaceSection('overview', document.getElementById('execution-tasks-workspace-top'))} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'queue'} iconPath="/execution-tasks" label={ui("Task queue")} count={formatNumber(summary.matching_task_count, locale)} onClick={() => navigateWorkspaceSection('queue', queueRef.current)} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'create'} iconPath="/execution-requests" label={ui("Create task")} onClick={() => navigateWorkspaceSection('create', createRef.current)} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'detail'} iconPath="/audit" label={ui("Task detail")} onClick={() => navigateWorkspaceSection('detail', detailRef.current)} disabled={!selected} />
        <OperationalWorkspaceTab active={activeWorkspaceSection === 'management'} iconPath="/reliability-command" label={ui("Management insights")} onClick={() => { setAnalyticsOpen(true); navigateWorkspaceSection('management', managementRef.current); }} />
      </OperationalWorkspaceTabs>

      <div ref={queueRef} id="execution-task-queue" className="execution-tasks-scroll-anchor">
        <section className="app-panel execution-tasks-card execution-tasks-section-card">
          <OperationalSectionHeader
            iconPath="/execution-tasks"
            title={ui("Task queue")}
            description={ui(priorityQueueMode ? 'Priority order is active, so open work is ranked by urgency, status, source, and due risk.' : 'Find tenant work, review its status, and open a task for actions and detail.')}
            actions={
              <div className="execution-tasks-actions">
                <button type="button" className={priorityQueueMode ? 'btn btn-primary' : 'btn btn-secondary'} disabled={loading} onClick={() => setPriorityQueueMode((current) => !current)}>{ui(priorityQueueMode ? 'Priority order on' : 'Use priority order')}</button>
                <button type="button" className="btn btn-secondary" disabled={loading || saving} onClick={clearFilters}>{ui("Clear filters")}</button>
              </div>
            }
          />

          <div className="execution-tasks-filter-grid">
            <label>{ui("Search")} <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder={ui("Search code, title, description, type, status, or source")} disabled={priorityQueueMode} />
            </label>
            <label>{ui("Status")} <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ExecutionTaskStatus | 'all')} disabled={priorityQueueMode}>
                <option value="all">{ui("All statuses")}</option>
                {STATUSES.map((status) => <option key={status} value={status}>{label(status, ui)}</option>)}
              </select>
            </label>
            <label>{ui("Task type")} <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ExecutionTaskType | 'all')}>
                <option value="all">{ui("All task types")}</option>
                {TASK_TYPES.map((type) => <option key={type} value={type}>{label(type, ui)}</option>)}
              </select>
            </label>
            <label>{ui("Priority")} <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as ExecutionTaskPriority | 'all')} disabled={priorityQueueMode}>
                <option value="all">{ui("All priorities")}</option>
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{label(priority, ui)}</option>)}
              </select>
            </label>
            <label>{ui("Source")} <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as ExecutionTaskSourceType | 'all')}>
                <option value="all">{ui("All sources")}</option>
                {SOURCE_TYPES.map((source) => <option key={source} value={source}>{label(source, ui)}</option>)}
              </select>
            </label>
            <label>{ui("Assigned operator")} <select value={assignedToFilter} onChange={(event) => setAssignedToFilter(event.target.value)} disabled={optionsLoading}>
                <option value="">{ui("All operators")}</option>
                {options.users.map((user) => <option key={user.id} value={user.id}>{user.name}{user.is_active ? '' : ` ${ui('(inactive)')}`}</option>)}
              </select>
            </label>
            <label>{ui("Storage location")} <select value={storageLocationIdFilter} onChange={(event) => setStorageLocationIdFilter(event.target.value)} disabled={optionsLoading}>
                <option value="">{ui("All locations")}</option>
                {options.locations.map((location) => <option key={location.id} value={location.id}>{location.name}{location.is_active ? '' : ` ${ui('(retired)')}`}</option>)}
              </select>
            </label>
            <label>{ui("Rows per page")} <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          <div className="execution-tasks-filter-footer">
            <label className="execution-tasks-checkbox"><input type="checkbox" checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} disabled={priorityQueueMode} /> {ui("Open tasks only")}</label>
            <details className="execution-tasks-advanced-filters">
              <summary>{ui("Advanced ID and batch filters")}</summary>
              <div className="execution-tasks-filter-grid execution-tasks-filter-grid--advanced">
                <label>{ui("Source ID")} <input value={sourceIdFilter} onChange={(event) => setSourceIdFilter(event.target.value)} placeholder={ui("Exact source UUID")} aria-invalid={Boolean(sourceIdFilter.trim() && !isUuid(sourceIdFilter.trim()))} />
                </label>
                <label>{ui("Facility ID")} <input value={facilityIdFilter} onChange={(event) => setFacilityIdFilter(event.target.value)} placeholder={ui("Exact facility UUID")} aria-invalid={Boolean(facilityIdFilter.trim() && !isUuid(facilityIdFilter.trim()))} />
                </label>
                <label>{ui("Batch status")} <select value={batchStatusFilter} onChange={(event) => setBatchStatusFilter(event.target.value as ExecutionTaskBatchStatus | 'all')}>
                    <option value="all">{ui("All batch statuses")}</option>
                    {BATCH_STATUSES.map((status) => <option key={status} value={status}>{label(status, ui)}</option>)}
                  </select>
                </label>
                <label>{ui("Batch type")} <select value={batchTypeFilter} onChange={(event) => setBatchTypeFilter(event.target.value as ExecutionTaskBatchType | 'all')}>
                    <option value="all">{ui("All batch types")}</option>
                    {BATCH_TYPES.map((type) => <option key={type} value={type}>{label(type, ui)}</option>)}
                  </select>
                </label>
              </div>
              <p>{ui("These filters are mainly for linked records and support investigations. Most users can work with the readable filters above.")}</p>
            </details>
          </div>

          <div className="execution-tasks-table-wrap">
            <table className="execution-tasks-table">
              <thead>
                <tr>
                  <th>{ui("Task")}</th>
                  <th>{ui("Status")}</th>
                  <th>{ui("Priority")}</th>
                  <th>{ui("Due")}</th>
                  <th>{ui("Assigned to")}</th>
                  <th>{ui("Due state")}</th>
                  <th>{ui("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {displayedTasks.map((task) => (
                  <tr key={task.id} className={selected?.id === task.id ? 'is-selected' : ''}>
                    <td>
                      <button type="button" className="execution-tasks-link" onClick={() => selectTask(task)}>{task.task_code}</button>
                      <strong>{task.title}</strong>
                      <span>{label(task.task_type, ui)} · {label(task.source_type, ui)}</span>
                    </td>
                    <td><StatusPill status={task.status} /></td>
                    <td>{label(task.priority, ui)}</td>
                    <td><span className={task.is_overdue ? 'execution-tasks-text-danger' : ''}>{dateTime(task.sla_due_at || task.due_at, locale, ui)}</span></td>
                    <td>{userLabel(task.assigned_to)}</td>
                    <td><span>{label(task.due_bucket, ui)}</span></td>
                    <td><TaskActions task={task} saving={saving} canAssign={canAssign} canUpdate={canUpdate} canComplete={canComplete} canCancel={canCancel} onDirectAction={(action) => void runTaskAction(task, action)} onDialogAction={(action) => setActionDialog({ kind: 'task', action, task, value: '', assigneeId: task.assigned_to || '' })} /></td>
                  </tr>
                ))}
                {!displayedTasks.length ? <tr><td colSpan={7} className="execution-tasks-empty-cell">{ui(loading ? 'Loading tasks…' : 'No execution tasks match the current filters.')}</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="execution-tasks-pagination">
            <button type="button" className="btn btn-secondary" disabled={loading || !canGoPrevious} onClick={() => setOffset(Math.max(0, offset - pageSize))}>{ui("Previous")}</button>
            <span>{ui('{start}–{end} of {total} matching tasks').replace('{start}', formatNumber(visibleStart, locale)).replace('{end}', formatNumber(visibleEnd, locale)).replace('{total}', formatNumber(summary.matching_task_count, locale))}</span>
            <button type="button" className="btn btn-secondary" disabled={loading || !hasNextPage} onClick={() => setOffset(offset + pageSize)}>{ui("Next")}</button>
          </div>
        </section>
      </div>

      <div ref={createRef} id="execution-task-create" className="execution-tasks-scroll-anchor">
        {canCreate ? (
          <section className="app-panel execution-tasks-card execution-tasks-section-card">
            <OperationalSectionHeader
              iconPath="/execution-requests"
              title={ui("Create operational task")}
              description={ui("Create a coordination record for tenant work. If the work changes stock, use the source module to perform the actual stock transaction.")}
            />
            <div className="execution-tasks-create-grid">
              <label className="execution-tasks-field-wide">{ui("Title")}<input value={form.title} maxLength={180} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={ui("What needs to be done")} /></label>
              <label className="execution-tasks-field-wide">{ui("Description")}<textarea value={form.description} maxLength={2000} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={ui("Optional instructions or context")} /></label>
              <label>{ui("Task type")}<select value={form.task_type} onChange={(event) => setForm({ ...form, task_type: event.target.value as ExecutionTaskType })}>{TASK_TYPES.map((type) => <option key={type} value={type}>{label(type, ui)}</option>)}</select></label>
              <label>{ui("Priority")}<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as ExecutionTaskPriority })}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{label(priority, ui)}</option>)}</select></label>
              <label>{ui("Initial state")}<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'draft' | 'ready' })}><option value="draft">{ui("Draft")}</option><option value="ready">{ui("Ready")}</option></select></label>
              <label>{ui("Assign to")}<select value={form.assigned_to} onChange={(event) => setForm({ ...form, assigned_to: event.target.value })} disabled={optionsLoading}><option value="">{ui("Unassigned")}</option>{options.active_users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label>
              <label>{ui("Storage location")}<select value={form.storage_location_id} onChange={(event) => setForm({ ...form, storage_location_id: event.target.value })} disabled={optionsLoading}><option value="">{ui("No location")}</option>{options.active_locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
              <label>{ui("Due at")}<input type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} /></label>
              <label>{ui("SLA due at")}<input type="datetime-local" value={form.sla_due_at} onChange={(event) => setForm({ ...form, sla_due_at: event.target.value })} /></label>
              <div className="execution-tasks-create-action">
                <span>{createValidation || ui('The task is a coordination record and does not change stock by itself.')}</span>
                <button type="button" className="btn btn-primary" disabled={saving || Boolean(createValidation)} onClick={() => void createTask()}>{ui("Create task")}</button>
              </div>
            </div>
            <details className="execution-tasks-advanced-filters execution-tasks-create-advanced">
              <summary>{ui("Advanced source linkage")}</summary>
              <div className="execution-tasks-create-grid execution-tasks-create-grid--advanced">
                <label>{ui("Source type")}<select value={form.source_type} onChange={(event) => setForm({ ...form, source_type: event.target.value as NewTaskForm['source_type'], source_id: event.target.value === 'manual' ? '' : form.source_id })}>{MANUAL_CREATE_SOURCE_TYPES.map((source) => <option key={source} value={source}>{label(source, ui)}</option>)}</select></label>
                {form.source_type !== 'manual' ? <label>{ui("Source ID")}<input value={form.source_id} onChange={(event) => setForm({ ...form, source_id: event.target.value })} placeholder={ui("Required tenant-owned source UUID")} /></label> : null}
                <label>{ui("Facility ID")}<input value={form.facility_id} onChange={(event) => setForm({ ...form, facility_id: event.target.value })} placeholder={ui("Optional facility UUID")} /></label>
              </div>
              <p>{ui("For reservations, requisitions, purchase orders, shipments, transfers, cycle counts, or replenishment, creating the task from that source module is preferred. Linked records are still tenant-checked by the backend.")}</p>
            </details>
          </section>
        ) : (
          <section className="app-panel execution-tasks-card execution-tasks-readonly-note"><OperationalSectionHeader iconPath="/execution-requests" title={ui("Create operational task")} description={ui("Your role can view execution tasks but cannot create new ones.")} /></section>
        )}
      </div>

      <section ref={detailRef} id="execution-task-detail" className="execution-tasks-scroll-anchor">
        <TaskDetail task={selected} auditRows={taskAudit} userLabel={userLabel} locationLabel={locationLabel} saving={saving} canAssign={canAssign} canUpdate={canUpdate} canComplete={canComplete} canCancel={canCancel} onDirectAction={(task, action) => void runTaskAction(task, action)} onDialogAction={(task, action) => setActionDialog({ kind: 'task', action, task, value: '', assigneeId: task.assigned_to || '' })} />
      </section>

      <details ref={managementRef} id="execution-task-management" className="execution-tasks-governance execution-tasks-scroll-anchor" open={analyticsOpen} onToggle={(event) => { const open = (event.currentTarget as HTMLDetailsElement).open; setAnalyticsOpen(open); if (open) setActiveWorkspaceSection('management'); }}>
        <summary><span>{ui('Management insights')}</span><span>{ui(analyticsLoading ? 'Loading…' : 'Workload, SLA, mobile queues, batches, and planning')}</span></summary>
        <div className="execution-tasks-governance-body">
          {analyticsError ? <div className="execution-tasks-alert execution-tasks-alert--warning">{ui("Operational task work remains available, but management analysis could not be loaded:")} {analyticsError}</div> : null}

          <section className="execution-tasks-card">
            <div className="execution-tasks-card-header"><div><h3>{ui('Throughput — last {count} days').replace('{count}', formatNumber(throughput?.window_days ?? 14, locale))}</h3><p>{ui("Created, completed, blocked, cancelled, and completion-time signals.")}</p></div></div>
            <div className="execution-tasks-summary-grid execution-tasks-summary-grid--compact">
              <SummaryCard label={ui("Created")} value={formatNumber(throughput?.totals.total_task_count ?? 0, locale)} />
              <SummaryCard label={ui("Completed")} value={formatNumber(throughput?.totals.completed_task_count ?? 0, locale)} />
              <SummaryCard label={ui("Blocked")} value={formatNumber(throughput?.totals.blocked_task_count ?? 0, locale)} />
              <SummaryCard label={ui('Average completion')} value={throughput?.totals.avg_completion_hours == null ? '—' : formatNumber(throughput.totals.avg_completion_hours, locale)} helper={ui('Hours')} />
            </div>
            <div className="execution-tasks-distribution-grid">
              <Distribution title={ui("By status")} rows={throughput?.by_status.map((row) => ({ label: label(row.status, ui), count: row.count })) ?? []} />
              <Distribution title={ui("By task type")} rows={throughput?.by_type.map((row) => ({ label: label(row.task_type, ui), count: row.count })) ?? []} />
              <Distribution title={ui("By source")} rows={throughput?.by_source.map((row) => ({ label: label(row.source_type, ui), count: row.count })) ?? []} />
            </div>
          </section>

          <section className="execution-tasks-card">
            <div className="execution-tasks-card-header"><div><h3>{ui("Operator workload")}</h3><p>{ui("Open work grouped by assigned operator, including blocked and overdue pressure.")}</p></div></div>
            <div className="execution-tasks-workload-grid">
              {workload.map((row) => (
                <article key={row.assigned_to || 'unassigned'} className="execution-tasks-mini-card">
                  <strong>{row.assigned_to ? userLabel(row.assigned_to) : ui('Unassigned')}</strong>
                  <span>{formatNumber(row.open_task_count, locale)} {ui('open · score')} {formatNumber(row.workload_score, locale)}</span>
                  <div className="execution-tasks-metric-pairs"><span>{ui('Ready')} {formatNumber(row.ready_task_count, locale)}</span><span>{ui('Doing')} {formatNumber(row.in_progress_task_count, locale)}</span><span>{ui('Blocked')} {formatNumber(row.blocked_task_count, locale)}</span><span>{ui('Overdue')} {formatNumber(row.overdue_task_count, locale)}</span></div>
                  <span>{ui("Next due:")} {dateTime(row.next_due_at, locale, ui)}</span>
                </article>
              ))}
              {!workload.length ? <p className="execution-tasks-empty">{ui("No open workload for the current filters.")}</p> : null}
            </div>
          </section>

          <section className="execution-tasks-card">
            <div className="execution-tasks-card-header"><div><h3>{ui('Mobile execution queue')}</h3><p>{ui('Compact operator-ready task guidance. Selecting a card opens the full task detail above.')}</p></div><span>{formatNumber(mobileQueue?.count ?? 0, locale)} {ui('tasks')}</span></div>
            <div className="execution-tasks-mobile-list">
              {mobileQueue?.tasks.map((task) => (
                <button key={task.id} type="button" disabled={saving} onClick={() => void openTaskById(task.id)}>
                  <strong>{task.task_code} · {task.title}</strong>
                  <span>{task.step_label} · {label(task.action_hint, ui)} {ui("· score")} {task.priority_score == null ? '—' : formatNumber(task.priority_score, locale)}</span>
                  <span>{label(task.status, ui)} · {ui(task.scan_required ? 'Scan required' : 'No scan required')} · {dateTime(task.sla_due_at || task.due_at, locale, ui)}</span>
                </button>
              )) ?? null}
              {!mobileQueue?.tasks.length ? <p className="execution-tasks-empty">{ui("No mobile-ready tasks for the current filters.")}</p> : null}
            </div>
          </section>

          <section className="execution-tasks-card">
            <div className="execution-tasks-card-header"><div><h3>{ui("SLA and escalation queue")}</h3><p>{ui("Open work ordered by blocker state, overdue pressure, due-soon risk, and priority score.")}</p></div></div>
            <div className="execution-tasks-mobile-list">
              {slaQueue.map((task) => <button key={task.id} type="button" onClick={() => selectTask(task)}><strong>{task.task_code} · {task.title}</strong><span>{label(task.sla_status, ui)} {ui("· escalation")} {formatNumber(task.escalation_level ?? 0, locale)} {ui("· score")} {task.priority_score == null ? '—' : formatNumber(task.priority_score, locale)}</span><span>{dateTime(task.sla_due_at || task.due_at, locale, ui)}</span></button>)}
              {!slaQueue.length ? <p className="execution-tasks-empty">{ui("No SLA-risk tasks for the current filters.")}</p> : null}
            </div>
          </section>

          <section className="execution-tasks-card">
            <div className="execution-tasks-card-header"><div><h3>{ui("Execution batches")}</h3><p>{ui("Draft and released groups of already-created tasks. Batch actions do not perform the source inventory operation.")}</p></div><span>{formatNumber(batches.length, locale)} {ui('loaded')}</span></div>
            <div className="execution-tasks-table-wrap">
              <table className="execution-tasks-table">
                <thead><tr><th>{ui("Batch")}</th><th>{ui("Status")}</th><th>{ui("Priority")}</th><th>{ui("Tasks")}</th><th>{ui("Location")}</th><th>{ui("Due")}</th><th>{ui("Actions")}</th></tr></thead>
                <tbody>
                  {batches.map((batch) => <tr key={batch.id}><td><strong>{batch.batch_code}</strong><span>{batch.title}</span><span>{label(batch.batch_type, ui)}</span></td><td><StatusPill status={batch.status} /></td><td>{label(batch.priority, ui)}</td><td>{formatNumber(batch.completed_task_count ?? 0, locale)} {ui('completed ·')} {formatNumber(batch.open_task_count ?? 0, locale)} {ui('open ·')} {formatNumber(batch.task_count ?? 0, locale)} {ui('total')}</td><td>{locationLabel(batch.storage_location_id)}</td><td>{dateTime(batch.sla_due_at || batch.due_at, locale, ui)}</td><td><div className="execution-tasks-actions">{canUpdate && batch.status === 'draft' ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void runBatchAction(batch, 'release')}>{ui("Release")}</button> : null}{canCancel && batch.status !== 'cancelled' ? <button type="button" className="btn btn-danger" disabled={saving} onClick={() => setActionDialog({ kind: 'batch', action: 'cancel', batch, value: '' })}>{ui("Cancel")}</button> : null}</div></td></tr>)}
                  {!batches.length ? <tr><td colSpan={7} className="execution-tasks-empty-cell">{ui("No batches match the current filters.")}</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>

          {canReadOptimization ? (
            <section className="execution-tasks-card">
              <div className="execution-tasks-card-header">
                <div><h3>{ui("Advisory optimization")}</h3><p>{ui("Read-only planning signals. Generating scaffolds creates advisory evidence only; it does not apply recommendations or change tasks.")}</p></div>
                <div className="execution-tasks-actions">{canCreateOptimization ? <button type="button" className="btn btn-secondary" disabled={saving || !optimizationDashboard} onClick={() => void generateAiRecommendationScaffolds()}>{ui("Generate planning recommendations")}</button> : null}<button type="button" className="btn btn-secondary" disabled={saving || !optimizationDashboard} onClick={() => void exportOptimizationAnalytics()}>{ui("Export optimization CSV")}</button></div>
              </div>
              <div className="execution-tasks-summary-grid execution-tasks-summary-grid--compact">
                <SummaryCard label={ui("Plans")} value={formatNumber(optimizationDashboard?.summary.plan_count ?? 0, locale)} />
                <SummaryCard label={ui("Signals")} value={formatNumber(optimizationDashboard?.summary.optimization_signal_count ?? 0, locale)} />
                <SummaryCard label={ui("Pressure")} value={formatNumber(optimizationDashboard?.summary.execution_pressure_score ?? 0, locale)} />
                <SummaryCard label={ui("Mobile signals")} value={formatNumber(mobileOptimization?.summary.visible_signal_count ?? 0, locale)} />
              </div>
              <div className="execution-tasks-mobile-list">
                {optimizationDashboard?.top_recommendations.slice(0, 8).map((item) => <article key={item.id}><strong>{label(item.item_type, ui)} {ui("· score")} {formatNumber(item.score, locale)}</strong><span>{item.recommendation}</span><span>{item.rationale || label(item.status, ui)}</span></article>) ?? null}
                {!optimizationDashboard?.top_recommendations.length ? <p className="execution-tasks-empty">{ui("No advisory optimization recommendations are available.")}</p> : null}
              </div>
            </section>
          ) : null}
        </div>
      </details>

      {actionDialog ? <ActionDialogModal dialog={actionDialog} users={options.active_users} saving={saving} onChange={setActionDialog} onCancel={() => setActionDialog(null)} onConfirm={() => void confirmDialogAction()} /> : null}
    </main>
  );
}

function SummaryCard({ label: cardLabel, value, helper }: { label: string; value: number | string; helper?: string }) {
  return <article className="execution-tasks-summary-card"><strong>{value}</strong><span>{cardLabel}</span>{helper ? <small>{helper}</small> : null}</article>;
}

function StatusPill({ status }: { status: ExecutionTaskStatus | ExecutionTaskBatchStatus }) {
  const { ui } = useAppTranslation();
  return <span className={`execution-tasks-pill execution-tasks-pill--${status}`}>{label(status, ui)}</span>;
}

function Distribution({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const { locale, ui } = useAppTranslation();
  return <article className="execution-tasks-mini-card"><strong>{title}</strong>{rows.length ? rows.map((row) => <div key={row.label} className="execution-tasks-distribution-row"><span>{row.label}</span><span>{formatNumber(row.count, locale)}</span></div>) : <span>{ui("No data")}</span>}</article>;
}

function TaskActions({ task, saving, canAssign, canUpdate, canComplete, canCancel, onDirectAction, onDialogAction }: {
  task: ExecutionTask;
  saving: boolean;
  canAssign: boolean;
  canUpdate: boolean;
  canComplete: boolean;
  canCancel: boolean;
  onDirectAction: (action: 'ready' | 'start' | 'unblock') => void;
  onDialogAction: (action: 'assign' | 'block' | 'complete' | 'cancel') => void;
}) {
  const { ui } = useAppTranslation();
  const terminal = task.status === 'completed' || task.status === 'cancelled';
  return <div className="execution-tasks-actions execution-tasks-actions--compact">
    {canUpdate && task.status === 'draft' ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => onDirectAction('ready')}>{ui("Mark ready")}</button> : null}
    {canAssign && ['ready', 'assigned', 'blocked'].includes(task.status) ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => onDialogAction('assign')}>{ui("Assign")}</button> : null}
    {canUpdate && ['ready', 'assigned', 'blocked'].includes(task.status) ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => onDirectAction('start')}>{ui("Start")}</button> : null}
    {canUpdate && ['ready', 'assigned', 'in_progress'].includes(task.status) ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => onDialogAction('block')}>{ui("Block")}</button> : null}
    {canUpdate && task.status === 'blocked' ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => onDirectAction('unblock')}>{ui("Unblock")}</button> : null}
    {canComplete && ['ready', 'assigned', 'in_progress'].includes(task.status) ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => onDialogAction('complete')}>{ui("Complete")}</button> : null}
    {canCancel && !terminal ? <button type="button" className="btn btn-danger" disabled={saving} onClick={() => onDialogAction('cancel')}>{ui("Cancel")}</button> : null}
  </div>;
}

function TaskDetail({ task, auditRows, userLabel, locationLabel, saving, canAssign, canUpdate, canComplete, canCancel, onDirectAction, onDialogAction }: {
  task: ExecutionTask | null;
  auditRows: ExecutionTaskAuditRow[];
  userLabel: (id?: string | null) => string;
  locationLabel: (id?: string | null) => string;
  saving: boolean;
  canAssign: boolean;
  canUpdate: boolean;
  canComplete: boolean;
  canCancel: boolean;
  onDirectAction: (task: ExecutionTask, action: 'ready' | 'start' | 'unblock') => void;
  onDialogAction: (task: ExecutionTask, action: 'assign' | 'block' | 'complete' | 'cancel') => void;
}) {
  const { locale, ui } = useAppTranslation();
  if (!task) {
    return (
      <section className="app-panel execution-tasks-card execution-tasks-empty-detail">
        <OperationalSectionHeader iconPath="/audit" title={ui("Task detail")} description={ui("Open a task from the queue to review its work details, lifecycle, and history.")} />
      </section>
    );
  }
  const facts = payloadFacts(task.payload, ui);
  return (
    <section className="app-panel execution-tasks-card execution-tasks-detail-card">
      <OperationalSectionHeader
        iconPath="/audit"
        title={`${task.task_code} · ${task.title}`}
        description={task.description || ui('No task description was recorded.')}
        actions={<StatusPill status={task.status} />}
      />

      <div className="execution-tasks-detail-actions">
        <TaskActions task={task} saving={saving} canAssign={canAssign} canUpdate={canUpdate} canComplete={canComplete} canCancel={canCancel} onDirectAction={(action) => onDirectAction(task, action)} onDialogAction={(action) => onDialogAction(task, action)} />
      </div>

      <div className="execution-tasks-detail-grid">
        <KeyValue title={ui("Type")} value={label(task.task_type, ui)} />
        <KeyValue title={ui("Priority")} value={label(task.priority, ui)} />
        <KeyValue title={ui("Assigned to")} value={userLabel(task.assigned_to)} />
        <KeyValue title={ui("Storage location")} value={locationLabel(task.storage_location_id)} />
        <KeyValue title={ui("Source")} value={label(task.source_type, ui)} />
        <KeyValue title={ui("Due")} value={dateTime(task.due_at, locale, ui)} />
        <KeyValue title={ui("SLA due")} value={dateTime(task.sla_due_at, locale, ui)} />
        <KeyValue title={ui("Created")} value={dateTime(task.created_at, locale, ui)} />
      </div>

      {task.blocked_reason ? <div className="execution-tasks-alert execution-tasks-alert--warning"><strong>{ui("Blocked reason:")}</strong> {task.blocked_reason}</div> : null}
      {task.cancellation_reason ? <div className="execution-tasks-alert execution-tasks-alert--warning"><strong>{ui("Cancellation reason:")}</strong> {task.cancellation_reason}</div> : null}
      {task.completion_note ? <div className="execution-tasks-alert execution-tasks-alert--success"><strong>{ui("Completion note:")}</strong> {task.completion_note}</div> : null}

      {facts.length ? (
        <div className="execution-tasks-detail-section">
          <h4>{ui("Source context")}</h4>
          <div className="execution-tasks-detail-grid execution-tasks-detail-grid--context">
            {facts.map((fact) => <KeyValue key={fact.key} title={fact.key === ui('Status') ? ui('Source status') : fact.key} value={fact.value} />)}
          </div>
        </div>
      ) : null}

      <div className="execution-tasks-detail-section">
        <h4>{ui("Lifecycle")}</h4>
        <div className="execution-tasks-timeline">
          <TimelineItem title={ui("Ready")} value={task.ready_at} />
          <TimelineItem title={ui("Assigned")} value={task.assigned_at} />
          <TimelineItem title={ui("Started")} value={task.started_at} />
          <TimelineItem title={ui("Blocked")} value={task.blocked_at} />
          <TimelineItem title={ui("Completed")} value={task.completed_at} />
          <TimelineItem title={ui("Cancelled")} value={task.cancelled_at} />
        </div>
      </div>

      <details className="execution-tasks-evidence execution-tasks-audit">
        <summary>{ui('Audit trail ({count})').replace('{count}', formatNumber(auditRows.length, locale))}</summary>
        {auditRows.length ? (
          <div className="execution-tasks-audit-list">
            {auditRows.map((row) => (
              <article key={row.id}>
                <strong>{label(row.action, ui)}</strong>
                <span>{dateTime(row.created_at, locale, ui)} · {userLabel(row.user_id)}</span>
              </article>
            ))}
          </div>
        ) : <p>{ui("No audit events were returned for this task.")}</p>}
      </details>
    </section>
  );
}

function KeyValue({ title, value }: { title: string; value: string }) {
  return <div className="execution-tasks-key-value"><span>{title}</span><strong>{value}</strong></div>;
}

function TimelineItem({ title, value }: { title: string; value?: string | null }) {
  const { locale, ui } = useAppTranslation();
  return <div className={value ? 'is-reached' : ''}><span>{title}</span><strong>{value ? dateTime(value, locale, ui) : ui('Not reached')}</strong></div>;
}

function ActionDialogModal({ dialog, users, saving, onChange, onCancel, onConfirm }: {
  dialog: ActionDialog;
  users: ExecutionTaskOptionUser[];
  saving: boolean;
  onChange: (next: ActionDialog) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { ui } = useAppTranslation();
  const taskAction = dialog.kind === 'task' ? dialog.action : null;
  const needsReason = taskAction === 'block' || taskAction === 'cancel' || (dialog.kind === 'batch' && dialog.action === 'cancel');
  const canConfirm = taskAction === 'assign'
    ? Boolean(dialog.kind === 'task' && dialog.assigneeId)
    : needsReason
      ? dialog.value.trim().length >= 3
      : true;
  const title = dialog.kind === 'task' ? `${label(dialog.action, ui)} ${dialog.task.task_code}` : `${label(dialog.action, ui)} ${dialog.batch.batch_code}`;
  return <div className="execution-tasks-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onCancel(); }}>
    <section className="execution-tasks-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="execution-tasks-card-header"><div><h3>{title}</h3><p>{ui("Confirm the information that will be written to the task audit trail.")}</p></div><button type="button" className="execution-tasks-close" onClick={onCancel} aria-label={ui("Close")}>×</button></div>
      {dialog.kind === 'task' && dialog.action === 'assign' ? <label>{ui("Assign to")}<select value={dialog.assigneeId} onChange={(event) => onChange({ ...dialog, assigneeId: event.target.value })}><option value="">{ui("Select an active user")}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label> : null}
      {dialog.kind === 'task' && dialog.action === 'complete' ? <label>{ui("Completion note (optional)")}<textarea value={dialog.value} maxLength={1000} onChange={(event) => onChange({ ...dialog, value: event.target.value })} /></label> : null}
      {needsReason ? <label>{ui(taskAction === 'block' ? 'Blocked reason' : 'Cancellation reason')}<textarea value={dialog.value} maxLength={1000} onChange={(event) => onChange({ ...dialog, value: event.target.value })} placeholder={ui("Enter at least three characters")} /></label> : null}
      <div className="execution-tasks-actions execution-tasks-modal-actions"><button type="button" className="btn btn-secondary" disabled={saving} onClick={onCancel}>{ui("Back")}</button><button type="button" className={taskAction === 'cancel' || (dialog.kind === 'batch' && dialog.action === 'cancel') ? 'btn btn-danger' : 'btn btn-primary'} disabled={saving || !canConfirm} onClick={onConfirm}>{ui('Confirm {action}').replace('{action}', label(dialog.action, ui).toLocaleLowerCase())}</button></div>
    </section>
  </div>;
}
