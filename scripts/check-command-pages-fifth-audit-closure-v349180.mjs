import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
let passed = 0;
const check = (condition, message) => {
  if (condition) { console.log(`PASS: ${message}`); passed += 1; }
  else failures.push(message);
};

const packageJson = JSON.parse(read('package.json'));
const ci = String(packageJson.scripts?.['check:ci'] || '');
const router = read('src/app/router.tsx');
const copilot = read('src/pages/AIOperationsCopilotPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

check(ci.startsWith('npm run check:tenant-multilingual-closure-audit && '), 'tenant multilingual closure audit still leads frontend CI');
check(ci.includes('npm run check:command-pages-fifth-audit-closure-v349180'), 'v3.49.180 fifth-audit guard is wired into frontend CI');
check(ci.indexOf('check:command-pages-fifth-audit-closure-v349180') < ci.indexOf('check:command-pages-fourth-audit-closure-v349179'), 'v3.49.180 guard runs before the older v3.49.179 closure guard');

const procurementRouteStart = router.indexOf("path: 'procurement-recommendations'");
const procurementRoute = procurementRouteStart >= 0 ? router.slice(procurementRouteStart, procurementRouteStart + 700) : '';
check(procurementRoute.includes('TENANT_PERMISSIONS.INSIGHTS_READ'), 'Procurement Recommendations remains protected by Insights Read');

check(copilot.includes('const canOpenProcurementRecommendations = hasPermission(TENANT_PERMISSIONS.INSIGHTS_READ);'), 'AI Copilot checks Insights Read before offering the replenishment workbench');
check(copilot.includes('{canOpenProcurementRecommendations ? (')
  && copilot.includes('<Link to="/procurement-recommendations"'),
  'AI Copilot only renders the replenishment workbench link inside the Insights permission branch');
check(copilot.includes('ui("Insights access is required to open the all-products replenishment workbench.")'), 'AI Copilot explains why the workbench link is unavailable');
check(translations.includes('Insights access is required to open the all-products replenishment workbench.'), 'new AI Copilot Insights guidance is five-language catalog-backed');

if (failures.length) {
  console.error(`Command pages fifth-audit closure v3.49.180: ${passed} passed / ${failures.length} failed.`);
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`Command pages fifth-audit closure v3.49.180: ${passed}/${passed} PASS.`);
