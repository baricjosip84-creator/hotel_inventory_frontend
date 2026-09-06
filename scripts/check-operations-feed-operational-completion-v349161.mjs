import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const page = read('src/pages/RealTimeOperationsFeedPage.tsx');
const css = read('src/pages/RealTimeOperationsFeedPage.css');
const translations = read('src/i18n/tenantUiTranslations.ts');
const packageJson = read('package.json');

const checks = [];
function check(label, condition) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  checks.push(label);
  console.log(`PASS: ${label}`);
}

check('Control Tower source links resolve to Reliability Command.',
  page.includes("if (sourceSurface === '/control-tower') return '/reliability-command';"));
check('Action Center API source surface resolves to the visible Action Center route.',
  page.includes("if (sourceSurface === '/operational-action-center/summary') return '/action-center';"));
check('Reliability Command is an accepted tenant source route.',
  page.includes("'/reliability-command'"));

check('Initial-load failure is separated from refresh failure.',
  page.includes('const initialLoadFailed = Boolean(feedQuery.error) && !response;')
  && page.includes('const refreshFailed = Boolean(feedQuery.error) && Boolean(response);'));
check('Refresh failure keeps the last successful snapshot visible.',
  page.includes('Showing the last available operations-feed snapshot. Try refreshing again before acting on time-sensitive information.')
  && page.includes('{refreshFailed ? ('));
check('Timeline is suppressed only for loading/initial-load failure, not stale refresh failure.',
  page.includes('{(feedQuery.isLoading && !response) || initialLoadFailed ? null : displayTimeline.length === 0 ? ('));

check('New-since-last-visit storage is tenant/user scoped.',
  page.includes("const OPERATIONS_FEED_LAST_SEEN_PREFIX = 'inventory_operations_feed_last_seen';")
  && page.includes('getTenantAccessSnapshot()')
  && page.includes('const userScope = access.userId || `role:${access.role}`;')
  && page.includes('`${OPERATIONS_FEED_LAST_SEEN_PREFIX}:${access.tenantId}:${userScope}`')
  && !page.includes('access.userEmail || access.role'));
check('Last-seen storage degrades safely when browser storage is unavailable.',
  page.includes('window.localStorage.getItem(storageKey)')
  && page.includes('window.localStorage.setItem(lastSeenStorageKey, response.generated_at)')
  && page.includes('Feed awareness must keep working even when browser storage is unavailable.'));
check('New items use the newest observed/updated time after the previous visit.',
  page.includes('const timestamps = [item.observed_at, item.updated_at]')
  && page.includes('Math.max(...timestamps)')
  && page.includes('const newItemIds = useMemo(() => {')
  && page.includes('timestamp > Number(previousVisitTimestamp)'));
check('Users can filter to New since last visit.',
  page.includes("{ value: 'new', label: 'New since last visit' }")
  && page.includes("if (viewScope === 'new' && !newItemIds.has(item.timeline_item_id)) return false;"));
check('New timeline items receive an explicit New badge.',
  page.includes('operations-feed-page__badge--new') && page.includes('{ui("New")}'));

check('Quiet auto-refresh is approximately once per minute.',
  page.includes('const OPERATIONS_FEED_AUTO_REFRESH_MS = 60_000;')
  && page.includes('refetchInterval: OPERATIONS_FEED_AUTO_REFRESH_MS'));
check('Auto-refresh does not continue in the background.',
  page.includes('refetchIntervalInBackground: false'));
check('Reconnect and window-focus refresh remain enabled.',
  page.includes('refetchOnReconnect: true') && page.includes('refetchOnWindowFocus: true'));

check('Search is explicitly limited to the current feed snapshot.',
  page.includes('Search current feed')
  && page.includes('timelineItemSearchText(item, ui).includes(normalizedSearch)'));
check('Search covers title, summary, recommendation, raw/localized event status, work area, and delivery target.',
  ['item.title','item.summary','item.recommended_next_step','item.event_type','canonicalLabel(item.event_type, ui)','item.event_status','canonicalLabel(item.event_status, ui)','item.timeline_domain','canonicalLabel(item.timeline_domain, ui)','item.delivery_target'].every((token) => page.includes(token)));
check('Recent-time filtering supports Today and Last 24 hours.',
  page.includes("{ value: 'today', label: 'Today' }")
  && page.includes("{ value: '24h', label: 'Last 24 hours' }")
  && page.includes("if (timeWindow === '24h') return timestamp >= last24Hours;"));
check('Local filters explain when no currently loaded items match.',
  page.includes('No items in the current feed match your search, time, or view filters.'));

check('Operations Feed remains read-only in the frontend.',
  page.includes('apiRequest<RealTimeOperationsFeedResponse>')
  && !page.includes('useMutation(')
  && !page.includes('method: \'POST\'')
  && !page.includes('method: \'PATCH\'')
  && !page.includes('method: \'DELETE\''));
check('Search, stale-warning, and new-item presentation styles are present.',
  css.includes('.operations-feed-page__input')
  && css.includes('.operations-feed-page__state--stale')
  && css.includes('.operations-feed-page__badge--new'));

const requiredRows = [
  'Auto-refresh on',
  'about every minute while this page is open',
  'New since last visit',
  'Items observed or updated after your previous visit in this browser',
  'No earlier visit is recorded in this browser yet',
  'Search current feed',
  'Search title, summary, status, or work area',
  'Unable to refresh the operations feed.',
  'The feed refreshes automatically about every minute while this page is open.',
  'No items in the current feed match your search, time, or view filters.',
  'All shown', 'Today', 'Last 24 hours', 'All items'
];
check('Every new Operations Feed phrase is present in the tenant translation catalog.',
  requiredRows.every((row) => translations.includes(`[${JSON.stringify(row)},`)));
check('Every new Operations Feed phrase has a five-language catalog row.',
  requiredRows.every((row) => {
    const index = translations.indexOf(`[${JSON.stringify(row)},`);
    if (index < 0) return false;
    const end = translations.indexOf('],', index);
    if (end < 0) return false;
    const rowSource = translations.slice(index, end + 1);
    let quoteCount = 0;
    let escaped = false;
    for (const char of rowSource) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') quoteCount += 1;
    }
    return quoteCount >= 10;
  }));
check('Dedicated v3.49.161 guard is wired into the frontend package scripts.',
  packageJson.includes('check:operations-feed-operational-completion-v349161'));

console.log(`Operations Feed operational completion frontend guard: ${checks.length}/${checks.length} PASS`);
