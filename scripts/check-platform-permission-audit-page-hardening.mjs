import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const page=fs.readFileSync(path.join(root,'src/pages/PlatformPermissionAuditPage.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'src/pages/PlatformPermissionAuditPage.css'),'utf8');
const router=fs.readFileSync(path.join(root,'src/app/router.tsx'),'utf8');
const layout=fs.readFileSync(path.join(root,'src/layouts/PlatformLayout.tsx'),'utf8');
const required=[
  'OperationalWorkspaceHero','OperationalWorkspaceStats','OperationalSectionHeader','useSearchParams','placeholderData',
  'available_sources','omitted_sources','evidence_complete','platform_sessions','support_sessions','role_permissions','tenant_identity',
  'PLATFORM_USERS_READ','PLATFORM_SESSIONS_READ','SUPPORT_SESSION_READ','PLATFORM_ROLE_PERMISSIONS_READ','PLATFORM_API_KEYS_READ','TENANTS_READ',
  'Showing the last successful snapshot','Permission-scoped evidence','Restricted','Evidence boundary:',
  'user_limit','user_offset','api_key_limit','api_key_offset','PAGE_SIZE=50'
];
for(const token of required)if(!page.includes(token))throw new Error(`Permission Audit page missing hardening token: ${token}`);
if(!css.includes('--io-accent:#d14343')||!css.includes('#b93636'))throw new Error('Permission Audit Platform-red workspace tokens missing');
if(!router.includes("path: 'permission-audit'")||!router.includes('PLATFORM_ACCESS_REVIEWS_READ'))throw new Error('Permission Audit router guard missing');
if(!layout.includes('to="/platform/permission-audit"')||!layout.includes('PLATFORM_ACCESS_REVIEWS_READ'))throw new Error('Permission Audit sidebar guard missing');
console.log('Platform Permission Audit page hardening check passed.');
