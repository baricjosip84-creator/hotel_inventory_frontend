import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { apiRequest, ApiError } from '../lib/api';
import { getCurrentAccessRoleLabel, getRoleCapabilities } from '../lib/permissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import { InventoryCsvImportPanel } from '../components/imports/InventoryCsvImportPanel';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';

type StorageLocationItem = {
  id: string;
  tenant_id: string;
  name: string;
  temperature_zone: string | null;
  created_at?: string;
  deleted_at?: string | null;
  stock_position_count?: number | string | null;
  nonzero_stock_position_count?: number | string | null;
  low_stock_position_count?: number | string | null;
};

type StorageLocationFormState = {
  name: string;
  temperature_zone: string;
};

type StorageLocationBlocker = {
  key?: string;
  label?: string;
};

const TEMPERATURE_ZONE_SUGGESTIONS = [
  'Ambient',
  'Dry Ambient',
  'Controlled Ambient',
  'Cool',
  'Cold',
  'Chilled',
  'Refrigerated',
  'Frozen',
  'Heated',
  'Humidity Controlled'
];

const STANDARD_TEMPERATURE_ZONE_KEYS = new Set(
  TEMPERATURE_ZONE_SUGGESTIONS.map((zone) => zone.toLocaleLowerCase())
);

async function fetchStorageLocations(): Promise<StorageLocationItem[]> {
  return apiRequest<StorageLocationItem[]>('/storage-locations');
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
  values: StorageLocationFormState;
}): Promise<StorageLocationItem> {
  return apiRequest<StorageLocationItem>(`/storage-locations/${input.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: input.values.name.trim(),
      temperature_zone: input.values.temperature_zone.trim() || null
    })
  });
}

async function retireStorageLocation(id: string): Promise<{ message: string }> {
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

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim().toLocaleLowerCase();
}

function formatTemperatureZone(value: string | null | undefined): string {
  const normalized = String(value || '').trim();
  return normalized || 'Not classified';
}

function isStandardTemperatureZone(value: string | null | undefined): boolean {
  const normalized = normalizeText(value);
  return Boolean(normalized && STANDARD_TEMPERATURE_ZONE_KEYS.has(normalized));
}

function shortenId(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function getSearchRank(location: StorageLocationItem, normalizedSearch: string): number {
  if (!normalizedSearch) return 0;

  const name = normalizeText(location.name);
  const zone = normalizeText(location.temperature_zone);
  const id = normalizeText(location.id);

  if (name.startsWith(normalizedSearch)) return 0;
  if (name.includes(normalizedSearch)) return 1;
  if (zone.startsWith(normalizedSearch)) return 2;
  if (zone.includes(normalizedSearch)) return 3;
  if (id.includes(normalizedSearch)) return 4;
  return Number.POSITIVE_INFINITY;
}

function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  if (error.code === 'STORAGE_LOCATION_IN_USE') {
    const details = error.details as { blockers?: StorageLocationBlocker[] } | undefined;
    const labels = Array.isArray(details?.blockers)
      ? details.blockers
          .map((blocker) => blocker.label?.trim())
          .filter((label): label is string => Boolean(label))
      : [];

    if (labels.length) {
      return `This location cannot be retired until these active dependencies are resolved: ${labels.join(', ')}.`;
    }
  }

  return error.message || fallback;
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const valueStyle =
    props.tone === 'good'
      ? styles.statValueGood
      : props.tone === 'warn'
        ? styles.statValueWarn
        : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function StorageLocationsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canManageStorageLocations } = getRoleCapabilities();
  const accessRoleLabel = getCurrentAccessRoleLabel();

  const [search, setSearch] = useState(() => searchParams.get('search')?.trim() || '');
  const [zoneFilter, setZoneFilter] = useState(() => searchParams.get('zone')?.trim() || '');
  const [editingLocation, setEditingLocation] = useState<StorageLocationItem | null>(null);
  const [form, setForm] = useState<StorageLocationFormState>(emptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const locationsQuery = useQuery({
    queryKey: ['storage-locations'],
    queryFn: fetchStorageLocations
  });

  const invalidateLocationConsumers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-storage-locations'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-usage-storage-locations-page'] }),
      queryClient.invalidateQueries({ queryKey: ['stock-transfer-options'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: createStorageLocation,
    onSuccess: async () => {
      setEditingLocation(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Storage location created successfully.');
      await invalidateLocationConsumers();
    },
    onError: (error) => {
      setFormError(getMutationErrorMessage(error, 'Failed to create storage location.'));
      setFormMessage(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateStorageLocation,
    onSuccess: async () => {
      setEditingLocation(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Storage location updated successfully.');
      await invalidateLocationConsumers();
    },
    onError: (error) => {
      setFormError(getMutationErrorMessage(error, 'Failed to update storage location.'));
      setFormMessage(null);
    }
  });

  const retireMutation = useMutation({
    mutationFn: retireStorageLocation,
    onSuccess: async () => {
      setEditingLocation(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Storage location retired successfully. Historical records remain available.');
      await invalidateLocationConsumers();
    },
    onError: (error) => {
      setFormError(getMutationErrorMessage(error, 'Failed to retire storage location.'));
      setFormMessage(null);
      scrollToFormSection('storage-location-form-panel');
    }
  });

  const locations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);

  const availableZones = useMemo(() => {
    const zoneMap = new Map<string, string>();

    for (const location of locations) {
      const value = String(location.temperature_zone || '').trim();
      if (!value) continue;
      const key = value.toLocaleLowerCase();
      if (!zoneMap.has(key)) zoneMap.set(key, value);
    }

    return [...zoneMap.values()].sort((left, right) => left.localeCompare(right));
  }, [locations]);

  const filteredLocations = useMemo(() => {
    const normalizedSearch = normalizeText(search);
    const normalizedZone = normalizeText(zoneFilter);

    return locations
      .map((location) => ({
        location,
        rank: getSearchRank(location, normalizedSearch)
      }))
      .filter(({ location, rank }) => {
        if (!Number.isFinite(rank)) return false;
        if (!normalizedZone) return true;
        return normalizeText(location.temperature_zone) === normalizedZone;
      })
      .sort((left, right) => left.rank - right.rank || left.location.name.localeCompare(right.location.name))
      .map(({ location }) => location);
  }, [locations, search, zoneFilter]);

  const summary = useMemo(() => {
    const withStock = locations.filter(
      (location) => toNumber(location.nonzero_stock_position_count) > 0
    ).length;
    const zonesNeedingReview = locations.filter(
      (location) => !isStandardTemperatureZone(location.temperature_zone)
    ).length;

    return {
      active: locations.length,
      withStock,
      empty: Math.max(0, locations.length - withStock),
      zonesNeedingReview
    };
  }, [locations]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (search.trim()) nextParams.set('search', search.trim());
    else nextParams.delete('search');

    if (zoneFilter.trim()) nextParams.set('zone', zoneFilter.trim());
    else nextParams.delete('zone');

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [search, searchParams, setSearchParams, zoneFilter]);

  const writeBusy = createMutation.isPending || updateMutation.isPending || retireMutation.isPending;
  const inputDisabled = writeBusy || !canManageStorageLocations;
  const filtersActive = Boolean(search.trim() || zoneFilter.trim());

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!canManageStorageLocations) {
      setFormError(
        'Your current role is read-only for storage locations because it does not have storage_locations.write permission.'
      );
      return;
    }

    const name = form.name.trim();
    if (!name) {
      setFormError('Storage location name is required.');
      return;
    }

    const duplicate = locations.find(
      (location) =>
        location.id !== editingLocation?.id &&
        normalizeText(location.name) === normalizeText(name)
    );

    if (duplicate) {
      setFormError(`A storage location named "${duplicate.name}" already exists.`);
      return;
    }

    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, values: form });
      return;
    }

    createMutation.mutate(form);
  };

  const beginEdit = (location: StorageLocationItem) => {
    if (!canManageStorageLocations) {
      setFormError('Your current role cannot edit storage locations.');
      setFormMessage(null);
      return;
    }

    setEditingLocation(location);
    setForm(formFromLocation(location));
    setFormError(null);
    setFormMessage(null);
    scrollToFormSection('storage-location-form-panel');
  };

  const cancelEdit = () => {
    setEditingLocation(null);
    setForm(emptyForm());
    setFormError(null);
    setFormMessage(null);
  };

  const handleRetire = (location: StorageLocationItem) => {
    if (!canManageStorageLocations) {
      setFormError('Your current role cannot retire storage locations.');
      setFormMessage(null);
      scrollToFormSection('storage-location-form-panel');
      return;
    }

    const confirmed = window.confirm(
      `Retire storage location "${location.name}"? It will be removed from new inventory operations, while historical records remain. Retirement is blocked when the location still has stock or active operational work.`
    );

    if (!confirmed) return;

    setFormError(null);
    setFormMessage(null);
    retireMutation.mutate(location.id);
  };

  const clearFilters = () => {
    setSearch('');
    setZoneFilter('');
  };

  return (
    <div className="io-operational-page io-storage-locations-page" style={styles.page}>
      <div className="app-grid-stats" style={styles.statsGrid}>
        <StatCard
          title="Active Locations"
          value={locationsQuery.isLoading ? '—' : summary.active}
          subtitle="Available to current inventory workflows"
        />
        <StatCard
          title="Locations With Stock"
          value={locationsQuery.isLoading ? '—' : summary.withStock}
          subtitle="At least one stock position has a non-zero balance"
          tone={!locationsQuery.isLoading && summary.withStock > 0 ? 'good' : 'default'}
        />
        <StatCard
          title="Empty Locations"
          value={locationsQuery.isLoading ? '—' : summary.empty}
          subtitle="No non-zero stock; active work may still block retirement"
        />
        <StatCard
          title="Condition Labels to Review"
          value={locationsQuery.isLoading ? '—' : summary.zonesNeedingReview}
          subtitle="Missing or outside the recommended storage-condition labels"
          tone={!locationsQuery.isLoading && summary.zonesNeedingReview > 0 ? 'warn' : 'good'}
        />
      </div>

      {!locationsQuery.isLoading && !locationsQuery.isError && summary.zonesNeedingReview > 0 ? (
        <div className="app-info-state" style={styles.classificationGuide}>
          <strong>{summary.zonesNeedingReview} {summary.zonesNeedingReview === 1 ? 'location needs' : 'locations need'} condition-label review.</strong>{' '}
          The location name should identify where stock is kept; the condition label should describe the storage environment, such as Ambient, Chilled, Refrigerated, or Frozen. Custom labels remain allowed and do not block normal operations.
        </div>
      ) : null}

      {!canManageStorageLocations ? (
        <div className="app-warning-state" style={styles.warningBox}>
          Current access role: {accessRoleLabel}. Storage locations are read-only because this role does not have storage_locations.write permission.
        </div>
      ) : null}

      <InventoryCsvImportPanel
        importType="storage_locations"
        title="Bulk Storage Location Import"
        description="Create storage-location master data from a validated CSV. Existing active location names are never overwritten."
        templateColumns={['name', 'temperature_zone']}
        templateExample={{ name: 'Main Warehouse', temperature_zone: 'Ambient' }}
        canImport={canManageStorageLocations}
        disabledReason="Storage-locations write permission is required for bulk location import."
        onCommitted={invalidateLocationConsumers}
      />

      <section id="storage-location-form-panel" className="app-panel app-panel--padded" style={editingLocation ? styles.editPanel : styles.panel}>
        <div className="io-section-heading-with-icon">
          <span className="io-section-heading-icon"><TenantNavIcon path="/storage-locations" size={17} /></span>
          <div className="io-section-heading-copy">
            <h3 style={styles.panelTitle}>{editingLocation ? 'Edit Storage Location' : 'Create Storage Location'}</h3>
            <p style={styles.panelSubtitle}>
          {canManageStorageLocations
            ? 'Maintain receiving and storage areas used by stock, receiving, transfers, reservations, requisitions, usage, counts, and operational planning.'
            : 'This form remains visible for context, but its fields and write actions are disabled for your current role.'}
            </p>
          </div>
        </div>

        {formError ? <div className="app-error-state" style={styles.errorBox}>{formError}</div> : null}
        {formMessage ? <div className="app-success-state" style={styles.successBox}>{formMessage}</div> : null}

        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <div>
            <label htmlFor="storage-location-name" style={styles.label}>Name</label>
            <input
              id="storage-location-name"
              style={inputDisabled ? styles.disabledInput : styles.input}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Example: Main Warehouse"
              maxLength={255}
              required
              disabled={inputDisabled}
            />
            <div style={styles.fieldHelp}>Use a unique operational name that staff can recognize in receiving, stock, transfer, and scanning workflows.</div>
          </div>

          <div>
            <label htmlFor="storage-location-temperature-zone" style={styles.label}>Storage Condition</label>
            <input
              id="storage-location-temperature-zone"
              list="storage-location-temperature-zone-options"
              style={inputDisabled ? styles.disabledInput : styles.input}
              value={form.temperature_zone}
              onChange={(event) => setForm((current) => ({ ...current, temperature_zone: event.target.value }))}
              placeholder="Example: Ambient, cold, chilled, frozen"
              maxLength={100}
              disabled={inputDisabled}
            />
            <datalist id="storage-location-temperature-zone-options">
              {TEMPERATURE_ZONE_SUGGESTIONS.map((zone) => <option key={zone} value={zone} />)}
            </datalist>
            <div style={styles.fieldHelp}>Optional. Choose a recommended condition label where possible. Custom values remain allowed, but the page flags them for review; do not repeat the department or location name here.</div>
          </div>

          <div className="app-actions" style={styles.formActions}>
            <button
              type="submit"
              style={inputDisabled ? styles.disabledButton : styles.primaryButton}
              disabled={inputDisabled}
              title={!canManageStorageLocations ? 'Storage locations write permission required' : undefined}
            >
              {createMutation.isPending
                ? 'Creating...'
                : updateMutation.isPending
                  ? 'Saving...'
                  : editingLocation
                    ? 'Update Storage Location'
                    : 'Create Storage Location'}
            </button>

            {editingLocation ? (
              <button type="button" style={writeBusy ? styles.disabledButton : styles.secondaryButton} onClick={cancelEdit} disabled={writeBusy}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div className="io-section-heading-with-icon">
            <span className="io-section-heading-icon"><TenantNavIcon path="/storage-locations" size={17} /></span>
            <div className="io-section-heading-copy">
              <h3 style={styles.panelTitle}>Storage Location List</h3>
              <p style={styles.panelSubtitle}>
                Search and review active storage areas, stock usage, storage-condition classification, and retirement actions.
              </p>
            </div>
          </div>
          <button
            type="button"
            style={locationsQuery.isFetching ? styles.disabledButton : styles.secondaryButton}
            onClick={() => void locationsQuery.refetch()}
            disabled={locationsQuery.isFetching}
          >
            {locationsQuery.isFetching ? 'Refreshing...' : 'Refresh Locations'}
          </button>
        </div>

        <div className="app-grid-toolbar" style={styles.toolbarGrid}>
          <div>
            <label htmlFor="storage-location-search" style={styles.label}>Search locations</label>
            <input
              id="storage-location-search"
              type="search"
              placeholder="Name, zone, or location ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={styles.searchInput}
              maxLength={255}
            />
          </div>

          <div>
            <label htmlFor="storage-location-zone-filter" style={styles.label}>Storage condition</label>
            <select
              id="storage-location-zone-filter"
              value={zoneFilter}
              onChange={(event) => setZoneFilter(event.target.value)}
              style={styles.searchInput}
            >
              <option value="">All zones</option>
              {availableZones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.listMetaRow}>
          <span style={styles.resultCount}>
            {filtersActive
              ? `${filteredLocations.length} of ${locations.length} active locations match.`
              : `${locations.length} active ${locations.length === 1 ? 'location' : 'locations'}.`}
          </span>
          <button
            type="button"
            style={filtersActive ? styles.secondaryButton : styles.disabledButton}
            onClick={clearFilters}
            disabled={!filtersActive}
          >
            Clear Filters
          </button>
        </div>

        {locationsQuery.isLoading ? (
          <div className="app-empty-state" style={styles.stateBox}>Loading storage locations...</div>
        ) : null}

        {locationsQuery.isError ? (
          <div className="app-error-state" style={styles.stateBox}>
            Failed to load storage locations: {(locationsQuery.error as Error).message || 'Unknown error'}
          </div>
        ) : null}

        {!locationsQuery.isLoading && !locationsQuery.isError ? (
          filteredLocations.length === 0 ? (
            <div className="app-empty-state" style={styles.stateBox}>
              {locations.length === 0
                ? 'No active storage locations exist yet.'
                : 'No storage locations match the current search and zone filters.'}
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Storage Condition</th>
                    <th style={styles.th}>Stock Use</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((location) => {
                    const isEditing = editingLocation?.id === location.id;
                    const stockPositionCount = toNumber(location.stock_position_count);
                    const nonzeroStockPositionCount = toNumber(location.nonzero_stock_position_count);
                    const lowStockPositionCount = toNumber(location.low_stock_position_count);

                    return (
                      <tr key={location.id} style={isEditing ? styles.editingRow : undefined}>
                        <td style={styles.td}>
                          <div style={styles.rowTitle}>{location.name}</div>
                          <div style={styles.rowSubtle} title={location.id}>ID: {shortenId(location.id)}</div>
                          {isEditing ? <div style={styles.editHint}>Editing in the form above</div> : null}
                        </td>
                        <td style={styles.td}>
                          <span style={isStandardTemperatureZone(location.temperature_zone) ? styles.zoneBadge : styles.zoneMissingBadge}>
                            {formatTemperatureZone(location.temperature_zone)}
                          </span>
                          {!isStandardTemperatureZone(location.temperature_zone) ? (
                            <div style={styles.rowSubtle}>Review condition classification</div>
                          ) : null}
                        </td>
                        <td style={styles.td}>
                          {stockPositionCount > 0 ? (
                            <>
                              <div style={styles.stockSummary}>
                                {stockPositionCount} {stockPositionCount === 1 ? 'position' : 'positions'} · {nonzeroStockPositionCount} with stock
                              </div>
                              {lowStockPositionCount > 0 ? (
                                <div style={styles.stockWarning}>{lowStockPositionCount} low-stock {lowStockPositionCount === 1 ? 'position' : 'positions'}</div>
                              ) : (
                                <div style={styles.rowSubtle}>No low-stock positions</div>
                              )}
                            </>
                          ) : (
                            <span style={styles.emptyBadge}>No stock positions</span>
                          )}
                        </td>
                        <td style={styles.td}>{formatDateTime(location.created_at)}</td>
                        <td style={styles.td}>
                          {canManageStorageLocations ? (
                            <div style={styles.rowActions}>
                              <button
                                type="button"
                                style={styles.smallSecondaryButton}
                                onClick={() => beginEdit(location)}
                                disabled={writeBusy}
                              >
                                {isEditing ? 'Editing' : 'Edit'}
                              </button>
                              <button
                                type="button"
                                style={styles.smallDangerButton}
                                onClick={() => handleRetire(location)}
                                disabled={writeBusy}
                                title="Retire this location from new operations while preserving history"
                              >
                                {retireMutation.isPending && retireMutation.variables === location.id ? 'Retiring...' : 'Retire'}
                              </button>
                            </div>
                          ) : (
                            <span style={styles.rowSubtle}>Read only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
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
    borderRadius: '12px',
    padding: '18px',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    wordBreak: 'break-word'
  },
  statValueGood: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#166534',
    wordBreak: 'break-word'
  },
  statValueWarn: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#92400e',
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
  editPanel: {
    marginBottom: '20px',
    minWidth: 0,
    overflow: 'hidden',
    borderColor: '#bfdbfe',
    boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.08)'
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: '8px',
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  panelSubtitle: {
    marginTop: 0,
    marginBottom: '16px',
    color: '#6b7280',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
  fieldHelp: {
    marginTop: '7px',
    fontSize: '12px',
    color: '#64748b',
    lineHeight: 1.4
  },
  input: {
    width: '100%',
    minWidth: 0,
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box'
  },
  disabledInput: {
    width: '100%',
    minWidth: 0,
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#f3f4f6',
    color: '#6b7280',
    cursor: 'not-allowed',
    boxSizing: 'border-box'
  },
  formActions: {
    alignItems: 'end',
    minWidth: 0
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    padding: '12px 16px',
    background: '#ffffff',
    color: '#111827',
    fontWeight: 600,
    cursor: 'pointer'
  },
  primaryButton: {
    border: 'none',
    borderRadius: '8px',
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer'
  },
  disabledButton: {
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    padding: '12px 16px',
    background: '#e5e7eb',
    color: '#6b7280',
    fontWeight: 600,
    cursor: 'not-allowed'
  },
  toolbarGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(260px, 2fr) minmax(220px, 1fr)',
    gap: '12px',
    marginBottom: '14px',
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
  listMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '14px'
  },
  resultCount: {
    fontSize: '13px',
    color: '#64748b'
  },
  stateBox: {
    padding: '18px',
    borderRadius: '12px'
  },
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
    overflowX: 'auto',
    minWidth: 0
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '900px'
  },
  th: {
    textAlign: 'left',
    padding: '14px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '12px',
    fontWeight: 700,
    color: '#475569'
  },
  td: {
    padding: '14px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '14px',
    verticalAlign: 'top',
    wordBreak: 'break-word'
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
    wordBreak: 'break-word'
  },
  editHint: {
    marginTop: '8px',
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '12px',
    fontWeight: 700
  },
  editingRow: {
    background: '#eff6ff'
  },
  rowActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
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
  zoneBadge: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 700,
    fontSize: '12px'
  },
  zoneMissingBadge: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#fef3c7',
    color: '#92400e',
    fontWeight: 700,
    fontSize: '12px'
  },
  emptyBadge: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#f3f4f6',
    color: '#475569',
    fontWeight: 700,
    fontSize: '12px'
  },
  stockSummary: {
    fontWeight: 700,
    marginBottom: '5px'
  },
  stockWarning: {
    fontSize: '12px',
    color: '#92400e',
    fontWeight: 700
  },
  errorBox: {
    marginBottom: '14px'
  },
  warningBox: {
    marginBottom: '16px'
  },
  classificationGuide: {
    marginBottom: '16px',
    lineHeight: 1.5
  },
  successBox: {
    marginBottom: '14px'
  }
};
