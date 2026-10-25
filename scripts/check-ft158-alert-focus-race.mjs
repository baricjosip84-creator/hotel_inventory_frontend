import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const layout = fs.readFileSync('src/layouts/AppLayout.tsx','utf8');
const alerts = fs.readFileSync('src/pages/AlertsPage.tsx','utf8');
const dashboard = fs.readFileSync('src/pages/DashboardPage.tsx','utf8');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
let count=0;
function test(title, fn) {fn();count++;console.log(`PASS ${String(count).padStart(2,'0')}: ${title}`);}
const layoutMatch = layout.match(/  useLayoutEffect\(\(\) => \{([\s\S]*?)\n  \}, \[location\.pathname, location\.hash\]\);/);
test('Read and execute real layout route-scroll effect',()=>assert.ok(layoutMatch));
const layoutCode = `useLayoutEffect(() => {${layoutMatch[1]}\n});`;
function layoutRoute(pathname, search, revealAt=null, hash='') {
 let now=0,seq=0;const queue = new Map(), events=[];
 const schedule=(fn,delay)=>{const id=++seq;queue.set(id,{at:now+delay,fn});return id;};
 const env={location:{pathname,search,hash},URLSearchParams,
   scrollToRouteAnchor:(hash)=>{if(hash){events.push([now,'anchor']);return true;}return false;},
   forcePageScrollTop:()=>events.push([now,'top']),
   useLayoutEffect:(fn)=>{env.cleanup=fn();},
   window:{requestAnimationFrame:(fn)=>schedule(fn,16),cancelAnimationFrame:(id)=>queue.delete(id),setTimeout:schedule,clearTimeout:(id)=>queue.delete(id)}
 };
 vm.runInNewContext(layoutCode,env);
 if(revealAt!==null)schedule(()=>events.push([now,'reveal']),revealAt);
 while(queue.size){const [id,item]=[...queue.entries()].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];queue.delete(id);now=item.at;item.fn();}
 env.cleanup?.();return events.map(x=>x[1]);
}
for (const delay of [5,60,210,650]) {
  test(`exact alert_id survives load ${delay}ms without late layout reset`,()=>assert.deepEqual(layoutRoute('/alerts','?alert_id=alert-123',delay),['reveal']));
}
test('repeating the same alert_id has identical behavior',()=>assert.deepEqual(layoutRoute('/alerts','?alert_id=alert-123',60),layoutRoute('/alerts','?alert_id=alert-123',60)));
test('alert_id survives F5 route effect on initial page entry',()=>assert.deepEqual(layoutRoute('/alerts','?alert_id=alert-123',250),['reveal']));
test('general Dashboard Review Alerts deep link also avoids racing queue scroll',()=>assert.deepEqual(layoutRoute('/alerts','?resolved=false&focus_queue=true',80),['reveal']));
test('normal Alerts navigation still resets to top',()=>assert.deepEqual(layoutRoute('/alerts',''),Array(6).fill('top')));
test('alert parameters on unrelated routes do not alter navigation',()=>assert.deepEqual(layoutRoute('/reports','?alert_id=x'),Array(6).fill('top')));
test('existing Stock deep-link fix remains active',()=>assert.deepEqual(layoutRoute('/stock','?stock_id=position-A',50),['reveal']));
test('missing/blank alert ID does not suppress normal navigation',()=>assert.deepEqual(layoutRoute('/alerts','?alert_id=%20'),Array(6).fill('top')));
test('Dashboard links exact alert ID',()=>assert.ok(dashboard.includes('to={`/alerts?alert_id=${encodeURIComponent(alert.id)}`}')));
test('Alerts reads the alert_id query and fetches exact record',()=>{assert.ok(alerts.includes("searchParams.get('alert_id')"));assert.ok(alerts.includes("fetchAlertById(requestedAlertId)"));});
test('Queue merges separately focused alert into filter results',()=>assert.ok(alerts.includes('mergeFocusedAlert(filteredAlerts, focusedAlertQuery.data)')));
test('Rendered queue can trigger reveal even when separate detail fetch fails',()=>{
  const m=alerts.match(/const requestedAlertIsRendered = (Boolean\(requestedAlertId && alerts\.some\(\(alert\) => alert\.id === requestedAlertId\)\));/);
  assert.ok(m);assert.equal(vm.runInNewContext(m[1],{requestedAlertId:'alert-123',alerts:[{id:'alert-123'}]}),true);
  assert.equal(vm.runInNewContext(m[1],{requestedAlertId:'alert-123',alerts:[{id:'other'}]}),false);
});
test('Focus only fires after desired record is in rendered list',()=>assert.ok(alerts.includes('if (!requestedAlertIsRendered) return;')));
test('Queue reveal uses a frame after render',()=>assert.ok(alerts.includes('window.requestAnimationFrame(() => {') && alerts.includes('document.getElementById(`alert-${requestedAlertId}`)?.scrollIntoView')));
test('Reveal effect depends on loaded-target boolean, not query refresh object',()=>assert.ok(alerts.includes('[requestedAlertId, requestedAlertIsRendered]')));
test('Errors are not falsely displayed if queue includes requested alert',()=>assert.ok(alerts.includes('focusedAlertQuery.isError && !requestedAlertIsRendered')));
test('Alert cards show a visible target highlight',()=>assert.ok(alerts.includes("requestedAlertId === alert.id ? ' alerts-alert-card--focused'")));
test('Alert queue-only view still retains its own focus scroll',()=>assert.ok(alerts.includes("document.getElementById('alerts-queue')?.scrollIntoView")));
test('FT158 guard is registered',()=>assert.equal(pkg.scripts['check:ft158-alert-focus-race'],'node scripts/check-ft158-alert-focus-race.mjs'));
console.log(`FT158 alert focus / F5 repeatability: ${count}/${count} PASS`);
