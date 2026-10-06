import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const mobile = read('src/pages/MobileExecutionPage.tsx');
const operationsFeed = read('src/pages/RealTimeOperationsFeedPage.tsx');
const workflowComposer = read('src/pages/WorkflowAutomationComposerPage.tsx');
const forecasting = read('src/pages/ProbabilisticForecastingPage.tsx');
const crossDomain = read('src/pages/CrossDomainOptimizationPage.tsx');
const replenishment = read('src/pages/ReplenishmentPlanningPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

const backendRoot = process.env.BACKEND_ROOT || process.argv[2] || '';
const backendServicePath = backendRoot ? path.join(backendRoot, 'src/services/procurement/locationReplenishmentPlanningService.js') : '';
const backendValidationPath = backendRoot ? path.join(backendRoot, 'src/validations/locationReplenishmentPlanning.validation.js') : '';
const forecastBackendPath = backendRoot ? path.join(backendRoot, 'src/services/decisionIntelligence/probabilisticForecastingService.js') : '';
const backendAvailable = Boolean(backendRoot && fs.existsSync(backendServicePath) && fs.existsSync(backendValidationPath) && fs.existsSync(forecastBackendPath));
const replenishmentBackend = backendAvailable ? fs.readFileSync(backendServicePath, 'utf8') : '';
const replenishmentValidation = backendAvailable ? fs.readFileSync(backendValidationPath, 'utf8') : '';
const forecastBackend = backendAvailable ? fs.readFileSync(forecastBackendPath, 'utf8') : '';

const checks = [
  ['Mobile Execution reads responsibility/filter/page state from the URL', mobile.includes("searchParams.get('scope')") && mobile.includes("searchParams.get('urgency')") && mobile.includes("searchParams.get('source')") && mobile.includes("searchParams.get('page')")],
  ['Mobile Execution writes responsibility/filter state back to the URL', mobile.includes("updateQueueContext('scope'") && mobile.includes("updateQueueContext('urgency'") && mobile.includes("updateQueueContext('source'") && mobile.includes('updateQueuePage(page + 1)')],
  ['Operations Feed freshness text uses the successful query refresh time', operationsFeed.includes('feedQuery.dataUpdatedAt') && operationsFeed.includes('new Date(feedQuery.dataUpdatedAt).toISOString()')],
  ['Workflow Composer removes the assign-owner step once responsibility already exists', workflowComposer.includes('responsibilityAlreadyAssigned') && workflowComposer.includes("step === 'assign_human_owner' && responsibilityAlreadyAssigned(blueprint)")],
  ['Probabilistic Forecasting has specific monitoring blocker labels', forecasting.includes('forecast_monitoring_sla_blocked_by_confidence_drift') && forecasting.includes('Monitoring review blocked by unresolved confidence-drift blockers')],
  ['Cross-Domain replenishment handoff carries durable source par-level context', crossDomain.includes("source_par_level_id: item.plan_type === 'replenishment_optimization'") && crossDomain.includes("params.set('source_optimization_plan_id'") && crossDomain.includes('source_par_level_id: sourceParLevelId')],
  ['Replenishment Planning consumes the source par-level handoff', replenishment.includes("searchParams.get('source_par_level_id')") && replenishment.includes("listRuns(sourceParLevelId)") && replenishment.includes('No saved planning run matches this source decision.')],
  ['Replenishment Planning focuses and labels the exact matching product/location line', replenishment.includes('data-replenishment-handoff-match') && replenishment.includes("document.querySelector<HTMLElement>('[data-replenishment-handoff-match=\"true\"]')") && replenishment.includes("ui('Source decision match')")],
  ['New tenant-facing handoff and monitoring text is catalog-backed', translations.includes('Monitoring review blocked by unresolved confidence-drift blockers') && translations.includes('No saved planning run matches this source decision.') && translations.includes('Source decision match')],
];

if (backendAvailable) {
  checks.push(
    ['Backend run-list validation accepts source_par_level_id', replenishmentValidation.includes('source_par_level_id: uuid.optional()')],
    ['Backend run-list query resolves a par level to matching purchase/transfer scope', replenishmentBackend.includes('JOIN inventory_par_levels handoff_scope') && replenishmentBackend.includes('handoff_item.product_id = handoff_scope.product_id') && replenishmentBackend.includes('handoff_transfer.destination_storage_location_id = handoff_scope.storage_location_id')],
    ['Backend monitoring SLA decision names confidence drift instead of claiming missing scope/outcomes', forecastBackend.includes("'forecast_monitoring_sla_blocked_by_confidence_drift'") && forecastBackend.includes('missingScopeOrOutcomeEvidence') && forecastBackend.includes('driftBlockerCount > 0')]
  );
} else {
  console.log('INFO backend contract checks deferred because BACKEND_ROOT was not provided.');
}

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nPASS ${checks.length}/${checks.length} surgical regression checks.`);
