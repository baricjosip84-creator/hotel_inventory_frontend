/* FT177 Products Cost Controls: actual TSX function runtime and missing-identifier guard.
   Covers unbound ui, formatStatusLabel, formatLocalizedNumber, locale in cost paths.
   A partial build environment may emit missing-dependency diagnostics; only checks
   specifically scoped original missing-name errors and isolated real components. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const productsDir = path.join(root, 'src/pages/products');
const cfg = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
assert.equal(cfg.error, undefined, 'TypeScript config must parse');
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, { ...parsed.options, incremental: false });
const invalid = ts.getPreEmitDiagnostics(program).filter(d =>
  d.file?.fileName.startsWith(productsDir + path.sep) &&
  d.code === 2304
);
assert.deepEqual(invalid.map(d => ({
  file: path.relative(root, d.file.fileName),
  line: d.file.getLineAndCharacterOfPosition(d.start).line + 1,
  message: ts.flattenDiagnosticMessageText(d.messageText, ' ')
})), [], 'Products source must have ZERO unresolved identifiers (TS2304)');
let renders = 0, formatted = 0, hookCalls = 0;
function component(name, file, props) {
  const source = fs.readFileSync(path.join(productsDir, file), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(st => ts.isFunctionDeclaration(st) && st.name?.text === name);
  assert.ok(fn, `${name} must exist`);
  const transpiled = ts.transpileModule(fn.getText(ast), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022
  }}).outputText;
  const output = { exports: {} };
  const jsx = (tag, elementProps) => ({tag, elementProps});
  const context = {
    module: output, exports: output.exports,
    require: id => {
      assert.equal(id, 'react/jsx-runtime');
      return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    },
    useAppTranslation: () => { hookCalls++; return { ui: key => `translated:${key}`, locale: 'hr-HR' }; },
    formatStatusLabel: val => val ? String(val).replaceAll('_', ' ') : 'Unknown',
    formatLocalizedNumber: (val, locale) => {
      assert.equal(locale, 'hr-HR', 'Locale must come from translation hook');
      formatted++;
      return String(val);
    },
    formatPercent: () => '0%',
    toNumber: v => Number(v || 0),
    StatCard: function StatCard(){},
    StatusBadge: function StatusBadge(){},
    styles: new Proxy({}, { get: () => ({}) }),
  };
  vm.runInNewContext(transpiled, context, {filename:file, timeout:3000});
  const result = output.exports[name](props);
  assert.ok(result, `${name} returned a render tree`);
  renders++;
}
const query = (isLoading=false, isError=false) => ({isLoading,isError,refetch:()=>{}});
for (const [loading,error] of [[true,false],[false,true],[false,false]]) {
  component('ProductCostGovernanceAuditSignoffPanel','ProductCostGovernanceAuditSignoffPanel.tsx',{
    costGovernanceAuditQuery:query(loading,error),
    costGovernanceSignoffQuery:query(loading,error),
    costGovernanceSignoff:{approval_recommendation:'review_needed', blockers:[], warnings:[], signoff_checklist:[], evidence_summary:{checklist_items:0}},
    handleExportCostGovernanceAuditCsv:()=>{}, handlePrintCostGovernanceAudit:()=>{}
  });
  component('ProductCostOperationsSummaryPanel','ProductCostOperationsSummaryPanel.tsx',{
    costOperationsRunbookQuery:query(loading,error),
    costOperationsControlQuery:query(loading,error),
    costOperationsEvidenceQuery:query(loading,error),
    costOperationsReadinessQuery:query(loading,error)
  });
}
assert.equal(renders, 6);
assert.equal(hookCalls, 6);
 assert.ok(formatted >= 3, 'Cost Operations loaded path must exercise localized number formatting');
const version = JSON.parse(fs.readFileSync(path.join(root, 'public/deployment-version.json'),'utf8'));
assert.match(version.frontend,/^FE\d+$/);
assert.match(version.audit_round,/^FT\d+$/);
console.log(`FT177 Products: TS2304 ZERO; ${renders} actual-component renders PASS; ${formatted} locale-aware formatting paths PASS; release identity manifest PASS`);
