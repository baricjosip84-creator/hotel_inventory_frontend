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
import './PlatformProvisioningPage.css';

type ProvisioningPreset = {
  id: string;
  key: string;
  preset_version: number;
  version: number;
  status: 'published';
  label: string;
  description: string;
  organization_type: string;
  feature_flags: Record<string, boolean>;
  limits: Record<string, number>;
  storage_locations: Array<{ name: string; temperature_zone?: string | null }>;
  published_at?: string | null;
};

type TenantRow = {
  id: string;
  name: string;
  location?: string | null;
  status?: string;
  plan_code?: string;
  organization_type?: string | null;
};

type EvidenceContract = {
  application_configuration_only: boolean;
  preview_is_point_in_time_and_rechecked_on_apply: boolean;
  preset_application_does_not_prove_customer_onboarding_complete: boolean;
  preset_application_does_not_prove_external_integration_or_business_outcome: boolean;
  starter_location_creation_does_not_prove_physical_location_exists: boolean;
};

type ProvisioningPreview = {
  tenant: TenantRow & { write_locked?: boolean; feature_flags?: Record<string, boolean>; limits?: Record<string, number> };
  preset_key: string;
  preset_version_id: string;
  preset_version: number;
  preset: ProvisioningPreset;
  entitlement_source: string;
  planned_organization_type: string;
  planned_feature_flags: Record<string, boolean>;
  planned_limits: Record<string, number>;
  storage_locations_to_create: Array<{ name: string; temperature_zone?: string | null }>;
  skipped_existing_storage_locations: number;
  lifecycle_blocked: boolean;
  evidence_contract: EvidenceContract;
};

type ApplyResponse = {
  preset_key: string;
  preset_version: number;
  preset_recorded_on_tenant: boolean;
  created_storage_locations: Array<{ id: string; name: string }>;
  skipped_storage_locations: number;
  entitlement_source?: string | null;
};

type CreateResponse = {
  tenant?: TenantRow;
  provisioning?: ApplyResponse;
};

type CreateForm = {
  name: string;
  location: string;
  preset: string;
  plan_code: 'starter' | 'standard' | 'enterprise';
  initial_admin_email: string;
  initial_admin_name: string;
  initial_admin_password: string;
  create_storage_locations: boolean;
  create_onboarding_tasks: boolean;
};

type Feedback = { tone: 'success' | 'danger' | 'warn'; message: string } | null;

const planOptions: Array<{ code: CreateForm['plan_code']; label: string }> = [
  { code: 'starter', label: 'Starter' },
  { code: 'standard', label: 'Standard' },
  { code: 'enterprise', label: 'Enterprise' }
];

function emptyCreateForm(preset = ''): CreateForm {
  return {
    name: '', location: '', preset, plan_code: 'standard', initial_admin_email: '', initial_admin_name: '', initial_admin_password: '',
    create_storage_locations: true, create_onboarding_tasks: true
  };
}

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function clean(value: string) { const normalized = value.trim(); return normalized || null; }
function isValidEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function pretty(value?: string | null) { const normalized = String(value || '').replaceAll('_', ' ').trim(); return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Not recorded'; }
function countEnabled(flags?: Record<string, boolean>) { return Object.values(flags || {}).filter(Boolean).length; }

export default function PlatformProvisioningPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTenantId = searchParams.get('tenant_id') || '';
  const selectedPresetKey = searchParams.get('preset') || '';
  const [createStorageLocations, setCreateStorageLocations] = useState(true);
  const [updateEntitlements, setUpdateEntitlements] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(() => emptyCreateForm());

  const canCreate = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_CREATE);
  const canUpdate = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadTenantTasks = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadPresetManagement = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PROVISIONING_PRESETS_READ);

  const presetsQuery = useQuery({
    queryKey: ['platform', 'provisioning', 'presets'],
    queryFn: () => platformApiRequest<ProvisioningPreset[]>('/platform/provisioning/presets'),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => platformApiRequest<TenantRow[]>('/platform/tenants'),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const selectedPreset = useMemo(
    () => (presetsQuery.data || []).find((preset) => preset.key === selectedPresetKey) || null,
    [presetsQuery.data, selectedPresetKey]
  );
  const selectedTenant = useMemo(
    () => (tenantsQuery.data || []).find((tenant) => tenant.id === selectedTenantId) || null,
    [tenantsQuery.data, selectedTenantId]
  );

  const previewQuery = useQuery({
    queryKey: ['platform', 'provisioning', 'preview', selectedTenantId, selectedPreset?.id || ''],
    queryFn: () => platformApiRequest<ProvisioningPreview>(`/platform/provisioning/tenants/${encodeURIComponent(selectedTenantId)}/preview/${encodeURIComponent(selectedPreset!.key)}?preset_version_id=${encodeURIComponent(selectedPreset!.id)}`),
    enabled: Boolean(selectedTenantId && selectedPreset),
    staleTime: 15_000,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    const presets = presetsQuery.data || [];
    if (!presets.length) return;
    const fallback = presets[0].key;
    if (!selectedPresetKey || !presets.some((preset) => preset.key === selectedPresetKey)) {
      const next = new URLSearchParams(searchParams);
      next.set('preset', fallback);
      setSearchParams(next, { replace: true });
    }
    setCreateForm((current) => presets.some((preset) => preset.key === current.preset) ? current : { ...current, preset: fallback });
  }, [presetsQuery.data, selectedPresetKey, searchParams, setSearchParams]);

  const setUrlFilter = (key: 'tenant_id' | 'preset', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
    setFeedback(null);
  };

  const adminFields = [createForm.initial_admin_email.trim(), createForm.initial_admin_name.trim(), createForm.initial_admin_password];
  const hasPartialAdmin = adminFields.some(Boolean) && !adminFields.every(Boolean);
  const hasCompleteAdmin = adminFields.every(Boolean);
  const invalidAdminEmail = Boolean(createForm.initial_admin_email.trim()) && !isValidEmail(createForm.initial_admin_email);
  const invalidAdminPassword = Boolean(createForm.initial_admin_password) && createForm.initial_admin_password.length < 10;
  const createValid = Boolean(createForm.name.trim() && createForm.preset) && !hasPartialAdmin && !invalidAdminEmail && !invalidAdminPassword;
  const preview = previewQuery.data;
  const noApplyChanges = !createStorageLocations && !updateEntitlements;
  const applyValid = Boolean(canUpdate && selectedTenant && selectedPreset && preview && !preview.lifecycle_blocked && !noApplyChanges);

  const createTenant = useMutation({
    mutationFn: () => platformApiRequest<CreateResponse>('/platform/provisioning/tenants', {
      method: 'POST',
      body: JSON.stringify({
        name: createForm.name.trim(), location: clean(createForm.location), preset: createForm.preset,
        preset_version_id: (presetsQuery.data || []).find((preset) => preset.key === createForm.preset)?.id,
        plan_code: createForm.plan_code,
        create_storage_locations: createForm.create_storage_locations,
        initial_admin: hasCompleteAdmin ? { email: createForm.initial_admin_email.trim(), name: createForm.initial_admin_name.trim(), password: createForm.initial_admin_password } : undefined,
        create_onboarding_tasks: createForm.create_onboarding_tasks
      })
    }),
    onSuccess: async (data) => {
      setFeedback({ tone: 'success', message: `Tenant created atomically from the published preset${data.provisioning ? `; ${data.provisioning.created_storage_locations.length} starter locations recorded` : ''}.` });
      setCreateForm(emptyCreateForm(selectedPreset?.key || presetsQuery.data?.[0]?.key || ''));
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    },
    onError: (error) => setFeedback({ tone: 'danger', message: readableError(error) })
  });

  const applyPreset = useMutation({
    mutationFn: () => platformApiRequest<ApplyResponse>(`/platform/provisioning/tenants/${encodeURIComponent(selectedTenantId)}/apply`, {
      method: 'POST',
      body: JSON.stringify({ preset: selectedPreset!.key, preset_version_id: selectedPreset!.id, create_storage_locations: createStorageLocations, update_entitlements: updateEntitlements })
    }),
    onSuccess: async (data) => {
      setFeedback({ tone: 'success', message: `Provisioning transaction committed. ${data.created_storage_locations.length} starter locations created; preset metadata ${data.preset_recorded_on_tenant ? 'updated with tenant configuration' : 'left unchanged because entitlements were not applied'}.` });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] }),
        queryClient.invalidateQueries({ queryKey: ['platform', 'provisioning', 'preview', selectedTenantId] })
      ]);
    },
    onError: (error) => setFeedback({ tone: 'danger', message: readableError(error) })
  });

  const initialError = (presetsQuery.isError && !presetsQuery.data) || (tenantsQuery.isError && !tenantsQuery.data);
  const staleWarning = (presetsQuery.isError && Boolean(presetsQuery.data)) || (tenantsQuery.isError && Boolean(tenantsQuery.data)) || (previewQuery.isError && Boolean(previewQuery.data));
  const refreshing = presetsQuery.isFetching || tenantsQuery.isFetching || previewQuery.isFetching;
  const refresh = async () => {
    setFeedback(null);
    await Promise.all([presetsQuery.refetch(), tenantsQuery.refetch(), selectedTenantId && selectedPreset ? previewQuery.refetch() : Promise.resolve()]);
  };

  return <div className="platform-provisioning">
    <OperationalWorkspaceHero
      iconPath="/platform/provisioning"
      eyebrow="Platform operations · Tenant setup"
      title="Provisioning"
      description="Create a tenant atomically from a published preset or apply selected preset configuration to an existing tenant. Preview and application are Platform configuration evidence, not proof of customer onboarding or a physical setup."
      meta={<><OperationalWorkspaceMetaPill>{presetsQuery.data?.length ?? 0} published presets</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{tenantsQuery.data?.length ?? 0} tenant records loaded</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>Preset read boundary enforced</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-provisioning__hero-aside"><OperationalWorkspaceStatus value={selectedTenant ? pretty(selectedTenant.status) : 'No tenant'} label={selectedTenant ? selectedTenant.name : 'Select a tenant to preview'} /><button type="button" className="app-button app-button--secondary" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? 'Refreshing…' : 'Refresh'}</button></div>}
    />

    {feedback ? <div className="platform-provisioning__feedback" data-tone={feedback.tone}>{feedback.message}</div> : null}
    {staleWarning ? <div className="platform-provisioning__stale"><strong>Showing the last successful snapshot.</strong><span>A background refresh failed. Existing evidence remains visible.</span><button type="button" className="app-button app-button--secondary" onClick={() => void refresh()}>Retry</button></div> : null}

    <OperationalWorkspaceStats ariaLabel="Provisioning snapshot">
      <OperationalWorkspaceStatCard label="Published presets" value={presetsQuery.data?.length ?? 0} helper="Definitions readable under Provisioning Presets permission" iconPath="/platform/provisioning-presets" />
      <OperationalWorkspaceStatCard label="Selected tenant" value={selectedTenant ? selectedTenant.name : 'None'} helper={selectedTenant ? `${pretty(selectedTenant.status)} · ${selectedTenant.plan_code || 'plan not recorded'}` : 'Choose a tenant for preview/apply'} iconPath="/platform/tenants" />
      <OperationalWorkspaceStatCard label="Missing starter locations" value={preview ? preview.storage_locations_to_create.length : '—'} helper={preview ? `${preview.skipped_existing_storage_locations} matching active locations already recorded` : 'Preview required'} tone={preview && preview.storage_locations_to_create.length ? 'warn' : 'neutral'} iconPath="/platform/provisioning" />
      <OperationalWorkspaceStatCard label="Entitlement source" value={preview ? pretty(preview.entitlement_source) : '—'} helper="Commercial plan catalog takes precedence when the tenant has a supported plan" tone="blue" iconPath="/platform/provisioning" />
    </OperationalWorkspaceStats>

    {initialError ? <section className="io-workspace-panel platform-provisioning__blocking-error"><strong>Provisioning source data could not be loaded.</strong><span>{readableError(presetsQuery.error || tenantsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void refresh()}>Retry</button></section> : null}

    <section className="io-workspace-panel platform-provisioning__section">
      <OperationalSectionHeader iconPath="/platform/provisioning-presets" title="Published preset registry" description="Only published preset versions are selectable. The configuration is protected by the dedicated Provisioning Presets read permission." actions={canReadPresetManagement ? <Link className="app-button app-button--secondary" to="/platform/provisioning-presets">Manage presets</Link> : undefined} />
      {presetsQuery.isPending ? <div className="platform-provisioning__loading">Loading published presets…</div> : (presetsQuery.data || []).length === 0 ? <div className="platform-provisioning__empty"><strong>No published presets.</strong><span>Tenant provisioning cannot proceed until a preset version is published.</span></div> : <div className="platform-provisioning__preset-grid">{(presetsQuery.data || []).map((preset) => <article key={preset.id} className={`platform-provisioning__preset-card${preset.key === selectedPreset?.key ? ' is-selected' : ''}`}>
        <div className="platform-provisioning__card-header"><div><h4>{preset.label}</h4><p>{preset.description || 'No description recorded.'}</p></div><span>v{preset.preset_version}</span></div>
        <div className="platform-provisioning__card-metrics"><div><span>Organization type</span><strong>{pretty(preset.organization_type)}</strong></div><div><span>Enabled flags</span><strong>{countEnabled(preset.feature_flags)}</strong></div><div><span>Limits</span><strong>{Object.keys(preset.limits || {}).length}</strong></div><div><span>Starter locations</span><strong>{preset.storage_locations.length}</strong></div></div>
        <button type="button" className="app-button app-button--secondary" onClick={() => setUrlFilter('preset', preset.key)}>{preset.key === selectedPreset?.key ? 'Selected preset' : 'Select preset'}</button>
      </article>)}</div>}
    </section>

    {canCreate ? <section className="io-workspace-panel platform-provisioning__section">
      <OperationalSectionHeader iconPath="/platform/tenants" title="Create provisioned tenant" description="Tenant record, optional initial admin, onboarding tasks, starter locations and both tenant/provisioning audit events commit in one database transaction. Any failure rolls the whole creation back." />
      <div className="platform-provisioning__form-grid">
        <label>Published preset<select value={createForm.preset} onChange={(e) => setCreateForm({ ...createForm, preset: e.target.value })}><option value="">Select preset</option>{(presetsQuery.data || []).map((preset) => <option key={preset.id} value={preset.key}>{preset.label} · v{preset.preset_version}</option>)}</select></label>
        <label>Tenant name<input value={createForm.name} maxLength={160} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></label>
        <label>Location<input value={createForm.location} maxLength={255} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })} /></label>
        <label>Commercial plan<select value={createForm.plan_code} onChange={(e) => setCreateForm({ ...createForm, plan_code: e.target.value as CreateForm['plan_code'] })}>{planOptions.map((plan) => <option key={plan.code} value={plan.code}>{plan.label} ({plan.code})</option>)}</select></label>
        <label>Initial admin email<input type="email" value={createForm.initial_admin_email} onChange={(e) => setCreateForm({ ...createForm, initial_admin_email: e.target.value })} /></label>
        <label>Initial admin name<input value={createForm.initial_admin_name} maxLength={160} onChange={(e) => setCreateForm({ ...createForm, initial_admin_name: e.target.value })} /></label>
        <label>Initial admin password<input type="password" autoComplete="new-password" value={createForm.initial_admin_password} onChange={(e) => setCreateForm({ ...createForm, initial_admin_password: e.target.value })} /></label>
      </div>
      <div className="platform-provisioning__option-grid"><label><input type="checkbox" checked={createForm.create_storage_locations} onChange={(e) => setCreateForm({ ...createForm, create_storage_locations: e.target.checked })} /> Create starter storage-location records</label><label><input type="checkbox" checked={createForm.create_onboarding_tasks} onChange={(e) => setCreateForm({ ...createForm, create_onboarding_tasks: e.target.checked })} /> Create onboarding task records</label></div>
      {hasPartialAdmin ? <div className="platform-provisioning__validation">Initial admin email, name and password must be completed together or all left blank.</div> : null}
      {invalidAdminEmail ? <div className="platform-provisioning__validation">Initial admin email is not valid.</div> : null}
      {invalidAdminPassword ? <div className="platform-provisioning__validation">Initial admin password must contain at least 10 characters.</div> : null}
      <div className="platform-provisioning__actions"><button type="button" className="app-button app-button--primary" disabled={!createValid || createTenant.isPending} onClick={() => { if (window.confirm('Create this tenant atomically from the selected published preset?')) createTenant.mutate(); }}>{createTenant.isPending ? 'Creating…' : 'Create provisioned tenant'}</button></div>
    </section> : <section className="io-workspace-panel platform-provisioning__restricted"><strong>Tenant creation unavailable</strong><span>`TENANTS_CREATE` is required to create a tenant from this workspace.</span></section>}

    <section className="io-workspace-panel platform-provisioning__section">
      <OperationalSectionHeader iconPath="/platform/provisioning" title="Preview and apply to existing tenant" description="Preview is a point-in-time application snapshot. The backend locks and re-reads the tenant, preset and active location evidence when Apply is committed." />
      <div className="platform-provisioning__selector-grid"><label>Tenant<select value={selectedTenantId} onChange={(e) => setUrlFilter('tenant_id', e.target.value)}><option value="">Select tenant</option>{(tenantsQuery.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {pretty(tenant.status)}</option>)}</select></label><label>Preset<select value={selectedPreset?.key || ''} onChange={(e) => setUrlFilter('preset', e.target.value)}><option value="">Select preset</option>{(presetsQuery.data || []).map((preset) => <option key={preset.id} value={preset.key}>{preset.label} · v{preset.preset_version}</option>)}</select></label></div>
      {selectedTenantId && !selectedTenant && !tenantsQuery.isPending ? <div className="platform-provisioning__validation">The tenant selected in the URL is not present in the current tenant registry snapshot.</div> : null}
      {previewQuery.isPending && selectedTenantId ? <div className="platform-provisioning__loading">Building provisioning preview…</div> : null}
      {previewQuery.isError && !preview ? <div className="platform-provisioning__blocking-error"><strong>Provisioning preview failed.</strong><span>{readableError(previewQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void previewQuery.refetch()}>Retry preview</button></div> : null}
      {preview ? <div className="platform-provisioning__preview">
        <div className="platform-provisioning__preview-header"><div><h4>{preview.tenant.name}</h4><p>{pretty(preview.tenant.status)} · {preview.tenant.plan_code || 'plan not recorded'} · target {preview.preset.label} v{preview.preset_version}</p></div><span data-tone={preview.lifecycle_blocked ? 'danger' : 'good'}>{preview.lifecycle_blocked ? 'Lifecycle blocks provisioning' : 'Eligible for application'}</span></div>
        <div className="platform-provisioning__preview-grid"><div><span>Planned organization type</span><strong>{pretty(preview.planned_organization_type)}</strong></div><div><span>Entitlement source</span><strong>{pretty(preview.entitlement_source)}</strong></div><div><span>Enabled planned flags</span><strong>{countEnabled(preview.planned_feature_flags)}</strong></div><div><span>Planned limits</span><strong>{Object.keys(preview.planned_limits || {}).length}</strong></div><div><span>Missing starter locations</span><strong>{preview.storage_locations_to_create.length}</strong></div><div><span>Existing matches skipped</span><strong>{preview.skipped_existing_storage_locations}</strong></div></div>
        {preview.storage_locations_to_create.length ? <div className="platform-provisioning__location-list"><strong>Starter location records that would be created</strong><ul>{preview.storage_locations_to_create.map((location) => <li key={location.name}>{location.name}{location.temperature_zone ? ` · ${location.temperature_zone}` : ''}</li>)}</ul></div> : <div className="platform-provisioning__evidence-note">No missing starter location records in this preview.</div>}
      </div> : null}
      <div className="platform-provisioning__option-grid"><label><input type="checkbox" checked={updateEntitlements} onChange={(e) => setUpdateEntitlements(e.target.checked)} /> Apply organization type, feature flags and limits; record preset version on tenant</label><label><input type="checkbox" checked={createStorageLocations} onChange={(e) => setCreateStorageLocations(e.target.checked)} /> Create missing starter storage-location records</label></div>
      {noApplyChanges ? <div className="platform-provisioning__validation">Select at least one provisioning change.</div> : null}
      {preview?.lifecycle_blocked ? <div className="platform-provisioning__blocking-error"><strong>Provisioning is blocked for this tenant lifecycle state.</strong><span>Offboarding and archived tenants cannot be provisioned.</span></div> : null}
      {!updateEntitlements && createStorageLocations ? <div className="platform-provisioning__evidence-note"><strong>Storage-only application</strong><span>The audit event will record the starter-location action, but tenant preset/version/provisioned-at metadata will not be rewritten as though the full preset configuration was applied.</span></div> : null}
      <div className="platform-provisioning__actions"><button type="button" className="app-button app-button--primary" disabled={!applyValid || applyPreset.isPending} onClick={() => { if (window.confirm('Apply the selected provisioning changes? The backend will recheck the published preset, tenant lifecycle and active location state inside one transaction.')) applyPreset.mutate(); }}>{applyPreset.isPending ? 'Applying…' : 'Apply selected changes'}</button></div>
      {!canUpdate ? <div className="platform-provisioning__restricted"><strong>Read-only provisioning view</strong><span>`TENANTS_UPDATE` is required to apply a preset to an existing tenant.</span></div> : null}
    </section>

    <section className="io-workspace-panel platform-provisioning__section">
      <OperationalSectionHeader iconPath="/platform/provisioning" title="Evidence boundary" description="What this workspace can and cannot prove." />
      <div className="platform-provisioning__truth-grid"><div><strong>Application evidence</strong><span>Published preset version, recorded tenant configuration, audit events, onboarding tasks and storage-location records.</span></div><div><strong>Not external proof</strong><span>A successful transaction does not prove customer onboarding, physical location existence, integration connectivity, training, customer acceptance or a business outcome.</span></div><div><strong>Preview semantics</strong><span>The preview is advisory. Apply rechecks the current database state under transaction locks before committing.</span></div></div>
    </section>

    <section className="io-workspace-panel platform-provisioning__section">
      <OperationalSectionHeader iconPath="/platform/tenants" title="Supporting Platform pages" description="Only destinations permitted by the current Platform permission snapshot are shown." />
      <div className="platform-provisioning__links"><Link to="/platform/tenants">Tenants</Link>{canReadPresetManagement ? <Link to="/platform/provisioning-presets">Provisioning presets</Link> : null}{canReadTenantTasks ? <Link to="/platform/tenant-tasks">Tenant tasks</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}<Link to="/platform/tenant-lifecycle">Tenant lifecycle</Link></div>
    </section>
  </div>;
}
