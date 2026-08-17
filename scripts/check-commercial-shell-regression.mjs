#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const registry = read('src/app/navigationRegistry.ts');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/AppLayout.tsx');
const intelligenceReviewPage = read('src/pages/HumanInLoopAIReviewPage.tsx');
const collaborationPage = read('src/pages/EnterpriseCollaborationPage.tsx');
const digitalTwinPage = read('src/pages/DigitalTwinVisualizationPage.tsx');
const reliabilityCommandPage = read('src/pages/ReliabilityCommandPage.tsx');
const alertsPage = read('src/pages/AlertsPage.tsx');

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
    route: '/intelligence-review',
    routerPath: 'intelligence-review',
    page: 'src/pages/HumanInLoopAIReviewPage.tsx',
    label: 'Intelligence Review'
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


if (!router.includes("path: 'ai-review'") || !router.includes('LegacyAIReviewRedirect')) {
  failures.push('router.tsx must keep the legacy /ai-review redirect for old bookmarks and deep links.');
}

for (const signal of [
  'Recommendation reviews',
  'Readiness &amp; governance',
  'Not every item on this page was produced by an AI model',
  'How this result was produced',
  "activeView === 'recommendations'",
  "activeView === 'readiness'"
]) {
  if (!intelligenceReviewPage.includes(signal)) {
    failures.push(`Intelligence Review page is missing clarity/split-view signal: ${signal}`);
  }
}

for (const signal of [
  "import { TenantNavIcon } from '../components/ui/TenantNavIcon';",
  "import './EnterpriseCollaborationPage.css';",
  "type CollaborationView = 'recommendations' | 'limits'",
  'data-collaboration-refined="true"',
  'Coordination recommendations',
  'Safety and limits'
]) {
  if (!collaborationPage.includes(signal)) {
    failures.push(`Collaboration page is missing approved tenant presentation signal: ${signal}`);
  }
}

for (const forbiddenSignal of [
  'TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ',
  'canViewDiagnostics',
  "view === 'diagnostics'",
  'Technical response diagnostics',
  'JSON.stringify(response, null, 2)'
]) {
  if (collaborationPage.includes(forbiddenSignal)) {
    failures.push(`Collaboration page must keep technical diagnostics out of the normal tenant-owner interface: ${forbiddenSignal}`);
  }
}

for (const signal of [
  "import { TenantNavIcon } from '../components/ui/TenantNavIcon';",
  "import './DigitalTwinVisualizationPage.css';",
  "type DigitalTwinView = 'context' | 'limits'",
  'data-digital-twin-refined="true"',
  'Operational context',
  'Safety and limits'
]) {
  if (!digitalTwinPage.includes(signal)) {
    failures.push(`Digital Twin page is missing approved tenant presentation signal: ${signal}`);
  }
}

for (const forbiddenSignal of [
  'TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ',
  'canViewDiagnostics',
  "view === 'diagnostics'",
  'Technical response diagnostics',
  'JSON.stringify(response, null, 2)'
]) {
  if (digitalTwinPage.includes(forbiddenSignal)) {
    failures.push(`Digital Twin page must keep technical diagnostics out of the normal tenant-owner interface: ${forbiddenSignal}`);
  }
}

for (const signal of [
  "import { TenantNavIcon } from '../components/ui/TenantNavIcon';",
  "import './ReliabilityCommandPage.css';",
  "type ReliabilityView = 'posture' | 'review-path' | 'limits'",
  'data-reliability-refined="true"',
  'Posture and risks',
  'Manual review path',
  'Safety and limits'
]) {
  if (!reliabilityCommandPage.includes(signal)) {
    failures.push(`Reliability Command page is missing approved tenant presentation signal: ${signal}`);
  }
}

for (const forbiddenSignal of [
  'TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ',
  'canViewDiagnostics',
  "view === 'diagnostics'",
  'Technical response diagnostics',
  'JSON.stringify(response.diagnostics, null, 2)'
]) {
  if (reliabilityCommandPage.includes(forbiddenSignal)) {
    failures.push(`Reliability Command page must keep technical diagnostics out of the normal tenant-owner interface: ${forbiddenSignal}`);
  }
}

for (const signal of [
  "import { TenantNavIcon } from '../components/ui/TenantNavIcon';",
  "import './AlertsPage.css';",
  'data-alerts-refined="true"',
  'Operational alert control',
  'Alert queue'
]) {
  if (!alertsPage.includes(signal)) {
    failures.push(`Alerts page is missing approved tenant presentation signal: ${signal}`);
  }
}

for (const signal of [
  "queryKey: ['alerts', 'navigation-open-indicator'",
  "'/alerts?resolved=false&limit=1'",
  'hasOpenAlerts',
  'alertIndicatorDot',
  "width: '280px', minWidth: '280px'",
  "whiteSpace: 'normal'",
  "marginLeft: 'auto'",
  'Open alerts require attention'
]) {
  if (!layout.includes(signal)) {
    failures.push(`AppLayout.tsx is missing the open-alert navigation indicator signal: ${signal}`);
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
