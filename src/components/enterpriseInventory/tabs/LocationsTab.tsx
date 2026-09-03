import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { InputField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { useAppTranslation } from '../../../i18n/I18nContext';
import { formatLocalizedDateTime } from '../../../i18n/formatters';
import type { StorageLocationForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

type StorageLocationSaveMutation = {
  isPending: boolean;
  mutate: (input: StorageLocationForm) => void;
};

type StorageLocationDeleteMutation = {
  isPending: boolean;
  mutate: (location: StorageLocationOption) => void;
};

type StorageLocationsQuery = {
  isLoading: boolean;
  isError: boolean;
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
  const { locale, ui } = useAppTranslation();
  const canWriteLocations = hasPermission(TENANT_PERMISSIONS.STORAGE_LOCATIONS_WRITE);

  const handleStorageLocationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWriteLocations || saveStorageLocationMutation.isPending) return;
    saveStorageLocationMutation.mutate(storageLocationForm);
  };

  const startEditingStorageLocation = (location: StorageLocationOption) => {
    setEditingStorageLocationId(location.id);
    setStorageLocationForm({
      name: location.name || '',
      temperature_zone: location.temperature_zone || ''
    });
  };

  const retireStorageLocation = (location: StorageLocationOption) => {
    if (!canWriteLocations || deleteStorageLocationMutation.isPending) return;
    const confirmed = window.confirm(
      `${ui('Retire storage location')} "${location.name}"? ${ui('It will be removed from new inventory operations while historical records remain. Retirement is blocked while stock or active operational work still depends on it.')}`
    );
    if (confirmed) deleteStorageLocationMutation.mutate(location);
  };

  return (
    <section style={styles.grid}>
      <form onSubmit={handleStorageLocationSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>{editingStorageLocationId ? ui('Edit Storage Location') : ui('Create Storage Location')}</h2>
        <p style={styles.helper}>{ui('Create and maintain storage areas used for receiving, transfers, stock counts, and inventory control.')}</p>
        <InputField label={ui('Name')} value={storageLocationForm.name} onChange={(value) => setStorageLocationForm((current) => ({ ...current, name: value }))} required disabled={!canWriteLocations} />
        <InputField label={ui('Temperature zone')} value={storageLocationForm.temperature_zone} onChange={(value) => setStorageLocationForm((current) => ({ ...current, temperature_zone: value }))} disabled={!canWriteLocations} />
        <div style={styles.actions}>
          <button type="submit" disabled={saveStorageLocationMutation.isPending || !canWriteLocations} style={styles.primaryButton}>{editingStorageLocationId ? ui('Update Storage Location') : ui('Create Storage Location')}</button>
          {editingStorageLocationId ? (
            <button type="button" style={styles.secondaryButton} onClick={() => { setEditingStorageLocationId(null); setStorageLocationForm(emptyStorageLocationForm); }}>{ui('Cancel edit')}</button>
          ) : null}
        </div>
      </form>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Storage locations')}</h2>
        <p style={styles.helper}>{ui('Review storage locations, update operational condition labels, and retire locations that are no longer used.')}</p>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{ui('Name')}</th>
                <th style={styles.th}>{ui('Temperature zone')}</th>
                <th style={styles.th}>{ui('Created')}</th>
                <th style={styles.th}>{ui('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {storageLocationsQuery.isLoading ? (
                <tr><td colSpan={4} style={styles.td}>{ui('Loading storage locations...')}</td></tr>
              ) : storageLocationsQuery.isError ? (
                <tr><td colSpan={4} style={styles.td}>{ui('Storage locations are unavailable because the location list could not be loaded.')}</td></tr>
              ) : storageLocations.length === 0 ? (
                <tr><td colSpan={4} style={styles.td}>{ui('No active storage locations exist yet.')}</td></tr>
              ) : storageLocations.map((location) => (
                <tr key={location.id}>
                  <td style={styles.td}>{location.name}</td>
                  <td style={styles.td}>{location.temperature_zone || ui('Not classified')}</td>
                  <td style={styles.td}>{location.created_at ? formatLocalizedDateTime(location.created_at, locale) : '—'}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button type="button" style={canWriteLocations ? styles.smallButton : styles.disabledButton} disabled={!canWriteLocations} onClick={() => startEditingStorageLocation(location)}>{ui('Edit')}</button>
                      <button type="button" style={styles.dangerButton} disabled={deleteStorageLocationMutation.isPending || !canWriteLocations} onClick={() => retireStorageLocation(location)}>{ui('Retire')}</button>
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
