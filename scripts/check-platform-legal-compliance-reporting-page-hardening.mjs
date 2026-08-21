import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const page=fs.readFileSync(path.join(root,'src/pages/PlatformLegalComplianceReportingPage.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'src/pages/PlatformLegalComplianceReportingPage.css'),'utf8');
const router=fs.readFileSync(path.join(root,'src/app/router.tsx'),'utf8');
const layout=fs.readFileSync(path.join(root,'src/layouts/PlatformLayout.tsx'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const required=[
  'OperationalWorkspaceHero','OperationalWorkspaceStats','OperationalSectionHeader','useSearchParams','const PAGE_SIZE = 50',
  "searchParams.get('source')","searchParams.get('offset')","searchParams.get('search')",'placeholderData: (previous) => previous',
  'Showing the last successful snapshot','Permission-scoped source set','Restricted','evidence_complete','available_sources','omitted_sources',
  'PLATFORM_PRIVACY_READ','PLATFORM_ACCESS_REVIEWS_READ','PLATFORM_RISKS_READ','PLATFORM_VENDORS_READ','PLATFORM_DEPENDENCIES_READ','TENANTS_READ','PLATFORM_USERS_READ',
  'one authorized source at a time for true server pagination','Application governance evidence only','Archived documents, closed/cancelled risks, and inactive/archived vendors are historical evidence'
];
for(const token of required) if(!page.includes(token)) throw new Error(`Legal/compliance reporting page hardening missing: ${token}`);
if(page.includes('style={styles.')||page.includes('const styles:')) throw new Error('Legal/compliance reporting must use the shared workspace/CSS rather than legacy inline styles.');
if(!css.includes('--io-primary:#d14343')||!css.includes('--io-primary-dark:#b93636')) throw new Error('Legal/compliance reporting Platform red workspace identity missing.');
if(!router.includes("path: 'legal-compliance-reporting'")||!router.includes('PLATFORM_COMPLIANCE_READ')) throw new Error('Legal/compliance reporting route permission guard missing.');
if(!layout.includes('to="/platform/legal-compliance-reporting"')||!layout.includes('PLATFORM_COMPLIANCE_READ')) throw new Error('Legal/compliance reporting sidebar permission visibility missing.');
if(!pkg.scripts?.['check:platform-legal-compliance-reporting-page-hardening']) throw new Error('Legal/compliance reporting checker script missing from package.json.');
if(!pkg.scripts?.['check:ci']?.includes('check:platform-legal-compliance-reporting-page-hardening')) throw new Error('Legal/compliance reporting checker is not wired into check:ci.');
console.log('Platform Legal & compliance reporting page hardening check: PASS');
