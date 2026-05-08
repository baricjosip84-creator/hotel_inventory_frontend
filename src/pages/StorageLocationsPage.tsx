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

async function updateStorageLocation(input: {
  id: string;
  name: string;
  temperature_zone: string;
}): Promise<StorageLocationItem> {
  return apiRequest<StorageLocationItem>(`/storage-locations/${input.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: input.name.trim(),
      temperature_zone: input.temperature_zone.trim() || null
    })
  });
}

async function deleteStorageLocation(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/storage-locations/${id}`, {
    method: 'DELETE'
  });
}

function emptyForm(): StorageLocationFormState {
  return {
    name: '',
    temperature_zone: ''
  };
}

function formFromLocation(location: StorageLocationItem): StorageLocationFormState {
  return {
    name: location.name,
    temperature_zone: location.temperature_zone || ''
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
  const { role, canManageStorageLocations } = getRoleCapabilities();

  const [search, setSearch] = useState('');
  const [createForm, setCreateForm] = useState<StorageLocationFormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StorageLocationFormState>(emptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const locationsQuery = useQuery({
    queryKey: ['storage-locations', search],
    queryFn: () => fetchStorageLocations(search)
  });

  const createMutation = useMutation({
    mutationFn: createStorageLocation,
    onSuccess: async () => {
      setCreateForm(emptyForm());
      setFormError(null);
      setFormMessage('Storage location created successfully.');
      await queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.message : 'Failed to create storage location.');
      setFormMessage(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateStorageLocation,
    onSuccess: async () => {
      setEditingId(null);
      setEditForm(emptyForm());
      setFormError(null);
      setFormMessage('Storage location updated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.message : 'Failed to update storage location.');
      setFormMessage(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStorageLocation,
    onSuccess: async () => {
      setEditingId(null);
      setEditForm(emptyForm());
      setFormError(null);
      setFormMessage('Storage location deleted successfully.');
      await queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.message : 'Failed to delete storage location.');
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

  const writeBusy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!canManageStorageLocations) {
      setFormError(
        'Your current role is read-only for storage locations. Storage location writes are restricted to manager and admin roles by the backend.'
      );
      return;
    }

    createMutation.mutate(createForm);
  };

  const beginEdit = (location: StorageLocationItem) => {
    setFormError(null);
    setFormMessage(null);
    setEditingId(location.id);
    setEditForm(formFromLocation(location));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm());
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>, location: StorageLocationItem) => {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!canManageStorageLocations) {
      setFormError(
        'Your current role is read-only for storage locations. Storage location writes are restricted to manager and admin roles by the backend.'
      );
      return;
    }

    updateMutation.mutate({
      id: location.id,
      name: editForm.name,
      temperature_zone: editForm.temperature_zone
    });
  };

  const handleDelete = (location: StorageLocationItem) => {
    setFormError(null);
    setFormMessage(null);

    if (!canManageStorageLocations) {
      setFormError(
        'Your current role is read-only for storage locations. Storage location writes are restricted to manager and admin roles by the backend.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete storage location "${location.name}"? This performs the backend soft delete and removes it from active location lists.`
    );

    if (!confirmed) return;

    deleteMutation.mutate(location.id);
  };

  return (
    <div style={styles.page}>
      <div className="app-grid-stats" style={styles.statsGrid}>
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
          subtitle="Soft-deleted locations returned by API"
        />
      </div>

      {!canManageStorageLocations ? (
        <div className="app-warning-state" style={styles.warningBox}>
          Current role: {role.toUpperCase()}. Storage locations are read-only in the frontend because your backend only allows manager and admin users to write storage locations.
        </div>
      ) : null}

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <h3 style={styles.panelTitle}>Create Storage Location</h3>
        <p style={styles.panelSubtitle}>
          Maintain receiving and storage areas used across stock and shipment workflows.
        </p>

        {formError ? <div className="app-error-state" style={styles.errorBox}>{formError}</div> : null}
        {formMessage ? <div className="app-success-state" style={styles.successBox}>{formMessage}</div> : null}

        <form onSubmit={handleCreateSubmit} style={styles.formGrid}>
          <div>
            <label style={styles.label}>Name</label>
            <input
              style={styles.input}
              value={createForm.name}
              onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Example: Main Warehouse"
              required
              disabled={!canManageStorageLocations || writeBusy}
            />
          </div>

          <div>
            <label style={styles.label}>Temperature Zone</label>
            <input
              style={styles.input}
              value={createForm.temperature_zone}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, temperature_zone: event.target.value }))
              }
              placeholder="Example: ambient, chilled, frozen"
              disabled={!canManageStorageLocations || writeBusy}
            />
          </div>

          <div className="app-actions" style={styles.formActions}>
            <button
              type="submit"
              style={styles.primaryButton}
              disabled={writeBusy || !canManageStorageLocations}
              title={!canManageStorageLocations ? 'Manager or admin role required' : undefined}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Storage Location'}
            </button>
          </div>
        </form>
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <h3 style={styles.panelTitle}>Storage Location List</h3>
        <p style={styles.panelSubtitle}>
          Search, review, edit, and soft-delete storage areas currently available to inventory operations.
        </p>

        <div className="app-grid-toolbar" style={styles.toolbarGrid}>
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
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>
                      No storage locations found.
                    </td>
                  </tr>
                ) : (
                  locations.map((location) => {
                    const isEditing = editingId === location.id;

                    return (
                      <tr key={location.id}>
                        <td style={styles.td}>
                          {isEditing ? (
                            <form id={`storage-location-edit-${location.id}`} onSubmit={(event) => handleEditSubmit(event, location)}>
                              <input
                                style={styles.input}
                                value={editForm.name}
                                onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                                required
                                disabled={writeBusy}
                              />
                            </form>
                          ) : (
                            <>
                              <div style={styles.rowTitle}>{location.name}</div>
                              <div style={styles.rowSubtle}>Location ID: {location.id}</div>
                            </>
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              style={styles.input}
                              value={editForm.temperature_zone}
                              onChange={(event) => setEditForm((current) => ({ ...current, temperature_zone: event.target.value }))}
                              placeholder="Example: ambient, chilled, frozen"
                              disabled={writeBusy}
                            />
                          ) : (
                            location.temperature_zone || '-'
                          )}
                        </td>
                        <td style={styles.td}>{formatDateTime(location.created_at)}</td>
                        <td style={styles.td}>
                          <span style={location.deleted_at ? styles.badgeDeleted : styles.badgeActive}>
                            {location.deleted_at ? 'Deleted' : 'Active'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {canManageStorageLocations && !location.deleted_at ? (
                            <div style={styles.rowActions}>
                              {isEditing ? (
                                <>
                                  <button
                                    type="submit"
                                    form={`storage-location-edit-${location.id}`}
                                    style={styles.smallPrimaryButton}
                                    disabled={writeBusy}
                                  >
                                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.smallSecondaryButton}
                                    onClick={cancelEdit}
                                    disabled={writeBusy}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    style={styles.smallSecondaryButton}
                                    onClick={() => beginEdit(location)}
                                    disabled={writeBusy}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.smallDangerButton}
                                    onClick={() => handleDelete(location)}
                                    disabled={writeBusy}
                                  >
                                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span style={styles.rowSubtle}>Read only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
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
  page: {
    width: '100%',
    minWidth: 0
  },
  statsGrid: {
    marginBottom: '20px',
    minWidth: 0
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
    marginBottom: '8px',
    wordBreak: 'break-word'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  panel: {
    marginBottom: '20px',
    minWidth: 0,
    overflow: 'hidden'
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: '8px',
    fontSize: '20px',
    fontWeight: 700,
    wordBreak: 'break-word'
  },
  panelSubtitle: {
    marginTop: 0,
    marginBottom: '16px',
    color: '#6b7280',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
    alignItems: 'end',
    minWidth: 0
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600
  },
  input: {
    width: '100%',
    minWidth: 0,
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box'
  },
  formActions: {
    alignItems: 'end',
    minWidth: 0
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
  toolbarGrid: {
    marginBottom: '16px',
    minWidth: 0
  },
  searchInput: {
    width: '100%',
    minWidth: 0,
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    outline: 'none',
    fontSize: '14px',
    background: '#ffffff',
    boxSizing: 'border-box'
  },
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto',
    minWidth: 0
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '860px'
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
    verticalAlign: 'top',
    wordBreak: 'break-word'
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  },
  rowTitle: {
    fontWeight: 700,
    marginBottom: '6px',
    wordBreak: 'break-word'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
    wordBreak: 'break-all'
  },
  rowActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  smallPrimaryButton: {
    border: 'none',
    borderRadius: '8px',
    padding: '8px 10px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  smallSecondaryButton: {
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px 10px',
    background: '#ffffff',
    color: '#111827',
    fontWeight: 700,
    cursor: 'pointer'
  },
  smallDangerButton: {
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '8px 10px',
    background: '#fef2f2',
    color: '#991b1b',
    fontWeight: 700,
    cursor: 'pointer'
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
    marginBottom: '14px'
  },
  warningBox: {
    marginBottom: '16px'
  },
  successBox: {
    marginBottom: '14px'
  }
};