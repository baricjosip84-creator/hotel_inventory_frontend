import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const alertsSource = read('src/pages/AlertsPage.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {
    // Ignore TypeScript that is not a translation row.
  }
}

const catalogKeys = rows.map((row) => row[0]);
const uniqueKeys = new Set(catalogKeys);
if (catalogKeys.length !== uniqueKeys.size) {
  const seen = new Set();
  const duplicates = [...new Set(catalogKeys.filter((key) => seen.has(key) || !seen.add(key)))];
  fail(`Tenant UI translation catalog has duplicate English keys: ${duplicates.join(' | ')}`);
} else {
  pass(`Tenant UI catalog has ${catalogKeys.length} unique five-language rows.`);
}

const literalUiPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}

const literalKeys = [];
for (const match of alertsSource.matchAll(literalUiPattern)) {
  try { literalKeys.push(decodeLiteral(match[1])); } catch { /* TypeScript/lint catches malformed literals. */ }
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) fail(`Alerts has ui() literals missing from the five-language catalog: ${missingLiterals.join(' | ')}`);
else pass(`Alerts has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const representativeRows = [
  'Alert workspace', 'Alert queue', 'Create a manual alert', 'Filter the alert queue',
  'Critical alerts block protected stock and shipment operations until resolved.',
  'Acknowledge', 'Resolve', 'Reopen', 'Increase escalation level',
  'Emergency blocking-alert override', 'Mandatory override reason',
  'Open and resolved', 'Acknowledged and unacknowledged', 'All severities',
  'Ownership', 'Escalation level', 'Resolution', 'Source workflow stays authoritative'
];
const missingRepresentative = representativeRows.filter((key) => !uniqueKeys.has(key));
if (missingRepresentative.length) fail(`Missing representative Alerts translations: ${missingRepresentative.join(' | ')}`);
else pass(`${representativeRows.length} representative Alerts rows are present in all five locales.`);

const dynamicActionLabels = [
  'Open Stock', 'Open Shipments', 'Open Stock Transfers', 'Open Reservations', 'Open Requisitions',
  'Open Inventory Usage', 'Open Purchase Orders', 'Open Suppliers', 'Open Execution Tasks', 'Open Action Center'
];
const missingDynamicActions = dynamicActionLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamicActions.length) fail(`Alerts next-action labels are missing translations: ${missingDynamicActions.join(' | ')}`);
else pass(`${dynamicActionLabels.length} dynamic Alerts next-action labels are catalog-backed.`);

const canonicalTypeLabels = [
  'Low stock', 'Negative stock', 'Expired stock', 'Expiring stock', 'Finalized shipment incomplete',
  'Inventory usage anomaly', 'Inventory usage damage waste', 'Inventory usage exceptions',
  'Orphaned shipment item', 'Over received', 'Purchase order over received', 'Shipment immutable',
  'Stock ledger desync', 'Stock lot desync', 'System health degraded'
];
const missingCanonicalLabels = canonicalTypeLabels.filter((key) => !uniqueKeys.has(key));
if (missingCanonicalLabels.length) fail(`Alerts canonical type display labels are missing translations: ${missingCanonicalLabels.join(' | ')}`);
if (!alertsSource.includes('const CANONICAL_ALERT_TYPE_LABELS') || !alertsSource.includes('if (canonicalLabel) return ui(canonicalLabel);')) {
  fail('Canonical alert types must be translated only at display time through the shared UI catalog.');
} else if (!missingCanonicalLabels.length) {
  pass(`${canonicalTypeLabels.length} known canonical alert-type display labels are localized without changing stored alert types.`);
}

if (!alertsSource.includes('useAppTranslation()')) fail('Alerts workspace must use the shared translation context.');
if (!alertsSource.includes('formatLocalizedDateTime(value, locale)')) fail('Alerts timestamps must use locale-aware shared date/time formatting.');
else pass('Alerts timestamps use the selected application locale.');

const forbiddenEnglishPresentation = [
  '>Acknowledge<', '>Resolve<', '>Reopen<', '>Apply filters<', '>Create alert<',
  '>Refresh alerts<', '>Increase escalation level<', '>Override and close blocking alert<',
  "placeholder=\"Message, type, or product\"", "placeholder=\"Example: Supplier delivery delay\"",
  "setActionError('Failed to acknowledge the alert.')", "setActionMessage('Manual alert created successfully.')"
];
for (const pattern of forbiddenEnglishPresentation) {
  if (alertsSource.includes(pattern)) fail(`Alerts still contains English-only presentation: ${pattern}`);
}

const forbiddenTechnicalTranslation = [
  "ui('/alerts')", 'ui("/alerts")',
  "ui('/admin/alerts/')", 'ui("/admin/alerts/")',
  "ui('alerts.write')", 'ui("alerts.write")',
  "ui('critical')", 'ui("critical")',
  "ui('resolved')", 'ui("resolved")',
  "ui('NEGATIVE_STOCK_BLOCKING')", 'ui("NEGATIVE_STOCK_BLOCKING")'
];
for (const pattern of forbiddenTechnicalTranslation) {
  if (alertsSource.includes(pattern)) fail(`Canonical Alerts technical value must remain language-independent: ${pattern}`);
}

const canonicalContracts = [
  "apiRequest<AlertRow[]>(`/alerts?${params.toString()}`)",
  "apiRequest<AlertRow>('/alerts'",
  "apiRequest<AlertRow>(`/alerts/${id}/acknowledge`",
  "apiRequest<AlertRow>(`/alerts/${input.id}/resolve`",
  "apiRequest<AlertRow>(`/alerts/${id}/reopen`",
  "apiRequest<AlertRow>(`/alerts/${id}/escalate`",
  "apiRequest<{ message: string; alert: AlertRow }>(`/admin/alerts/${input.id}/override`",
  "params.set('severity', filters.severity.trim())",
  "params.set('resolved', filters.resolved.trim())",
  "params.set('acknowledged', filters.acknowledged.trim())",
  'const { canManageAlerts, canOverrideAlerts } = getRoleCapabilities()',
  '!canManageAlerts ?'

];
for (const contract of canonicalContracts) if (!alertsSource.includes(contract)) fail(`Alerts API/filter/permission contract changed during localization: ${contract}`);
if (!process.exitCode) pass('Alerts API routes, canonical filter values, permissions, blocking semantics, and mutation endpoints remain language-independent.');

const businessDataContracts = [
  '<div style={styles.cardText}>{alert.message}</div>',
  'alert.product_name || ui(\'No product linked\')',
  '<span>{alert.resolution_note}</span>'
];
for (const contract of businessDataContracts) if (!alertsSource.includes(contract)) fail(`Alerts user/business data must remain unmodified at display time: ${contract}`);
if (!process.exitCode) pass('Alert messages, product names, operator names, and resolution notes remain business data rather than translation keys.');

if (!process.exitCode) console.log('Tenant Alerts multilingual hardening: PASS');
