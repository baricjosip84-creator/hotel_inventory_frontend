import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requireToken = (source, token, label) => { if (!source.includes(token)) throw new Error(`${label} missing: ${token}`); };
const page = read('src/pages/PlatformAnnouncementsPage.tsx');
const css = read('src/pages/PlatformAnnouncementsPage.css');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/PlatformLayout.tsx');
const tenantLayout = read('src/layouts/AppLayout.tsx');
const tenantContext = read('src/lib/announcementContext.ts');
const platformContext = read('src/lib/platformAnnouncementContext.ts');
const pkg = JSON.parse(read('package.json'));

for (const token of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'useSearchParams',
  'Showing the last successful announcement snapshot.', 'evidence_complete', 'omitted_sources',
  'TENANTS_READ', 'PLATFORM_USERS_READ', 'PLATFORM_ANNOUNCEMENTS_WRITE',
  'Create draft', 'Creation never publishes.', 'Publish', 'Cancellation reason',
  'Published start history is immutable.', 'It remains Expired until explicitly published again.',
  'publication', 'browser delivery', 'customer receipt', 'acknowledgement',
  'PAGE_SIZE = 50', 'limit', 'offset', 'Previous', 'Next', 'search',
  'refetchOnWindowFocus: false', 'placeholderData: (previous) => previous',
  'enabled: canReadTenants', 'uuidPattern', 'Invalid or unauthorized URL filter'
]) requireToken(page, token, 'Announcements page hardening');

for (const stale of ['style={styles.', 'const styles: Record<string, CSSProperties>', 'platformApiRequest<Announcement[]>']) {
  if (page.includes(stale)) throw new Error(`Announcements legacy page pattern remains: ${stale}`);
}
requireToken(page, "import './PlatformAnnouncementsPage.css';", 'Announcements page CSS import');
requireToken(css, '--io-primary:#d14343', 'Announcements Platform red identity');
requireToken(css, '--io-primary-dark:#b93636', 'Announcements Platform red identity');
requireToken(css, '@media(max-width:760px)', 'Announcements mobile responsive rule');

const routeStart = router.indexOf("path: 'announcements'");
const routeSlice = router.slice(routeStart, routeStart + 360);
if (routeStart < 0 || !routeSlice.includes('PLATFORM_ANNOUNCEMENTS_READ')) throw new Error('Announcements router must require PLATFORM_ANNOUNCEMENTS_READ.');
const navStart = layout.indexOf('to="/platform/announcements"');
const navSlice = layout.slice(Math.max(0, navStart - 220), navStart + 240);
if (navStart < 0 || !navSlice.includes('PLATFORM_ANNOUNCEMENTS_READ')) throw new Error('Announcements sidebar visibility must require PLATFORM_ANNOUNCEMENTS_READ.');

for (const token of ['fetchPlatformAnnouncementContext', '/platform/announcement-context/current', 'visibleAnnouncements.map', 'announcement.dismissible', "t('common.requiredNotice')"]) {
  requireToken(layout + platformContext, token, 'Platform announcement delivery');
}
for (const token of ['visibleAnnouncements.map', 'announcement.dismissible', 'dismissedAnnouncementIds', 'announcementContext?.truncated', "t('common.requiredNotice')"]) {
  requireToken(tenantLayout, token, 'Tenant announcement delivery');
}
for (const token of ['total_current?: number', 'truncated?: boolean']) requireToken(tenantContext, token, 'Tenant announcement context contract');

if (!pkg.scripts?.['check:platform-announcements-page-hardening']) throw new Error('Announcements checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-announcements-page-hardening')) throw new Error('Announcements checker is not wired into check:ci.');

console.log('Platform Announcements page hardening check: PASS');
