import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

type ProvisioningPreset = {
  key: string;
  label: string;
  description: string;
  organization_type: string;
  feature_flags: Record<string, boolean>;
  limits: Record<string, number>;
  storage_locations: Array<{ name: string; temperature_zone?: string | null }>;
};

type TenantRow = {
  id: string;
  name: string;
  location?: string | null;
  status?: string;
  plan_code?: string;
  organization_type?: string | null;
};

type ProvisioningPreview = {
  tenant: TenantRow;
  preset_key: string;
  preset: ProvisioningPreset;
  storage_locations_to_create: Array<{ name: string; temperature_zone?: string | null }>;
  skipped_existing_storage_locations: number;
};

function readableError(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

export default function PlatformProvisioningPage() {
  const queryClient = useQueryClient();
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('hotel');
  const [createStorageLocations, setCreateStorageLocations] = useState(true);
  const [updateEntitlements, setUpdateEntitlements] = useState(true);
  const [createForm, setCreateForm] = useState({
    name: '',
    location: '',
    preset: 'hotel',
    plan_code: 'standard',
    initial_admin_email: '',
    initial_admin_name: '',
    initial_admin_password: '',
    create_onboarding_tasks: true
  });

  const canCreate = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_CREATE);
  const canUpdate = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);

  const presetsQuery = useQuery({
    queryKey: ['platform', 'provisioning', 'presets'],
    queryFn: () => platformApiRequest<ProvisioningPreset[]>('/platform/provisioning/presets')
  });

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => platformApiRequest<TenantRow[]>('/platform/tenants')
  });

  const previewQuery = useQuery({
    queryKey: ['platform', 'provisioning', 'preview', selectedTenantId, selectedPreset],
    queryFn: () => platformApiRequest<ProvisioningPreview>(`/platform/provisioning/tenants/${selectedTenantId}/preview/${selectedPreset}`),
    enabled: Boolean(selectedTenantId && selectedPreset)
  });

  const selectedPresetDetails = useMemo(
    () => (presetsQuery.data || []).find((preset) => preset.key === selectedPreset),
    [presetsQuery.data, selectedPreset]
  );

  useEffect(() => {
    if (!presetsQuery.data?.length) return;
    if (!presetsQuery.data.some((preset) => preset.key === selectedPreset)) {
      setSelectedPreset(presetsQuery.data[0].key);
    }
    if (!presetsQuery.data.some((preset) => preset.key === createForm.preset)) {
      setCreateForm((current) => ({ ...current, preset: presetsQuery.data![0].key }));
    }
  }, [presetsQuery.data, selectedPreset, createForm.preset]);

  const createTenant = useMutation({
    mutationFn: () => platformApiRequest('/platform/provisioning/tenants', {
      method: 'POST',
      body: JSON.stringify({
        name: createForm.name,
        location: createForm.location || null,
        preset: createForm.preset,
        plan_code: createForm.plan_code || 'standard',
        create_storage_locations: true,
        initial_admin: createForm.initial_admin_email ? {
          email: createForm.initial_admin_email,
          name: createForm.initial_admin_name,
          password: createForm.initial_admin_password
        } : undefined,
        create_onboarding_tasks: createForm.create_onboarding_tasks
      })
    }),
    onSuccess: async () => {
      setCreateForm({
        name: '',
        location: '',
        preset: selectedPreset || 'hotel',
        plan_code: 'standard',
        initial_admin_email: '',
        initial_admin_name: '',
        initial_admin_password: '',
        create_onboarding_tasks: true
      });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    }
  });

  const applyPreset = useMutation({
    mutationFn: () => platformApiRequest(`/platform/provisioning/tenants/${selectedTenantId}/apply`, {
      method: 'POST',
      body: JSON.stringify({
        preset: selectedPreset,
        create_storage_locations: createStorageLocations,
        update_entitlements: updateEntitlements
      })
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'provisioning', 'preview', selectedTenantId, selectedPreset] });
    }
  });

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>Provisioning</h1>
        <p style={styles.subtitle}>Apply realistic starter setups for different tenant types without manually creating every default location and entitlement.</p>
      </header>

      {presetsQuery.error ? <div style={styles.error}>{readableError(presetsQuery.error)}</div> : null}

      <section style={styles.panel}>
        <h2>Available presets</h2>
        <div style={styles.grid}>
          {(presetsQuery.data || []).map((preset) => (
            <article key={preset.key} style={{ ...styles.card, ...(preset.key === selectedPreset ? styles.selectedCard : {}) }}>
              <h3>{preset.label}</h3>
              <p style={styles.muted}>{preset.description}</p>
              <div style={styles.meta}>Type: {preset.organization_type}</div>
              <div style={styles.meta}>Locations: {preset.storage_locations.length}</div>
              <button type="button" style={styles.buttonSecondary} onClick={() => setSelectedPreset(preset.key)}>Use this preset</button>
            </article>
          ))}
        </div>
      </section>

      {canCreate ? (
        <section style={styles.panel}>
          <h2>Create tenant from preset</h2>
          <div style={styles.formGrid}>
            <label style={styles.label}>Preset
              <select style={styles.input} value={createForm.preset} onChange={(event) => setCreateForm({ ...createForm, preset: event.target.value })}>
                {(presetsQuery.data || []).map((preset) => <option key={preset.key} value={preset.key}>{preset.label}</option>)}
              </select>
            </label>
            <label style={styles.label}>Tenant name
              <input style={styles.input} value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} />
            </label>
            <label style={styles.label}>Location
              <input style={styles.input} value={createForm.location} onChange={(event) => setCreateForm({ ...createForm, location: event.target.value })} />
            </label>
            <label style={styles.label}>Plan code
              <input style={styles.input} value={createForm.plan_code} onChange={(event) => setCreateForm({ ...createForm, plan_code: event.target.value })} />
            </label>
            <label style={styles.label}>Initial admin email
              <input style={styles.input} value={createForm.initial_admin_email} onChange={(event) => setCreateForm({ ...createForm, initial_admin_email: event.target.value })} />
            </label>
            <label style={styles.label}>Initial admin name
              <input style={styles.input} value={createForm.initial_admin_name} onChange={(event) => setCreateForm({ ...createForm, initial_admin_name: event.target.value })} />
            </label>
            <label style={styles.label}>Initial admin password
              <input style={styles.input} type="password" value={createForm.initial_admin_password} onChange={(event) => setCreateForm({ ...createForm, initial_admin_password: event.target.value })} />
            </label>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={createForm.create_onboarding_tasks} onChange={(event) => setCreateForm({ ...createForm, create_onboarding_tasks: event.target.checked })} />
              Create customer onboarding tasks automatically
            </label>
          </div>
          <button type="button" style={styles.button} disabled={createTenant.isPending || !createForm.name} onClick={() => createTenant.mutate()}>
            Create provisioned tenant
          </button>
          {createTenant.error ? <div style={styles.error}>{readableError(createTenant.error)}</div> : null}
          {createTenant.isSuccess ? <div style={styles.success}>Tenant created with preset defaults.</div> : null}
        </section>
      ) : null}

      <section style={styles.panel}>
        <h2>Apply preset to existing tenant</h2>
        <div style={styles.formGrid}>
          <label style={styles.label}>Tenant
            <select style={styles.input} value={selectedTenantId} onChange={(event) => setSelectedTenantId(event.target.value)}>
              <option value="">Select tenant</option>
              {(tenantsQuery.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label style={styles.label}>Preset
            <select style={styles.input} value={selectedPreset} onChange={(event) => setSelectedPreset(event.target.value)}>
              {(presetsQuery.data || []).map((preset) => <option key={preset.key} value={preset.key}>{preset.label}</option>)}
            </select>
          </label>
        </div>

        {selectedPresetDetails ? (
          <div style={styles.previewBox}>
            <h3>{selectedPresetDetails.label}</h3>
            <p style={styles.muted}>{selectedPresetDetails.description}</p>
            <strong>Feature flags</strong>
            <pre style={styles.pre}>{JSON.stringify(selectedPresetDetails.feature_flags, null, 2)}</pre>
            <strong>Limits</strong>
            <pre style={styles.pre}>{JSON.stringify(selectedPresetDetails.limits, null, 2)}</pre>
          </div>
        ) : null}

        {previewQuery.data ? (
          <div style={styles.previewBox}>
            <h3>Preview for {previewQuery.data.tenant.name}</h3>
            <p style={styles.muted}>New storage locations to create: {previewQuery.data.storage_locations_to_create.length}. Existing matching locations skipped: {previewQuery.data.skipped_existing_storage_locations}.</p>
            <ul>
              {previewQuery.data.storage_locations_to_create.map((location) => (
                <li key={location.name}>{location.name} {location.temperature_zone ? `(${location.temperature_zone})` : ''}</li>
              ))}
            </ul>
          </div>
        ) : selectedTenantId && previewQuery.isLoading ? <p>Loading preview…</p> : null}

        <div style={styles.options}>
          <label><input type="checkbox" checked={createStorageLocations} onChange={(event) => setCreateStorageLocations(event.target.checked)} /> Create missing starter storage locations</label>
          <label><input type="checkbox" checked={updateEntitlements} onChange={(event) => setUpdateEntitlements(event.target.checked)} /> Update tenant feature flags and limits</label>
        </div>
        <button type="button" style={styles.button} disabled={!canUpdate || !selectedTenantId || applyPreset.isPending} onClick={() => applyPreset.mutate()}>
          Apply preset
        </button>
        {!canUpdate ? <div style={styles.muted}>You need tenant update permission to apply provisioning to an existing tenant.</div> : null}
        {applyPreset.error ? <div style={styles.error}>{readableError(applyPreset.error)}</div> : null}
        {applyPreset.isSuccess ? <div style={styles.success}>Preset applied.</div> : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 24 },
  title: { margin: 0, fontSize: 32 },
  subtitle: { color: '#6b7280', marginTop: 8 },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'grid', gap: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  card: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, display: 'grid', gap: 8 },
  selectedCard: { borderColor: '#111827', background: '#f9fafb' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  label: { display: 'grid', gap: 6, fontWeight: 700 },
  checkboxLabel: { display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem', color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10 },
  button: { width: 'fit-content', padding: '10px 14px', border: 0, borderRadius: 10, background: '#111827', color: '#fff', cursor: 'pointer' },
  buttonSecondary: { width: 'fit-content', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', cursor: 'pointer' },
  muted: { color: '#6b7280' },
  meta: { fontSize: 13, color: '#374151' },
  pre: { background: '#f3f4f6', borderRadius: 10, padding: 12, overflow: 'auto' },
  previewBox: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, display: 'grid', gap: 8 },
  options: { display: 'grid', gap: 8 },
  error: { color: '#b91c1c', fontWeight: 700 },
  success: { color: '#166534', fontWeight: 700 }
};
