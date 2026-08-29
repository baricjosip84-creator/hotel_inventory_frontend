import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/InventoryReservationsPage.tsx');
const routerSource = read('src/app/router.tsx');
const permissionsSource = read('src/lib/permissions.ts');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((entry) => typeof entry === 'string' && entry.length > 0)) rows.push(row);
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of pageSource.matchAll(literalPattern)) {
  try { literals.push(decodeLiteral(match[1])); } catch {}
}
const literalSet = new Set(literals);
const missing = [...literalSet].filter((key) => !unique.has(key));
if (missing.length) fail(`Reservations page ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Reservations page has ${literalSet.size} catalog-backed literal UI keys.`);

const renderStart = pageSource.indexOf('  return (');
const renderSource = renderStart >= 0 ? pageSource.slice(renderStart) : pageSource;
const rawText = renderSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains in Reservations: ${rawText.join(' | ')}`);
else pass('Reservations page has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...renderSource.matchAll(rawAttributePattern)].map((match) => match[0]);
if (rawAttributes.length) fail(`Raw presentation attributes remain in Reservations: ${rawAttributes.join(' | ')}`);
else pass('Reservations page has zero raw literal hero/section/placeholder/ARIA presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "import type { AppLocale } from '../i18n/config';",
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedNumber(toNumber(value), locale, { maximumFractionDigits: 2 })',
  'formatLocalizedDateTime(parsed, locale)',
  'formatReservationCode(value, ui)',
]) if (!pageSource.includes(required)) fail(`Reservations shared multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Reservations uses the shared tenant translation runtime and locale-aware number/date-time presentation.');

for (const required of [
  "path: 'inventory-reservations'",
  'TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ',
  '<InventoryReservationsPage />',
]) if (!routerSource.includes(required)) fail(`Reservations tenant route contract changed or missing: ${required}`);
if (!permissionsSource.includes("INVENTORY_RESERVATIONS_READ: 'inventory_reservations.read'")) fail('Reservations frontend permission identifier changed unexpectedly.');
if (!process.exitCode) pass('Reservations route remains tenant-scoped behind inventory_reservations.read.');

for (const required of [
  "apiRequest<ReservationOptionsResponse>('/inventory-reservations/options')",
  "return `/inventory-reservations?${params.toString()}`;",
  "return `/inventory-reservations/export.csv?${query}`;",
  "apiRequest<ReservationSummary>('/inventory-reservations/summary')",
  '`/inventory-reservations/source-summary${query ? `?${query}` : \'\'}`',
  '`/inventory-reservations/projected-free-stock?${params.toString()}`',
  "apiRequest<ReservationConflict[]>('/inventory-reservations/conflicts?limit=50')",
  '`/inventory-reservations/${id}`',
  '`/inventory-reservations/${id}/audit?limit=100`',
  "apiMutationRequest<InventoryReservation>('/inventory-reservations'",
  '`/inventory-reservations/${id}/resolve-conflict`',
  "apiMutationRequest<ExpireDueReservationsResult>('/inventory-reservations/expire-due'",
  '`/inventory-reservations/${id}/${action}`',
  '`/inventory-reservations/${id}/fulfill`',
]) if (!pageSource.includes(required)) fail(`Reservations read/mutation endpoint contract changed or missing: ${required}`);
if (!process.exitCode) pass('Reservations read, export, summary, conflict, detail, audit, lifecycle, and fulfillment endpoint contracts remain unchanged.');

for (const required of [
  'permissions.canCreateInventoryReservations',
  'permissions.canAllocateInventoryReservations',
  'permissions.canFulfillInventoryReservations',
  'permissions.canReleaseInventoryReservations',
  'permissions.canExpireInventoryReservations',
  'permissions.canCancelOwnInventoryReservations',
  'permissions.canCancelAnyInventoryReservations',
]) if (!pageSource.includes(required)) fail(`Reservations capability boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Create/allocate/fulfill/release/expire/cancel-own/cancel-any capability boundaries remain unchanged.');

for (const required of [
  "source_type: 'manual'",
  "priority: 'normal'",
  "allocation_strategy: 'any_location'",
  "'specific_location'",
  'value="inbound"',
  "type ConflictResolutionAction = 'allocate_remaining' | 'release_open' | 'cancel_reservation';",
  'allow_partial: true',
  'release_unallocated: true',
  'body.fulfill_all_reserved = true',
  "params.set('status', filters.status)",
  "params.set('source_type', filters.sourceType)",
  "params.set('priority', filters.priority)",
]) if (!pageSource.includes(required)) fail(`Reservations canonical payload/query value contract changed: ${required}`);
if (!process.exitCode) pass('Canonical reservation source/status/priority/allocation/conflict/query values remain unchanged.');

for (const required of [
  "resolution_note: actionNote || 'Resolved from allocation conflict queue.'",
  "expiration_note: actionNote || 'Expired from reservation workspace due-run.'",
  "body.release_note = actionNote || 'Released from reservation workspace.'",
  "body.cancellation_reason = actionNote || 'Cancelled from reservation workspace.'",
  "body.expiration_note = actionNote || 'Expired from reservation workspace.'",
  "fulfillment_note: actionNote || 'Partially fulfilled from reservation workspace.'",
  "anchor.download = `inventory-reservations-${new Date().toISOString().slice(0, 10)}.csv`;",
]) if (!pageSource.includes(required)) fail(`Reservations stored note/technical CSV contract changed unexpectedly: ${required}`);
for (const forbidden of [
  "resolution_note: actionNote || ui(", "body.release_note = actionNote || ui(", "body.cancellation_reason = actionNote || ui(",
  "body.expiration_note = actionNote || ui(", "fulfillment_note: actionNote || ui(", "ui('inventory-reservations-",
]) if (pageSource.includes(forbidden)) fail(`Reservations translates stored/technical payload data unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Stored default lifecycle notes and technical CSV filename remain byte-stable English/canonical payload data.');

for (const required of [
  'product.name', 'product.barcode', 'location.name', 'location.temperature_zone',
  'reservation.reservation_number', 'reservation.requesting_department', 'reservation.source_id',
  'selectedReservation.notes', 'selectedReservation.source_id', 'item.product_name', 'item.product_id',
  'row.product_name', 'row.storage_location_name', 'event.user_id', 'JSON.stringify(metadata, null, 2)',
  'if (error instanceof ApiError || error instanceof Error) return error.message;',
]) if (!pageSource.includes(required)) fail(`Reservations business/server-data evidence missing unexpectedly: ${required}`);
for (const forbidden of [
  'ui(product.name)', 'ui(product.barcode)', 'ui(location.name)', 'ui(location.temperature_zone)',
  'ui(reservation.reservation_number)', 'ui(reservation.requesting_department)', 'ui(reservation.source_id)',
  'ui(selectedReservation.notes)', 'ui(selectedReservation.source_id)', 'ui(item.product_name)', 'ui(item.product_id)',
  'ui(row.product_name)', 'ui(row.storage_location_name)', 'ui(event.user_id)', 'ui(error.message)',
]) if (pageSource.includes(forbidden)) fail(`Reservations translates business/server data unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Reservation numbers, departments, product/location/user data, notes, metadata JSON, and API errors remain raw business/server data.');

for (const required of [
  'Stock reservations', 'Create draft reservation', 'Reservation queue', 'Reservation detail',
  'Allocation conflict queue', 'Projected free stock', 'Source / department reservation demand',
  'Partially allocated', 'Allocated', 'Partially fulfilled', 'Released',
  'Specific location', 'Best available location', 'Inbound stock commitment',
  'Expire due reservations', 'Fulfill entered quantities', 'Reservation audit trail',
  'Every entered fulfillment quantity must be greater than zero.',
  'Enter a cancellation reason before cancelling this reservation.',
  'Reservation CSV export generated.',
]) if (!literalSet.has(required)) fail(`Reservations page completion presentation is not catalog-backed: ${required}`);
if (!process.exitCode) pass('Reservation shell, draft form, queue, lifecycle, fulfillment, audit, demand, conflict, and capacity presentation are catalog-backed.');

if (process.exitCode) process.exit(process.exitCode);
pass('Tenant Inventory Reservations multilingual page-completion checks passed.');
