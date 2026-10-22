import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isUnusualOutboundTier, feedRefreshStatus } from '../src/lib/feedAnomalyDisplay.ts';
const root=process.cwd();
const src=(file)=>fs.readFileSync(path.join(root,file),'utf8');
let checks=0;
const check=(condition,description)=>{assert.ok(condition,description);checks++};
for (const input of ['normal','NORMAL',' normal ', '', null,undefined,'bogus',0,'none']) {
  check(!isUnusualOutboundTier(input),`Non-actionable tier incorrectly triggers anomaly guidance: ${String(input)}`);
}
for (const input of ['watch','high','critical',' WATCH ','CRITICAL','High']) {
  check(isUnusualOutboundTier(input),`Unusual tier suppressed: ${input}`);
}
check(feedRefreshStatus(false,false)==='Auto-refresh on','Successful idle state labels auto-refresh');
check(feedRefreshStatus(false,true)==='Refreshing…','Fetching state advertises actual refresh');
check(feedRefreshStatus(true,false)==='Refresh failed','Background refresh error is not shown as auto-refresh on');
check(feedRefreshStatus(true,true)==='Refreshing…','Retrying refresh is shown as in-flight');
const insights=src('src/pages/InsightsPage.tsx');
const feed=src('src/pages/RealTimeOperationsFeedPage.tsx');
const catalog=src('src/i18n/tenantUiTranslations.ts');
const ci=src('.github/workflows/frontend-validation.yml');
check(insights.includes('isUnusualOutboundTier(row.anomaly_tier)'), 'Action list and anomaly panel only use meaningful tiers');
check(!insights.includes("String(row.anomaly_tier || '').toLowerCase() !== 'normal'"), 'Unrecognized tiers no longer treated as actionable anomalies');
check(insights.includes('ui("No unusual outbound activity detected.")'),'Empty state accurately explains there is no unusual activity');
check(feed.includes('feedRefreshStatus(feedQuery.isError, feedQuery.isFetching)'), 'Feed checks background refresh errors before claiming freshness');
check(feed.includes('feedQuery.dataUpdatedAt ?'), 'Feed shows last successful fetch timestamp');
check(feed.includes('formatDateTime(new Date(feedQuery.dataUpdatedAt).toISOString(), locale, ui)'), 'Last updated is localized, using only successful fetch timestamp');
check(catalog.includes('"No unusual outbound activity detected."'), 'New empty state has five-language translation');
check(ci.includes('npm run check:feed-anomaly-freshness'), 'Regression runs in CI');
console.log(`Feed freshness and anomaly tier regression: ${checks}/${checks} PASS`);
