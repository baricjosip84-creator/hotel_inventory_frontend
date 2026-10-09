import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const page = read('src/components/enterpriseInventory/tabs/NotificationsTab.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const previous = read('scripts/check-notifications-tab-queue-feedback-surgical-fix-v349312.mjs');
const pkg = JSON.parse(read('package.json'));
const checks = [];
const check = (label, passed) => {
  checks.push(Boolean(passed));
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${label}`);
};

// Exercise the real frontend presenters (transpiled from their source), not a
// second implementation maintained only in the regression script.
const extract = (name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page.match(new RegExp(`const ${escapedName}[^\\n]*\\n[\\s\\S]*?\\n};`, ''))?.[0] ?? '';
};
const source = [extract('tokenLabels'), extract('displayToken'), extract('notificationEventLabel'), extract('tenantFacingNotificationDescription')].join('\n');
const js = ts.transpileModule(`${source}\nmodule.exports = { tokenLabels, displayToken, notificationEventLabel, tenantFacingNotificationDescription };`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true
});
const module = { exports: {} };
vm.runInNewContext(js.outputText, { module }, { timeout: 1000 });
const { tokenLabels, displayToken, notificationEventLabel, tenantFacingNotificationDescription } = module.exports;
const ui = (english) => `[translated] ${english}`;

const known = {
  alert_escalated: 'Alert escalated',
  supplier_return_credit_expected: 'Supplier return credit expected',
  supplier_return_credit_note_received: 'Supplier credit note received'
};
for (const [code, expected] of Object.entries(known)) {
  check(`Event ${code} has dedicated business label`, tokenLabels[code] === expected);
  check(`Event ${code} renders localized business label`, notificationEventLabel(code, ui) === `[translated] ${expected}`);
  check(`Event ${code} preserves readable backend title`, tenantFacingNotificationDescription({ event_type: code, title: expected }, ui) === expected);
  check(`Event ${code} does not show raw-code title`, tenantFacingNotificationDescription({ event_type: code, title: code }, ui) === `[translated] ${expected}`);
}
check('Unknown event types do not leak machine identifiers', notificationEventLabel('future_unknown_technical_event', ui) === '[translated] Other inventory event');
check('Unknown raw-code title falls back to readable event label', tenantFacingNotificationDescription({ event_type: 'future_unknown_technical_event', title: 'future_unknown_technical_event' }, ui) === '[translated] Other inventory event');
check('Unknown event retains meaningful backend description/title', tenantFacingNotificationDescription({ event_type: 'future_unknown_technical_event', title: 'Stock needs review' }, ui) === 'Stock needs review');
check('Missing event type remains a plain dash', notificationEventLabel(null, ui) === '—');
check('Severity and delivery status presenters are unchanged', displayToken('queued', ui) === '[translated] Queued' && displayToken('critical', ui) === '[translated] Critical');
check('Notification Event table uses business label', /rows=\{notifications\.map\([\s\S]*?notificationEventLabel\(item\.event_type, ui\)/u.test(page));
check('Delivery History fallback uses business label', page.includes('item.title && item.title !== item.event_type ? item.title : notificationEventLabel(item.event_type, ui)'));
check('Select option fallback uses localized event name', page.includes('tenantFacingNotificationDescription(event, ui)'));
check('Original event identifiers remain available in API objects', page.includes('item.event_type') && page.includes('notification_event_id'));
check('Backend titles and event codes are not rewritten', page.includes('if (normalizedTitle && normalizedTitle !== String(item.event_type || \'\').trim()) return normalizedTitle;'));
for (const label of [...Object.values(known), 'Other inventory event']) {
  const rows = [...catalog.matchAll(new RegExp('^\\s*\\["' + label + '",\\s*"([^"\\n]+)",\\s*"([^"\\n]+)",\\s*"([^"\\n]+)",\\s*"([^"\\n]+)"\\],?$', 'gmu'))];
  check(`${label} has exactly one complete DE/ES/FR/HR translation`, rows.length === 1 && rows[0].slice(1).every(Boolean));
}
check('Existing tab/deep-link/queue guard preserved', previous.includes('check:notifications-tab-queue-feedback-surgical-fix-v349312') && page.includes('data-skip-global-action-feedback="true"'));
check('Regression is registered as a package script', pkg.scripts?.['check:notification-event-labels-surgical-fix-v349313'] === 'node scripts/check-notification-event-labels-surgical-fix-v349313.mjs');
const passed = checks.filter(Boolean).length;
console.log(`Notification event business labels: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exitCode = 1;
