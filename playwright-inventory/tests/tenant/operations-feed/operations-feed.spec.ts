import { test, expect, type Page } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 8 — Real-time Operations Feed. GENERATED_UNRUN: source-inspected only.
// Frontend: pages/RealTimeOperationsFeedPage.tsx, backend:
// routes/operationalActionCenter.js and validations/operationalActionCenter.validation.js.
// Backend responses are synthetic and confined to page.route. No feed write endpoints
// exist in the page; all requests for this page should remain GET.
const nowIso = () => new Date().toISOString();
const priorIso = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
type FeedItem = {
  timeline_item_id: string; timeline_domain: string; timeline_type: string;
  urgency?: string; event_status?: string; title?: string; summary?: string;
  summary_key?: string; source_reference?: { source_type?: string; source_id?: string };
  correlation_id?: string; priority_score?: number; recommended_next_step?: string;
  observed_at?: string; updated_at?: string; source_surface?: string;
  delivery_event_name?: string; delivery_target?: string; delivery_attempt_count?: number;
  next_retry_at?: string; payload_material_present?: boolean; payload_material_redacted?: boolean;
};
const syntheticTimeline = (): FeedItem[] => [
  {timeline_item_id:'pw-feed-alert-001',timeline_domain:'alerts',timeline_type:'action_center_item',
    urgency:'critical',event_status:'open',title:'Synthetic critical shelf alert',summary:'Shelf R-1 needs attention',
    source_reference:{source_type:'alert',source_id:'pw-alert-17'},correlation_id:'pw-alert-correlation',
    priority_score:97,recommended_next_step:'Review the alert',observed_at:nowIso()},
  {timeline_item_id:'pw-feed-exec-002',timeline_domain:'execution',timeline_type:'action_center_item',
    urgency:'high',event_status:'blocked',title:'Synthetic execution delay',summary:'Task staging delayed',
    source_reference:{source_type:'execution_task',source_id:'pw-task-2'},correlation_id:'pw-exec-correlation',
    priority_score:82,recommended_next_step:'Review execution task',observed_at:priorIso(3)},
  {timeline_item_id:'pw-feed-delivery-003',timeline_domain:'integration',timeline_type:'event_delivery_disruption',
    urgency:'medium',event_status:'failed',title:'Synthetic webhook delivery failure',
    summary_key:'operations_feed_delivery_failed_summary',delivery_event_name:'synthetic.stock.updated',
    delivery_target:'Synthetic endpoint',delivery_attempt_count:3,next_retry_at:nowIso(),
    payload_material_present:true,payload_material_redacted:true,source_surface:'/system-context?section=webhooks',
    correlation_id:'pw-delivery-correlation',observed_at:priorIso(30)},
  {timeline_item_id:'pw-feed-inventory-004',timeline_domain:'inventory',timeline_type:'event_stream_message',
    urgency:'low',event_status:'completed',title:'Synthetic inventory movement',summary:'Shipment recorded',
    source_surface:'/stock-movements?movement_id=pw-movement',observed_at:priorIso(50)},
  {timeline_item_id:'pw-feed-fallback-005',timeline_domain:'integration',timeline_type:'event_stream_message',
    urgency:'low',event_status:'pending',title:'Synthetic event with no destination',
    source_surface:'https://untrusted.example.invalid/records',observed_at:nowIso()}
];
type FeedTimeline = FeedItem[];
const feedDomains = ['alerts','inventory','procurement','reservation','execution','optimization','control_tower','decision_intelligence','ai_governance','financial','integration','audit','multi_domain'];
function feedPayload(timeline: FeedTimeline = syntheticTimeline(), domains = feedDomains) {
  return {
    generated_at:nowIso(),non_mutation_guarantee:true,
    definition:{ foundation_type:'operational_event_coordination',execution_mode:'read_only',
      safety_contract:{read_only:true,tenant_isolated:true,permission_gated:true,human_action_only:true,approval_gated_when_required:true}},
    access:{can_read_event_bus:true,can_read_alerts:true,can_read_execution_tasks:true,can_view_diagnostics:true,
      available_event_domains:domains},
    filters:{event_domain:null,urgency:null,limit:75},
    summary:{total_timeline_items:timeline.length,critical_events:1,blocked_or_failed_events:2},
    guidance:{coordination_guidance:'Open source pages for review',incident_timeline_guidance:'Work events stay read-only',
      disruption_guidance:'Investigate the underlying failed operation'},
    timeline
  };
}
const feedCards = (page: Page) => page.locator('.operations-feed-page__timeline-card');
const feedCard = (page: Page, id: string) => page.locator(`#timeline-item-${id}`);
async function fixtureFeed(page: Page, items?: FeedTimeline, domains?: string[]) {
  await page.route('**/operational-action-center/realtime-event-coordination-summary?*',route => {
    if (route.request().method() !== 'GET') return route.abort();
    return fulfillJson(route,feedPayload(items,domains));
  });
}
async function openFeed(page: Page, url = '/real-time-operations-feed') {
  await loginAsTenant(page);
  await fixtureFeed(page);
  await page.goto(url);
  await expect(page.locator('.operations-feed-page')).toBeVisible();
  await expect(page.getByText('Operations feed controls')).toBeVisible();
  await expect(feedCards(page)).toHaveCount(5);
}

 test.describe('Operations Feed — read-only coordination, filters and source routing', () => {
  test.beforeEach(async ({page}) => { await openFeed(page); });

  test('TFEED-001 overview identifies read-only guidance and links to Action Center',async ({page}) => {
    await expect(page.getByRole('heading',{name:'Operations Feed'})).toBeVisible();
    await expect(page.locator('.operations-feed-page')).toContainText('Guidance only');
    await expect(page.getByRole('link',{name:'Open Action Center'})).toHaveAttribute('href','/action-center');
    await expect(page.getByText('Safe to review without editing')).toBeVisible();
  });

  test('TFEED-002 overview counts critical and blocked or failed visible entries',async ({page}) => {
    await expect(feedCards(page)).toHaveCount(5);
    const stats = page.getByLabel('Operations feed overview');
    await expect(stats).toContainText('Critical items');
    await expect(stats).toContainText('Blocked or failed');
    await expect(stats).toContainText('5');
    await expect(stats).toContainText('1');
    await expect(stats).toContainText('2');
  });

  test('TFEED-003 initial summary GET uses 75-item limit and no write method',async ({page}) => {
    const seen: URL[] = []; const methods: string[] = [];
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*', route => {
      seen.push(new URL(route.request().url())); methods.push(route.request().method());
      return fulfillJson(route,feedPayload());
    });
    await page.getByRole('button',{name:'Refresh feed'}).click();
    await expect.poll(()=>seen.length).toBeGreaterThan(0);
    expect(seen.at(-1)?.searchParams.get('limit')).toBe('75');
    expect(methods.every(method=>method==='GET')).toBe(true);
  });

  test('TFEED-004 work area filter updates query sent to coordination endpoint',async ({page}) => {
    let requested: URL | undefined;
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',route => {
      requested = new URL(route.request().url()); return fulfillJson(route,feedPayload());
    });
    await page.getByLabel('Work area').selectOption('alerts');
    await expect(page).toHaveURL(/event_domain=alerts/);
    await expect.poll(()=>requested?.searchParams.get('event_domain')).toBe('alerts');
  });

  test('TFEED-005 urgency filter requests backend critical-only feed',async ({page}) => {
    let requested: URL | undefined;
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',route => {
      requested = new URL(route.request().url()); return fulfillJson(route,feedPayload());
    });
    await page.getByLabel('Urgency').selectOption('critical');
    await expect(page).toHaveURL(/urgency=critical/);
    await expect.poll(()=>requested?.searchParams.get('urgency')).toBe('critical');
  });

  test('TFEED-006 combined deep-link filters appear selected after reload',async ({page}) => {
    await page.goto('/real-time-operations-feed?event_domain=integration&urgency=medium&search=webhook&time=24h&view=new');
    await expect(page.getByLabel('Work area')).toHaveValue('integration');
    await expect(page.getByLabel('Urgency')).toHaveValue('medium');
    await expect(page.getByLabel('Search current feed')).toHaveValue('webhook');
    await expect(page.getByLabel('Time')).toHaveValue('24h');
    await expect(page.getByLabel('View')).toHaveValue('new');
    await page.reload();
    await expect(page.getByLabel('Search current feed')).toHaveValue('webhook');
  });

  test('TFEED-007 invalid query settings use safe all-values rather than unsupported options',async ({page}) => {
    await page.goto('/real-time-operations-feed?event_domain=made_up&urgency=urgent&time=decade&view=hidden');
    await expect(page.getByLabel('Work area')).toHaveValue('all');
    await expect(page.getByLabel('Urgency')).toHaveValue('all');
    await expect(page.getByLabel('Time')).toHaveValue('all');
    await expect(page.getByLabel('View')).toHaveValue('all');
  });

  test('TFEED-008 title search narrows timeline without losing unrelated backend data',async ({page}) => {
    await page.getByLabel('Search current feed').fill('critical shelf');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-alert-001')).toBeVisible();
  });

  test('TFEED-009 summary search is case-insensitive',async ({page}) => {
    await page.getByLabel('Search current feed').fill('STAGING DELAYED');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-exec-002')).toBeVisible();
  });

  test('TFEED-010 exact timeline and correlation IDs are searchable',async ({page}) => {
    await page.getByLabel('Search current feed').fill('pw-delivery-correlation');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-delivery-003')).toBeVisible();
    await page.getByLabel('Search current feed').fill('pw-feed-alert-001');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-alert-001')).toBeVisible();
  });

  test('TFEED-011 source record identifier is included in local search',async ({page}) => {
    await page.getByLabel('Search current feed').fill('pw-task-2');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-exec-002')).toBeVisible();
  });

  test('TFEED-012 unmatched local search shows filter-aware empty guidance',async ({page}) => {
    await page.getByLabel('Search current feed').fill('no-matching-synthetic-event-999');
    await expect(feedCards(page)).toHaveCount(0);
    await expect(page.getByText('No matching items')).toBeVisible();
    await expect(page.getByText('No items in the current feed match your search, time, or view filters.')).toBeVisible();
  });

  test('TFEED-013 clearing local search restores original timeline',async ({page}) => {
    await page.getByLabel('Search current feed').fill('Shelf R-1');
    await expect(feedCards(page)).toHaveCount(1);
    await page.getByLabel('Search current feed').clear();
    await expect(feedCards(page)).toHaveCount(5);
    await expect(page).not.toHaveURL(/search=/);
  });

  test('TFEED-014 last-24-hour filter excludes older source events',async ({page}) => {
    await page.getByLabel('Time').selectOption('24h');
    await expect(page).toHaveURL(/time=24h/);
    await expect(feedCards(page)).toHaveCount(3);
    await expect(feedCard(page,'pw-feed-delivery-003')).toHaveCount(0);
    await expect(feedCard(page,'pw-feed-inventory-004')).toHaveCount(0);
  });

  test('TFEED-015 today filter includes only local-day events',async ({page}) => {
    const today = nowIso();
    const yesterday = priorIso(48);
    await fixtureFeed(page,[
      {...syntheticTimeline()[0],observed_at:today},
      {...syntheticTimeline()[1],observed_at:yesterday}
    ]);
    await page.reload();
    await page.getByLabel('Time').selectOption('today');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-alert-001')).toBeVisible();
  });

  test('TFEED-016 timestamp-less event is omitted from time-scoped results',async ({page}) => {
    await fixtureFeed(page,[{...syntheticTimeline()[0],observed_at:undefined,updated_at:undefined}]);
    await page.reload();
    await expect(feedCards(page)).toHaveCount(1);
    await page.getByLabel('Time').selectOption('24h');
    await expect(feedCards(page)).toHaveCount(0);
  });

  test('TFEED-017 first visit does not mark older events as newly seen',async ({page}) => {
    await expect(page.getByLabel('Operations feed overview')).toContainText('No earlier visit is recorded in this browser yet');
    await expect(page.locator('.operations-feed-page__badge--new')).toHaveCount(0);
  });

  test('TFEED-018 persisted last-visit timestamp marks newer items in new-only view',async ({page}) => {
    const key = await page.evaluate(() => Object.keys(localStorage).find(k=>k.startsWith('inventory_operations_feed_last_seen:')));
    expect(key).toBeTruthy();
    await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:key!,value:priorIso(10)});
    await page.goto('/real-time-operations-feed?view=new');
    await expect(page.getByLabel('View')).toHaveValue('new');
    await expect(feedCards(page)).toHaveCount(3);
    await expect(feedCard(page,'pw-feed-alert-001').locator('.operations-feed-page__badge--new')).toContainText('New');
    await expect(feedCard(page,'pw-feed-delivery-003')).toHaveCount(0);
  });

  test('TFEED-019 focused timeline item requests exactly one backend item',async ({page}) => {
    let requested: URL | undefined;
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',route => {
      requested = new URL(route.request().url()); return fulfillJson(route,feedPayload());
    });
    await page.goto('/real-time-operations-feed?timeline_item_id=pw-feed-alert-001');
    await expect.poll(()=>requested?.searchParams.get('timeline_item_id')).toBe('pw-feed-alert-001');
    expect(requested?.searchParams.get('limit')).toBe('1');
  });

  test('TFEED-020 focused timeline deep link excludes unrelated returned items',async ({page}) => {
    await page.goto('/real-time-operations-feed?timeline_item_id=pw-feed-alert-001');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-alert-001')).toHaveClass(/focused/);
    await expect(feedCard(page,'pw-feed-exec-002')).toHaveCount(0);
  });

  test('TFEED-021 diagnostics permission exposes technical event details and source fields',async ({page}) => {
    const details = feedCard(page,'pw-feed-alert-001').getByText('Technical event details');
    await expect(details).toBeVisible();
    await details.click();
    await expect(feedCard(page,'pw-feed-alert-001')).toContainText('pw-alert-17');
    await expect(feedCard(page,'pw-feed-alert-001')).toContainText('pw-alert-correlation');
  });

  test('TFEED-022 without tenant diagnostics read, technical event details are hidden',async ({page}) => {
    const original = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions')||'{}'));
    await page.route('**/permissions/me',route=>fulfillJson(route,{...original,scope:'tenant',permissions:['operational_action_center.read','alerts.read']}));
    await page.reload();
    await expect(feedCards(page)).toHaveCount(5);
    await expect(page.getByText('Technical event details')).toHaveCount(0);
  });

  test('TFEED-023 redacted payload metadata never claims raw payload is readable',async ({page}) => {
    const card = feedCard(page,'pw-feed-delivery-003');
    await card.getByText('Technical event details').click();
    await expect(card).toContainText('Not included in this feed');
    await expect(card).not.toContainText('Reported as present');
  });

  test('TFEED-024 delivery disruption explains multiple failed delivery attempts',async ({page}) => {
    const card = feedCard(page,'pw-feed-delivery-003');
    await expect(card).toContainText('was not delivered to Synthetic endpoint after 3 delivery attempts.');
    await expect(card).toContainText('Attempts:');
  });

  test('TFEED-025 disrupted delivery shows planned retry metadata',async ({page}) => {
    const card = feedCard(page,'pw-feed-delivery-003');
    await expect(card).toContainText('Next planned retry:');
    await expect(card).toContainText('Status: Failed');
  });

  test('TFEED-026 alert action item opens the exact unresolved alert',async ({page}) => {
    await expect(feedCard(page,'pw-feed-alert-001').getByRole('link',{name:'Open alert'}))
      .toHaveAttribute('href','/alerts?resolved=false&alert_id=pw-alert-17');
  });

  test('TFEED-027 execution item opens its exact task details',async ({page}) => {
    await expect(feedCard(page,'pw-feed-exec-002').getByRole('link',{name:'Open execution task'}))
      .toHaveAttribute('href','/execution-tasks?task_id=pw-task-2');
  });

  test('TFEED-028 intelligence item sends human to correlation-scoped review',async ({page}) => {
    await fixtureFeed(page,[{...syntheticTimeline()[0], timeline_item_id:'pw-feed-review-028',timeline_domain:'decision_intelligence',
      correlation_id:'pw-source-action-28',title:'Synthetic review requested'}]);
    await page.reload();
    await expect(feedCard(page,'pw-feed-review-028').getByRole('link',{name:'Open review'}))
      .toHaveAttribute('href','/intelligence-review?source_action_id=pw-source-action-28');
  });

  test('TFEED-029 legacy control tower source URL maps to existing Action Center',async ({page}) => {
    await fixtureFeed(page,[{...syntheticTimeline()[3], timeline_item_id:'pw-feed-legacy-029',source_surface:'/control-tower'}]);
    await page.reload();
    await expect(feedCard(page,'pw-feed-legacy-029').getByRole('link',{name:'Open source page'}))
      .toHaveAttribute('href','/action-center');
  });

  test('TFEED-030 absolute external source URL is not rendered as actionable link',async ({page}) => {
    const card = feedCard(page,'pw-feed-fallback-005');
    await expect(card.getByRole('link',{name:'Open source page'})).toHaveCount(0);
    await expect(card).toContainText('does not currently have a tenant working page');
  });

  test('TFEED-031 unknown source route remains advisory instead of navigating outside tenant app',async ({page}) => {
    await fixtureFeed(page,[{...syntheticTimeline()[4], timeline_item_id:'pw-feed-unknown-031',source_surface:'/unexpected-admin-route'}]);
    await page.reload();
    const card = feedCard(page,'pw-feed-unknown-031');
    await expect(card.getByRole('link',{name:'Open source page'})).toHaveCount(0);
    await expect(card).toContainText('does not currently have a tenant working page');
  });

  test('TFEED-032 failed refresh preserves last loaded snapshot with explicit stale warning',async ({page}) => {
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',route =>
      fulfillJson(route,{error:'Synthetic service unavailable',message:'Synthetic service unavailable'},503));
    await page.getByRole('button',{name:'Refresh feed'}).click();
    await expect(page.getByText('Refresh failed')).toBeVisible();
    await expect(page.getByText('Showing the last available operations-feed snapshot. Try refreshing again before acting on time-sensitive information.')).toBeVisible();
    await expect(feedCards(page)).toHaveCount(5);
  });

  test('TFEED-033 initial load failure shows retry entry point instead of inventing events',async ({page}) => {
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',route=>
      fulfillJson(route,{error:'Synthetic feed access denied',message:'Synthetic feed access denied'},403));
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('The operations feed could not be loaded');
    await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
    await expect(feedCards(page)).toHaveCount(0);
  });

  test('TFEED-034 empty backend timeline displays safe empty-state message',async ({page}) => {
    await fixtureFeed(page,[]);
    await page.reload();
    await expect(feedCards(page)).toHaveCount(0);
    await expect(page.getByText('No matching items')).toBeVisible();
    await expect(page.getByText('No work or integration event matched the selected work area and urgency.')).toBeVisible();
  });

  test('TFEED-035 feed refresh performs only read-only summary GET calls', async ({page}) => {
    const summaryMethods: string[] = [];
    const unexpectedWrites: string[] = [];
    page.on('request', request => {
      if (/\/operational-action-center\/realtime-event-coordination-summary\?/.test(request.url())) {
        summaryMethods.push(request.method());
      }
      if (!['GET','OPTIONS'].includes(request.method())) unexpectedWrites.push(`${request.method()} ${request.url()}`);
    });
    await page.getByRole('button',{name:'Refresh feed'}).click();
    await expect.poll(() => summaryMethods.length).toBeGreaterThan(0);
    expect(summaryMethods.every(method => method === 'GET')).toBe(true);
    expect(unexpectedWrites).toEqual([]);
    await expect(feedCards(page)).toHaveCount(5);
  });

  test('TFEED-036 backend allowed domains restrict Work area options',async ({page}) => {
    await fixtureFeed(page, syntheticTimeline(), ['alerts','execution']);
    await page.reload();
    const choices = await page.getByLabel('Work area').locator('option').evaluateAll(options =>
      options.map(option => (option as HTMLOptionElement).value));
    expect(choices).toEqual(['all','alerts','execution']);
    await expect(page.getByLabel('Work area')).toHaveValue('all');
  });

  test('TFEED-037 deep-linked unauthorized domain is cleared after source access arrives',async ({page}) => {
    await fixtureFeed(page, syntheticTimeline(), ['alerts']);
    await page.goto('/real-time-operations-feed?event_domain=integration&urgency=high');
    await expect(page.getByLabel('Work area')).toHaveValue('all');
    await expect(page).not.toHaveURL(/event_domain=/);
    await expect(page).toHaveURL(/urgency=high/);
    await expect(page.getByLabel('Work area').locator('option[value="integration"]')).toHaveCount(0);
  });

  test('TFEED-038 missing backend safety contract is described rather than assumed',async ({page}) => {
    const payload = feedPayload();
    delete (payload.definition as {safety_contract?: Record<string,boolean>}).safety_contract;
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',r=>fulfillJson(r,payload));
    await page.reload();
    await expect(page.getByText('Safety information was not returned by the backend.')).toBeVisible();
    await expect(page.locator('.operations-feed-page__safety-card')).toHaveCount(0);
  });

  test('TFEED-039 only true backend safety entries are presented as guaranteed',async ({page}) => {
    const payload = feedPayload();
    payload.definition.safety_contract = {
      read_only:true, tenant_isolated:false, permission_gated:true,
      human_action_only:false, approval_gated_when_required:false
    };
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',r=>fulfillJson(r,payload));
    await page.reload();
    const safety = page.locator('.operations-feed-page__safety-card');
    await expect(safety).toHaveCount(2);
    await expect(safety).toContainText(['Nothing is changed here','Role and permission controlled']);
    await expect(page.getByText('Only your company’s items')).toHaveCount(0);
  });

  test('TFEED-040 whitelisted tenant drill-down preserves its original URL parameters',async ({page}) => {
    await fixtureFeed(page,[{...syntheticTimeline()[3], timeline_item_id:'pw-feed-link-040',
      source_surface:'/system-context?section=webhooks&focus=failed%2Fretry'}]);
    await page.reload();
    await expect(feedCard(page,'pw-feed-link-040').getByRole('link',{name:'Open source page'}))
      .toHaveAttribute('href','/system-context?section=webhooks&focus=failed%2Fretry');
  });

  test('TFEED-041 unsafe protocol-relative and backslash source surfaces have no link',async ({page}) => {
    await fixtureFeed(page,[
      {...syntheticTimeline()[3],timeline_item_id:'pw-feed-unsafe-1',source_surface:'//attacker.example.invalid/path'},
      {...syntheticTimeline()[3],timeline_item_id:'pw-feed-unsafe-2',source_surface:'/alerts\\attacker.example.invalid'}
    ]);
    await page.reload();
    for (const id of ['pw-feed-unsafe-1','pw-feed-unsafe-2']) {
      const card=feedCard(page,id);
      await expect(card).toBeVisible();
      await expect(card.getByRole('link',{name:'Open source page'})).toHaveCount(0);
      await expect(card).toContainText('does not currently have a tenant working page');
    }
  });

  test('TFEED-042 initial unresolved fetch shows a loading state without fabricated timeline',async ({page}) => {
    let release: (()=>void) | undefined;
    let started: (()=>void) | undefined;
    const requestStarted = new Promise<void>(resolve=>{started=resolve;});
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',async route=>{
      started?.();
      await new Promise<void>(resolve=>{release=resolve;});
      await fulfillJson(route,feedPayload());
    });
    try {
      await page.reload({waitUntil:'domcontentloaded'});
      await requestStarted;
      await expect(page.getByRole('status').filter({hasText:'Loading the latest operations feed'})).toBeVisible();
      await expect(feedCards(page)).toHaveCount(0);
    } finally { release?.(); }
    await expect(feedCards(page)).toHaveCount(5);
  });

  test('TFEED-043 refresh control disables during pending request and restores afterwards',async ({page}) => {
    let release: (()=>void) | undefined;
    let started: (()=>void) | undefined;
    const requestStarted = new Promise<void>(resolve=>{started=resolve;});
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',async route=>{
      started?.();
      await new Promise<void>(resolve=>{release=resolve;});
      await fulfillJson(route,feedPayload());
    });
    try {
      await page.getByRole('button',{name:'Refresh feed'}).click();
      await requestStarted;
      await expect(page.getByRole('button',{name:'Refreshing…'})).toBeDisabled();
    } finally { release?.(); }
    await expect(page.getByRole('button',{name:'Refresh feed'})).toBeEnabled();
  });

  test('TFEED-044 refreshed snapshot changes counters and operator guidance without writing',async ({page}) => {
    const methods: string[]=[];
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',route=>{
      methods.push(route.request().method());
      const payload=feedPayload([syntheticTimeline()[0]]);
      payload.guidance.coordination_guidance='Synthetic refreshed operator instruction';
      return fulfillJson(route,payload);
    });
    await page.getByRole('button',{name:'Refresh feed'}).click();
    await expect(feedCards(page)).toHaveCount(1);
    await expect(page.getByText('Synthetic refreshed operator instruction')).toBeVisible();
    await expect(page.getByLabel('Operations feed overview')).toContainText('1');
    expect(methods).toEqual(['GET']);
  });

  test('TFEED-045 alert without source record ID links to unresolved alert search',async ({page}) => {
    await fixtureFeed(page,[{...syntheticTimeline()[0],timeline_item_id:'pw-feed-alert-missing-045',
      source_reference:{source_type:'alert'},title:'Synthetic damaged case',summary:'Missing batch A+B'}]);
    await page.reload();
    await expect(feedCard(page,'pw-feed-alert-missing-045').getByRole('link',{name:'Open alert'}))
      .toHaveAttribute('href','/alerts?resolved=false&search=Missing+batch+A%2BB');
  });

  test('TFEED-046 Action Center correlation link encodes special source action ID exactly',async ({page}) => {
    await fixtureFeed(page,[{...syntheticTimeline()[0],timeline_item_id:'pw-feed-action-046',
      correlation_id:'case:14/A & B'}]);
    await page.reload();
    await expect(feedCard(page,'pw-feed-action-046').getByRole('link',{name:'Open in Action Center'}))
      .toHaveAttribute('href','/action-center?source_action_id=case%3A14%2FA+%26+B');
  });

});

// Batch 181 — Source-inspected Operations Feed display, time, search, and URL-safety boundaries.
// Every case uses intercepted, read-only GET evidence. GENERATED_UNRUN, not runtime acceptance.
async function singleFeed181(page: Page, id: string, changes: Partial<FeedItem> = {}) {
  await fixtureFeed(page, [{...syntheticTimeline()[3], ...changes, timeline_item_id:id}]);
  await page.reload();
  const card = feedCard(page,id);
  await expect(card).toBeVisible();
  return card;
}

test.describe('Operations Feed — original-source text, search, timestamp and routing boundaries B181', () => {
  test.beforeEach(async ({page}) => { await openFeed(page); });

  test('TFEED-047 item without title or event type renders safe untitled fallback', async ({page}) => {
    const card = await singleFeed181(page,'pw-b181-047',{title:undefined,event_type:undefined});
    await expect(card.getByRole('heading',{name:'Untitled item'})).toBeVisible();
  });

  test('TFEED-048 source event type becomes a readable heading when title is absent', async ({page}) => {
    const card = await singleFeed181(page,'pw-b181-048',{title:'',event_type:'inventory_reconcile_due'});
    await expect(card.getByRole('heading',{name:'Inventory Reconcile Due'})).toBeVisible();
  });

  test('TFEED-049 supplied human-readable title takes precedence over event type', async ({page}) => {
    const card = await singleFeed181(page,'pw-b181-049',{title:'Synthetic reviewed event',event_type:'inventory_reconcile_due'});
    await expect(card.getByRole('heading',{name:'Synthetic reviewed event'})).toBeVisible();
    await expect(card.getByRole('heading',{name:'Inventory Reconcile Due'})).toHaveCount(0);
  });

  test('TFEED-050 missing source summary explicitly reports no summary', async ({page}) => {
    const card = await singleFeed181(page,'pw-b181-050',{summary:undefined,summary_key:undefined});
    await expect(card.locator('.operations-feed-page__item-summary').first()).toHaveText('No summary was provided.');
  });

  test('TFEED-051 whitespace-only summary is treated as absent', async ({page}) => {
    const card = await singleFeed181(page,'pw-b181-051',{summary:'   ',summary_key:undefined});
    await expect(card.locator('.operations-feed-page__item-summary').first()).toHaveText('No summary was provided.');
  });

  test('TFEED-052 absent recommended next step retains safe human follow-up guidance', async ({page}) => {
    const card = await singleFeed181(page,'pw-b181-052',{recommended_next_step:undefined});
    await expect(card.locator('.operations-feed-page__next-step')).toContainText('Open the source page and review the item there.');
  });

  test('TFEED-053 explicit recommended next step replaces generic guidance', async ({page}) => {
    const card = await singleFeed181(page,'pw-b181-053',{recommended_next_step:'Ask the shift supervisor to review batch PW-181'});
    await expect(card.locator('.operations-feed-page__next-step')).toContainText('Ask the shift supervisor to review batch PW-181');
    await expect(card.locator('.operations-feed-page__next-step')).not.toContainText('Open the source page and review');
  });

  test('TFEED-054 absent coordination guidance uses source-defined follow-up explanation', async ({page}) => {
    const data=feedPayload(); data.guidance.coordination_guidance='  ';
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',r=>fulfillJson(r,data));
    await page.reload();
    await expect(page.getByText('Open the source page for the item and complete the work there.')).toBeVisible();
  });

  test('TFEED-055 absent incident guidance explains read-only combined event context', async ({page}) => {
    const data=feedPayload(); data.guidance.incident_timeline_guidance='';
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',r=>fulfillJson(r,data));
    await page.reload();
    await expect(page.getByText('The feed combines permitted work items and integration event summaries.')).toBeVisible();
  });

  test('TFEED-056 absent disruption guidance points to a human source workflow', async ({page}) => {
    const data=feedPayload(); data.guidance.disruption_guidance='   ';
    await page.route('**/operational-action-center/realtime-event-coordination-summary?*',r=>fulfillJson(r,data));
    await page.reload();
    await expect(page.getByText('Review the source workflow and coordinate a human response.')).toBeVisible();
  });

  test('TFEED-057 operator search also matches recommended next-step text', async ({page}) => {
    await page.getByLabel('Search current feed').fill('review execution task');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-exec-002')).toBeVisible();
  });

  test('TFEED-058 operator search includes raw source event type', async ({page}) => {
    await singleFeed181(page,'pw-b181-058',{event_type:'integration_delivery_backpressure'});
    await page.getByLabel('Search current feed').fill('integration_delivery_backpressure');
    await expect(feedCards(page)).toHaveCount(1);
  });

  test('TFEED-059 operator search includes event lifecycle status', async ({page}) => {
    await page.getByLabel('Search current feed').fill('completed');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-inventory-004')).toBeVisible();
  });

  test('TFEED-060 operator search includes exact source record type', async ({page}) => {
    await page.getByLabel('Search current feed').fill('execution_task');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-exec-002')).toBeVisible();
  });

  test('TFEED-061 operator search includes delivery event name', async ({page}) => {
    await page.getByLabel('Search current feed').fill('synthetic.stock.updated');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-delivery-003')).toBeVisible();
  });

  test('TFEED-062 operator search includes integration delivery target', async ({page}) => {
    await page.getByLabel('Search current feed').fill('Synthetic endpoint');
    await expect(feedCards(page)).toHaveCount(1);
    await expect(feedCard(page,'pw-feed-delivery-003')).toBeVisible();
  });

  test('TFEED-063 operator search matches normalized multiword domain', async ({page}) => {
    await singleFeed181(page,'pw-b181-063',{timeline_domain:'decision_intelligence'});
    await page.getByLabel('Search current feed').fill('decision intelligence');
    await expect(feedCards(page)).toHaveCount(1);
  });

  test('TFEED-064 time filtering considers recent update over stale observation', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-064',{observed_at:priorIso(60),updated_at:nowIso()});
    await page.getByLabel('Time').selectOption('24h');
    await expect(card).toBeVisible();
  });

  test('TFEED-065 valid update preserves item when observation time is malformed', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-065',{observed_at:'invalid-observation',updated_at:nowIso()});
    await page.getByLabel('Time').selectOption('24h');
    await expect(card).toBeVisible();
  });

  test('TFEED-066 invalid observation and update timestamps do not pass time filter', async ({page}) => {
    await singleFeed181(page,'pw-b181-066',{observed_at:'broken-one',updated_at:'broken-two'});
    await page.getByLabel('Time').selectOption('24h');
    await expect(feedCards(page)).toHaveCount(0);
    await expect(page.getByText('No matching items')).toBeVisible();
  });

  test('TFEED-067 missing timestamps show honest not-reported evidence in all-time view', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-067',{observed_at:undefined,updated_at:undefined});
    await expect(card.locator('.operations-feed-page__badge-row')).toContainText('Observed Not reported');
  });

  test('TFEED-068 missing urgency shows unknown label rather than inventing critical priority', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-068',{urgency:undefined});
    await expect(card.locator('.operations-feed-page__item-header .operations-feed-page__badge')).toHaveText('Unknown');
    await expect(card).not.toHaveClass(/timeline-card--critical/);
  });

  test('TFEED-069 missing event status is explicitly labelled unknown', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-069',{event_status:undefined});
    await expect(card.locator('.operations-feed-page__badge-row')).toContainText('Status: Unknown');
  });

  test('TFEED-070 in-progress status uses an elevated status visual treatment', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-070',{event_status:'in_progress'});
    await expect(card.locator('.operations-feed-page__badge-row .operations-feed-page__badge--high')).toContainText('In progress');
  });

  test('TFEED-071 failed status uses the critical status visual treatment', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-071',{event_status:'failed'});
    await expect(card.locator('.operations-feed-page__badge-row .operations-feed-page__badge--critical')).toContainText('Failed');
  });

  test('TFEED-072 available nonredacted payload is described only as reported present', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-072',{payload_material_present:true,payload_material_redacted:false});
    await card.getByText('Technical event details').click();
    await expect(card.locator('.operations-feed-page__details-grid')).toContainText('Reported as present');
  });

  test('TFEED-073 redacted payload without presence flag still hides content', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-073',{payload_material_present:false,payload_material_redacted:true});
    await card.getByText('Technical event details').click();
    await expect(card.locator('.operations-feed-page__details-grid')).toContainText('Not included in this feed');
  });

  test('TFEED-074 one delivery attempt uses correct singular disruption wording', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-074',{...syntheticTimeline()[2],delivery_attempt_count:1});
    await expect(card.locator('.operations-feed-page__item-summary').first()).toContainText('after one delivery attempt.');
  });

  test('TFEED-075 zero delivery attempts avoids falsely claiming an attempted delivery', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-075',{...syntheticTimeline()[2],delivery_attempt_count:0});
    await expect(card.locator('.operations-feed-page__item-summary').first()).not.toContainText('after');
    await expect(card.locator('.operations-feed-page__badge-row')).toContainText('Attempts: 0');
  });

  test('TFEED-076 malformed delivery attempt count suppresses numeric count badge', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-076',{...syntheticTimeline()[2],delivery_attempt_count:'invalid' as unknown as number});
    await expect(card.locator('.operations-feed-page__badge-row')).not.toContainText('Attempts:');
    await expect(card.locator('.operations-feed-page__item-summary').first()).not.toContainText('after');
  });

  test('TFEED-077 blocked delivery with no target uses explicit configured-destination fallback', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-077',{...syntheticTimeline()[2],summary_key:'operations_feed_delivery_blocked_summary',delivery_target:undefined,delivery_attempt_count:undefined});
    await expect(card.locator('.operations-feed-page__item-summary').first())
      .toContainText('could not be delivered to the configured destination.');
  });

  test('TFEED-078 source URL fragment is never accepted as an internal navigation link', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-078',{source_surface:'/stock#private-fragment'});
    await expect(card.getByRole('link',{name:'Open source page'})).toHaveCount(0);
    await expect(card).toContainText('does not currently have a tenant working page');
  });

  test('TFEED-079 source URL with a newline is rejected instead of becoming a router link', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-079',{source_surface:'/stock\n/alerts'});
    await expect(card.getByRole('link',{name:'Open source page'})).toHaveCount(0);
  });

  test('TFEED-080 source URL longer than safety limit cannot become actionable', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-080',{source_surface:'/stock?ref='+ 'a'.repeat(2050)});
    await expect(card.getByRole('link',{name:'Open source page'})).toHaveCount(0);
  });

  test('TFEED-081 legacy operational summary source routes to current Action Center', async ({page}) => {
    const card=await singleFeed181(page,'pw-b181-081',{source_surface:'/operational-action-center/summary'});
    await expect(card.getByRole('link',{name:'Open source page'})).toHaveAttribute('href','/action-center');
  });
});
