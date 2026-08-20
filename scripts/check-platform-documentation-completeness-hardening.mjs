import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformDocumentationCompletenessPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformDocumentationCompletenessPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "platformApiRequest<DocumentationCompletenessPackage>('/platform/documentation-completeness')",
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  "import './PlatformDocumentationCompletenessPage.css'",
  'Operator precheck only',
  'Static repository evidence only',
  'documentation_index',
  'documentation_evidence_details',
  'Documentation index integrity',
  'External review required',
  'initialLoadError',
  'refreshError',
  'Showing the last successful documentation-completeness snapshot',
  'disabled={documentation.isFetching}',
  'hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)',
  'hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)',
  'PLATFORM_PERMISSIONS.PLATFORM_SLA_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ',
  'PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ',
  'PLATFORM_PERMISSIONS.TENANTS_EXPORT',
  'PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ',
  'does not prove that guidance is current, owner-approved, customer-accepted or validated in production'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Documentation Completeness check failed: missing page anchor: ${anchor}`);
  }
}

if (page.includes('function formatBoolean')) {
  throw new Error('Platform Documentation Completeness check failed: boolean-only evidence rendering cannot represent external review states.');
}

if (page.includes('style={styles.') || page.includes('const styles:')) {
  throw new Error('Platform Documentation Completeness check failed: legacy inline-style page shell must not remain.');
}

const requiredCssAnchors = [
  '.platform-documentation-completeness__hero-aside',
  '.platform-documentation-completeness__status-badge',
  '.platform-documentation-completeness__feedback--warning',
  '.platform-documentation-completeness__boundary-grid',
  '.platform-documentation-completeness__program-grid',
  '.platform-documentation-completeness__control-grid',
  '.platform-documentation-completeness__two-column',
  'var(--io-primary-dark)',
  'overflow-wrap: anywhere',
  '@media (max-width: 860px)',
  '@media (max-width: 620px)'
];

for (const anchor of requiredCssAnchors) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Documentation Completeness check failed: missing responsive/workspace CSS anchor: ${anchor}`);
  }
}

const routeIndex = router.indexOf("path: 'documentation-completeness'");
if (routeIndex < 0) throw new Error('Platform Documentation Completeness check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 450);
if (!routeWindow.includes('PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ')) {
  throw new Error('Platform Documentation Completeness check failed: route must require PLATFORM_RUNBOOKS_READ.');
}

const navIndex = layout.indexOf('<NavLink to="/platform/documentation-completeness"');
if (navIndex < 0) throw new Error('Platform Documentation Completeness check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 280), navIndex + 220);
if (!navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)')) {
  throw new Error('Platform Documentation Completeness check failed: navigation permission must match route permission.');
}

console.log('Platform Documentation Completeness hardening checks passed.');
