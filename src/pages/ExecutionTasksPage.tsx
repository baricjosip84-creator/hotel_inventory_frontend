import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ApiError, apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';

type ExecutionTaskStatus = 'draft' | 'ready' | 'assigned' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
type ExecutionTaskType = 'picking' | 'reservation_fulfillment' | 'receiving' | 'replenishment' | 'transfer' | 'cycle_count' | 'general';
type ExecutionTaskPriority = 'low' | 'normal' | 'high' | 'urgent';
type ExecutionTaskSourceType = 'manual' | 'reservation' | 'requisition' | 'purchase_order' | 'shipment' | 'transfer' | 'cycle_count' | 'replenishment' | 'execution_request';

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
  hours_past_due?: number | null;
  hours_until_due?: number | null;
};



type ExecutionTaskBatchStatus = 'draft' | 'released' | 'cancelled';
type ExecutionTaskBatchType = 'manual' | 'reservation_fulfillment' | 'receiving' | 'replenishment' | 'transfer' | 'mixed';

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
    source_type?: string | null;
    source_id?: string | null;
    target_type?: string | null;
    target_id?: string | null;
    assigned_to?: string | null;
    facility_id?: string | null;
    storage_location_id?: string | null;
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

type NewTaskForm = {
  title: string;
  description: string;
  task_type: ExecutionTaskType;
  priority: ExecutionTaskPriority;
  status: 'draft' | 'ready';
  source_type: ExecutionTaskSourceType;
  source_id: string;
  facility_id: string;
  storage_location_id: string;
  assigned_to: string;
  due_at: string;
  sla_due_at: string;
};

const TASK_TYPES: ExecutionTaskType[] = ['picking', 'reservation_fulfillment', 'receiving', 'replenishment', 'transfer', 'cycle_count', 'general'];
const PRIORITIES: ExecutionTaskPriority[] = ['urgent', 'high', 'normal', 'low'];
const STATUSES: ExecutionTaskStatus[] = ['draft', 'ready', 'assigned', 'in_progress', 'blocked', 'completed', 'cancelled'];
const BATCH_STATUSES: ExecutionTaskBatchStatus[] = ['draft', 'released', 'cancelled'];
const BATCH_TYPES: ExecutionTaskBatchType[] = ['manual', 'reservation_fulfillment', 'receiving', 'replenishment', 'transfer', 'mixed'];
const SOURCE_TYPES: ExecutionTaskSourceType[] = ['manual', 'reservation', 'requisition', 'purchase_order', 'shipment', 'transfer', 'cycle_count', 'replenishment', 'execution_request'];
const MANUAL_CREATE_SOURCE_TYPES: ExecutionTaskSourceType[] = SOURCE_TYPES.filter((sourceType) => sourceType !== 'execution_request');

const initialForm: NewTaskForm = {
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

function label(value?: string | null): string {
  if (!value) return '-';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function toIsoOrNull(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown request failure.';
}

function hasJsonContent(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && Object.keys(value as Record<string, unknown>).length > 0);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function ExecutionTasksPage() {
  const canRead = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ);
  const canReadOptimization = hasPermission(TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_READ);
  const canCreateOptimization = hasPermission(TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_CREATE);
  const canCreate = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_CREATE);
  const canAssign = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_ASSIGN);
  const canUpdate = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_UPDATE);
  const canComplete = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_COMPLETE);
  const canCancel = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_CANCEL);

  const [tasks, setTasks] = useState<ExecutionTask[]>([]);
  const [batches, setBatches] = useState<ExecutionTaskBatch[]>([]);
  const [workload, setWorkload] = useState<ExecutionTaskWorkload[]>([]);
  const [slaQueue, setSlaQueue] = useState<ExecutionTask[]>([]);
  const [throughput, setThroughput] = useState<ExecutionTaskThroughputDashboard | null>(null);
  const [mobileQueue, setMobileQueue] = useState<MobileExecutionQueue | null>(null);
  const [optimizationDashboard, setOptimizationDashboard] = useState<OptimizationExecutionDashboard | null>(null);
  const [mobileOptimization, setMobileOptimization] = useState<MobileOptimizationVisibility | null>(null);
  const [selected, setSelected] = useState<ExecutionTask | null>(null);
  const [taskAudit, setTaskAudit] = useState<ExecutionTaskAuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ExecutionTaskStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ExecutionTaskType | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<ExecutionTaskSourceType | 'all'>('all');
  const [sourceIdFilter, setSourceIdFilter] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState<ExecutionTaskBatchStatus | 'all'>('all');
  const [batchTypeFilter, setBatchTypeFilter] = useState<ExecutionTaskBatchType | 'all'>('all');
  const [facilityIdFilter, setFacilityIdFilter] = useState('');
  const [storageLocationIdFilter, setStorageLocationIdFilter] = useState('');
  const sourceIdFilterError = useMemo(() => {
    const normalized = sourceIdFilter.trim();
    return normalized && !isUuid(normalized) ? 'Source ID must be a valid UUID before filters can be applied.' : null;
  }, [sourceIdFilter]);
  const facilityIdFilterError = useMemo(() => {
    const normalized = facilityIdFilter.trim();
    return normalized && !isUuid(normalized) ? 'Facility ID must be a valid UUID before filters can be applied.' : null;
  }, [facilityIdFilter]);
  const storageLocationIdFilterError = useMemo(() => {
    const normalized = storageLocationIdFilter.trim();
    return normalized && !isUuid(normalized) ? 'Storage location ID must be a valid UUID before filters can be applied.' : null;
  }, [storageLocationIdFilter]);
  const [openOnly, setOpenOnly] = useState(true);
  const [priorityQueueMode, setPriorityQueueMode] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<NewTaskForm>(initialForm);
  const formSourceIdError = useMemo(() => {
    const normalized = form.source_id.trim();
    return normalized && !isUuid(normalized) ? 'Source ID must be a valid UUID before the task can be created.' : null;
  }, [form.source_id]);
  const formFacilityIdError = useMemo(() => {
    const normalized = form.facility_id.trim();
    return normalized && !isUuid(normalized) ? 'Facility ID must be a valid UUID before the task can be created.' : null;
  }, [form.facility_id]);
  const formStorageLocationIdError = useMemo(() => {
    const normalized = form.storage_location_id.trim();
    return normalized && !isUuid(normalized) ? 'Storage location ID must be a valid UUID before the task can be created.' : null;
  }, [form.storage_location_id]);
  const formAssignedToError = useMemo(() => {
    const normalized = form.assigned_to.trim();
    return normalized && !isUuid(normalized) ? 'Assigned user must be a valid UUID before the task can be created.' : null;
  }, [form.assigned_to]);
  const createTaskDisabled = saving || form.title.trim().length < 3 || Boolean(formSourceIdError || formFacilityIdError || formStorageLocationIdError || formAssignedToError);

  const summary = useMemo(() => {
    const open = tasks.filter((task) => !['completed', 'cancelled'].includes(task.status)).length;
    const blocked = tasks.filter((task) => task.status === 'blocked').length;
    const overdue = tasks.filter((task) => {
      const due = task.sla_due_at || task.due_at;
      return due && !['completed', 'cancelled'].includes(task.status) && new Date(due).getTime() < Date.now();
    }).length;

    return { open, blocked, overdue, total: tasks.length };
  }, [tasks]);

  const loadTasks = useCallback(async () => {
    if (!canRead) return;

    setLoading(true);
    setError(null);

    const normalizedSourceIdFilter = sourceIdFilter.trim();
    const normalizedFacilityIdFilter = facilityIdFilter.trim();
    const normalizedStorageLocationIdFilter = storageLocationIdFilter.trim();
    const filterValidationError = sourceIdFilterError || facilityIdFilterError || storageLocationIdFilterError;
    if (filterValidationError) {
      setLoading(false);
      setError(filterValidationError);
      return;
    }

    const appendLocationFilters = (paramsToUpdate: URLSearchParams) => {
      if (normalizedFacilityIdFilter) paramsToUpdate.set('facility_id', normalizedFacilityIdFilter);
      if (normalizedStorageLocationIdFilter) paramsToUpdate.set('storage_location_id', normalizedStorageLocationIdFilter);
    };

    const params = new URLSearchParams();
    params.set('limit', '100');
    if (priorityQueueMode) {
      if (typeFilter !== 'all') params.set('task_type', typeFilter);
      if (sourceFilter !== 'all') params.set('source_type', sourceFilter);
      if (normalizedSourceIdFilter) params.set('source_id', normalizedSourceIdFilter);
      appendLocationFilters(params);
    } else {
      params.set('open_only', openOnly ? 'true' : 'false');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('task_type', typeFilter);
      if (sourceFilter !== 'all') params.set('source_type', sourceFilter);
      if (normalizedSourceIdFilter) params.set('source_id', normalizedSourceIdFilter);
      appendLocationFilters(params);
      if (search.trim()) params.set('search', search.trim());
    }

    const workloadParams = new URLSearchParams();
    workloadParams.set('limit', '25');
    if (typeFilter !== 'all') workloadParams.set('task_type', typeFilter);
    if (sourceFilter !== 'all') workloadParams.set('source_type', sourceFilter);
    if (normalizedSourceIdFilter) workloadParams.set('source_id', normalizedSourceIdFilter);
    appendLocationFilters(workloadParams);

    const slaParams = new URLSearchParams();
    slaParams.set('limit', '25');
    slaParams.set('sla_status', 'all');
    if (typeFilter !== 'all') slaParams.set('task_type', typeFilter);
    if (sourceFilter !== 'all') slaParams.set('source_type', sourceFilter);
    if (normalizedSourceIdFilter) slaParams.set('source_id', normalizedSourceIdFilter);
    appendLocationFilters(slaParams);

    const throughputParams = new URLSearchParams();
    throughputParams.set('days', '14');
    if (typeFilter !== 'all') throughputParams.set('task_type', typeFilter);
    if (sourceFilter !== 'all') throughputParams.set('source_type', sourceFilter);
    if (normalizedSourceIdFilter) throughputParams.set('source_id', normalizedSourceIdFilter);
    appendLocationFilters(throughputParams);

    const mobileParams = new URLSearchParams();
    mobileParams.set('limit', '20');
    if (typeFilter !== 'all') mobileParams.set('task_type', typeFilter);
    if (sourceFilter !== 'all') mobileParams.set('source_type', sourceFilter);
    if (normalizedSourceIdFilter) mobileParams.set('source_id', normalizedSourceIdFilter);
    appendLocationFilters(mobileParams);

    const batchParams = new URLSearchParams();
    batchParams.set('limit', '25');
    if (batchStatusFilter !== 'all') batchParams.set('status', batchStatusFilter);
    if (batchTypeFilter !== 'all') batchParams.set('batch_type', batchTypeFilter);
    if (sourceFilter !== 'all') batchParams.set('source_type', sourceFilter);
    if (normalizedSourceIdFilter) batchParams.set('source_id', normalizedSourceIdFilter);
    appendLocationFilters(batchParams);
    if (search.trim()) batchParams.set('search', search.trim());

    const optimizationParams = new URLSearchParams();
    optimizationParams.set('limit', '10');
    optimizationParams.set('minimum_score', '0');

    const mobileOptimizationParams = new URLSearchParams();
    mobileOptimizationParams.set('limit', '8');
    mobileOptimizationParams.set('minimum_score', '0');

    try {
      const endpoint = priorityQueueMode ? '/execution-tasks/priority-queue' : '/execution-tasks';
      const [nextTasks, nextBatches, nextWorkload, nextSlaQueue, nextThroughput, nextMobileQueue, nextOptimizationDashboard, nextMobileOptimization] = await Promise.all([
        apiRequest<ExecutionTask[]>(`${endpoint}?${params.toString()}`),
        apiRequest<ExecutionTaskBatch[]>(`/execution-tasks/batches?${batchParams.toString()}`),
        apiRequest<ExecutionTaskWorkload[]>(`/execution-tasks/workload?${workloadParams.toString()}`),
        apiRequest<ExecutionTask[]>(`/execution-tasks/sla-queue?${slaParams.toString()}`),
        apiRequest<ExecutionTaskThroughputDashboard>(`/execution-tasks/throughput-dashboard?${throughputParams.toString()}`),
        apiRequest<MobileExecutionQueue>(`/execution-tasks/mobile-queue?${mobileParams.toString()}`),
        canReadOptimization
          ? apiRequest<OptimizationExecutionDashboard>(`/optimization-plans/execution-dashboard?${optimizationParams.toString()}`)
          : Promise.resolve(null),
        canReadOptimization
          ? apiRequest<MobileOptimizationVisibility>(`/optimization-plans/mobile-visibility?${mobileOptimizationParams.toString()}`)
          : Promise.resolve(null)
      ]);
      setTasks(nextTasks);
      setBatches(nextBatches);
      setWorkload(nextWorkload);
      setSlaQueue(nextSlaQueue);
      setThroughput(nextThroughput);
      setMobileQueue(nextMobileQueue);
      setOptimizationDashboard(nextOptimizationDashboard);
      setMobileOptimization(nextMobileOptimization);
      setSelected((current) => nextTasks.find((task) => task.id === current?.id) || nextTasks[0] || null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [batchStatusFilter, batchTypeFilter, canRead, canReadOptimization, facilityIdFilter, facilityIdFilterError, openOnly, priorityQueueMode, search, sourceFilter, sourceIdFilter, sourceIdFilterError, statusFilter, storageLocationIdFilter, storageLocationIdFilterError, typeFilter]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!canRead || !selected?.id) {
      setTaskAudit([]);
      return;
    }

    let cancelled = false;
    const loadAudit = async () => {
      try {
        const rows = await apiRequest<ExecutionTaskAuditRow[]>(`/execution-tasks/${selected.id}/audit?limit=50`);
        if (!cancelled) setTaskAudit(rows);
      } catch {
        if (!cancelled) setTaskAudit([]);
      }
    };

    void loadAudit();

    return () => {
      cancelled = true;
    };
  }, [canRead, selected?.id]);

  const refreshSelected = (updated: ExecutionTask) => {
    setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
    setSelected(updated);
  };

  const createTask = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    const formValidationError = formSourceIdError || formFacilityIdError || formStorageLocationIdError || formAssignedToError;
    if (formValidationError) {
      setError(formValidationError);
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      task_type: form.task_type,
      priority: form.priority,
      status: form.status,
      source_type: form.source_type,
      source_id: form.source_id.trim() || null,
      facility_id: form.facility_id.trim() || null,
      storage_location_id: form.storage_location_id.trim() || null,
      assigned_to: form.assigned_to.trim() || null,
      due_at: toIsoOrNull(form.due_at),
      sla_due_at: toIsoOrNull(form.sla_due_at)
    };

    try {
      const created = await apiRequest<ExecutionTask>('/execution-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setForm(initialForm);
      setTasks((current) => [created, ...current]);
      setSelected(created);
      setMessage(`Created execution task ${created.task_code}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const exportAnalyticsCsv = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    const exportValidationError = sourceIdFilterError || facilityIdFilterError || storageLocationIdFilterError;
    if (exportValidationError) {
      setError(exportValidationError);
      setSaving(false);
      return;
    }

    const params = new URLSearchParams();
    params.set('days', '30');
    params.set('limit', '10000');
    params.set('open_only', openOnly ? 'true' : 'false');
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('task_type', typeFilter);
    if (sourceFilter !== 'all') params.set('source_type', sourceFilter);
    if (sourceIdFilter.trim()) params.set('source_id', sourceIdFilter.trim());
    if (facilityIdFilter.trim()) params.set('facility_id', facilityIdFilter.trim());
    if (storageLocationIdFilter.trim()) params.set('storage_location_id', storageLocationIdFilter.trim());
    if (search.trim()) params.set('search', search.trim());

    try {
      const csv = await apiRequest<string>(`/execution-tasks/analytics.csv?${params.toString()}`);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `execution-task-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMessage('Execution task analytics CSV exported.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };


  const exportOptimizationAnalyticsCsv = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    const params = new URLSearchParams();
    params.set('days', '90');
    params.set('limit', '10000');
    params.set('minimum_score', '0');

    try {
      const csv = await apiRequest<string>(`/optimization-plans/analytics.csv?${params.toString()}`);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-optimization-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMessage('Optimization analytics CSV exported.');
    } catch (err) {
      setError(errorMessage(err));
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
      setMessage(`Generated AI recommendation scaffolding ${plan.plan_code} with ${plan.item_count} advisory signals.`);
      await loadTasks();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const runTransition = async (task: ExecutionTask, action: 'ready' | 'start' | 'unblock' | 'complete' | 'cancel' | 'block' | 'assign') => {
    let body: Record<string, string> = {};

    if (action === 'assign') {
      const assignedTo = window.prompt('Assign to user ID');
      if (!assignedTo) return;
      body = { assigned_to: assignedTo.trim() };
    }

    if (action === 'block') {
      const blockedReason = window.prompt('Blocked reason');
      if (!blockedReason) return;
      body = { blocked_reason: blockedReason.trim() };
    }

    if (action === 'complete') {
      const completionNote = window.prompt('Completion note (optional)') || '';
      body = { completion_note: completionNote.trim() };
    }

    if (action === 'cancel') {
      const cancellationReason = window.prompt('Cancellation reason');
      if (!cancellationReason) return;
      body = { cancellation_reason: cancellationReason.trim() };
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await apiRequest<ExecutionTask>(`/execution-tasks/${task.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      refreshSelected(updated);
      setMessage(`Updated ${updated.task_code} to ${label(updated.status)}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const runBatchTransition = async (batch: ExecutionTaskBatch, action: 'release' | 'cancel') => {
    let body: Record<string, string> = {};

    if (action === 'cancel') {
      const cancellationReason = window.prompt('Cancellation reason');
      if (!cancellationReason) return;
      body = { cancellation_reason: cancellationReason.trim() };
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await apiRequest<ExecutionTaskBatch>(`/execution-tasks/batches/${batch.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      setBatches((current) => current.map((candidate) => (candidate.id === updated.id ? updated : candidate)));
      setMessage(`Updated execution batch ${updated.batch_code} to ${label(updated.status)}.`);
      await loadTasks();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };


  if (!canRead) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <h1 style={styles.title}>Execution Tasks</h1>
          <p style={styles.muted}>You do not have permission to view execution tasks.</p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>Feature #7</p>
          <h1 style={styles.title}>Execution Tasks</h1>
          <p style={styles.subtitle}>Coordinate picking, receiving, replenishment, transfer, cycle count, reservation-fulfillment, and execution-request closure work from one operational task queue.</p>
        </div>
        <div style={styles.actionRow}>
          <button type="button" className="btn btn-secondary" disabled={saving || Boolean(sourceIdFilterError || facilityIdFilterError || storageLocationIdFilterError)} onClick={() => void exportAnalyticsCsv()}>
            Export analytics CSV
          </button>
          <button type="button" className="btn btn-secondary" disabled={loading || Boolean(sourceIdFilterError || facilityIdFilterError || storageLocationIdFilterError)} onClick={() => void loadTasks()}>
            Refresh
          </button>
        </div>
      </section>

      {message ? <div style={styles.success}>{message}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      <section style={styles.summaryGrid}>
        <SummaryCard label="Open tasks" value={summary.open} />
        <SummaryCard label="Blocked" value={summary.blocked} />
        <SummaryCard label="Overdue" value={summary.overdue} />
        <SummaryCard label="Loaded" value={summary.total} />
      </section>



      {canReadOptimization ? (
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Intelligent Execution Dashboard</h2>
              <p style={styles.muted}>Optimization-plan signal rollup across assignment, waves, routes, FEFO/FIFO, SLA risk, labor, bottlenecks, replenishment, facility balancing, and AI recommendation scaffolds.</p>
            </div>
            <div style={styles.actionRow}>
              {canCreateOptimization ? (
                <button type="button" className="btn btn-secondary" disabled={saving || !optimizationDashboard} onClick={() => void generateAiRecommendationScaffolds()}>
                  Generate AI scaffolds
                </button>
              ) : null}
              <button type="button" className="btn btn-secondary" disabled={saving || !optimizationDashboard} onClick={() => void exportOptimizationAnalyticsCsv()}>
                Export optimization CSV
              </button>
              <span style={styles.muted}>{optimizationDashboard ? `Generated ${dateTime(optimizationDashboard.generated_at)}` : 'Not loaded'}</span>
            </div>
          </div>
          {optimizationDashboard ? (
            <>
              <div style={styles.throughputGrid}>
                <SummaryCard label="Plans" value={optimizationDashboard.summary.plan_count} />
                <SummaryCard label="Signals" value={optimizationDashboard.summary.optimization_signal_count} />
                <SummaryCard label="Top signals" value={optimizationDashboard.summary.top_signal_count} />
                <div style={styles.summaryCard}><span style={styles.summaryValue}>{optimizationDashboard.summary.execution_pressure_score}</span><span style={styles.muted}>Execution pressure</span></div>
              </div>
              <div style={styles.distributionGrid}>
                <Distribution title="By plan type" rows={optimizationDashboard.by_plan_type.map((row) => ({ label: label(row.plan_type), count: row.count }))} />
                <Distribution title="By signal type" rows={optimizationDashboard.by_signal_type.map((row) => ({ label: label(row.item_type), count: row.count }))} />
                <Distribution title="By status" rows={optimizationDashboard.by_plan_status.map((row) => ({ label: label(row.status), count: row.count }))} />
              </div>
              <div style={styles.mobileQueueList}>
                {optimizationDashboard.top_recommendations.slice(0, 8).map((item) => (
                  <div key={item.id} style={styles.mobileQueueItem}>
                    <strong>{label(item.item_type)} · score {item.score}</strong>
                    <span>{item.recommendation}</span>
                    <span style={styles.muted}>{item.rationale || `Status ${label(item.status)}`}</span>
                  </div>
                ))}
                {!optimizationDashboard.top_recommendations.length ? <p style={styles.muted}>No optimization recommendations are available yet.</p> : null}
              </div>
            </>
          ) : <p style={styles.muted}>{loading ? 'Loading optimization dashboard…' : 'No optimization dashboard data available.'}</p>}
        </section>
      ) : null}

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Throughput Dashboard</h2>
            <p style={styles.muted}>Created, completed, cancelled, blocked, overdue, and average completion-hour signals for the last {throughput?.window_days ?? 14} days.</p>
          </div>
        </div>
        {throughput ? (
          <>
            <div style={styles.throughputGrid}>
              <SummaryCard label="Created" value={throughput.totals.total_task_count} />
              <SummaryCard label="Completed" value={throughput.totals.completed_task_count} />
              <SummaryCard label="Blocked" value={throughput.totals.blocked_task_count} />
              <div style={styles.summaryCard}><span style={styles.summaryValue}>{throughput.totals.avg_completion_hours ?? '-'}</span><span style={styles.muted}>Avg completion hours</span></div>
            </div>
            <div style={styles.distributionGrid}>
              <Distribution title="By status" rows={throughput.by_status.map((row) => ({ label: label(row.status), count: row.count }))} />
              <Distribution title="By task type" rows={throughput.by_type.map((row) => ({ label: label(row.task_type), count: row.count }))} />
              <Distribution title="By source" rows={throughput.by_source.map((row) => ({ label: label(row.source_type), count: row.count }))} />
            </div>
            <div style={styles.dailyList}>
              {throughput.daily.slice(-7).map((day) => (
                <div key={day.day} style={styles.dailyItem}>
                  <span>{dateTime(day.day).split(',')[0]}</span>
                  <span>Created {day.created_count}</span>
                  <span>Done {day.completed_count}</span>
                  <span>Cancelled {day.cancelled_count}</span>
                </div>
              ))}
            </div>
          </>
        ) : <p style={styles.muted}>{loading ? 'Loading throughput…' : 'No throughput data available.'}</p>}
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Operator Workload</h2>
            <p style={styles.muted}>Open workload grouped by assignee, including unassigned work, overdue pressure, blocked tasks, and priority score.</p>
          </div>
        </div>
        <div style={styles.workloadGrid}>
          {workload.map((row) => (
            <div key={row.assigned_to || 'unassigned'} style={styles.workloadCard}>
              <div style={styles.strong}>{row.operator_label}</div>
              <div style={styles.muted}>{row.open_task_count} open · score {row.workload_score}</div>
              <div style={styles.workloadMetrics}>
                <span>Ready {row.ready_task_count}</span>
                <span>Assigned {row.assigned_task_count}</span>
                <span>Doing {row.in_progress_task_count}</span>
                <span>Blocked {row.blocked_task_count}</span>
                <span>Overdue {row.overdue_task_count}</span>
                <span>Due soon {row.due_soon_task_count}</span>
              </div>
              <div style={row.overdue_task_count ? styles.overdueText : styles.muted}>Next due: {dateTime(row.next_due_at)}</div>
            </div>
          ))}
          {!workload.length ? <p style={styles.muted}>{loading ? 'Loading workload…' : 'No open workload for the current filters.'}</p> : null}
        </div>
      </section>



      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Mobile Execution Queue</h2>
            <p style={styles.muted}>Operator-ready mobile work list optimized for compact cards, scan-required work, action hints, and the next executable step.</p>
          </div>
          <span style={styles.muted}>{mobileQueue ? `${mobileQueue.count} tasks` : 'Not loaded'}</span>
        </div>
        {mobileQueue ? (
          <>
            <div style={styles.mobileSummaryGrid}>
              <SummaryCard label="Ready" value={mobileQueue.summary.ready} />
              <SummaryCard label="Doing" value={mobileQueue.summary.in_progress} />
              <SummaryCard label="Blocked" value={mobileQueue.summary.blocked} />
              <SummaryCard label="Scan required" value={mobileQueue.summary.scan_required} />
            </div>
            <div style={styles.mobileQueueList}>
              {mobileQueue.tasks.map((task) => (
                <button key={task.id} type="button" style={styles.mobileQueueItem} onClick={() => setSelected(tasks.find((candidate) => candidate.id === task.id) || null)}>
                  <span style={styles.strong}>{task.task_code} · {task.title}</span>
                  <span style={task.is_overdue ? styles.overdueText : styles.muted}>{task.step_label} · {label(task.action_hint)} · score {task.priority_score ?? '-'}</span>
                  <span style={styles.muted}>{label(task.task_type)} · {label(task.status)} · {task.scan_required ? 'Scan required' : 'No scan required'} · due {dateTime(task.sla_due_at || task.due_at)}</span>
                  {task.compact_payload.product_name || task.compact_payload.line_count ? <span style={styles.muted}>{task.compact_payload.product_name || 'Operational payload'} · lines {task.compact_payload.line_count ?? 0}</span> : null}
                </button>
              ))}
              {!mobileQueue.tasks.length ? <p style={styles.muted}>{loading ? 'Loading mobile queue…' : 'No mobile-ready tasks for the current filters.'}</p> : null}
            </div>
          </>
        ) : <p style={styles.muted}>{loading ? 'Loading mobile queue…' : 'No mobile queue data available.'}</p>}
      </section>


      {canReadOptimization ? (
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Mobile Optimization Visibility</h2>
              <p style={styles.muted}>Compact advisory optimization signals for supervisors using mobile execution views. These cards are read-only and do not apply recommendations.</p>
            </div>
            <span style={styles.muted}>{mobileOptimization ? `${mobileOptimization.summary.visible_signal_count} signals` : 'Not loaded'}</span>
          </div>
          {mobileOptimization ? (
            <>
              <div style={styles.mobileSummaryGrid}>
                <SummaryCard label="Signals" value={mobileOptimization.summary.visible_signal_count} />
                <SummaryCard label="Pressure" value={mobileOptimization.summary.execution_pressure_score} />
                <SummaryCard label="Blocked" value={mobileOptimization.summary.blocked_task_count} />
                <SummaryCard label="Overdue" value={mobileOptimization.summary.overdue_task_count} />
              </div>
              <div style={styles.mobileQueueList}>
                {mobileOptimization.signals.map((signal) => (
                  <div key={signal.id} style={styles.mobileQueueItem}>
                    <span style={styles.strong}>{label(signal.item_type)} · score {signal.score}</span>
                    <span>{signal.recommendation}</span>
                    <span style={styles.muted}>{label(signal.plan_type)} · {label(signal.status)} · {signal.action_hint ? label(signal.action_hint) : 'Review signal'}</span>
                    {signal.rationale ? <span style={styles.muted}>{signal.rationale}</span> : null}
                  </div>
                ))}
                {!mobileOptimization.signals.length ? <p style={styles.muted}>{loading ? 'Loading mobile optimization signals…' : 'No mobile optimization signals for the current filters.'}</p> : null}
              </div>
            </>
          ) : <p style={styles.muted}>{loading ? 'Loading mobile optimization visibility…' : 'No mobile optimization data available.'}</p>}
        </section>
      ) : null}

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>SLA & Escalation Queue</h2>
            <p style={styles.muted}>Open tasks ordered by blocked state, overdue SLA pressure, due-soon risk, and priority score.</p>
          </div>
        </div>
        <div style={styles.slaList}>
          {slaQueue.map((task) => (
            <button key={task.id} type="button" style={styles.slaItem} onClick={() => setSelected(task)}>
              <span style={styles.strong}>{task.task_code} · {task.title}</span>
              <span style={task.sla_status === 'overdue' || task.sla_status === 'blocked' ? styles.overdueText : styles.muted}>
                {label(task.sla_status)} · escalation {task.escalation_level ?? 0} · due {dateTime(task.sla_due_at || task.due_at)}
              </span>
              <span style={styles.muted}>{label(task.task_type)} · {label(task.status)} · score {task.priority_score ?? '-'}</span>
            </button>
          ))}
          {!slaQueue.length ? <p style={styles.muted}>{loading ? 'Loading SLA queue…' : 'No SLA-risk tasks for the current filters.'}</p> : null}
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Execution Batches</h2>
            <p style={styles.muted}>Released and draft task batches using the same facility, storage-location, and search filters as the task queue.</p>
          </div>
          <span style={styles.muted}>{batches.length} loaded</span>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Batch</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Priority</th>
                <th style={styles.th}>Tasks</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Due</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td style={styles.td}>
                    <div style={styles.strong}>{batch.batch_code}</div>
                    <div>{batch.title}</div>
                    <div style={styles.muted}>{label(batch.batch_type)}</div>
                  </td>
                  <td style={styles.td}><StatusPill status={batch.status} /></td>
                  <td style={styles.td}>{label(batch.priority)}</td>
                  <td style={styles.td}>{batch.completed_task_count ?? 0} completed / {batch.open_task_count ?? 0} open / {batch.task_count ?? 0} total</td>
                  <td style={styles.td}>{batch.storage_location_id || batch.facility_id || '-'}</td>
                  <td style={styles.td}>{dateTime(batch.sla_due_at || batch.due_at)}</td>
                  <td style={styles.td}>
                    <div style={styles.actionRow}>
                      {canUpdate && batch.status === 'draft' ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void runBatchTransition(batch, 'release')}>Release</button> : null}
                      {canCancel && batch.status !== 'cancelled' ? <button type="button" className="btn btn-danger" disabled={saving} onClick={() => void runBatchTransition(batch, 'cancel')}>Cancel</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!batches.length ? (
                <tr>
                  <td style={styles.td} colSpan={7}>{loading ? 'Loading execution batches…' : 'No execution batches match the current filters.'}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Task Queue</h2>
              <p style={styles.muted}>{priorityQueueMode ? 'Priority engine queue sorted by urgency, SLA/due risk, source, and lifecycle state.' : 'Filtered by status, type, source, open-state, and search.'}</p>
            </div>
          </div>

          <div style={styles.modeRow}>
            <button type="button" className={priorityQueueMode ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setPriorityQueueMode(!priorityQueueMode)}>
              {priorityQueueMode ? 'Priority queue enabled' : 'Use priority queue'}
            </button>
            <span style={styles.muted}>Priority mode uses backend scoring and always returns open operational tasks first.</span>
          </div>

          <div style={styles.filters}>
            <label style={styles.fieldLabel}>
              Status
              <select style={styles.input} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ExecutionTaskStatus | 'all')}>
                <option value="all">All statuses</option>
                {STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Type
              <select style={styles.input} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ExecutionTaskType | 'all')}>
                <option value="all">All types</option>
                {TASK_TYPES.map((taskType) => <option key={taskType} value={taskType}>{label(taskType)}</option>)}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Source
              <select style={styles.input} value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as ExecutionTaskSourceType | 'all')}>
                <option value="all">All sources</option>
                {SOURCE_TYPES.map((sourceType) => <option key={sourceType} value={sourceType}>{label(sourceType)}</option>)}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Source ID
              <input style={styles.input} value={sourceIdFilter} onChange={(event) => setSourceIdFilter(event.target.value)} placeholder="Optional source UUID" aria-invalid={Boolean(sourceIdFilterError)} />
              {sourceIdFilterError ? <span style={styles.errorText}>{sourceIdFilterError}</span> : <span style={styles.muted}>Leave blank to include every source record.</span>}
            </label>
            <label style={styles.fieldLabel}>
              Batch Status
              <select style={styles.input} value={batchStatusFilter} onChange={(event) => setBatchStatusFilter(event.target.value as ExecutionTaskBatchStatus | 'all')}>
                <option value="all">All batch statuses</option>
                {BATCH_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Batch Type
              <select style={styles.input} value={batchTypeFilter} onChange={(event) => setBatchTypeFilter(event.target.value as ExecutionTaskBatchType | 'all')}>
                <option value="all">All batch types</option>
                {BATCH_TYPES.map((batchType) => <option key={batchType} value={batchType}>{label(batchType)}</option>)}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Facility ID
              <input style={styles.input} value={facilityIdFilter} onChange={(event) => setFacilityIdFilter(event.target.value)} placeholder="Optional facility UUID" aria-invalid={Boolean(facilityIdFilterError)} />
              {facilityIdFilterError ? <span style={styles.errorText}>{facilityIdFilterError}</span> : <span style={styles.muted}>Leave blank to include every facility.</span>}
            </label>
            <label style={styles.fieldLabel}>
              Storage Location ID
              <input style={styles.input} value={storageLocationIdFilter} onChange={(event) => setStorageLocationIdFilter(event.target.value)} placeholder="Optional storage location UUID" aria-invalid={Boolean(storageLocationIdFilterError)} />
              {storageLocationIdFilterError ? <span style={styles.errorText}>{storageLocationIdFilterError}</span> : <span style={styles.muted}>Leave blank to include every storage location.</span>}
            </label>
            <label style={styles.fieldLabel}>
              Search
              <input style={styles.input} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Task code, title, description" disabled={priorityQueueMode} />
            </label>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} />
              Open only
            </label>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Task</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Priority</th>
                  <th style={styles.th}>Due</th>
                  <th style={styles.th}>Assigned</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} style={selected?.id === task.id ? styles.selectedRow : undefined}>
                    <td style={styles.td}>
                      <button type="button" style={styles.linkButton} onClick={() => setSelected(task)}>{task.task_code}</button>
                      <div style={styles.strong}>{task.title}</div>
                      <div style={styles.muted}>{label(task.task_type)} · {label(task.source_type)}</div>
                    </td>
                    <td style={styles.td}><StatusPill status={task.status} /></td>
                    <td style={styles.td}>{label(task.priority)}</td>
                    <td style={styles.td}>{dateTime(task.sla_due_at || task.due_at)}</td>
                    <td style={styles.td}>{task.assigned_to || '-'}</td>
                    <td style={styles.td}><PriorityScore task={task} /></td>
                    <td style={styles.td}><TaskActions task={task} saving={saving} canAssign={canAssign} canUpdate={canUpdate} canComplete={canComplete} canCancel={canCancel} runTransition={runTransition} /></td>
                  </tr>
                ))}
                {!tasks.length ? (
                  <tr>
                    <td style={styles.td} colSpan={7}>{loading ? 'Loading execution tasks…' : 'No execution tasks match the current filters.'}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside style={styles.sideColumn}>
          {canCreate ? (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Create Task</h2>
              <div style={styles.formGrid}>
                <label style={styles.fieldLabel}>Title<input style={styles.input} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                <label style={styles.fieldLabel}>Description<textarea style={styles.textarea} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
                <label style={styles.fieldLabel}>Type<select style={styles.input} value={form.task_type} onChange={(event) => setForm({ ...form, task_type: event.target.value as ExecutionTaskType })}>{TASK_TYPES.map((taskType) => <option key={taskType} value={taskType}>{label(taskType)}</option>)}</select></label>
                <label style={styles.fieldLabel}>Priority<select style={styles.input} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as ExecutionTaskPriority })}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}</select></label>
                <label style={styles.fieldLabel}>Initial status<select style={styles.input} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'draft' | 'ready' })}><option value="draft">Draft</option><option value="ready">Ready</option></select></label>
                <label style={styles.fieldLabel}>Source<select style={styles.input} value={form.source_type} onChange={(event) => setForm({ ...form, source_type: event.target.value as ExecutionTaskSourceType })}>{MANUAL_CREATE_SOURCE_TYPES.map((sourceType) => <option key={sourceType} value={sourceType}>{label(sourceType)}</option>)}</select></label>
                <label style={styles.fieldLabel}>Source ID<input style={styles.input} value={form.source_id} onChange={(event) => setForm({ ...form, source_id: event.target.value })} placeholder="Optional UUID" aria-invalid={Boolean(formSourceIdError)} />{formSourceIdError ? <span style={styles.errorText}>{formSourceIdError}</span> : null}</label>
                <label style={styles.fieldLabel}>Facility ID<input style={styles.input} value={form.facility_id} onChange={(event) => setForm({ ...form, facility_id: event.target.value })} placeholder="Optional facility UUID" aria-invalid={Boolean(formFacilityIdError)} />{formFacilityIdError ? <span style={styles.errorText}>{formFacilityIdError}</span> : null}</label>
                <label style={styles.fieldLabel}>Storage Location ID<input style={styles.input} value={form.storage_location_id} onChange={(event) => setForm({ ...form, storage_location_id: event.target.value })} placeholder="Optional storage location UUID" aria-invalid={Boolean(formStorageLocationIdError)} />{formStorageLocationIdError ? <span style={styles.errorText}>{formStorageLocationIdError}</span> : null}</label>
                <label style={styles.fieldLabel}>Assign to<input style={styles.input} value={form.assigned_to} onChange={(event) => setForm({ ...form, assigned_to: event.target.value })} placeholder="Optional user UUID" aria-invalid={Boolean(formAssignedToError)} />{formAssignedToError ? <span style={styles.errorText}>{formAssignedToError}</span> : null}</label>
                <label style={styles.fieldLabel}>Due at<input style={styles.input} type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} /></label>
                <label style={styles.fieldLabel}>SLA due at<input style={styles.input} type="datetime-local" value={form.sla_due_at} onChange={(event) => setForm({ ...form, sla_due_at: event.target.value })} /></label>
                <button type="button" className="btn btn-primary" disabled={createTaskDisabled} onClick={() => void createTask()}>Create execution task</button>
              </div>
            </div>
          ) : null}

          <TaskDetail task={selected} auditRows={taskAudit} />
        </aside>
      </section>
    </main>
  );
}


function Distribution({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  return (
    <div style={styles.distributionCard}>
      <div style={styles.strong}>{title}</div>
      {rows.length ? rows.map((row) => (
        <div key={row.label} style={styles.distributionRow}>
          <span>{row.label}</span>
          <span>{row.count}</span>
        </div>
      )) : <p style={styles.muted}>No data</p>}
    </div>
  );
}

function SummaryCard({ label: cardLabel, value }: { label: string; value: number }) {
  return <div style={styles.summaryCard}><span style={styles.summaryValue}>{value}</span><span style={styles.muted}>{cardLabel}</span></div>;
}

function StatusPill({ status }: { status: ExecutionTaskStatus | ExecutionTaskBatchStatus }) {
  return <span style={styles.pill}>{label(status)}</span>;
}

type TaskActionsProps = {
  task: ExecutionTask;
  saving: boolean;
  canAssign: boolean;
  canUpdate: boolean;
  canComplete: boolean;
  canCancel: boolean;
  runTransition: (task: ExecutionTask, action: 'ready' | 'start' | 'unblock' | 'complete' | 'cancel' | 'block' | 'assign') => Promise<void>;
};


function PriorityScore({ task }: { task: ExecutionTask }) {
  if (typeof task.priority_score !== 'number') {
    return <span style={styles.muted}>-</span>;
  }

  return (
    <div>
      <span style={styles.score}>{task.priority_score}</span>
      <div style={task.is_overdue ? styles.overdueText : styles.muted}>{label(task.due_bucket)}</div>
    </div>
  );
}

function TaskActions({ task, saving, canAssign, canUpdate, canComplete, canCancel, runTransition }: TaskActionsProps) {
  const terminal = task.status === 'completed' || task.status === 'cancelled';
  return (
    <div style={styles.actionRow}>
      {canUpdate && task.status === 'draft' ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void runTransition(task, 'ready')}>Ready</button> : null}
      {canAssign && ['ready', 'assigned', 'blocked'].includes(task.status) ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void runTransition(task, 'assign')}>Assign</button> : null}
      {canUpdate && ['ready', 'assigned', 'blocked'].includes(task.status) ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void runTransition(task, 'start')}>Start</button> : null}
      {canUpdate && ['ready', 'assigned', 'in_progress'].includes(task.status) ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void runTransition(task, 'block')}>Block</button> : null}
      {canUpdate && task.status === 'blocked' ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void runTransition(task, 'unblock')}>Unblock</button> : null}
      {canComplete && ['ready', 'assigned', 'in_progress'].includes(task.status) ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void runTransition(task, 'complete')}>Complete</button> : null}
      {canCancel && !terminal ? <button type="button" className="btn btn-danger" disabled={saving} onClick={() => void runTransition(task, 'cancel')}>Cancel</button> : null}
    </div>
  );
}

function TaskDetail({ task, auditRows }: { task: ExecutionTask | null; auditRows: ExecutionTaskAuditRow[] }) {
  if (!task) {
    return <div style={styles.card}><h2 style={styles.cardTitle}>Task Detail</h2><p style={styles.muted}>Select a task to inspect timing, source, dependency, and payload context.</p></div>;
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Task Detail</h2>
      <div style={styles.detailGrid}>
        <KeyValue label="Code" value={task.task_code} />
        <KeyValue label="Status" value={label(task.status)} />
        <KeyValue label="Type" value={label(task.task_type)} />
        <KeyValue label="Priority" value={label(task.priority)} />
        <KeyValue label="Priority score" value={typeof task.priority_score === 'number' ? String(task.priority_score) : '-'} />
        <KeyValue label="Due bucket" value={label(task.due_bucket)} />
        <KeyValue label="Source" value={`${label(task.source_type)} ${task.source_id || ''}`.trim()} />
        <KeyValue label="Location" value={task.storage_location_id || task.facility_id || '-'} />
        <KeyValue label="Due" value={dateTime(task.due_at)} />
        <KeyValue label="SLA due" value={dateTime(task.sla_due_at)} />
        <KeyValue label="Ready" value={dateTime(task.ready_at)} />
        <KeyValue label="Assigned" value={dateTime(task.assigned_at)} />
        <KeyValue label="Started" value={dateTime(task.started_at)} />
        <KeyValue label="Blocked" value={dateTime(task.blocked_at)} />
        <KeyValue label="Completed" value={dateTime(task.completed_at)} />
        <KeyValue label="Cancelled" value={dateTime(task.cancelled_at)} />
      </div>
      {task.description ? <p style={styles.description}>{task.description}</p> : null}
      {task.blocked_reason ? <p style={styles.warningText}>Blocked: {task.blocked_reason}</p> : null}
      {task.cancellation_reason ? <p style={styles.warningText}>Cancelled: {task.cancellation_reason}</p> : null}
      {task.completion_note ? <p style={styles.description}>Completion: {task.completion_note}</p> : null}
      {hasJsonContent(task.payload) ? <pre style={styles.pre}>{JSON.stringify(task.payload, null, 2)}</pre> : null}
      {task.dependency_snapshot?.length ? <pre style={styles.pre}>{JSON.stringify(task.dependency_snapshot, null, 2)}</pre> : null}
      <div style={styles.auditPanel}>
        <div style={styles.strong}>Audit Trail</div>
        {auditRows.length ? auditRows.map((row) => (
          <div key={row.id} style={styles.auditRow}>
            <span style={styles.strong}>{label(row.action)}</span>
            <span style={styles.muted}>{dateTime(row.created_at)} · {row.user_id || 'system'}</span>
            {hasJsonContent(row.metadata) ? <pre style={styles.auditPre}>{JSON.stringify(row.metadata, null, 2)}</pre> : null}
          </div>
        )) : <p style={styles.muted}>No audit events recorded for this task yet.</p>}
      </div>
    </div>
  );
}

function KeyValue({ label: key, value }: { label: string; value: string }) {
  return <div><span style={styles.key}>{key}</span><span style={styles.value}>{value || '-'}</span></div>;
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  hero: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '1rem', background: '#fff' },
  eyebrow: { margin: 0, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' },
  title: { margin: '0.15rem 0', fontSize: '2rem', lineHeight: 1.1 },
  subtitle: { margin: 0, color: '#475569', maxWidth: '52rem' },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 0.8fr)', gap: '1rem', alignItems: 'start' },
  sideColumn: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  card: { padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '1rem', background: '#fff', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' },
  cardTitle: { margin: 0, fontSize: '1.15rem' },
  muted: { color: '#64748b', fontSize: '0.86rem' },
  strong: { fontWeight: 700 },
  success: { padding: '0.75rem 1rem', borderRadius: '0.75rem', background: '#ecfdf5', color: '#166534', border: '1px solid #bbf7d0' },
  error: { padding: '0.75rem 1rem', borderRadius: '0.75rem', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' },
  throughputGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '1rem' },
  distributionGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '1rem' },
  distributionCard: { padding: '0.85rem', borderRadius: '0.85rem', border: '1px solid #e5e7eb', background: '#f8fafc' },
  distributionRow: { display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.3rem 0', fontSize: '0.86rem', color: '#334155' },
  dailyList: { display: 'grid', gap: '0.35rem' },
  dailyItem: { display: 'grid', gridTemplateColumns: '1.5fr repeat(3, 1fr)', gap: '0.5rem', padding: '0.45rem 0.65rem', borderRadius: '0.65rem', background: '#f8fafc', fontSize: '0.82rem', color: '#334155' },
  workloadGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '1rem' },
  workloadCard: { padding: '0.85rem', borderRadius: '0.85rem', border: '1px solid #e5e7eb', background: '#f8fafc' },
  workloadMetrics: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.35rem', margin: '0.65rem 0', fontSize: '0.78rem', color: '#334155' },
  mobileSummaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem', margin: '1rem 0' },
  mobileQueueList: { display: 'grid', gap: '0.6rem' },
  mobileQueueItem: { width: '100%', display: 'grid', gap: '0.25rem', textAlign: 'left', padding: '0.8rem', borderRadius: '0.9rem', border: '1px solid #dbeafe', background: '#eff6ff', cursor: 'pointer' },
  slaList: { display: 'grid', gap: '0.6rem', marginTop: '1rem' },
  slaItem: { width: '100%', display: 'grid', gap: '0.25rem', textAlign: 'left', padding: '0.75rem', borderRadius: '0.85rem', border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer' },
  summaryCard: { padding: '1rem', borderRadius: '1rem', border: '1px solid #e5e7eb', background: '#fff' },
  summaryValue: { display: 'block', fontSize: '1.6rem', fontWeight: 800 },
  modeRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' },
  filters: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem', margin: '1rem 0' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 700, color: '#334155' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', fontWeight: 700, marginTop: '1.35rem' },
  input: { width: '100%', padding: '0.55rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '0.65rem', font: 'inherit' },
  textarea: { width: '100%', minHeight: '5rem', padding: '0.55rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '0.65rem', font: 'inherit' },
  formGrid: { display: 'grid', gap: '0.75rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: '0.75rem', color: '#64748b', borderBottom: '1px solid #e5e7eb', padding: '0.6rem' },
  td: { borderBottom: '1px solid #eef2f7', padding: '0.7rem', verticalAlign: 'top' },
  selectedRow: { background: '#f8fafc' },
  linkButton: { border: 0, background: 'transparent', color: '#2563eb', padding: 0, fontWeight: 800, cursor: 'pointer' },
  pill: { display: 'inline-flex', padding: '0.25rem 0.55rem', borderRadius: '999px', background: '#eef2ff', color: '#3730a3', fontWeight: 800, fontSize: '0.75rem' },
  actionRow: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.7rem' },
  key: { display: 'block', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' },
  value: { display: 'block', fontWeight: 700, overflowWrap: 'anywhere' },
  description: { color: '#334155', lineHeight: 1.5 },
  score: { display: 'block', fontWeight: 900, fontSize: '1rem' },
  overdueText: { color: '#b91c1c', fontSize: '0.8rem', fontWeight: 800 },
  warningText: { color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem', padding: '0.6rem' },
  pre: { maxHeight: '14rem', overflow: 'auto', padding: '0.75rem', background: '#0f172a', color: '#e2e8f0', borderRadius: '0.75rem', fontSize: '0.78rem' },
  auditPanel: { display: 'grid', gap: '0.65rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' },
  auditRow: { display: 'grid', gap: '0.25rem', padding: '0.65rem', borderRadius: '0.75rem', background: '#f8fafc', border: '1px solid #e5e7eb' },
  auditPre: { maxHeight: '8rem', overflow: 'auto', padding: '0.55rem', background: '#0f172a', color: '#e2e8f0', borderRadius: '0.65rem', fontSize: '0.72rem' }
};
