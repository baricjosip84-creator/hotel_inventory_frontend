import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties, ReactNode } from 'react';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

type TenantRow = { id: string; name: string; status?: string; plan_code?: string };

type RetentionRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  write_locked: boolean;
  retention_policy: string;
  retain_until: string | null;
  legal_hold: boolean;
  legal_hold_reason: string | null;
  legal_hold_set_at: string | null;
  legal_hold_set_by_email: string | null;
  purge_after_offboarding: boolean;
  notes: string | null;
  retention_due: boolean;
  purge_blocked: boolean;
};

type RetentionForm = {
  retention_policy: string;
  retain_until: string;
  legal_hold: boolean;
  legal_hold_reason: string;
  purge_after_offboarding: boolean;
  notes: string;
};

const policies = ['standard', 'extended', 'contractual', 'delete_after_offboarding', 'custom'];

function readableError(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

function validDateInput(value: string) {
  return !value || !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function formFromRow(row: RetentionRow): RetentionForm {
  return {
    retention_policy: row.retention_policy || 'standard',
    retain_until: row.retain_until ? row.retain_until.slice(0, 10) : '',
    legal_hold: Boolean(row.legal_hold),
    legal_hold_reason: row.legal_hold_reason || '',
    purge_after_offboarding: Boolean(row.purge_after_offboarding),
    notes: row.notes || ''
  };
}

function normalizeForm(form: RetentionForm) {
  return {
    retention_policy: form.retention_policy,
    retain_until: form.retain_until || '',
    legal_hold: Boolean(form.legal_hold),
    legal_hold_reason: form.legal_hold_reason.trim(),
    purge_after_offboarding: Boolean(form.purge_after_offboarding),
    notes: form.notes.trim()
  };
}

function SourceLink({ href, children }: { href: string; children: string }) {
  return <a href={href} style={sourceLinkStyle}>{children}</a>;
}

export default function PlatformDataRetentionPage() {
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_WRITE);
  const [rows, setRows] = useState<RetentionRow[]>([]);
  const [tenantId, setTenantId] = useState('');
  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants', 'data-retention-filter'],
    queryFn: () => platformApiRequest<TenantRow[]>('/platform/tenants')
  });
  const [legalHold, setLegalHold] = useState('');
  const [dueOnly, setDueOnly] = useState('false');
  const [editing, setEditing] = useState<RetentionRow | null>(null);
  const [form, setForm] = useState<RetentionForm>({ retention_policy: 'standard', retain_until: '', legal_hold: false, legal_hold_reason: '', purge_after_offboarding: false, notes: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const selectedTenant = useMemo(
    () => (tenantsQuery.data || []).find((tenant) => tenant.id === tenantId) || null,
    [tenantId, tenantsQuery.data]
  );

  const summary = useMemo(() => ({
    total: rows.length,
    legalHolds: rows.filter((r) => r.legal_hold).length,
    due: rows.filter((r) => r.retention_due).length,
    purgeAfterOffboarding: rows.filter((r) => r.purge_after_offboarding).length,
    purgeBlocked: rows.filter((r) => r.purge_blocked).length,
    writeLocked: rows.filter((r) => r.write_locked).length
  }), [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (tenantId.trim()) params.set('tenant_id', tenantId.trim());
      if (legalHold) params.set('legal_hold', legalHold);
      if (dueOnly === 'true') params.set('due_only', 'true');
      params.set('limit', '200');
      const data = await platformApiRequest<RetentionRow[]>(`/platform/data-retention?${params.toString()}`);
      setRows(data || []);
      setLoadedAt(new Date().toISOString());
    } catch (err) {
      setError(readableError(err) || 'Failed to load data retention policies');
    } finally {
      setLoading(false);
    }
  }, [dueOnly, legalHold, tenantId]);

  useEffect(() => { void load(); }, [load]);

  const startEdit = (row: RetentionRow) => {
    setEditing(row);
    scrollToFormSection('platform-data-retention-form');
    setForm(formFromRow(row));
    setMessage('');
    setError('');
  };

  const currentForm = normalizeForm(form);
  const originalForm = editing ? normalizeForm(formFromRow(editing)) : null;
  const formChanged = Boolean(originalForm && JSON.stringify(currentForm) !== JSON.stringify(originalForm));
  const legalHoldReasonMissing = currentForm.legal_hold && !currentForm.legal_hold_reason;
  const retainUntilInvalid = !validDateInput(currentForm.retain_until);
  const saveDisabled = !editing || !formChanged || legalHoldReasonMissing || retainUntilInvalid;

  const save = async () => {
    if (!editing || saveDisabled) return;
    setMessage('');
    setError('');
    try {
      await platformApiRequest(`/platform/data-retention/${editing.tenant_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          retention_policy: currentForm.retention_policy,
          retain_until: currentForm.retain_until || null,
          legal_hold: currentForm.legal_hold,
          legal_hold_reason: currentForm.legal_hold_reason || null,
          purge_after_offboarding: currentForm.purge_after_offboarding,
          notes: currentForm.notes || null
        })
      });
      setEditing(null);
      setMessage(`Retention policy updated for ${editing.tenant_name}.`);
      await load();
    } catch (err) {
      setError(readableError(err) || 'Failed to save retention policy');
    }
  };

  const clearLegalHold = async (row: RetentionRow) => {
    if (!window.confirm(`Clear legal hold for ${row.tenant_name}? This should only be done after the legal hold is no longer required.`)) return;
    const reason = (window.prompt('Reason for clearing legal hold?') || '').trim();
    if (!reason) {
      setError('Clear hold reason is required before the legal hold can be cleared.');
      return;
    }
    setError('');
    setMessage('');
    try {
      await platformApiRequest(`/platform/data-retention/${row.tenant_id}/clear-legal-hold`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      setMessage(`Legal hold cleared for ${row.tenant_name}.`);
      await load();
    } catch (err) {
      setError(readableError(err) || 'Failed to clear legal hold');
    }
  };

  const retryLoad = () => {
    void tenantsQuery.refetch();
    void load();
  };

  const filtersLabel = `Tenant: ${selectedTenant?.name || 'All tenants'} · Legal hold: ${legalHold || 'Any'} · Due only: ${dueOnly === 'true' ? 'Yes' : 'No'}`;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Data retention</h1>
          <p style={subtitleStyle}>Control tenant retention policy, legal hold, and purge-after-offboarding intent.</p>
          <div style={metaRowStyle}>
            <span style={metaPillStyle}>Source: /platform/data-retention</span>
            <span style={metaPillStyle}>Limit: 200</span>
            <span style={metaPillStyle}>{filtersLabel}</span>
            <span style={metaPillStyle}>Snapshot: {loadedAt ? formatDateTime(loadedAt) : 'not loaded'}</span>
          </div>
        </div>
        <button type="button" onClick={retryLoad} disabled={loading || tenantsQuery.isFetching} style={buttonStyle}>{loading || tenantsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button>
      </header>

      {(error || tenantsQuery.error) ? (
        <section style={errorStyle}>
          <strong>Unable to load data retention evidence.</strong>
          <p style={subtitleStyle}>{error || readableError(tenantsQuery.error)}</p>
          <button type="button" onClick={retryLoad} disabled={loading || tenantsQuery.isFetching} style={buttonStyle}>Retry</button>
        </section>
      ) : null}

      <section style={cardStyle}>
        <strong>Supporting Platform pages</strong>
        <div style={linkRowStyle}>
          <SourceLink href="/platform/tenant-offboarding">Tenant Offboarding</SourceLink>
          <SourceLink href="/platform/tenant-exports">Tenant Exports</SourceLink>
          <SourceLink href="/platform/compliance-documents">Compliance Docs</SourceLink>
          <SourceLink href="/platform/legal-compliance-reporting">Legal & Compliance Reporting</SourceLink>
          <SourceLink href="/platform/audit">Audit Trail</SourceLink>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          <Metric label="Rows" value={summary.total} />
          <Metric label="Legal holds" value={summary.legalHolds} />
          <Metric label="Due" value={summary.due} />
          <Metric label="Purge after offboarding" value={summary.purgeAfterOffboarding} />
          <Metric label="Purge blocked" value={summary.purgeBlocked} />
          <Metric label="Write locked" value={summary.writeLocked} />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <label>Tenant<select value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={inputStyle} disabled={tenantsQuery.isLoading}>
            <option value="">{tenantsQuery.isLoading ? 'Loading tenants…' : 'All tenants'}</option>
            {(tenantsQuery.data || []).map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.status || 'unknown'} · {tenant.plan_code || 'no plan'}</option>
            ))}
          </select></label>
          <label>Legal hold<select value={legalHold} onChange={(e) => setLegalHold(e.target.value)} style={inputStyle}><option value="">Any</option><option value="true">Yes</option><option value="false">No</option></select></label>
          <label>Due only<select value={dueOnly} onChange={(e) => setDueOnly(e.target.value)} style={inputStyle}><option value="false">No</option><option value="true">Yes</option></select></label>
          <button onClick={load} disabled={loading} style={buttonStyle}>{loading ? 'Loading…' : 'Apply'}</button>
        </div>
        <p style={helpStyle}>Filters are backend-supported. Due means retain_until is set and has reached the current time.</p>
      </section>

      {message ? <div style={successStyle}>{message}</div> : null}

      <section style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><Th>Tenant</Th><Th>Status</Th><Th>Policy</Th><Th>Retain until</Th><Th>Legal hold</Th><Th>Offboarding purge</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.tenant_id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <Td><strong>{row.tenant_name}</strong><br /><small>{row.tenant_id}</small><div style={linkRowStyle}><SourceLink href={`/platform/tenant-lifecycle?tenant_id=${row.tenant_id}`}>Lifecycle</SourceLink><SourceLink href={`/platform/tenant-offboarding?tenant_id=${row.tenant_id}`}>Offboarding</SourceLink><SourceLink href={`/platform/tenant-exports?tenant_id=${row.tenant_id}`}>Export evidence</SourceLink></div></Td>
                <Td>{row.tenant_status}{row.write_locked ? ' / locked' : ''}</Td>
                <Td>{row.retention_policy}</Td>
                <Td>{formatDate(row.retain_until)}{row.retention_due ? <div style={warningTextStyle}>Due</div> : null}</Td>
                <Td>{row.legal_hold ? <strong style={{ color: '#b91c1c' }}>Active</strong> : 'No'}{row.legal_hold_reason ? <div><small>{row.legal_hold_reason}</small></div> : null}{row.legal_hold_set_at ? <div><small>Set {formatDateTime(row.legal_hold_set_at)}{row.legal_hold_set_by_email ? ` by ${row.legal_hold_set_by_email}` : ''}</small></div> : null}</Td>
                <Td>{row.purge_after_offboarding ? 'Yes' : 'No'}{row.purge_blocked ? <div><small>blocked by legal hold</small></div> : null}</Td>
                <Td>
                  {canWrite ? <button onClick={() => startEdit(row)} style={smallButtonStyle}>Edit</button> : null}
                  {canWrite && row.legal_hold ? <button onClick={() => clearLegalHold(row)} style={{ ...smallButtonStyle, marginLeft: 8 }}>Clear hold</button> : null}
                  {!canWrite ? <span style={helpStyle}>Read only</span> : null}
                </Td>
              </tr>
            ))}
            {!rows.length ? <tr><Td colSpan={7}>No retention records found.</Td></tr> : null}
          </tbody>
        </table>
      </section>

      {editing ? (
        <section id="platform-data-retention-form" style={cardStyle}>
          <h2>Edit retention: {editing.tenant_name}</h2>
          <p style={helpStyle}>Backend requires a legal hold reason when Legal hold is active. Save is disabled for unchanged or invalid edits.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <label>Policy<select value={form.retention_policy} onChange={(e) => setForm((f) => ({ ...f, retention_policy: e.target.value }))} style={inputStyle}>{policies.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
            <label>Retain until<input type="date" value={form.retain_until} onChange={(e) => setForm((f) => ({ ...f, retain_until: e.target.value }))} style={inputStyle} /></label>
            <label><input type="checkbox" checked={form.legal_hold} onChange={(e) => setForm((f) => ({ ...f, legal_hold: e.target.checked }))} /> Legal hold</label>
            <label><input type="checkbox" checked={form.purge_after_offboarding} onChange={(e) => setForm((f) => ({ ...f, purge_after_offboarding: e.target.checked }))} /> Purge after offboarding</label>
            <label style={{ gridColumn: '1 / -1' }}>Legal hold reason<input value={form.legal_hold_reason} onChange={(e) => setForm((f) => ({ ...f, legal_hold_reason: e.target.value }))} style={inputStyle} /></label>
            <label style={{ gridColumn: '1 / -1' }}>Notes<textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 80 }} /></label>
          </div>
          {legalHoldReasonMissing ? <p style={warningTextStyle}>Legal hold reason is required when Legal hold is active.</p> : null}
          {retainUntilInvalid ? <p style={warningTextStyle}>Retain until must be a valid date.</p> : null}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}><button onClick={save} disabled={saveDisabled} style={saveDisabled ? disabledButtonStyle : buttonStyle}>Save</button><button onClick={() => setEditing(null)} style={secondaryButtonStyle}>Cancel</button></div>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}><div style={{ color: '#6b7280' }}>{label}</div><div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div></div>; }
function Th({ children }: { children: ReactNode }) { return <th style={{ textAlign: 'left', padding: 10 }}>{children}</th>; }
function Td({ children, colSpan }: { children: ReactNode; colSpan?: number }) { return <td colSpan={colSpan} style={{ padding: 10, verticalAlign: 'top' }}>{children}</td>; }

const cardStyle: CSSProperties = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const headerStyle: CSSProperties = { ...cardStyle, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' };
const titleStyle: CSSProperties = { margin: 0 };
const subtitleStyle: CSSProperties = { color: '#6b7280', marginTop: 6 };
const helpStyle: CSSProperties = { color: '#6b7280', fontSize: 13 };
const metaRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 };
const metaPillStyle: CSSProperties = { border: '1px solid #d1d5db', borderRadius: 999, padding: '4px 8px', fontSize: 12, color: '#374151', background: '#f9fafb' };
const linkRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 };
const sourceLinkStyle: CSSProperties = { color: '#1d4ed8', textDecoration: 'none', fontSize: 13, fontWeight: 600 };
const inputStyle: CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', marginTop: 6 };
const buttonStyle: CSSProperties = { padding: '10px 14px', borderRadius: 10, border: 0, background: '#111827', color: '#fff', cursor: 'pointer' };
const disabledButtonStyle: CSSProperties = { ...buttonStyle, background: '#9ca3af', cursor: 'not-allowed' };
const secondaryButtonStyle: CSSProperties = { ...buttonStyle, background: '#6b7280' };
const smallButtonStyle: CSSProperties = { padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' };
const warningTextStyle: CSSProperties = { color: '#b45309', fontSize: 13 };
const successStyle: CSSProperties = { ...cardStyle, color: '#065f46', background: '#ecfdf5' };
const errorStyle: CSSProperties = { ...cardStyle, color: '#991b1b', background: '#fef2f2' };
