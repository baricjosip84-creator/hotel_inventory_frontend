// FE226: restored missing v3.49.261 regression, including executable feed tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const feed = read('src/pages/RealTimeOperationsFeedPage.tsx');
const css = read('src/pages/RealTimeOperationsFeedPage.css');
const pkg = JSON.parse(read('package.json'));
let checks=0;
function check(ok,label){ assert.ok(ok,label); checks++; }
check(feed.includes('function sourceSurfaceToAppPath('), 'Safe source-navigation resolver exists');
check(feed.includes('function timelineItemSearchText('), 'Timeline search includes evidence fields');
check(feed.includes('function sourceItemLink('), 'Source item links are derived deliberately');
check(feed.includes('function canonicalLabel('), 'Machine-coded fields use human-readable rendering');
check(feed.includes('canonicalLabel(item.event_status, ui)'), 'Human-readable event status is displayed');
check(feed.includes('canonicalLabel(item.timeline_domain, ui)'), 'Human-readable timeline domain is displayed');
check(feed.includes('item.correlation_id'), 'Audit evidence retains correlation IDs');
check(css.includes('operations-feed'), 'Feed retains its application styling');
check(pkg.scripts['check:inventory-operations-feed-clarity-surgical-fixes-v349261'] === 'node scripts/check-operations-feed-clarity-surgical-fixes-v349261.mjs', 'Restored check is registered');
// Run the existing executable route/search behavioral suite, not just source text.
const output = execFileSync(process.execPath,['scripts/check-operations-feed-source-navigation-and-search.mjs'], {encoding:'utf8'});
check(/PASS \d+\/\d+/.test(output), 'Executable feed navigation and search suite passes');
console.log(`Operations Feed clarity: ${checks}/${checks} PASS`);
