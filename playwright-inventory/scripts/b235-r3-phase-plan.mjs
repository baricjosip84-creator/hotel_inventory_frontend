import assert from 'node:assert/strict';
export function phasePlan(entries,canary){
 const select=pred=>entries.map(e=>({...e,ids:e.ids.filter(pred)})).filter(e=>e.ids.length);
 const phases=[select(id=>canary.includes(id)),select(id=>id.startsWith('TPER-')&&!canary.includes(id)),select(id=>!id.startsWith('TPER-'))];
 assert.deepEqual(phases.flatMap(p=>p.flatMap(e=>e.ids)).sort(),entries.flatMap(e=>e.ids).sort());
 return phases;
}
export function exactPass(report,expected){
 const found=[];
 function walk(s){
  for(const spec of s.specs??[]){
   const t=spec.tests?.[0],id=spec.title.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
   found.push({id,pass:spec.tests?.length===1&&t.expectedStatus==='passed'&&t.results?.length===1&&t.results[0].status==='passed'});
  }
  for(const c of s.suites??[])walk(c);
 }
 for(const s of report?.suites??[])walk(s);
 return found.length===expected.length&&found.every(x=>x.pass)&&JSON.stringify(found.map(x=>x.id).sort())===JSON.stringify([...expected].sort());
}
