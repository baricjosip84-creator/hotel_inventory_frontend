import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';

type StorageLocationItem = {
  id: string;
  tenant_id: string;
  name: string;
  temperature_zone: string | null;
  created_at: string;
  deleted_at: string | null;
};

type StorageLocationFormState = {
  name: string;
  temperature_zone: string;
};

function emptyForm(): StorageLocationFormState {
  return {
    name: '',
    temperature_zone: ''
  };
}

async function fetchStorageLocations(): Promise<StorageLocationItem[]> {
  return apiRequest<StorageLocationItem[]>('/storage-locations');
}

async function createStorageLocation(values: StorageLocationFormState): Promise<StorageLocationItem> {
  return apiRequest<StorageLocationItem>('/storage-locations', {
    method: 'POST',
    body: JSON.stringify({
      name: values.name.trim(),
      temperature_zone: values.temperature_zone.trim() || null
    })
  });
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good';
}) {
  const valueStyle = props.tone === 'good' ? styles.statValueGood : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function StorageLocationsPage() {
  /*
    WHAT CHANGED
    ------------
    The current zip snapshot contained a broken StorageLocationsPage that was
    effectively a duplicate supplier page. This file restores storage locations
    as their own frontend surface using the actual backend storage-location
    contract from the current backend zip.

    WHY IT CHANGED
    --------------
    Storage locations are critical for receiving, scanning, stock placement, and
    reporting. The frontend needs a clear and mobile-safe location page that
    matches the backend route surface actually exposed today.

    WHAT PROBLEM IT SOLVES
    ----------------------
    This restores a correct storage-locations page that:
    - lists current locations from /storage-locations
    - creates new locations through /storage-locations
    - reflects the real backend fields: name and temperature_zone
    - clearly explains that update/delete are not exposed by the current route set
  */

  const queryClient = useQueryClient();
  const { role, canManageStorageLocations } = getRoleCapabilities();

  const [form, setForm] = useState<StorageLocationFormState>(emptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const locationsQuery = useQuery({
    queryKey: ['storage-locations'],
    queryFn: fetchStorageLocations
  });

  const createMutation = useMutation({
    mutationFn: createStorageLocation,
    onSuccess: async () => {
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Storage location created successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['storage-locations'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => {
      setFormMessage(null);
      setFormError(error instanceof ApiError ? error.message : 'Failed to create storage location.');
    }
  });

  const locations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);

  const summary = useMemo(() => {
    const temperatureTagged = locations.filter((location) => Boolean(location.temperature_zone && location.temperature_zone.trim())).length;
    const active = locations.filter((location) => !location.deleted_at).length;

    return {
      total: locations.length,
      active,
      temperatureTagged
    };
  }, [locations]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!canManageStorageLocations) {
      setFormError(
        'Your current role is read-only for storage locations. Location writes are restricted to manager and admin roles by the existing backend.'
      );
      return;
    }

    if (!form.name.trim()) {
      setFormError('Storage location name is required.');
      return;
    }

    createMutation.mutate(form);
  };

  if (locationsQuery.isLoading) {
    return <p>Loading storage locations...</p>;
  }

  if (locationsQuery.isError) {
    return <p>Failed to load storage locations: {(locationsQuery.error as Error).message}</p>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Storage Locations</h1>
          <p style={styles.description}>
            Manage the named storage areas used by receiving, scanning, stock placement, and operational reporting.
          </p>
        </div>
      </header>

      <section style={styles.workflowPanel}>
        <h2 style={styles.workflowTitle}>Workflow clarity</h2>
        <p style={styles.workflowText}>
          Create locations before receiving inventory so shipment intake, scanner defaults, and stock placement all have a safe destination.
        </p>
        <div style={styles.stepGrid}>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepHeading}>Create location</div>
            <div style={styles.stepText}>Define a clear, operator-friendly storage location name.</div>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepHeading}>Tag temperature zone</div>
            <div style={styles.stepText}>Use temperature information when the location has handling constraints.</div>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepHeading}>Use in receiving</div>
            <div style={styles.stepText}>Locations then become available for stock placement and scanner-ready defaults.</div>
          </div>
        </div>
      </section>

      <div style={styles.statsGrid}>
        <StatCard title="Locations" value={summary.total} subtitle="Visible storage locations" />
        <StatCard title="Active" value={summary.active} subtitle="Active operational location records" tone="good" />
        <StatCard
          title="Temperature Tagged"
          value={summary.temperatureTagged}
          subtitle="Locations with a temperature zone value"
        />
      </div>

      {!canManageStorageLocations ? (
        <div style={styles.warningBox}>
          Current role: {role.toUpperCase()}. Storage locations are read-only in the frontend because your backend only allows manager and admin users to create locations.
        </div>
      ) : null}

      <div style={styles.layoutGrid}>
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Create Storage Location</h2>
          <p style={styles.panelSubtitle}>
            Keep location names simple and operational so receiving and stock placement stay obvious to warehouse users.
          </p>

          {formError ? <div style={styles.errorBox}>{formError}</div> : null}
          {formMessage ? <div style={styles.successBox}>{formMessage}</div> : null}

          <form onSubmit={handleSubmit} style={styles.formGrid}>
            <div>
              <label style={styles.label}>Location Name</label>
              <input
                style={styles.input}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Main Warehouse"
              />
            </div>

            <div>
              <label style={styles.label}>Temperature Zone</label>
              <input
                style={styles.input}
                value={form.temperature_zone}
                onChange={(event) => setForm((current) => ({ ...current, temperature_zone: event.target.value }))}
                placeholder="ambient / chilled / frozen"
              />
            </div>

            <div style={styles.actionsRow}>
              <button type="submit" style={styles.primaryButton} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Create Location'}
              </button>
            </div>
          </form>

          <div style={styles.infoBox}>
            The current backend route surface exposed in your zip supports listing and creating storage locations. Update and delete routes are not currently mounted, so this page reflects that exact backend state instead of inventing unsupported actions.
          </div>
        </section>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Location List</h2>
          <p style={styles.panelSubtitle}>
            Review active locations used by shipments, scanning, and stock placement.
          </p>

          {locations.length === 0 ? (
            <div style={styles.emptyState}>
              <strong>No storage locations found.</strong>
              <span>Create the first location before scanning or receiving inventory.</span>
            </div>
          ) : (
            <div style={styles.cardList}>
              {locations.map((location) => (
                <article key={location.id} style={styles.recordCard}>
                  <div style={styles.cardTopRow}>
                    <div>
                      <h3 style={styles.recordTitle}>{location.name}</h3>
                      <div style={styles.recordMeta}>
                        {location.temperature_zone ? `Temperature zone: ${location.temperature_zone}` : 'No temperature zone assigned'}
                      </div>
                    </div>
                    <span style={styles.badgeGood}>Active</span>
                  </div>

                  <div style={styles.recordGrid}>
                    <div>
                      <div style={styles.metaLabel}>Created</div>
                      <div style={styles.metaValue}>{new Date(location.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={styles.metaLabel}>Tenant</div>
                      <div style={styles.metaValue}>{location.tenant_id}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '1.9rem', color: '#0f172a' },
  description: { margin: '6px 0 0', color: '#475569', maxWidth: 760, lineHeight: 1.5 },
  workflowPanel: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 },
  workflowTitle: { margin: 0, fontSize: '1.05rem', color: '#0f172a' },
  workflowText: { margin: '6px 0 0', color: '#475569', lineHeight: 1.5 },
  stepGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 14 },
  stepCard: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 },
  stepNumber: { width: 28, height: 28, borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', display: 'grid', placeItems: 'center', fontWeight: 700, marginBottom: 10 },
  stepHeading: { fontWeight: 700, color: '#0f172a', marginBottom: 6 },
  stepText: { color: '#475569', lineHeight: 1.45, fontSize: '0.95rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  statCard: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 },
  statTitle: { fontSize: '0.85rem', color: '#64748b', marginBottom: 8 },
  statValue: { fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' },
  statValueGood: { fontSize: '1.6rem', fontWeight: 800, color: '#166534' },
  statSubtitle: { marginTop: 6, color: '#64748b', lineHeight: 1.4, fontSize: '0.92rem' },
  warningBox: { background: '#fff7ed', color: '#9a3412', border: '1px solid #fdba74', borderRadius: 14, padding: 14, lineHeight: 1.5 },
  layoutGrid: { display: 'grid', gridTemplateColumns: 'minmax(280px, 420px) minmax(0, 1fr)', gap: 16 },
  panel: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, minWidth: 0 },
  panelTitle: { margin: 0, fontSize: '1.1rem', color: '#0f172a' },
  panelSubtitle: { margin: '6px 0 0', color: '#64748b', lineHeight: 1.5 },
  infoBox: { marginTop: 14, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 12, padding: 12, lineHeight: 1.5 },
  errorBox: { marginTop: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 12, padding: 12 },
  successBox: { marginTop: 12, background: '#ecfdf5', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12 },
  formGrid: { display: 'grid', gap: 12, marginTop: 14 },
  label: { display: 'block', marginBottom: 6, color: '#334155', fontWeight: 600, fontSize: '0.95rem' },
  input: { width: '100%', padding: '0.8rem 0.9rem', borderRadius: 12, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box' },
  actionsRow: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  primaryButton: { border: 'none', borderRadius: 12, background: '#2563eb', color: '#ffffff', padding: '0.8rem 1rem', fontWeight: 700, cursor: 'pointer' },
  emptyState: { marginTop: 14, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 14, padding: 18, display: 'grid', gap: 6, color: '#475569' },
  cardList: { display: 'grid', gap: 12, marginTop: 14 },
  recordCard: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#ffffff' },
  cardTopRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  recordTitle: { margin: 0, fontSize: '1rem', color: '#0f172a' },
  recordMeta: { marginTop: 4, color: '#64748b', lineHeight: 1.4 },
  badgeGood: { padding: '0.35rem 0.6rem', borderRadius: 999, background: '#dcfce7', color: '#166534', fontSize: '0.8rem', fontWeight: 700 },
  recordGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 14 },
  metaLabel: { color: '#64748b', fontSize: '0.82rem', marginBottom: 4 },
  metaValue: { color: '#0f172a', fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.5 }
};
