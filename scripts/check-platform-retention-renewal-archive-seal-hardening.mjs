import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchRetentionRenewalArchiveSealPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchRetentionRenewalArchiveSealPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero','OperationalWorkspaceStats','OperationalSectionHeader',
  'Retention renewal archive-seal preparation only','External retention-renewal archive-seal boundary',
  'cannot observe or persist the real external retention-renewal final-seal outcome',
  'Retention renewal final seal persistence','Retention renewal certification persistence','Retention renewal acceptance persistence','Retention renewal review persistence',
  'Evidence retention seal persistence','Final evidence archive persistence','Durable-closure certification persistence',
  'Resolution-verification persistence','Recurrence-resolution persistence','Recurrence-audit persistence','Exception-closure persistence','Exception-review persistence',
  'Operations cadence persistence','Steady-state transition persistence','Additional-growth observation persistence','Additional-growth authorization persistence','Expansion-health observation persistence','Retention renewal archive seal persistence',
  'Source Retention Renewal Final Seal row','Source Retention Renewal Certification row','Source Retention Renewal Acceptance row','Source Retention Renewal Review row','Source Evidence Retention Seal row','Source Final Evidence Archive row','Source Durable Closure Certification row','Source Resolution Verification row','Source recurrence resolution row','Source recurrence audit row','Source exception closure row','Source exception review row',
  'Source Operations Cadence statuses','Source Steady-state Transition row references','Source Additional Growth Observation row references','Source Additional Growth Authorization row references',
  'Severity is a template hint; not an observed external archive-seal severity.',
  'Archive-seal status is preparation metadata only; not an observed external final-seal or archive-seal outcome.',
  'Required external retention-renewal final-seal evidence','Required external retention-renewal archive-seal evidence','Retention renewal archive seal controls',
  'No retention-renewal archive-seal rows were produced.','This is not evidence that retention-renewal final seal or archive seal occurred externally.',
  'initialLoadError','refreshError','Showing the last successful Commercial Launch Retention Renewal Archive Seal snapshot.','Retry refresh','refetchOnWindowFocus: false','staleTime: 30_000',
  'retention_renewal_archive_seal_records_persisted_in_application',
  'permission: PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ','permission: PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ','hasPlatformPermission(link.permission)',
  '/platform/customer-success-admin','/platform/production-monitoring-readiness','/platform/support-operations-cockpit','/platform/service-dependencies'
];
for (const anchor of requiredPageAnchors) if (!page.includes(anchor)) throw new Error(`Platform Retention Renewal Archive Seal check failed: missing page anchor: ${anchor}`);

for (const staleAnchor of ['style={styles.','const styles:','<a key=','accepted_archive_seal_rows','rejected_archive_seal_rows','archive_seal_rows_without_external_evidence','accepted_external_archive_seal_evidence','rejected_external_archive_seal_evidence','ready_for_next_renewal_cycle_review',"to: '/platform/customer-success'","to: '/platform/support-cockpit'","to: '/platform/monitoring-readiness'","to: '/platform/dependencies'"]) {
  if (page.includes(staleAnchor)) throw new Error(`Platform Retention Renewal Archive Seal check failed: stale page pattern remains: ${staleAnchor}`);
}
if (!css.includes('--io-primary: #d14343') || !css.includes('--io-primary-dark: #b93636')) throw new Error('Platform Retention Renewal Archive Seal check failed: Platform red theme variables missing.');
if (!css.includes('@media (max-width: 640px)')) throw new Error('Platform Retention Renewal Archive Seal check failed: responsive mobile rules missing.');

const requiredPermissions = ['PLATFORM_DASHBOARD_READ','TENANTS_READ','PLATFORM_BILLING_READ','PLATFORM_SLA_READ','PLATFORM_INCIDENTS_READ','SUPPORT_SESSION_READ','PLATFORM_SESSIONS_READ','SYSTEM_HEALTH_READ','PLATFORM_DEPENDENCIES_READ','TENANTS_EXPORT','PLATFORM_RUNBOOKS_READ','PLATFORM_SECURITY_READ'];
const routeIndex = router.indexOf("path: 'commercial-launch-retention-renewal-archive-seal'");
if (routeIndex < 0) throw new Error('Platform Retention Renewal Archive Seal check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 2500);
for (const permission of requiredPermissions) if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) throw new Error(`Platform Retention Renewal Archive Seal check failed: route missing ${permission}.`);

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-retention-renewal-archive-seal"');
if (navIndex < 0) throw new Error('Platform Retention Renewal Archive Seal check failed: navigation entry missing.');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
if (navGuardStart < 0) throw new Error('Platform Retention Renewal Archive Seal check failed: navigation permission guard missing.');
const navWindow = layout.slice(navGuardStart, navIndex + 420);
for (const permission of requiredPermissions) if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) throw new Error(`Platform Retention Renewal Archive Seal check failed: navigation missing ${permission}.`);

if (!packageJson.includes('check:platform-retention-renewal-archive-seal-hardening')) throw new Error('Platform Retention Renewal Archive Seal check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-retention-renewal-archive-seal-hardening')) throw new Error('Platform Retention Renewal Archive Seal check failed: checker is not wired into check:ci.');

console.log('Platform Retention Renewal Archive Seal hardening checks passed.');
