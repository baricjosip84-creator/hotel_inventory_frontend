import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformRiskRegisterPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformRiskRegisterPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const legalReporting = fs.readFileSync(path.join(root, 'src/pages/PlatformLegalComplianceReportingPage.tsx'), 'utf8');
const capacityPlanning = fs.readFileSync(path.join(root, 'src/pages/PlatformCapacityPlanningPage.tsx'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform operations',
  'Risk evidence boundary', 'Application-maintained evidence only', 'Accepted” does not prove external/customer/legal acceptance',
  '“Closed” does not prove the underlying real-world risk was eliminated', 'PAGE_SIZE = 50',
  "searchParams.get('tenant_id')", "searchParams.get('owner_platform_user_id')", "searchParams.get('status')", "searchParams.get('category')", "searchParams.get('search')", "searchParams.get('due_only')",
  'TENANTS_READ', 'PLATFORM_USERS_READ', 'PLATFORM_VENDORS_READ', 'PLATFORM_DEPENDENCIES_READ', 'PLATFORM_INCIDENTS_READ', 'PLATFORM_RELEASES_READ', 'AUDIT_READ',
  'Showing the last successful snapshot.', 'Invalid or forbidden URL filter', 'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'pagination?.has_more',
  'Tenant linkage restricted', 'Owner linkage restricted', 'Status handled separately', 'details immutable until reopened', 'Apply status', 'Reopen',
  'refetchOnWindowFocus: false', 'staleTime: 30_000', 'toLocalDateTimeInput'
]) if (!page.includes(anchor)) throw new Error(`Platform Risk Register check failed: missing page anchor: ${anchor}`);
for (const stale of ['style={styles.', 'const styles:', "params.set('limit', '300')", 'Total shown', 'Track HLA operational']) if (page.includes(stale)) throw new Error(`Platform Risk Register check failed: stale legacy pattern remains: ${stale}`);
if (!page.includes("import './PlatformRiskRegisterPage.css';")) throw new Error('Platform Risk Register check failed: page CSS import missing.');
if (!page.includes('enabled: canReadTenants')) throw new Error('Platform Risk Register check failed: tenant directory query must be permission-gated.');
if (!page.includes('enabled: canReadUsers')) throw new Error('Platform Risk Register check failed: Platform-user directory query must be permission-gated.');
if (!page.includes('if (canReadTenants) body.tenant_id')) throw new Error('Platform Risk Register check failed: tenant mutation field must be omitted without TENANTS_READ.');
if (!page.includes('if (canReadUsers) body.owner_platform_user_id')) throw new Error('Platform Risk Register check failed: owner mutation field must be omitted without PLATFORM_USERS_READ.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform Risk Register check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:760px)')) throw new Error('Platform Risk Register check failed: mobile responsive rule missing.');
const routeIndex = router.indexOf("path: 'risk-register'");
if (routeIndex < 0) throw new Error('Platform Risk Register check failed: route missing.');
if (!router.slice(routeIndex, routeIndex + 430).includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ]}')) throw new Error('Platform Risk Register check failed: route must preserve PLATFORM_RISKS_READ entry access.');
const navIndex = layout.indexOf('<NavLink to="/platform/risk-register"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
if (navIndex < 0 || navGuardStart < 0 || !layout.slice(navGuardStart, navIndex + 300).includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ)')) throw new Error('Platform Risk Register check failed: navigation must remain PLATFORM_RISKS_READ guarded.');

if (!legalReporting.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ)')) throw new Error('Platform Risk Register check failed: Legal Compliance Risk Register link must be permission-aware.');
if (!legalReporting.includes("data?.evidence_complete ? 'Complete authorized source set' : 'Permission-scoped source set'") || !legalReporting.includes("data-state={available ? 'available' : 'restricted'}")) throw new Error('Platform Risk Register check failed: Legal Compliance must surface permission-scoped/omitted source evidence.');
if (!capacityPlanning.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ)')) throw new Error('Platform Risk Register check failed: Capacity Planning Risk Register link must be permission-aware.');
if (!packageJson.includes('check:platform-risk-register-page-hardening')) throw new Error('Platform Risk Register check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-risk-register-page-hardening')) throw new Error('Platform Risk Register check failed: checker is not wired into check:ci.');
console.log('Platform Risk Register page hardening checks passed.');
