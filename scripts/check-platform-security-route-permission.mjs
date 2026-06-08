#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const router = readFileSync(join(root, 'src/app/router.tsx'), 'utf8');
const platformSecurityPage = readFileSync(join(root, 'src/pages/PlatformSecurityPage.tsx'), 'utf8');
const failures = [];

const securityRouteMatch = router.match(/path:\s*'security',[\s\S]*?<PlatformSecurityPage \/>[\s\S]*?\n\s*}\s*,\n\s*{\n\s*path:\s*'support-sessions'/);

if (!securityRouteMatch) {
  failures.push('platform security route block was not found before support-sessions route.');
} else {
  const securityRouteBlock = securityRouteMatch[0];

  if (!securityRouteBlock.includes('<PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ]}>')) {
    failures.push('platform security route must require PLATFORM_SECURITY_READ at route level.');
  }

  if (!securityRouteBlock.includes('<PlatformSecurityPage />')) {
    failures.push('platform security route must still render PlatformSecurityPage.');
  }
}

if (!platformSecurityPage.includes("'/platform/security/admin'")) {
  failures.push('PlatformSecurityPage still needs admin security data; route-level permission is required.');
}

if (failures.length > 0) {
  console.error('Platform security route permission check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Platform security route permission check passed.');
