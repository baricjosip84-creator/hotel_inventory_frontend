import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const page=fs.readFileSync(path.join(root,'src/pages/PlatformUsersPage.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'src/pages/PlatformUsersPage.css'),'utf8');
const router=fs.readFileSync(path.join(root,'src/app/router.tsx'),'utf8');
const layout=fs.readFileSync(path.join(root,'src/layouts/PlatformLayout.tsx'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const required=[
  'OperationalWorkspaceHero','OperationalWorkspaceStats','OperationalSectionHeader','useSearchParams',
  'PLATFORM_USERS_WRITE','platform_user_id','search','role','status','mfa','limit','offset','Previous','Next',
  'Showing the last successful snapshot.','Create Platform user','Edit details','Reset password','Revoke access','Deactivate','Activate',
  '/reset-password','/revoke-sessions',"action: 'deactivate'","action: 'activate'",
  'Active Platform sessions','Open Support Sessions','active_without_mfa','active_superadmins',
  'Role downgrades are enforced on each Platform request','Losing Support Session start permission also invalidates active tenant support access',
  '/platform/audit?target_type=platform_users&target_id=',
  'canWrite ?','Read-only registry'
];
for(const token of required) if(!page.includes(token)) throw new Error(`Platform Users page hardening missing: ${token}`);
if(!css.includes('#d14343')||!css.includes('#b93636')) throw new Error('Platform Users Platform red identity missing.');
const routeStart=router.indexOf("path: 'users'");
const routeSlice=router.slice(routeStart,routeStart+420);
if(routeStart<0||!routeSlice.includes('PLATFORM_PERMISSIONS.PLATFORM_USERS_READ')) throw new Error('Platform Users route must require PLATFORM_USERS_READ.');
const navStart=layout.indexOf('to="/platform/users"');
const navSlice=layout.slice(Math.max(0,navStart-240),navStart+240);
if(navStart<0||!navSlice.includes('PLATFORM_PERMISSIONS.PLATFORM_USERS_READ')) throw new Error('Platform Users sidebar must require PLATFORM_USERS_READ.');
if(!pkg.scripts?.['check:platform-users-page-hardening']) throw new Error('Platform Users checker script missing from package.json.');
if(!pkg.scripts?.['check:ci']?.includes('check:platform-users-page-hardening')) throw new Error('Platform Users checker is not wired into check:ci.');
console.log('Platform Users page hardening check: PASS');
