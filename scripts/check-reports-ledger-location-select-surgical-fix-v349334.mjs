import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/pages/ReportsPage.tsx'), 'utf8');
const backend = fs.readFileSync(path.join(root, '../hotel-inventory-backend/src/services/analytics/reportService.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const ledger = source.slice(source.indexOf("{activeTab === 'movement-ledger' ? ("), source.indexOf("{activeTab === 'inventory-variance' ? ("));
const helper = source.slice(source.indexOf('function ChoiceFilterField('), source.indexOf('function AutocompleteFilterField('));
let pass = 0;
function check(description, test) { test(); ++pass; console.log(`PASS ${String(pass).padStart(2)}: ${description}`); }

check('Movement Ledger panel exists', () => assert.ok(ledger.startsWith("{activeTab === 'movement-ledger' ? (")));
check('Location uses existing ChoiceFilterField', () => assert.match(ledger, /<ChoiceFilterField label=\{ui\("Location"\)\} value=\{ledgerFilters\.location\}/));
check('No unselectable datalist Location control remains', () => assert.doesNotMatch(ledger, /<AutocompleteFilterField label=\{ui\("Location"\)\}/));
check('Obsolete Location datalist identifier removed', () => assert.doesNotMatch(source, /report-locations-ledger/));
check('Correct location option list passed', () => assert.match(ledger, /value=\{ledgerFilters\.location\} placeholder=\{ui\("Any location"\)\} options=\{filterOptions\.locations\}/));
check('Select writes back to ledgerFilters.location', () => assert.match(ledger, /onChange=\{\(value\) => updateAndClear\(setLedgerFilters, 'location', value\)\}/));
check('Location disabled while exporting', () => assert.match(ledger, /options=\{filterOptions\.locations\} disabled=\{isExporting\}/));
check('Unfiltered location option is preserved', () => assert.match(helper, /<option value="">\{placeholder\}<\/option>/));
check('Available tenant options are selectable by their exact display name', () => assert.match(helper, /options\.map\(\(option\) => <option key=\{option\} value=\{option\}>\{option\}<\/option>\)/));
check('Select is controlled by value and onChange', () => assert.match(helper, /<select value=\{value\} onChange=\{\(event\) => onChange\(event\.target\.value\)\} disabled=\{disabled\}>/));
check('No-options fallback accepts typed historical names', () => assert.match(helper, /if \(!options\.length\) \{\s*return <TextFilterField/));
check('Location remains included in default ledger filter state', () => assert.match(source, /const DEFAULT_LEDGER_FILTERS = \{[^}]*location: ''/));
check('Clear Filters still resets Ledger', () => assert.match(source, /case 'movement-ledger': setLedgerFilters\(\{ \.\.\.DEFAULT_LEDGER_FILTERS \}\); break;/));
check('Ledger query key still uses ledgerFilters', () => assert.match(source, /queryKey: \['reports', 'movement-ledger', ledgerFilters\]/));
check('Ledger fetch still takes ledgerFilters unchanged', () => assert.match(source, /queryFn: \(\) => fetchMovementLedger\(ledgerFilters\)/));
check('Ledger API still uses encoded query builder', () => assert.match(source, /`\/reports\/movement-ledger\$\{buildQueryString\(filters\)\}`/));
check('API query builder encodes values through URLSearchParams', () => assert.match(source, /const searchParams = new URLSearchParams\(\)/));
check('Movement-type selector preserved', () => assert.match(ledger, /MOVEMENT_TYPE_OPTIONS\.map/));
check('Product free-text autocomplete remains available', () => assert.match(ledger, /<AutocompleteFilterField label=\{ui\("Product"\)\} value=\{ledgerFilters\.product\}/));
check('From/To date filters preserved', () => assert.match(ledger, /<DateRangeFields from=\{ledgerFilters\.from\} to=\{ledgerFilters\.to\}/));
check('Result-limit choices unchanged', () => assert.match(ledger, /REPORT_RESULT_LIMIT_OPTIONS\.map/));
check('Report actions preserved', () => assert.match(ledger, /actions=\{actionButtons\('movement-ledger', movementLedgerQuery\.isFetching\)\}/));
check('Ledger report rows still rendered', () => assert.match(ledger, /ledgerRows\.map\(\(row\) =>/));
check('Report options endpoint remains tenant scoped', () => assert.match(backend, /getReportFilterOptions = async \(\{ tenantId \}\) => \{/));
check('Tenant location list still excludes deleted locations', () => assert.match(backend, /FROM storage_locations\s+WHERE tenant_id = \$1\s+AND deleted_at IS NULL/));
check('Backend ledger location is matched by parameterized ILIKE', () => assert.match(backend, /COALESCE\(sm\.storage_location_name_snapshot, ''\) ILIKE \$\$\{paramIndex\} OR sl\.name ILIKE \$\$\{paramIndex\}/));
check('Backend ledger location still normalizes input', () => assert.match(backend, /normalizeNullableText\(location, 'location'\)/));
check('New regression command registered', () => assert.equal(pkg.scripts['check:reports-ledger-location-select-v349334'], 'node scripts/check-reports-ledger-location-select-surgical-fix-v349334.mjs'));
// Source-level parser verification only; not a deployed end-to-end UI acceptance check.
const tsResult = ts.transpileModule(source, {fileName:'ReportsPage.tsx', reportDiagnostics:true, compilerOptions:{jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext}});
check('Modified ReportsPage.tsx has no isolated TypeScript syntax errors', () => assert.equal((tsResult.diagnostics ?? []).filter(d => d.category===ts.DiagnosticCategory.Error).length, 0));
console.log(`Movement Ledger location-selection surgical guard: ${pass}/${pass} PASS`);
