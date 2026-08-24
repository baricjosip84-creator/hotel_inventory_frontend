#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const page = read('src/pages/PlatformEnterpriseIdentityGovernancePage.tsx');
const css = read('src/pages/PlatformEnterpriseIdentityGovernancePage.css');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/PlatformLayout.tsx');

assert(page.includes('OperationalWorkspaceHero'), 'Enterprise Identity must use Operational Workspace hero');
assert(page.includes('OperationalWorkspaceStats'), 'Enterprise Identity must use Operational Workspace KPIs');
assert(page.includes("import './PlatformEnterpriseIdentityGovernancePage.css';"), 'Enterprise Identity must use page CSS');
assert(css.includes('.platform-enterprise-identity'), 'Enterprise Identity CSS must exist');
assert(page.includes('placeholderData: (previous) => previous'), 'Enterprise Identity must preserve the last successful snapshot');
assert(page.includes('Showing the last successful snapshot.'), 'Enterprise Identity must explain stale snapshot state');
assert(page.includes('runtime_sso_provider_count'), 'Enterprise Identity must distinguish configured from runtime SSO providers');
assert(page.includes('runtime_capabilities'), 'Enterprise Identity must render actual runtime auth coverage');
assert(page.includes('Environment configuration is not runtime enforcement.'), 'Enterprise Identity must state configuration/runtime truth boundary');
assert(page.includes('The live Platform login path remains password authentication with optional TOTP MFA.'), 'Enterprise Identity must state the current authentication path');
assert(page.includes('canReadAudit'), 'Audit supporting links must be permission-aware');
assert(page.includes('canReadAccessReviews'), 'Access Review supporting links must be permission-aware');
assert(page.includes('canReadCompliance'), 'Compliance supporting links must be permission-aware');
assert(page.includes('canReadUsers'), 'Platform Users supporting link must be permission-aware');
assert(page.includes('canReadSessions'), 'Platform Sessions supporting link must be permission-aware');
assert(page.includes('href="/platform/audit?source=security"'), 'Enterprise Identity must use the canonical Platform Audit route');
assert(!page.includes('/platform/system-audit'), 'Enterprise Identity must not link to the nonexistent system-audit route');
assert(!page.includes('method: \'POST\''), 'Enterprise Identity must remain read-only');
assert(router.includes("path: 'enterprise-identity'"), 'Enterprise Identity route must remain registered');
assert(router.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ]}'), 'Enterprise Identity route must remain gated by PLATFORM_SECURITY_READ');
assert(layout.includes('to="/platform/enterprise-identity"'), 'Enterprise Identity sidebar link must remain present');
assert(layout.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ)'), 'Enterprise Identity sidebar must remain permission-aware');

console.log('Platform Enterprise Identity page hardening check passed.');
