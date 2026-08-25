#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const router = readFileSync(join(root, 'src/app/router.tsx'), 'utf8');
const layout = readFileSync(join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const page = readFileSync(join(root, 'src/pages/PlatformSecurityPage.tsx'), 'utf8');
const cssPath = join(root, 'src/pages/PlatformSecurityPage.css');
const failures = [];

const securityRouteMatch = router.match(/path:\s*'security',[\s\S]*?<PlatformSecurityPage \/>[\s\S]*?\n\s*}\s*,\n\s*{\n\s*path:\s*'support-sessions'/);
if (!securityRouteMatch) {
  failures.push('platform security route block was not found before support-sessions route.');
} else {
  const block = securityRouteMatch[0];
  if (!block.includes('<PlatformProtectedRoute>')) failures.push('My Security must remain authenticated-only self-service via PlatformProtectedRoute.');
  if (block.includes('requiredPermissions=')) failures.push('My Security route must not require PLATFORM_SECURITY_READ; staff-wide evidence is gated inside the page/API.');
}

if (!layout.includes('<NavLink to="/platform/security"')) failures.push('My Security must remain visible to authenticated Platform users in the sidebar.');
if (!existsSync(cssPath)) failures.push('PlatformSecurityPage.css is required for Operational Workspace styling.');

for (const required of [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalSectionHeader',
  "'/platform/security/me'",
  "'/platform/security/admin'",
  'enabled: canReadAdminSecurity',
  'PLATFORM_SESSIONS_REVOKE',
  'Showing the last successful account-security snapshot.',
  'Showing the last successful staff-security snapshot.',
  'current_password: pwd.current_password, new_password: pwd.new_password',
  'current_password: disableMfaForm.current_password',
  'code: disableMfaForm.code.trim()',
  'MFA remains disabled until setup is confirmed.',
  'skipIdempotencyKey: true',
  'The new password is stored exactly as entered',
  '/platform/audit?source=security',
  '/platform/access-reviews',
  '/platform/permission-audit',
  '/platform/enterprise-identity'
]) {
  if (!page.includes(required)) failures.push(`PlatformSecurityPage is missing hardening marker: ${required}`);
}

for (const forbidden of [
  '/platform/system-audit',
  'current_password: pwd.current_password.trim()',
  'new_password: pwd.new_password.trim()',
  '<SourceLink href=',
  'style={styles.'
]) {
  if (page.includes(forbidden)) failures.push(`PlatformSecurityPage still contains forbidden/legacy pattern: ${forbidden}`);
}

if (failures.length) {
  console.error('Platform My Security hardening check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Platform My Security route/workspace hardening check passed.');
