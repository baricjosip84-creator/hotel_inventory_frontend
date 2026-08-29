import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/AIOperationsCopilotPage.tsx');
const routerSource = read('src/app/router.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "const { locale, ui } = useAppTranslation();"
]) {
  if (!pageSource.includes(required)) fail(`Copilot multilingual runtime wiring missing: ${required}`);
}
if (!process.exitCode) pass('AI Operations Copilot uses the shared tenant translation and locale-formatting runtime.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of pageSource.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Copilot ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`AI Operations Copilot has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamicPresentationKeys = [
  'Operational priority summary',
  'Product risk explanation',
  'Product replenishment plan',
  'Supplier performance summary',
  'Prepare minimum-stock proposal',
  'Prepare standard-cost proposal',
  'Built-in rules — no AI model',
  'Built-in rules — external AI unavailable',
  'External AI model',
  'Can read only the current tenant’s permitted data',
  'Cannot choose database queries',
  'Cannot call tools',
  'Cannot open arbitrary application endpoints',
  'Cannot directly change operational data',
  'Cannot act without a person',
  'Result structure is checked by the server',
  'Proposals require Intelligence Review',
  'Execution Requests remain human approved',
  'completed', 'failed', 'pending',
  'calculated', 'limited history', 'no outbound history',
  'increase', 'decrease', 'keep current',
  'product min stock update', 'cost standard update',
  'product', 'supplier performance', 'evidence'
];
const missingDynamic = dynamicPresentationKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Copilot dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicPresentationKeys.length} canonical Copilot display values are catalog-backed.`);

const requiredPresentation = [
  'eyebrow={ui("Governed tenant intelligence")}',
  'title={ui("AI Copilot")}',
  'ariaLabel={ui("AI Copilot overview")}',
  '<Panel title={ui("Start a new analysis")}',
  'ui("Analysis type")',
  'ui("Deterministic threshold recommendation")',
  'ui("Separate replenishment plan")',
  'title={ui("Selected result")}',
  'ui("Highlights")',
  'ui("Evidence references")',
  'ui("Structured proposal")',
  '<Panel title={ui("Run history")}',
  '<Panel title={ui("What the Copilot is not allowed to do")}',
  'ui(safetyLabels[key] || formatLabel(key))'
];
for (const value of requiredPresentation) if (!pageSource.includes(value)) fail(`Localized Copilot presentation missing: ${value}`);
if (!process.exitCode) pass('Copilot hero, analysis form, recommendation, result, history, and safety presentation use the multilingual contract.');

const rawText = pageSource.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/>\s*([A-Za-z][^<>{}]*)\s*</);
  return match ? [match[1].trim()] : [];
}).filter(Boolean);
if (rawText.length) fail(`Raw JSX presentation remains in AI Operations Copilot: ${rawText.join(' | ')}`);
else pass('AI Operations Copilot has no remaining raw JSX presentation text.');

const backendDataBoundaries = [
  'selectedIntentCapability?.description || ui(intentFallbacks[intent].description)',
  'capabilitiesQuery.data?.intents ? item.label : ui(item.label)',
  'capabilitiesQuery.data.run_unavailable_reason',
  'minimumStockRecommendation.formula',
  'minimumStockRecommendation.assumptions.map((item) => <li key={item}>{item}</li>)',
  'minimumStockRecommendation.warnings.map((item) => <li key={item}><strong>{ui("Warning:")}</strong> {item}</li>)',
  'minimumStockRecommendation.confidence_meaning',
  'minimumStockRecommendation.replenishment_plan.formula',
  'response.answer || ui(',
  '(response.highlights || []).map((item, index) => <li',
  '<strong>{item.label}</strong>',
  "proposal.title || ui('Governed proposal')",
  'proposal.payload?.product_name',
  'proposal.payload.override_reason',
  'run.user_prompt',
  'selectedRun.error_message || selectedRun.error_code'
];
for (const value of backendDataBoundaries) if (!pageSource.includes(value)) fail(`Expected Copilot backend/business-data boundary missing: ${value}`);
for (const forbidden of [
  'ui(selectedIntentCapability?.description)',
  'ui(capabilitiesQuery.data.run_unavailable_reason)',
  'ui(minimumStockRecommendation.formula)',
  'ui(minimumStockRecommendation.confidence_meaning)',
  'ui(response.answer)',
  'ui(proposal.title)',
  'ui(run.user_prompt)',
  'ui(selectedRun.error_message)'
]) if (pageSource.includes(forbidden)) fail(`Backend/business human text must remain raw: ${forbidden}`);
if (!process.exitCode) pass('Backend-generated guidance, formulas, results, evidence labels, proposal titles, prompts, and API errors remain raw data.');

for (const required of [
  'formatLocalizedCurrency(amount, getActiveTenantCurrency(), locale',
  'formatLocalizedDateTime(parsed, locale)',
  "formatLocalizedNumber(value, locale, { style: 'percent'",
  'formatLocalizedNumber(capabilitiesQuery.data.run_limits.user_runs_used, locale)',
  'formatLocalizedNumber(runRows.length, locale)'
]) if (!pageSource.includes(required)) fail(`Locale-aware Copilot formatting missing: ${required}`);
if (!process.exitCode) pass('Copilot currency, dates, percentages, counts, and run usage use the selected locale.');

for (const required of [
  "path: 'ai-copilot'",
  'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ',
  '<AIOperationsCopilotPage />'
]) if (!routerSource.includes(required)) fail(`AI Copilot router/permission contract changed: ${required}`);
if (!process.exitCode) pass('AI Copilot route and DECISION_INTELLIGENCE_READ permission contract remain unchanged.');

for (const required of [
  "return apiRequest<CopilotRun>('/ai-operations-copilot/runs', {",
  "method: 'POST'",
  "return apiRequest<ProductItem[]>('/products?limit=100');"
]) if (!pageSource.includes(required)) fail(`Expected existing Copilot request contract missing: ${required}`);
for (const forbidden of [
  "apiRequest('/products/",
  "apiRequest('/stock/",
  "apiRequest('/shipments/",
  "method: 'PATCH'",
  "method: 'DELETE'",
  "method: 'PUT'"
]) if (pageSource.includes(forbidden)) fail(`Copilot multilingual pass must not introduce direct operational mutation: ${forbidden}`);
if (!process.exitCode) pass('Existing governed Copilot run creation is preserved without direct product/stock/shipment mutation.');

if (!process.exitCode) pass('Tenant AI Operations Copilot multilingual gate passed.');
