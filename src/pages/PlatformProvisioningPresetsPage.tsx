import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

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
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  retired_at?: string | null;
  version: number;
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

const FEATURE_FLAGS = [
  'inventory', 'procurement', 'forecasting', 'automation', 'scanner', 'reports', 'support_access',
  'requisitions', 'purchase_orders', 'sso', 'api_access', 'advanced_integrations'
];
const LIMIT_KEYS = ['max_users', 'max_products', 'max_storage_locations'];

function defaultForm(): PresetForm {
  return {
    key: '',
    label: '',
    description: '',
    organization_type: 'facility',
    feature_flags: {
      inventory: true,
      procurement: true,
      forecasting: false,
      automation: false,
      scanner: true,
      reports: true,
      support_access: true
    },
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
    storage_locations: (preset.storage_locations || []).map((location) => ({
      name: location.name,
      temperature_zone: location.temperature_zone || ''
    }))
  };
}

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function PresetEditor({ form, onChange, includeKey, disabled = false }: {
  form: PresetForm;
  onChange: (next: PresetForm) => void;
  includeKey: boolean;
  disabled?: boolean;
}) {
  const featureKeys = useMemo(() => Array.from(new Set([...FEATURE_FLAGS, ...Object.keys(form.feature_flags || {})])), [form.feature_flags]);
  const limitKeys = useMemo(() => Array.from(new Set([...LIMIT_KEYS, ...Object.keys(form.limits || {})])), [form.limits]);

  const updateLocation = (index: number, patch: Partial<StorageLocationDraft>) => {
    onChange({
      ...form,
      storage_locations: form.storage_locations.map((location, locationIndex) => locationIndex === index ? { ...location, ...patch } : location)
    });
  };

  return (
    <div style={styles.formStack}>
      {includeKey ? (
        <label style={styles.label}>Preset key
          <input style={styles.input} value={form.key} disabled={disabled} placeholder="warehouse-standard" onChange={(event) => onChange({ ...form, key: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} />
        </label>
      ) : null}
      <div style={styles.twoColumn}>
        <label style={styles.label}>Name
          <input style={styles.input} value={form.label} disabled={disabled} onChange={(event) => onChange({ ...form, label: event.target.value })} />
        </label>
        <label style={styles.label}>Organization type
          <input style={styles.input} value={form.organization_type} disabled={disabled} onChange={(event) => onChange({ ...form, organization_type: event.target.value })} />
        </label>
      </div>
      <label style={styles.label}>Description
        <textarea style={styles.textarea} value={form.description} disabled={disabled} onChange={(event) => onChange({ ...form, description: event.target.value })} />
      </label>

      <div>
        <strong>Default features</strong>
        <div style={styles.checkGrid}>
          {featureKeys.map((key) => (
            <label key={key} style={styles.checkboxLabel}>
              <input type="checkbox" checked={form.feature_flags[key] === true} disabled={disabled} onChange={(event) => onChange({ ...form, feature_flags: { ...form.feature_flags, [key]: event.target.checked } })} />
              {key.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </div>

      <div>
        <strong>Default limits</strong>
        <div style={styles.threeColumn}>
          {limitKeys.map((key) => (
            <label key={key} style={styles.label}>{key.replace(/_/g, ' ')}
              <input type="number" min={0} style={styles.input} value={Number(form.limits[key] ?? 0)} disabled={disabled} onChange={(event) => onChange({ ...form, limits: { ...form.limits, [key]: Math.max(0, Number(event.target.value) || 0) } })} />
            </label>
          ))}
        </div>
      </div>

      <div>
        <div style={styles.sectionHeader}>
          <strong>Starter storage locations</strong>
          {!disabled ? <button type="button" style={styles.secondaryButton} onClick={() => onChange({ ...form, storage_locations: [...form.storage_locations, { name: '', temperature_zone: 'ambient' }] })}>Add location</button> : null}
        </div>
        <div style={styles.locationList}>
          {form.storage_locations.map((location, index) => (
            <div key={`${index}-${location.name}`} style={styles.locationRow}>
              <input aria-label={`Location ${index + 1} name`} style={styles.input} placeholder="Location name" value={location.name} disabled={disabled} onChange={(event) => updateLocation(index, { name: event.target.value })} />
              <input aria-label={`Location ${index + 1} temperature zone`} style={styles.input} placeholder="Temperature zone" value={location.temperature_zone} disabled={disabled} onChange={(event) => updateLocation(index, { temperature_zone: event.target.value })} />
              {!disabled ? <button type="button" style={styles.dangerButton} onClick={() => onChange({ ...form, storage_locations: form.storage_locations.filter((_, locationIndex) => locationIndex !== index) })}>Remove</button> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlatformProvisioningPresetsPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PROVISIONING_PRESETS_WRITE);
  const [selectedId, setSelectedId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | PresetStatus>('all');
  const [createForm, setCreateForm] = useState<PresetForm>(defaultForm());
  const [editForm, setEditForm] = useState<PresetForm>(defaultForm());
  const [cloneKey, setCloneKey] = useState('');
  const [cloneLabel, setCloneLabel] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const versionsQuery = useQuery({
    queryKey: ['platform', 'provisioning', 'preset-versions', statusFilter],
    queryFn: () => platformApiRequest<ProvisioningPresetVersion[]>(`/platform/provisioning/preset-versions${statusFilter === 'all' ? '' : `?status=${statusFilter}`}`)
  });

  const allRows = useMemo(() => versionsQuery.data || [], [versionsQuery.data]);
  const selected = useMemo(() => allRows.find((row) => row.id === selectedId) || null, [allRows, selectedId]);

  useEffect(() => {
    if (!selectedId && allRows.length) setSelectedId(allRows[0].id);
    if (selectedId && !allRows.some((row) => row.id === selectedId)) setSelectedId(allRows[0]?.id || '');
  }, [allRows, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setEditForm(formFromPreset(selected));
    setCloneKey('');
    setCloneLabel(`${selected.label} copy`);
  }, [selected]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform', 'provisioning'] });
  };

  const createDraft = useMutation({
    mutationFn: () => platformApiRequest<ProvisioningPresetVersion>('/platform/provisioning/preset-versions', {
      method: 'POST',
      body: JSON.stringify(createForm)
    }),
    onSuccess: async (created) => {
      setMessage(`Draft ${created.key} v${created.preset_version} created.`);
      setCreateForm(defaultForm());
      await refresh();
      setSelectedId(created.id);
    }
  });

  const saveDraft = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a preset version');
      const { key: _key, ...payload } = editForm;
      void _key;
      return platformApiRequest<ProvisioningPresetVersion>(`/platform/provisioning/preset-versions/${selected.id}`, {
        method: 'PATCH',
        version: selected.version,
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async (updated) => {
      setMessage(`Draft ${updated.key} v${updated.preset_version} saved.`);
      await refresh();
      setSelectedId(updated.id);
    }
  });

  const createVersion = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a preset version');
      return platformApiRequest<ProvisioningPresetVersion>(`/platform/provisioning/preset-versions/${selected.id}/new-version`, { method: 'POST', version: selected.version, body: JSON.stringify({}) });
    },
    onSuccess: async (created) => {
      setMessage(`Draft ${created.key} v${created.preset_version} created from the selected version.`);
      await refresh();
      setSelectedId(created.id);
    }
  });

  const clonePreset = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a preset version');
      return platformApiRequest<ProvisioningPresetVersion>(`/platform/provisioning/preset-versions/${selected.id}/clone`, {
        method: 'POST',
        version: selected.version,
        body: JSON.stringify({ key: cloneKey.trim(), label: cloneLabel.trim() || undefined })
      });
    },
    onSuccess: async (created) => {
      setMessage(`Cloned to ${created.key} v${created.preset_version} draft.`);
      await refresh();
      setSelectedId(created.id);
    }
  });

  const publishPreset = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a preset version');
      return platformApiRequest<ProvisioningPresetVersion>(`/platform/provisioning/preset-versions/${selected.id}/publish`, { method: 'POST', version: selected.version, body: JSON.stringify({}) });
    },
    onSuccess: async (published) => {
      setMessage(`${published.label} v${published.preset_version} is now published. Any previous published version was retired.`);
      await refresh();
      setSelectedId(published.id);
    }
  });

  const retirePreset = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a preset version');
      return platformApiRequest<ProvisioningPresetVersion>(`/platform/provisioning/preset-versions/${selected.id}/retire`, { method: 'POST', version: selected.version, body: JSON.stringify({ reason: 'Retired from Platform Preset Management' }) });
    },
    onSuccess: async (retired) => {
      setMessage(`${retired.label} v${retired.preset_version} retired.`);
      await refresh();
      setSelectedId(retired.id);
    }
  });

  const mutationError = createDraft.error || saveDraft.error || createVersion.error || clonePreset.error || publishPreset.error || retirePreset.error;
  const busy = createDraft.isPending || saveDraft.isPending || createVersion.isPending || clonePreset.isPending || publishPreset.isPending || retirePreset.isPending;
  const createValid = Boolean(createForm.key.trim() && createForm.label.trim() && createForm.organization_type.trim() && createForm.storage_locations.every((location) => location.name.trim()));
  const editValid = Boolean(editForm.label.trim() && editForm.organization_type.trim() && editForm.storage_locations.every((location) => location.name.trim()));

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Provisioning Presets</h1>
          <p style={styles.subtitle}>Manage immutable, versioned tenant setup templates. Operators use only published versions on the separate Provisioning page.</p>
        </div>
        <button type="button" style={styles.secondaryButton} onClick={() => void refresh()} disabled={versionsQuery.isFetching}>Refresh</button>
      </header>

      {message ? <div style={styles.success}>{message}</div> : null}
      {versionsQuery.error ? <div style={styles.error}>Could not load preset versions: {readableError(versionsQuery.error)}</div> : null}
      {mutationError ? <div style={styles.error}>{readableError(mutationError)}</div> : null}

      <section style={styles.metaGrid}>
        <div><strong>Single source</strong><span>Database-backed provisioning preset versions</span></div>
        <div><strong>Lifecycle</strong><span>Draft → Published → Retired</span></div>
        <div><strong>Published rule</strong><span>Only one published version per preset key</span></div>
        <div><strong>Write access</strong><span>{canWrite ? 'Allowed' : 'Read only'}</span></div>
      </section>

      <section style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div><h2 style={styles.h2}>Preset versions</h2><div style={styles.muted}>Published versions are immutable. Create a new version to change a live preset.</div></div>
          <select style={styles.inputCompact} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | PresetStatus)}>
            <option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="retired">Retired</option>
          </select>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Key</th><th style={styles.th}>Version</th><th style={styles.th}>Status</th><th style={styles.th}>Name</th><th style={styles.th}>Type</th><th style={styles.th}>Locations</th><th style={styles.th}>Updated</th><th style={styles.th}>Action</th></tr></thead>
            <tbody>
              {allRows.map((row) => (
                <tr key={row.id} style={row.id === selectedId ? styles.selectedRow : undefined}>
                  <td style={styles.td}>{row.key}</td><td style={styles.td}>v{row.preset_version}</td><td style={styles.td}><span style={styles.statusChip}>{row.status}</span></td><td style={styles.td}>{row.label}</td><td style={styles.td}>{row.organization_type}</td><td style={styles.td}>{row.storage_locations.length}</td><td style={styles.td}>{new Date(row.updated_at).toLocaleString()}</td><td style={styles.td}><button type="button" style={styles.secondaryButton} onClick={() => setSelectedId(row.id)}>Select</button></td>
                </tr>
              ))}
              {!allRows.length ? <tr><td style={styles.td} colSpan={8}>No preset versions found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div><h2 style={styles.h2}>{selected.label} · {selected.key} v{selected.preset_version}</h2><div style={styles.muted}>Status: {selected.status} · record version {selected.version}</div></div>
            <div style={styles.actionRow}>
              {canWrite && selected.status !== 'draft' ? <button type="button" style={styles.secondaryButton} disabled={busy} onClick={() => createVersion.mutate()}>Create new version</button> : null}
              {canWrite && selected.status === 'draft' ? <button type="button" style={styles.primaryButton} disabled={busy || !editValid} onClick={() => saveDraft.mutate()}>Save draft</button> : null}
              {canWrite && selected.status === 'draft' ? <button type="button" style={styles.primaryButton} disabled={busy || !editValid} onClick={() => { if (window.confirm(`Publish ${selected.key} v${selected.preset_version}? The currently published version of this key will be retired.`)) publishPreset.mutate(); }}>Publish</button> : null}
              {canWrite && selected.status !== 'retired' ? <button type="button" style={styles.dangerButton} disabled={busy} onClick={() => { if (window.confirm(`Retire ${selected.key} v${selected.preset_version}? It will stop appearing on the operator Provisioning page unless another version is published.`)) retirePreset.mutate(); }}>Retire</button> : null}
            </div>
          </div>
          <PresetEditor form={editForm} onChange={setEditForm} includeKey={false} disabled={selected.status !== 'draft' || !canWrite} />

          {canWrite ? (
            <div style={styles.cloneBox}>
              <strong>Clone as a new preset key</strong>
              <div style={styles.threeColumn}>
                <input style={styles.input} placeholder="new-preset-key" value={cloneKey} onChange={(event) => setCloneKey(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} />
                <input style={styles.input} placeholder="Clone name" value={cloneLabel} onChange={(event) => setCloneLabel(event.target.value)} />
                <button type="button" style={styles.secondaryButton} disabled={busy || cloneKey.trim().length < 2} onClick={() => clonePreset.mutate()}>Clone to draft</button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {canWrite ? (
        <section style={styles.panel}>
          <h2 style={styles.h2}>Create a new preset</h2>
          <p style={styles.muted}>New preset keys start as Draft v1. They do not appear in tenant provisioning until explicitly published.</p>
          <PresetEditor form={createForm} onChange={setCreateForm} includeKey />
          <button type="button" style={styles.primaryButton} disabled={busy || !createValid} onClick={() => createDraft.mutate()}>Create draft preset</button>
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { padding: 24, display: 'grid', gap: 18 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 30 },
  subtitle: { margin: '6px 0 0', color: '#64748b', maxWidth: 820 },
  h2: { margin: 0 },
  panel: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, background: '#fff', display: 'grid', gap: 16 },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 },
  muted: { color: '#64748b', fontSize: 13 },
  success: { padding: 12, borderRadius: 8, background: '#ecfdf5', color: '#065f46' },
  error: { padding: 12, borderRadius: 8, background: '#fef2f2', color: '#991b1b' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  actionRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  primaryButton: { border: 0, borderRadius: 8, padding: '9px 13px', cursor: 'pointer', background: '#0f172a', color: '#fff' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', background: '#fff', color: '#0f172a' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', background: '#fff1f2', color: '#9f1239' },
  formStack: { display: 'grid', gap: 16 },
  label: { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 },
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' },
  inputCompact: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' },
  textarea: { width: '100%', minHeight: 82, boxSizing: 'border-box', padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 },
  threeColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 },
  checkGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8, marginTop: 8 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 7, textTransform: 'capitalize' },
  locationList: { display: 'grid', gap: 8, marginTop: 8 },
  locationRow: { display: 'grid', gridTemplateColumns: 'minmax(220px,2fr) minmax(160px,1fr) auto', gap: 8, alignItems: 'center' },
  cloneBox: { borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'grid', gap: 10 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 860 },
  th: { textAlign: 'left', borderBottom: '1px solid #cbd5e1', padding: '9px 8px', fontSize: 12, color: '#475569' },
  td: { borderBottom: '1px solid #e2e8f0', padding: '9px 8px', verticalAlign: 'top' },
  selectedRow: { background: '#f8fafc' },
  statusChip: { display: 'inline-block', padding: '3px 7px', borderRadius: 999, background: '#f1f5f9', textTransform: 'capitalize', fontSize: 12 }
};
