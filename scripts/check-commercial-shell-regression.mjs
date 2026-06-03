#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const registry = read('src/app/navigationRegistry.ts');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/AppLayout.tsx');

const commercialRoutes = [
  {
    route: '/action-center',
    routerPath: 'action-center',
    page: 'src/pages/OperationalActionCenterPage.tsx',
    label: 'Action Center'
  },
  {
    route: '/workspace',
    routerPath: 'workspace',
    page: 'src/pages/RoleAwareWorkspacePage.tsx',
    label: 'Workspace'
  },
  {
    route: '/mobile-execution',
    routerPath: 'mobile-execution',
    page: 'src/pages/MobileExecutionPage.tsx',
    label: 'Mobile Execution'
  },
  {
    route: '/real-time-operations-feed',
    routerPath: 'real-time-operations-feed',
    page: 'src/pages/RealTimeOperationsFeedPage.tsx',
    label: 'Operations Feed'
  },
  {
    route: '/workflow-composer',
    routerPath: 'workflow-composer',
    page: 'src/pages/WorkflowAutomationComposerPage.tsx',
    label: 'Workflow Composer'
  },
  {
    route: '/ai-review',
    routerPath: 'ai-review',
    page: 'src/pages/HumanInLoopAIReviewPage.tsx',
    label: 'AI Review'
  },
  {
    route: '/collaboration',
    routerPath: 'collaboration',
    page: 'src/pages/EnterpriseCollaborationPage.tsx',
    label: 'Collaboration'
  },
  {
    route: '/digital-twin',
    routerPath: 'digital-twin',
    page: 'src/pages/DigitalTwinVisualizationPage.tsx',
    label: 'Digital Twin'
  },
  {
    route: '/reliability-command',
    routerPath: 'reliability-command',
    page: 'src/pages/ReliabilityCommandPage.tsx',
    label: 'Reliability Command'
  }
];

const requiredShellExports = [
  'tenantNavigationSections',
  'tenantModuleRegistry',
  'getTenantModuleForPathname',
  'getTenantPageMeta',
  'searchTenantModules'
];

const requiredLayoutSignals = [
  'tenantNavigationSections',
  'getTenantModuleForPathname',
  'getTenantPageMeta',
  'getTenantAccessSnapshot',
  'visibleNavSections'
];

const failures = [];

for (const exportName of requiredShellExports) {
  if (!registry.includes(exportName)) {
    failures.push(`navigationRegistry.ts is missing commercial shell export/signal: ${exportName}`);
  }
}

for (const signal of requiredLayoutSignals) {
  if (!layout.includes(signal)) {
    failures.push(`AppLayout.tsx is missing unified shell signal: ${signal}`);
  }
}

for (const item of commercialRoutes) {
  if (!registry.includes(`to: '${item.route}'`)) {
    failures.push(`navigationRegistry.ts is missing registry route ${item.route}`);
  }

  if (!registry.includes(`label: '${item.label}'`)) {
    failures.push(`navigationRegistry.ts is missing commercial label ${item.label}`);
  }

  if (!router.includes(`path: '${item.routerPath}'`)) {
    failures.push(`router.tsx is missing route path ${item.routerPath}`);
  }

  if (!existsSync(join(root, item.page))) {
    failures.push(`commercial page file is missing: ${item.page}`);
  }
}

if (!registry.includes("commercialSurface: 'command'")) {
  failures.push('navigationRegistry.ts is missing command commercial surface classification.');
}

if (!registry.includes('TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ')) {
  failures.push('navigationRegistry.ts is missing action-center permission gating.');
}

if (!registry.includes('TENANT_PERMISSIONS.PLATFORM_RELIABILITY_READ')) {
  failures.push('navigationRegistry.ts is missing reliability command permission gating.');
}

if (failures.length > 0) {
  console.error('Commercial frontend regression check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Commercial frontend regression check passed for ${commercialRoutes.length} command routes.`);
