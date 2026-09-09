export type UiTranslator = (englishText: string) => string;

export type AlertPresentationRecord = {
  type?: string | null;
  message?: string | null;
  resolution_note?: string | null;
};

const SYSTEM_ALERT_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  LOW_STOCK: 'Low stock',
  NEGATIVE_STOCK_BLOCKING: 'Negative stock blocked',
  EXPIRED_STOCK: 'Expired stock',
  EXPIRING_STOCK: 'Stock expiring soon',
  FINALIZED_SHIPMENT_INCOMPLETE_BLOCKING: 'Finalized shipment incomplete',
  INVENTORY_USAGE_ANOMALY: 'Inventory usage anomaly',
  INVENTORY_USAGE_DAMAGE_WASTE: 'Inventory damage or waste recorded',
  INVENTORY_USAGE_EXCEPTIONS: 'Inventory usage exceptions',
  ORPHANED_SHIPMENT_ITEM_BLOCKING: 'Shipment item integrity problem',
  OVER_RECEIVED_BLOCKING: 'Over-receipt blocked',
  PO_OVER_RECEIVED_BLOCKING: 'Purchase Order over-receipt blocked',
  SHIPMENT_IMMUTABLE_BLOCKING: 'Shipment change blocked',
  STOCK_LEDGER_DESYNC_BLOCKING: 'Stock ledger mismatch',
  STOCK_LOT_DESYNC_BLOCKING: 'Stock lot mismatch',
  SYSTEM_HEALTH_DEGRADED_BLOCKING: 'System health degraded'
});

const AUTO_RESOLUTION_NOTES: Readonly<Record<string, string>> = Object.freeze({
  LOW_STOCK: 'Automatically resolved: stock recovered to or above the configured location minimum.',
  EXPIRED_STOCK: 'Automatically resolved: no available expired stock remains for this product.',
  EXPIRING_STOCK: 'Automatically resolved: no available stock for this product remains inside the 7-day expiry window.',
  STOCK_LEDGER_DESYNC_BLOCKING: 'Automatically resolved: the stored stock balance and movement ledger are reconciled again.',
  STOCK_LOT_DESYNC_BLOCKING: 'Automatically resolved: the aggregate stock balance and available lot balance are reconciled again.',
  FINALIZED_SHIPMENT_INCOMPLETE_BLOCKING: 'Automatically resolved: no finalized shipment remains with an undocumented receiving shortage.',
  ORPHANED_SHIPMENT_ITEM_BLOCKING: 'Automatically resolved: no shipment item remains without its required parent shipment relationship.',
  SYSTEM_HEALTH_DEGRADED_BLOCKING: 'Automatically resolved: the tenant application-integrity health evidence is no longer degraded.'
});

const LEGACY_LOW_STOCK_RESOLUTION_NOTE = 'Automatically resolved: legacy product-level Low Stock tracking was replaced by exact location-based tracking.';
const LOW_STOCK_SOURCE_UNAVAILABLE_RESOLUTION_NOTE = 'Automatically resolved: the tracked stock position is no longer active or available.';
const LOW_STOCK_THRESHOLD_INACTIVE_RESOLUTION_NOTE = 'Automatically resolved: this stock position no longer has an active minimum threshold.';
const NEGATIVE_STOCK_INTEGRITY_MESSAGE = 'Stock quantity is negative (integrity sweep)';
const NEGATIVE_STOCK_INTEGRITY_RESOLUTION_NOTE = 'Automatically resolved: the exact stock position is no longer negative.';
const OVER_RECEIVED_INTEGRITY_MESSAGE = 'Received quantity exceeds ordered quantity (integrity sweep)';
const OVER_RECEIVED_INTEGRITY_RESOLUTION_NOTE = 'Automatically resolved: no active shipment line for this product remains over-received.';
const SPECIAL_AUTO_RESOLUTION_NOTES: ReadonlyMap<string, string> = new Map([
  [LEGACY_LOW_STOCK_RESOLUTION_NOTE, 'LOW_STOCK'],
  [LOW_STOCK_SOURCE_UNAVAILABLE_RESOLUTION_NOTE, 'LOW_STOCK'],
  [LOW_STOCK_THRESHOLD_INACTIVE_RESOLUTION_NOTE, 'LOW_STOCK'],
  [NEGATIVE_STOCK_INTEGRITY_RESOLUTION_NOTE, 'NEGATIVE_STOCK_BLOCKING'],
  [OVER_RECEIVED_INTEGRITY_RESOLUTION_NOTE, 'OVER_RECEIVED_BLOCKING']
]);


function normalizedType(value: string | null | undefined): string {
  return String(value || '').trim().toUpperCase();
}

export function isSystemOwnedAlertType(value: string | null | undefined): boolean {
  return Boolean(SYSTEM_ALERT_TYPE_LABELS[normalizedType(value)]);
}

export function formatAlertTypeLabel(
  value: string | null | undefined,
  ui: UiTranslator,
  fallback = 'Alert'
): string {
  const raw = String(value || '').trim();
  if (!raw) return ui(fallback);
  const systemLabel = SYSTEM_ALERT_TYPE_LABELS[normalizedType(raw)];
  return systemLabel ? ui(systemLabel) : raw;
}

export function isCurrentStateSystemAlertType(value: string | null | undefined): boolean {
  return Boolean(AUTO_RESOLUTION_NOTES[normalizedType(value)]);
}

export function isCurrentStateSystemAlert(alert: AlertPresentationRecord): boolean {
  const type = normalizedType(alert.type);
  const message = String(alert.message || '').trim();
  if (isCurrentStateSystemAlertType(type)) return true;
  if (type === 'NEGATIVE_STOCK_BLOCKING' && message === NEGATIVE_STOCK_INTEGRITY_MESSAGE) return true;
  if (type === 'OVER_RECEIVED_BLOCKING' && message === OVER_RECEIVED_INTEGRITY_MESSAGE) return true;
  return false;
}

export function isAutomaticallyResolvedAlert(alert: AlertPresentationRecord): boolean {
  const type = normalizedType(alert.type);
  const note = String(alert.resolution_note || '').trim();
  const expectedNote = AUTO_RESOLUTION_NOTES[type];
  return (Boolean(expectedNote) && note === expectedNote) || SPECIAL_AUTO_RESOLUTION_NOTES.get(note) === type;
}

export function formatAlertResolutionNote(
  alert: AlertPresentationRecord,
  ui: UiTranslator
): string {
  const note = String(alert.resolution_note || '').trim();
  if (!note) return '';
  return isAutomaticallyResolvedAlert(alert) ? ui(note) : note;
}

function fill(template: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template
  );
}

function localizedTemplate(
  ui: UiTranslator,
  template: string,
  replacements: Record<string, string>
): string {
  return fill(ui(template), replacements);
}

/**
 * Localize only messages whose system ownership can be proven by both the
 * reserved alert type and a current backend-owned message shape. Unknown or
 * historical messages remain verbatim so tenant/external evidence is never
 * rewritten or discarded.
 */
export function formatAlertMessage(
  alert: AlertPresentationRecord,
  ui: UiTranslator
): string {
  const message = String(alert.message || '').trim();
  if (!message) return ui('No alert message provided.');

  const type = normalizedType(alert.type);
  if (!SYSTEM_ALERT_TYPE_LABELS[type]) return message;

  let match: RegExpMatchArray | null;

  if (type === 'LOW_STOCK') {
    if (message === 'Product is below minimum stock and reordered automatically') {
      return ui('Product is below minimum stock and was automatically reordered.');
    }
    match = message.match(/^Stock below location minimum at "(.+)"$/);
    if (match) {
      return localizedTemplate(ui, 'Stock is below the location minimum at "{location}".', { location: match[1] });
    }

    match = message.match(/^Product "(.+)" is below the location minimum at "(.+)"$/);
    if (match) {
      return localizedTemplate(ui, 'Product "{product}" is below the location minimum at "{location}".', {
        product: match[1],
        location: match[2]
      });
    }

    match = message.match(/^Low stock at "(.+)" after outbound dispatch (.+)$/);
    if (match) {
      return localizedTemplate(ui, 'Low stock remains at "{location}" after outbound dispatch {order}.', {
        location: match[1],
        order: match[2]
      });
    }

    match = message.match(/^Product "(.+)" is below the location minimum at "(.+)" after transfer$/);
    if (match) {
      return localizedTemplate(ui, 'Product "{product}" is below the location minimum at "{location}" after transfer.', {
        product: match[1],
        location: match[2]
      });
    }
  }

  if (type === 'NEGATIVE_STOCK_BLOCKING') {
    if (message === 'Stock quantity is negative (integrity sweep)') {
      return ui('Stock quantity is negative and requires investigation.');
    }
    if (message === 'Attempted stock consumption exceeds available quantity') {
      return ui('Stock consumption was blocked because it exceeds the available quantity.');
    }
    if (message === 'Attempted stock adjustment would create negative stock') {
      return ui('Stock adjustment was blocked because it would create negative stock.');
    }
  }

  if (type === 'STOCK_LEDGER_DESYNC_BLOCKING') {
    match = message.match(/^Stock ledger mismatch detected at location (.+): stored (.+), expected (.+)$/);
    if (match) {
      return localizedTemplate(ui, 'Stock ledger mismatch at location {location}: stored {stored}, expected {expected}.', {
        location: match[1],
        stored: match[2],
        expected: match[3]
      });
    }
  }

  if (type === 'STOCK_LOT_DESYNC_BLOCKING') {
    match = message.match(/^Lot balance mismatch detected at location (.+): stock (.+), lot layer (.+)$/);
    if (match) {
      return localizedTemplate(ui, 'Lot balance mismatch at location {location}: stock {stock}, lot layer {lot}.', {
        location: match[1],
        stock: match[2],
        lot: match[3]
      });
    }
  }

  if (type === 'EXPIRED_STOCK') {
    match = message.match(/^(.+) unit\(s\) of stock are expired and require expiry processing$/);
    if (match) {
      return localizedTemplate(ui, '{quantity} units of stock are expired and require expiry processing.', {
        quantity: match[1]
      });
    }
  }

  if (type === 'EXPIRING_STOCK') {
    match = message.match(/^(.+) unit\(s\) of stock expire within 7 days$/);
    if (match) {
      return localizedTemplate(ui, '{quantity} units of stock expire within 7 days.', {
        quantity: match[1]
      });
    }
  }

  if (type === 'INVENTORY_USAGE_EXCEPTIONS') {
    match = message.match(/^Inventory usage governance has (\d+) exception logs? in the last (\d+) days? \((\d+) pending review, (\d+) follow-up required\)\.$/);
    if (match) {
      return localizedTemplate(
        ui,
        'Inventory usage governance has {exceptions} exception records in the last {days} days ({pending} pending review, {follow_up} follow-up required).',
        { exceptions: match[1], days: match[2], pending: match[3], follow_up: match[4] }
      );
    }
  }

  if (type === 'INVENTORY_USAGE_DAMAGE_WASTE') {
    match = message.match(/^Inventory usage recorded (.+) damage\/waste quantity in the last (\d+) days?\.$/);
    if (match) {
      return localizedTemplate(
        ui,
        'Inventory usage recorded {quantity} damage/waste quantity in the last {days} days.',
        { quantity: match[1], days: match[2] }
      );
    }
  }

  if (type === 'INVENTORY_USAGE_ANOMALY') {
    match = message.match(/^Usage spike detected for "(.+)" on ([^:]+): (.+) used vs (.+) average \((.+)x\)\.$/);
    if (match) {
      return localizedTemplate(
        ui,
        'Usage spike detected for "{product}" on {date}: {daily} used vs {average} average ({multiplier}x).',
        { product: match[1], date: match[2], daily: match[3], average: match[4], multiplier: match[5] }
      );
    }
  }

  const exactSystemMessages: Readonly<Record<string, string>> = {
    'Finalized shipment has an undocumented receiving shortage (integrity sweep)': 'Finalized shipment has an undocumented receiving shortage and requires review.',
    'Received quantity exceeds ordered quantity (integrity sweep)': 'Received quantity exceeds ordered quantity and requires review.',
    'Shipment item without parent shipment (integrity sweep)': 'Shipment item is missing its parent shipment relationship and requires review.',
    'Attempted to receive more than linked purchase order quantity': 'Receiving was blocked because the quantity exceeds the linked Purchase Order quantity.',
    'Attempt to receive shipment from invalid workflow status': 'Receiving was blocked because the shipment is not in a receivable workflow status.',
    'Attempted to receive more than ordered quantity': 'Receiving was blocked because the quantity exceeds the ordered quantity.',
    'System health is degraded. Review the System Health workspace for the current underlying application-integrity evidence.': 'System health is degraded. Review Admin System for the current application-integrity evidence.'
  };

  const localized = exactSystemMessages[message];
  return localized ? ui(localized) : message;
}
