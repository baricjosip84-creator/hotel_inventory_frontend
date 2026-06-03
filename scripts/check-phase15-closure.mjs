#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const registry = read('src/app/navigationRegistry.ts');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/AppLayout.tsx');
const tenantAccess = read('src/lib/tenantAccess.ts');
const routeQueryState = read('src/lib/useRouteQueryState.ts');
const shellCheck = read('scripts/check-commercial-shell-regression.mjs');
const closure = read('src/app/commercialFrontendClosure.ts');
const packageJson = read('package.json');

const failures = [];

const phase15CommandSurfaces = [
  ['/action-center', 'action-center', 'OperationalActionCenterPage.tsx', 'Action Center'],
  ['/workspace', 'workspace', 'RoleAwareWorkspacePage.tsx', 'Workspace'],
  ['/mobile-execution', 'mobile-execution', 'MobileExecutionPage.tsx', 'Mobile Execution'],
  ['/real-time-operations-feed', 'real-time-operations-feed', 'RealTimeOperationsFeedPage.tsx', 'Operations Feed'],
  ['/workflow-composer', 'workflow-composer', 'WorkflowAutomationComposerPage.tsx', 'Workflow Composer'],
  ['/ai-review', 'ai-review', 'HumanInLoopAIReviewPage.tsx', 'AI Review'],
  ['/collaboration', 'collaboration', 'EnterpriseCollaborationPage.tsx', 'Collaboration'],
  ['/digital-twin', 'digital-twin', 'DigitalTwinVisualizationPage.tsx', 'Digital Twin'],
  ['/reliability-command', 'reliability-command', 'ReliabilityCommandPage.tsx', 'Reliability Command']
];

for (const [route, routerPath, page, label] of phase15CommandSurfaces) {
  if (!registry.includes(`to: '${route}'`)) {
    failures.push(`registry missing Phase 15 command route ${route}`);
  }

  if (!registry.includes(`label: '${label}'`)) {
    failures.push(`registry missing Phase 15 command label ${label}`);
  }

  if (!router.includes(`path: '${routerPath}'`)) {
    failures.push(`router missing Phase 15 route path ${routerPath}`);
  }

  if (!existsSync(join(root, 'src/pages', page))) {
    failures.push(`page missing for Phase 15 route: src/pages/${page}`);
  }
}

const requiredRegistrySignals = [
  'tenantNavigationSections',
  'tenantNavigationItems',
  'tenantModuleRegistry',
  'tenantPrimaryModules',
  'getTenantModuleForPathname',
  'getTenantModulesByGroup',
  'searchTenantModules',
  'getTenantPageMeta',
  "commercialSurface: 'command'",
  "priority: 'primary'",
  'searchTerms:'
];

for (const signal of requiredRegistrySignals) {
  if (!registry.includes(signal)) {
    failures.push(`navigation registry missing closure signal: ${signal}`);
  }
}

const requiredLayoutSignals = [
  'tenantNavigationSections',
  'visibleNavSections',
  'getTenantModuleForPathname',
  'getTenantPageMeta',
  'getTenantAccessSnapshot',
  'moduleMetaRow',
  'Permission-aware workspace',
  'Tenant access'
];

for (const signal of requiredLayoutSignals) {
  if (!layout.includes(signal)) {
    failures.push(`AppLayout missing closure shell signal: ${signal}`);
  }
}

const requiredTenantAccessSignals = [
  'permittedModules',
  'hiddenModules',
  'permittedModuleCount',
  'hiddenModuleCount',
  'hasTenantContext',
  'canAccessModule'
];

for (const signal of requiredTenantAccessSignals) {
  if (!tenantAccess.includes(signal)) {
    failures.push(`tenant access snapshot missing signal: ${signal}`);
  }
}

const requiredStateSignals = ['useRouteQueryState', 'URLSearchParams', 'setSearchParams'];
for (const signal of requiredStateSignals) {
  if (!routeQueryState.includes(signal)) {
    failures.push(`route query state normalization missing signal: ${signal}`);
  }
}

const requiredClosureSignals = [
  'commercialFrontendClosureGuardrails',
  'commercialFrontendClosureSummary',
  'getCommercialFrontendClosureSummary',
  "phase: 'Phase 15'",
  "status: 'closed'",
  'Unified Commercial Frontend',
  'regression-checks'
];

for (const signal of requiredClosureSignals) {
  if (!closure.includes(signal)) {
    failures.push(`commercial frontend closure module missing signal: ${signal}`);
  }
}

if (!shellCheck.includes('Commercial frontend regression check passed')) {
  failures.push('commercial shell regression script missing pass output.');
}

if (!packageJson.includes('check:commercial-shell')) {
  failures.push('package.json missing commercial shell check script.');
}

if (!packageJson.includes('check:phase15-closure')) {
  failures.push('package.json missing Phase 15 closure check script.');
}

if (failures.length > 0) {
  console.error('Phase 15 commercial frontend closure check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Phase 15 commercial frontend closure check passed for ${phase15CommandSurfaces.length} command surfaces.`);
