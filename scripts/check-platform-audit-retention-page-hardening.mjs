import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const page=fs.readFileSync(path.join(root,'src/pages/PlatformAuditRetentionPage.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'src/pages/PlatformAuditRetentionPage.css'),'utf8');
const router=fs.readFileSync(path.join(root,'src/app/router.tsx'),'utf8');
const layout=fs.readFileSync(path.join(root,'src/layouts/PlatformLayout.tsx'),'utf8');
const audit=fs.readFileSync(path.join(root,'src/pages/PlatformAuditPage.tsx'),'utf8');
const compliance=fs.readFileSync(path.join(root,'src/pages/PlatformComplianceExportPage.tsx'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const required=[
  'OperationalWorkspaceHero','OperationalWorkspaceStats','OperationalSectionHeader','useSearchParams','placeholderData: (previous) => previous',
  'Showing the last successful snapshot.','evidence_complete','omitted_sources','required_permissions_by_source',
  'AUDIT_READ + TENANTS_READ','PLATFORM_DATA_RETENTION_READ','TENANTS_EXPORT','Full archive evidence','Due archive gaps',
  'tenant_export_archive_events','tenant_export_summary_events','Summary evidence restricted','Tenant write lock is not treated as a purge hold',
  'A summary-only export is not full row-data archive evidence.','does not prove secure external delivery, receipt or acceptance',
  '/platform/audit-retention/policy?','limit', 'offset', 'Previous', 'Next'
];
for(const token of required) if(!page.includes(token)) throw new Error(`Audit Retention page hardening missing: ${token}`);
if(!css.includes('#d14343')||!css.includes('#b93636')) throw new Error('Audit Retention Platform red identity missing.');
const routeStart=router.indexOf("path: 'audit-retention'");
const routeSlice=router.slice(routeStart,routeStart+520);
if(routeStart<0||!routeSlice.includes('PLATFORM_PERMISSIONS.AUDIT_READ')||!routeSlice.includes('PLATFORM_PERMISSIONS.TENANTS_READ')) throw new Error('Audit Retention route must require AUDIT_READ + TENANTS_READ.');
const navStart=layout.indexOf('to="/platform/audit-retention"');
const navSlice=layout.slice(Math.max(0,navStart-320),navStart+240);
if(navStart<0||!navSlice.includes('PLATFORM_PERMISSIONS.AUDIT_READ')||!navSlice.includes('PLATFORM_PERMISSIONS.TENANTS_READ')) throw new Error('Audit Retention sidebar must require AUDIT_READ + TENANTS_READ.');
if(!audit.includes("allowed: canReadTenants")) throw new Error('Audit supporting link must respect TENANTS_READ.');
if(!compliance.includes('canReadAudit&&canReadTenants')) throw new Error('Compliance Export supporting link must respect Audit Retention tenant permission.');
if(!pkg.scripts?.['check:platform-audit-retention-page-hardening']) throw new Error('Audit Retention checker script missing from package.json.');
if(!pkg.scripts?.['check:ci']?.includes('check:platform-audit-retention-page-hardening')) throw new Error('Audit Retention checker is not wired into check:ci.');
console.log('Platform Audit Retention page hardening check: PASS');
