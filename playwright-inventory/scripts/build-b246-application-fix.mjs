// Changes only exact matching anchors in the current GitHub checkout. No commit, push, or deployment.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=process.env.B246_FIX_OUTPUT??path.join(process.env.RUNNER_TEMP??root,'b246-app-fix');
const norm=s=>s.replace(/\r\n/g,'\n'),sha=s=>crypto.createHash('sha256').update(norm(s)).digest('hex');
const read=f=>norm(fs.readFileSync(path.join(root,f),'utf8'));
const once=(s,a,b,f)=>{assert.equal(s.split(a).length,2,'Missing or ambiguous current source anchor: '+f);return s.replace(a,b);};
const global=read('src/app/AppProviders.tsx');
assert(global.includes("element.dataset.skipGlobalConfirm === 'true'"),'Current global guard has no reviewed explicit-confirm marker');
assert(global.includes('globalConfirmBypass.activeUntil'),'Current global confirmation behavior changed');
const handlers=read('src/pages/products/productActionHandlers.ts');
assert(handlers.includes("ui('Archive package')")&&handlers.includes('packageItem.package_name')&&handlers.includes('deletePackageMutation.mutate'),'Named package confirmation not verified');
const plan=[
 ['src/pages/SessionsPage.tsx','                onClick={handleRevokeAll}','                data-skip-global-confirm="true"\n                onClick={handleRevokeAll}'],
 ['src/pages/products/ProductPackagesPanel.tsx','                            onClick={() => onDeletePackage(packageItem)}','                            data-skip-global-confirm="true"\n                            onClick={() => onDeletePackage(packageItem)}'],
 ['src/pages/ShipmentsPage.tsx','onChange={(event) => setShipmentPageSize(Number(event.target.value))}','onChange={(event) => { setShipmentPage(1); setShipmentPageSize(Number(event.target.value)); }}']
];
const currentSession=read(plan[0][0]);assert(currentSession.includes('including this browser, and return you to login. Continue?')&&currentSession.includes('if (!confirmed) return;')&&currentSession.includes('revokeAllMutation.mutate()'),'Current contextual session confirmation not verified');
const ship=read(plan[2][0]);assert(ship.includes('const [shipmentPage, setShipmentPage]')&&ship.includes('if (shipmentPage > shipmentPageCount)'),'Current page limit logic changed');
const changes=plan.map(([f,a,b])=>{const before=read(f);assert(!before.includes(b),'Fix already applied, do not replace blindly: '+f);const after=once(before,a,b,f);assert.equal(once(after,b,a,f),before);return {f,before,after};});
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
for(const {f,before} of changes){const git=execFileSync('git',['show','HEAD:'+f],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(sha(git),sha(before),'Checkout source not exact: '+f);}
for(const {f,after} of changes){const dest=path.join(out,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,after);fs.writeFileSync(path.join(root,f),after);}
const manifest={batch:246,commit,files:changes.map(({f,before,after})=>({file:f,before:sha(before),after:sha(after)})),status:'application source generated; release only after CI build and checks'};
fs.writeFileSync(path.join(out,'B246_APPLICATION_FIX_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('B246 three surgical application fixes generated from exact committed sources. No production writes.');
