import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const alertsSource = read('src/pages/AlertsPage.tsx');
const alertPresentationSource = read('src/lib/alertPresentation.ts');

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
  'Critical alerts can block protected stock or shipment operations according to alert scope until resolved.',
  'Acknowledge', 'Resolve', 'Reopen', 'Increase escalation level',
  'Emergency blocking-alert override', 'Mandatory override reason',
  'Open and resolved', 'Acknowledged and unacknowledged', 'All severities',
  'Ownership', 'Escalation level', 'Resolution', 'Source workflow stays authoritative',
  'This queues an in-app notification event but does not send an email or webhook notification.'
];
const missingRepresentative = representativeRows.filter((key) => !uniqueKeys.has(key));
if (missingRepresentative.length) fail(`Missing representative Alerts translations: ${missingRepresentative.join(' | ')}`);
else pass(`${representativeRows.length} representative Alerts rows are present in all five locales.`);

const dynamicActionLabels = [
  'Open Stock', 'Open Shipments', 'Open Stock Transfers', 'Open Reservations', 'Open Requisitions',
  'Open Inventory Usage', 'Open Purchase Orders', 'Open Suppliers', 'Open Execution Tasks', 'Open Admin System', 'Open Action Center'
];
const missingDynamicActions = dynamicActionLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamicActions.length) fail(`Alerts next-action labels are missing translations: ${missingDynamicActions.join(' | ')}`);
else pass(`${dynamicActionLabels.length} dynamic Alerts next-action labels are catalog-backed.`);

const canonicalTypeLabels = [
  'Low stock', 'Negative stock blocked', 'Expired stock', 'Stock expiring soon', 'Finalized shipment incomplete',
  'Inventory usage anomaly', 'Inventory damage or waste recorded', 'Inventory usage exceptions',
  'Shipment item integrity problem', 'Over-receipt blocked', 'Purchase Order over-receipt blocked', 'Shipment change blocked',
  'Stock ledger mismatch', 'Stock lot mismatch', 'System health degraded'
];
const missingCanonicalLabels = canonicalTypeLabels.filter((key) => !uniqueKeys.has(key));
if (missingCanonicalLabels.length) fail(`Alerts canonical type display labels are missing translations: ${missingCanonicalLabels.join(' | ')}`);
if (!(alertsSource.includes('formatAlertMessage,')
  && alertsSource.includes('formatAlertResolutionNote,')
  && alertsSource.includes('formatAlertTypeLabel,')
  && alertsSource.includes("from '../lib/alertPresentation';"))) {
  fail('Alerts must use the shared system/custom Alert presentation boundary.');
} else if (!missingCanonicalLabels.length) {
  pass(`${canonicalTypeLabels.length} backend-reserved Alert types use the shared localized presentation boundary.`);
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
  '<div style={styles.cardText}>{formatAlertMessage(alert, ui)}</div>',
  "alert.product_name || (alert.product_id ? ui('Linked product unavailable') : ui('No product linked'))",
  '<span>{formatAlertResolutionNote(alert, ui)}</span>'
];
for (const contract of businessDataContracts) if (!alertsSource.includes(contract)) fail(`Alerts user/business data must remain unmodified at display time: ${contract}`);
if (!alertsSource.includes("alert.product_name || (alert.product_id ? ui('Linked product unavailable') : ui('No product linked'))")) {
  fail('Alerts must preserve the raw Product name and distinguish a missing readable Product reference from an alert with no Product link.');
}
for (const required of [
  "return systemLabel ? ui(systemLabel) : raw;",
  "if (!SYSTEM_ALERT_TYPE_LABELS[type]) return message;",
  "return localized ? ui(localized) : message;",
  "return isAutomaticallyResolvedAlert(alert) ? ui(note) : note;"
]) {
  if (!alertPresentationSource.includes(required)) fail(`Shared Alert system/custom ownership boundary missing: ${required}`);
}
for (const forbiddenType of ['NEGATIVE_STOCK:', 'FINALIZED_SHIPMENT_INCOMPLETE:', 'REMEDIATION_PLAYBOOK_ATTACHED:']) {
  if (alertPresentationSource.includes(forbiddenType)) fail(`Non-reserved/manual-capable Alert type must not be treated as system-owned: ${forbiddenType}`);
}
if (alertsSource.includes('.map((word) => word.toLowerCase())')) {
  fail('Alerts must not normalize or lowercase user-defined alert types at display time.');
}
if (!alertsSource.includes('`/stock?product_id=${encodeURIComponent(alert.product_id)}`')) fail('Product-linked Alerts must open exact product context in Stock.');
if (!process.exitCode) pass('System-owned Alert presentation localizes only proven backend-owned shapes; custom/historical Alert evidence remains verbatim and Product context is exact.');

if (alertsSource.includes('This does not notify anyone automatically.')) {
  fail('Alerts still claims manual escalation sends no notification even though the backend queues an in-app notification event.');
}


if (!process.exitCode) console.log('Tenant Alerts multilingual hardening: PASS');
