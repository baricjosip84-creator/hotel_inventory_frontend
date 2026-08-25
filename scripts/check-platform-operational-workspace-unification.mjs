import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const pages = [
  'PlatformTenantContactsPage.tsx',
  'PlatformTenantNotesPage.tsx',
  'PlatformTenantCommunicationsPage.tsx',
  'PlatformTenantTasksPage.tsx',
  'PlatformTenantTimelinePage.tsx',
  'PlatformTenantHealthPage.tsx',
  'PlatformTenantLifecyclePage.tsx',
  'PlatformTenantSlaPage.tsx',
  'PlatformRunbooksPage.tsx',
  'PlatformChangeManagementPage.tsx',
  'PlatformApiKeysPage.tsx',
  'PlatformApiClientGovernancePage.tsx',
  'PlatformIntegrationMonitoringPage.tsx',
  'PlatformWebhooksPage.tsx',
  'PlatformVendorsPage.tsx',
  'PlatformServiceDependenciesPage.tsx',
  'PlatformRiskRegisterPage.tsx',
  'PlatformCapacityPlanningPage.tsx',
  'PlatformOperationalJobsPage.tsx',
  'PlatformReleasesPage.tsx',
  'PlatformAccessReviewsPage.tsx',
  'PlatformPermissionAuditPage.tsx',
  'PlatformComplianceDocumentsPage.tsx',
  'PlatformComplianceExportPage.tsx',
  'PlatformLegalComplianceReportingPage.tsx',
  'PlatformPrivacyRequestsPage.tsx',
  'PlatformTenantOffboardingPage.tsx',
  'PlatformProvisioningPage.tsx',
  'PlatformProvisioningPresetsPage.tsx',
  'PlatformTenantExportsPage.tsx',
  'PlatformDataRetentionPage.tsx',
  'PlatformIncidentsPage.tsx',
  'PlatformMaintenancePage.tsx',
  'PlatformAnnouncementsPage.tsx'
];

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const page of pages) {
  const file = `src/pages/${page}`;
  const source = read(file);
  assert(source.includes('io-operational-page io-workspace-page'), `${file} is missing the shared Operational Workspace root classes.`);
  assert(source.includes('OperationalWorkspaceHero'), `${file} is missing the shared Operational Workspace hero.`);
  assert(source.includes('OperationalWorkspaceStats'), `${file} is missing the shared Operational Workspace KPI strip.`);
}

const sharedCss = read('src/components/ui/OperationalWorkspace.css');
for (const token of [
  '.io-workspace-page {',
  '.io-workspace-page .io-workspace-panel',
  '.io-workspace-page .io-workspace-card',
  '.io-workspace-page .app-panel',
  '.io-workspace-section-header'
]) {
  assert(sharedCss.includes(token), `Shared Operational Workspace CSS is missing ${token}`);
}

if (failures.length) {
  console.error('Platform Operational Workspace unification check: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Platform Operational Workspace unification check: PASS');
console.log(`Validated ${pages.length} additional Platform pages on the shared Platform-red workspace contract.`);
