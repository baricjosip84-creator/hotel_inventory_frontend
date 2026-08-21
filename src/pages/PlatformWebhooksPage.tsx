import { useEffect, useMemo, useState } from 'react';
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
import './PlatformWebhooksPage.css';

type Tenant = { id: string; name: string };
type Pagination = { limit: number; offset: number; has_more: boolean };
type EvidenceAccess = { tenant: boolean; platform_user_identity: boolean };
type DeliveryContract = {
  https_only: boolean;
  private_network_destinations_blocked: boolean;
  signing_algorithm: string;
  automatic_audit_outbox_delivery: boolean;
  legacy_hash_only_secret_requires_rotation: boolean;
};
type DeliveryPosture = 'disabled' | 'secret_rotation_required' | 'not_observed' | 'failing' | 'observed_success' | 'unknown';
type Webhook = {
  id: string; tenant_id?: string | null; tenant_name?: string | null; name: string; url: string;
  description?: string | null; event_types: string[]; secret_prefix: string; signing_secret_ready: boolean;
  delivery_posture: DeliveryPosture; is_enabled: boolean; is_healthy: boolean | null;
  last_delivery_at?: string | null; last_delivery_status?: string | null; consecutive_failure_count: number;
  disabled_reason?: string | null; created_at: string; updated_at?: string | null;
  created_by_email?: string | null; updated_by_email?: string | null;
};
type Delivery = {
  id: string; webhook_id: string; webhook_name?: string | null; tenant_id?: string | null; tenant_name?: string | null;
  event_type: string; delivery_status: string; response_status?: number | null; error_message?: string | null;
  attempt_count: number; next_retry_at?: string | null; last_attempt_at?: string | null; attempted_at?: string | null;
  completed_at?: string | null; created_at: string;
};
type WebhooksResponse = { webhooks: Webhook[]; event_types: string[]; evidence_access: EvidenceAccess; pagination: Pagination; delivery_contract: DeliveryContract };
type DeliveriesResponse = { deliveries: Delivery[]; evidence_access: EvidenceAccess; pagination: Pagination };
type SecretResponse = { webhook: Webhook; secret: string; warning: string };
type TestResponse = { delivery: Delivery | null; success: boolean };
type WebhookDraft = { name: string; url: string; description: string; event_types: string[]; is_enabled: boolean };
type CreateDraft = WebhookDraft & { tenant_id: string };

const PAGE_SIZE = 50;
const DELIVERY_PAGE_SIZE = 50;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deliveryStatuses = ['', 'pending', 'processing', 'succeeded', 'failed', 'blocked'] as const;
const emptyCreateDraft = (): CreateDraft => ({ tenant_id: '', name: '', url: '', description: '', event_types: [], is_enabled: true });

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function trimOptional(value: string) { const text = value.trim(); return text || null; }
function dateTime(value?: string | null) { if (!value) return 'Not recorded'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString(); }
function draftFor(webhook: Webhook): WebhookDraft { return { name: webhook.name, url: webhook.url, description: webhook.description || '', event_types: [...(webhook.event_types || [])], is_enabled: webhook.is_enabled }; }
function postureLabel(value: DeliveryPosture) { if (value === 'observed_success') return 'Observed success'; if (value === 'secret_rotation_required') return 'Secret rotation required'; if (value === 'not_observed') return 'Not observed'; return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' '); }
function postureTone(value: DeliveryPosture) { if (value === 'observed_success') return 'good'; if (value === 'failing') return 'danger'; if (value === 'secret_rotation_required' || value === 'not_observed' || value === 'unknown') return 'warn'; return 'neutral'; }
function deliveryTone(value: string) { if (value === 'succeeded') return 'good'; if (value === 'failed' || value === 'blocked') return 'danger'; return 'warn'; }
function validHttpsUrl(value: string) { try { const parsed = new URL(value.trim()); return parsed.protocol === 'https:' && Boolean(parsed.hostname); } catch { return false; } }
function auditLinkFor(webhook: Webhook) { const params = new URLSearchParams({ target_type: 'platform_webhook', target_id: webhook.id }); return `/platform/audit?${params.toString()}`; }

export default function PlatformWebhooksPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_WRITE);
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadDependencies = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ);
  const canReadApiKeys = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ);
  const canReadNotifications = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ);
  const canReadJobs = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedIncludeDisabled = searchParams.get('include_disabled') || '';
  const requestedDeliveryStatus = searchParams.get('delivery_status') || '';
  const tenantId = canReadTenants && uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const includeDisabled = requestedIncludeDisabled ? requestedIncludeDisabled === 'true' : true;
  const deliveryStatus = deliveryStatuses.includes(requestedDeliveryStatus as typeof deliveryStatuses[number]) ? requestedDeliveryStatus : '';
  const invalidFilters = Boolean((requestedTenantId && !tenantId) || (requestedSearch && !search) || (requestedIncludeDisabled && !['true', 'false'].includes(requestedIncludeDisabled)) || (requestedDeliveryStatus && !deliveryStatus));

  const [offset, setOffset] = useState(0);
  const [deliveryOffset, setDeliveryOffset] = useState(0);
  const [form, setForm] = useState<CreateDraft>(() => emptyCreateDraft());
  const [editingId, setEditingId] = useState('');
  const [editDraft, setEditDraft] = useState<WebhookDraft>(() => ({ name: '', url: '', description: '', event_types: [], is_enabled: true }));
  const [newSecret, setNewSecret] = useState<SecretResponse | null>(null);
  const [message, setMessage] = useState('');
  const [mutationError, setMutationError] = useState('');

  useEffect(() => { setOffset(0); }, [tenantId, search, includeDisabled, invalidFilters]);
  useEffect(() => { setDeliveryOffset(0); }, [tenantId, deliveryStatus, invalidFilters]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'webhook-picker'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    enabled: canReadTenants, refetchOnWindowFocus: false, staleTime: 30_000
  });
  const webhooks = useQuery({
    queryKey: ['platform', 'webhooks', 'list', tenantId, search, includeDisabled, offset],
    queryFn: () => { const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), include_disabled: String(includeDisabled) }); if (tenantId) params.set('tenant_id', tenantId); if (search.trim()) params.set('search', search.trim()); return platformApiRequest<WebhooksResponse>(`/platform/webhooks?${params.toString()}`); },
    enabled: !invalidFilters, refetchOnWindowFocus: false, staleTime: 30_000
  });
  const deliveries = useQuery({
    queryKey: ['platform', 'webhook-deliveries', tenantId, deliveryStatus, deliveryOffset],
    queryFn: () => { const params = new URLSearchParams({ limit: String(DELIVERY_PAGE_SIZE), offset: String(deliveryOffset) }); if (tenantId) params.set('tenant_id', tenantId); if (deliveryStatus) params.set('status', deliveryStatus); return platformApiRequest<DeliveriesResponse>(`/platform/webhooks/deliveries?${params.toString()}`); },
    enabled: !invalidFilters, refetchOnWindowFocus: false, staleTime: 30_000
  });

  const events = webhooks.data?.event_types || [];
  const rows = webhooks.data?.webhooks || [];
  const deliveryRows = deliveries.data?.deliveries || [];
  const access = webhooks.data?.evidence_access || { tenant: canReadTenants, platform_user_identity: canReadPlatformUsers };
  const contract = webhooks.data?.delivery_contract;
  const endpointPage = Math.floor(offset / PAGE_SIZE) + 1;
  const deliveryPage = Math.floor(deliveryOffset / DELIVERY_PAGE_SIZE) + 1;
  const endpointInitialError = webhooks.isError && webhooks.data === undefined;
  const endpointRefreshError = webhooks.isError && webhooks.data !== undefined;
  const deliveryInitialError = deliveries.isError && deliveries.data === undefined;
  const deliveryRefreshError = deliveries.isError && deliveries.data !== undefined;
  const enabledCount = rows.filter((row) => row.is_enabled).length;
  const observedSuccessCount = rows.filter((row) => row.delivery_posture === 'observed_success').length;
  const failingCount = rows.filter((row) => row.delivery_posture === 'failing').length;
  const rotationCount = rows.filter((row) => row.delivery_posture === 'secret_rotation_required').length;

  const updateFilter = (key: 'tenant_id' | 'search' | 'include_disabled' | 'delivery_status', value: string) => { const next = new URLSearchParams(searchParams); if (value) next.set(key, value); else next.delete(key); setSearchParams(next, { replace: true }); };
  const clearInvalidFilters = () => { const next = new URLSearchParams(searchParams); for (const key of ['tenant_id', 'search', 'include_disabled', 'delivery_status']) next.delete(key); setSearchParams(next, { replace: true }); };
  const invalidateWebhookData = async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['platform', 'webhooks'] }), queryClient.invalidateQueries({ queryKey: ['platform', 'webhook-deliveries'] }), queryClient.invalidateQueries({ queryKey: ['platform', 'integration-monitoring'] })]); };
  const refreshAll = async () => { const work: Array<Promise<unknown>> = [webhooks.refetch(), deliveries.refetch()]; if (canReadTenants) work.push(tenants.refetch()); await Promise.all(work); };
  const startEdit = (webhook: Webhook) => { setEditingId(webhook.id); setEditDraft(draftFor(webhook)); setMutationError(''); };
  const stopEdit = () => { setEditingId(''); setMutationError(''); };

  const createWebhook = useMutation({
    mutationFn: () => platformApiRequest<SecretResponse>('/platform/webhooks', { method: 'POST', body: JSON.stringify({ tenant_id: form.tenant_id, name: form.name.trim(), url: form.url.trim(), description: trimOptional(form.description), event_types: form.event_types, is_enabled: form.is_enabled }) }),
    onSuccess: async (data) => { setNewSecret(data); setMessage(`Webhook ${data.webhook.name} created. Store the one-time signing secret before dismissing it.`); setForm(emptyCreateDraft()); setMutationError(''); await invalidateWebhookData(); },
    onError: (error) => setMutationError(readableError(error))
  });
  const updateWebhook = useMutation({
    mutationFn: ({ webhookId, patch }: { webhookId: string; patch: Partial<WebhookDraft> }) => platformApiRequest<{ webhook: Webhook }>(`/platform/webhooks/${webhookId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: async (data) => { setMessage(`Webhook ${data.webhook.name} updated.`); setMutationError(''); setEditingId(''); await invalidateWebhookData(); },
    onError: (error) => setMutationError(readableError(error))
  });
  const rotateSecret = useMutation({
    mutationFn: (webhookId: string) => platformApiRequest<SecretResponse>(`/platform/webhooks/${webhookId}/rotate-secret`, { method: 'POST' }),
    onSuccess: async (data) => { setNewSecret(data); setMessage(`Signing secret rotated for ${data.webhook.name}. The prior secret is no longer valid.`); setMutationError(''); await invalidateWebhookData(); },
    onError: (error) => setMutationError(readableError(error))
  });
  const testDelivery = useMutation({
    mutationFn: (webhookId: string) => platformApiRequest<TestResponse>(`/platform/webhooks/${webhookId}/test`, { method: 'POST' }),
    onSuccess: async (data) => { setMessage(data.success ? 'Test delivery received an HTTP 2xx response.' : 'Test delivery did not receive an HTTP 2xx response. Review delivery evidence and retry state.'); setMutationError(''); await invalidateWebhookData(); },
    onError: (error) => setMutationError(readableError(error))
  });

  const mutating = createWebhook.isPending || updateWebhook.isPending || rotateSecret.isPending || testDelivery.isPending;
  const createProblem = !form.tenant_id ? 'Select a tenant.' : !form.name.trim() ? 'Name is required.' : !validHttpsUrl(form.url) ? 'A valid HTTPS destination is required.' : !form.event_types.length ? 'Select at least one event type.' : '';
  const editProblem = !editDraft.name.trim() ? 'Name is required.' : !validHttpsUrl(editDraft.url) ? 'A valid HTTPS destination is required.' : !editDraft.event_types.length ? 'Select at least one event type.' : '';
  const snapshotLabel = useMemo(() => `Tenant: ${tenantId || 'all permitted'} · Search: ${search.trim() || 'none'} · Disabled: ${includeDisabled ? 'included' : 'hidden'} · Deliveries: ${deliveryStatus || 'all statuses'}`, [tenantId, search, includeDisabled, deliveryStatus]);

  return <div className="platform-webhooks">
    <OperationalWorkspaceHero iconPath="/platform/webhooks" eyebrow="Platform operations" title="Webhooks" description="Operate tenant-bound outbound webhook endpoints, one-time signing secrets, automatic event delivery, retries, and application-recorded delivery evidence."
      meta={<><OperationalWorkspaceMetaPill>HTTPS destinations only</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>HMAC-SHA256 signing</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>Evidence is permission scoped</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-webhooks__hero-aside"><OperationalWorkspaceStatus value={endpointRefreshError || deliveryRefreshError ? 'Stale snapshot' : invalidFilters ? 'Filter blocked' : 'Delivery registry'} label="Platform-managed outbound integrations" /><div className="platform-webhooks__refresh-block"><button type="button" className="app-button app-button--secondary" onClick={() => void refreshAll()} disabled={invalidFilters || webhooks.isFetching || deliveries.isFetching || tenants.isFetching}>{webhooks.isFetching || deliveries.isFetching ? 'Refreshing…' : 'Refresh'}</button><span>{webhooks.data ? `Loaded ${rows.length} endpoints on page ${endpointPage}` : 'Awaiting webhook snapshot'}</span></div></div>} />

    {endpointRefreshError || deliveryRefreshError ? <div className="platform-webhooks__warning"><strong>Showing the last successful snapshot.</strong> A background refresh failed. Endpoint error: {endpointRefreshError ? readableError(webhooks.error) : 'none'}. Delivery error: {deliveryRefreshError ? readableError(deliveries.error) : 'none'}.</div> : null}
    {tenants.isError && canReadTenants ? <div className="platform-webhooks__warning"><strong>Tenant directory unavailable.</strong> Existing webhook evidence can remain visible, but tenant selection/filtering may be incomplete until the directory reloads.</div> : null}
    {message ? <div className="platform-webhooks__success">{message}<button type="button" className="app-button app-button--secondary" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {mutationError ? <div className="platform-webhooks__warning"><strong>Webhook action failed.</strong> {mutationError}</div> : null}

    <OperationalWorkspaceStats ariaLabel="Webhook loaded-page metrics">
      <OperationalWorkspaceStatCard label="Loaded endpoints" value={rows.length} helper={`Current page ${endpointPage}; not a global registry total`} loading={webhooks.isLoading && !webhooks.data} />
      <OperationalWorkspaceStatCard label="Enabled" value={enabledCount} helper="Loaded-page enabled endpoints" tone={enabledCount ? 'good' : 'neutral'} loading={webhooks.isLoading && !webhooks.data} />
      <OperationalWorkspaceStatCard label="Observed success" value={observedSuccessCount} helper="Last application-recorded delivery succeeded" tone={observedSuccessCount ? 'good' : 'neutral'} loading={webhooks.isLoading && !webhooks.data} />
      <OperationalWorkspaceStatCard label="Failing" value={failingCount} helper="Loaded endpoints with failed delivery evidence" tone={failingCount ? 'danger' : 'neutral'} loading={webhooks.isLoading && !webhooks.data} />
      <OperationalWorkspaceStatCard label="Rotate secret" value={rotationCount} helper="Legacy endpoints not yet delivery-ready" tone={rotationCount ? 'warn' : 'neutral'} loading={webhooks.isLoading && !webhooks.data} />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-webhooks__section"><OperationalSectionHeader iconPath="/platform/webhooks" title="Delivery contract" description="What this registry can and cannot prove about outbound integration activity." />
      <div className="platform-webhooks__truth-note"><strong>Webhook truth boundary</strong>An HTTP 2xx response is application-recorded delivery evidence only. It does not prove the remote system processed, acknowledged, or completed external work. No observed delivery does not prove that no external integration exists outside this registry.</div>
      <div className="platform-webhooks__evidence-grid"><div data-state={access.tenant ? 'available' : 'restricted'}><span>Tenant evidence</span><strong>{access.tenant ? 'Available' : 'Redacted'}</strong><small>TENANTS_READ</small></div><div data-state={access.platform_user_identity ? 'available' : 'restricted'}><span>Operator identity</span><strong>{access.platform_user_identity ? 'Available' : 'Redacted'}</strong><small>PLATFORM_USERS_READ</small></div><div><span>Network boundary</span><strong>{contract?.https_only === false ? 'Review required' : 'HTTPS only'}</strong><small>{contract?.private_network_destinations_blocked === false ? 'Private destinations not blocked' : 'Private/local destinations blocked'}</small></div><div><span>Automatic delivery</span><strong>{contract?.automatic_audit_outbox_delivery === false ? 'Not enabled' : 'Audit outbox'}</strong><small>Idempotent event queueing</small></div></div>
    </section>

    {newSecret ? <section className="io-workspace-panel platform-webhooks__section platform-webhooks__secret-panel"><OperationalSectionHeader iconPath="/platform/webhooks" title="Copy signing secret now" description={newSecret.warning} /><code className="platform-webhooks__secret">{newSecret.secret}</code><div className="platform-webhooks__actions"><button type="button" className="app-button" onClick={() => { void navigator.clipboard?.writeText(newSecret.secret); setMessage('Copy requested. Verify the secret is stored in the receiving integration before dismissing it.'); }}>Copy secret</button><button type="button" className="app-button app-button--secondary" onClick={() => setNewSecret(null)}>Clear one-time secret</button></div></section> : null}

    {canWrite ? <section className="io-workspace-panel platform-webhooks__section"><OperationalSectionHeader iconPath="/platform/webhooks" title="Create webhook" description="New endpoints are tenant-bound. The signing secret is displayed only once." />
      {!canReadTenants ? <div className="platform-webhooks__restricted"><strong>Creation restricted</strong><span>TENANTS_READ is required to bind a new webhook to a tenant.</span></div> : <><div className="platform-webhooks__form-grid"><label>Tenant<select value={form.tenant_id} onChange={(event) => setForm((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">Select tenant</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label><label>Name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={160} placeholder="ERP notifications" /></label><label className="platform-webhooks__span-all">HTTPS destination<input value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} maxLength={2048} placeholder="https://example.com/inventory/webhooks" /></label><label className="platform-webhooks__span-all">Description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={1000} /></label><label className="platform-webhooks__checkbox"><input type="checkbox" checked={form.is_enabled} onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))} />Enable automatic delivery immediately</label></div>
      <div className="platform-webhooks__event-grid" aria-label="Webhook event types">{events.map((eventType) => <label key={eventType}><input type="checkbox" checked={form.event_types.includes(eventType)} onChange={(event) => setForm((current) => ({ ...current, event_types: event.target.checked ? [...current.event_types, eventType] : current.event_types.filter((item) => item !== eventType) }))} />{eventType}</label>)}</div>{createProblem ? <div className="platform-webhooks__validation">{createProblem}</div> : null}<div className="platform-webhooks__actions"><button type="button" className="app-button" disabled={Boolean(createProblem) || mutating} onClick={() => createWebhook.mutate()}>{createWebhook.isPending ? 'Creating…' : 'Create webhook'}</button></div></>}</section> : null}

    <section className="io-workspace-panel platform-webhooks__section"><OperationalSectionHeader iconPath="/platform/webhooks" title="Endpoint registry" description={snapshotLabel} />
      <div className="platform-webhooks__filter-grid">{canReadTenants ? <label>Tenant<select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)}><option value="">All permitted tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : <div className="platform-webhooks__restricted-filter">Tenant filter restricted · TENANTS_READ required</div>}<label>Search<input value={search} onChange={(event) => updateFilter('search', event.target.value)} maxLength={200} placeholder="Name, description, URL" /></label><label className="platform-webhooks__checkbox"><input type="checkbox" checked={includeDisabled} onChange={(event) => updateFilter('include_disabled', event.target.checked ? 'true' : 'false')} />Include disabled</label></div>
      {invalidFilters ? <div className="platform-webhooks__blocking-error"><strong>Invalid or unauthorized URL filter</strong><span>Clear the invalid filter before loading webhook evidence.</span><button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filters</button></div> : null}
      {endpointInitialError ? <div className="platform-webhooks__blocking-error"><strong>Webhook registry unavailable</strong><span>{readableError(webhooks.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void webhooks.refetch()}>Retry</button></div> : null}
      {webhooks.isLoading && !webhooks.data ? <div className="platform-webhooks__loading">Loading webhook endpoints…</div> : null}
      {rows.length ? <div className="platform-webhooks__list">{rows.map((webhook) => { const editing = editingId === webhook.id; return <article className="platform-webhooks__card" key={webhook.id}><div className="platform-webhooks__card-header"><div><h4>{webhook.name}</h4><p>{webhook.description || 'No description recorded.'}</p></div><div className="platform-webhooks__badges"><span data-tone={webhook.is_enabled ? 'good' : 'neutral'}>{webhook.is_enabled ? 'Enabled' : 'Disabled'}</span><span data-tone={postureTone(webhook.delivery_posture)}>{postureLabel(webhook.delivery_posture)}</span></div></div>
        {webhook.delivery_posture === 'secret_rotation_required' ? <div className="platform-webhooks__warning"><strong>Signing secret rotation required.</strong> This legacy endpoint has only a one-way stored hash. Rotate once before tests or automatic deliveries can be signed correctly.</div> : null}
        <div className="platform-webhooks__metrics-grid"><div><span>Tenant</span><strong>{access.tenant ? (webhook.tenant_name || webhook.tenant_id || 'Not recorded') : 'Redacted'}</strong></div><div><span>Destination</span><strong><code>{webhook.url}</code></strong></div><div><span>Secret prefix</span><strong><code>{webhook.secret_prefix}…</code></strong></div><div><span>Signing ready</span><strong>{webhook.signing_secret_ready ? 'Yes' : 'No · rotate'}</strong></div><div><span>Last delivery</span><strong>{webhook.last_delivery_at ? dateTime(webhook.last_delivery_at) : 'Never observed'}</strong></div><div><span>Last status</span><strong>{webhook.last_delivery_status || 'Not observed'}</strong></div><div><span>Consecutive failures</span><strong>{webhook.consecutive_failure_count || 0}</strong></div><div><span>Updated by</span><strong>{access.platform_user_identity ? (webhook.updated_by_email || webhook.created_by_email || 'Not recorded') : 'Redacted'}</strong></div></div>
        <div className="platform-webhooks__event-list">{(webhook.event_types || []).map((eventType) => <span key={eventType}>{eventType}</span>)}</div>{webhook.disabled_reason ? <div className="platform-webhooks__restricted"><strong>Disabled reason</strong><span>{webhook.disabled_reason}</span></div> : null}
        {editing ? <div className="platform-webhooks__edit-panel"><div className="platform-webhooks__form-grid"><label>Name<input value={editDraft.name} onChange={(event) => setEditDraft((current) => ({ ...current, name: event.target.value }))} maxLength={160} /></label><label className="platform-webhooks__span-all">HTTPS destination<input value={editDraft.url} onChange={(event) => setEditDraft((current) => ({ ...current, url: event.target.value }))} maxLength={2048} /></label><label className="platform-webhooks__span-all">Description<textarea value={editDraft.description} onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))} maxLength={1000} /></label></div><div className="platform-webhooks__event-grid">{events.map((eventType) => <label key={eventType}><input type="checkbox" checked={editDraft.event_types.includes(eventType)} onChange={(event) => setEditDraft((current) => ({ ...current, event_types: event.target.checked ? [...current.event_types, eventType] : current.event_types.filter((item) => item !== eventType) }))} />{eventType}</label>)}</div>{editProblem ? <div className="platform-webhooks__validation">{editProblem}</div> : null}<div className="platform-webhooks__actions"><button type="button" className="app-button" disabled={Boolean(editProblem) || mutating} onClick={() => updateWebhook.mutate({ webhookId: webhook.id, patch: { name: editDraft.name.trim(), url: editDraft.url.trim(), description: trimOptional(editDraft.description) || '', event_types: editDraft.event_types } })}>Save settings</button><button type="button" className="app-button app-button--secondary" disabled={mutating} onClick={stopEdit}>Cancel edit</button></div></div> : null}
        <div className="platform-webhooks__source-links">{canReadAudit ? <Link to={auditLinkFor(webhook)}>Audit evidence</Link> : null}{canReadTenants && webhook.tenant_id ? <Link to={`/platform/tenants?tenant_id=${encodeURIComponent(webhook.tenant_id)}`}>Tenant source</Link> : null}{canReadDependencies ? <Link to={`/platform/integration-monitoring?tenant_id=${webhook.tenant_id ? encodeURIComponent(webhook.tenant_id) : ''}&source=webhooks`}>Integration monitoring</Link> : null}</div>
        {canWrite ? <div className="platform-webhooks__actions">{!editing ? <button type="button" className="app-button app-button--secondary" disabled={mutating} onClick={() => startEdit(webhook)}>Edit settings</button> : null}<button type="button" className="app-button app-button--secondary" disabled={mutating || !webhook.is_enabled || !webhook.signing_secret_ready} onClick={() => testDelivery.mutate(webhook.id)}>Send test</button><button type="button" className="app-button app-button--secondary" disabled={mutating} onClick={() => window.confirm('Rotate this signing secret? The previous secret stops verifying new deliveries immediately.') && rotateSecret.mutate(webhook.id)}>Rotate secret</button><button type="button" className={webhook.is_enabled ? 'app-button app-button--danger' : 'app-button'} disabled={mutating} onClick={() => window.confirm(`${webhook.is_enabled ? 'Disable' : 'Enable'} this webhook?`) && updateWebhook.mutate({ webhookId: webhook.id, patch: { is_enabled: !webhook.is_enabled } })}>{webhook.is_enabled ? 'Disable' : 'Enable'}</button></div> : null}
      </article>; })}</div> : webhooks.data ? <div className="platform-webhooks__empty"><strong>No webhook records matched.</strong><span>No application webhook records matched these filters. This does not prove there are no external integration endpoints or external integration activity outside this registry.</span></div> : null}
      {webhooks.data ? <div className="platform-webhooks__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || webhooks.isFetching}>Previous</button><span>Page {endpointPage} · up to {PAGE_SIZE} endpoints</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!webhooks.data.pagination.has_more || webhooks.isFetching}>Next</button></div> : null}
    </section>

    <section className="io-workspace-panel platform-webhooks__section"><OperationalSectionHeader iconPath="/platform/webhooks" title="Delivery evidence" description="Safe operational metadata only; stored webhook payloads and remote response bodies are not exposed here." />
      <div className="platform-webhooks__filter-grid">{canReadTenants ? <label>Tenant<select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)}><option value="">All permitted tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : <div className="platform-webhooks__restricted-filter">Tenant filter restricted · TENANTS_READ required</div>}<label>Delivery status<select value={deliveryStatus} onChange={(event) => updateFilter('delivery_status', event.target.value)}>{deliveryStatuses.map((status) => <option key={status || 'all'} value={status}>{status || 'All statuses'}</option>)}</select></label></div>
      {deliveryInitialError ? <div className="platform-webhooks__warning"><strong>Delivery evidence unavailable.</strong> Endpoint registry remains usable. {readableError(deliveries.error)} <button type="button" className="app-button app-button--secondary" onClick={() => void deliveries.refetch()}>Retry deliveries</button></div> : null}
      {deliveries.isLoading && !deliveries.data ? <div className="platform-webhooks__loading">Loading delivery evidence…</div> : null}
      {deliveryRows.length ? <div className="platform-webhooks__delivery-list">{deliveryRows.map((delivery) => <article className="platform-webhooks__delivery" key={delivery.id}><div className="platform-webhooks__card-header"><div><h4>{delivery.webhook_name || 'Webhook delivery'}</h4><p>{delivery.event_type}</p></div><div className="platform-webhooks__badges"><span data-tone={deliveryTone(delivery.delivery_status)}>{delivery.delivery_status}</span></div></div><div className="platform-webhooks__metrics-grid"><div><span>Tenant</span><strong>{access.tenant ? (delivery.tenant_name || delivery.tenant_id || 'Not recorded') : 'Redacted'}</strong></div><div><span>Created</span><strong>{dateTime(delivery.created_at)}</strong></div><div><span>HTTP response</span><strong>{delivery.response_status ?? 'Not recorded'}</strong></div><div><span>Attempts</span><strong>{delivery.attempt_count || 0}</strong></div><div><span>Last attempt</span><strong>{dateTime(delivery.last_attempt_at || delivery.attempted_at)}</strong></div><div><span>Next retry</span><strong>{delivery.next_retry_at ? dateTime(delivery.next_retry_at) : 'Not scheduled'}</strong></div><div><span>Completed</span><strong>{dateTime(delivery.completed_at)}</strong></div><div><span>Error</span><strong>{delivery.error_message || 'None recorded'}</strong></div></div></article>)}</div> : deliveries.data ? <div className="platform-webhooks__empty"><strong>No delivery records matched.</strong><span>No application delivery evidence matched these filters. Absence of records is not proof that no external system activity occurred.</span></div> : null}
      {deliveries.data ? <div className="platform-webhooks__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setDeliveryOffset((value) => Math.max(0, value - DELIVERY_PAGE_SIZE))} disabled={deliveryOffset === 0 || deliveries.isFetching}>Previous</button><span>Page {deliveryPage} · up to {DELIVERY_PAGE_SIZE} deliveries</span><button type="button" className="app-button app-button--secondary" onClick={() => setDeliveryOffset((value) => value + DELIVERY_PAGE_SIZE)} disabled={!deliveries.data.pagination.has_more || deliveries.isFetching}>Next</button></div> : null}
    </section>

    <section className="io-workspace-panel platform-webhooks__section"><OperationalSectionHeader iconPath="/platform/webhooks" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." /><div className="platform-webhooks__supporting-links">{canReadDependencies ? <Link to="/platform/integration-monitoring?source=webhooks">Integration monitoring</Link> : null}{canReadApiKeys ? <Link to="/platform/api-keys">API keys</Link> : null}{canReadApiKeys ? <Link to="/platform/api-client-governance">API client governance</Link> : null}{canReadNotifications ? <Link to="/platform/notifications">Notifications</Link> : null}{canReadJobs ? <Link to="/platform/operational-jobs">Operational jobs</Link> : null}{canReadTenants ? <Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div></section>
  </div>;
}
