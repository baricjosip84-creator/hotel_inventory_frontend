import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/InventoryCapabilitiesPage.tsx'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const backendRoot = process.env.BACKEND_ROOT;
const backend = backendRoot ? fs.readFileSync(path.join(backendRoot, 'src/services/inventory/inventoryCapabilitiesService.js'), 'utf8') : '';
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) {
    console.error(`FAIL ${checks}: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${checks}: ${message}`);
  }
}

check(page.includes("type BomStockRow = {"), 'BOM page defines the narrow stock-readiness response shape');
check(page.includes("apiRequest<BomStockRow[]>('/stock')"), 'BOM readiness uses the existing tenant stock-read endpoint');
check(page.includes("enabled: canExecute"), 'stock readiness is queried only for users who can execute the governed stock action');
check(page.includes("const readinessByLocation = useMemo(() => {"), 'location readiness is derived before the irreversible confirmation step');
check(page.includes("row.projected_free_quantity"), 'readiness uses current unreserved/free stock when the API provides it');
check(page.includes("Number(row.quantity || 0) - Number(row.reserved_quantity || 0)"), 'readiness has a reservation-aware fallback when projected free quantity is absent');
check(page.includes("component.component_product_id || component.product_id"), 'assembly readiness evaluates each BOM component product');
check(page.includes("Number(component.quantity || 0) * ratio * (1 + Number(component.waste_percent || 0) / 100)"), 'assembly readiness includes BOM ratio and waste percentage');
check(page.includes("selectedExecutionBom.product_id"), 'disassembly readiness evaluates the finished-product stock');
check(page.includes("ui('Insufficient stock') : ui('Stock check passed')"), 'location options surface readiness instead of presenting every location identically');
check(page.includes("selectedLocationReadiness?.blocked"), 'selected-location insufficiency is carried into the execution guard');
check(page.includes("if (!bom || !location || selectedLocationReadiness?.blocked) return;"), 'known-insufficient operations cannot reach the confirmation dialog');
check(page.includes("stockReadiness.isLoading || Boolean(selectedLocationReadiness?.blocked)"), 'submit control waits for the readiness check and disables known-insufficient execution');
check(page.includes("Checking current unreserved stock before execution…"), 'loading feedback tells the user why execution is temporarily unavailable');
check(page.includes("This location cannot currently support the selected operation."), 'blocked location gets explicit business-readable feedback');
check(page.includes("Choose another location or correct the stock position before confirming a stock-changing action."), 'blocked feedback gives an immediate recovery path');
check(page.includes("The server will still enforce lot, serial, reservation and other inventory safeguards when you submit."), 'UI precheck explicitly preserves the backend as the authoritative final safeguard');
check(api.includes("normalizedPathOnly === '/inventory-capabilities/boms'"), 'BOM creation has action-specific shared success feedback');
check(api.includes("/^\\/inventory-capabilities\\/boms\\/[^/]+\\/execute$/"), 'BOM execution has action-specific shared success feedback');
check(api.includes("direction === 'disassemble'"), 'BOM execution feedback distinguishes assembly from disassembly');
check(api.includes("'Assembly completed and stock movements recorded.'"), 'assembly toast names the actual stock-changing operation');
check(api.includes("'Disassembly completed and stock movements recorded.'"), 'disassembly toast names the actual stock-changing operation');
check(translations.includes('["Stock check passed"'), 'new readiness label is present in the multilingual catalog');
check(translations.includes('["This location cannot currently support the selected operation."'), 'blocked-location explanation is present in the multilingual catalog');
check(translations.includes('["Assembly completed and stock movements recorded."'), 'assembly-specific shared success feedback is multilingual');
check(translations.includes('["Disassembly completed and stock movements recorded."'), 'disassembly-specific shared success feedback is multilingual');

if (backendRoot) {
  check(backend.includes("stockService.adjustStock"), 'backend BOM execution still delegates all stock mutations to the authoritative stock service');
  check(backend.includes("reservation_shortfall_acknowledged: Boolean(body.reservation_shortfall_acknowledged)"), 'backend reservation-shortfall safeguard remains intact');
  check(backend.includes("BOM_SERIAL_MAPPING_REQUIRED"), 'backend serial-tracking execution safeguard remains intact');
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`BOM location-readiness surgical guard PASS (${checks}/${checks})`);
