import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { apiRequest, ApiError } from '../lib/api';
import type { ExecutionAdapterRegistryResponse, ExecutionRequest, ExecutionRequestListResponse } from '../types/inventory';

type StatusFilter = '' | ExecutionRequest['status'];
type TypeFilter = '' | ExecutionRequest['request_type'];

const requestTypes: ExecutionRequest['request_type'][] = [
  'cost_review',
  'cost_standard_update',
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

function JsonBlock({ value }: { value: unknown }) {
  return <pre style={styles.json}>{JSON.stringify(value ?? null, null, 2)}</pre>;
}

export default function ExecutionRequestsPage() {
  const [data, setData] = useState<ExecutionRequestListResponse | null>(null);
  const [adapterRegistry, setAdapterRegistry] = useState<ExecutionAdapterRegistryResponse | null>(null);
  const [selected, setSelected] = useState<ExecutionRequest | null>(null);
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
      const [response, adapters] = await Promise.all([
        apiRequest<ExecutionRequestListResponse>(`/execution-requests?${query}`),
        apiRequest<ExecutionAdapterRegistryResponse>('/execution-requests/adapters')
      ]);
      setData(response);
      setAdapterRegistry(adapters);
      if (selected) {
        const nextSelected = response.rows.find((row) => row.id === selected.id) || null;
        setSelected(nextSelected);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load execution requests');
    } finally {
      setLoading(false);
    }
  }, [query, selected]);

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
            note: 'Created from the current System Context snapshot. Real execution is only available for approved standard cost update requests.'
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
    const confirmed = window.confirm(`Execute approved request: ${adapterLabel}? This is only enabled for controlled standard-cost updates.`);
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

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <h1 style={styles.title}>Execution Requests</h1>
          <p style={styles.subtitle}>
            Safe registry for proposed actions. Step 192 enables the first real controlled executor: approved standard-cost updates. All other request types remain safe/no-op only; no stock, shipment, supplier, or quantity behavior is changed.
          </p>
        </div>
        <div style={styles.actions}>
          <button type="button" className="btn btn-primary" onClick={createSystemRecommendation} disabled={saving}>
            Create from System Context
          </button>
          <button type="button" className="btn btn-secondary" onClick={createStandardCostUpdate} disabled={saving}>
            Create Standard Cost Update
          </button>
        </div>
      </section>

      {error ? <div className="app-error" style={styles.error}>{error}</div> : null}

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

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Execution Adapter Registry</h2>
          <span style={styles.meta}>
            {adapterRegistry ? `${adapterRegistry.summary.execution_disabled_count} disabled / ${adapterRegistry.summary.total_adapters} total` : 'Loading…'}
          </span>
        </div>
        <p style={styles.note}>
          Adapters define what could become executable later. Real execution remains disabled; Step 191 only allows an approved request to pass through a no-op executor.
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
                    <td>{request.execution_status ? <span style={{ ...styles.badge, ...styles.noopTone }}>{label(request.execution_status)}</span> : '-'}</td>
                    <td>
                      <div style={styles.actions}>
                        <button type="button" className="btn btn-secondary" onClick={() => setSelected(request)}>View</button>
                        {request.status === 'draft' ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => submitRequest(request)}>Submit</button> : null}
                        {request.status === 'pending_review' ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => approveRequest(request)}>Approve</button> : null}
                        {request.status === 'pending_review' ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => rejectRequest(request)}>Reject</button> : null}
                        {request.status === 'approved' && !request.execution_status && request.adapter?.execution_enabled ? <button type="button" className="btn btn-primary" disabled={saving} onClick={() => executeRequest(request)}>Execute</button> : null}
                        {request.status === 'approved' && !request.execution_status && !request.adapter?.execution_enabled ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => executeNoopRequest(request)}>No-op Execute</button> : null}
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

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Detail</h2>
            <span style={styles.meta}>{selected ? selected.id : 'Select a request'}</span>
          </div>
          {selected ? (
            <div style={styles.detail}>
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
              <h3 style={styles.subheading}>Execution Result</h3>
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

function statusTone(status: ExecutionRequest['status']) {
  if (status === 'approved') return { background: '#dcfce7', color: '#166534' };
  if (status === 'rejected' || status === 'cancelled') return { background: '#fee2e2', color: '#991b1b' };
  if (status === 'pending_review') return { background: '#fef3c7', color: '#92400e' };
  return { background: '#e0f2fe', color: '#075985' };
}

const styles: Record<string, CSSProperties> = {
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
  layout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)', gap: '1rem' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '1rem', minWidth: 0 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' },
  cardTitle: { margin: 0, fontSize: '1.1rem' },
  meta: { color: '#64748b', fontSize: '0.85rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  badge: { display: 'inline-flex', borderRadius: '999px', padding: '0.2rem 0.55rem', fontWeight: 700, textTransform: 'capitalize' },
  noopTone: { background: '#ede9fe', color: '#5b21b6' },
  actions: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' },
  empty: { textAlign: 'center', padding: '1rem', color: '#64748b' },
  note: { marginTop: '0.75rem', color: '#64748b', fontSize: '0.85rem' },
  detail: { display: 'flex', flexDirection: 'column', gap: '0.7rem' },
  kv: { display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.45rem' },
  kvLabel: { color: '#64748b' },
  kvValue: { fontWeight: 700, color: '#0f172a', textAlign: 'right' },
  subheading: { margin: '0.65rem 0 0', fontSize: '0.95rem' },
  json: { maxHeight: '260px', overflow: 'auto', background: '#0f172a', color: '#e2e8f0', padding: '0.75rem', borderRadius: '12px', fontSize: '0.75rem' }
};
