import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=process.argv[2] || process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const source=read('src/lib/queryRetryPolicy.ts');
const js=source.replace('export function shouldRetryReadQuery(failureCount: number, error: unknown): boolean', 'function shouldRetryReadQuery(failureCount, error)')
  .replace('(error as { status?: unknown }).status','error.status');
const ctx=vm.createContext({});
vm.runInContext(js+'\nthis.run=shouldRetryReadQuery;',ctx,{timeout:1000});
const run=ctx.run;
const checks=[
  [{status:429,code:'RATE_LIMITED'},0,false,'rate limited query must not retry'],
  [{status:429},1,false,'subsequent 429 must not retry'],
  [{status:503},0,true,'transient 503 keeps one retry'],
  [{status:502},1,false,'transient 502 cannot retry repeatedly'],
  [new Error('offline'),0,true,'network error gets one retry'],
  [new Error('offline'),1,false,'network error retries at most once'],
  [null,0,true,'unknown failure gets one retry'],
  [undefined,1,false,'unknown failure gets at most one retry'],
];
let n=0;
for(const [err,count,expected,label] of checks){assert.equal(run(count,err),expected,label);n++;}
const files=[
 'src/app/AppProviders.tsx','src/layouts/AppLayout.tsx','src/layouts/PlatformLayout.tsx',
 'src/lib/sidebarAttentionItems.ts','src/pages/AdminSystemPage.tsx','src/pages/TenantAuditPage.tsx',
 'src/pages/PlatformPermissionsPage.tsx','src/pages/HumanInLoopAIReviewPage.tsx'
];
for(const rel of files){
 const value=read(rel);
 assert.match(value,/import \{ shouldRetryReadQuery \} from /,rel+' import');n++;
 assert.match(value,/retry:\s*shouldRetryReadQuery/,rel+' query option');n++;
 assert.doesNotMatch(value,/retry:\s*1\b/,rel+' must not contain scalar retries');n++;
}
const allCount=files.reduce((count,file)=>count+(read(file).match(/retry:\s*shouldRetryReadQuery/g)||[]).length,0);
assert.equal(allCount,14,'all 14 explicit former retries must adopt policy');n++;
assert.match(read('src/app/AppProviders.tsx'),/retry:\s*shouldRetryReadQuery/);n++;
console.log(`PASS ${n}/${n}: 429 never retried; one transient retry retained; 14 explicit retry locations, global default included`);
