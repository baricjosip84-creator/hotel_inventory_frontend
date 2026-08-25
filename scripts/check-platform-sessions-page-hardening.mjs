import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const page=fs.readFileSync(path.join(root,'src/pages/PlatformSessionsPage.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'src/pages/PlatformSessionsPage.css'),'utf8');
const users=fs.readFileSync(path.join(root,'src/pages/PlatformUsersPage.tsx'),'utf8');
const security=fs.readFileSync(path.join(root,'src/pages/PlatformSecurityPage.tsx'),'utf8');
const router=fs.readFileSync(path.join(root,'src/app/router.tsx'),'utf8');
const layout=fs.readFileSync(path.join(root,'src/layouts/PlatformLayout.tsx'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const required=[
  'OperationalWorkspaceHero','OperationalWorkspaceStats','OperationalSectionHeader','useSearchParams',
  "workspace: 'true'",'platform_user_id','search','status','limit','offset','Previous','Next',
  'Showing the last successful snapshot.','Platform-user identity evidence is restricted.','PLATFORM_USERS_READ',
  'PLATFORM_SESSIONS_REVOKE','Current browser','Sign out to end this browser session.','Revoke session',
  'application session registry, not a physical-device or human-presence monitor','IP and user agent','Last used','Revocation',
  '/platform/audit?source=platform_sessions','canReadUsers ?','canRevoke ?'
];
for(const token of required) if(!page.includes(token)) throw new Error(`Platform Sessions page hardening missing: ${token}`);
if(!css.includes('#d14343')||!css.includes('#b93636')) throw new Error('Platform Sessions Platform red identity missing.');
const routeStart=router.indexOf("path: 'sessions'");
const routeSlice=router.slice(routeStart,routeStart+440);
if(routeStart<0||!routeSlice.includes('PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ')) throw new Error('Platform Sessions route must require PLATFORM_SESSIONS_READ.');
const navStart=layout.indexOf('to="/platform/sessions"');
const navSlice=layout.slice(Math.max(0,navStart-260),navStart+260);
if(navStart<0||!navSlice.includes('PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ')) throw new Error('Platform Sessions sidebar must require PLATFORM_SESSIONS_READ.');
for(const token of ['canRevokeSessions && canEndSupportSessions',"? (user.active_session_count ?? 0) : 'Restricted'","? (user.open_support_session_count ?? 0) : 'Restricted'",'/platform/sessions?platform_user_id=']) if(!users.includes(token)) throw new Error(`Platform Users downstream session contract missing: ${token}`);
for(const token of ['canReadPlatformUsers','canReadPlatformSessions','platform_user_identity_restricted','Restricted evidence is null/Restricted, never converted to zero']) if(!security.includes(token)) throw new Error(`Platform Security downstream session contract missing: ${token}`);
if(!pkg.scripts?.['check:platform-sessions-page-hardening']) throw new Error('Platform Sessions checker script missing from package.json.');
if(!pkg.scripts?.['check:ci']?.includes('check:platform-sessions-page-hardening')) throw new Error('Platform Sessions checker is not wired into check:ci.');
console.log('Platform Sessions page hardening check: PASS');
