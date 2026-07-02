import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Review = {
  id: string;
  title: string;
  scope: string;
  status: string;
  due_at?: string | null;
  created_at: string;
  created_by_email?: string | null;
  item_count?: number;
  pending_count?: number;
  needs_change_count?: number;
  revoked_count?: number;
};

type ReviewItem = {
  id: string;
  item_type: string;
  label: string;
  tenant_name?: string | null;
  status: string;
  decision_note?: string | null;
  decided_by_email?: string | null;
  decided_at?: string | null;
  metadata?: Record<string, unknown>;
};

type ReviewsResponse = { reviews: Review[]; scopes: string[]; statuses: string[]; item_statuses: string[] };
type DetailResponse = { review: Review; items: ReviewItem[] };
type Summary = { by_status: Array<{ status: string; count: number }>; overdue_reviews: number; pending_items: number };

type ReviewForm = { title: string; scope: string; due_at: string; notes: string };

const defaultForm: ReviewForm = { title: '', scope: 'mixed', due_at: '', notes: '' };
const decisionOptions = ['approved', 'needs_change', 'revoked', 'not_applicable'];

function label(value?: string | null) { return value ? value.replace(/_/g, ' ') : '—'; }
function dateTime(value?: string | null) { return value ? new Date(value).toLocaleString() : '—'; }
function trimToNull(value?: string | null) { const cleaned = (value || '').trim(); return cleaned || null; }
function isValidOptionalDate(value?: string | null) { if (!value) return true; return !Number.isNaN(new Date(value).getTime()); }
function metadataEntries(metadata?: Record<string, unknown>) {
  return Object.entries(metadata || {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim().length > 0)
    .slice(0, 5);
}
function createPayload(form: ReviewForm) {
  return {
    title: form.title.trim(),
    scope: form.scope,
    due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
    notes: trimToNull(form.notes)
  };
}

function statusBadge(status: string): CSSProperties {
  if (status === 'completed' || status === 'approved') return styles.badgeGood;
  if (status === 'needs_change' || status === 'revoked' || status === 'cancelled') return styles.badgeDanger;
  return styles.badgeWarn;
}

export default function PlatformAccessReviewsPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_WRITE);
  const [filters, setFilters] = useState({ status: 'open', scope: '' });
  const [form, setForm] = useState<ReviewForm>(defaultForm);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.scope) params.set('scope', filters.scope);
    params.set('limit', '200');
    return params.toString();
  }, [filters]);

  const summary = useQuery({ queryKey: ['platform', 'access-reviews', 'summary'], queryFn: () => platformApiRequest<Summary>('/platform/access-reviews/summary') });
  const reviews = useQuery({ queryKey: ['platform', 'access-reviews', filters], queryFn: () => platformApiRequest<ReviewsResponse>(`/platform/access-reviews?${queryString}`) });
  const detail = useQuery({ queryKey: ['platform', 'access-reviews', selectedReviewId], enabled: Boolean(selectedReviewId), queryFn: () => platformApiRequest<DetailResponse>(`/platform/access-reviews/${selectedReviewId}`) });

  const refreshAll = () => {
    summary.refetch();
    reviews.refetch();
    if (selectedReviewId) detail.refetch();
  };

  const createReview = useMutation({
    mutationFn: () => platformApiRequest<DetailResponse>('/platform/access-reviews', { method: 'POST', body: JSON.stringify(createPayload(form)) }),
    onSuccess: async (data) => {
      setStatusMessage('Access review created.');
      setForm(defaultForm);
      setSelectedReviewId(data.review.id);
      await queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews'] });
    }
  });

  const decideItem = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) => platformApiRequest(`/platform/access-reviews/${selectedReviewId}/items/${itemId}/decision`, { method: 'POST', body: JSON.stringify({ status, decision_note: trimToNull(decisionNotes[itemId]) }) }),
    onSuccess: async (_data, variables) => {
      setStatusMessage(`Review item marked ${label(variables.status)}.`);
      setDecisionNotes((current) => ({ ...current, [variables.itemId]: '' }));
      await queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews', selectedReviewId] });
    }
  });

  const completeReview = useMutation({
    mutationFn: () => platformApiRequest(`/platform/access-reviews/${selectedReviewId}/complete`, { method: 'POST' }),
    onSuccess: async () => {
      setStatusMessage('Access review completed.');
      await queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews', selectedReviewId] });
    }
  });

  const cancelReview = useMutation({
    mutationFn: () => platformApiRequest(`/platform/access-reviews/${selectedReviewId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelled from platform UI' }) }),
    onSuccess: async () => {
      setStatusMessage('Access review cancelled.');
      await queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews', selectedReviewId] });
    }
  });

  const scopeOptions = reviews.data?.scopes || ['platform_users', 'tenant_support', 'api_keys', 'webhooks', 'mixed'];
  const rows = reviews.data?.reviews || [];
  const selected = detail.data?.review;
  const items = detail.data?.items || [];
  const canCreateReview = form.title.trim().length > 0 && isValidOptionalDate(form.due_at);
  const selectedPendingCount = selected?.pending_count ?? items.filter((item) => item.status === 'pending').length;
  const canCompleteSelected = Boolean(selected && selected.status === 'open' && selectedPendingCount === 0);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Access reviews</h1>
          <p style={styles.subtitle}>Periodic review of platform users, tenant support access, API keys, and webhooks.</p>
        </div>
        <button type="button" onClick={refreshAll} disabled={summary.isFetching || reviews.isFetching || detail.isFetching} style={styles.secondaryButton}>
          {summary.isFetching || reviews.isFetching || detail.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {summary.isError || reviews.isError ? (
        <section style={styles.errorPanel}>
          <strong>Access review data could not be loaded.</strong>
          <span>Check platform access review permissions or backend availability, then retry.</span>
          <button type="button" onClick={refreshAll} style={styles.secondaryButton}>Retry</button>
        </section>
      ) : null}

      {statusMessage ? <div style={styles.successPanel}>{statusMessage}</div> : null}

      <section style={styles.metaPanel}>
        <span><strong>Snapshot:</strong> {new Date().toLocaleString()}</span>
        <span><strong>Source:</strong> GET /api/platform/access-reviews/summary · GET /api/platform/access-reviews?{queryString}</span>
        <span><strong>Filters:</strong> status {filters.status || 'all'} · scope {filters.scope || 'all'}</span>
        {selectedReviewId ? <span><strong>Selected detail:</strong> GET /api/platform/access-reviews/{selectedReviewId}</span> : null}
      </section>

      <section style={styles.linkPanel}>
        <strong>Supporting Platform pages</strong>
        <div style={styles.linkGrid}>
          <Link to="/platform/users" style={styles.link}>Platform Users</Link>
          <Link to="/platform/api-keys" style={styles.link}>API Keys</Link>
          <Link to="/platform/webhooks" style={styles.link}>Webhooks</Link>
          <Link to="/platform/support-sessions" style={styles.link}>Support Sessions</Link>
          <Link to="/platform/audit" style={styles.link}>Audit</Link>
        </div>
      </section>

      <section style={styles.summaryGrid}>
        <div style={styles.card}><strong>Pending items</strong><div style={styles.metric}>{summary.data?.pending_items ?? '—'}</div></div>
        <div style={styles.card}><strong>Overdue reviews</strong><div style={styles.metric}>{summary.data?.overdue_reviews ?? '—'}</div></div>
        {(summary.data?.by_status || []).map((row) => <div key={row.status} style={styles.card}><strong>{label(row.status)}</strong><div style={styles.metric}>{row.count}</div></div>)}
      </section>

      {canWrite ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Start access review</h2>
          <div style={styles.grid}>
            <label style={styles.field}>Title<input style={styles.input} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Quarterly platform access review" /></label>
            <label style={styles.field}>Scope<select style={styles.input} value={form.scope} onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value }))}>{scopeOptions.map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select></label>
            <label style={styles.field}>Due date<input style={styles.input} type="datetime-local" value={form.due_at} onChange={(event) => setForm((current) => ({ ...current, due_at: event.target.value }))} /></label>
          </div>
          <label style={styles.field}>Notes<textarea style={styles.textarea} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
          {!form.title.trim() ? <div style={styles.validationMessage}>Title is required before creating an access review.</div> : null}
          {form.due_at && !isValidOptionalDate(form.due_at) ? <div style={styles.validationMessage}>Due date must be a valid date/time.</div> : null}
          <button type="button" style={canCreateReview && !createReview.isPending ? styles.primaryButton : styles.disabledButton} disabled={createReview.isPending || !canCreateReview} onClick={() => createReview.mutate()}>{createReview.isPending ? 'Creating…' : 'Create review'}</button>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Reviews</h2>
        <div style={styles.grid}>
          <label style={styles.field}>Status<select style={styles.input} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All</option><option value="open">Open</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
          <label style={styles.field}>Scope<select style={styles.input} value={filters.scope} onChange={(event) => setFilters((current) => ({ ...current, scope: event.target.value }))}><option value="">All scopes</option>{scopeOptions.map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select></label>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Review</th><th style={styles.th}>Scope</th><th style={styles.th}>Status</th><th style={styles.th}>Counts</th><th style={styles.th}>Due</th><th style={styles.th}>Evidence</th></tr></thead>
            <tbody>{rows.map((review) => <tr key={review.id} onClick={() => setSelectedReviewId(review.id)} style={styles.clickRow}><td style={styles.td}><strong>{review.title}</strong><br /><span style={styles.help}>Created by {review.created_by_email || 'unknown'} · {dateTime(review.created_at)}</span></td><td style={styles.td}>{review.scope}</td><td style={styles.td}><span style={statusBadge(review.status)}>{review.status}</span></td><td style={styles.td}>{review.pending_count || 0} pending / {review.item_count || 0} total<br /><span style={styles.help}>{review.needs_change_count || 0} needs change, {review.revoked_count || 0} revoked</span></td><td style={styles.td}>{dateTime(review.due_at)}</td><td style={styles.td}><button type="button" style={styles.linkButton} onClick={(event) => { event.stopPropagation(); setSelectedReviewId(review.id); }}>Open evidence</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {detail.isError ? (
        <section style={styles.errorPanel}>
          <strong>Selected review could not be loaded.</strong>
          <span>Retry the review detail request or select another review.</span>
          <button type="button" onClick={() => detail.refetch()} style={styles.secondaryButton}>Retry detail</button>
        </section>
      ) : null}

      {selected ? (
        <section style={styles.card}>
          <div style={styles.header}>
            <div><h2 style={styles.cardTitle}>{selected.title}</h2><p style={styles.subtitle}>{selected.scope} · {selected.status} · {selectedPendingCount} pending</p></div>
            {canWrite && selected.status === 'open' ? <div style={styles.actions}><button type="button" style={canCompleteSelected ? styles.secondaryButton : styles.disabledOutlineButton} disabled={!canCompleteSelected || completeReview.isPending} onClick={() => { if (window.confirm('Complete this access review? Every item must already be decided.')) completeReview.mutate(); }}>Complete</button><button type="button" style={styles.dangerButton} disabled={cancelReview.isPending} onClick={() => { if (window.confirm('Cancel this access review? Decisions will be locked because the review will no longer be open.')) cancelReview.mutate(); }}>Cancel</button></div> : null}
          </div>
          {!canCompleteSelected && selected.status === 'open' ? <div style={styles.validationMessage}>Complete is disabled until all review items have a non-pending decision.</div> : null}
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Item</th><th style={styles.th}>Type</th><th style={styles.th}>Evidence / metadata</th><th style={styles.th}>Decision</th><th style={styles.th}>Action</th></tr></thead>
              <tbody>{items.map((item) => {
                const entries = metadataEntries(item.metadata);
                return <tr key={item.id}><td style={styles.td}><strong>{item.label}</strong><br /><span style={styles.help}>{item.tenant_name || 'Platform-wide'}</span></td><td style={styles.td}>{item.item_type}</td><td style={styles.td}>{entries.length ? entries.map(([key, value]) => <div key={key}><strong>{label(key)}:</strong> {String(value)}</div>) : <span style={styles.help}>No additional metadata</span>}</td><td style={styles.td}><span style={statusBadge(item.status)}>{item.status}</span><br /><span style={styles.help}>{item.decision_note || item.decided_by_email || ''}</span>{item.decided_at ? <><br /><span style={styles.help}>{dateTime(item.decided_at)}</span></> : null}</td><td style={styles.td}>{canWrite && selected.status === 'open' ? <div style={styles.actions}><input style={styles.input} value={decisionNotes[item.id] || ''} onChange={(event) => setDecisionNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Decision note" />{decisionOptions.map((status) => <button key={status} type="button" style={styles.secondaryButton} disabled={decideItem.isPending} onClick={() => decideItem.mutate({ itemId: item.id, status })}>{status}</button>)}</div> : '—'}</td></tr>;
              })}</tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' },
  title: { margin: 0, fontSize: '28px' },
  subtitle: { margin: '6px 0 0', color: '#6b7280' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 2px rgba(15,23,42,.06)' },
  cardTitle: { margin: '0 0 12px', fontSize: '18px' },
  metric: { fontSize: '28px', fontWeight: 800, marginTop: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 700, color: '#374151' },
  input: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '8px 10px' },
  textarea: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '10px 12px', minHeight: '72px', marginTop: '12px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '10px', verticalAlign: 'top' },
  clickRow: { cursor: 'pointer' },
  badge: { borderRadius: '999px', padding: '4px 8px', fontSize: '12px', fontWeight: 800, background: '#e5e7eb', color: '#374151' },
  badgeGood: { borderRadius: '999px', padding: '4px 8px', fontSize: '12px', fontWeight: 800, background: '#dcfce7', color: '#166534' },
  badgeWarn: { borderRadius: '999px', padding: '4px 8px', fontSize: '12px', fontWeight: 800, background: '#fef3c7', color: '#92400e' },
  badgeDanger: { borderRadius: '999px', padding: '4px 8px', fontSize: '12px', fontWeight: 800, background: '#fee2e2', color: '#991b1b' },
  help: { color: '#6b7280', fontSize: '12px' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  primaryButton: { border: 0, borderRadius: '10px', padding: '10px 14px', background: '#111827', color: '#fff', cursor: 'pointer', marginTop: '12px' },
  disabledButton: { border: 0, borderRadius: '10px', padding: '10px 14px', background: '#9ca3af', color: '#fff', cursor: 'not-allowed', marginTop: '12px', opacity: 0.85 },
  disabledOutlineButton: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '8px 10px', background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' },
  validationMessage: { marginTop: '12px', border: '1px solid #facc15', background: '#fefce8', color: '#92400e', borderRadius: '10px', padding: '10px 12px', fontWeight: 700 },
  secondaryButton: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '8px 10px', background: '#fff', cursor: 'pointer', color: '#111827' },
  dangerButton: { border: 0, borderRadius: '10px', padding: '8px 10px', background: '#dc2626', color: '#fff', cursor: 'pointer' },
  metaPanel: { display: 'flex', flexWrap: 'wrap', gap: '10px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e3a8a', borderRadius: '14px', padding: '12px 14px', fontSize: '13px' },
  linkPanel: { display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '14px', padding: '14px' },
  linkGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  link: { border: '1px solid #d1d5db', borderRadius: '999px', padding: '6px 10px', color: '#1d4ed8', textDecoration: 'none', fontWeight: 700, fontSize: '13px' },
  successPanel: { border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: '12px', padding: '10px 12px', fontWeight: 700 },
  errorPanel: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: '12px', padding: '12px' },
  linkButton: { border: 0, background: 'transparent', color: '#2563eb', cursor: 'pointer', padding: 0, fontWeight: 700 }
};
