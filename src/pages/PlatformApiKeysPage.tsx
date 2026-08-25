import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformApiKeysPage.css';

type Tenant = { id: string; name: string };
type Pagination = { limit: number; offset: number; has_more: boolean };
type EvidenceAccess = { tenant: boolean; platform_user_identity: boolean };
type PublicApiContract = {
  base_path: string;
  new_key_format: string;
  legacy_hla_format_recognized: boolean;
  allowed_ips_enforced_for_platform_keys: boolean;
};
type ApiKey = {
  id: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  name: string;
  description?: string | null;
  key_prefix: string;
  scopes: string[];
  unsupported_scopes?: string[];
  public_api_compatible?: boolean;
  allowed_ips: string[];
  expires_at?: string | null;
  last_used_at?: string | null;
  last_used_ip?: string | null;
  revoked_at?: string | null;
  revoke_reason?: string | null;
  is_active: boolean;
  is_expired: boolean;
  created_at: string;
  updated_at?: string | null;
  created_by_email?: string | null;
  revoked_by_email?: string | null;
};
type ApiKeysResponse = {
  api_keys: ApiKey[];
  scopes: string[];
  evidence_access: EvidenceAccess;
  pagination: Pagination;
  public_api_contract: PublicApiContract;
};
type CreateResponse = { api_key: ApiKey; secret: string; warning: string; public_api_base_path: string };
type KeyDraft = { name: string; description: string; scopes: string[]; allowed_ips: string; expires_at: string };
type CreateDraft = KeyDraft & { tenant_id: string };

const PAGE_SIZE = 50;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emptyCreateDraft = (): CreateDraft => ({ tenant_id: '', name: '', description: '', scopes: ['products:read'], allowed_ips: '', expires_at: '' });

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}
function trimOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}
function parseAllowedIps(value: string): string[] {
  return [...new Set(value.split(',').map((ip) => ip.trim()).filter(Boolean))];
}
function dateTime(value?: string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}
function toLocalDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function statusLabel(key: ApiKey) {
  if (key.revoked_at) return 'Revoked';
  if (key.is_expired) return 'Expired';
  return 'Active';
}
function statusTone(key: ApiKey) {
  if (key.revoked_at) return 'danger';
  if (key.is_expired) return 'warn';
  return 'good';
}
function keyToDraft(key: ApiKey): KeyDraft {
  return {
    name: key.name || '',
    description: key.description || '',
    scopes: [...(key.scopes || [])],
    allowed_ips: (key.allowed_ips || []).join(', '),
    expires_at: toLocalDateTimeInput(key.expires_at)
  };
}
function auditLinkFor(key: ApiKey) {
  const params = new URLSearchParams({ target_type: 'platform_api_key', target_id: key.id });
  return `/platform/audit?${params.toString()}`;
}

export default function PlatformApiKeysPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_WRITE);
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadWebhooks = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_READ);
  const canReadDependencies = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedIncludeRevoked = searchParams.get('include_revoked') || '';
  const tenantId = canReadTenants && uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const includeRevoked = requestedIncludeRevoked === 'true';
  const invalidFilters = Boolean(
    (requestedTenantId && !tenantId) ||
    (requestedSearch && !search) ||
    (requestedIncludeRevoked && !['true', 'false'].includes(requestedIncludeRevoked))
  );

  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState<CreateDraft>(() => emptyCreateDraft());
  const [editingId, setEditingId] = useState('');
  const [editDraft, setEditDraft] = useState<KeyDraft>(() => keyToDraft({ id: '', name: '', key_prefix: '', scopes: [], allowed_ips: [], is_active: false, is_expired: false, created_at: '' }));
  const [newSecret, setNewSecret] = useState<CreateResponse | null>(null);
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [mutationError, setMutationError] = useState('');

  useEffect(() => { setOffset(0); }, [tenantId, search, includeRevoked, invalidFilters]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'api-key-picker'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    enabled: canReadTenants,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const apiKeys = useQuery({
    queryKey: ['platform', 'api-keys', 'list', tenantId, search, includeRevoked, offset],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (tenantId) params.set('tenant_id', tenantId);
      if (search.trim()) params.set('search', search.trim());
      if (includeRevoked) params.set('include_revoked', 'true');
      return platformApiRequest<ApiKeysResponse>(`/platform/api-keys?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const rows = apiKeys.data?.api_keys || [];
  const scopes = apiKeys.data?.scopes || [];
  const access = apiKeys.data?.evidence_access || { tenant: canReadTenants, platform_user_identity: canReadPlatformUsers };
  const activeCount = rows.filter((key) => key.is_active).length;
  const expiredCount = rows.filter((key) => key.is_expired && !key.revoked_at).length;
  const revokedCount = rows.filter((key) => Boolean(key.revoked_at)).length;
  const incompatibleCount = rows.filter((key) => key.public_api_compatible === false).length;
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const initialError = apiKeys.isError && apiKeys.data === undefined;
  const refreshError = apiKeys.isError && apiKeys.data !== undefined;

  const updateFilter = (key: 'tenant_id' | 'search' | 'include_revoked', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    for (const key of ['tenant_id', 'search', 'include_revoked']) next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const invalidateKeys = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['platform', 'api-keys'] }),
      queryClient.invalidateQueries({ queryKey: ['platform', 'api-client-governance'] })
    ]);
  };
  const refreshAll = async () => {
    const work: Array<Promise<unknown>> = [apiKeys.refetch()];
    if (canReadTenants) work.push(tenants.refetch());
    await Promise.all(work);
  };
  const startEdit = (key: ApiKey) => {
    setEditingId(key.id);
    setEditDraft({ ...keyToDraft(key), scopes: (key.scopes || []).filter((scope) => scopes.includes(scope)) });
    setMutationError('');
  };
  const stopEdit = () => {
    setEditingId('');
    setMutationError('');
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
        expires_at: toIsoOrNull(form.expires_at)
      })
    }),
    onSuccess: async (data) => {
      setNewSecret(data);
      setMessage('Public API key created. Copy the one-time secret before clearing the panel.');
      setMutationError('');
      setForm(emptyCreateDraft());
      await invalidateKeys();
    },
    onError: (error) => setMutationError(readableError(error))
  });
  const updateKey = useMutation({
    mutationFn: (apiKeyId: string) => platformApiRequest<{ api_key: ApiKey }>(`/platform/api-keys/${apiKeyId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: editDraft.name.trim(),
        description: trimOptional(editDraft.description),
        scopes: editDraft.scopes,
        allowed_ips: parseAllowedIps(editDraft.allowed_ips),
        expires_at: toIsoOrNull(editDraft.expires_at)
      })
    }),
    onSuccess: async () => {
      setMessage('API key settings updated.');
      setMutationError('');
      setEditingId('');
      await invalidateKeys();
    },
    onError: (error) => setMutationError(readableError(error))
  });
  const revokeKey = useMutation({
    mutationFn: (apiKeyId: string) => platformApiRequest(`/platform/api-keys/${apiKeyId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason: trimOptional(revokeReasons[apiKeyId] || '') })
    }),
    onSuccess: async (_data, apiKeyId) => {
      setMessage('API key revoked. The credential can no longer authenticate.');
      setMutationError('');
      setRevokeReasons((current) => ({ ...current, [apiKeyId]: '' }));
      if (editingId === apiKeyId) setEditingId('');
      await invalidateKeys();
    },
    onError: (error) => setMutationError(readableError(error))
  });
  const rotateKey = useMutation({
    mutationFn: (apiKeyId: string) => platformApiRequest<CreateResponse>(`/platform/api-keys/${apiKeyId}/rotate`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: async (data) => {
      setNewSecret(data);
      setMessage('API key rotated. The previous secret is no longer valid; copy the new one-time secret now.');
      setMutationError('');
      await invalidateKeys();
    },
    onError: (error) => setMutationError(readableError(error))
  });

  const mutating = createKey.isPending || updateKey.isPending || revokeKey.isPending || rotateKey.isPending;

  const createDisabledReason = !canReadTenants
    ? 'TENANTS_READ is required because every Platform-managed public API key must be bound to a tenant.'
    : !form.tenant_id
      ? 'Select a tenant before creating an API key.'
      : !form.name.trim()
        ? 'Enter an integration name before creating an API key.'
        : !form.scopes.length
          ? 'Select at least one public API scope.'
          : '';
  const canCreate = canWrite && canReadTenants && !createDisabledReason;
  const editDisabledReason = !editDraft.name.trim() ? 'Name is required.' : !editDraft.scopes.length ? 'At least one public API scope is required.' : '';
  const contract = apiKeys.data?.public_api_contract;

  return (
    <div className="io-operational-page io-workspace-page platform-api-keys">
      <OperationalWorkspaceHero
        iconPath="/platform/api-keys"
        eyebrow="Platform operations"
        title="API keys"
        description="Issue and govern tenant-bound credentials for the actual public API. Secrets are shown once; list views expose only prefixes and operational evidence."
        meta={<>
          <OperationalWorkspaceMetaPill>Public API: {contract?.base_path || '/api/public/v1'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Page size: {PAGE_SIZE}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Evidence is permission scoped</OperationalWorkspaceMetaPill>
        </>}
        aside={<div className="platform-api-keys__hero-aside">
          <OperationalWorkspaceStatus value={refreshError ? 'Stale snapshot' : invalidFilters ? 'Filter blocked' : 'Credential registry'} label="Platform-managed tenant API access" />
          <div className="platform-api-keys__refresh-block">
            <button type="button" className="app-button app-button--secondary" onClick={() => void refreshAll()} disabled={apiKeys.isFetching || invalidFilters}>{apiKeys.isFetching ? 'Refreshing…' : 'Refresh'}</button>
            <span>{apiKeys.data ? `Loaded ${rows.length} key records on page ${pageNumber}` : 'Awaiting API-key snapshot'}</span>
          </div>
        </div>}
      />

      {refreshError ? <div className="platform-api-keys__warning"><strong>Showing the last successful API Keys snapshot.</strong> Refresh failed: {readableError(apiKeys.error)}</div> : null}
      {tenants.isError && canReadTenants ? <div className="platform-api-keys__warning"><strong>Tenant directory unavailable.</strong> Existing API keys remain visible, but tenant filtering and key creation may be unavailable until the directory reloads.</div> : null}
      {message ? <div className="platform-api-keys__success">{message}</div> : null}
      {mutationError ? <div className="platform-api-keys__warning"><strong>API-key action failed.</strong> {mutationError}</div> : null}

      <OperationalWorkspaceStats ariaLabel="API key loaded-page metrics">
        <OperationalWorkspaceStatCard label="Loaded keys" value={rows.length} helper={`Current page ${pageNumber}; not a global registry total`} loading={apiKeys.isLoading && !apiKeys.data} />
        <OperationalWorkspaceStatCard label="Active" value={activeCount} helper="Loaded-page active credentials" tone={activeCount ? 'good' : 'neutral'} loading={apiKeys.isLoading && !apiKeys.data} />
        <OperationalWorkspaceStatCard label="Expired" value={expiredCount} helper="Loaded-page expired credentials" tone={expiredCount ? 'warn' : 'neutral'} loading={apiKeys.isLoading && !apiKeys.data} />
        <OperationalWorkspaceStatCard label="Revoked" value={revokedCount} helper="Loaded-page revoked credentials" tone={revokedCount ? 'danger' : 'neutral'} loading={apiKeys.isLoading && !apiKeys.data} />
        <OperationalWorkspaceStatCard label="Scope migration" value={incompatibleCount} helper="Loaded keys with legacy/unsupported scopes" tone={incompatibleCount ? 'warn' : 'neutral'} loading={apiKeys.isLoading && !apiKeys.data} />
      </OperationalWorkspaceStats>

      <section className="io-workspace-panel platform-api-keys__section">
        <OperationalSectionHeader iconPath="/platform/api-keys" title="Public API contract" description="Platform-created credentials use the same authentication contract as tenant-created public API clients." />
        <div className="platform-api-keys__truth-note">
          <strong>Credential truth boundary</strong>
          New secrets use <code>{contract?.new_key_format || 'inv_live_<prefix>_<secret>'}</code> and authenticate against <code>{contract?.base_path || '/api/public/v1'}</code>. Legacy <code>hla_…</code> credentials remain recognizable, but legacy scopes may need migration. A key record means the application issued/stores a hashed credential; it does not prove an external integration successfully connected or performed work.
        </div>
        <div className="platform-api-keys__evidence-grid">
          <div data-state={access.tenant ? 'available' : 'restricted'}><span>Tenant evidence</span><strong>{access.tenant ? 'Available' : 'Redacted'}</strong><small>TENANTS_READ</small></div>
          <div data-state={access.platform_user_identity ? 'available' : 'restricted'}><span>Operator identity</span><strong>{access.platform_user_identity ? 'Available' : 'Redacted'}</strong><small>PLATFORM_USERS_READ</small></div>
          <div><span>IP allowlist</span><strong>{contract?.allowed_ips_enforced_for_platform_keys === false ? 'Not enforced' : 'Enforced'}</strong><small>Exact IPv4 / IPv6 addresses</small></div>
          <div><span>Legacy format</span><strong>{contract?.legacy_hla_format_recognized === false ? 'Not recognized' : 'Recognized'}</strong><small>Migration compatibility only</small></div>
        </div>
      </section>

      {newSecret ? <section className="io-workspace-panel platform-api-keys__section platform-api-keys__secret-panel">
        <OperationalSectionHeader iconPath="/platform/api-keys" title="Copy one-time secret now" description={newSecret.warning} />
        <code className="platform-api-keys__secret">{newSecret.secret}</code>
        <div className="platform-api-keys__actions">
          <button type="button" className="app-button" onClick={() => {
            void navigator.clipboard?.writeText(newSecret.secret);
            setMessage('Copy requested. Verify the credential is stored in the intended secret manager before dismissing it.');
          }}>Copy secret</button>
          <button type="button" className="app-button app-button--secondary" onClick={() => setNewSecret(null)}>Clear one-time secret</button>
        </div>
      </section> : null}

      {canWrite ? <section className="io-workspace-panel platform-api-keys__section">
        <OperationalSectionHeader iconPath="/platform/api-keys" title="Create public API key" description="Every Platform-managed key is tenant-bound. Select only the scopes the integration actually needs." />
        {!canReadTenants ? <div className="platform-api-keys__restricted-field"><span>Creation restricted</span><strong>TENANTS_READ is required to bind a new key to a tenant.</strong></div> : <>
          <div className="platform-api-keys__form-grid">
            <label>Tenant<select value={form.tenant_id} onChange={(event) => setForm((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">Select tenant</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
            <label>Name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={160} placeholder="ERP sync" /></label>
            <label>Expires at<input type="datetime-local" value={form.expires_at} onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))} /></label>
            <label>Allowed IPs<input value={form.allowed_ips} onChange={(event) => setForm((current) => ({ ...current, allowed_ips: event.target.value }))} placeholder="203.0.113.10, 2001:db8::10" /></label>
            <label className="platform-api-keys__span-all">Description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={1000} /></label>
          </div>
          <div className="platform-api-keys__scope-grid" aria-label="Public API scopes">{scopes.map((scope) => <label key={scope}><input type="checkbox" checked={form.scopes.includes(scope)} onChange={(event) => setForm((current) => ({ ...current, scopes: event.target.checked ? [...current.scopes, scope] : current.scopes.filter((item) => item !== scope) }))} />{scope}</label>)}</div>
          {createDisabledReason ? <div className="platform-api-keys__validation">{createDisabledReason}</div> : null}
          <div className="platform-api-keys__actions"><button type="button" className="app-button" disabled={!canCreate || createKey.isPending} onClick={() => createKey.mutate()}>{createKey.isPending ? 'Creating…' : 'Create public API key'}</button></div>
        </>}
      </section> : null}

      <section className="io-workspace-panel platform-api-keys__section">
        <OperationalSectionHeader iconPath="/platform/api-keys" title="Credential registry" description="Search and review Platform-managed public API keys. Loaded-page metrics are not global totals." />
        <div className="platform-api-keys__filter-grid">
          {canReadTenants ? <label>Tenant<select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : <div className="platform-api-keys__restricted-filter">Tenant filter restricted · TENANTS_READ required</div>}
          <label>Search<input value={search} onChange={(event) => updateFilter('search', event.target.value)} maxLength={200} placeholder="Name, description, prefix" /></label>
          <label className="platform-api-keys__checkbox"><input type="checkbox" checked={includeRevoked} onChange={(event) => updateFilter('include_revoked', event.target.checked ? 'true' : '')} />Include revoked</label>
        </div>

        {invalidFilters ? <div className="platform-api-keys__blocking-error"><strong>Invalid or unauthorized URL filter</strong><span>Clear the invalid filter before loading API-key data.</span><button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filters</button></div> : null}
        {initialError ? <div className="platform-api-keys__blocking-error"><strong>API key registry unavailable</strong><span>{readableError(apiKeys.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void apiKeys.refetch()}>Retry</button></div> : null}
        {apiKeys.isLoading && !apiKeys.data ? <div className="platform-api-keys__loading">Loading API keys…</div> : null}

        {rows.length ? <div className="platform-api-keys__list">{rows.map((key) => {
          const editing = editingId === key.id;
          const unsupported = key.unsupported_scopes || [];
          return <article className="platform-api-keys__card" key={key.id}>
            <div className="platform-api-keys__card-header">
              <div><h4>{key.name}</h4><p>{key.description || 'No description recorded.'}</p></div>
              <div className="platform-api-keys__badges"><span data-tone={statusTone(key)}>{statusLabel(key)}</span><span data-tone={key.public_api_compatible === false ? 'warn' : 'good'}>{key.public_api_compatible === false ? 'Scope migration required' : 'Public API compatible'}</span></div>
            </div>
            <div className="platform-api-keys__metrics-grid">
              <div><span>Tenant</span><strong>{access.tenant ? (key.tenant_name || key.tenant_id || 'Not recorded') : 'Redacted'}</strong></div>
              <div><span>Prefix</span><strong><code>{key.key_prefix}…</code></strong></div>
              <div><span>Created</span><strong>{dateTime(key.created_at)}</strong></div>
              <div><span>Created by</span><strong>{access.platform_user_identity ? (key.created_by_email || 'Not recorded') : 'Redacted'}</strong></div>
              <div><span>Expires</span><strong>{key.expires_at ? dateTime(key.expires_at) : 'No expiration'}</strong></div>
              <div><span>Last used</span><strong>{key.last_used_at ? dateTime(key.last_used_at) : 'Never observed'}</strong></div>
              <div><span>Last used IP</span><strong>{key.last_used_ip || 'Not recorded'}</strong></div>
              <div><span>Allowed IPs</span><strong>{key.allowed_ips?.length ? key.allowed_ips.join(', ') : 'Any IP'}</strong></div>
            </div>
            <div className="platform-api-keys__scope-list">{(key.scopes || []).map((scope) => <span key={scope} data-tone={unsupported.includes(scope) ? 'warn' : 'neutral'}>{scope}{unsupported.includes(scope) ? ' · unsupported' : ''}</span>)}</div>
            {key.revoked_at ? <div className="platform-api-keys__decision-grid"><div><span>Revoked</span><strong>{dateTime(key.revoked_at)}</strong></div><div><span>Revoked by</span><strong>{access.platform_user_identity ? (key.revoked_by_email || 'Not recorded') : 'Redacted'}</strong></div><div><span>Reason</span><strong>{key.revoke_reason || 'No reason recorded'}</strong></div></div> : null}
            {editing ? <div className="platform-api-keys__edit-panel">
              <div className="platform-api-keys__form-grid">
                <label>Name<input value={editDraft.name} onChange={(event) => setEditDraft((current) => ({ ...current, name: event.target.value }))} maxLength={160} /></label>
                <label>Expires at<input type="datetime-local" value={editDraft.expires_at} onChange={(event) => setEditDraft((current) => ({ ...current, expires_at: event.target.value }))} /></label>
                <label>Allowed IPs<input value={editDraft.allowed_ips} onChange={(event) => setEditDraft((current) => ({ ...current, allowed_ips: event.target.value }))} /></label>
                <label className="platform-api-keys__span-all">Description<textarea value={editDraft.description} onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))} maxLength={1000} /></label>
              </div>
              <div className="platform-api-keys__scope-grid">{scopes.map((scope) => <label key={scope}><input type="checkbox" checked={editDraft.scopes.includes(scope)} onChange={(event) => setEditDraft((current) => ({ ...current, scopes: event.target.checked ? [...current.scopes, scope] : current.scopes.filter((item) => item !== scope) }))} />{scope}</label>)}</div>
              {editDisabledReason ? <div className="platform-api-keys__validation">{editDisabledReason}</div> : null}
              <div className="platform-api-keys__actions"><button type="button" className="app-button" disabled={Boolean(editDisabledReason) || mutating} onClick={() => updateKey.mutate(key.id)}>Save key settings</button><button type="button" className="app-button app-button--secondary" disabled={mutating} onClick={stopEdit}>Cancel edit</button></div>
            </div> : null}
            <div className="platform-api-keys__source-links">
              {canReadAudit ? <Link to={auditLinkFor(key)}>Audit evidence</Link> : null}
              {canReadTenants && key.tenant_id ? <Link to={`/platform/tenants?tenant_id=${encodeURIComponent(key.tenant_id)}`}>Tenant source</Link> : null}
            </div>
            {canWrite && !key.revoked_at ? <>
              <label className="platform-api-keys__revoke-reason">Revoke reason<input value={revokeReasons[key.id] || ''} onChange={(event) => setRevokeReasons((current) => ({ ...current, [key.id]: event.target.value }))} maxLength={1000} placeholder="Optional operational reason" /></label>
              <div className="platform-api-keys__actions">
                {!editing ? <button type="button" className="app-button app-button--secondary" onClick={() => startEdit(key)} disabled={mutating}>Edit settings</button> : null}
                <button type="button" className="app-button app-button--secondary" onClick={() => window.confirm('Rotate this public API key? The current secret will stop authenticating immediately.') && rotateKey.mutate(key.id)} disabled={mutating || key.is_expired}>Rotate secret</button>
                <button type="button" className="app-button app-button--danger" onClick={() => window.confirm('Revoke this API key? The integration credential will stop authenticating immediately.') && revokeKey.mutate(key.id)} disabled={mutating}>Revoke key</button>
              </div>
              {key.is_expired ? <div className="platform-api-keys__warning">Expired keys cannot be rotated. Edit the expiration first, save it, then rotate.</div> : null}
            </> : null}
          </article>;
        })}</div> : apiKeys.data ? <div className="platform-api-keys__empty"><strong>No API keys found.</strong><span>No application API-key records matched the current filters. This does not prove no external integration credentials or integration activity exist outside this registry.</span></div> : null}

        {apiKeys.data ? <div className="platform-api-keys__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || apiKeys.isFetching}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} API keys</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!apiKeys.data.pagination.has_more || apiKeys.isFetching}>Next</button></div> : null}
      </section>

      <section className="io-workspace-panel platform-api-keys__section">
        <OperationalSectionHeader iconPath="/platform/api-keys" title="Supporting operations" description="Open only destinations allowed by the current Platform permission snapshot." />
        <div className="platform-api-keys__supporting-links">
          {canReadTenants ? <Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link> : null}
          <Link to="/platform/api-client-governance">API client governance</Link>
          {canReadWebhooks ? <Link to="/platform/webhooks">Webhooks</Link> : null}
          {canReadDependencies ? <Link to="/platform/integration-monitoring">Integration monitoring</Link> : null}
          {canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}
        </div>
      </section>
    </div>
  );
}
