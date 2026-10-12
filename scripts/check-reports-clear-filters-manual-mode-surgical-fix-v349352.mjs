import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/pages/ReportsPage.tsx'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let checks = 0;
function check(label, fn) { fn(); checks++; console.log('PASS', String(checks).padStart(2,'0'), label); }
const panelBindings = [
  ['product-movements', 'AutocompleteFilterField', 'movementFilters.product', 'setMovementFilters'],
  ['movement-ledger', 'AutocompleteFilterField', 'ledgerFilters.product', 'setLedgerFilters'],
  ['stock-transfer-activity', 'HistoricalLocationFilterField', 'transferFilters.location', 'setTransferFilters'],
  ['purchase-order-commitments', 'AutocompleteFilterField', 'poCommitmentFilters.product', 'setPoCommitmentFilters'],
  ['purchasing-spend', 'AutocompleteFilterField', 'spendFilters.product', 'setSpendFilters'],
  ['slow-moving', 'AutocompleteFilterField', 'slowFilters.product', 'setSlowFilters'],
  ['usage-summary', 'AutocompleteFilterField', 'usageFilters.product', 'setUsageFilters']
];
check('clear-filter revision is locally owned by Reports page', () => {
  assert.match(source, /const \[filterResetRevision, setFilterResetRevision\] = useState\(0\)/);
});
check('Clear filters increments the revision and clears export feedback', () => {
  assert.match(source, /const clearReportFilters = \(report: ReportTab\) => \{\s*clearDownloadStatus\(\);\s*setFilterResetRevision\(\(revision\) => revision \+ 1\);/);
});
check('revision changes only from explicit filter reset, not each edit', () => {
  assert.equal((source.match(/setFilterResetRevision\(/g) || []).length, 1);
});
check('reset control still respects busy and no-active-filter states', () => {
  assert.match(source, /disabled=\{isExporting \|\| disabled \|\| isFetching \|\| !hasActiveReportFilters\(report\)\}/);
});
for (const [tab, field, value, setter] of panelBindings) {
  check(`${tab}: manual selector remounts on explicit Clear filters`, () => {
    const start = source.indexOf(`{activeTab === '${tab}' ? (`);
    assert.ok(start >= 0, tab);
    const next = source.indexOf('</ReportPanel>', start);
    const panel = source.slice(start, next);
    const line = panel.split('\n').find(x=>x.includes(`<Fragment key={filterResetRevision}><${field} `));
    assert.ok(line, `${tab}: missing reset key`);
    assert.ok(line.includes(`value={${value}}`), `${tab}: filter value changed`);
    assert.ok(line.includes(`updateAndClear(${setter},`), `${tab}: handler changed`);
    assert.ok(line.includes('disabled={isExporting}'), `${tab}: busy state changed`);
  });
}
check('no other selector remounts were introduced', () => {
  assert.equal((source.match(/<Fragment key=\{filterResetRevision\}>/g)||[]).length, panelBindings.length);
});
check('manual product and historical location modes still respond to user selection', () => {
  for (const sentinel of ['__manual_product_search__','__historical_location__']) assert.ok(source.includes(sentinel));
  assert.equal((source.match(/setCustomMode\(true\)/g)||[]).length, 2);
  assert.equal((source.match(/setCustomMode\(false\)/g)||[]).length, 2);
});
check('manual inputs retain max length, placeholder and change handling', () => {
  assert.equal((source.match(/maxLength=\{MAX_REPORT_FILTER_LENGTH\}/g)||[]).length >= 3, true);
  assert.ok(source.includes("ui('Enter a historical location or search term')"));
  assert.ok(source.includes("ui('Enter a product name or search term')"));
});
check('all reports still reset actual query values to their declared defaults', () => {
  for (const defaultName of ['MOVEMENT','LEDGER','TRANSFER','PO_COMMITMENT','SPEND','SLOW','USAGE']) {
    assert.ok(source.includes(`...DEFAULT_${defaultName}_FILTERS`), defaultName);
  }
});
check('report page passes isolated TypeScript/TSX parsing', () => {
  const out = ts.transpileModule(source, {fileName:'ReportsPage.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  assert.deepEqual((out.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).map(x=>ts.flattenDiagnosticMessageText(x.messageText,'\n')),[]);
});
check('regression command registered in package.json', () => {
  assert.equal(pkg.scripts['check:reports-clear-filters-manual-mode-v349352'], 'node scripts/check-reports-clear-filters-manual-mode-surgical-fix-v349352.mjs');
});
console.log(`Batch109 reports filter recovery: ${checks}/${checks} PASS`);
