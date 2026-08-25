#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const page = read('src/pages/PlatformNotificationsPage.tsx');
const css = read('src/pages/PlatformNotificationsPage.css');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/PlatformLayout.tsx');

assert(page.includes('OperationalWorkspaceHero'), 'Notifications must use Operational Workspace hero');
assert(page.includes('OperationalWorkspaceStats'), 'Notifications must use Operational Workspace KPIs');
assert(page.includes("import './PlatformNotificationsPage.css';"), 'Notifications must use page CSS');
assert(css.includes('.platform-notifications'), 'Notifications CSS must exist');
assert(page.includes('useSearchParams'), 'Notification filters must be URL-backed');
assert(page.includes('limit: String(PAGE_SIZE)'), 'Notifications must request bounded server pages');
assert(page.includes("params.set('tenant_id'"), 'Notifications must preserve tenant deep links');
assert(page.includes("params.set('source'"), 'Notifications must preserve source filters');
assert(page.includes("params.set('search'"), 'Notifications must support server search');
assert(page.includes('placeholderData: (previous) => previous'), 'Notifications must preserve the last successful snapshot');
assert(page.includes('Showing the last successful snapshot.'), 'Notifications must explain stale snapshot state');
assert(page.includes('Partial notification evidence.'), 'Notifications must explain restricted source evidence');
assert(page.includes('evidence_access'), 'Notifications must expose source-family evidence access');
assert(page.includes('canRunOperationalScan'), 'Operational scan controls must be permission-aware');
assert(page.includes('canRunIntegrationScan'), 'Integration scan controls must be permission-aware');
assert(page.includes('/platform/notifications/bulk-assign-integration-routing'), 'Notifications must preserve bulk integration routing');
assert(page.includes('selectedIntegrationNotifications.length <= 100'), 'Bulk integration routing must remain capped at 100 eligible rows');
assert(page.includes('canReadAudit'), 'Audit supporting links must be permission-aware');
assert(page.includes('canReadBilling'), 'Billing supporting links must be permission-aware');
assert(page.includes('canReadSupport'), 'Support Session supporting links must be permission-aware');
assert(page.includes('canReadJobs'), 'Operational Job supporting links must be permission-aware');
assert(page.includes('/platform/audit?target_type=platform_notifications&target_id='), 'Notification audit links must use canonical target filters');
assert(!page.includes('/platform/system-audit'), 'Notifications must not link to nonexistent system-audit');
assert(page.includes('data.pagination.has_more'), 'Notifications must expose server pagination controls');
assert(page.includes('resolved does not prove the external condition is fixed'), 'Notifications must state workflow/external outcome truth boundary');
assert(router.includes("path: 'notifications'"), 'Notifications route must remain registered');
assert(router.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ]}'), 'Notifications route must retain PLATFORM_NOTIFICATIONS_READ');
assert(layout.includes('to="/platform/notifications"'), 'Notifications sidebar link must remain present');
assert(layout.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ)'), 'Notifications sidebar link must remain permission-aware');

console.log('Platform Notifications page hardening check passed.');
