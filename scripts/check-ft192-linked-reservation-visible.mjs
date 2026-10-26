/** FT192: execute the REAL Reservation focus effect with controlled React-query
 * rerenders, RAF cancellation and late-mounted DOM. No service/data required. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const reservation = fs.readFileSync('src/pages/InventoryReservationsPage.tsx', 'utf8');
const requisitions = fs.readFileSync('src/pages/InventoryRequisitionsPage.tsx', 'utf8');
const layout = fs.readFileSync('src/layouts/AppLayout.tsx', 'utf8');
const packageMeta = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const effect = reservation.match(/  useEffect\(\(\) => \{\n    if \(!selectedReservationId \|\| detailQuery\.isLoading[\s\S]*?\n  \}, \[detailQuery\.data, detailQuery\.isLoading, selectedReservationId\]\);/);
assert.ok(effect, 'the real selected-reservation focus effect must exist');
let passed=0;
const test=(message, fn)=>{fn();passed++;console.log(`PASS ${String(passed).padStart(2,'0')} ${message}`);};

function simulate(steps) {
  let now=0, next=0, cleanup=()=>{}, pending=new Map();
  const events=[];
  const lastFocused={current:''};
  const element={scrollIntoView:opts=>events.push({at:now,kind:'scroll',opts}),focus:opts=>events.push({at:now,kind:'focus',opts})};
  const panel={current:element};
  const schedule=(cb,duration)=>{const token=++next;pending.set(token,{at:now+duration,cb});return token;};
  const context={
    selectedReservationId:'', detailQuery:{}, reservationDetailRef:panel, lastFocusedReservationIdRef:lastFocused,
    useEffect: fn=>{cleanup=fn()||(()=>{});},
    window:{requestAnimationFrame:fn=>schedule(fn,16),cancelAnimationFrame:id=>pending.delete(id),setTimeout:schedule,clearTimeout:id=>pending.delete(id)}
  };
  const advance=t=>{
    while (true) {
      const nextJob=[...pending.entries()].filter(([,item])=>item.at<=t).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
      if(!nextJob) break;
      pending.delete(nextJob[0]);now=nextJob[1].at;nextJob[1].cb();
    }
    now=t;
  };
  const render=(id,data,isLoading=false)=>{
    cleanup();context.selectedReservationId=id;context.detailQuery={data,isLoading};
    vm.runInNewContext(effect[0],context,{timeout:2000});
  };
  steps({render,advance,panel,events,lastFocused});
  return {events,lastFocused};
}
const observedKinds=r=>r.events.map(x=>x.kind);

test('Original requisition link still targets exact reservation ID',()=>assert.match(requisitions,/navigate\(`\/inventory-reservations\?reservationId=\$\{encodeURIComponent\(linkedReservation\.id\)\}`\)/));
test('Reservations still reads canonical + legacy ID query keys',()=>assert.match(reservation,/selectedRecordId\(searchParams, 'reservationId', 'reservation_id'\)/));
test('FE285 layout preserves deferred Reservation route protection',()=>assert.match(layout,/hasDeferredReservationTarget/));
test('Detail section has real focus ref',()=>assert.match(reservation,/ref=\{reservationDetailRef\}/));
test('URL-selected details are presented FIRST, independent of scroll timings',()=>assert.match(reservation,/\.\.\.\(selectedReservationId \? \{ order: -1 \} : \{\}\)/));
test('Unselected workspace keeps its normal order',()=>assert.ok(reservation.includes('selectedReservationId ? { order: -1 } : {}')));
test('Open linked reservation control remains present',()=>assert.match(requisitions,/Open linked reservation/));

test('Expected async loaded reservation scrolls and focuses once',()=>{
  const r=simulate(({render,advance})=>{render('r-1',null,true);advance(25);render('r-1',{id:'r-1'});advance(300);});
  assert.deepEqual(observedKinds(r),['scroll','focus']);assert.equal(r.lastFocused.current,'r-1');
});
test('Cancelled RAF before it fires does not permanently suppress focus',()=>{
  const r=simulate(({render,advance})=>{render('r-1',{id:'r-1'});advance(5);render('r-1',{id:'r-1',updated:2});advance(300);});
  assert.deepEqual(observedKinds(r),['scroll','focus']);assert.equal(r.lastFocused.current,'r-1');
});
test('DOM panel appearing after first RAF is revealed by fallback',()=>{
  const r=simulate(({render,advance,panel})=>{panel.current=null;render('r-1',{id:'r-1'});advance(40);panel.current=element();advance(300);});
  function element(){return {scrollIntoView:()=>{},focus:()=>{}};}
  assert.equal(r.lastFocused.current,'r-1');
});
test('Late DOM does not set false "already-focused" guard',()=>{
  const r=simulate(({render,advance,panel})=>{panel.current=null;render('r-1',{id:'r-1'});advance(30);assert.equal(panel.current,null);});
  assert.equal(r.lastFocused.current,'');
});
test('Wrong loaded reservation ID never scrolls wrong record',()=>{
  const r=simulate(({render,advance})=>{render('r-1',{id:'other'});advance(300);});
  assert.deepEqual(observedKinds(r),[]);assert.equal(r.lastFocused.current,'');
});
test('Selecting a different reservation reveals the new record',()=>{
  const r=simulate(({render,advance})=>{render('r-1',{id:'r-1'});advance(170);render('r-2',{id:'r-2'});advance(400);});
  assert.deepEqual(observedKinds(r),['scroll','focus','scroll','focus']);assert.equal(r.lastFocused.current,'r-2');
});
test('Changing away before RAF prevents stale record focus',()=>{
  const r=simulate(({render,advance})=>{render('r-1',{id:'r-1'});advance(5);render('r-2',{id:'r-2'});advance(400);});
  assert.deepEqual(observedKinds(r),['scroll','focus']);assert.equal(r.lastFocused.current,'r-2');
});
test('Focused record uses immediate scroll, not cancellable animation',()=>{
  const r=simulate(({render,advance})=>{render('r-1',{id:'r-1'});advance(250);});
  assert.equal(r.events[0].opts.behavior,'auto');assert.equal(r.events[0].opts.block,'start');
  assert.equal(r.events[1].opts.preventScroll,true);
});
test('F5 is equivalent to a fresh page mount with same exact ID',()=>{
  for(let i=0;i<2;i++){
    const r=simulate(({render,advance})=>{render('r-1',{id:'r-1'});advance(250);});
    assert.deepEqual(observedKinds(r),['scroll','focus']);
  }
});
test('No selection never moves focus',()=>{
  const r=simulate(({render,advance})=>{render('',undefined);advance(250);});
  assert.deepEqual(observedKinds(r),[]);
});
test('Empty source still preserves backend BE159',()=>assert.equal(packageMeta.inventorySourceIdentity.backend,'BE159'));
console.log(`FT192 stable exact linked reservation: ${passed}/${passed} PASS`);
