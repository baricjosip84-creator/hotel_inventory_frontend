import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../lib/api';

type StorageLocationItem = {
  id: string;
  tenant_id: string;
  name: string;
  temperature_zone: string | null;
  created_at?: string;
  deleted_at?: string | null;
};

type StorageLocationFormState = {
  name: string;
  temperature_zone: string;
};

async function fetchStorageLocations(search: string): Promise<StorageLocationItem[]> {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set('search', search.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<StorageLocationItem[]>(`/storage-locations${suffix}`);
}

async function createStorageLocation(input: StorageLocationFormState): Promise<StorageLocationItem> {
  return apiRequest<StorageLocationItem>('/storage-locations', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      temperature_zone: input.temperature_zone.trim() || null
    })
  });
}

function emptyForm(): StorageLocationFormState {
  return {
    name: '',
    temperature_zone: ''
  };
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleString();
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={styles.statValue}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function StorageLocationsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [form, setForm] = useState<StorageLocationFormState>(emptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const locationsQuery = useQuery({
    queryKey: ['storage-locations', search],
    queryFn: () => fetchStorageLocations(search)
  });

  const createMutation = useMutation({
    mutationFn: createStorageLocation,
    onSuccess: async () => {
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Storage location created successfully.');
      await queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to create storage location.');
      }
      setFormMessage(null);
    }
  });

  const locations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);

  const summary = useMemo(() => {
    const active = locations.filter((location) => !location.deleted_at).length;
    const deleted = locations.filter((location) => Boolean(location.deleted_at)).length;
    const ambient = locations.filter(
      (location) => (location.temperature_zone || '').toLowerCase() === 'ambient'
    ).length;

    return {
      total: locations.length,
      active,
      deleted,
      ambient
    };
  }, [locations]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);
    createMutation.mutate(form);
  };

  return (
    <div>
      <div style={styles.statsGrid}>
        <StatCard
          title="Locations"
          value={summary.total}
          subtitle="Visible storage locations"
        />
        <StatCard
          title="Active"
          value={summary.active}
          subtitle="Currently usable locations"
        />
        <StatCard
          title="Ambient"
          value={summary.ambient}
          subtitle="Locations tagged ambient"
        />
        <StatCard
          title="Deleted"
          value={summary.deleted}
          subtitle="Soft-deleted locations"
        />
      </div>

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Create Storage Location</h3>
        <p style={styles.panelSubtitle}>
          Maintain receiving and storage areas used across stock and shipment workflows.
        </p>

        {formError ? <div style={styles.errorBox}>{formError}</div> : null}
        {formMessage ? <div style={styles.successBox}>{formMessage}</div> : null}

        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <div>
            <label style={styles.label}>Name</label>
            <input
              style={styles.input}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Example: Main Warehouse"
              required
            />
          </div>

          <div>
            <label style={styles.label}>Temperature Zone</label>
            <input
              style={styles.input}
              value={form.temperature_zone}
              onChange={(event) =>
                setForm((current) => ({ ...current, temperature_zone: event.target.value }))
              }
              placeholder="Example: ambient, chilled, frozen"
            />
          </div>

          <div style={styles.formActions}>
            <button type="submit" style={styles.primaryButton} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Storage Location'}
            </button>
          </div>
        </form>
      </section>

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Storage Location List</h3>
        <p style={styles.panelSubtitle}>
          Search and review storage areas currently available to inventory operations.
        </p>

        <div style={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by name or temperature zone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={styles.searchInput}
          />
        </div>

        {locationsQuery.isLoading ? <p>Loading storage locations...</p> : null}

        {locationsQuery.isError ? (
          <p>
            Failed to load storage locations:{' '}
            {(locationsQuery.error as Error).message || 'Unknown error'}
          </p>
        ) : null}

        {!locationsQuery.isLoading && !locationsQuery.isError ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Temperature Zone</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {locations.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={4}>
                      No storage locations found.
                    </td>
                  </tr>
                ) : (
                  locations.map((location) => (
                    <tr key={location.id}>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{location.name}</div>
                        <div style={styles.rowSubtle}>Location ID: {location.id}</div>
                      </td>
                      <td style={styles.td}>{location.temperature_zone || '-'}</td>
                      <td style={styles.td}>{formatDateTime(location.created_at)}</td>
                      <td style={styles.td}>
                        <span style={location.deleted_at ? styles.badgeDeleted : styles.badgeActive}>
                          {location.deleted_at ? 'Deleted' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: '8px',
    fontSize: '20px',
    fontWeight: 700
  },
  panelSubtitle: {
    marginTop: 0,
    marginBottom: '16px',
    color: '#6b7280',
    lineHeight: 1.5
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
    alignItems: 'end'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#ffffff',
    outline: 'none'
  },
  formActions: {
    display: 'flex',
    alignItems: 'end'
  },
  primaryButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer'
  },
  toolbar: { marginBottom: '16px' },
  searchInput: {
    width: '100%',
    maxWidth: '420px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    outline: 'none',
    fontSize: '14px',
    background: '#ffffff'
  },
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '820px'
  },
  th: {
    textAlign: 'left',
    padding: '14px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '13px',
    color: '#6b7280'
  },
  td: {
    padding: '14px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '14px',
    verticalAlign: 'top'
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  },
  rowTitle: {
    fontWeight: 700,
    marginBottom: '6px'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
    wordBreak: 'break-all'
  },
  badgeActive: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#f0fdf4',
    color: '#166534',
    fontWeight: 700,
    fontSize: '12px'
  },
  badgeDeleted: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#fee2e2',
    color: '#991b1b',
    fontWeight: 700,
    fontSize: '12px'
  },
  errorBox: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c'
  },
  successBox: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534'
  }
};