import { useEffect } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import {
  TENANT_PERMISSIONS,
  getCurrentUserRole,
  hasPermission
} from '../lib/permissions';

type TenantSettingsRow = {
  id: string;
  name: string;
  location?: string | null;
  season_start?: string | null;
  season_end?: string | null;
  organization_type?: string | null;
  metadata?: Record<string, unknown> | null;
  write_locked?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type TenantSettingsFormState = {
  name: string;
  location: string;
  season_start: string;
  season_end: string;
  organization_type: string;
  metadata: string;
};

type TenantPayload = {
  name: string;
  location: string | null;
  season_start: string | null;
  season_end: string | null;
  organization_type: string;
  metadata: Record<string, unknown>;
};

const emptyFormState: TenantSettingsFormState = {
  name: '',
  location: '',
  season_start: '',
  season_end: '',
  organization_type: 'facility',
  metadata: '{}'
};

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

function normalizeDateInput(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
}

function formatMetadata(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '{}';
  }

  return JSON.stringify(metadata, null, 2);
}

function createFormState(tenant: TenantSettingsRow | null): TenantSettingsFormState {
  if (!tenant) {
    return emptyFormState;
  }

  return {
    name: tenant.name ?? '',
    location: tenant.location ?? '',
    season_start: normalizeDateInput(tenant.season_start),
    season_end: normalizeDateInput(tenant.season_end),
    organization_type: tenant.organization_type ?? 'facility',
    metadata: formatMetadata(tenant.metadata)
  };
}

function buildPayload(formState: TenantSettingsFormState, metadata: Record<string, unknown>): TenantPayload {
  return {
    name: formState.name.trim(),
    location: formState.location.trim() || null,
    season_start: formState.season_start || null,
    season_end: formState.season_end || null,
    organization_type: formState.organization_type.trim() || 'facility',
    metadata
  };
}

async function fetchTenants(): Promise<TenantSettingsRow[]> {
  return apiRequest<TenantSettingsRow[]>('/tenants');
}

async function createTenant(payload: TenantPayload): Promise<TenantSettingsRow> {
  return apiRequest<TenantSettingsRow>('/tenants', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function updateTenant(input: {
  tenantId: string;
  payload: TenantPayload;
}): Promise<TenantSettingsRow> {
  return apiRequest<TenantSettingsRow>(`/tenants/${input.tenantId}`, {
    method: 'PUT',
    body: JSON.stringify(input.payload)
  });
}

async function deleteTenant(tenantId: string): Promise<{ message?: string }> {
  return apiRequest<{ message?: string }>(`/tenants/${tenantId}`, {
    method: 'DELETE'
  });
}

export default function TenantSettingsPage() {
  const queryClient = useQueryClient();
  const role = getCurrentUserRole();
  const canReadTenants = hasPermission(TENANT_PERMISSIONS.TENANT_READ, role);
  const canCreateOrUpdateTenants = hasPermission(TENANT_PERMISSIONS.TENANT_UPDATE, role);
  const canDeleteTenants = hasPermission(TENANT_PERMISSIONS.TENANT_DELETE, role);

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'edit' | 'create'>('edit');
  const [formState, setFormState] = useState<TenantSettingsFormState>(emptyFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
    enabled: canReadTenants
  });

  const tenants = tenantsQuery.data ?? [];
  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? tenants[0] ?? null;

  useEffect(() => {
    if (formMode === 'create') {
      return;
    }

    if (selectedTenant && selectedTenant.id !== selectedTenantId) {
      setSelectedTenantId(selectedTenant.id);
      setFormState(createFormState(selectedTenant));
      setFormError(null);
      setSuccessMessage(null);
    }
  }, [formMode, selectedTenant, selectedTenantId]);

  const parsedMetadata = useMemo(() => {
    try {
      const parsed = formState.metadata.trim() ? JSON.parse(formState.metadata) : {};

      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { valid: false, value: null as Record<string, unknown> | null };
      }

      return { valid: true, value: parsed as Record<string, unknown> };
    } catch {
      return { valid: false, value: null as Record<string, unknown> | null };
    }
  }, [formState.metadata]);

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: async (tenant) => {
      setFormMode('edit');
      setSelectedTenantId(tenant.id);
      setFormState(createFormState(tenant));
      setFormError(null);
      setSuccessMessage('Tenant created.');
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error) => {
      setSuccessMessage(null);
      setFormError(readableError(error));
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateTenant,
    onSuccess: async (tenant) => {
      setSelectedTenantId(tenant.id);
      setFormState(createFormState(tenant));
      setFormError(null);
      setSuccessMessage('Tenant updated.');
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error) => {
      setSuccessMessage(null);
      setFormError(readableError(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: async () => {
      setSelectedTenantId(null);
      setFormState(emptyFormState);
      setFormMode('edit');
      setFormError(null);
      setSuccessMessage('Tenant deleted.');
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error) => {
      setSuccessMessage(null);
      setFormError(readableError(error));
    }
  });

  const isSaving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const updateField = (field: keyof TenantSettingsFormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  };

  const selectTenant = (tenant: TenantSettingsRow) => {
    setSelectedTenantId(tenant.id);
    setFormMode('edit');
    setFormState(createFormState(tenant));
    setFormError(null);
    setSuccessMessage(null);
  };

  const startCreate = () => {
    setSelectedTenantId(null);
    setFormMode('create');
    setFormState(emptyFormState);
    setFormError(null);
    setSuccessMessage(null);
  };

  const validatePayload = (): TenantPayload | null => {
    const normalizedName = formState.name.trim();

    if (!normalizedName) {
      setSuccessMessage(null);
      setFormError('Tenant name is required.');
      return null;
    }

    if (!parsedMetadata.valid || !parsedMetadata.value) {
      setSuccessMessage(null);
      setFormError('Metadata must be a valid JSON object.');
      return null;
    }

    return buildPayload(
      {
        ...formState,
        name: normalizedName
      },
      parsedMetadata.value
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = validatePayload();

    if (!payload) {
      return;
    }

    if (formMode === 'create') {
      if (!canCreateOrUpdateTenants) {
        setSuccessMessage(null);
        setFormError('Your current role cannot create tenants.');
        return;
      }

      createMutation.mutate(payload);
      return;
    }

    if (!selectedTenant) {
      setSuccessMessage(null);
      setFormError('Select a tenant to update.');
      return;
    }

    if (!canCreateOrUpdateTenants) {
      setSuccessMessage(null);
      setFormError('Your current role cannot update tenants.');
      return;
    }

    updateMutation.mutate({
      tenantId: selectedTenant.id,
      payload
    });
  };

  const handleDelete = () => {
    if (!selectedTenant) {
      return;
    }

    if (!canDeleteTenants) {
      setSuccessMessage(null);
      setFormError('Your current role cannot delete tenants.');
      return;
    }

    const confirmed = window.confirm(
      `Delete tenant "${selectedTenant.name}"? This calls DELETE /tenants/:id and cannot be undone from this screen.`
    );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(selectedTenant.id);
  };

  if (!canReadTenants) {
    return (
      <div style={styles.page}>
        <section style={styles.panel}>
          <h2 style={styles.title}>Tenant Settings</h2>
          <div style={styles.error}>Your current role cannot read tenant settings.</div>
        </section>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Tenant scoped</p>
          <h2 style={styles.title}>Tenant Settings</h2>
          <p style={styles.subtitle}>
            Full frontend coverage for backend tenant CRUD: GET /tenants, POST /tenants, PUT /tenants/:id, DELETE /tenants/:id.
          </p>
        </div>

        {canCreateOrUpdateTenants ? (
          <button type="button" style={styles.primaryButton} onClick={startCreate} disabled={isSaving}>
            New tenant
          </button>
        ) : null}
      </header>

      {tenantsQuery.isLoading ? <div style={styles.panel}>Loading tenants…</div> : null}
      {tenantsQuery.error ? <div style={styles.error}>{readableError(tenantsQuery.error)}</div> : null}
      {formError ? <div style={styles.error}>{formError}</div> : null}
      {successMessage ? <div style={styles.success}>{successMessage}</div> : null}

      <div style={styles.twoColumn}>
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Tenants</h3>
            <span style={styles.badge}>{tenants.length}</span>
          </div>

          {tenants.length === 0 && !tenantsQuery.isLoading ? (
            <div style={styles.emptyState}>No tenants returned by the backend.</div>
          ) : null}

          <div style={styles.tenantList}>
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                type="button"
                style={{
                  ...styles.tenantCard,
                  ...(selectedTenant?.id === tenant.id && formMode === 'edit' ? styles.tenantCardActive : {})
                }}
                onClick={() => selectTenant(tenant)}
              >
                <span style={styles.tenantName}>{tenant.name}</span>
                <span style={styles.tenantMeta}>{tenant.location || 'No location'}</span>
                <span style={styles.tenantMeta}>
                  {tenant.organization_type || 'facility'} · {tenant.write_locked ? 'Write locked' : 'Open'}
                </span>
              </button>
            ))}
          </div>
        </section>

        <form style={styles.panel} onSubmit={handleSubmit}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>{formMode === 'create' ? 'Create Tenant' : 'Edit Tenant'}</h3>
            {formMode === 'edit' && selectedTenant ? <span style={styles.badge}>{selectedTenant.id}</span> : null}
          </div>

          <div style={styles.grid}>
            {formMode === 'edit' ? (
              <label style={styles.field}>
                <span style={styles.label}>Tenant ID</span>
                <input style={styles.input} value={selectedTenant?.id ?? ''} disabled />
              </label>
            ) : null}

            <label style={styles.field}>
              <span style={styles.label}>Name</span>
              <input
                style={styles.input}
                value={formState.name}
                onChange={(event) => updateField('name', event.target.value)}
                disabled={!canCreateOrUpdateTenants || isSaving}
                required
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Location</span>
              <input
                style={styles.input}
                value={formState.location}
                onChange={(event) => updateField('location', event.target.value)}
                disabled={!canCreateOrUpdateTenants || isSaving}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Organization Type</span>
              <input
                style={styles.input}
                value={formState.organization_type}
                onChange={(event) => updateField('organization_type', event.target.value)}
                disabled={!canCreateOrUpdateTenants || isSaving}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Season Start</span>
              <input
                style={styles.input}
                type="date"
                value={formState.season_start}
                onChange={(event) => updateField('season_start', event.target.value)}
                disabled={!canCreateOrUpdateTenants || isSaving}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Season End</span>
              <input
                style={styles.input}
                type="date"
                value={formState.season_end}
                onChange={(event) => updateField('season_end', event.target.value)}
                disabled={!canCreateOrUpdateTenants || isSaving}
              />
            </label>

            <label style={{ ...styles.field, ...styles.fullWidth }}>
              <span style={styles.label}>Metadata JSON</span>
              <textarea
                style={styles.textarea}
                value={formState.metadata}
                onChange={(event) => updateField('metadata', event.target.value)}
                disabled={!canCreateOrUpdateTenants || isSaving}
                rows={8}
              />
            </label>
          </div>

          <div style={styles.actions}>
            <button
              type="submit"
              style={styles.primaryButton}
              disabled={!canCreateOrUpdateTenants || isSaving || (formMode === 'edit' && !selectedTenant)}
            >
              {isSaving ? 'Saving…' : formMode === 'create' ? 'Create tenant' : 'Save tenant'}
            </button>

            {formMode === 'edit' && selectedTenant && canDeleteTenants ? (
              <button type="button" style={styles.dangerButton} onClick={handleDelete} disabled={isSaving}>
                Delete tenant
              </button>
            ) : null}

            {formMode === 'create' ? (
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  setFormMode('edit');
                  setFormState(createFormState(selectedTenant));
                  setFormError(null);
                }}
                disabled={isSaving}
              >
                Cancel create
              </button>
            ) : null}
          </div>

          {!canCreateOrUpdateTenants ? (
            <p style={styles.permissionHint}>Your role can read tenants but cannot create or update them.</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  eyebrow: {
    margin: 0,
    color: '#2563eb',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontSize: '12px'
  },
  title: {
    margin: '4px 0 0',
    fontSize: '30px'
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#6b7280',
    maxWidth: '860px',
    lineHeight: 1.5
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
    gap: '20px',
    alignItems: 'start'
  },
  panel: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 12px 36px rgba(15,23,42,0.08)',
    minWidth: 0
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '18px'
  },
  badge: {
    background: '#eff6ff',
    color: '#1d4ed8',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 800,
    maxWidth: '100%',
    overflowWrap: 'anywhere'
  },
  tenantList: {
    display: 'grid',
    gap: '10px'
  },
  tenantCard: {
    display: 'grid',
    gap: '4px',
    textAlign: 'left',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    background: '#ffffff',
    padding: '12px',
    cursor: 'pointer'
  },
  tenantCardActive: {
    borderColor: '#2563eb',
    background: '#eff6ff'
  },
  tenantName: {
    fontWeight: 900,
    color: '#0f172a'
  },
  tenantMeta: {
    color: '#64748b',
    fontSize: '13px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px'
  },
  field: {
    display: 'grid',
    gap: '8px'
  },
  fullWidth: {
    gridColumn: '1 / -1'
  },
  label: {
    fontWeight: 800,
    color: '#334155'
  },
  input: {
    padding: '0.85rem 0.95rem',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    font: 'inherit'
  },
  textarea: {
    padding: '0.85rem 0.95rem',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    font: 'inherit',
    minHeight: '180px',
    resize: 'vertical'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: '20px'
  },
  primaryButton: {
    border: 0,
    borderRadius: '12px',
    padding: '0.9rem 1.1rem',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 900,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '0.9rem 1.1rem',
    background: '#fff',
    color: '#0f172a',
    fontWeight: 900,
    cursor: 'pointer'
  },
  dangerButton: {
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '0.9rem 1.1rem',
    background: '#fee2e2',
    color: '#991b1b',
    fontWeight: 900,
    cursor: 'pointer'
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '12px',
    padding: '12px'
  },
  success: {
    background: '#dcfce7',
    color: '#166534',
    borderRadius: '12px',
    padding: '12px',
    fontWeight: 800
  },
  emptyState: {
    border: '1px dashed #cbd5e1',
    borderRadius: '14px',
    padding: '16px',
    color: '#64748b'
  },
  permissionHint: {
    color: '#64748b',
    margin: '16px 0 0'
  }
};
