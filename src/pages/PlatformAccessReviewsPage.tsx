import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const defaultForm = { title: '', scope: 'mixed', due_at: '', notes: '' };
const decisionOptions = ['approved', 'needs_change', 'revoked', 'not_applicable'];

function statusBadge(status: string): CSSProperties {
  if (status === 'completed' || status === 'approved') return { ...styles.badge, background: '#dcfce7', color: '#166534' };
  if (status === 'needs_change' || status === 'revoked' || status === 'cancelled') return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
}

export default function PlatformAccessReviewsPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_WRITE);
  const [filters, setFilters] = useState({ status: 'open', scope: '' });
  const [form, setForm] = useState(defaultForm);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

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

  const createReview = useMutation({
    mutationFn: () => platformApiRequest<DetailResponse>('/platform/access-reviews', { method: 'POST', body: JSON.stringify({ ...form, due_at: form.due_at || null }) }),
    onSuccess: (data) => {
      setForm(defaultForm);
      setSelectedReviewId(data.review.id);
      queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews'] });
    }
  });

  const decideItem = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) => platformApiRequest(`/platform/access-reviews/${selectedReviewId}/items/${itemId}/decision`, { method: 'POST', body: JSON.stringify({ status, decision_note: decisionNotes[itemId] || null }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews', selectedReviewId] });
    }
  });

  const completeReview = useMutation({
    mutationFn: () => platformApiRequest(`/platform/access-reviews/${selectedReviewId}/complete`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews', selectedReviewId] });
    }
  });

  const cancelReview = useMutation({
    mutationFn: () => platformApiRequest(`/platform/access-reviews/${selectedReviewId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelled from platform UI' }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'access-reviews', selectedReviewId] });
    }
  });

  const scopeOptions = reviews.data?.scopes || ['platform_users', 'tenant_support', 'api_keys', 'webhooks', 'mixed'];
  const rows = reviews.data?.reviews || [];
  const selected = detail.data?.review;
  const items = detail.data?.items || [];
  const canCreateReview = Boolean(form.title.trim());

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Access reviews</h1>
          <p style={styles.subtitle}>Periodic review of platform users, tenant support access, API keys, and webhooks.</p>
        </div>
      </header>

      <section style={styles.summaryGrid}>
        <div style={styles.card}><strong>Pending items</strong><div style={styles.metric}>{summary.data?.pending_items ?? '—'}</div></div>
        <div style={styles.card}><strong>Overdue reviews</strong><div style={styles.metric}>{summary.data?.overdue_reviews ?? '—'}</div></div>
        {(summary.data?.by_status || []).map((row) => <div key={row.status} style={styles.card}><strong>{row.status}</strong><div style={styles.metric}>{row.count}</div></div>)}
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
          {!canCreateReview ? <div style={styles.validationMessage}>Title is required before creating an access review.</div> : null}
          <button type="button" style={canCreateReview && !createReview.isPending ? styles.primaryButton : styles.disabledButton} disabled={createReview.isPending || !canCreateReview} onClick={() => createReview.mutate()}>Create review</button>
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
            <thead><tr><th style={styles.th}>Review</th><th style={styles.th}>Scope</th><th style={styles.th}>Status</th><th style={styles.th}>Counts</th><th style={styles.th}>Due</th></tr></thead>
            <tbody>{rows.map((review) => <tr key={review.id} onClick={() => setSelectedReviewId(review.id)} style={styles.clickRow}><td style={styles.td}><strong>{review.title}</strong><br /><span style={styles.help}>Created by {review.created_by_email || 'unknown'}</span></td><td style={styles.td}>{review.scope}</td><td style={styles.td}><span style={statusBadge(review.status)}>{review.status}</span></td><td style={styles.td}>{review.pending_count || 0} pending / {review.item_count || 0} total<br /><span style={styles.help}>{review.needs_change_count || 0} needs change, {review.revoked_count || 0} revoked</span></td><td style={styles.td}>{review.due_at ? new Date(review.due_at).toLocaleString() : '—'}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <section style={styles.card}>
          <div style={styles.header}>
            <div><h2 style={styles.cardTitle}>{selected.title}</h2><p style={styles.subtitle}>{selected.scope} · {selected.status}</p></div>
            {canWrite && selected.status === 'open' ? <div style={styles.actions}><button type="button" style={styles.secondaryButton} onClick={() => completeReview.mutate()}>Complete</button><button type="button" style={styles.dangerButton} onClick={() => cancelReview.mutate()}>Cancel</button></div> : null}
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Item</th><th style={styles.th}>Type</th><th style={styles.th}>Risk/meta</th><th style={styles.th}>Decision</th><th style={styles.th}>Action</th></tr></thead>
              <tbody>{items.map((item) => <tr key={item.id}><td style={styles.td}><strong>{item.label}</strong><br /><span style={styles.help}>{item.tenant_name || ''}</span></td><td style={styles.td}>{item.item_type}</td><td style={styles.td}><code>{String(item.metadata?.risk || 'normal')}</code></td><td style={styles.td}><span style={statusBadge(item.status)}>{item.status}</span><br /><span style={styles.help}>{item.decision_note || item.decided_by_email || ''}</span></td><td style={styles.td}>{canWrite && selected.status === 'open' ? <div style={styles.actions}><input style={styles.input} value={decisionNotes[item.id] || ''} onChange={(event) => setDecisionNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Decision note" />{decisionOptions.map((status) => <button key={status} type="button" style={styles.secondaryButton} onClick={() => decideItem.mutate({ itemId: item.id, status })}>{status}</button>)}</div> : '—'}</td></tr>)}</tbody>
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
  badge: { borderRadius: '999px', padding: '4px 8px', fontSize: '12px', fontWeight: 800 },
  help: { color: '#6b7280', fontSize: '12px' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  primaryButton: { border: 0, borderRadius: '10px', padding: '10px 14px', background: '#111827', color: '#fff', cursor: 'pointer', marginTop: '12px' },
  disabledButton: { border: 0, borderRadius: '10px', padding: '10px 14px', background: '#9ca3af', color: '#fff', cursor: 'not-allowed', marginTop: '12px', opacity: 0.85 },
  validationMessage: { marginTop: '12px', border: '1px solid #facc15', background: '#fefce8', color: '#92400e', borderRadius: '10px', padding: '10px 12px', fontWeight: 700 },
  secondaryButton: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '8px 10px', background: '#fff', cursor: 'pointer' },
  dangerButton: { border: 0, borderRadius: '10px', padding: '8px 10px', background: '#dc2626', color: '#fff', cursor: 'pointer' }
};
