import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/ReplenishmentPlanningPage.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const backendRoot = path.resolve(root, process.env.BACKEND_ROOT || '../hotel-inventory-backend');
const backendService = fs.readFileSync(path.join(backendRoot, 'src/services/procurement/locationReplenishmentPlanningService.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let failed = false;
let passed = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
  else passed += 1;
};

check('Backend still marks source review only when source replenishment settings are not configured', backendService.includes('source_policy_configured: source.item.source_policy_configured !== false') && backendService.includes('source_review_required: source.item.source_review_required === true'));
check('Backend source policy still derives from configured location replenishment settings', backendService.includes('source_policy_configured: destinationConfigured') && backendService.includes('source_review_required: !destinationConfigured'));
check('Review-required transfer rows remain visibly labelled Review required', page.includes("row.evidence?.source_review_required ? (") && page.includes("{ui('Review required')}"));
check('Technical Source policy not configured wording is removed from Replenishment Planning', !page.includes("ui('Source policy not configured')"));
check('Missing policy now explains the actual business condition', page.includes("'Source location has no minimum/target stock settings'"));
check('Review-required fallback remains meaningful if evidence is incomplete or internally inconsistent', page.includes("'Review source stock settings before accepting'"));
check('Specific business guidance is selected only when source_policy_configured is explicitly false', page.includes('row.evidence?.source_policy_configured === false'));
check('Specific source-stock guidance is translated across all five tenant locales', translations.includes('["Source location has no minimum/target stock settings", "Für den Quelllagerort sind keine Mindest-/Zielbestände festgelegt", "La ubicación de origen no tiene existencias mínimas/objetivo configuradas", "Aucun stock minimum/cible n’est configuré pour l’emplacement source", "Izvorna lokacija nema postavljene minimalne/ciljane zalihe"]'));
check('Fallback source-stock review guidance is translated across all five tenant locales', translations.includes('["Review source stock settings before accepting", "Prüfen Sie die Bestandseinstellungen des Quelllagerorts vor der Annahme", "Revise la configuración de stock de la ubicación de origen antes de aceptar", "Vérifiez les paramètres de stock de l’emplacement source avant d’accepter", "Prije prihvaćanja provjerite postavke zalihe izvorne lokacije"]'));
check('No backend planning behavior is coupled to tenant-facing wording', !backendService.includes('Source policy not configured') && !backendService.includes('Source location has no minimum/target stock settings'));
check('Batch 061 frontend guard is registered', pkg.scripts?.['check:inventory-replenishment-source-stock-guidance-v349299'] === 'node scripts/check-replenishment-source-stock-guidance-surgical-fix-v349299.mjs');

console.log(`Replenishment source-stock guidance surgical fix: ${passed}/11 PASS`);
if (failed) process.exit(1);
