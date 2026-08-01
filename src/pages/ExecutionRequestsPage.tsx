import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useSearchParams } from 'react-router';
import { apiRequest, ApiError } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { showTenantActionError, showTenantActionSuccess } from '../lib/actionFeedback';
import type {
  ExecutionAdapterRegistryResponse,
  ExecutionModuleHardeningSummaryResponse,
  ExecutionRequest,
  ExecutionRequestAuditPackResponse,
  ExecutionRequestExecutionReview,
  ExecutionRequestExecutionReviewResponse,
  ExecutionRequestListResponse,
  ExecutionRequestOptionsResponse,
  ExecutionRequestSecurityAuditResponse
} from '../types/inventory';

type StatusFilter = '' | ExecutionRequest['status'];
type TypeFilter = '' | ExecutionRequest['request_type'];
type ExecutionStatusFilter = '' | 'not_executed' | 'completed' | 'noop_completed' | 'failed';
type ControlledRequestType = 'cost_standard_update' | 'product_min_stock_update';

const requestTypes: ExecutionRequest['request_type'][] = [
  'cost_review',
  'cost_standard_update',
  'product_min_stock_update',
  'product_pricing_update',
  'supplier_review',
  'inventory_review',
  'system_recommendation'
];

const statuses: ExecutionRequest['status'][] = ['draft', 'pending_review', 'approved', 'rejected', 'cancelled'];
const executionStatuses: ExecutionStatusFilter[] = ['not_executed', 'completed', 'noop_completed', 'failed'];

const controlledRequestLabels: Record<ControlledRequestType, string> = {
  cost_standard_update: 'Standard cost update',
  product_min_stock_update: 'Minimum stock update'
};

const controlledValueLabels: Record<ControlledRequestType, string> = {
  cost_standard_update: 'New standard unit cost',
  product_min_stock_update: 'New minimum stock'
};

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function label(value?: string | null): string {
  return value ? value.replace(/_/g, ' ') : '-';
}

const beforeAfterFieldLabels: Record<string, string> = {
  standard_unit_cost: 'Standard Cost',
  standard_cost_updated_at: 'Standard Cost Updated At',
  standard_cost_updated_by_user_id: 'Standard Cost Updated By',
  min_stock: 'Minimum Stock',
  unit_price: 'Unit Price',
  version: 'Version'
};

function labelBeforeAfterField(key: string): string {
  return beforeAfterFieldLabels[key] || label(key);
}

function formatBeforeAfterValue(key: string, value: unknown): string {
  if (key.endsWith('_at')) {
    return formatDateTime(formatUnknown(value));
  }
  return formatUnknown(value);
}

function getBeforeAfterFieldKeys(before?: Record<string, unknown> | null, after?: Record<string, unknown> | null): string[] {
  const keys = new Set<string>();
  Object.keys(before || {}).forEach((key) => keys.add(key));
  Object.keys(after || {}).forEach((key) => keys.add(key));
  return Array.from(keys).filter((key) => key !== 'product_id' && key !== 'product_name');
}

function isSystemContextRequest(request: ExecutionRequest): boolean {
  return request.request_type === 'system_recommendation' && request.payload?.source === 'system_context_page';
}

function getRequestProductLabel(request: ExecutionRequest): string {
  const name = request.payload?.product_name;
  if (name) return String(name);
  const id = request.payload?.product_id;
  return id ? `Product ${String(id).slice(0, 8)}…` : '-';
}

function getRequestedValue(request: ExecutionRequest): unknown {
  if (request.request_type === 'cost_standard_update') return request.payload?.standard_unit_cost;
  if (request.request_type === 'product_min_stock_update') return request.payload?.min_stock;
  if (request.request_type === 'product_pricing_update') return request.payload?.unit_price;
  return null;
}

function getExpectedValue(request: ExecutionRequest): unknown {
  if (request.request_type === 'cost_standard_update') return request.payload?.expected_standard_unit_cost;
  if (request.request_type === 'product_min_stock_update') return request.payload?.expected_min_stock;
  if (request.request_type === 'product_pricing_update') return request.payload?.expected_unit_price;
  return null;
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre style={styles.json}>{JSON.stringify(value ?? null, null, 2)}</pre>;
}

function csvCell(value: unknown): string {
  const rawText = value === undefined || value === null ? '' : String(value);
  const safeText = /^[=+\-@\t\r]/.test(rawText) ? `'${rawText}` : rawText;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export default function ExecutionRequestsPage() {
  const capabilities = getRoleCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRequestId = searchParams.get('request_id');
  const registrySectionRef = useRef<HTMLDivElement | null>(null);
  const openedRequestedRequestIdRef = useRef<string | null>(null);
  const canCreateExecutionRequests = capabilities.canCreateExecutionRequests;
  const canSubmitExecutionRequests = capabilities.canSubmitExecutionRequests;
  const canCancelExecutionRequests = capabilities.canCancelExecutionRequests;
  const canReviewExecutionRequests = capabilities.canReviewExecutionRequests;
  const canExecuteExecutionRequests = capabilities.canExecuteExecutionRequests;
  const canWriteProducts = capabilities.canManageProducts;
  const canViewSystemContext = capabilities.canViewSystemContext;
  const [data, setData] = useState<ExecutionRequestListResponse | null>(null);
  const [options, setOptions] = useState<ExecutionRequestOptionsResponse | null>(null);
  const [adapterRegistry, setAdapterRegistry] = useState<ExecutionAdapterRegistryResponse | null>(null);
  const [hardeningSummary, setHardeningSummary] = useState<ExecutionModuleHardeningSummaryResponse | null>(null);
  const [selected, setSelected] = useState<ExecutionRequest | null>(null);
  const [auditPack, setAuditPack] = useState<ExecutionRequestAuditPackResponse | null>(null);
  const [securityAudit, setSecurityAudit] = useState<ExecutionRequestSecurityAuditResponse | null>(null);
  const [executionReview, setExecutionReview] = useState<ExecutionRequestExecutionReviewResponse | null>(null);
  const [status, setStatus] = useState<StatusFilter>('');
  const [requestType, setRequestType] = useState<TypeFilter>('');
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatusFilter>('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [createType, setCreateType] = useState<ControlledRequestType>('cost_standard_update');
  const [createProductId, setCreateProductId] = useState('');
  const [createValue, setCreateValue] = useState('');
  const [createReason, setCreateReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondaryWarning, setSecondaryWarning] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (requestType) params.set('request_type', requestType);
    if (executionStatus) params.set('execution_status', executionStatus);
    if (search.trim()) params.set('search', search.trim());
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return params.toString();
  }, [status, requestType, executionStatus, search, limit, offset]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSecondaryWarning(null);
      const requestsPromise = apiRequest<ExecutionRequestListResponse>(`/execution-requests?${query}`);
      const optionsPromise = apiRequest<ExecutionRequestOptionsResponse>('/execution-requests/options');
      const adaptersPromise = apiRequest<ExecutionAdapterRegistryResponse>('/execution-requests/adapters');
      const hardeningPromise = apiRequest<ExecutionModuleHardeningSummaryResponse>('/execution-requests/hardening-summary');
      const [requestsResult, optionsResult, adaptersResult, hardeningResult] = await Promise.allSettled([
        requestsPromise,
        optionsPromise,
        adaptersPromise,
        hardeningPromise
      ] as const);

      if (requestsResult.status === 'rejected') {
        throw requestsResult.reason;
      }

      const response = requestsResult.value;
      setData(response);
      setOptions(optionsResult.status === 'fulfilled' ? optionsResult.value : null);
      setAdapterRegistry(adaptersResult.status === 'fulfilled' ? adaptersResult.value : null);
      setHardeningSummary(hardeningResult.status === 'fulfilled' ? hardeningResult.value : null);

      const unavailableSections: string[] = [];
      if (optionsResult.status === 'rejected') unavailableSections.push('creation options');
      if (adaptersResult.status === 'rejected') unavailableSections.push('adapter registry');
      if (hardeningResult.status === 'rejected') unavailableSections.push('governance summary');
      setSecondaryWarning(unavailableSections.length
        ? `The request registry loaded, but ${unavailableSections.join(', ')} could not be loaded. Refresh the page before using those sections.`
        : null);

      setSelected((currentSelected) => {
        if (!currentSelected) return currentSelected;
        return response.rows.find((row) => row.id === currentSelected.id) || currentSelected;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load execution requests');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadRequests();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadRequests]);

  useEffect(() => {
    if (!requestedRequestId || openedRequestedRequestIdRef.current === requestedRequestId) {
      return;
    }

    let cancelled = false;
    const openLinkedRequest = async () => {
      setSaving(true);
      setError(null);
      try {
        const detail = await apiRequest<ExecutionRequest>(`/execution-requests/${requestedRequestId}`);
        if (cancelled) return;
        setSelected(detail);
        setAuditPack(null);
        setSecurityAudit(null);
        setExecutionReview(null);
        openedRequestedRequestIdRef.current = requestedRequestId;
        window.requestAnimationFrame(() => registrySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to open the linked Execution Request');
        }
      } finally {
        if (!cancelled) setSaving(false);
      }
    };

    void openLinkedRequest();
    return () => {
      cancelled = true;
    };
  }, [requestedRequestId]);


  const loadOptionalExecutionContextSnapshots = useCallback(async () => {
    if (!canViewSystemContext) {
      return {
        contextSnapshot: null,
        gateSnapshot: null
      };
    }

    const [contextSnapshot, gateSnapshot] = await Promise.all([
      apiRequest('/system-context'),
      apiRequest('/system-context/execution-gate')
    ]);

    return {
      contextSnapshot,
      gateSnapshot
    };
  }, [canViewSystemContext]);

  const createSystemRecommendation = async () => {
    setSaving(true);
    setError(null);
    try {
      const { contextSnapshot, gateSnapshot } = await loadOptionalExecutionContextSnapshots();

      const created = await apiRequest<ExecutionRequest>('/execution-requests', {
        method: 'POST',
        body: JSON.stringify({
          request_type: 'system_recommendation',
          payload: {
            source: 'system_context_page',
            requested_action: 'review_system_context_recommendation',
            note: 'Created from the current System Context snapshot. Real execution is only available for approved controlled product-field requests.'
          },
          gate_snapshot: gateSnapshot,
          context_snapshot: contextSnapshot
        })
      });

      setSelected(created);
      setAuditPack(null);
      setSecurityAudit(null);
      setExecutionReview(null);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('request_id', created.id);
      setSearchParams(nextParams, { replace: true });
      await loadRequests();
      showTenantActionSuccess('System Context review request draft created.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create execution request';
      setError(message);
      showTenantActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const createControlledProductRequest = async () => {
    const product = options?.products.find((item) => item.id === createProductId);
    const parsedValue = Number(createValue);

    if (!product) {
      setError('Select an active product.');
      return;
    }
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setError(`${controlledValueLabels[createType]} must be a non-negative number.`);
      return;
    }

    const payloadValue = createType === 'cost_standard_update'
      ? { standard_unit_cost: parsedValue }
      : { min_stock: parsedValue };

    setSaving(true);
    setError(null);
    try {
      const { contextSnapshot, gateSnapshot } = await loadOptionalExecutionContextSnapshots();
      const created = await apiRequest<ExecutionRequest>('/execution-requests', {
        method: 'POST',
        body: JSON.stringify({
          request_type: createType,
          payload: {
            product_id: product.id,
            ...payloadValue,
            reason: createReason.trim() || null,
            source: 'execution_requests_page'
          },
          gate_snapshot: gateSnapshot,
          context_snapshot: contextSnapshot
        })
      });

      setSelected(created);
      setAuditPack(null);
      setSecurityAudit(null);
      setExecutionReview(null);
      setCreateProductId('');
      setCreateValue('');
      setCreateReason('');
      setOffset(0);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('request_id', created.id);
      setSearchParams(nextParams, { replace: true });
      await loadRequests();
      showTenantActionSuccess(`${controlledRequestLabels[createType]} draft created.`);
      window.requestAnimationFrame(() => registrySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create controlled product update request';
      setError(message);
      showTenantActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const submitRequest = async (request: ExecutionRequest) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<ExecutionRequest>(`/execution-requests/${request.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ note: 'Submitted for human review from the registry UI.' })
      });
      setSelected(updated);
      await loadRequests();
      showTenantActionSuccess('Execution request submitted for review.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to submit execution request';
      setError(message);
      showTenantActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const approveRequest = async (request: ExecutionRequest) => {
    if (!window.confirm('Approve this request? Approval does not execute it, but it makes the request eligible for a permitted execution step.')) return;
    const reviewNote = window.prompt('Approval note (optional)') || '';

    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<ExecutionRequest>(`/execution-requests/${request.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ review_note: reviewNote.trim() || null })
      });
      setSelected(updated);
      await loadRequests();
      showTenantActionSuccess('Execution request approved.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to approve execution request';
      setError(message);
      showTenantActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const rejectRequest = async (request: ExecutionRequest) => {
    const rejectionReason = window.prompt('Rejection reason');
    if (!rejectionReason || rejectionReason.trim().length < 3) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<ExecutionRequest>(`/execution-requests/${request.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason: rejectionReason.trim() })
      });
      setSelected(updated);
      await loadRequests();
      showTenantActionSuccess('Execution request rejected.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to reject execution request';
      setError(message);
      showTenantActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const executeRequest = async (request: ExecutionRequest) => {
    const adapterLabel = request.adapter?.label || label(request.request_type);
    const confirmed = window.confirm(`Execute approved request: ${adapterLabel}? This is only enabled for controlled product-field updates.`);
    if (!confirmed) return;

    const note = window.prompt('Execution note (optional)') || '';

    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<ExecutionRequest>(`/execution-requests/${request.id}/execute`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() || null })
      });
      setSelected(updated);
      await loadRequests();
      if (updated.execution_status === 'failed') {
        const failureMessage = String(updated.execution_result?.failure_reason || 'The controlled execution failed. Review the stored failure evidence before deciding the next step.');
        setError(failureMessage);
        showTenantActionError(failureMessage);
      } else {
        showTenantActionSuccess('Controlled execution completed.');
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to execute request';
      setError(message);
      showTenantActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const executeNoopRequest = async (request: ExecutionRequest) => {
    if (!window.confirm('Run the no-op executor? This records a completed pipeline test but does not change a business record.')) return;
    const note = window.prompt('No-op execution note (optional)') || '';

    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<ExecutionRequest>(`/execution-requests/${request.id}/execute-noop`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() || null })
      });
      setSelected(updated);
      await loadRequests();
      showTenantActionSuccess('No-op execution completed.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to run no-op executor';
      setError(message);
      showTenantActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const loadRequestDetail = async (request: ExecutionRequest) => {
    setSaving(true);
    setError(null);
    try {
      const detail = await apiRequest<ExecutionRequest>(`/execution-requests/${request.id}`);
      setSelected(detail);
      setAuditPack(null);
      setSecurityAudit(null);
      setExecutionReview(null);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('request_id', detail.id);
      setSearchParams(nextParams, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load execution request detail');
    } finally {
      setSaving(false);
    }
  };

  const loadAuditPack = async (request: ExecutionRequest) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<ExecutionRequestAuditPackResponse>(`/execution-requests/${request.id}/audit-pack`);
      setAuditPack(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load audit pack');
    } finally {
      setSaving(false);
    }
  };

  const loadSecurityAudit = async (request: ExecutionRequest) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<ExecutionRequestSecurityAuditResponse>(`/execution-requests/${request.id}/security-audit`);
      setSecurityAudit(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load security audit');
    } finally {
      setSaving(false);
    }
  };

  const loadExecutionReview = async (request: ExecutionRequest) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<ExecutionRequestExecutionReviewResponse>(`/execution-requests/${request.id}/execution-review`);
      setExecutionReview(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load execution review');
    } finally {
      setSaving(false);
    }
  };

  const prepareRetryRequest = async (request: ExecutionRequest) => {
    const retryReason = window.prompt('Retry reason');
    if (!retryReason || retryReason.trim().length < 3) return;
    const note = window.prompt('Retry preparation note (optional)') || '';

    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<ExecutionRequest>(`/execution-requests/${request.id}/prepare-retry`, {
        method: 'POST',
        body: JSON.stringify({ retry_reason: retryReason.trim(), note: note.trim() || null })
      });
      setSelected(updated);
      await loadRequests();
      showTenantActionSuccess('Failed execution prepared for one controlled retry.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to prepare retry';
      setError(message);
      showTenantActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const cancelRequest = async (request: ExecutionRequest) => {
    const cancelReason = window.prompt('Cancel reason');
    if (!cancelReason || cancelReason.trim().length < 3) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<ExecutionRequest>(`/execution-requests/${request.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancel_reason: cancelReason.trim() })
      });
      setSelected(updated);
      await loadRequests();
      showTenantActionSuccess('Execution request cancelled.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to cancel execution request';
      setError(message);
      showTenantActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const copySelectedId = async () => {
    if (!selected?.id) return;
    try {
      await navigator.clipboard.writeText(selected.id);
      showTenantActionSuccess('Execution request ID copied successfully.');
    } catch {
      showTenantActionError('Could not copy request ID. Copy it from the detail panel instead.');
    }
  };

  const clearFilters = () => {
    setStatus('');
    setRequestType('');
    setExecutionStatus('');
    setSearch('');
    setOffset(0);
  };

  const exportFilteredRequests = async () => {
    setSaving(true);
    setError(null);
    try {
      const baseParams = new URLSearchParams();
      if (status) baseParams.set('status', status);
      if (requestType) baseParams.set('request_type', requestType);
      if (executionStatus) baseParams.set('execution_status', executionStatus);
      if (search.trim()) baseParams.set('search', search.trim());

      const exported: ExecutionRequest[] = [];
      const batchSize = 100;
      const maximumRows = 5000;
      let exportOffset = 0;
      let total = 0;

      do {
        const params = new URLSearchParams(baseParams);
        params.set('limit', String(batchSize));
        params.set('offset', String(exportOffset));
        const response = await apiRequest<ExecutionRequestListResponse>(`/execution-requests?${params.toString()}`);
        total = Number(response.total || 0);
        exported.push(...response.rows);
        exportOffset += response.rows.length;
        if (!response.rows.length) break;
      } while (exported.length < total && exported.length < maximumRows);

      const rows: string[][] = exported.slice(0, maximumRows).map((request) => [
        request.id,
        label(request.status),
        label(request.request_type),
        String(request.payload?.product_name || request.payload?.product_id || ''),
        request.requested_by_name || request.requested_by || '',
        formatDateTime(request.created_at),
        formatDateTime(request.updated_at),
        request.execution_status ? label(request.execution_status) : 'Not executed',
        request.reviewed_by_name || request.reviewed_by || '',
        request.executed_by_name || request.executed_by || '',
        request.review_note || '',
        request.rejection_reason || '',
        request.cancel_reason || ''
      ]);

      downloadCsv('execution-requests.csv', [
        ['Request ID', 'Workflow status', 'Request type', 'Product', 'Requested by', 'Created', 'Updated', 'Execution outcome', 'Reviewed by', 'Executed by', 'Review note', 'Rejection reason', 'Cancellation reason'],
        ...rows
      ]);
      showTenantActionSuccess(`Exported ${rows.length} execution request${rows.length === 1 ? '' : 's'}.`);
      if (total > maximumRows) {
        setError(`The export is limited to the first ${maximumRows} matching requests.`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to export execution requests';
      setError(message);
      showTenantActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const selectedCreateProduct = options?.products.find((item) => item.id === createProductId) || null;
  const currentCreateValue = selectedCreateProduct
    ? createType === 'cost_standard_update'
      ? selectedCreateProduct.standard_unit_cost
      : selectedCreateProduct.min_stock
    : null;

  const requests = data?.rows || [];
  const hardeningTotals = hardeningSummary?.totals;
  const summaryCounts = {
    pending: Number(hardeningTotals?.draft_requests || 0) + Number(hardeningTotals?.pending_review_requests || 0),
    approvedWaiting: Number(hardeningTotals?.approved_waiting_execution || 0),
    executed: Number(hardeningTotals?.completed_executions || 0) + Number(hardeningTotals?.noop_executions || 0),
    failed: Number(hardeningTotals?.failed_executions || 0),
    systemContext: Number(hardeningTotals?.system_context_requests || 0)
  };
  const total = Number(data?.total || 0);
  const visibleStart = total === 0 ? 0 : offset + 1;
  const visibleEnd = Math.min(offset + requests.length, total);
  const canGoPrevious = offset > 0;
  const canGoNext = offset + requests.length < total;

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <h1 style={styles.title}>Controlled execution requests</h1>
          <p style={styles.subtitle}>
            Propose, review, approve, and execute tightly scoped product-field changes. Approval never changes a product by itself, and every real execution is permission-checked, audited, and protected from duplicate runs.
          </p>
        </div>
        <div style={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={loadRequests} disabled={loading || saving}>
            {loading ? 'Refreshing…' : 'Refresh page'}
          </button>
          {canCreateExecutionRequests && canViewSystemContext ? (
            <button type="button" className="btn btn-secondary" onClick={createSystemRecommendation} disabled={saving}>
              Create System Context review draft
            </button>
          ) : null}
        </div>
      </section>

      {error ? <div className="app-error" style={styles.error}>{error}</div> : null}
      {secondaryWarning ? <div style={styles.warning}>{secondaryWarning}</div> : null}

      <section style={styles.summaryPanel} aria-label="Execution request summary">
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Needs workflow action</span><strong>{summaryCounts.pending}</strong><span style={styles.meta}>Draft or awaiting review</span></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Approved waiting</span><strong>{summaryCounts.approvedWaiting}</strong><span style={styles.meta}>Eligible for execution or no-op</span></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Executed</span><strong>{summaryCounts.executed}</strong><span style={styles.meta}>Real and no-op completions</span></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>Execution failures</span><strong>{summaryCounts.failed}</strong><span style={styles.meta}>Stored for review</span></div>
        <div style={styles.summaryTile}><span style={styles.summaryLabel}>System Context requests</span><strong>{summaryCounts.systemContext}</strong><span style={styles.meta}>Captured recommendations</span></div>
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Create controlled product update</h2>
            <div style={styles.meta}>Creates a draft only. A separate user action must submit, review, approve, and execute it.</div>
          </div>
        </div>
        {canCreateExecutionRequests ? (
          <>
            <div style={styles.createGrid}>
              <label style={styles.field}>
                <span>Change type</span>
                <select value={createType} onChange={(event) => { setCreateType(event.target.value as ControlledRequestType); setCreateValue(''); setError(null); }} disabled={saving}>
                  <option value="cost_standard_update">Standard cost update</option>
                  <option value="product_min_stock_update">Minimum stock update</option>
                </select>
              </label>
              <label style={styles.field}>
                <span>Product</span>
                <select value={createProductId} onChange={(event) => { setCreateProductId(event.target.value); setError(null); }} disabled={saving || !options?.products.length}>
                  <option value="">{options?.products.length ? 'Select active product' : 'No active products available'}</option>
                  {(options?.products || []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}{product.category ? ` · ${product.category}` : ''}{product.unit ? ` · ${product.unit}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.field}>
                <span>{controlledValueLabels[createType]}</span>
                <input type="number" min="0" step="any" value={createValue} onChange={(event) => { setCreateValue(event.target.value); setError(null); }} placeholder="0" disabled={saving} />
              </label>
              <label style={styles.fieldWide}>
                <span>Business reason <span style={styles.optional}>(optional)</span></span>
                <input value={createReason} onChange={(event) => setCreateReason(event.target.value)} maxLength={1000} placeholder="Why this change is being proposed" disabled={saving} />
              </label>
            </div>
            <div style={styles.createFooter}>
              <div style={styles.currentValuePanel}>
                <strong>{selectedCreateProduct ? selectedCreateProduct.name : 'Select a product'}</strong>
                <span style={styles.meta}>
                  {selectedCreateProduct
                    ? `Current ${controlledValueLabels[createType].replace(/^New /, '').toLowerCase()}: ${formatUnknown(currentCreateValue)}${selectedCreateProduct.unit ? ` · Unit: ${selectedCreateProduct.unit}` : ''}`
                    : 'The current product value will be stored with the request so later execution can detect stale approvals.'}
                </span>
              </div>
              <button type="button" className="btn btn-primary" onClick={createControlledProductRequest} disabled={saving || !createProductId || createValue === ''}>
                {saving ? 'Working…' : 'Create draft request'}
              </button>
            </div>
          </>
        ) : (
          <div className="app-empty-state">You can review execution requests, but your role cannot create new drafts.</div>
        )}
      </section>

      <section style={styles.filters}>
        <label style={styles.field}>
          <span>Workflow status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setOffset(0); }}>
            <option value="">All workflow statuses</option>
            {statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
        </label>
        <label style={styles.field}>
          <span>Request type</span>
          <select value={requestType} onChange={(event) => { setRequestType(event.target.value as TypeFilter); setOffset(0); }}>
            <option value="">All request types</option>
            {requestTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
        </label>
        <label style={styles.field}>
          <span>Execution outcome</span>
          <select value={executionStatus} onChange={(event) => { setExecutionStatus(event.target.value as ExecutionStatusFilter); setOffset(0); }}>
            <option value="">All execution outcomes</option>
            {executionStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
        </label>
        <label style={styles.fieldWide}>
          <span>Search</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Request ID, product, person, type, status, or stored reason" />
        </label>
        <div style={styles.filterActions}>
          <button type="button" className="btn btn-secondary" onClick={clearFilters} disabled={saving || (!status && !requestType && !executionStatus && !search)}>Clear filters</button>
          <button type="button" className="btn btn-secondary" onClick={exportFilteredRequests} disabled={saving || loading}>Export filtered CSV</button>
        </div>
      </section>

      <div style={styles.layout} ref={registrySectionRef}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Request registry</h2>
              <span style={styles.meta}>{loading ? 'Loading…' : `${visibleStart}–${visibleEnd} of ${total}`}</span>
            </div>
            <label style={styles.compactField}>
              <span>Rows</span>
              <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setOffset(0); }}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Request</th>
                  <th>Type</th>
                  <th>Product / subject</th>
                  <th>Requested by</th>
                  <th>Created</th>
                  <th>Execution</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} style={selected?.id === request.id ? styles.selectedRow : undefined}>
                    <td><span style={{ ...styles.badge, ...statusTone(request.status) }}>{label(request.status)}</span></td>
                    <td><code style={styles.requestId} title={request.id}>{request.id.slice(0, 8)}…</code></td>
                    <td>{request.adapter?.label || label(request.request_type)}</td>
                    <td>{request.request_type === 'system_recommendation' ? 'System Context recommendation' : getRequestProductLabel(request)}</td>
                    <td>{request.requested_by_name || request.requested_by || 'System/support'}</td>
                    <td>{formatDateTime(request.created_at)}</td>
                    <td>{request.execution_status ? <span style={{ ...styles.badge, ...executionTone(request.execution_status) }}>{label(request.execution_status)}</span> : <span style={styles.meta}>Not executed</span>}</td>
                    <td>
                      <div style={styles.rowActions}>
                        <button type="button" className="btn btn-secondary" disabled={saving} data-skip-global-action-feedback="true" onClick={() => loadRequestDetail(request)}>Open</button>
                        {canSubmitExecutionRequests && request.status === 'draft' ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => submitRequest(request)}>Submit</button> : null}
                        {canReviewExecutionRequests && request.status === 'pending_review' ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => approveRequest(request)}>Approve</button> : null}
                        {canReviewExecutionRequests && request.status === 'pending_review' ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => rejectRequest(request)}>Reject</button> : null}
                        {canExecuteExecutionRequests && canWriteProducts && request.status === 'approved' && !request.execution_status && request.adapter?.execution_enabled ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => executeRequest(request)}>Execute</button> : null}
                        {canExecuteExecutionRequests && request.status === 'approved' && !request.execution_status && !request.adapter?.execution_enabled ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => executeNoopRequest(request)}>No-op</button> : null}
                        {canExecuteExecutionRequests && request.status === 'approved' && request.execution_review?.retry_eligibility?.eligible ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => prepareRetryRequest(request)}>Prepare retry</button> : null}
                        {canCancelExecutionRequests && (request.status === 'draft' || request.status === 'pending_review') ? <button type="button" className="btn btn-danger" disabled={saving} onClick={() => cancelRequest(request)}>Cancel</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !requests.length ? (
                  <tr><td colSpan={8} style={styles.empty}>No execution requests match the selected filters.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div style={styles.pagination}>
            <button type="button" className="btn btn-secondary" disabled={loading || saving || !canGoPrevious} onClick={() => setOffset(Math.max(0, offset - limit))}>Previous</button>
            <span style={styles.meta}>{visibleStart}–{visibleEnd} of {total}</span>
            <button type="button" className="btn btn-secondary" disabled={loading || saving || !canGoNext} onClick={() => setOffset(offset + limit)}>Next</button>
          </div>
          {data?.notes?.map((note) => <div key={note} style={styles.note}>{note}</div>)}
        </section>

        <section style={styles.detailCard}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Selected request</h2>
              <span style={styles.meta}>{selected ? selected.id : 'Open a request from the registry'}</span>
            </div>
            {selected ? (
              <button type="button" className="btn btn-secondary" data-skip-global-action-feedback="true" onClick={copySelectedId}>Copy ID</button>
            ) : null}
          </div>
          {selected ? (
            <div style={styles.detail}>
              <div style={styles.badgeRow}>
                <span style={{ ...styles.badge, ...statusTone(selected.status) }}>{label(selected.status)}</span>
                <span style={{ ...styles.badge, ...executionTone(selected.execution_status) }}>{selected.execution_status ? label(selected.execution_status) : 'Not executed'}</span>
                {isSystemContextRequest(selected) ? <span style={styles.badge}>System Context</span> : null}
                <span style={styles.badge}>{selected.adapter?.execution_enabled ? 'Controlled real executor' : 'No-op only'}</span>
              </div>

              <div style={styles.detailActions}>
                {canSubmitExecutionRequests && selected.status === 'draft' ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => submitRequest(selected)}>Submit for review</button> : null}
                {canReviewExecutionRequests && selected.status === 'pending_review' ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => approveRequest(selected)}>Approve</button> : null}
                {canReviewExecutionRequests && selected.status === 'pending_review' ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => rejectRequest(selected)}>Reject</button> : null}
                {canExecuteExecutionRequests && canWriteProducts && selected.status === 'approved' && !selected.execution_status && selected.adapter?.execution_enabled ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => executeRequest(selected)}>Execute approved change</button> : null}
                {canExecuteExecutionRequests && selected.status === 'approved' && !selected.execution_status && !selected.adapter?.execution_enabled ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => executeNoopRequest(selected)}>Run no-op executor</button> : null}
                {canExecuteExecutionRequests && !canWriteProducts && selected.status === 'approved' && !selected.execution_status && selected.adapter?.execution_enabled ? <span style={styles.meta}>Real execution also requires product-edit permission.</span> : null}
                {canExecuteExecutionRequests && selected.status === 'approved' && selected.execution_review?.retry_eligibility?.eligible ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => prepareRetryRequest(selected)}>Prepare retry</button> : null}
                {canCancelExecutionRequests && (selected.status === 'draft' || selected.status === 'pending_review') ? <button type="button" className="btn btn-danger" disabled={saving} onClick={() => cancelRequest(selected)}>Cancel request</button> : null}
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => loadRequestDetail(selected)}>Refresh detail</button>
              </div>

              <div style={styles.summaryGrid}>
                <div style={styles.summaryTile}><span style={styles.summaryLabel}>Type</span><strong>{selected.adapter?.label || label(selected.request_type)}</strong></div>
                <div style={styles.summaryTile}><span style={styles.summaryLabel}>Product / subject</span><strong>{selected.request_type === 'system_recommendation' ? 'System Context recommendation' : getRequestProductLabel(selected)}</strong></div>
                <div style={styles.summaryTile}><span style={styles.summaryLabel}>Requested change</span><strong>{formatUnknown(getRequestedValue(selected))}</strong></div>
                <div style={styles.summaryTile}><span style={styles.summaryLabel}>Value at request time</span><strong>{formatUnknown(getExpectedValue(selected))}</strong></div>
              </div>

              <KeyValue label="Requested by" value={selected.requested_by_name || selected.requested_by || 'System/support'} />
              <KeyValue label="Created" value={formatDateTime(selected.created_at)} />
              <KeyValue label="Updated" value={formatDateTime(selected.updated_at)} />
              <KeyValue label="Business reason" value={String(selected.payload?.reason || selected.payload?.note || '-')} />
              <KeyValue label="Reviewed by" value={selected.reviewed_by_name || selected.reviewed_by || '-'} />
              <KeyValue label="Reviewed at" value={formatDateTime(selected.reviewed_at)} />
              <KeyValue label="Review note" value={selected.review_note || '-'} />
              <KeyValue label="Rejection reason" value={selected.rejection_reason || '-'} />
              <KeyValue label="Cancellation reason" value={selected.cancel_reason || '-'} />
              <KeyValue label="Executed by" value={selected.executed_by_name || selected.executed_by || '-'} />
              <KeyValue label="Executed at" value={formatDateTime(selected.executed_at)} />

              {selected.timeline?.length ? (
                <details style={styles.detailsPanel}>
                  <summary style={styles.detailsSummary}>Workflow timeline</summary>
                  <div style={styles.auditTrail}>
                    {selected.timeline.map((event, index) => (
                      <div key={`${event.status}-${event.at || index}`} style={styles.auditEvent}>
                        <strong>{event.label}</strong>
                        <div style={styles.meta}>{event.at ? formatDateTime(event.at) : 'Exact time available in the Audit pack'} · {event.by || 'Unknown actor'}</div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              <details style={styles.detailsPanel}>
                <summary style={styles.detailsSummary}>Security and separation-of-duties review</summary>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => loadSecurityAudit(selected)}>Load security audit</button>
                <ExecutionSecurityAuditPanel securityAudit={securityAudit} />
              </details>

              <details style={styles.detailsPanel}>
                <summary style={styles.detailsSummary}>Audit pack</summary>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => loadAuditPack(selected)}>Load audit pack</button>
                <ExecutionAuditPackPanel auditPack={auditPack} />
              </details>

              <details style={styles.detailsPanel}>
                <summary style={styles.detailsSummary}>Execution result and before/after evidence</summary>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => loadExecutionReview(selected)}>Load execution review</button>
                <ExecutionReviewPanel request={selected} executionReview={executionReview} />
              </details>

              <details style={styles.detailsPanel}>
                <summary style={styles.detailsSummary}>Advanced stored snapshots</summary>
                <div style={styles.meta}>Technical evidence retained exactly as stored. Normal workflow decisions should use the business fields above.</div>
                <h3 style={styles.subheading}>Payload snapshot</h3>
                <JsonBlock value={selected.payload} />
                <h3 style={styles.subheading}>Gate snapshot</h3>
                <JsonBlock value={selected.gate_snapshot} />
                <h3 style={styles.subheading}>Context snapshot</h3>
                <JsonBlock value={selected.context_snapshot} />
                <h3 style={styles.subheading}>Execution result snapshot</h3>
                <JsonBlock value={selected.execution_result} />
              </details>
            </div>
          ) : (
            <div className="app-empty-state">Open an execution request to review its proposed change, workflow state, approvals, execution evidence, and audit controls.</div>
          )}
        </section>
      </div>

      <details style={styles.governanceDetails}>
        <summary style={styles.governanceSummary}>
          <span>
            <strong>Execution controls and governance</strong>
            <span style={styles.meta}>Adapter availability, hardening checks, retry controls, and safety contract</span>
          </span>
          <span style={{ ...styles.badge, ...statusTone(hardeningSummary?.module_status === 'needs_fix' ? 'rejected' : hardeningSummary?.module_status === 'complete' ? 'approved' : 'pending_review') }}>
            {hardeningSummary ? label(hardeningSummary.module_status) : 'Loading'}
          </span>
        </summary>
        <div style={styles.governanceBody}>
          <ExecutionModuleHardeningPanel hardeningSummary={hardeningSummary} />
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Execution adapter registry</h2>
              <span style={styles.meta}>{adapterRegistry ? `${adapterRegistry.summary.execution_enabled_count} enabled / ${adapterRegistry.summary.total_adapters} total` : 'Loading…'}</span>
            </div>
            <p style={styles.note}>Only standard cost and minimum stock updates currently perform controlled real product changes. Pricing requests remain review/no-op-only because the product schema has no governed unit-price field.</p>
            <div style={styles.adapterGrid}>
              {(adapterRegistry?.adapters || []).map((adapter) => (
                <div key={adapter.request_type} style={styles.adapterCard}>
                  <div style={styles.adapterTopline}>
                    <strong>{adapter.label}</strong>
                    <span style={{ ...styles.badge, ...riskTone(adapter.risk_level) }}>{label(adapter.risk_level)}</span>
                  </div>
                  <div style={styles.meta}>{label(adapter.category)}</div>
                  <p style={styles.adapterDescription}>{adapter.description}</p>
                  <KeyValue label="Real execution" value={adapter.execution_enabled ? 'Enabled' : 'Disabled'} />
                  <KeyValue label="No-op path" value="Available after approval" />
                </div>
              ))}
            </div>
            {adapterRegistry?.notes?.map((note) => <div key={note} style={styles.note}>{note}</div>)}
          </section>
        </div>
      </details>
    </div>
  );
}

function formatUnknown(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function ExecutionModuleHardeningPanel({ hardeningSummary }: { hardeningSummary: ExecutionModuleHardeningSummaryResponse | null }) {
  if (!hardeningSummary) {
    return (
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Execution Module Hardening</h2>
          <span style={styles.meta}>Loading…</span>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Execution Module Hardening</h2>
        <span style={{ ...styles.badge, ...statusTone(hardeningSummary.module_status === 'complete' ? 'approved' : hardeningSummary.module_status === 'needs_fix' ? 'rejected' : 'pending_review') }}>
          {label(hardeningSummary.module_status)}
        </span>
      </div>
      <p style={styles.note}>{hardeningSummary.closeout_recommendation}</p>
      <div style={styles.metricsGrid}>
        <KeyValue label="Total Requests" value={formatUnknown(hardeningSummary.totals.total_requests)} />
        <KeyValue label="Approved Waiting" value={formatUnknown(hardeningSummary.totals.approved_waiting_execution)} />
        <KeyValue label="Real Execution Ready" value={formatUnknown(hardeningSummary.totals.real_execution_ready)} />
        <KeyValue label="Completed Executions" value={formatUnknown(hardeningSummary.totals.completed_executions)} />
        <KeyValue label="Failed Executions" value={formatUnknown(hardeningSummary.totals.failed_executions)} />
        <KeyValue label="No-op Executions" value={formatUnknown(hardeningSummary.totals.noop_executions)} />
      </div>
      <h3 style={styles.subheading}>Closeout Checks</h3>
      <div style={styles.checkList}>
        {hardeningSummary.checks.map((check) => (
          <div key={check.key} style={styles.checkItem}>
            <span style={{ ...styles.badge, ...statusTone(check.status === 'pass' ? 'approved' : check.status === 'fail' ? 'rejected' : 'pending_review') }}>{label(check.status)}</span>
            <div>
              <strong>{check.label}</strong>
              <div style={styles.meta}>{check.detail}</div>
            </div>
          </div>
        ))}
      </div>
      <h3 style={styles.subheading}>Safety Contract</h3>
      <div style={styles.metricsGrid}>
        <KeyValue label="Approval Required" value={hardeningSummary.safety_contract.approval_required ? 'Yes' : 'No'} />
        <KeyValue label="Duplicate Blocked" value={hardeningSummary.safety_contract.duplicate_execution_blocked ? 'Yes' : 'No'} />
        <KeyValue label="Retry Explicit" value={hardeningSummary.safety_contract.retry_requires_explicit_preparation ? 'Yes' : 'No'} />
        <KeyValue label="Inventory Mutations" value={hardeningSummary.safety_contract.mutates_inventory ? 'Yes' : 'No'} />
        <KeyValue label="Shipment Mutations" value={hardeningSummary.safety_contract.mutates_shipments ? 'Yes' : 'No'} />
        <KeyValue label="Background Jobs" value={hardeningSummary.safety_contract.creates_background_jobs ? 'Yes' : 'No'} />
      </div>
      {hardeningSummary.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
    </section>
  );
}

function ExecutionSecurityAuditPanel({ securityAudit }: { securityAudit: ExecutionRequestSecurityAuditResponse | null }) {
  if (!securityAudit) {
    return <div className="app-empty-state">Load the security audit to review permissions, support context, and separation-of-duties posture.</div>;
  }

  return (
    <div style={styles.securityPanel}>
      <div style={styles.reviewHeader}>
        <div>
          <strong>Execution Security Audit</strong>
          <div style={styles.meta}>Generated {formatDateTime(securityAudit.generated_at)}</div>
        </div>
        <span style={{ ...styles.badge, ...securityTone(securityAudit.summary.security_posture) }}>
          {label(securityAudit.summary.security_posture)}
        </span>
      </div>
      <KeyValue label="Actor Role" value={securityAudit.actor.role || '-'} />
      <KeyValue label="Support Session" value={securityAudit.actor.support_session_id ? 'Yes' : 'No'} />
      <KeyValue label="Can Execute" value={securityAudit.permission_matrix.can_execute ? 'Yes' : 'No'} />
      <KeyValue label="Can Update Products" value={securityAudit.permission_matrix.can_update_products ? 'Yes' : 'No'} />
      <KeyValue label="Has Required Execution Permissions" value={securityAudit.permission_matrix.current_actor_has_required_execution_permissions ? 'Yes' : 'No'} />
      <KeyValue label="Requester / Reviewer Same" value={securityAudit.separation_of_duties.requester_reviewer_same ? 'Yes' : 'No'} />
      <KeyValue label="Reviewer / Executor Same" value={securityAudit.separation_of_duties.reviewer_executor_same ? 'Yes' : 'No'} />
      <KeyValue label="Recommended For Real Execution" value={securityAudit.separation_of_duties.recommended_for_real_execution ? 'Yes' : 'Review recommended'} />
      <h3 style={styles.subheading}>Checks</h3>
      <div style={styles.auditTrail}>
        {securityAudit.checks.map((check) => (
          <div key={check.key} style={check.passed ? styles.securityCheck : styles.securityWarning}>
            <strong>{label(check.key)}</strong>
            <div style={styles.meta}>{label(check.severity)} · {check.passed ? 'Passed' : 'Review'}</div>
            <div style={styles.meta}>{check.message}</div>
          </div>
        ))}
      </div>
      {securityAudit.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      <h3 style={styles.subheading}>Full Security Audit JSON</h3>
      <JsonBlock value={securityAudit} />
    </div>
  );
}

function ExecutionAuditPackPanel({ auditPack }: { auditPack: ExecutionRequestAuditPackResponse | null }) {
  if (!auditPack) {
    return <div className="app-empty-state">Load the audit pack to review consolidated evidence for this request.</div>;
  }

  return (
    <div style={styles.auditPanel}>
      <div style={styles.reviewHeader}>
        <div>
          <strong>Execution Audit Pack</strong>
          <div style={styles.meta}>Generated {formatDateTime(auditPack.generated_at)}</div>
        </div>
        <span style={{ ...styles.badge, ...(auditPack.completeness.safe_for_governance_review ? styles.successTone : styles.pendingTone) }}>
          {auditPack.completeness.safe_for_governance_review ? 'Audit ready' : 'Review gaps'}
        </span>
      </div>
      <KeyValue label="Audit Events" value={formatUnknown(auditPack.completeness.audit_event_count)} />
      <KeyValue label="Complete" value={auditPack.completeness.complete ? 'Yes' : 'No'} />
      <KeyValue label="Payload Snapshot" value={auditPack.completeness.has_payload_snapshot ? 'Yes' : 'No'} />
      <KeyValue label="Gate Snapshot" value={auditPack.completeness.has_gate_snapshot ? 'Yes' : 'No'} />
      <KeyValue label="Context Snapshot" value={auditPack.completeness.has_context_snapshot ? 'Yes' : 'No'} />
      <KeyValue label="Execution Result" value={auditPack.completeness.has_execution_result ? 'Yes' : 'No'} />
      {auditPack.completeness.missing_actions.length ? (
        <div style={styles.failurePanel}>
          <strong>Missing Audit Actions</strong>
          {auditPack.completeness.missing_actions.map((action) => <div key={action} style={styles.meta}>{action}</div>)}
        </div>
      ) : null}
      <h3 style={styles.subheading}>Audit Trail</h3>
      <div style={styles.auditTrail}>
        {auditPack.audit_trail.map((event) => (
          <div key={event.id} style={styles.auditEvent}>
            <strong>{label(event.action)}</strong>
            <div style={styles.meta}>{formatDateTime(event.created_at)} · {event.user_name || event.user_id || 'system/support'}</div>
          </div>
        ))}
        {!auditPack.audit_trail.length ? <div style={styles.meta}>No audit events found for this request.</div> : null}
      </div>
      {auditPack.notes.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      <h3 style={styles.subheading}>Full Audit Pack JSON</h3>
      <JsonBlock value={auditPack} />
    </div>
  );
}

function ExecutionReviewPanel({ request, executionReview }: { request: ExecutionRequest; executionReview: ExecutionRequestExecutionReviewResponse | null }) {
  const review = executionReview?.request_id === request.id ? executionReview.execution_review : request.execution_review;

  if (!review) {
    return <div className="app-empty-state">Execution review evidence is not available for this request.</div>;
  }

  return (
    <div style={styles.reviewPanel}>
      <div style={styles.reviewHeader}>
        <div>
          <strong>Execution Review</strong>
          <div style={styles.meta}>{executionReview?.request_id === request.id ? 'Loaded from /execution-requests/:id/execution-review.' : 'Embedded execution review evidence from request detail/list.'}</div>
        </div>
        <span style={{ ...styles.badge, ...(review.available ? styles.successTone : styles.pendingTone) }}>
          {review.available ? 'Available' : 'Not executed'}
        </span>
      </div>
      <KeyValue label="Executor" value={review.executor ? label(review.executor) : '-'} />
      <KeyValue label="Outcome" value={review.outcome ? label(review.outcome) : '-'} />
      <KeyValue label="Real Action" value={review.executed_real_action ? 'Yes' : 'No'} />
      <KeyValue label="Executed At" value={formatDateTime(review.executed_at)} />
      <KeyValue label="Executed By" value={review.executed_by_name || review.executed_by || '-'} />
      <KeyValue label="Retry Eligible" value={review.retry_eligibility?.eligible ? 'Yes' : 'No'} />
      <KeyValue label="Retry Reason" value={review.retry_eligibility?.reason || '-'} />
      <KeyValue label="Retry Count" value={formatUnknown(review.retry_eligibility?.retry_count)} />
      <KeyValue label="Max Retries" value={formatUnknown(review.retry_eligibility?.max_retry_count)} />
      <KeyValue label="Retry Prepared At" value={formatDateTime(review.retry_eligibility?.prepared_at)} />

      {review.failure ? (
        <div style={styles.failurePanel}>
          <strong>Failure Details</strong>
          <KeyValue label="Error Code" value={review.failure.error_code || '-'} />
          <KeyValue label="Error Message" value={review.failure.error_message || '-'} />
          <KeyValue label="Failed At" value={formatDateTime(review.failure.failed_at)} />
          <KeyValue label="Rollback Applied" value={review.failure.rollback_applied ? 'Yes' : 'No'} />
          <KeyValue label="Duplicate Execution Blocked" value={review.failure.retry_eligibility?.duplicate_execution_blocked ? 'Yes' : 'No'} />
        </div>
      ) : null}

      {review.before_after ? (
        <BeforeAfterEvidence beforeAfter={review.before_after} />
      ) : null}

      {review.review_notes?.map((note) => <div key={note} style={styles.note}>{note}</div>)}
    </div>
  );
}

function BeforeAfterEvidence({ beforeAfter }: { beforeAfter: NonNullable<ExecutionRequestExecutionReview['before_after']> }) {
  const before = beforeAfter.before || {};
  const after = beforeAfter.after || {};
  const fieldKeys = getBeforeAfterFieldKeys(before, after);

  return (
    <div style={styles.reviewPanel}>
      <div style={styles.reviewHeader}>
        <div>
          <strong>Before / After Evidence</strong>
          <div style={styles.meta}>{beforeAfter.product_name || beforeAfter.product_id || 'Product-field execution snapshot'}</div>
        </div>
        <span style={{ ...styles.badge, ...(beforeAfter.changed ? styles.successTone : styles.pendingTone) }}>
          {beforeAfter.changed ? 'Changed' : 'No field change'}
        </span>
      </div>
      <div style={styles.beforeAfterGrid}>
        <div style={styles.snapshotCard}>
          <strong>Before</strong>
          {fieldKeys.map((key) => (
            <KeyValue key={key} label={labelBeforeAfterField(key)} value={formatBeforeAfterValue(key, before[key])} />
          ))}
          {!fieldKeys.length ? <div style={styles.meta}>No before-state fields were returned.</div> : null}
        </div>
        <div style={styles.snapshotCard}>
          <strong>After</strong>
          {fieldKeys.map((key) => (
            <KeyValue key={key} label={labelBeforeAfterField(key)} value={formatBeforeAfterValue(key, after[key])} />
          ))}
          {!fieldKeys.length ? <div style={styles.meta}>No after-state fields were returned.</div> : null}
        </div>
      </div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.kv}>
      <span style={styles.kvLabel}>{label}</span>
      <span style={styles.kvValue}>{value}</span>
    </div>
  );
}

function riskTone(riskLevel: string) {
  if (riskLevel === 'high') return { background: '#fee2e2', color: '#991b1b' };
  if (riskLevel === 'medium') return { background: '#fef3c7', color: '#92400e' };
  return { background: '#dcfce7', color: '#166534' };
}

function securityTone(posture: string) {
  if (posture === 'blocked') return { background: '#fee2e2', color: '#991b1b' };
  if (posture === 'review_recommended') return { background: '#fef3c7', color: '#92400e' };
  return { background: '#dcfce7', color: '#166534' };
}

function statusTone(status: ExecutionRequest['status']) {
  if (status === 'approved') return { background: '#dcfce7', color: '#166534' };
  if (status === 'rejected' || status === 'cancelled') return { background: '#fee2e2', color: '#991b1b' };
  if (status === 'pending_review') return { background: '#fef3c7', color: '#92400e' };
  return { background: '#e0f2fe', color: '#075985' };
}

function executionTone(status?: string | null) {
  if (status === 'completed') return { background: '#dcfce7', color: '#166534' };
  if (status === 'failed') return { background: '#fee2e2', color: '#991b1b' };
  if (status === 'noop_completed') return { background: '#ede9fe', color: '#5b21b6' };
  return { background: '#e2e8f0', color: '#334155' };
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '1.75rem' },
  subtitle: { margin: '0.35rem 0 0', color: '#64748b', maxWidth: '760px' },
  error: { marginBottom: 0 },
  warning: { padding: '0.75rem 0.9rem', border: '1px solid #facc15', borderRadius: '12px', background: '#fefce8', color: '#854d0e' },
  actions: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' },
  summaryPanel: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' },
  summaryTile: { display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 },
  summaryLabel: { color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  badgeRow: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' },
  badge: { display: 'inline-flex', borderRadius: '999px', padding: '0.2rem 0.55rem', fontWeight: 700, textTransform: 'capitalize', fontSize: '0.75rem', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' },
  filters: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem', color: '#475569', fontSize: '0.85rem' },
  fieldWide: { display: 'flex', flexDirection: 'column', gap: '0.35rem', color: '#475569', fontSize: '0.85rem' },
  optional: { color: '#94a3b8', fontWeight: 400 },
  createGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' },
  createFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginTop: '0.85rem' },
  currentValuePanel: { display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 'min(100%, 320px)', flex: '1 1 360px', padding: '0.75rem', border: '1px solid #dbeafe', borderRadius: '12px', background: '#eff6ff' },
  filterActions: { display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' },
  compactField: { display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748b', fontSize: '0.8rem' },
  adapterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' },
  adapterCard: { border: '1px solid #e2e8f0', borderRadius: '14px', padding: '0.85rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.45rem' },
  adapterTopline: { display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' },
  adapterDescription: { margin: 0, color: '#475569', fontSize: '0.85rem', lineHeight: 1.45 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem', marginTop: '0.75rem' },
  checkList: { display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.5rem' },
  checkItem: { display: 'flex', gap: '0.65rem', alignItems: 'flex-start', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.65rem', background: '#f8fafc' },
  layout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1rem', alignItems: 'start' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1rem', minWidth: 0 },
  detailCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '1rem',
    minWidth: 0,
    alignSelf: 'start'
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' },
  cardTitle: { margin: 0, fontSize: '1.1rem' },
  meta: { color: '#64748b', fontSize: '0.85rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  selectedRow: { background: '#eff6ff' },
  rowActions: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap', minWidth: '180px' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '0.85rem', flexWrap: 'wrap' },
  requestId: { fontSize: '0.78rem', color: '#334155', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', padding: '1rem', color: '#64748b' },
  note: { marginTop: '0.75rem', color: '#64748b', fontSize: '0.85rem' },
  detail: { display: 'flex', flexDirection: 'column', gap: '0.7rem' },
  detailActions: { display: 'flex', gap: '0.45rem', flexWrap: 'wrap', paddingBottom: '0.25rem' },
  detailsPanel: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem', background: '#f8fafc' },
  detailsSummary: { cursor: 'pointer', fontWeight: 700, color: '#0f172a', marginBottom: '0.65rem' },
  reviewPanel: { display: 'flex', flexDirection: 'column', gap: '0.65rem', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '0.85rem', background: '#f8fafc' },
  auditPanel: { display: 'flex', flexDirection: 'column', gap: '0.65rem', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '0.85rem', background: '#eff6ff' },
  securityPanel: { display: 'flex', flexDirection: 'column', gap: '0.65rem', border: '1px solid #fed7aa', borderRadius: '14px', padding: '0.85rem', background: '#fff7ed' },
  securityCheck: { border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.6rem', background: '#f0fdf4' },
  securityWarning: { border: '1px solid #fed7aa', borderRadius: '10px', padding: '0.6rem', background: '#fffbeb' },
  auditTrail: { display: 'flex', flexDirection: 'column', gap: '0.45rem' },
  auditEvent: { border: '1px solid #dbeafe', borderRadius: '10px', padding: '0.6rem', background: '#fff' },
  failurePanel: { display: 'flex', flexDirection: 'column', gap: '0.45rem', border: '1px solid #fecaca', borderRadius: '12px', padding: '0.75rem', background: '#fef2f2' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' },
  beforeAfterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' },
  snapshotCard: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem', background: '#fff', display: 'flex', flexDirection: 'column', gap: '0.45rem' },
  kv: { display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.45rem' },
  kvLabel: { color: '#64748b' },
  kvValue: { fontWeight: 700, color: '#0f172a', textAlign: 'right' },
  subheading: { margin: '0.65rem 0 0', fontSize: '0.95rem' },
  json: { maxHeight: '260px', overflow: 'auto', background: '#0f172a', color: '#e2e8f0', padding: '0.75rem', borderRadius: '12px', fontSize: '0.75rem' },
  governanceDetails: { border: '1px solid #cbd5e1', borderRadius: '16px', background: '#fff', overflow: 'hidden' },
  governanceSummary: { cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc' },
  governanceBody: { display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' },
  successTone: { background: '#dcfce7', color: '#166534' },
  pendingTone: { background: '#fef3c7', color: '#92400e' }
};