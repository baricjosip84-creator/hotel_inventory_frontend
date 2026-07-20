import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { InputField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime } from '../EnterpriseInventoryFormat';
import type { StorageLocationForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

type StorageLocationSaveMutation = {
  isPending: boolean;
  mutate: (input: StorageLocationForm) => void;
};

type StorageLocationDeleteMutation = {
  isPending: boolean;
  mutate: (id: string) => void;
};

type StorageLocationsQuery = {
  isLoading: boolean;
};

type LocationsTabProps = {
  editingStorageLocationId: string | null;
  emptyStorageLocationForm: StorageLocationForm;
  storageLocationForm: StorageLocationForm;
  setEditingStorageLocationId: Dispatch<SetStateAction<string | null>>;
  setStorageLocationForm: Dispatch<SetStateAction<StorageLocationForm>>;
  storageLocations: StorageLocationOption[];
  storageLocationsQuery: StorageLocationsQuery;
  saveStorageLocationMutation: StorageLocationSaveMutation;
  deleteStorageLocationMutation: StorageLocationDeleteMutation;
};

export function LocationsTab({
  editingStorageLocationId,
  emptyStorageLocationForm,
  storageLocationForm,
  setEditingStorageLocationId,
  setStorageLocationForm,
  storageLocations,
  storageLocationsQuery,
  saveStorageLocationMutation,
  deleteStorageLocationMutation
}: LocationsTabProps) {
  const handleStorageLocationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveStorageLocationMutation.mutate(storageLocationForm);
  };

  const startEditingStorageLocation = (location: StorageLocationOption) => {
    setEditingStorageLocationId(location.id);
    setStorageLocationForm({
      name: location.name || '',
      temperature_zone: location.temperature_zone || ''
    });
  };

  return (
    <section style={styles.grid}>
      <form onSubmit={handleStorageLocationSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>{editingStorageLocationId ? 'Edit storage location' : 'Create storage location'}</h2>
        <p style={styles.helper}>Create and maintain storage areas used for receiving, transfers, stock counts, and inventory control.</p>
        <InputField label="Name" value={storageLocationForm.name} onChange={(value) => setStorageLocationForm((current) => ({ ...current, name: value }))} required />
        <InputField label="Temperature zone" value={storageLocationForm.temperature_zone} onChange={(value) => setStorageLocationForm((current) => ({ ...current, temperature_zone: value }))} />
        <div style={styles.actions}>
          <button type="submit" disabled={saveStorageLocationMutation.isPending} style={styles.primaryButton}>{editingStorageLocationId ? 'Update location' : 'Create location'}</button>
          {editingStorageLocationId ? (
            <button type="button" style={styles.secondaryButton} onClick={() => { setEditingStorageLocationId(null); setStorageLocationForm(emptyStorageLocationForm); }}>Cancel edit</button>
          ) : null}
        </div>
      </form>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Storage locations</h2>
        <p style={styles.helper}>Review storage locations, update operational zones, and remove locations that are no longer used.</p>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Temperature zone</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {storageLocationsQuery.isLoading ? (
                <tr><td colSpan={4} style={styles.td}>Loading…</td></tr>
              ) : storageLocations.length === 0 ? (
                <tr><td colSpan={4} style={styles.td}>No storage locations yet.</td></tr>
              ) : storageLocations.map((location) => (
                <tr key={location.id}>
                  <td style={styles.td}>{location.name}</td>
                  <td style={styles.td}>{location.temperature_zone || '-'}</td>
                  <td style={styles.td}>{formatDateTime(location.created_at)}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button type="button" style={styles.smallButton} onClick={() => startEditingStorageLocation(location)}>Edit</button>
                      <button type="button" style={styles.dangerButton} disabled={deleteStorageLocationMutation.isPending} onClick={() => deleteStorageLocationMutation.mutate(location.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
