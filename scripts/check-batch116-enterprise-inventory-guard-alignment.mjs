import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const parLevels = read('src/components/enterpriseInventory/tabs/ParLevelsTab.tsx');
const notifications = read('src/components/enterpriseInventory/tabs/NotificationsTab.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const cleanup = read('scripts/check-enterprise-inventory-cleanup.mjs');
const pkg = JSON.parse(read('package.json'));
let passed = 0, failed = 0;
function check(label, actual, expected = true) {
  const good = actual === expected;
  console.log(`${good ? 'PASS' : 'FAIL'}: ${label}${good ? '' : ` (actual ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`}`);
  good ? passed++ : failed++;
}

// Verify the actual Par-level form remains explanatory without changing its stock rules.
check('Reorder field identifies the fixed override as optional', parLevels.includes("label={ui('Fixed reorder quantity (optional)')}"));
check('Zero continues to describe automatic top-up to the target', parLevels.includes("helper={ui('0 = automatically calculate the quantity needed to reach the target.')}"));
check('Reorder input retains the established quantity value', parLevels.includes('value={form.reorder_quantity}'));
check('Reorder input still writes reorder_quantity only', parLevels.includes("({ ...current, reorder_quantity: value })"));
check('Reorder quantity continues to permit zero', parLevels.includes('min="0"'));
check('Legacy reorder wording is not exposed', !parLevels.includes('Legacy reorder quantity'));
check('Cleanup guard checks current fixed override wording', cleanup.includes("label={ui('Fixed reorder quantity (optional)')}"));
check('Cleanup guard protects explanatory automatic-mode helper', cleanup.includes("helper={ui('0 = automatically calculate the quantity needed to reach the target.')}") );

// Execute the real current notification label helper rather than checking an obsolete call site.
const file = ts.createSourceFile('NotificationsTab.tsx', notifications, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const tokenDecl = file.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((decl) => decl.name.getText(file) === 'tokenLabels'));
const eventDecl = file.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((decl) => decl.name.getText(file) === 'notificationEventLabel'));
if (!tokenDecl || !eventDecl) throw new Error('Current notification-event label implementation was not found.');
const compiled = ts.transpileModule([tokenDecl.getText(file), eventDecl.getText(file), 'module.exports = { notificationEventLabel };'].join('\n'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
if (compiled.diagnostics?.length) throw new Error('Notification-event label helper did not transpile cleanly.');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(compiled.outputText, sandbox, { timeout: 5000 });
const eventLabel = sandbox.module.exports.notificationEventLabel;
const translate = (english) => `loc:${english}`;
check('Known cycle-count event uses a translated label', eventLabel('cycle_count_reconciled', translate), 'loc:Cycle count reconciled');
check('Known invoice event uses a translated label', eventLabel('invoice_variance_detected', translate), 'loc:Invoice variance detected');
check('Known approval event uses a translated label', eventLabel('approval_action', translate), 'loc:Approval action');
check('Unknown internal event token is not shown in tenant UI', eventLabel('secret.internal_notification_123', translate), 'loc:Other inventory event');
check('Unknown underscored event code is not leaked', eventLabel('new_event_type_2026', translate), 'loc:Other inventory event');
check('Blank notification event is a neutral placeholder', eventLabel(null, translate), '—');
check('Whitespace event is a neutral placeholder', eventLabel('    ', translate), '—');
check('Known code with whitespace still localizes', eventLabel('  approval_action ', translate), 'loc:Approval action');
check('Tenant table uses safe event formatter', notifications.includes('notificationEventLabel(item.event_type, ui)'));
check('Cleanup guard checks safe event formatter', cleanup.includes('notificationEventLabel(item.event_type, ui)'));
check('Cleanup guard checks unknown-token fallback', cleanup.includes("ui('Other inventory event')"));
check('Delivery event title fallback uses safe formatter', notifications.includes('item.title && item.title !== item.event_type ? item.title : notificationEventLabel(item.event_type, ui)'));
check('Old raw event token formatter is not used for event column', !notifications.includes('displayToken(item.event_type, ui)'));

for (const label of ['Fixed reorder quantity (optional)', '0 = automatically calculate the quantity needed to reach the target.', 'Other inventory event']) {
  const rows = translations.split('\n').filter(line => line.trimStart().startsWith(`["${label}"`));
  check(`Translation row exists once: ${label}`, rows.length, 1);
  check(`Translation has EN/DE/ES/FR/HR: ${label}`, rows.length === 1 && (rows[0].match(/"[^"\n]+"/g) || []).length >= 5);
}
check('Old cleanup command remains registered', pkg.scripts?.['check:enterprise-inventory-cleanup'], 'node scripts/check-enterprise-inventory-cleanup.mjs');
check('New focused Batch116 command is registered', pkg.scripts?.['check:batch116-enterprise-inventory-guard-alignment'], 'node scripts/check-batch116-enterprise-inventory-guard-alignment.mjs');
const run = spawnSync(process.execPath, ['scripts/check-enterprise-inventory-cleanup.mjs'], { cwd: root, encoding: 'utf8', timeout: 10000 });
check('Restored inherited cleanup check executes and succeeds', run.status === 0 && run.stdout.includes('Enterprise Inventory cleanup contract passed.'));
console.log(`Batch116 Enterprise Inventory regression alignment: ${passed}/${passed + failed} PASS`);
if (failed) process.exitCode = 1;
