import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const catalogSource = read('src/i18n/tenantUiTranslations.ts');
const catalogRows = [];
for (const line of catalogSource.split(/\r?\n/)) {
  const match = line.match(/^\s*\[("(?:\\.|[^"\\])*")\s*,\s*("(?:\\.|[^"\\])*")\s*,\s*("(?:\\.|[^"\\])*")\s*,\s*("(?:\\.|[^"\\])*")\s*,\s*("(?:\\.|[^"\\])*")\],?\s*$/);
  if (!match) continue;
  try { catalogRows.push(match.slice(1).map((value) => JSON.parse(value))); } catch { failures.push(`catalog row could not be parsed: ${line.slice(0, 120)}`); }
}
const catalogKeys = new Set(catalogRows.map((row) => row[0]));
assert(catalogRows.length === catalogKeys.size, `catalog keys must be unique (${catalogRows.length} rows / ${catalogKeys.size} unique)`);
const placeholders = (value) => [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort().join('|');
for (const row of catalogRows) {
  assert(row.length === 5 && row.every((value) => typeof value === 'string' && value.length > 0), `catalog row is incomplete: ${row[0]}`);
  const expected = placeholders(row[0]);
  for (let index = 1; index < 5; index += 1) assert(placeholders(row[index]) === expected, `placeholder mismatch for ${row[0]} locale column ${index + 1}`);
}

const routerSource = read('src/app/router.tsx');
const prePlatformImports = routerSource.split("import { PlatformProtectedRoute }")[0];
const startFiles = [];
for (const match of prePlatformImports.matchAll(/import\s+(?:\{[^}]+\}|[^;]+?)\s+from\s+'(\.\.\/[^']+)'/g)) {
  const specifier = match[1];
  const base = path.resolve(root, 'src/app', specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  const resolved = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (resolved) startFiles.push(path.relative(root, resolved).replaceAll('\\', '/'));
}
startFiles.push('src/app/AppProviders.tsx', 'src/layouts/AppLayout.tsx', 'src/pages/LoginPage.tsx', 'src/components/ProtectedRoute.tsx');

const navSource = read('src/app/navigationRegistry.ts');
const tenantRoutes = [...navSource.matchAll(/\bto:\s*'([^']+)'/g)].map((match) => match[1]);
assert(new Set(tenantRoutes).size === 45, `expected 45 tenant navigation routes, found ${new Set(tenantRoutes).size}`);

function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(path.join(root, fromFile)), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return path.relative(root, candidate).replaceAll('\\', '/');
  }
  return null;
}

const graph = new Set();
const queue = [...new Set(startFiles)];
while (queue.length) {
  const relative = queue.shift();
  if (!relative || graph.has(relative) || !fs.existsSync(path.join(root, relative))) continue;
  graph.add(relative);
  const source = read(relative);
  const sourceFile = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, relative.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const resolved = resolveRelativeImport(relative, statement.moduleSpecifier.text);
    if (resolved && !resolved.includes('/Platform')) queue.push(resolved);
  }
}
assert(graph.size >= 250, `reachable tenant source graph unexpectedly small: ${graph.size} files`);

const allowedRawJsx = new Set([
  '/api/public/v1',
  'Josip Barić.',
  'Inventory Operations',
  'INVENTORY OPERATIONS PLATFORM',
  'SKU',
  'SHA-256'
]);
const humanText = /[A-Za-zÀ-ž]{2,}/;
const rawJsx = [];
const rawPresentationAttrs = [];
const technicalPlaceholder = (value) => {
  const text = value.trim();
  return (
    /^https?:\/\//i.test(text) ||
    text.startsWith('{') ||
    /^[+-]?\d+(?:\.\d+)?(?:\s+to\s+[+-]?\d+(?:\.\d+)?)?$/i.test(text) ||
    /^[A-Z0-9_-]+$/.test(text) ||
    text.includes('_') || text.includes('/') || text.includes(',') ||
    /^[a-z0-9.-]+(?:-[a-z0-9.-]+)+$/i.test(text)
  );
};

for (const relative of [...graph].filter((file) => file.endsWith('.tsx'))) {
  const sourceFile = ts.createSourceFile(relative, read(relative), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const line = (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile).replace(/\s+/g, ' ').trim();
      if (text && humanText.test(text) && !allowedRawJsx.has(text)) rawJsx.push(`${relative}:${line(node)} ${text}`);
    }
    if (ts.isJsxAttribute(node) && ['title', 'aria-label', 'aria-description', 'alt', 'placeholder'].includes(node.name.text)) {
      if (node.initializer && ts.isStringLiteral(node.initializer) && humanText.test(node.initializer.text)) {
        if (node.name.text !== 'placeholder' || !technicalPlaceholder(node.initializer.text)) {
          rawPresentationAttrs.push(`${relative}:${line(node)} ${node.name.text}=${JSON.stringify(node.initializer.text)}`);
        }
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'ui' && node.arguments.length && ts.isStringLiteralLike(node.arguments[0])) {
      const key = node.arguments[0].text;
      if (!catalogKeys.has(key)) failures.push(`${relative}:${line(node)} ui() key missing from catalog: ${key}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}
assert(rawJsx.length === 0, `raw frontend-owned JSX remains:\n${rawJsx.join('\n')}`);
assert(rawPresentationAttrs.length === 0, `raw human presentation attributes remain:\n${rawPresentationAttrs.join('\n')}`);

const closureFiles = {
  alerts: read('src/pages/AlertsPage.tsx'),
  schedules: read('src/pages/AutomationSchedulesPage.tsx'),
  requests: read('src/pages/ExecutionRequestsPage.tsx'),
  procurement: read('src/pages/ProcurementRecommendationsPage.tsx'),
  copilot: read('src/pages/AIOperationsCopilotPage.tsx'),
  adaptive: read('src/pages/AdaptivePolicyEnginePage.tsx'),
  audit: read('src/pages/TenantAuditPage.tsx'),
  settings: read('src/pages/TenantSettingsPage.tsx'),
  requisitions: read('src/pages/InventoryRequisitionsPage.tsx'),
  reliability: read('src/pages/ReliabilityCommandPage.tsx'),
  purchaseOrders: read('src/pages/PurchaseOrdersPage.tsx'),
  transfers: read('src/pages/StockTransfersPage.tsx'),
  outbound: read('src/pages/OutboundPage.tsx'),
  appProviders: read('src/app/AppProviders.tsx'),
  api: read('src/lib/api.ts'),
  actionFeedback: read('src/lib/actionFeedback.ts'),
  systemContextChecker: read('scripts/check-tenant-system-context-multilingual.mjs'),
  frontendValidationWorkflow: read('.github/workflows/frontend-validation.yml')
};

assert(closureFiles.alerts.includes("ui('Use this only for a real operational issue"), 'manual-alert guidance must be catalog-backed');
assert(closureFiles.schedules.includes("{ui('Showing')}"), 'Automation Schedules pagination prefix must be translated');
assert(closureFiles.requests.includes("ui('Submit for review')") && closureFiles.requests.includes("ui('Execute approved change')"), 'Execution Request action labels must be translated');
assert(!/value="(?:7|14|30|60)">≤ \d+ days</.test(closureFiles.procurement), 'Procurement shortage-window options must not contain raw English day labels');
assert(closureFiles.procurement.includes("ui('≤ {count} days')"), 'Procurement shortage-window options must use one placeholder-safe translation key');
assert(closureFiles.procurement.includes('return ui("Unable to load procurement recommendations.");'), 'Procurement frontend fallback error must be translated');
assert(closureFiles.procurement.includes('return blockerText ? `${error.message}: ${blockerText}` : error.message;'), 'Procurement server error/blocker prose must remain raw');
assert(closureFiles.copilot.includes("return ui('Unknown request failure.');") && closureFiles.copilot.includes('return error.message;'), 'AI Copilot must translate only its frontend fallback, not server errors');
assert(closureFiles.audit.includes("return ui('Unknown error');") && closureFiles.settings.includes("return ui('Unknown error');"), 'Tenant Audit/Settings frontend unknown-error fallbacks must be translated');
assert(closureFiles.requisitions.includes("ui(activityLabel(entry.action))"), 'Requisition canonical activity display must pass through tenant UI translation');
assert(closureFiles.transfers.includes("return getVersionConflictMessage(error, ui);"), 'Stock Transfers version-conflict frontend message must be translated');
assert(closureFiles.purchaseOrders.includes("return getVersionConflictMessage(error, ui);"), 'Purchase Orders version-conflict frontend message must be translated');
assert(closureFiles.outbound.includes('getVersionConflictMessage(mutationError, ui)'), 'Outbound version-conflict frontend message must be translated');
assert(closureFiles.api.includes('return { message: error.message, translateMessage: false };'), 'raw API/server errors must be explicitly excluded from tenant feedback translation');
assert(closureFiles.api.includes("translateMessage: true") && closureFiles.api.includes("tenantMutationSuccessMessage"), 'frontend-owned API mutation feedback must be marked translatable');
assert(closureFiles.actionFeedback.includes('translateMessage?: boolean'), 'action feedback contract must preserve translatability metadata');
assert(closureFiles.appProviders.includes('canonicalTenantUiText(locale, label)'), 'global action safety must classify canonical labels instead of translated visible labels');
assert(closureFiles.appProviders.includes("item.surface === 'tenant'"), 'toast rendering must distinguish tenant from Platform feedback');
assert(closureFiles.appProviders.includes('translateTenantFeedbackMessage(ui, item.message)'), 'tenant API feedback must translate only explicitly frontend-owned messages');
assert(closureFiles.appProviders.includes("aria-label={tenant ? ui('Dismiss message') : 'Dismiss platform message'}"), 'tenant toast accessibility label must be translated without converting Platform presentation');
assert(closureFiles.systemContextChecker.includes('process.env.BACKEND_ROOT') && closureFiles.systemContextChecker.includes('backend contract validation deferred to the cross-repository CI job'), 'System Context checker must honor BACKEND_ROOT and remain frontend-only-CI compatible');
assert(closureFiles.frontendValidationWorkflow.includes('BACKEND_ROOT: ${{ github.workspace }}/backend') && closureFiles.frontendValidationWorkflow.includes('npm run check:tenant-system-context-multilingual'), 'cross-repository CI must enforce the System Context backend contract with BACKEND_ROOT configured');

const requiredFeedbackKeys = new Set([
  'Action failed', 'Action failed.', 'Request ID', 'Dismiss message', 'Confirm action: {label}?', '{label} submitted.',
  '{label} created successfully.', '{label} deleted successfully.', '{label} saved successfully.',
  'This record was modified by another operation. Refresh the page data and retry your changes.'
]);
const localFeedbackSection = closureFiles.appProviders.slice(closureFiles.appProviders.indexOf('function getLocalActionFeedbackMessage'), closureFiles.appProviders.indexOf('function findClickedActionElement'));
for (const match of localFeedbackSection.matchAll(/return '([^']+)'/g)) requiredFeedbackKeys.add(match[1]);
const successSection = closureFiles.api.slice(closureFiles.api.indexOf('function barcodeLabelCreatedMessage'), closureFiles.api.indexOf('function dispatchTenantMutationFeedback'));
for (const match of successSection.matchAll(/return '([^']+)'/g)) requiredFeedbackKeys.add(match[1]);
for (const match of successSection.matchAll(/message: '([^']+)'/g)) requiredFeedbackKeys.add(match[1]);
for (const key of requiredFeedbackKeys) assert(catalogKeys.has(key), `shared tenant feedback key missing from catalog: ${key}`);

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.scripts['check:tenant-multilingual-closure-audit'] === 'node scripts/check-tenant-multilingual-closure-audit.mjs', 'closure checker must be wired in package.json');
assert(packageJson.scripts['check:ci']?.startsWith('npm run check:tenant-multilingual-closure-audit && '), 'closure checker must lead guarded CI');

if (failures.length) {
  console.error('Tenant multilingual closure audit: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Tenant multilingual closure audit: PASS (${tenantRoutes.length}/45 tenant routes, ${graph.size} reachable source files, ${catalogRows.length} unique five-language catalog rows, placeholder parity and shared feedback/action-safety boundaries verified).`);
