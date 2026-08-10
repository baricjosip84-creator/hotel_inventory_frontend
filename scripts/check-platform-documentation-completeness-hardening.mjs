import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformDocumentationCompletenessPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "platformApiRequest<DocumentationCompletenessPackage>('/platform/documentation-completeness')",
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'Operator precheck only.',
  'Static repository evidence only.',
  'documentation_index',
  'documentation_evidence_details',
  'Documentation index integrity',
  'external review required',
  'Unable to load documentation completeness:',
  'readableError(documentation.error)',
  "normalized.includes('review')",
  "normalized.includes('missing')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Documentation Completeness check failed: missing page anchor: ${anchor}`);
  }
}

if (page.includes('function formatBoolean')) {
  throw new Error('Platform Documentation Completeness check failed: boolean-only evidence rendering cannot represent external review states.');
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
