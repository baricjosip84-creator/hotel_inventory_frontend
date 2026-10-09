import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const src = read('src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const sharedStyles = read('src/components/enterpriseInventory/EnterpriseInventoryStyles.ts');
const localeSource = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));
const checks = [];
const check = (label, value) => {
  const ok = Boolean(value);
  checks.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

const file = ts.createSourceFile('SupplierReturnsTab.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const buttons = [];
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'button') {
    const content = node.getText(file);
    if (content.includes("ui('Add return line')")) buttons.push(node);
  }
  ts.forEachChild(node, visit);
}
visit(file);
check('Exactly one dedicated Add return line button is exposed', buttons.length === 1);
const button = buttons[0];
const attributes = button?.openingElement?.attributes?.properties ?? [];
const attr = (name) => attributes.find(x => ts.isJsxAttribute(x) && x.name.getText(file) === name);
const disabled = attr('disabled')?.initializer?.getText(file) ?? '';
const style = attr('style')?.initializer?.getText(file) ?? '';
const click = attr('onClick')?.initializer?.getText(file) ?? '';
check('Action remains a non-submitting button', attr('type')?.initializer?.getText(file) === '"button"');
check('Action still uses original addDraftItem handler', click === '{addDraftItem}');
check('Write permission still gates Add return line', disabled.includes('!canWrite'));
check('Received-lot selection remains necessary', disabled.includes('!selectedLotId'));
check('A quantity input remains necessary', disabled.includes('!lineQuantity'));
check('Pending return mutation still blocks the button', disabled.includes('createReturnMutation.isPending'));
check('Disabled gate retains exactly the original 4 conditions', disabled.replace(/[{}]/g, '').trim() === '!canWrite || !selectedLotId || !lineQuantity || createReturnMutation.isPending');
check('Enabled action now uses primary app button style', style.includes('styles.primaryButton') && !style.includes('styles.secondaryButton'));
check('Unavailable action still uses muted disabled app style', style.includes('styles.disabledButton'));
check('Button keeps original spacing', style.includes('marginTop: 8'));
check('Action retains original tenant-translated label', button?.getText(file).includes("ui('Add return line')"));
const converted = ts.transpileModule(sharedStyles, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
const exports = {};
vm.runInNewContext(converted.outputText, { exports }, { timeout: 3000 });
const primary = exports.styles.primaryButton;
const inactive = exports.styles.disabledButton;
check('Primary background and disabled background are visibly distinct', primary.background !== inactive.background);
check('Primary action uses white-on-blue accessible presentation', primary.color === '#ffffff' && primary.background === '#2563eb');
check('Disabled appearance still uses muted grey and not-allowed cursor', inactive.color === '#94a3b8' && inactive.cursor === 'not-allowed');
check('Line addition retains server-safe quantity and returnable-stock validation', src.includes('quantity > returnable + 0.0000001') && src.includes('quantity <= 0') && src.includes('parseSerialNumbersInput(lineSerialNumbers)'));
check('Line addition still adds exactly one selected lot to draft state', src.includes('setDraftItems((current) => [') && src.includes('inventory_lot_id: selectedLot.inventory_lot_id, quantity, reason: lineReason'));
check('New return still saves via existing API mutation and refresh', src.includes("'/enterprise-inventory/supplier-returns'") && src.includes('await refreshReturnData()'));
check('Supplier return registry remains visible for created records', src.includes("ui('No supplier returns yet.')") && src.includes('returnsQuery.data'));
check('Existing five-language tenant catalog contains action text', localeSource.includes('Add return line'));
check('Check registered as a project script', pkg.scripts?.['check:inventory-supplier-return-add-line-readiness-v349306'] === 'node scripts/check-supplier-return-add-line-readiness-surgical-fix-v349306.mjs');
const passed = checks.filter(Boolean).length;
console.log(`Supplier return add-line readiness: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exitCode = 1;
