import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

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

const policies = ['standard', 'extended', 'contractual', 'delete_after_offboarding', 'custom'];

export default function PlatformDataRetentionPage() {
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_WRITE);
  const [rows, setRows] = useState<RetentionRow[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [legalHold, setLegalHold] = useState('');
  const [dueOnly, setDueOnly] = useState('false');
  const [editing, setEditing] = useState<RetentionRow | null>(null);
  const [form, setForm] = useState({ retention_policy: 'standard', retain_until: '', legal_hold: false, legal_hold_reason: '', purge_after_offboarding: false, notes: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const summary = useMemo(() => ({
    total: rows.length,
    legalHolds: rows.filter((r) => r.legal_hold).length,
    due: rows.filter((r) => r.retention_due).length,
    purgeAfterOffboarding: rows.filter((r) => r.purge_after_offboarding).length
  }), [rows]);

  const load = async () => {
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load data retention policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const startEdit = (row: RetentionRow) => {
    setEditing(row);
    scrollToFormSection('platform-data-retention-form');
    setForm({
      retention_policy: row.retention_policy || 'standard',
      retain_until: row.retain_until ? row.retain_until.slice(0, 10) : '',
      legal_hold: Boolean(row.legal_hold),
      legal_hold_reason: row.legal_hold_reason || '',
      purge_after_offboarding: Boolean(row.purge_after_offboarding),
      notes: row.notes || ''
    });
  };

  const save = async () => {
    if (!editing) return;
    setMessage('');
    setError('');
    try {
      await platformApiRequest(`/platform/data-retention/${editing.tenant_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          retention_policy: form.retention_policy,
          retain_until: form.retain_until || null,
          legal_hold: form.legal_hold,
          legal_hold_reason: form.legal_hold_reason || null,
          purge_after_offboarding: form.purge_after_offboarding,
          notes: form.notes || null
        })
      });
      setEditing(null);
      setMessage('Retention policy updated.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save retention policy');
    }
  };

  const clearLegalHold = async (row: RetentionRow) => {
    const reason = window.prompt('Reason for clearing legal hold?') || '';
    setError('');
    setMessage('');
    try {
      await platformApiRequest(`/platform/data-retention/${row.tenant_id}/clear-legal-hold`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      setMessage('Legal hold cleared.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to clear legal hold');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <header>
        <h1>Data retention</h1>
        <p style={{ color: '#6b7280' }}>Control tenant retention policy, legal hold, and purge-after-offboarding intent.</p>
      </header>

      <section style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <Metric label="Rows" value={summary.total} />
          <Metric label="Legal holds" value={summary.legalHolds} />
          <Metric label="Due" value={summary.due} />
          <Metric label="Purge after offboarding" value={summary.purgeAfterOffboarding} />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <label>Tenant ID<input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="optional tenant UUID" style={inputStyle} /></label>
          <label>Legal hold<select value={legalHold} onChange={(e) => setLegalHold(e.target.value)} style={inputStyle}><option value="">Any</option><option value="true">Yes</option><option value="false">No</option></select></label>
          <label>Due only<select value={dueOnly} onChange={(e) => setDueOnly(e.target.value)} style={inputStyle}><option value="false">No</option><option value="true">Yes</option></select></label>
          <button onClick={load} disabled={loading} style={buttonStyle}>{loading ? 'Loading…' : 'Apply'}</button>
        </div>
      </section>

      {message ? <div style={successStyle}>{message}</div> : null}
      {error ? <div style={errorStyle}>{error}</div> : null}

      <section style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><Th>Tenant</Th><Th>Status</Th><Th>Policy</Th><Th>Retain until</Th><Th>Legal hold</Th><Th>Offboarding purge</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.tenant_id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <Td><strong>{row.tenant_name}</strong><br /><small>{row.tenant_id}</small></Td>
                <Td>{row.tenant_status}{row.write_locked ? ' / locked' : ''}</Td>
                <Td>{row.retention_policy}</Td>
                <Td>{row.retain_until ? new Date(row.retain_until).toLocaleDateString() : '—'}{row.retention_due ? <div style={{ color: '#b45309' }}>Due</div> : null}</Td>
                <Td>{row.legal_hold ? <strong style={{ color: '#b91c1c' }}>Active</strong> : 'No'}{row.legal_hold_reason ? <div><small>{row.legal_hold_reason}</small></div> : null}</Td>
                <Td>{row.purge_after_offboarding ? 'Yes' : 'No'}{row.purge_blocked ? <div><small>blocked by legal hold</small></div> : null}</Td>
                <Td>
                  {canWrite ? <button onClick={() => startEdit(row)} style={smallButtonStyle}>Edit</button> : null}
                  {canWrite && row.legal_hold ? <button onClick={() => clearLegalHold(row)} style={{ ...smallButtonStyle, marginLeft: 8 }}>Clear hold</button> : null}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <label>Policy<select value={form.retention_policy} onChange={(e) => setForm((f) => ({ ...f, retention_policy: e.target.value }))} style={inputStyle}>{policies.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
            <label>Retain until<input type="date" value={form.retain_until} onChange={(e) => setForm((f) => ({ ...f, retain_until: e.target.value }))} style={inputStyle} /></label>
            <label><input type="checkbox" checked={form.legal_hold} onChange={(e) => setForm((f) => ({ ...f, legal_hold: e.target.checked }))} /> Legal hold</label>
            <label><input type="checkbox" checked={form.purge_after_offboarding} onChange={(e) => setForm((f) => ({ ...f, purge_after_offboarding: e.target.checked }))} /> Purge after offboarding</label>
            <label style={{ gridColumn: '1 / -1' }}>Legal hold reason<input value={form.legal_hold_reason} onChange={(e) => setForm((f) => ({ ...f, legal_hold_reason: e.target.value }))} style={inputStyle} /></label>
            <label style={{ gridColumn: '1 / -1' }}>Notes<textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 80 }} /></label>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}><button onClick={save} style={buttonStyle}>Save</button><button onClick={() => setEditing(null)} style={secondaryButtonStyle}>Cancel</button></div>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}><div style={{ color: '#6b7280' }}>{label}</div><div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div></div>; }
function Th({ children }: { children: ReactNode }) { return <th style={{ textAlign: 'left', padding: 10 }}>{children}</th>; }
function Td({ children, colSpan }: { children: ReactNode; colSpan?: number }) { return <td colSpan={colSpan} style={{ padding: 10, verticalAlign: 'top' }}>{children}</td>; }

const cardStyle: CSSProperties = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const inputStyle: CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', marginTop: 6 };
const buttonStyle: CSSProperties = { padding: '10px 14px', borderRadius: 10, border: 0, background: '#111827', color: '#fff', cursor: 'pointer' };
const secondaryButtonStyle: CSSProperties = { ...buttonStyle, background: '#6b7280' };
const smallButtonStyle: CSSProperties = { padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' };
const successStyle: CSSProperties = { ...cardStyle, color: '#065f46', background: '#ecfdf5' };
const errorStyle: CSSProperties = { ...cardStyle, color: '#991b1b', background: '#fef2f2' };
