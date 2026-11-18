// Runs on GitHub's checkout only. No push, commit, secrets or network access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const norm=s=>s.replace(/\r\n/g,'\n'),sha=s=>crypto.createHash('sha256').update(norm(s)).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
const failed=process.argv[2]??'ba7b70a4d4a718f4ce563df4737a971f5a966869';
assert.match(failed,/^[a-f0-9]{40}$/);git('merge-base','--is-ancestor',failed,'HEAD');
const reviewFile='playwright-inventory/batch-244-review.json',guardFile='playwright-inventory/scripts/check-batch-244-source-diff.mjs';
const review=JSON.parse(fs.readFileSync(path.join(root,reviewFile),'utf8'));
assert.equal(review.batch,244);assert.equal(review.count,5);assert.equal(review.selected.join(','),'TINS-024,TRC-009,TRC-048,TSL-040,TSL-045');
const expected={
 'src/pages/InsightsPage.tsx':'8abdaadcd4818952160b1bd13575a068968616d87a6c13dc0a32626426b8a770',
 'src/pages/ReliabilityCommandPage.tsx':'911be1a34678b547362e468d72d6967dc91532ff349e7c877b739fff280ac8bb',
 'src/pages/StorageLocationsPage.tsx':'4b89798ea7c61419b77ff7ae0e54cc1c1e7c8fdafcb45c2cebca7573d61bc325',
};
const work=process.env.RUNNER_TEMP?path.join(process.env.RUNNER_TEMP,'b244-r2-recovery'):path.join(root,'b244-r2-recovery-output'),baseline=path.join(work,'originals'),out=path.join(work,'changed-files');
const write=(dir,file,data)=>{const p=path.join(dir,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data);};
const recovered={};
for(const [file,badHash] of Object.entries(expected)){
 const failedSource=git('show',failed+':'+file);assert.equal(sha(failedSource),badHash,'Failed commit does not match reviewed B244 file: '+file);
 assert.equal(sha(git('show','HEAD:'+file)),badHash,'File was subsequently changed; cannot safely recover: '+file);
 assert.equal(sha(fs.readFileSync(path.join(root,file),'utf8')),badHash,'Unexpected working file: '+file);
 const badCommit=git('log','-1','--format=%H',failed,'--',file).trim();assert.match(badCommit,/^[a-f0-9]{40}$/);
 const parent=git('rev-parse',badCommit+'^').trim();const before=git('show',parent+':'+file);
 recovered[file]={before,badCommit,parent,badHash};write(baseline,file,before);
 console.log('Recovered exact previous committed source: '+file+' '+parent);
}
function once(s,old,next,file){assert.equal(s.split(old).length,2,'Required anchor missing/ambiguous: '+file);return s.replace(old,next);}
for(const [file,r] of Object.entries(recovered)){
 let s=norm(r.before);
 if(file.endsWith('/InsightsPage.tsx')){
  s=once(s,'    setSupplierPage(1);\n  }, [supplierRiskFilter, supplierSearch, supplierSort, supplierTierFilter, supplierPageSize]);','    setSupplierPage(1);\n    setSelectedSupplierId(null);\n  }, [supplierRiskFilter, supplierSearch, supplierSort, supplierTierFilter, supplierPageSize]);',file);
 }else if(file.endsWith('/ReliabilityCommandPage.tsx')){
  s=once(s,"import { Link } from 'react-router';","import { Link, useSearchParams } from 'react-router';",file);
  s=once(s,'  const { locale, ui } = useAppTranslation();\n  const [view, setView]', '  const { locale, ui } = useAppTranslation();\n  const [, setSearchParams] = useSearchParams();\n  const [view, setView]',file);
  s=once(s,"    setReadiness('watch');\n    setSeverity('all');\n    setLimit('9');", "    setSearchParams((currentParams) => {\n      const nextParams = new URLSearchParams(currentParams);\n      nextParams.delete('readiness');\n      nextParams.delete('severity');\n      nextParams.delete('limit');\n      return nextParams;\n    }, { replace: true });",file);
 }else{
  s=once(s,"  const clearFilters = () => {\n    setSearch('');\n    setZoneFilter('');\n  };", "  const updateDirectoryFilters = (nextSearch: string, nextZone: string) => {\n    setSearch(nextSearch);\n    setZoneFilter(nextZone);\n    setSearchParams((currentParams) => {\n      const nextParams = new URLSearchParams(currentParams);\n      nextParams.delete('location_id');\n      if (nextSearch.trim()) nextParams.set('search', nextSearch.trim());\n      else nextParams.delete('search');\n      if (nextZone.trim()) nextParams.set('zone', nextZone.trim());\n      else nextParams.delete('zone');\n      return nextParams;\n    }, { replace: true });\n  };\n\n  const clearFilters = () => updateDirectoryFilters('', '');",file);
  s=once(s,'onChange={(event) => setSearch(event.target.value)}','onChange={(event) => updateDirectoryFilters(event.target.value, zoneFilter)}',file);
  s=once(s,'onChange={(event) => setZoneFilter(event.target.value)}','onChange={(event) => updateDirectoryFilters(search, event.target.value)}',file);
 }
 assert.notEqual(sha(s),sha(r.before));r.after=s;review.source_files[file]={before:sha(r.before),after:sha(s),bad_commit:r.badCommit,original_parent:r.parent,bad_after:r.badHash};
}
// Only after all anchors match; generate exact files, and alter runner checkout for validation.
review.recovery_failed_commit=failed;review.basis='B244 R2: restore exact source immediately preceding erroneous B244 replacement, then apply only reviewed anchors; original test IDs unchanged.';
const guard=`import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport crypto from 'node:crypto';\nimport {execFileSync} from 'node:child_process';\nimport {fileURLToPath} from 'node:url';\nconst root=fileURLToPath(new URL('../../',import.meta.url));\nconst p=JSON.parse(fs.readFileSync(new URL('../batch-244-review.json',import.meta.url),'utf8'));\nconst git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}),sha=s=>crypto.createHash('sha256').update(s.replace(/\\r\\n/g,'\\n')).digest('hex');\nassert.equal(Object.keys(p.source_files).length,3);\nassert.match(p.recovery_failed_commit,/^[a-f0-9]{40}$/);\ngit('merge-base','--is-ancestor',p.recovery_failed_commit,'HEAD');\nfor(const [f,r] of Object.entries(p.source_files)){\n assert.equal(git('rev-parse',r.bad_commit+'^').trim(),r.original_parent);\n assert.equal(sha(git('show',r.original_parent+':'+f)),r.before);\n assert.equal(sha(git('show',r.bad_commit+':'+f)),r.bad_after);\n assert.equal(sha(git('show',p.recovery_failed_commit+':'+f)),r.bad_after);\n assert.equal(sha(git('show','HEAD:'+f)),r.after);\n assert.equal(sha(fs.readFileSync(root+f,'utf8')),r.after);\n console.log('PASS B244 R2 source history verified: '+f);\n}\n`;
for(const [file,r] of Object.entries(recovered)){write(out,file,r.after);write(root,file,r.after);}
write(out,reviewFile,JSON.stringify(review,null,2)+'\n');write(out,guardFile,guard);
const trackerFile='playwright-inventory/APPLICATION_ISSUES_TRACKER.csv';
const tracker=fs.readFileSync(path.join(root,trackerFile),'utf8');
assert(tracker.startsWith('issue_id,record_kind,page_or_area,related_test_id,classification,status,severity,summary,evidence_or_reason,next_required_action,first_source,last_reviewed,notes'));
assert(!tracker.includes('B244-R2-SOURCE-REGRESSION,'));
const newRow=['B244-R2-SOURCE-REGRESSION','application_regression','Insights / Reliability Command / Storage Locations','TINS-024; TRC-009; TRC-048; TSL-040; TSL-045','confirmed release regression / needs retest','RECOVERY_PREPARED_B244_R2','high','B244 replaced files from an older source archive','logs_119834692302.zip: check:feed-anomaly-freshness failed Action list and anomaly panel only use meaningful tiers','Deploy recovered exact source only after build succeeds; verify original five tests','Batch 244 frontend validation','2026-11-18','No original test PASS credited; exact previous committed source restored before surgical edits.'].map(s=>'"'+s.replaceAll('"','""')+'"').join(',');
write(out,trackerFile,tracker.trimEnd()+'\r\n'+newRow+'\r\n');
write(out,'playwright-inventory/BATCH_244_R2_STATUS.md','# Batch 244 R2 — recovery\n\nActual B244 frontend validation failed before Playwright: Insights anomaly-tier regression. Confirmed original tests unchanged: tenant 2686/2938, full suite 2686/9900. Exact previous versions of three frontend files recovered from Git history; only original B244 fixes reapplied. This artifact is released only after the prior failed check and production build pass. Deploy these files, then run the existing Inventory - original 9900 Playwright suite, BULK_SAFE_17, ORIGINALTESTS. Expected five actual passes.\n');
console.log('B244 R2: all three exact prior sources restored and corrected; running validation before packaging.');
