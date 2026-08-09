import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/SessionsPage.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/AppLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "paged: 'true'",
  "status: options.status",
  "refetchOnWindowFocus: false",
  "useState<SessionStatusFilter>('active')",
  '25 / page',
  '50 / page',
  '100 / page',
  'Revoke All Sessions revokes only currently active sessions',
  'Support sessions must be ended from the platform Support Sessions page.',
  "queryClient.removeQueries({ queryKey: ['auth-sessions'] })",
  'describeDevice(session.user_agent)',
  'Previous',
  'Next'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Sessions page hardening check failed: missing ${anchor}`);
  }
}

if (page.includes("apiRequest<SessionItem[]>('/auth/sessions')")) {
  throw new Error('Sessions page hardening check failed: page still downloads the entire session history in one request.');
}

if (page.includes("await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });\n\n      /*\n        Once every backend session is revoked")) {
  throw new Error('Sessions page hardening check failed: revoke-all still refetches after revoking the current session.');
}

if (!layout.includes("currentModule.roles?.length ? 'role-gated' : 'authenticated'")) {
  throw new Error('Sessions page hardening check failed: authenticated-only route metadata is still mislabeled as role-gated.');
}

console.log('Sessions page hardening check passed.');
