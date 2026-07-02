import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type ApiKey = {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  name: string;
  description?: string | null;
  key_prefix: string;
  scopes: string[];
  allowed_ips: string[];
  expires_at?: string | null;
  last_used_at?: string | null;
  last_used_ip?: string | null;
  revoked_at?: string | null;
  revoke_reason?: string | null;
  is_active: boolean;
  is_expired: boolean;
  created_at: string;
  created_by_email?: string | null;
  revoked_by_email?: string | null;
};
type ApiKeysResponse = { api_keys: ApiKey[]; scopes: string[] };
type CreateResponse = { api_key: ApiKey; secret: string; warning: string };

const defaultForm = { tenant_id: '', name: '', description: '', scopes: ['tenant.read'], allowed_ips: '', expires_at: '' };

function trimOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function parseAllowedIps(value: string): string[] {
  return [...new Set(value.split(',').map((ip) => ip.trim()).filter(Boolean))];
}

function statusLabel(key: ApiKey) {
  if (key.revoked_at) return 'revoked';
  if (key.is_expired) return 'expired';
  return 'active';
}

function badgeStyle(key: ApiKey): CSSProperties {
  const status = statusLabel(key);
  if (status === 'active') return { ...styles.badge, background: '#dcfce7', color: '#166534' };
  if (status === 'expired') return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
}

function activeFilterLabel(filters: { tenant_id: string; search: string; include_revoked: boolean }, tenants?: Tenant[]): string {
  const tenantName = tenants?.find((tenant) => tenant.id === filters.tenant_id)?.name;
  const parts = [
    filters.tenant_id ? `tenant=${tenantName || filters.tenant_id}` : null,
    filters.search.trim() ? `search="${filters.search.trim()}"` : null,
    filters.include_revoked ? 'include revoked' : null
  ].filter(Boolean);
  return parts.length ? parts.join(' | ') : 'No filters active';
}

function auditLinkFor(key: ApiKey): string {
  const params = new URLSearchParams({ target_type: 'platform_api_key', target_id: key.id });
  return `/platform/audit?${params.toString()}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function PlatformApiKeysPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_WRITE);
  const [filters, setFilters] = useState({ tenant_id: '', search: '', include_revoked: false });
  const [form, setForm] = useState(defaultForm);
  const [newSecret, setNewSecret] = useState<CreateResponse | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.include_revoked) params.set('include_revoked', 'true');
    params.set('limit', '200');
    return params.toString();
  }, [filters]);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'api-key-picker'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const apiKeys = useQuery({ queryKey: ['platform', 'api-keys', filters], queryFn: () => platformApiRequest<ApiKeysResponse>(`/platform/api-keys?${queryString}`) });

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', 'api-key-picker'] });
    void queryClient.invalidateQueries({ queryKey: ['platform', 'api-keys'] });
  };

  const createKey = useMutation({
    mutationFn: () => platformApiRequest<CreateResponse>('/platform/api-keys', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: form.tenant_id,
        name: form.name.trim(),
        description: trimOptional(form.description),
        scopes: form.scopes,
        allowed_ips: parseAllowedIps(form.allowed_ips),
        expires_at: form.expires_at || null
      })
    }),
    onSuccess: (data) => {
      setNewSecret(data);
      setStatusMessage('API key created. Copy the one-time secret before clearing the panel.');
      setForm(defaultForm);
      queryClient.invalidateQueries({ queryKey: ['platform', 'api-keys'] });
    }
  });

  const revokeKey = useMutation({
    mutationFn: (apiKeyId: string) => platformApiRequest(`/platform/api-keys/${apiKeyId}/revoke`, { method: 'POST', body: JSON.stringify({ reason: trimOptional(revokeReason) }) }),
    onSuccess: () => {
      setStatusMessage('API key revoked successfully.');
      setRevokeReason('');
      queryClient.invalidateQueries({ queryKey: ['platform', 'api-keys'] });
    }
  });

  const rotateKey = useMutation({
    mutationFn: (apiKeyId: string) => platformApiRequest<CreateResponse>(`/platform/api-keys/${apiKeyId}/rotate`, { method: 'POST' }),
    onSuccess: (data) => {
      setNewSecret(data);
      setStatusMessage('API key rotated. Copy the new one-time secret before clearing the panel.');
      queryClient.invalidateQueries({ queryKey: ['platform', 'api-keys'] });
    }
  });

  const scopes = apiKeys.data?.scopes || [];
  const rows = apiKeys.data?.api_keys || [];
  const canCreateKey = Boolean(form.tenant_id && form.name.trim() && form.scopes.length);
  const createDisabledReason = !form.tenant_id
    ? 'Select a tenant before creating an API key.'
    : !form.name.trim()
      ? 'Enter an integration name before creating an API key.'
      : !form.scopes.length
        ? 'Select at least one scope before creating an API key.'
        : '';
  const loadError = tenants.error || apiKeys.error;
  const isMutating = createKey.isPending || revokeKey.isPending || rotateKey.isPending;
  const snapshotText = `Source: /platform/api-keys + /platform/tenants | Limit: 200 | ${activeFilterLabel(filters, tenants.data)}`;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>API keys</h1>
          <p style={styles.subtitle}>Create and control tenant integration keys without exposing the full platform account.</p>
        </div>
        <div style={styles.actions}>
          <button type="button" style={styles.secondaryButton} onClick={refreshAll}>Refresh</button>
          <Link style={styles.linkButton} to="/platform/tenants">Tenants</Link>
          <Link style={styles.linkButton} to="/platform/webhooks">Webhooks</Link>
          <Link style={styles.linkButton} to="/platform/integrations">Integrations</Link>
          <Link style={styles.linkButton} to="/platform/audit">Platform audit</Link>
        </div>
      </header>

      {loadError ? (
        <section style={styles.errorPanel}>
          <strong>API key data could not be loaded.</strong>
          <p style={styles.help}>Retry reloads tenants and the filtered API key list.</p>
          <button type="button" style={styles.secondaryButton} onClick={refreshAll}>Retry</button>
        </section>
      ) : null}

      <section style={styles.metaPanel}>
        <strong>Snapshot metadata</strong>
        <span>{snapshotText}</span>
        <span>Visible keys: {rows.length} | Available scopes: {scopes.length}</span>
      </section>

      {statusMessage ? <p style={styles.successText}>{statusMessage}</p> : null}

      {newSecret ? (
        <section style={{ ...styles.card, borderColor: '#f59e0b' }}>
          <h2 style={styles.cardTitle}>Copy secret now</h2>
          <p style={styles.help}>{newSecret.warning}</p>
          <code style={styles.secret}>{newSecret.secret}</code>
          <button type="button" style={styles.secondaryButton} onClick={() => setNewSecret(null)}>I copied it</button>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Filters</h2>
        <div style={styles.grid}>
          <label style={styles.field}>Tenant<select style={styles.input} value={filters.tenant_id} onChange={(event) => setFilters((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <label style={styles.field}>Search<input style={styles.input} value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Name, description, tenant" /></label>
          <label style={styles.checkbox}><input type="checkbox" checked={filters.include_revoked} onChange={(event) => setFilters((current) => ({ ...current, include_revoked: event.target.checked }))} /> Include revoked</label>
        </div>
      </section>

      {canWrite ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Create tenant API key</h2>
          <div style={styles.grid}>
            <label style={styles.field}>Tenant<select style={styles.input} value={form.tenant_id} onChange={(event) => setForm((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">Select tenant</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
            <label style={styles.field}>Name<input style={styles.input} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Integration name" /></label>
            <label style={styles.field}>Expires at<input style={styles.input} type="datetime-local" value={form.expires_at} onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))} /></label>
            <label style={styles.field}>Allowed IPs<input style={styles.input} value={form.allowed_ips} onChange={(event) => setForm((current) => ({ ...current, allowed_ips: event.target.value }))} placeholder="Comma separated, optional" /></label>
          </div>
          <label style={styles.field}>Description<textarea style={styles.textarea} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <div style={styles.scopeGrid}>{scopes.map((scope) => <label key={scope} style={styles.checkbox}><input type="checkbox" checked={form.scopes.includes(scope)} onChange={(event) => setForm((current) => ({ ...current, scopes: event.target.checked ? [...current.scopes, scope] : current.scopes.filter((item) => item !== scope) }))} /> {scope}</label>)}</div>
          {createDisabledReason ? <p style={styles.validation}>{createDisabledReason}</p> : null}
          <button
            type="button"
            style={createKey.isPending || !canCreateKey ? styles.primaryButtonDisabled : styles.primaryButton}
            disabled={createKey.isPending || !canCreateKey}
            onClick={() => createKey.mutate()}
          >
            Create key
          </button>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Keys</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Tenant</th><th style={styles.th}>Name</th><th style={styles.th}>Prefix</th><th style={styles.th}>Scopes</th><th style={styles.th}>Last used</th><th style={styles.th}>Status</th><th style={styles.th}>Evidence</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>
              {rows.map((key) => (
                <tr key={key.id}>
                  <td style={styles.td}>{key.tenant_name || key.tenant_id}</td>
                  <td style={styles.td}><strong>{key.name}</strong><br /><span style={styles.help}>{key.description || 'No description'}</span><br /><span style={styles.help}>Created: {formatDateTime(key.created_at)}{key.created_by_email ? ` by ${key.created_by_email}` : ''}</span></td>
                  <td style={styles.td}><code>{key.key_prefix}…</code></td>
                  <td style={styles.td}>{key.scopes.join(', ')}</td>
                  <td style={styles.td}>{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}{key.last_used_ip ? ` from ${key.last_used_ip}` : ''}</td>
                  <td style={styles.td}><span style={badgeStyle(key)}>{statusLabel(key)}</span>{key.revoke_reason ? <><br /><span style={styles.help}>Reason: {key.revoke_reason}</span></> : null}</td>
                  <td style={styles.td}><div style={styles.actions}><Link style={styles.inlineLink} to={auditLinkFor(key)}>Audit evidence</Link>{key.tenant_id ? <Link style={styles.inlineLink} to={`/platform/tenants?tenant_id=${key.tenant_id}`}>Tenant source</Link> : null}</div></td>
                  <td style={styles.td}>{canWrite && !key.revoked_at ? <div style={styles.actions}><button type="button" style={styles.secondaryButton} disabled={isMutating} onClick={() => window.confirm('Rotate this API key? The old secret will stop being usable after rotation.') && rotateKey.mutate(key.id)}>Rotate</button><input style={styles.reasonInput} value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} placeholder="Revoke reason" /><button type="button" style={styles.dangerButton} disabled={isMutating} onClick={() => window.confirm('Revoke this API key? This disables the integration key.') && revokeKey.mutate(key.id)}>Revoke</button></div> : '—'}</td>
                </tr>
              ))}
              {!rows.length ? <tr><td style={styles.td} colSpan={8}>No API keys found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '28px' },
  subtitle: { margin: '6px 0 0', color: '#6b7280' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 2px rgba(15,23,42,.06)' },
  metaPanel: { display: 'grid', gap: 4, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, color: '#374151' },
  errorPanel: { display: 'grid', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: 14, color: '#7f1d1d' },
  cardTitle: { margin: '0 0 12px', fontSize: '18px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  scopeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', margin: '12px 0' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 700, color: '#374151' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '8px', color: '#374151' },
  input: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '10px 12px' },
  textarea: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '10px 12px', minHeight: '72px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '10px', verticalAlign: 'top' },
  badge: { borderRadius: '999px', padding: '4px 8px', fontSize: '12px', fontWeight: 800 },
  help: { color: '#6b7280', fontSize: '12px' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  primaryButton: { border: 0, borderRadius: '10px', padding: '10px 14px', background: '#111827', color: '#fff', cursor: 'pointer', marginTop: '12px' },
  primaryButtonDisabled: { border: 0, borderRadius: '10px', padding: '10px 14px', background: '#9ca3af', color: '#fff', cursor: 'not-allowed', marginTop: '12px', opacity: 0.75 },
  validation: { margin: '12px 0 0', color: '#991b1b', fontWeight: 700 },
  successText: { color: '#166534', fontWeight: 700, margin: 0 },
  secondaryButton: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '8px 10px', background: '#fff', cursor: 'pointer' },
  linkButton: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '8px 10px', background: '#fff', color: '#111827', cursor: 'pointer', textDecoration: 'none' },
  inlineLink: { color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' },
  dangerButton: { border: 0, borderRadius: '10px', padding: '8px 10px', background: '#dc2626', color: '#fff', cursor: 'pointer' },
  reasonInput: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '8px 10px', minWidth: '140px' },
  secret: { display: 'block', background: '#111827', color: '#fff', padding: '12px', borderRadius: '10px', marginBottom: '12px', overflowWrap: 'anywhere' }
};
