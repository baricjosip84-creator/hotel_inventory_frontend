import type { UsageFilters, UsageReason } from './inventoryUsageTypes';

export const USAGE_REASON_OPTIONS: Array<{ value: UsageReason; label: string }> = [
  { value: 'guest_use', label: 'Guest use' },
  { value: 'internal_use', label: 'Internal use' },
  { value: 'damage', label: 'Damage' },
  { value: 'waste', label: 'Waste' },
  { value: 'event', label: 'Event' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' }
];

export const DEFAULT_USAGE_FILTERS: UsageFilters = {
  product_id: '',
  storage_location_id: '',
  consumption_reason: '',
  department: '',
  date_from: '',
  date_to: '',
  include_reversed: ''
};
