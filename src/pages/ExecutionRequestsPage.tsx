import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { apiRequest, ApiError } from '../lib/api';
import type { ExecutionAdapterRegistryResponse, ExecutionModuleHardeningSummaryResponse, ExecutionRequest, ExecutionRequestAuditPackResponse, ExecutionRequestListResponse, ExecutionRequestSecurityAuditResponse } from '../types/inventory';

type StatusFilter = '' | ExecutionRequest['status'];
type TypeFilter = '' | ExecutionRequest['request_type'];

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

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function label(value?: string | null): string {
  return value ? value.replace(/_/g, ' ') : '-';
}

function getRecommendationCodes(request: ExecutionRequest): string[] {
  return Array.isArray(request.payload?.recommendation_codes)
    ? request.payload.recommendation_codes.map(String)
    : [];
}

function getRecommendationGroupCodes(request: ExecutionRequest): string[] {
  return Array.isArray(request.payload?.recommendation_group_codes)
    ? request.payload.recommendation_group_codes.map(String)
    : [];
}

function isSystemContextRequest(request: ExecutionRequest): boolean {
  return request.request_type === 'system_recommendation' && request.payload?.source === 'system_context_page';
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre style={styles.json}>{JSON.stringify(value ?? null, null, 2)}</pre>;
}

export default function ExecutionRequestsPage() {
  const [data, setData] = useState<ExecutionRequestListResponse | null>(null);
  const [adapterRegistry, setAdapterRegistry] = useState<ExecutionAdapterRegistryResponse | null>(null);
  const [hardeningSummary, setHardeningSummary] = useState<ExecutionModuleHardeningSummaryResponse | null>(null);
  const [selected, setSelected] = useState<ExecutionRequest | null>(null);
  const [auditPack, setAuditPack] = useState<ExecutionRequestAuditPackResponse | null>(null);
  const [securityAudit, setSecurityAudit] = useState<ExecutionRequestSecurityAuditResponse | null>(null);
  const [status, setStatus] = useState<StatusFilter>('');
  const [requestType, setRequestType] = useState<TypeFilter>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (requestType) params.set('request_type', requestType);
    if (search.trim()) params.set('search', search.trim());
    params.set('limit', '50');
    return params.toString();
  }, [status, requestType, search]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [response, adapters, hardening] = await Promise.all([
        apiRequest<ExecutionRequestListResponse>(`/execution-requests?${query}`),
        apiRequest<ExecutionAdapterRegistryResponse>('/execution-requests/adapters'),
        apiRequest<ExecutionModuleHardeningSummaryResponse>('/execution-requests/hardening-summary')
      ]);
      setData(response);
      setAdapterRegistry(adapters);
      setHardeningSummary(hardening);
      if (selected) {
        const nextSelected = response.rows.find((row) => row.id === selected.id) || null;
        setSelected(nextSelected);
        if (!nextSelected || auditPack?.request_id !== nextSelected.id) setAuditPack(null);
        if (!nextSelected || securityAudit?.request_id !== nextSelected.id) setSecurityAudit(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load execution requests');
    } finally {
      setLoading(false);
    }
  }, [query, selected, auditPack?.request_id, securityAudit?.request_id]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const createSystemRecommendation = async () => {
    setSaving(true);
    setError(null);
    try {
      const [contextSnapshot, gateSnapshot] = await Promise.all([
        apiRequest('/system-context'),
        apiRequest('/system-context/execution-gate')
      ]);

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
      await loadRequests();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create execution request');
    } finally {
      setSaving(false);
    }
  };


  const createStandardCostUpdate = async () => {
    const productId = window.prompt('Product ID to update');
    if (!productId || !productId.trim()) return;

    const rawCost = window.prompt('New standard unit cost');
    if (rawCost === null) return;

    const parsedCost = Number(rawCost);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setError('New standard unit cost must be a non-negative number');
      return;
    }

    const reason = window.prompt('Reason for this standard cost update (optional)') || '';

    setSaving(true);
    setError(null);
    try {
      const [contextSnapshot, gateSnapshot] = await Promise.all([
        apiRequest('/system-context'),
        apiRequest('/system-context/execution-gate')
      ]);

      const created = await apiRequest<ExecutionRequest>('/execution-requests', {
        method: 'POST',
        body: JSON.stringify({
          request_type: 'cost_standard_update',
          payload: {
            product_id: productId.trim(),
            standard_unit_cost: parsedCost,
            reason: reason.trim() || null,
            source: 'execution_requests_page'
          },
          gate_snapshot: gateSnapshot,
          context_snapshot: contextSnapshot
        })
      });

      setSelected(created);
      await loadRequests();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create standard cost update request');
    } finally {
      setSaving(false);
    }
  };


  const createProductMinStockUpdate = async () => {
    const productId = window.prompt('Product ID to update');
    if (!productId || !productId.trim()) return;

    const rawMinStock = window.prompt('New minimum stock threshold');
    if (rawMinStock === null) return;

    const parsedMinStock = Number(rawMinStock);
    if (!Number.isFinite(parsedMinStock) || parsedMinStock < 0) {
      setError('New minimum stock threshold must be a non-negative number');
      return;
    }

    const reason = window.prompt('Reason for this min stock update (optional)') || '';

    setSaving(true);
    setError(null);
    try {
      const [contextSnapshot, gateSnapshot] = await Promise.all([
        apiRequest('/system-context'),
        apiRequest('/system-context/execution-gate')
      ]);

      const created = await apiRequest<ExecutionRequest>('/execution-requests', {
        method: 'POST',
        body: JSON.stringify({
          request_type: 'product_min_stock_update',
          payload: {
            product_id: productId.trim(),
            min_stock: parsedMinStock,
            reason: reason.trim() || null,
            source: 'execution_requests_page'
          },
          gate_snapshot: gateSnapshot,
          context_snapshot: contextSnapshot
        })
      });

      setSelected(created);
      await loadRequests();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create min stock update request');
    } finally {
      setSaving(false);
    }
  };


const createProductPricingUpdate = async () => {
  const productId = window.prompt('Product ID to update');
  if (!productId || !productId.trim()) return;

  const rawUnitPrice = window.prompt('New unit price');
  if (rawUnitPrice === null) return;

  const parsedUnitPrice = Number(rawUnitPrice);
  if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
    setError('New unit price must be a non-negative number');
    return;
  }

  const reason = window.prompt('Reason for this pricing update (optional)') || '';

  setSaving(true);
  setError(null);
  try {
    const [contextSnapshot, gateSnapshot] = await Promise.all([
      apiRequest('/system-context'),
      apiRequest('/system-context/execution-gate')
    ]);

    const created = await apiRequest<ExecutionRequest>('/execution-requests', {
      method: 'POST',
      body: JSON.stringify({
        request_type: 'product_pricing_update',
        payload: {
          product_id: productId.trim(),
          unit_price: parsedUnitPrice,
          reason: reason.trim() || null,
          source: 'execution_requests_page'
        },
        gate_snapshot: gateSnapshot,
        context_snapshot: contextSnapshot
      })
    });

    setSelected(created);
    await loadRequests();
  } catch (err) {
    setError(err instanceof ApiError ? err.message : 'Failed to create pricing update request');
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit execution request');
    } finally {
      setSaving(false);
    }
  };

  const approveRequest = async (request: ExecutionRequest) => {
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve execution request');
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reject execution request');
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to execute request');
    } finally {
      setSaving(false);
    }
  };

  const executeNoopRequest = async (request: ExecutionRequest) => {
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to run no-op executor');
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to prepare retry');
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to cancel execution request');
    } finally {
      setSaving(false);
    }
  };

  const copySelectedId = async () => {
    if (!selected?.id) return;
    try {
      await navigator.clipboard.writeText(selected.id);
    } catch {
      window.prompt('Copy request ID', selected.id);
    }
  };

  const requests = data?.rows || [];
  const summaryCounts = {
    pending: requests.filter((item) => ['draft', 'pending_review'].includes(item.status)).length,
    approved: requests.filter((item) => item.status === 'approved').length,
    executed: requests.filter((item) => item.execution_status === 'completed' || item.execution_status === 'noop_completed').length,
    failed: requests.filter((item) => item.execution_status === 'failed' || item.status === 'rejected').length,
    systemContext: requests.filter((item) => item.request_type === 'system_recommendation' && item.payload?.source === 'system_context_page').length
  };

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <h1 style={styles.title}>Execution Requests</h1>
          <p style={styles.subtitle}>
            Safe registry for proposed actions. Step 246 adds a controlled min-stock update executor while preserving approval gates, audit evidence, retry preparation, and duplicate execution blocking.
          </p>
        </div>
        <div style={styles.actions}>
          <button type="button" className="btn btn-primary" onClick={createSystemRecommendation} disabled={saving}>
            Create from System Context
          </button>
          <button type="button" className="btn btn-secondary" onClick={createStandardCostUpdate} disabled={saving}>
            Create Standard Cost Update
          </button>
          <button type="button" className="btn btn-secondary" onClick={createProductMinStockUpdate} disabled={saving}>
            Create Min Stock Update
          </button>
          <button type="button" className="btn btn-secondary" onClick={createProductPricingUpdate} disabled={saving}>
            Create Pricing Update
          </button>
        </div>
      </section>

      {error ? <div className="app-error" style={styles.error}>{error}</div> : null}

      <section style={styles.summaryPanel} aria-label="Review Console Summary">
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Pending</span><strong>{summaryCounts.pending}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Approved</span><strong>{summaryCounts.approved}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Executed</span><strong>{summaryCounts.executed}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>Failed</span><strong>{summaryCounts.failed}</strong></div>
          <div style={styles.summaryTile}><span style={styles.summaryLabel}>System Context</span><strong>{summaryCounts.systemContext}</strong></div>
        </section>

        <section style={styles.filters}>
        <label style={styles.field}>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="">All</option>
            {statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
        </label>
        <label style={styles.field}>
          <span>Type</span>
          <select value={requestType} onChange={(event) => setRequestType(event.target.value as TypeFilter)}>
            <option value="">All</option>
            {requestTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
        </label>
        <label style={styles.fieldWide}>
          <span>Search</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search payload, status, or type" />
        </label>
      </section>

      <ExecutionModuleHardeningPanel hardeningSummary={hardeningSummary} />

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Execution Adapter Registry</h2>
          <span style={styles.meta}>
            {adapterRegistry ? `${adapterRegistry.summary.execution_disabled_count} disabled / ${adapterRegistry.summary.total_adapters} total` : 'Loading…'}
          </span>
        </div>
        <p style={styles.note}>
          Adapters define which request types can execute. Step 246 surfaces controlled standard-cost and min-stock executors plus explicit retry preparation control.
        </p>
        <div style={styles.adapterGrid}>
          {(adapterRegistry?.adapters || []).map((adapter) => (
            <div key={adapter.request_type} style={styles.adapterCard}>
              <div style={styles.adapterTopline}>
                <strong>{adapter.label}</strong>
                <span style={{ ...styles.badge, ...riskTone(adapter.risk_level) }}>{label(adapter.risk_level)}</span>
              </div>
              <div style={styles.meta}>{label(adapter.category)}</div>
              <p style={styles.adapterDescription}>{adapter.description}</p>
              <KeyValue label="Execution enabled" value={adapter.execution_enabled ? 'Yes' : 'No'} />
              <KeyValue label="Future executable" value={adapter.executable_later ? 'Yes' : 'No'} />
            </div>
          ))}
        </div>
        {adapterRegistry?.notes?.map((note) => <div key={note} style={styles.note}>{note}</div>)}
      </section>

      <div style={styles.layout}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Registry</h2>
            <span style={styles.meta}>{loading ? 'Loading…' : `${data?.total ?? 0} requests`}</span>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Requested By</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Execution</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows || []).map((request) => (
                  <tr key={request.id}>
                    <td><span style={{ ...styles.badge, ...statusTone(request.status) }}>{label(request.status)}</span></td>
                    <td>{label(request.request_type)}</td>
                    <td>{request.requested_by_name || request.requested_by || '-'}</td>
                    <td>{formatDateTime(request.created_at)}</td>
                    <td>{formatDateTime(request.updated_at)}</td>
                    <td>{request.execution_status ? <span style={{ ...styles.badge, ...executionTone(request.execution_status) }}>{label(request.execution_status)}</span> : '-'}</td>
                    <td>
                      <div style={styles.actions}>
                        <button type="button" className="btn btn-secondary" onClick={() => { setSelected(request); setAuditPack(null); setSecurityAudit(null); }}>View</button>
                        {request.status === 'draft' ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => submitRequest(request)}>Submit</button> : null}
                        {request.status === 'pending_review' ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => approveRequest(request)}>Approve</button> : null}
                        {request.status === 'pending_review' ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => rejectRequest(request)}>Reject</button> : null}
                        {request.status === 'approved' && !request.execution_status && request.adapter?.execution_enabled ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => executeRequest(request)}>Execute</button> : null}
                        {request.status === 'approved' && !request.execution_status && !request.adapter?.execution_enabled ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => executeNoopRequest(request)}>No-op Execute</button> : null}
                        {request.status === 'approved' && request.execution_review?.retry_eligibility?.eligible ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => prepareRetryRequest(request)}>Prepare Retry</button> : null}
                        {request.status === 'draft' || request.status === 'pending_review' ? <button type="button" className="btn btn-danger" disabled={saving} onClick={() => cancelRequest(request)}>Cancel</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !(data?.rows || []).length ? (
                  <tr><td colSpan={7} style={styles.empty}>No execution requests found.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {data?.notes?.map((note) => <div key={note} style={styles.note}>{note}</div>)}
        </section>

        <section style={styles.detailCard}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Detail</h2>
            <div style={styles.headerActions}>
              <span style={styles.meta}>{selected ? selected.id : 'Select a request'}</span>
              {selected ? (
                <button type="button" className="btn btn-secondary" onClick={copySelectedId}>
                  Copy ID
                </button>
              ) : null}
            </div>
          </div>
          {selected ? (
            <div style={styles.detail}>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryTile}>
                  <span style={styles.summaryLabel}>Origin</span>
                  <strong>{selected.payload?.source === 'system_context_page' ? 'System Context' : 'Manual / API'}</strong>
                </div>
                <div style={styles.summaryTile}>
                  <span style={styles.summaryLabel}>Review</span>
                  <strong>{selected.reviewed_at ? 'Reviewed' : selected.status === 'pending_review' ? 'Needs Review' : label(selected.status)}</strong>
                </div>
                <div style={styles.summaryTile}>
                  <span style={styles.summaryLabel}>Execution</span>
                  <strong>{selected.execution_status ? label(selected.execution_status) : 'Not executed'}</strong>
                </div>
                <div style={styles.summaryTile}>
                  <span style={styles.summaryLabel}>Failure</span>
                  <strong>{selected.execution_result?.failure_reason ? String(selected.execution_result.failure_reason) : selected.rejection_reason ? 'Rejected' : 'None'}</strong>
                </div>
              </div>

              <div style={styles.badgeRow}>
                {isSystemContextRequest(selected) ? <span style={styles.badge}>System Context</span> : null}
                {getRecommendationCodes(selected).length || getRecommendationGroupCodes(selected).length ? <span style={styles.badge}>Recommendation Linked</span> : null}
                <span style={styles.badge}>Human Review Required</span>
              </div>
              <KeyValue label="Type" value={label(selected.request_type)} />
              <KeyValue label="Status" value={label(selected.status)} />
              <KeyValue label="Created" value={formatDateTime(selected.created_at)} />
              <KeyValue label="Updated" value={formatDateTime(selected.updated_at)} />
              <KeyValue label="Reviewed By" value={selected.reviewed_by_name || selected.reviewed_by || '-'} />
              <KeyValue label="Reviewed At" value={formatDateTime(selected.reviewed_at)} />
              <KeyValue label="Review Note" value={selected.review_note || '-'} />
              <KeyValue label="Rejection Reason" value={selected.rejection_reason || '-'} />
              <KeyValue label="Cancel Reason" value={selected.cancel_reason || '-'} />
              <KeyValue label="Execution Status" value={selected.execution_status ? label(selected.execution_status) : '-'} />
              <KeyValue label="Executed By" value={selected.executed_by_name || selected.executed_by || '-'} />
              <KeyValue label="Executed At" value={formatDateTime(selected.executed_at)} />
              <KeyValue label="Adapter Execution Enabled" value={selected.adapter?.execution_enabled ? 'Yes' : 'No'} />
              <KeyValue label="Adapter Risk" value={selected.adapter?.risk_level ? label(selected.adapter.risk_level) : '-'} />
              <div style={styles.actions}>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => loadAuditPack(selected)}>
                  Load Audit Pack
                </button>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => loadSecurityAudit(selected)}>
                  Load Security Audit
                </button>
              </div>
              <ExecutionSecurityAuditPanel securityAudit={securityAudit} />
              <ExecutionAuditPackPanel auditPack={auditPack} />
              <ExecutionReviewPanel request={selected} />
              <h3 style={styles.subheading}>Traceability</h3>
              <div style={styles.traceGrid}>
                <KeyValue label="Requested By" value={selected.requested_by_name || selected.requested_by || '-'} />
                <KeyValue label="Reviewed By" value={selected.reviewed_by_name || selected.reviewed_by || '-'} />
                <KeyValue label="Executed By" value={selected.executed_by_name || selected.executed_by || '-'} />
                <KeyValue label="Recommendation Codes" value={Array.isArray(selected.payload?.recommendation_codes) ? selected.payload.recommendation_codes.join(', ') : '-'} />
                <KeyValue label="Recommendation Groups" value={Array.isArray(selected.payload?.recommendation_group_codes) ? selected.payload.recommendation_group_codes.join(', ') : '-'} />
              </div>
              <h3 style={styles.subheading}>Execution Result Snapshot</h3>
              <JsonBlock value={selected.execution_result} />
              <h3 style={styles.subheading}>Payload Snapshot</h3>
              <JsonBlock value={selected.payload} />
              <h3 style={styles.subheading}>Gate Snapshot</h3>
              <JsonBlock value={selected.gate_snapshot} />
              <h3 style={styles.subheading}>Context Snapshot</h3>
              <JsonBlock value={selected.context_snapshot} />
            </div>
          ) : (
            <div className="app-empty-state">Select an execution request to inspect immutable snapshots and status metadata.</div>
          )}
        </section>
      </div>
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

function ExecutionReviewPanel({ request }: { request: ExecutionRequest }) {
  const review = request.execution_review;

  if (!review) {
    return <div className="app-empty-state">Execution review evidence is not available for this request.</div>;
  }

  return (
    <div style={styles.reviewPanel}>
      <div style={styles.reviewHeader}>
        <div>
          <strong>Execution Review</strong>
          <div style={styles.meta}>Read-only result verification for this request.</div>
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
        <div style={styles.beforeAfterGrid}>
          <div style={styles.snapshotCard}>
            <strong>Before</strong>
            <KeyValue label="Standard Cost" value={formatUnknown(review.before_after.before?.standard_unit_cost)} />
            <KeyValue label="Updated At" value={formatDateTime(formatUnknown(review.before_after.before?.standard_cost_updated_at))} />
            <KeyValue label="Version" value={formatUnknown(review.before_after.before?.version)} />
          </div>
          <div style={styles.snapshotCard}>
            <strong>After</strong>
            <KeyValue label="Standard Cost" value={formatUnknown(review.before_after.after?.standard_unit_cost)} />
            <KeyValue label="Updated At" value={formatDateTime(formatUnknown(review.before_after.after?.standard_cost_updated_at))} />
            <KeyValue label="Version" value={formatUnknown(review.before_after.after?.version)} />
          </div>
        </div>
      ) : null}

      {review.review_notes?.map((note) => <div key={note} style={styles.note}>{note}</div>)}
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
  summaryPanel: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff' },
  summaryTile: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem', display: 'grid', gap: '0.25rem' },
  summaryLabel: { fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  badgeRow: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' },
  badge: { fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '999px', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' },
  page: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '1.75rem' },
  subtitle: { margin: '0.35rem 0 0', color: '#64748b', maxWidth: '760px' },
  error: { marginBottom: 0 },
  filters: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem', color: '#475569', fontSize: '0.85rem' },
  fieldWide: { display: 'flex', flexDirection: 'column', gap: '0.35rem', color: '#475569', fontSize: '0.85rem' },
  adapterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' },
  adapterCard: { border: '1px solid #e2e8f0', borderRadius: '14px', padding: '0.85rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.45rem' },
  adapterTopline: { display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' },
  adapterDescription: { margin: 0, color: '#475569', fontSize: '0.85rem', lineHeight: 1.45 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem', marginTop: '0.75rem' },
  checkList: { display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.5rem' },
  checkItem: { display: 'flex', gap: '0.65rem', alignItems: 'flex-start', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.65rem', background: '#f8fafc' },
  layout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)', gap: '1rem' },
  detailCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '1rem',
    position: 'sticky',
    top: '1rem',
    alignSelf: 'start'
  },
  headerActions: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' },
  summaryTile: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem', display: 'grid', gap: '0.25rem' },
  summaryLabel: { fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  traceGrid: { display: 'grid', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1rem', minWidth: 0 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' },
  cardTitle: { margin: 0, fontSize: '1.1rem' },
  meta: { color: '#64748b', fontSize: '0.85rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  badge: { display: 'inline-flex', borderRadius: '999px', padding: '0.2rem 0.55rem', fontWeight: 700, textTransform: 'capitalize' },
  noopTone: { background: '#ede9fe', color: '#5b21b6' },
  successTone: { background: '#dcfce7', color: '#166534' },
  pendingTone: { background: '#fef3c7', color: '#92400e' },
  actions: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' },
  empty: { textAlign: 'center', padding: '1rem', color: '#64748b' },
  note: { marginTop: '0.75rem', color: '#64748b', fontSize: '0.85rem' },
  detail: { display: 'flex', flexDirection: 'column', gap: '0.7rem' },
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
  json: { maxHeight: '260px', overflow: 'auto', background: '#0f172a', color: '#e2e8f0', padding: '0.75rem', borderRadius: '12px', fontSize: '0.75rem' }
};
