import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const localRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(process.argv.find(a => a.startsWith('--source-dir='))?.split('=').slice(1).join('=') || localRoot);
const src = path.join(root,'src');
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch {
  // Local offline-verification environment has the compiler globally installed.
  ts = require('typescript');
}
const sharedTs = fs.readFileSync(path.join(localRoot, 'src/lib/spreadsheetCsv.ts'),'utf8');
const sharedJs = ts.transpileModule(sharedTs,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText;
const { csvSpreadsheetCell } = await import(`data:text/javascript;base64,${Buffer.from(sharedJs).toString('base64')}`);
let n=0;
function check(expression,message) {assert.ok(expression,message);n++;}
function equal(actual,expected,message) {assert.equal(actual,expected,message);n++;}
const cases = [
  ['=2+3', "'=2+3"], [' =2+3', "' =2+3"], ['\t=2+3', "'\t=2+3"],
  ['\r\n=2+3', "'\r\n=2+3"], ['\uFEFF@SUM(2)', "'\uFEFF@SUM(2)"],
  ['\u200B+CMD', "'\u200B+CMD"], ['\u00a0-HYPERLINK()', "'\u00a0-HYPERLINK()"],
  ['@HYPERLINK()', "'@HYPERLINK()"], ['-2+3', "'-2+3"], ['-42', '-42'],
  ['+12.5', '+12.5'], ['-0.12e+5', '-0.12e+5'], [12.5, '12.5'],
  ['Hello, "World"', 'Hello, "World"'], ['No formula', 'No formula'],
  [null, ''], [undefined, ''], ['-not-a-number', "'-not-a-number"],
];
for(const [input,want] of cases) {
  let safe = csvSpreadsheetCell(input);
  // Test both CSV quoting modes by parsing the emitted cell as one literal.
  const decode = val => val.startsWith('"') && val.endsWith('"') ? val.slice(1,-1).replaceAll('""','"') : val;
  equal(decode(safe),want,`normal encoding for ${JSON.stringify(input)}`);
  equal(decode(csvSpreadsheetCell(input,true)),want,`always-quoted encoding for ${JSON.stringify(input)}`);
}
const pages = [
 ['components/imports/InventoryCsvImportPanel.tsx','escape',1],
 ['pages/ExecutionRequestsPage.tsx','csvCell',1],
 ['pages/StockTransfersPage.tsx','escapeCsvCell',1],
 ['pages/StockMovementsPage.tsx','csvValue',1],
 ['pages/ProcurementRecommendationsPage.tsx','csvEscape',1],
 ['pages/InsightsPage.tsx','escapeCsv',1],
 ['pages/inventoryUsage/InventoryUsageDashboard.tsx','escapeCsvCell',1],
 ['pages/inventoryUsage/InventoryUsagePeriodClosuresPanel.tsx','escapeCsvCell',1],
 ['pages/inventoryUsage/InventoryUsageGovernancePanel.tsx','escapeCsvCell',1],
 ['pages/inventoryUsage/InventoryUsageBulkRecorder.tsx','escapeCell',2],
 ['pages/InventoryUsagePage.tsx','escapeCell',1],
];
for (const [rel,encoder,number] of pages) {
  const file=path.join(src,rel);const content=fs.readFileSync(file,'utf8');
  const moduleName=rel.startsWith('components/imports/') || rel.startsWith('pages/inventoryUsage/') ? '../../lib/spreadsheetCsv' : '../lib/spreadsheetCsv';
  // Execute the exporter function extracted from its real page source, not a mock.
  // This deliberately detects the previous release's unsafe validation-errors encoder.
  const ast=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const extracted=[];
  const visit = node => {
    if (ts.isFunctionDeclaration(node) && node.name?.text===encoder) extracted.push(node.getText(ast));
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text===encoder) {
      extracted.push(`const ${encoder} = ${node.initializer.getText(ast)};`);
    }
    ts.forEachChild(node,visit);
  };
  visit(ast);
  equal(extracted.length,number,`${rel} has ${number} working CSV encoder(s)`);
  for (const fragment of extracted) {
    const compiled=ts.transpileModule(fragment,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
    const encode=Function('csvSpreadsheetCell', `${compiled}\nreturn ${encoder}`)(csvSpreadsheetCell);
    const actual=encode('  =2+3');
    const decode=val=>val.startsWith('"')&&val.endsWith('"')?val.slice(1,-1).replaceAll('""','"'):val;
    equal(decode(actual),"'  =2+3",`${rel} neutralizes whitespace-prefixed spreadsheet formulas`);
    equal(decode(encode('-27')), '-27',`${rel} preserves genuine negative quantities`);
  }
  check(content.includes(`import { csvSpreadsheetCell } from '${moduleName}'`),`${rel} imports shared safety helper`);
  const pattern=new RegExp(`(?:function\\s+${encoder}\\s*\\(|const\\s+${encoder}\\s*=\\s*\\(value:\\s*unknown\\)\\s*=>)`, 'g');
  equal([...content.matchAll(pattern)].length,number,`${rel}: expected exporter helper count`);
  const delegated = encoder==='escape' && rel.includes('ImportPanel')
    ? content.includes('const escape = (value: unknown) => csvSpreadsheetCell(value);')
    : new RegExp(`(?:${encoder}\\s*\\(value:[^)]*\\):\\s*string\\s*\\{\\s*return csvSpreadsheetCell\\(value(?:, true)?\\);|const\\s+${encoder}\\s*=\\s*\\(value:\\s*unknown\\)\\s*=>\\s*csvSpreadsheetCell\\(value(?:, true)?\\);)`).test(content);
  check(delegated,`${rel} delegates its CSV cell conversion to the shared helper`);
  check(!/const safeRaw\s*=/.test(content),`${rel} has no vulnerable old regex encoder`);
  const source=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  equal(source.parseDiagnostics.length,0,`${rel} parses without TypeScript syntax errors`);
}
console.log(`PASS ${n}/${n} CSV cell and export-path checks across ${pages.length} frontend files, source=${root}`);
