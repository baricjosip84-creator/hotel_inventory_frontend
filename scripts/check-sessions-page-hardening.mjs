import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/SessionsPage.tsx'), 'utf8');
const pageCss = fs.readFileSync(path.join(root, 'src/pages/SessionsPage.css'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'src/lib/auth.ts'), 'utf8');
const navigationRegistry = fs.readFileSync(path.join(root, 'src/app/navigationRegistry.ts'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const requiredPageAnchors = [
  "paged: 'true'",
  'status: options.status',
  'refetchOnWindowFocus: false',
  "useState<SessionStatusFilter>('active')",
  '25 / page',
  '50 / page',
  '100 / page',
  'Revoke all sessions disables every currently active session',
  'Support sessions must be ended from the platform Support Sessions page.',
  "queryClient.removeQueries({ queryKey: ['auth-sessions'] })",
  'describeDevice(session.user_agent)',
  'getCurrentTenantSessionId()',
  'Current browser is not yet tracked.',
  'current browser is not represented by an active tracked session',
  'NO ACTIVE SESSIONS',
  "currentBrowserTrackingUnavailable = !supportSession && (!currentTenantSessionId || summary.active === 0)",
  'skipMutationFeedback: true',
  "setPage((current) => Math.max(1, current - 1))",
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  'sessions-page io-operational-page io-workspace-page',
  'Previous',
  'Next'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Sessions page hardening check failed: missing ${anchor}`);
  }
}

const requiredCssAnchors = [
  '.sessions-panel',
  '.sessions-toolbar',
  '.sessions-table-wrapper',
  '.sessions-row--current',
  '.sessions-pagination'
];
for (const anchor of requiredCssAnchors) {
  if (!pageCss.includes(anchor)) {
    throw new Error(`Sessions page hardening check failed: missing CSS anchor ${anchor}`);
  }
}

if (!auth.includes('export function getCurrentTenantSessionId(): string | null')) {
  throw new Error('Sessions page hardening check failed: current tenant session id helper is missing.');
}

if (page.includes("apiRequest<SessionItem[]>('/auth/sessions')")) {
  throw new Error('Sessions page hardening check failed: page still downloads the entire session history in one request.');
}

if (page.includes("await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });\n\n      /*\n        Once every backend session is revoked")) {
  throw new Error('Sessions page hardening check failed: revoke-all still refetches after revoking the current session.');
}

const sessionsRegistryEntry = navigationRegistry.match(/\{\s*to:\s*'\/sessions',[\s\S]*?\n\s*\}/)?.[0] || '';
if (!sessionsRegistryEntry || !sessionsRegistryEntry.includes("label: 'Sessions'")) {
  throw new Error('Sessions page hardening check failed: Sessions navigation metadata is missing.');
}
if (/\bpermission\s*:|\broles\s*:|\brequiredPermissions\s*:|\brequiredAnyPermissions\s*:/.test(sessionsRegistryEntry)) {
  throw new Error('Sessions page hardening check failed: account session management must remain authenticated-only rather than tenant role/permission gated.');
}

if (!String(packageJson.scripts?.['check:ci'] || '').includes('check:sessions-page-hardening')) {
  throw new Error('Sessions page hardening check failed: the sessions hardening check is not wired into check:ci.');
}

console.log('Sessions page hardening check passed.');
