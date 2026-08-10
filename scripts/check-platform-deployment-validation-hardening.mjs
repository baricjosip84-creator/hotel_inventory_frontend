import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformDeploymentValidationPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "platformApiRequest<DeploymentValidationPackage>('/platform/deployment-validation')",
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'Operator precheck only.',
  'Live evidence is external.',
  'automatic_runtime_gate_coverage',
  'operator_follow_up',
  'Automatic runtime gate coverage',
  'Manual execution is a fallback',
  'Unable to load deployment validation:',
  'readableError(validation.error)',
  "normalized.includes('review')",
  "normalized.includes('blocked')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Deployment Validation check failed: missing page anchor: ${anchor}`);
  }
}

if (page.includes('required_manual_smoke_test')) {
  throw new Error('Platform Deployment Validation check failed: legacy unconditional manual-smoke-test contract must not remain.');
}

const routeIndex = router.indexOf("path: 'deployment-validation'");
if (routeIndex < 0) throw new Error('Platform Deployment Validation check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 450);
if (!routeWindow.includes('PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ')) {
  throw new Error('Platform Deployment Validation check failed: route must require SYSTEM_HEALTH_READ.');
}

const navIndex = layout.indexOf('<NavLink to="/platform/deployment-validation"');
if (navIndex < 0) throw new Error('Platform Deployment Validation check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 250), navIndex + 220);
if (!navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)')) {
  throw new Error('Platform Deployment Validation check failed: navigation permission must match route permission.');
}

console.log('Platform Deployment Validation hardening checks passed.');
