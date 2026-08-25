import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformProvisioningPresetsPage.css';

type PresetStatus = 'draft' | 'published' | 'retired';
type StorageLocationDraft = { name: string; temperature_zone: string };
type ProvisioningPresetVersion = {
  id: string;
  key: string;
  preset_version: number;
  status: PresetStatus;
  label: string;
  description: string;
  organization_type: string;
  feature_flags: Record<string, boolean>;
  limits: Record<string, number>;
  storage_locations: Array<{ name: string; temperature_zone?: string | null }>;
  created_by_present?: boolean;
  updated_by_present?: boolean;
  published_by_present?: boolean;
  retired_by_present?: boolean;
  created_by_platform_user_id?: string | null;
  updated_by_platform_user_id?: string | null;
  published_by_platform_user_id?: string | null;
  retired_by_platform_user_id?: string | null;
  created_by_email?: string | null;
  updated_by_email?: string | null;
  published_by_email?: string | null;
  retired_by_email?: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  retired_at?: string | null;
  version: number;
};
type PresetRegistryResponse = {
  preset_versions: ProvisioningPresetVersion[];
  summary: { total: number; preset_keys: number; draft: number; published: number; retired: number };
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  evidence_access: { platform_user_identity: boolean };
  evidence_contract: {
    application_registry_only: boolean;
    published_status_means_application_selectable: boolean;
    published_status_does_not_certify_customer_fit: boolean;
    feature_flags_and_limits_are_template_defaults: boolean;
    starter_locations_are_template_definitions_only: boolean;
    retirement_is_application_lifecycle_history: boolean;
    actor_identity_requires_platform_users_read: boolean;
  };
  statuses: PresetStatus[];
};
type PresetForm = {
  key: string;
  label: string;
  description: string;
  organization_type: string;
  feature_flags: Record<string, boolean>;
  limits: Record<string, number>;
  storage_locations: StorageLocationDraft[];
};

const PAGE_SIZE = 50;
const FEATURE_FLAGS = [
  'inventory', 'procurement', 'forecasting', 'automation', 'scanner', 'reports', 'support_access',
  'requisitions', 'purchase_orders', 'sso', 'api_access', 'advanced_integrations'
];
const LIMIT_KEYS = ['max_users', 'max_products', 'max_storage_locations'];
const STATUSES: PresetStatus[] = ['draft', 'published', 'retired'];

function defaultForm(): PresetForm {
  return {
    key: '', label: '', description: '', organization_type: 'facility',
    feature_flags: { inventory: true, procurement: true, forecasting: false, automation: false, scanner: true, reports: true, support_access: true },
    limits: { max_users: 30, max_products: 3000, max_storage_locations: 75 },
    storage_locations: [{ name: 'Central Storage', temperature_zone: 'ambient' }]
  };
}
function formFromPreset(preset: ProvisioningPresetVersion): PresetForm {
  return {
    key: preset.key,
    label: preset.label,
    description: preset.description || '',
    organization_type: preset.organization_type,
    feature_flags: { ...(preset.feature_flags || {}) },
    limits: { ...(preset.limits || {}) },
    storage_locations: (preset.storage_locations || []).map((location) => ({ name: location.name, temperature_zone: location.temperature_zone || '' }))
  };
}
function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function dateTime(value?: string | null) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString();
}
function actorLabel(row: ProvisioningPresetVersion, prefix: 'created' | 'updated' | 'published' | 'retired', canReadUsers: boolean) {
  const present = row[`${prefix}_by_present` as keyof ProvisioningPresetVersion] === true;
  if (!present) return 'Not recorded';
  if (!canReadUsers) return 'Restricted';
  const email = row[`${prefix}_by_email` as keyof ProvisioningPresetVersion];
  const id = row[`${prefix}_by_platform_user_id` as keyof ProvisioningPresetVersion];
  return String(email || id || 'Recorded user');
}
function statusTone(status: PresetStatus) { return status === 'published' ? 'good' : status === 'draft' ? 'warn' : 'neutral'; }

function PresetEditor({ form, onChange, includeKey, disabled = false }: { form: PresetForm; onChange: (next: PresetForm) => void; includeKey: boolean; disabled?: boolean }) {
  const featureKeys = useMemo(() => Array.from(new Set([...FEATURE_FLAGS, ...Object.keys(form.feature_flags || {})])), [form.feature_flags]);
  const limitKeys = useMemo(() => Array.from(new Set([...LIMIT_KEYS, ...Object.keys(form.limits || {})])), [form.limits]);
  const updateLocation = (index: number, patch: Partial<StorageLocationDraft>) => onChange({
    ...form,
    storage_locations: form.storage_locations.map((location, locationIndex) => locationIndex === index ? { ...location, ...patch } : location)
  });

  return <div className="platform-provisioning-presets__editor">
    {includeKey ? <label>Preset key<input value={form.key} disabled={disabled} placeholder="warehouse-standard" onChange={(event) => onChange({ ...form, key: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} /></label> : null}
    <div className="platform-provisioning-presets__form-grid">
      <label>Name<input value={form.label} disabled={disabled} onChange={(event) => onChange({ ...form, label: event.target.value })} /></label>
      <label>Organization type<input value={form.organization_type} disabled={disabled} onChange={(event) => onChange({ ...form, organization_type: event.target.value })} /></label>
    </div>
    <label>Description<textarea value={form.description} disabled={disabled} onChange={(event) => onChange({ ...form, description: event.target.value })} /></label>

    <div className="platform-provisioning-presets__editor-block">
      <strong>Default feature flags</strong>
      <span>These are application template defaults. Publishing them does not prove a customer purchased, enabled or successfully adopted the corresponding capability.</span>
      <div className="platform-provisioning-presets__check-grid">
        {featureKeys.map((key) => <label key={key} className="platform-provisioning-presets__check"><input type="checkbox" checked={form.feature_flags[key] === true} disabled={disabled} onChange={(event) => onChange({ ...form, feature_flags: { ...form.feature_flags, [key]: event.target.checked } })} />{pretty(key)}</label>)}
      </div>
    </div>

    <div className="platform-provisioning-presets__editor-block">
      <strong>Default limits</strong>
      <span>Limits are application configuration defaults copied into provisioning logic; they are not external contractual entitlements.</span>
      <div className="platform-provisioning-presets__form-grid platform-provisioning-presets__limits-grid">
        {limitKeys.map((key) => <label key={key}>{pretty(key)}<input type="number" min={0} value={Number(form.limits[key] ?? 0)} disabled={disabled} onChange={(event) => onChange({ ...form, limits: { ...form.limits, [key]: Math.max(0, Number(event.target.value) || 0) } })} /></label>)}
      </div>
    </div>

    <div className="platform-provisioning-presets__editor-block">
      <div className="platform-provisioning-presets__inline-header"><div><strong>Starter storage locations</strong><span>Template definitions only; they do not prove a physical customer location exists.</span></div>{!disabled ? <button type="button" className="app-button app-button--secondary" onClick={() => onChange({ ...form, storage_locations: [...form.storage_locations, { name: '', temperature_zone: 'ambient' }] })}>Add location</button> : null}</div>
      <div className="platform-provisioning-presets__locations">
        {form.storage_locations.map((location, index) => <div key={`${index}-${location.name}`} className="platform-provisioning-presets__location-row">
          <input aria-label={`Location ${index + 1} name`} placeholder="Location name" value={location.name} disabled={disabled} onChange={(event) => updateLocation(index, { name: event.target.value })} />
          <input aria-label={`Location ${index + 1} temperature zone`} placeholder="Temperature zone" value={location.temperature_zone} disabled={disabled} onChange={(event) => updateLocation(index, { temperature_zone: event.target.value })} />
          {!disabled ? <button type="button" className="app-button app-button--danger" onClick={() => onChange({ ...form, storage_locations: form.storage_locations.filter((_, locationIndex) => locationIndex !== index) })}>Remove</button> : null}
        </div>)}
      </div>
    </div>
  </div>;
}

export default function PlatformProvisioningPresetsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PROVISIONING_PRESETS_WRITE);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const requestedStatus = searchParams.get('status') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedKey = searchParams.get('key') || '';
  const requestedPage = Number(searchParams.get('page') || '1');
  const status = STATUSES.includes(requestedStatus as PresetStatus) ? requestedStatus as PresetStatus : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const keyFilter = /^[a-z0-9][a-z0-9_-]{1,79}$/.test(requestedKey) ? requestedKey : '';
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const invalidFilters = Boolean((requestedStatus && !status) || (requestedSearch && !search) || (requestedKey && !keyFilter) || !Number.isInteger(requestedPage) || requestedPage < 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [selectedId, setSelectedId] = useState('');
  const [createForm, setCreateForm] = useState<PresetForm>(defaultForm());
  const [editForm, setEditForm] = useState<PresetForm>(defaultForm());
  const [cloneKey, setCloneKey] = useState('');
  const [cloneLabel, setCloneLabel] = useState('');
  const [message, setMessage] = useState('');
  const [mutationError, setMutationError] = useState('');

  const setFilter = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value); else next.delete(name);
    if (name !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };
  const showPreset = (row: ProvisioningPresetVersion) => {
    const next = new URLSearchParams();
    next.set('key', row.key);
    next.set('page', '1');
    setSearchParams(next, { replace: true });
    setSelectedId(row.id);
  };
  const resetFilters = () => setSearchParams({}, { replace: true });

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    if (keyFilter) params.set('key', keyFilter);
    return params.toString();
  }, [offset, status, search, keyFilter]);

  const versionsQuery = useQuery({
    queryKey: ['platform', 'provisioning', 'preset-versions', status, search, keyFilter, offset],
    queryFn: () => platformApiRequest<PresetRegistryResponse>(`/platform/provisioning/preset-versions?${queryString}`),
    enabled: !invalidFilters
  });
  const data = versionsQuery.data;
  const rows = data?.preset_versions || [];
  const selected = useMemo(() => rows.find((row) => row.id === selectedId) || null, [rows, selectedId]);

  useEffect(() => {
    if (!selectedId && rows.length) setSelectedId(rows[0].id);
    if (selectedId && !rows.some((row) => row.id === selectedId)) setSelectedId(rows[0]?.id || '');
  }, [rows, selectedId]);
  useEffect(() => {
    if (!selected) return;
    setEditForm(formFromPreset(selected));
    setCloneKey('');
    setCloneLabel(`${selected.label} copy`);
  }, [selected]);

  const refresh = async () => queryClient.invalidateQueries({ queryKey: ['platform', 'provisioning'] });
  const mutationDefaults = {
    onMutate: () => { setMessage(''); setMutationError(''); },
    onError: (error: unknown) => setMutationError(readableError(error))
  };

  const createDraft = useMutation({
    mutationFn: () => platformApiRequest<ProvisioningPresetVersion>('/platform/provisioning/preset-versions', { method: 'POST', body: JSON.stringify(createForm) }),
    ...mutationDefaults,
    onSuccess: async (created) => { setMessage(`Draft ${created.key} v${created.preset_version} created.`); setCreateForm(defaultForm()); await refresh(); showPreset(created); }
  });
  const saveDraft = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a preset version');
      const { key: _key, ...payload } = editForm; void _key;
      return platformApiRequest<ProvisioningPresetVersion>(`/platform/provisioning/preset-versions/${selected.id}`, { method: 'PATCH', version: selected.version, body: JSON.stringify(payload) });
    },
    ...mutationDefaults,
    onSuccess: async (updated) => { setMessage(`Draft ${updated.key} v${updated.preset_version} saved.`); await refresh(); setSelectedId(updated.id); }
  });
  const createVersion = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a preset version');
      return platformApiRequest<ProvisioningPresetVersion>(`/platform/provisioning/preset-versions/${selected.id}/new-version`, { method: 'POST', version: selected.version, body: JSON.stringify({}) });
    },
    ...mutationDefaults,
    onSuccess: async (created) => { setMessage(`Draft ${created.key} v${created.preset_version} created from the selected version.`); await refresh(); showPreset(created); }
  });
  const clonePreset = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a preset version');
      return platformApiRequest<ProvisioningPresetVersion>(`/platform/provisioning/preset-versions/${selected.id}/clone`, { method: 'POST', version: selected.version, body: JSON.stringify({ key: cloneKey.trim(), label: cloneLabel.trim() || undefined }) });
    },
    ...mutationDefaults,
    onSuccess: async (created) => { setMessage(`Cloned to ${created.key} v${created.preset_version} draft.`); await refresh(); showPreset(created); }
  });
  const publishPreset = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a preset version');
      return platformApiRequest<ProvisioningPresetVersion>(`/platform/provisioning/preset-versions/${selected.id}/publish`, { method: 'POST', version: selected.version, body: JSON.stringify({}) });
    },
    ...mutationDefaults,
    onSuccess: async (published) => { setMessage(`${published.label} v${published.preset_version} is now published. Any previous published version for this key was retired.`); await refresh(); showPreset(published); }
  });
  const retirePreset = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a preset version');
      return platformApiRequest<ProvisioningPresetVersion>(`/platform/provisioning/preset-versions/${selected.id}/retire`, { method: 'POST', version: selected.version, body: JSON.stringify({ reason: 'Retired from Platform Preset Management' }) });
    },
    ...mutationDefaults,
    onSuccess: async (retired) => { setMessage(`${retired.label} v${retired.preset_version} retired.`); await refresh(); showPreset(retired); }
  });

  const busy = createDraft.isPending || saveDraft.isPending || createVersion.isPending || clonePreset.isPending || publishPreset.isPending || retirePreset.isPending;
  const createValid = Boolean(createForm.key.trim() && createForm.label.trim() && createForm.organization_type.trim() && createForm.storage_locations.every((location) => location.name.trim()));
  const editValid = Boolean(editForm.label.trim() && editForm.organization_type.trim() && editForm.storage_locations.every((location) => location.name.trim()));
  const pageCount = Math.max(1, Math.ceil((data?.pagination.total || 0) / PAGE_SIZE));

  return <div className="io-operational-page io-workspace-page platform-provisioning-presets">
    <OperationalWorkspaceHero
      iconPath="/platform/provisioning-presets"
      eyebrow="Platform operations"
      title="Provisioning presets"
      description="Manage versioned application templates used by tenant provisioning without treating template configuration as proof of customer fit, physical deployment or external contractual entitlement."
      meta={<><OperationalWorkspaceMetaPill>Draft → Published → Retired</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>One published version per key</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{canWrite ? 'Write enabled' : 'Read only'}</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-provisioning-presets__hero-aside"><OperationalWorkspaceStatus value={data?.summary.published ?? '—'} label="published versions" /><button type="button" className="app-button app-button--secondary" onClick={() => void refresh()} disabled={versionsQuery.isFetching}>{versionsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button></div>}
    />

    {message ? <div className="platform-provisioning-presets__success"><span>{message}</span><button type="button" className="app-button app-button--secondary" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {mutationError ? <div className="platform-provisioning-presets__warning"><strong>Action failed.</strong><span>{mutationError}</span></div> : null}
    {invalidFilters ? <div className="platform-provisioning-presets__warning"><strong>Invalid filter values.</strong><span>Unsupported URL filters were not queried.</span><button type="button" className="app-button app-button--secondary" onClick={resetFilters}>Reset filters</button></div> : null}
    {versionsQuery.isError && data ? <div className="platform-provisioning-presets__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(versionsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void versionsQuery.refetch()}>Retry</button></div> : null}

    <OperationalWorkspaceStats ariaLabel="Provisioning preset registry summary">
      <OperationalWorkspaceStatCard label="Filtered versions" value={data?.summary.total ?? '—'} helper="Registry-wide count for the active filters" loading={versionsQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Published" value={data?.summary.published ?? '—'} helper="Application-selectable versions in the filtered registry" tone={(data?.summary.published || 0) > 0 ? 'good' : 'danger'} loading={versionsQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Draft" value={data?.summary.draft ?? '—'} helper="Mutable versions awaiting an explicit publish decision" tone={(data?.summary.draft || 0) > 0 ? 'warn' : 'neutral'} loading={versionsQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Retired" value={data?.summary.retired ?? '—'} helper="Historical versions no longer selectable for new provisioning" tone="neutral" loading={versionsQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Preset keys" value={data?.summary.preset_keys ?? '—'} helper="Distinct keys represented by the active filters" loading={versionsQuery.isLoading && !data} />
    </OperationalWorkspaceStats>

    <section className="platform-provisioning-presets__section">
      <OperationalSectionHeader iconPath="/platform/provisioning-presets" title="Preset registry" description="Search and page through persisted preset versions. Summary cards describe the complete filtered registry, not only the loaded 50-row page." />
      <div className="platform-provisioning-presets__filters">
        <label className="platform-provisioning-presets__search">Search<input value={search} placeholder="Key, name, organization type or description" onChange={(event) => setFilter('search', event.target.value)} /></label>
        <label>Status<select value={status} onChange={(event) => setFilter('status', event.target.value)}><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select></label>
        <label>Exact key<input value={keyFilter} placeholder="hotel" onChange={(event) => setFilter('key', event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} /></label>
        <button type="button" className="app-button app-button--secondary" onClick={resetFilters} disabled={!status && !search && !keyFilter && page === 1}>Clear filters</button>
      </div>

      {!invalidFilters && versionsQuery.isError && !data ? <div className="platform-provisioning-presets__blocking-error"><strong>Provisioning preset registry could not be loaded.</strong><span>{readableError(versionsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void versionsQuery.refetch()}>Retry</button></div> : null}
      {versionsQuery.isLoading && !data ? <div className="platform-provisioning-presets__loading">Loading provisioning preset versions…</div> : null}
      {data && !rows.length ? <div className="platform-provisioning-presets__empty"><strong>No matching preset versions.</strong><span>Adjust the filters or create a new draft if you have write permission.</span></div> : null}
      {rows.length ? <div className="platform-provisioning-presets__list">{rows.map((row) => <article key={row.id} className={`platform-provisioning-presets__card${row.id === selectedId ? ' is-selected' : ''}`}>
        <div className="platform-provisioning-presets__card-header"><div><h4>{row.label}</h4><p>{row.key} · business v{row.preset_version} · row version {row.version}</p></div><div className="platform-provisioning-presets__badges"><span data-tone={statusTone(row.status)}>{pretty(row.status)}</span><span>{row.organization_type}</span><span>{row.storage_locations.length} starter locations</span></div></div>
        <p className="platform-provisioning-presets__description">{row.description || 'No description recorded.'}</p>
        <div className="platform-provisioning-presets__metrics"><div><span>Updated</span><strong>{dateTime(row.updated_at)}</strong></div><div><span>Published</span><strong>{dateTime(row.published_at)}</strong></div><div><span>Retired</span><strong>{dateTime(row.retired_at)}</strong></div><div><span>Updated by</span><strong>{actorLabel(row, 'updated', canReadUsers)}</strong></div></div>
        <div className="platform-provisioning-presets__card-footer"><span>{row.status === 'published' ? 'Selectable by application provisioning. This does not certify customer suitability.' : row.status === 'draft' ? 'Mutable application draft; not selectable by tenant provisioning.' : 'Historical application version; not selectable for new provisioning.'}</span><button type="button" className="app-button app-button--secondary" onClick={() => setSelectedId(row.id)}>{row.id === selectedId ? 'Selected' : 'Select'}</button></div>
      </article>)}</div> : null}
      {data ? <div className="platform-provisioning-presets__pagination"><button type="button" className="app-button app-button--secondary" disabled={page <= 1 || versionsQuery.isFetching} onClick={() => setFilter('page', String(Math.max(1, page - 1)))}>Previous</button><span>Page {page} of {pageCount} · {data.pagination.total} filtered versions</span><button type="button" className="app-button app-button--secondary" disabled={!data.pagination.has_more || versionsQuery.isFetching} onClick={() => setFilter('page', String(page + 1))}>Next</button></div> : null}
    </section>

    {selected ? <section className="platform-provisioning-presets__section platform-provisioning-presets__detail">
      <OperationalSectionHeader
        iconPath="/platform/provisioning-presets"
        title={`${selected.label} · ${selected.key} v${selected.preset_version}`}
        description={`Application lifecycle: ${pretty(selected.status)}. Published and retired versions are immutable; changes to a live preset require a new draft version.`}
        actions={<div className="platform-provisioning-presets__actions">
          {canWrite && selected.status !== 'draft' ? <button type="button" className="app-button app-button--secondary" disabled={busy} onClick={() => createVersion.mutate()}>Create new version</button> : null}
          {canWrite && selected.status === 'draft' ? <button type="button" className="app-button app-button--primary" disabled={busy || !editValid} onClick={() => saveDraft.mutate()}>Save draft</button> : null}
          {canWrite && selected.status === 'draft' ? <button type="button" className="app-button app-button--primary" disabled={busy || !editValid} onClick={() => { if (window.confirm(`Publish ${selected.key} v${selected.preset_version}? The currently published version of this key will be retired atomically.`)) publishPreset.mutate(); }}>Publish</button> : null}
          {canWrite && selected.status !== 'retired' ? <button type="button" className="app-button app-button--danger" disabled={busy} onClick={() => { if (window.confirm(`Retire ${selected.key} v${selected.preset_version}? Published retirement is blocked if it would leave no published preset available.`)) retirePreset.mutate(); }}>Retire</button> : null}
        </div>}
      />
      <div className="platform-provisioning-presets__truth-note"><strong>Evidence boundary</strong><span>Publishing makes this version selectable by application provisioning. It does not prove a customer should use it, that physical locations exist, that contractual entitlements match these defaults, or that onboarding succeeded.</span></div>
      <PresetEditor form={editForm} onChange={setEditForm} includeKey={false} disabled={selected.status !== 'draft' || !canWrite} />
      <div className="platform-provisioning-presets__audit-grid"><div><span>Created by</span><strong>{actorLabel(selected, 'created', canReadUsers)}</strong></div><div><span>Updated by</span><strong>{actorLabel(selected, 'updated', canReadUsers)}</strong></div><div><span>Published by</span><strong>{actorLabel(selected, 'published', canReadUsers)}</strong></div><div><span>Retired by</span><strong>{actorLabel(selected, 'retired', canReadUsers)}</strong></div></div>
      {canWrite ? <div className="platform-provisioning-presets__clone"><div><strong>Clone as a new preset key</strong><span>Creates a new Draft v1; the clone is not published automatically.</span></div><div className="platform-provisioning-presets__clone-grid"><input placeholder="new-preset-key" value={cloneKey} onChange={(event) => setCloneKey(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} /><input placeholder="Clone name" value={cloneLabel} onChange={(event) => setCloneLabel(event.target.value)} /><button type="button" className="app-button app-button--secondary" disabled={busy || cloneKey.trim().length < 2} onClick={() => clonePreset.mutate()}>Clone to draft</button></div></div> : null}
    </section> : null}

    {canWrite ? <section className="platform-provisioning-presets__section platform-provisioning-presets__create">
      <OperationalSectionHeader iconPath="/platform/provisioning-presets" title="Create new preset key" description="New keys always start as Draft v1 and remain unavailable to tenant provisioning until an explicit publish action succeeds." />
      <PresetEditor form={createForm} onChange={setCreateForm} includeKey />
      <div className="platform-provisioning-presets__actions"><button type="button" className="app-button app-button--primary" disabled={busy || !createValid} onClick={() => createDraft.mutate()}>Create draft preset</button></div>
    </section> : null}

    <section className="platform-provisioning-presets__section">
      <OperationalSectionHeader iconPath="/platform/provisioning-presets" title="Supporting evidence" description="Open only the Platform areas you are authorized to read." />
      <div className="platform-provisioning-presets__supporting-links">{canReadTenants ? <Link to="/platform/provisioning">Provisioning</Link> : null}{canReadTenants ? <Link to="/platform/tenants">Tenants</Link> : null}{canReadUsers ? <Link to="/platform/users">Platform users</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div>
    </section>
  </div>;
}
