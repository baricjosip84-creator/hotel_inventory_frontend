import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

type Tenant = { id: string; name: string };
type PlatformUser = { id: string; email: string; name?: string | null };
type ComplianceDocument = {
  id: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  title: string;
  document_type: string;
  status: string;
  owner_platform_user_id?: string | null;
  owner_email?: string | null;
  external_url?: string | null;
  notes?: string | null;
  effective_at?: string | null;
  expires_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by_email?: string | null;
  created_by_email?: string | null;
  updated_at: string;
};
type DocumentsResponse = { documents: ComplianceDocument[]; document_types: string[]; statuses: string[] };
type SummaryResponse = { summary: { total: number; active: number; needs_review: number; expired_or_overdue: number; expiring_soon: number }; by_type: { document_type: string; count: number }[] };

const defaultForm = {
  tenant_id: '', title: '', document_type: 'other', status: 'draft', owner_platform_user_id: '', external_url: '', notes: '', effective_at: '', expires_at: ''
};

type ComplianceDocumentForm = typeof defaultForm;

function trimToNull(value?: string | null) {
  const cleaned = (value || '').trim();
  return cleaned || null;
}

function normalizeFormForDirtyCheck(values: ComplianceDocumentForm) {
  return {
    tenant_id: values.tenant_id || '',
    title: values.title.trim(),
    document_type: values.document_type || 'other',
    status: values.status || 'draft',
    owner_platform_user_id: values.owner_platform_user_id || '',
    external_url: values.external_url.trim(),
    notes: values.notes.trim(),
    effective_at: values.effective_at || '',
    expires_at: values.expires_at || ''
  };
}

function formsMatch(a: ComplianceDocumentForm, b: ComplianceDocumentForm) {
  return JSON.stringify(normalizeFormForDirtyCheck(a)) === JSON.stringify(normalizeFormForDirtyCheck(b));
}

function formFromDocument(row: ComplianceDocument): ComplianceDocumentForm {
  return {
    tenant_id: row.tenant_id || '',
    title: row.title || '',
    document_type: row.document_type || 'other',
    status: row.status || 'draft',
    owner_platform_user_id: row.owner_platform_user_id || '',
    external_url: row.external_url || '',
    notes: row.notes || '',
    effective_at: row.effective_at?.slice(0, 10) || '',
    expires_at: row.expires_at?.slice(0, 10) || ''
  };
}

function documentPayload(form: ComplianceDocumentForm) {
  return {
    tenant_id: form.tenant_id || null,
    title: form.title.trim(),
    document_type: form.document_type,
    status: form.status,
    owner_platform_user_id: form.owner_platform_user_id || null,
    external_url: trimToNull(form.external_url),
    notes: trimToNull(form.notes),
    effective_at: form.effective_at || null,
    expires_at: form.expires_at || null
  };
}

function dateOnly(value?: string | null) { return value ? new Date(value).toLocaleDateString() : '—'; }
function dateTime(value?: string | null) { return value ? new Date(value).toLocaleString() : '—'; }
function label(value?: string | null) { return value ? value.replace(/_/g, ' ') : '—'; }
function isExpiringSoon(row: ComplianceDocument) {
  if (!row.expires_at || row.status === 'archived') return false;
  const diff = new Date(row.expires_at).getTime() - Date.now();
  return diff >= 0 && diff <= 45 * 24 * 60 * 60 * 1000;
}
function isValidOptionalDate(value?: string | null) { if (!value) return true; return !Number.isNaN(new Date(value).getTime()); }
function isValidOptionalHttpUrl(value?: string | null) {
  if (!value?.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
function isEffectiveBeforeExpiry(form: ComplianceDocumentForm) {
  if (!form.effective_at || !form.expires_at) return true;
  return new Date(form.effective_at).getTime() <= new Date(form.expires_at).getTime();
}
function badgeStyle(status: string, expiring: boolean): CSSProperties {
  if (status === 'active' && !expiring) return styles.badgeGood;
  if (status === 'archived') return styles.badgeMuted;
  if (status === 'expired' || expiring) return styles.badgeDanger;
  if (status === 'needs_review') return styles.badgeWarn;
  return styles.badgeInfo;
}

export default function PlatformComplianceDocumentsPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_WRITE);
  const [filters, setFilters] = useState({ tenant_id: '', status: '', document_type: '', search: '', expiring: false });
  const [form, setForm] = useState<ComplianceDocumentForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalEditForm, setOriginalEditForm] = useState<ComplianceDocumentForm | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.document_type) params.set('document_type', filters.document_type);
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.expiring) params.set('expiring', 'true');
    params.set('limit', '200');
    return params.toString();
  }, [filters]);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'compliance-picker'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const users = useQuery({ queryKey: ['platform', 'users', 'compliance-owner-picker'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users') });
  const summary = useQuery({ queryKey: ['platform', 'compliance-documents', 'summary'], queryFn: () => platformApiRequest<SummaryResponse>('/platform/compliance-documents/summary') });
  const documents = useQuery({ queryKey: ['platform', 'compliance-documents', filters], queryFn: () => platformApiRequest<DocumentsResponse>(`/platform/compliance-documents?${queryString}`) });

  const refreshAll = () => {
    setStatusMessage(null);
    tenants.refetch();
    users.refetch();
    summary.refetch();
    documents.refetch();
  };

  const saveDocument = useMutation({
    mutationFn: () => platformApiRequest(editingId ? `/platform/compliance-documents/${editingId}` : '/platform/compliance-documents', {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify(documentPayload(form))
    }),
    onSuccess: () => {
      setStatusMessage(editingId ? 'Compliance document changes saved.' : 'Compliance document created.');
      setForm(defaultForm);
      setEditingId(null);
      setOriginalEditForm(null);
      queryClient.invalidateQueries({ queryKey: ['platform', 'compliance-documents'] });
    }
  });

  const reviewDocument = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => platformApiRequest(`/platform/compliance-documents/${id}/review`, { method: 'POST', body: JSON.stringify({ status, notes: trimToNull(reviewNotes) }) }),
    onSuccess: () => {
      setStatusMessage('Compliance document marked reviewed.');
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['platform', 'compliance-documents'] });
    }
  });

  const archiveDocument = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/compliance-documents/${id}/archive`, { method: 'POST', body: JSON.stringify({ reason: 'Archived from platform compliance page' }) }),
    onSuccess: () => {
      setStatusMessage('Compliance document archived.');
      queryClient.invalidateQueries({ queryKey: ['platform', 'compliance-documents'] });
    }
  });

  const rows = documents.data?.documents || [];
  const types = documents.data?.document_types || ['contract', 'dpa', 'security', 'privacy', 'sla', 'billing', 'policy', 'other'];
  const statuses = documents.data?.statuses || ['draft', 'active', 'needs_review', 'expired', 'archived'];
  const hasRequiredDocumentFields = Boolean(form.title.trim());
  const hasDocumentChanges = editingId ? Boolean(originalEditForm && !formsMatch(form, originalEditForm)) : true;
  const hasValidUrl = isValidOptionalHttpUrl(form.external_url);
  const hasValidDates = isValidOptionalDate(form.effective_at) && isValidOptionalDate(form.expires_at) && isEffectiveBeforeExpiry(form);
  const isSaveDisabled = saveDocument.isPending || !hasRequiredDocumentFields || !hasDocumentChanges || !hasValidUrl || !hasValidDates;
  const isLoadingAny = tenants.isFetching || users.isFetching || summary.isFetching || documents.isFetching;
  const documentSaveHelp = !hasRequiredDocumentFields
    ? 'Document title is required.'
    : !hasValidUrl
      ? 'External document URL must start with http:// or https://.'
      : !hasValidDates
        ? 'Dates must be valid, and effective date cannot be after expiry date.'
        : editingId && !hasDocumentChanges
          ? 'Make a change before saving.'
          : '';

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Compliance documents</h1>
          <p style={styles.subtitle}>Track tenant contracts, DPAs, SLAs, security documents, policy records, and expiry/review dates.</p>
        </div>
        <button type="button" onClick={refreshAll} disabled={isLoadingAny} style={styles.secondaryButton}>{isLoadingAny ? 'Refreshing…' : 'Refresh'}</button>
      </header>

      {tenants.isError || users.isError || summary.isError || documents.isError ? (
        <section style={styles.errorPanel}>
          <strong>Compliance document data could not be loaded.</strong>
          <span>Check compliance permissions or backend availability, then retry.</span>
          <button type="button" onClick={refreshAll} style={styles.secondaryButton}>Retry</button>
        </section>
      ) : null}

      {statusMessage ? <div style={styles.successPanel}>{statusMessage}</div> : null}

      <section style={styles.metaPanel}>
        <span><strong>Snapshot:</strong> {new Date().toLocaleString()}</span>
        <span><strong>Source:</strong> GET /api/platform/compliance-documents/summary · GET /api/platform/compliance-documents?{queryString}</span>
        <span><strong>Supporting source:</strong> GET /api/platform/tenants · GET /api/platform/users</span>
        <span><strong>Filters:</strong> tenant {filters.tenant_id ? 'selected' : 'all'} · type {filters.document_type || 'all'} · status {filters.status || 'all'} · search {filters.search.trim() || 'none'} · expiring {filters.expiring ? 'within 45 days' : 'all'}</span>
      </section>

      <section style={styles.linkPanel}>
        <strong>Supporting Platform pages</strong>
        <div style={styles.linkGrid}>
          <Link to="/platform/tenants" style={styles.link}>Tenants</Link>
          <Link to="/platform/users" style={styles.link}>Platform Users</Link>
          <Link to="/platform/access-reviews" style={styles.link}>Access Reviews</Link>
          <Link to="/platform/permission-audit" style={styles.link}>Permission Audit</Link>
          <Link to="/platform/audit" style={styles.link}>Audit</Link>
        </div>
      </section>

      <section style={styles.grid}>
        {[
          ['Total', summary.data?.summary.total ?? 0],
          ['Active', summary.data?.summary.active ?? 0],
          ['Needs review', summary.data?.summary.needs_review ?? 0],
          ['Expired / overdue', summary.data?.summary.expired_or_overdue ?? 0],
          ['Expiring soon', summary.data?.summary.expiring_soon ?? 0]
        ].map(([cardLabel, value]) => (
          <div key={String(cardLabel)} style={styles.stat}><span style={styles.statLabel}>{cardLabel}</span><strong style={styles.statValue}>{value}</strong></div>
        ))}
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Filters</h2>
        <div style={styles.formGrid}>
          <label style={styles.field}>Tenant<select value={filters.tenant_id} onChange={(event) => setFilters({ ...filters, tenant_id: event.target.value })} style={styles.input}>
            <option value="">All tenants</option>
            {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select></label>
          <label style={styles.field}>Document type<select value={filters.document_type} onChange={(event) => setFilters({ ...filters, document_type: event.target.value })} style={styles.input}>
            <option value="">All types</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}
          </select></label>
          <label style={styles.field}>Status<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} style={styles.input}>
            <option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select></label>
          <label style={styles.field}>Search<input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search title, notes, tenant" style={styles.input} /></label>
          <label style={styles.checkbox}><input type="checkbox" checked={filters.expiring} onChange={(event) => setFilters({ ...filters, expiring: event.target.checked })} /> Expiring within 45 days</label>
        </div>
      </section>

      {canWrite ? (
        <section id="platform-compliance-documents-form" style={styles.card}>
          <h2 style={styles.cardTitle}>{editingId ? 'Edit compliance document' : 'Add compliance document'}</h2>
          <div style={styles.formGrid}>
            <label style={styles.field}>Tenant<select value={form.tenant_id} onChange={(event) => setForm({ ...form, tenant_id: event.target.value })} style={styles.input}>
              <option value="">Platform-wide / no tenant</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select></label>
            <label style={styles.field}>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Title" style={styles.input} /></label>
            <label style={styles.field}>Document type<select value={form.document_type} onChange={(event) => setForm({ ...form, document_type: event.target.value })} style={styles.input}>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <label style={styles.field}>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} style={styles.input}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label style={styles.field}>Owner<select value={form.owner_platform_user_id} onChange={(event) => setForm({ ...form, owner_platform_user_id: event.target.value })} style={styles.input}>
              <option value="">No owner</option>
              {(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
            </select></label>
            <label style={styles.field}>External document URL<input value={form.external_url} onChange={(event) => setForm({ ...form, external_url: event.target.value })} placeholder="https://…" style={styles.input} /></label>
            <label style={styles.field}>Effective date<input type="date" value={form.effective_at} onChange={(event) => setForm({ ...form, effective_at: event.target.value })} style={styles.input} /></label>
            <label style={styles.field}>Expiry date<input type="date" value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} style={styles.input} /></label>
            <label style={{ ...styles.field, gridColumn: '1 / -1' }}>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" style={{ ...styles.input, minHeight: 80 }} /></label>
          </div>
          {documentSaveHelp ? <div style={styles.validationMessage}>{documentSaveHelp}</div> : null}
          <div style={styles.actions}>
            <button type="button" style={isSaveDisabled ? { ...styles.primaryButton, ...styles.disabledButton } : styles.primaryButton} disabled={isSaveDisabled} onClick={() => saveDocument.mutate()}>{saveDocument.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create document'}</button>
            {editingId ? <button type="button" style={styles.secondaryButton} onClick={() => { setEditingId(null); setOriginalEditForm(null); setForm(defaultForm); }}>Cancel edit</button> : null}
          </div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Documents</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Document</th><th style={styles.th}>Tenant</th><th style={styles.th}>Type</th><th style={styles.th}>Status</th><th style={styles.th}>Owner</th><th style={styles.th}>Expires</th><th style={styles.th}>Evidence</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const expiring = isExpiringSoon(row);
                return <tr key={row.id}>
                  <td style={styles.td}><strong>{row.title}</strong><br />{row.external_url ? <a href={row.external_url} target="_blank" rel="noreferrer">Open document</a> : <span style={styles.muted}>No link</span>}<br /><span style={styles.muted}>{row.notes || 'No notes'}</span></td>
                  <td style={styles.td}>{row.tenant_name || 'Platform-wide'}</td>
                  <td style={styles.td}>{label(row.document_type)}</td>
                  <td style={styles.td}><span style={badgeStyle(row.status, expiring)}>{expiring && row.status !== 'expired' ? 'expiring soon' : label(row.status)}</span></td>
                  <td style={styles.td}>{row.owner_email || '—'}</td>
                  <td style={styles.td}>{dateOnly(row.expires_at)}</td>
                  <td style={styles.td}>
                    <span style={styles.muted}>Effective: {dateOnly(row.effective_at)}</span><br />
                    <span style={styles.muted}>Reviewed: {dateTime(row.reviewed_at)} {row.reviewed_by_email ? `by ${row.reviewed_by_email}` : ''}</span><br />
                    <span style={styles.muted}>Updated: {dateTime(row.updated_at)}</span>
                  </td>
                  <td style={styles.td}>
                    {canWrite ? <div style={styles.rowActions}>
                      <button type="button" style={styles.smallButton} onClick={() => { const nextForm = formFromDocument(row); setEditingId(row.id); setOriginalEditForm(nextForm); setForm(nextForm); setStatusMessage(null); scrollToFormSection('platform-compliance-documents-form'); }}>Edit</button>
                      <button type="button" style={styles.smallButton} disabled={reviewDocument.isPending} onClick={() => { if (window.confirm('Mark this compliance document as reviewed and active?')) reviewDocument.mutate({ id: row.id, status: 'active' }); }}>Reviewed</button>
                      <button type="button" style={styles.dangerButton} disabled={archiveDocument.isPending || row.status === 'archived'} onClick={() => { if (window.confirm('Archive this compliance document? It will be removed from active evidence.')) archiveDocument.mutate(row.id); }}>Archive</button>
                    </div> : '—'}
                  </td>
                </tr>;
              })}
              {!rows.length ? <tr><td colSpan={8} style={styles.empty}>No compliance documents found.</td></tr> : null}
            </tbody>
          </table>
        </div>
        {canWrite ? <label style={{ ...styles.field, marginTop: 16 }}>Review note for next Reviewed action<input value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Optional note for next review action" style={styles.input} /></label> : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  title: { margin: 0, fontSize: 28, color: '#111827' },
  subtitle: { margin: '6px 0 0', color: '#6b7280' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  stat: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 },
  statLabel: { color: '#6b7280', fontSize: 13, display: 'block' },
  statValue: { color: '#111827', fontSize: 26 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' },
  cardTitle: { margin: '0 0 14px', fontSize: 18, color: '#111827' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  field: { display: 'grid', gap: 6, color: '#374151', fontSize: 13, fontWeight: 700 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', font: 'inherit', boxSizing: 'border-box', fontWeight: 400 },
  checkbox: { display: 'flex', gap: 8, alignItems: 'center', color: '#374151' },
  actions: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  primaryButton: { border: 0, borderRadius: 10, padding: '10px 14px', background: '#111827', color: '#fff', cursor: 'pointer' },
  secondaryButton: { border: '1px solid #d1d5db', borderRadius: 10, padding: '9px 12px', background: '#fff', color: '#111827', cursor: 'pointer' },
  disabledButton: { opacity: 0.5, cursor: 'not-allowed' },
  smallButton: { border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 9px', background: '#fff', cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 8, padding: '7px 9px', background: '#fff1f2', color: '#be123c', cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e5e7eb', color: '#374151', fontSize: 13 },
  td: { padding: '12px 8px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top', color: '#111827' },
  muted: { color: '#6b7280', fontSize: 13 },
  badgeGood: { display: 'inline-flex', borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#166534' },
  badgeMuted: { display: 'inline-flex', borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 700, background: '#e5e7eb', color: '#374151' },
  badgeDanger: { display: 'inline-flex', borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#991b1b' },
  badgeWarn: { display: 'inline-flex', borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 700, background: '#fef3c7', color: '#92400e' },
  badgeInfo: { display: 'inline-flex', borderRadius: 999, padding: '3px 8px', fontSize: 12, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8' },
  rowActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  empty: { padding: 24, textAlign: 'center', color: '#6b7280' },
  errorPanel: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 14, padding: 14 },
  successPanel: { border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 14, padding: 12, fontWeight: 700 },
  validationMessage: { border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', borderRadius: 12, padding: 10, marginTop: 12 },
  metaPanel: { display: 'grid', gap: 6, border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 14, padding: 12, color: '#374151', fontSize: 13 },
  linkPanel: { display: 'grid', gap: 10, border: '1px solid #dbeafe', background: '#eff6ff', borderRadius: 14, padding: 12, color: '#1e3a8a' },
  linkGrid: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  link: { color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' }
};
