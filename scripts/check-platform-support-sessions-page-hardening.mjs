import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const page=fs.readFileSync(path.join(root,'src/pages/PlatformSupportSessionsPage.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'src/pages/PlatformSupportSessionsPage.css'),'utf8');
const router=fs.readFileSync(path.join(root,'src/app/router.tsx'),'utf8');
const layout=fs.readFileSync(path.join(root,'src/layouts/PlatformLayout.tsx'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const required=[
  'OperationalWorkspaceHero','OperationalWorkspaceStats','OperationalSectionHeader','useSearchParams','placeholderData: (previous) => previous',
  'Showing the last successful snapshot.','evidence_complete','omitted_sources','required_permissions_by_source',
  'SUPPORT_SESSION_READ','TENANTS_READ + SUPPORT_SESSION_START','PLATFORM_USERS_READ','requester_is_current_user',
  'selectedPolicy.require_ticket_reference','selectedPolicy.require_customer_consent','selectedPolicy.allowed_access_levels','selectedPolicy.support_enabled',
  'A requester cannot approve their own support-session request.','Only the requesting operator can enter this session.',
  'Operator-recorded customer-consent note','not independent proof of customer consent','revalidated before tenant access is accepted',
  '/platform/support-sessions?','tenant_id','search','limit','offset','Previous','Next',
  '/platform/audit?target_type=support_sessions&target_id='
];
for(const token of required) if(!page.includes(token)) throw new Error(`Support Sessions page hardening missing: ${token}`);
if(!css.includes('#d14343')||!css.includes('#b93636')) throw new Error('Support Sessions Platform red identity missing.');
const routeStart=router.indexOf("path: 'support-sessions'");
const routeSlice=router.slice(routeStart,routeStart+420);
if(routeStart<0||!routeSlice.includes('PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ')) throw new Error('Support Sessions route must require SUPPORT_SESSION_READ.');
const navStart=layout.indexOf('to="/platform/support-sessions"');
const navSlice=layout.slice(Math.max(0,navStart-220),navStart+220);
if(navStart<0||!navSlice.includes('PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ')) throw new Error('Support Sessions sidebar must require SUPPORT_SESSION_READ.');
if(!pkg.scripts?.['check:platform-support-sessions-page-hardening']) throw new Error('Support Sessions checker script missing from package.json.');
if(!pkg.scripts?.['check:ci']?.includes('check:platform-support-sessions-page-hardening')) throw new Error('Support Sessions checker is not wired into check:ci.');
console.log('Platform Support Sessions page hardening check: PASS');
